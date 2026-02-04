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
import { useRef, useCallback } from "react";

type PaginationData = {
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
};

export type Community = {
  id: string;
  name: string;
  description?: string;
  banner_url?: string;
  privacy: "public" | "private";
  category: string;
  members_count: number;
  creator_id: string;
  created_at: string;
  creator?: {
    id: string;
    username: string;
  };
};

export type CommunityMember = {
  community_id: string;
  user_id: string;
  role: "member" | "admin";
  joined_at: string;
  community?: Community;
};

export type Post = {
  id: string;
  content: string;
  images?: string[];
  user_id: string;
  community_id?: string | null;
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
    profile_image_url?: string;
    followers_count?: number;
    following_count?: number;
    verification_status?: string;
  };
  community?: Community;
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
    profile_image_url?: string;
  };
  likes_count: number;
  replies_count: number;
  parent_id: string | null;
  has_liked?: boolean;
};

export type FeedResponse = {
  success: boolean;
  data: Post[];
  pagination: PaginationData;
};

export function useCommunity(communityId?: string) {
  const queryClient = useQueryClient();
  const { user } = useAuthState();

  // Per-post mutation lock to prevent race conditions
  // Uses a ref to avoid re-renders and stale closure issues
  const pendingLikeMutations = useRef<Set<string>>(new Set());

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
    queryKey: ["posts", communityId],
    queryFn: ({ pageParam = 1 }) =>
      communityApi.getFeed({
        page: pageParam as number,
        limit: 10,
        community_id: communityId,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore ? lastPage.pagination.page + 1 : undefined,
    initialPageParam: 1,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 60 * 24, // 24 hours for persistence
  });

  // Flattened feed for the UI
  const feed = feedData?.pages.flatMap((page) => page.data) || [];

  // Helper to update all instances of a post across all pages
  const updateFeedPost = (
    postId: string,
    updater: (post: Post) => Post | null,
  ) => {
    queryClient.setQueryData<InfiniteData<FeedResponse>>(
      ["posts", communityId],
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
      },
    );
  };

  // --- Mutations ---

  const createPostMutation = useMutation({
    mutationFn: communityApi.createPost,
    onMutate: async (newPost) => {
      await queryClient.cancelQueries({
        queryKey: ["posts", communityId],
      });
      const previousFeed = queryClient.getQueryData<InfiniteData<FeedResponse>>(
        ["posts", communityId],
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
          community_id: newPost.community_id || communityId || null,
        };

        queryClient.setQueryData<InfiniteData<FeedResponse>>(
          ["posts", communityId],
          (old) => {
            if (!old) return old;
            return {
              ...old,
              pages: old.pages.map((page, index) =>
                index === 0
                  ? { ...page, data: [optimisticPost, ...page.data] }
                  : page,
              ),
            };
          },
        );
      }

      return { previousFeed };
    },
    onError: (err, newPost, context) => {
      if (context?.previousFeed) {
        queryClient.setQueryData(["posts", communityId], context.previousFeed);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["posts", communityId],
      });
    },
  });

  const likePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      // Check if this post already has a pending mutation
      if (pendingLikeMutations.current.has(postId)) {
        throw new Error("MUTATION_IN_PROGRESS");
      }
      pendingLikeMutations.current.add(postId);
      return communityApi.likePost(postId);
    },
    onMutate: async (postId) => {
      await queryClient.cancelQueries({
        queryKey: ["posts", communityId],
      });
      const previousFeed = queryClient.getQueryData<InfiniteData<FeedResponse>>(
        ["posts", communityId],
      );

      // Optimistic update - instant feedback like Instagram/Facebook
      updateFeedPost(postId, (post) => {
        if (post.has_liked) return post;
        return {
          ...post,
          has_liked: true,
          likes_count: (post.likes_count || 0) + 1, // Instant count update
        };
      });

      return { previousFeed };
    },
    onSuccess: (response, postId) => {
      // Sync with server-authoritative count (corrects any drift)
      if (response && typeof response.likes_count === "number") {
        updateFeedPost(postId, (post) => ({
          ...post,
          has_liked: true,
          likes_count: response.likes_count,
        }));
      }
    },
    onError: (err, postId, context) => {
      // Don't rollback if mutation was blocked (already in progress)
      if (err instanceof Error && err.message === "MUTATION_IN_PROGRESS") {
        return;
      }
      // Rollback to previous state on error
      if (context?.previousFeed) {
        queryClient.setQueryData(["posts", communityId], context.previousFeed);
      }
    },
    onSettled: (_, __, postId) => {
      // Always release the lock
      pendingLikeMutations.current.delete(postId);
      // Don't invalidate immediately - trust optimistic update
      // Only refetch in background after a delay to avoid UI flicker
      setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: ["posts", communityId],
        });
      }, 1000);
    },
  });

  const unlikePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      // Check if this post already has a pending mutation
      if (pendingLikeMutations.current.has(postId)) {
        throw new Error("MUTATION_IN_PROGRESS");
      }
      pendingLikeMutations.current.add(postId);
      return communityApi.unlikePost(postId);
    },
    onMutate: async (postId) => {
      await queryClient.cancelQueries({
        queryKey: ["posts", communityId],
      });
      const previousFeed = queryClient.getQueryData<InfiniteData<FeedResponse>>(
        ["posts", communityId],
      );

      // Optimistic update - instant feedback like Instagram/Facebook
      updateFeedPost(postId, (post) => {
        if (!post.has_liked) return post;
        return {
          ...post,
          has_liked: false,
          likes_count: Math.max(0, (post.likes_count || 1) - 1), // Instant count update, never go below 0
        };
      });

      return { previousFeed };
    },
    onSuccess: (response, postId) => {
      // Sync with server-authoritative count (corrects any drift)
      if (response && typeof response.likes_count === "number") {
        updateFeedPost(postId, (post) => ({
          ...post,
          has_liked: false,
          likes_count: response.likes_count,
        }));
      }
    },
    onError: (err, postId, context) => {
      // Don't rollback if mutation was blocked (already in progress)
      if (err instanceof Error && err.message === "MUTATION_IN_PROGRESS") {
        return;
      }
      // Rollback to previous state on error
      if (context?.previousFeed) {
        queryClient.setQueryData(["posts", communityId], context.previousFeed);
      }
    },
    onSettled: (_, __, postId) => {
      // Always release the lock
      pendingLikeMutations.current.delete(postId);
      // Don't invalidate immediately - trust optimistic update
      // Only refetch in background after a delay to avoid UI flicker
      setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: ["posts", communityId],
        });
      }, 1000);
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
          "posts",
        ]),
      };
    },
    onError: (err, variables, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(
          ["comments", context.postId],
          context.previousComments,
        );
      }
      if (context?.previousFeed) {
        queryClient.setQueryData(["posts"], context.previousFeed);
      }
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["comments", variables.postId],
      });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: communityApi.deletePost,
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ["posts"] });
      const previousFeed = queryClient.getQueryData<InfiniteData<FeedResponse>>(
        ["posts"],
      );

      updateFeedPost(postId, () => null); // null will filter it out

      return { previousFeed };
    },
    onError: (err, postId, context) => {
      if (context?.previousFeed) {
        queryClient.setQueryData(["posts"], context.previousFeed);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: communityApi.deleteComment,
    onMutate: async ({ postId, commentId }) => {
      await queryClient.cancelQueries({ queryKey: ["comments", postId] });
      await queryClient.cancelQueries({ queryKey: ["posts"] });

      const previousComments = queryClient.getQueryData<Comment[]>([
        "comments",
        postId,
      ]);
      const previousFeed = queryClient.getQueryData<InfiniteData<FeedResponse>>(
        ["posts"],
      );

      queryClient.setQueryData<Comment[]>(["comments", postId], (old) =>
        old?.filter((c) => c.id !== commentId),
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
          context.previousComments,
        );
      }
      if (context?.previousFeed) {
        queryClient.setQueryData(["posts"], context.previousFeed);
      }
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["comments", variables.postId],
      });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
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
            : c,
        ),
      );

      return { previousComments, postId };
    },
    onError: (err, variables, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(
          ["comments", context.postId],
          context.previousComments,
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
            : c,
        ),
      );

      return { previousComments, postId };
    },
    onError: (err, variables, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(
          ["comments", context.postId],
          context.previousComments,
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
    mutationFn: (vars: {
      commentId: string;
      content: string;
      postId: string;
    }) => communityApi.editComment(vars),
    onMutate: async ({ commentId, content, postId }) => {
      await queryClient.cancelQueries({ queryKey: ["comments", postId] });
      const previousComments = queryClient.getQueryData<Comment[]>([
        "comments",
        postId,
      ]);

      queryClient.setQueryData<Comment[]>(["comments", postId], (old) =>
        old?.map((c) =>
          c.id === commentId ? { ...c, content, is_edited: true } : c,
        ),
      );

      return { previousComments, postId };
    },
    onError: (err, variables, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(
          ["comments", context.postId],
          context.previousComments,
        );
      }
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["comments", variables.postId],
      });
    },
  });

  // --- Community Management Mutations ---
  const createCommunityMutation = useMutation({
    mutationFn: communityApi.createCommunity,
    onMutate: async (newCommunityData) => {
      await queryClient.cancelQueries({ queryKey: ["communities", "joined"] });
      const previousJoined = queryClient.getQueryData<{
        success: boolean;
        data: CommunityMember[];
      }>(["communities", "joined"]);

      if (user?.id) {
        const optimisticCommunity: Community = {
          id: `temp-community-${Date.now()}`,
          name: newCommunityData.name,
          description: newCommunityData.description,
          banner_url: newCommunityData.banner_url,
          privacy: newCommunityData.privacy || "public",
          category: newCommunityData.category || "General",
          members_count: 1,
          creator_id: user.id,
          created_at: new Date().toISOString(),
        };

        const optimisticMembership: CommunityMember = {
          community_id: optimisticCommunity.id,
          user_id: user.id,
          role: "admin",
          joined_at: new Date().toISOString(),
          community: optimisticCommunity,
        };

        queryClient.setQueryData<{ success: boolean; data: CommunityMember[] }>(
          ["communities", "joined"],
          (old) => ({
            success: true,
            data: [optimisticMembership, ...(old?.data || [])],
          }),
        );
      }

      return { previousJoined };
    },
    onError: (err, variables, context) => {
      if (context?.previousJoined) {
        queryClient.setQueryData(
          ["communities", "joined"],
          context.previousJoined,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["communities", "joined"] });
      queryClient.invalidateQueries({ queryKey: ["communities", "discover"] });
    },
  });

  const joinCommunityMutation = useMutation({
    mutationFn: communityApi.joinCommunity,
    onMutate: async (communityId) => {
      await queryClient.cancelQueries({ queryKey: ["communities", "joined"] });
      const previousJoined = queryClient.getQueryData<{
        success: boolean;
        data: CommunityMember[];
      }>(["communities", "joined"]);

      // We need the full community object to be optimistic, but usually we just have ID.
      // If we're lucky, it's in the discover cache.
      const discoverData = queryClient.getQueryData<{
        success: boolean;
        data: Community[];
      }>(["communities", "discover", undefined]);
      const fullCommunity = discoverData?.data.find(
        (c) => c.id === communityId,
      );

      if (user?.id && fullCommunity) {
        const optimisticMembership: CommunityMember = {
          community_id: communityId,
          user_id: user.id,
          role: "member",
          joined_at: new Date().toISOString(),
          community: {
            ...fullCommunity,
            members_count: (fullCommunity.members_count || 0) + 1,
          },
        };

        queryClient.setQueryData<{ success: boolean; data: CommunityMember[] }>(
          ["communities", "joined"],
          (old) => ({
            success: true,
            data: [...(old?.data || []), optimisticMembership],
          }),
        );
      }

      return { previousJoined };
    },
    onError: (err, communityId, context) => {
      if (context?.previousJoined) {
        queryClient.setQueryData(
          ["communities", "joined"],
          context.previousJoined,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["communities", "joined"] });
      queryClient.invalidateQueries({ queryKey: ["communities", "discover"] });
    },
  });

  const leaveCommunityMutation = useMutation({
    mutationFn: communityApi.leaveCommunity,
    onMutate: async (communityId) => {
      await queryClient.cancelQueries({ queryKey: ["communities", "joined"] });
      const previousJoined = queryClient.getQueryData<{
        success: boolean;
        data: CommunityMember[];
      }>(["communities", "joined"]);

      queryClient.setQueryData<{ success: boolean; data: CommunityMember[] }>(
        ["communities", "joined"],
        (old) => ({
          success: true,
          data: old?.data.filter((m) => m.community_id !== communityId) || [],
        }),
      );

      return { previousJoined };
    },
    onError: (err, communityId, context) => {
      if (context?.previousJoined) {
        queryClient.setQueryData(
          ["communities", "joined"],
          context.previousJoined,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["communities", "joined"] });
      queryClient.invalidateQueries({ queryKey: ["communities", "discover"] });
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

  // Helper to check if a specific post has a pending like/unlike mutation
  const isPostLikePending = useCallback((postId: string) => {
    return pendingLikeMutations.current.has(postId);
  }, []);

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
    isLikingPost: likePostMutation.isPending,
    unlikePost: unlikePostMutation.mutateAsync,
    isUnlikingPost: unlikePostMutation.isPending,
    isPostLikePending, // Per-post pending check

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

    // Community management
    createCommunity: createCommunityMutation.mutateAsync,
    joinCommunity: joinCommunityMutation.mutateAsync,
    leaveCommunity: leaveCommunityMutation.mutateAsync,

    // Helpers
    uploadImage,
  };
}

export function usePostComments(postId: string) {
  return useQuery<Comment[]>({
    queryKey: ["comments", postId],
    queryFn: () => communityApi.getComments(postId),
    enabled: !!postId,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
}

export function useJoinedCommunities() {
  return useQuery<{ success: boolean; data: CommunityMember[] }>({
    queryKey: ["communities", "joined"],
    queryFn: communityApi.getJoinedCommunities,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 60 * 24, // 24 hours for persistence
  });
}

export function useDiscoverCommunities(params?: {
  category?: string;
  search?: string;
}) {
  return useQuery<{ success: boolean; data: Community[] }>({
    queryKey: ["communities", "discover", params?.category, params?.search],
    queryFn: () => communityApi.getDiscoverCommunities(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

export function useCommunityDetail(communityId: string) {
  return useQuery<{ success: boolean; data: Community }>({
    queryKey: ["communities", "detail", communityId],
    queryFn: () => communityApi.getCommunityById(communityId),
    enabled: !!communityId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}
