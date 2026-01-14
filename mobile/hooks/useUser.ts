import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { User, Creator } from "@/types";
import { useAuthState } from "./useAuthState";

export function useUser() {
  return useQuery<User | null>({
    queryKey: ["user"],
    queryFn: async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) return null;

      const { data: profile, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (error) throw error;

      return profile as User;
    },
  });
}

export function useCreatorProfile(userId?: string) {
  return useQuery<Creator | null>({
    queryKey: ["creator", userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from("creators")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      return data as Creator | null;
    },
    enabled: !!userId,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { refresh } = useAuthState();

  return useMutation({
    mutationFn: async ({
      userId,
      full_name,
      username,
      bio,
    }: {
      userId: string;
      full_name: string;
      username: string;
      bio?: string;
    }) => {
      // 1. Update user profile
      const { error: userError } = await supabase
        .from("users")
        .update({
          full_name,
          username,
        })
        .eq("id", userId);

      if (userError) throw userError;

      // 2. Update creator bio if provided
      if (typeof bio === "string") {
        const { error: creatorError } = await supabase
          .from("creators")
          .update({ bio })
          .eq("user_id", userId);

        if (creatorError) throw creatorError;
      }

      return { full_name, username, bio };
    },
    onMutate: async (newData) => {
      const { userId, full_name, username, bio } = newData;

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["user"] });
      await queryClient.cancelQueries({ queryKey: ["creator", userId] });

      // Snapshot previous values
      const previousUser = queryClient.getQueryData<User>(["user"]);
      const previousCreator = queryClient.getQueryData<Creator>([
        "creator",
        userId,
      ]);

      // Optimistically update user
      if (previousUser) {
        queryClient.setQueryData<User>(["user"], {
          ...previousUser,
          full_name,
          username,
        } as any);
      }

      // Optimistically update creator
      if (previousCreator && typeof bio === "string") {
        queryClient.setQueryData<Creator>(["creator", userId], {
          ...previousCreator,
          bio,
        });
      }

      return { previousUser, previousCreator, userId };
    },
    onError: (err, newData, context) => {
      if (context?.previousUser) {
        queryClient.setQueryData(["user"], context.previousUser);
      }
      if (context?.previousCreator) {
        queryClient.setQueryData(
          ["creator", context.userId],
          context.previousCreator
        );
      }
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
      queryClient.invalidateQueries({
        queryKey: ["creator", variables.userId],
      });
      // Sync with global auth state
      refresh();
    },
  });
}
