import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
  InfiniteData,
} from "@tanstack/react-query";
import { communityApi } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { useAuthState } from "./useAuthState";

type PaginationData = {
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
};

export type FeedResponse = {
  success: boolean;
  data: Post[];
  pagination: PaginationData;
};

export type Post = {
  id: string;
  content: string;
  images?: string[];
  user_id: string;
  created_at: string;
  updated_at: string;
  likes_count: number;
  comments_count: number;
  has_liked?: boolean;
  is_following?: boolean;
  user?: {
    id: string;
    username: string;
    email: string;
    bio?: string;
    followers_count?: number;
    following_count?: number;
  };
};

type Comment = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: {
    id: string;
    username: string;
    email: string;
    bio?: string;
  };
  likes_count: number;
  replies_count: number;
  parent_id: string | null;
  has_liked?: boolean;
};

export function useCommunity() {
  const queryClient = useQueryClient();
  const { user } = useAuthState();

  // --- Feed Query (Paginated) ---
  const {
    data: feedData,
    isLoading: isLoadingFeed,
    isRefetching: isRefetchingFeed,
    error: feedError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: refetchFeed,
  } = useInfiniteQuery<FeedResponse>({
    queryKey: ["community-feed"],
    queryFn: ({ pageParam = 1 }) =>
      communityApi.getFeed({ page: pageParam as number, limit: 10 }),
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore ? lastPage.pagination.page + 1 : undefined,
    initialPageParam: 1,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });

  // Flattened feed for the UI
  const feed = feedData?.pages.flatMap((page) => page.data) || [];

  // Helper to update all instances of a post across all pages
  const updateFeedPost = (
    postId: string,
    updater: (post: Post) => Post | null
  ) => {
    queryClient.setQueryData<InfiniteData<FeedResponse>>(
      ["community-feed"],
      (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            data: page.data
              .map((post) => (post.id === postId ? updater(post) : post))
              .filter((post): post is Post => post !== null),
          })),
        };
      }
    );
  };

  // --- Mutations ---

  const createPostMutation = useMutation({
    mutationFn: communityApi.createPost,
    onMutate: async (newPost) => {
      await queryClient.cancelQueries({ queryKey: ["community-feed"] });
      const previousFeed = queryClient.getQueryData<InfiniteData<FeedResponse>>(
        ["community-feed"]
      );

      if (user?.profile) {
        const optimisticPost: Post = {
          id: `temp-${Date.now()}`,
          content: newPost.content,
          images: newPost.images,
          user_id: user.id || "",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          likes_count: 0,
          comments_count: 0,
          has_liked: false,
          is_following: false,
          user: {
            id: user.id || "",
            username: user.profile.username || "me",
            email: user.email || "",
            bio: user.profile.bio,
            followers_count: 0,
            following_count: 0,
          },
        };

        queryClient.setQueryData<InfiniteData<FeedResponse>>(
          ["community-feed"],
          (old) => {
            if (!old) return old;
            return {
              ...old,
              pages: old.pages.map((page, index) =>
                index === 0
                  ? { ...page, data: [optimisticPost, ...page.data] }
                  : page
              ),
            };
          }
        );
      }

      return { previousFeed };
    },
    onError: (err, newPost, context) => {
      if (context?.previousFeed) {
        queryClient.setQueryData(["community-feed"], context.previousFeed);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["community-feed"] });
    },
  });

  const likePostMutation = useMutation({
    mutationFn: communityApi.likePost,
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ["community-feed"] });
      const previousFeed = queryClient.getQueryData<InfiniteData<FeedResponse>>(
        ["community-feed"]
      );

      updateFeedPost(postId, (post) => ({
        ...post,
        has_liked: true,
        likes_count: (post.likes_count || 0) + 1,
      }));

      return { previousFeed };
    },
    onError: (err, postId, context) => {
      if (context?.previousFeed) {
        queryClient.setQueryData(["community-feed"], context.previousFeed);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["community-feed"] });
    },
  });

  const unlikePostMutation = useMutation({
    mutationFn: communityApi.unlikePost,
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ["community-feed"] });
      const previousFeed = queryClient.getQueryData<InfiniteData<FeedResponse>>(
        ["community-feed"]
      );

      updateFeedPost(postId, (post) => ({
        ...post,
        has_liked: false,
        likes_count: Math.max(0, (post.likes_count || 0) - 1),
      }));

      return { previousFeed };
    },
    onError: (err, postId, context) => {
      if (context?.previousFeed) {
        queryClient.setQueryData(["community-feed"], context.previousFeed);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["community-feed"] });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: communityApi.addComment,
    onMutate: async (newComment) => {
      const { postId, content } = newComment;
      await queryClient.cancelQueries({ queryKey: ["comments", postId] });
      const previousComments = queryClient.getQueryData<Comment[]>([
        "comments",
        postId,
      ]);

      if (user?.profile) {
        const optimisticComment: Comment = {
          id: `temp-${Date.now()}`,
          post_id: postId,
          user_id: user.id || "",
          content,
          created_at: new Date().toISOString(),
          user: {
            id: user.id || "",
            username: user.profile.username || "me",
            email: user.email || "",
          },
          likes_count: 0,
          replies_count: 0,
          parent_id: newComment.parentId || null,
          has_liked: false,
        };

        queryClient.setQueryData<Comment[]>(["comments", postId], (old) => [
          optimisticComment,
          ...(old || []),
        ]);

        // Optimistically increment comment count on post
        updateFeedPost(postId, (post) => ({
          ...post,
          comments_count: (post.comments_count || 0) + 1,
        }));
      }

      return {
        previousComments,
        postId,
        previousFeed: queryClient.getQueryData<InfiniteData<FeedResponse>>([
          "community-feed",
        ]),
      };
    },
    onError: (err, variables, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(
          ["comments", context.postId],
          context.previousComments
        );
      }
      if (context?.previousFeed) {
        queryClient.setQueryData(["community-feed"], context.previousFeed);
      }
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["comments", variables.postId],
      });
      queryClient.invalidateQueries({ queryKey: ["community-feed"] });
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: communityApi.deletePost,
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ["community-feed"] });
      const previousFeed = queryClient.getQueryData<InfiniteData<FeedResponse>>(
        ["community-feed"]
      );

      updateFeedPost(postId, () => null); // null will filter it out

      return { previousFeed };
    },
    onError: (err, postId, context) => {
      if (context?.previousFeed) {
        queryClient.setQueryData(["community-feed"], context.previousFeed);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["community-feed"] });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: communityApi.deleteComment,
    onMutate: async ({ postId, commentId }) => {
      await queryClient.cancelQueries({ queryKey: ["comments", postId] });
      await queryClient.cancelQueries({ queryKey: ["community-feed"] });

      const previousComments = queryClient.getQueryData<Comment[]>([
        "comments",
        postId,
      ]);
      const previousFeed = queryClient.getQueryData<InfiniteData<FeedResponse>>(
        ["community-feed"]
      );

      queryClient.setQueryData<Comment[]>(["comments", postId], (old) =>
        old?.filter((c) => c.id !== commentId)
      );

      // Optimistically decrement comment count on post
      updateFeedPost(postId, (post) => ({
        ...post,
        comments_count: Math.max(0, (post.comments_count || 0) - 1),
      }));

      return { previousComments, previousFeed, postId };
    },
    onError: (err, variables, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(
          ["comments", context.postId],
          context.previousComments
        );
      }
      if (context?.previousFeed) {
        queryClient.setQueryData(["community-feed"], context.previousFeed);
      }
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["comments", variables.postId],
      });
      queryClient.invalidateQueries({ queryKey: ["community-feed"] });
    },
  });

  const likeCommentMutation = useMutation({
    mutationFn: ({ commentId }: { commentId: string; postId: string }) =>
      communityApi.likeComment(commentId),
    onMutate: async ({ commentId, postId }) => {
      await queryClient.cancelQueries({ queryKey: ["comments", postId] });
      const previousComments = queryClient.getQueryData<Comment[]>([
        "comments",
        postId,
      ]);

      queryClient.setQueryData<Comment[]>(["comments", postId], (old) =>
        old?.map((c) =>
          c.id === commentId
            ? { ...c, has_liked: true, likes_count: (c.likes_count || 0) + 1 }
            : c
        )
      );

      return { previousComments, postId };
    },
    onError: (err, variables, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(
          ["comments", context.postId],
          context.previousComments
        );
      }
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["comments", variables.postId],
      });
    },
  });

  const unlikeCommentMutation = useMutation({
    mutationFn: ({ commentId }: { commentId: string; postId: string }) =>
      communityApi.unlikeComment(commentId),
    onMutate: async ({ commentId, postId }) => {
      await queryClient.cancelQueries({ queryKey: ["comments", postId] });
      const previousComments = queryClient.getQueryData<Comment[]>([
        "comments",
        postId,
      ]);

      queryClient.setQueryData<Comment[]>(["comments", postId], (old) =>
        old?.map((c) =>
          c.id === commentId
            ? {
                ...c,
                has_liked: false,
                likes_count: Math.max(0, (c.likes_count || 0) - 1),
              }
            : c
        )
      );

      return { previousComments, postId };
    },
    onError: (err, variables, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(
          ["comments", context.postId],
          context.previousComments
        );
      }
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["comments", variables.postId],
      });
    },
  });

  const editCommentMutation = useMutation({
    mutationFn: communityApi.editComment,
    onSuccess: () => {
      // queryClient.invalidateQueries({ queryKey: ["comments"] });
    },
  });

  // --- Helper to upload image ---
  const uploadImage = async (uri: string): Promise<string> => {
    try {
      const manipulatedImage = await manipulateAsync(uri, [], {
        compress: 0.8,
        format: SaveFormat.JPEG,
      });

      const finalUri = manipulatedImage.uri;
      const originalName = uri.split("/").pop();
      const fileName = `${originalName?.split(".")[0] || "image"}_${Date.now()}.jpg`;

      const formData = new FormData();
      formData.append("file", {
        uri: finalUri,
        name: fileName,
        type: "image/jpeg",
      } as any);

      const filePath = `posts/${fileName}`;

      const { data, error } = await supabase.storage
        .from("community")
        .upload(filePath, formData, {
          cacheControl: "3600",
          upsert: false,
          contentType: "image/jpeg",
        });

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from("community").getPublicUrl(data.path);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  };

  return {
    // Feed
    feed,
    isLoadingFeed,
    isRefetchingFeed,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    feedError,
    refetchFeed,

    // Create Post
    createPost: createPostMutation.mutateAsync,
    isCreatingPost: createPostMutation.isPending,

    // Like/Unlike
    likePost: likePostMutation.mutateAsync,
    unlikePost: unlikePostMutation.mutateAsync,

    // Comments
    addComment: addCommentMutation.mutateAsync,
    isAddingComment: addCommentMutation.isPending,
    deleteComment: deleteCommentMutation.mutateAsync,
    likeComment: likeCommentMutation.mutateAsync,
    unlikeComment: unlikeCommentMutation.mutateAsync,
    editComment: editCommentMutation.mutateAsync,

    // Delete Post
    deletePost: deletePostMutation.mutateAsync,
    isDeletingPost: deletePostMutation.isPending,

    // Helpers
    uploadImage,
  };
}

export function usePostComments(postId: string) {
  return useQuery<Comment[]>({
    queryKey: ["comments", postId],
    queryFn: () => communityApi.getComments(postId),
    enabled: !!postId,
  });
}
