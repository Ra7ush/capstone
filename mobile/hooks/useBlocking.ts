import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { blockApi } from "../lib/api";
import { useAuthState } from "./useAuthState";

export function useBlockedUsers() {
  const { session } = useAuthState();
  return useQuery({
    queryKey: ["blocked-users"],
    queryFn: blockApi.getBlockedUsers,
    enabled: !!session,
  });
}

export function useBlockUser() {
  const queryClient = useQueryClient();
  const { session } = useAuthState();

  return useMutation({
    mutationFn: (userId: string) => blockApi.blockUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blocked-users"] });
      // Also invalidate search/profiles if needed
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useUnblockUser() {
  const queryClient = useQueryClient();
  const { session } = useAuthState();

  return useMutation({
    mutationFn: (userId: string) => blockApi.unblockUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blocked-users"] });
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
