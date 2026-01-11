import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { User, Creator } from "@/types";

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
