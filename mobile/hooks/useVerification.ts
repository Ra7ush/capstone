import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import api from "@/lib/api";
import type { VerificationStatus, VerificationResponse } from "@/types";
import { QUERY_KEYS, VERIFICATION_STATUS } from "@/constants";

interface VerificationData {
  full_legal_name: string;
  id_type: string;
  id_front_url: string;
  id_back_url: string | null;
  selfie_url: string;
  social_links?: {
    github?: string;
    linkedin?: string;
    instagram?: string;
  };
  portfolio_url?: string;
}

/**
 * Hook for managing creator verification
 *
 * Provides:
 * - submitVerification: Submit verification documents
 * - uploadImage: Upload image to Supabase storage
 * - verificationStatus: Current verification status
 */
export function useVerification() {
  const queryClient = useQueryClient();

  // Get current verification status
  const {
    data: verificationStatus,
    isLoading: isLoadingStatus,
    isError: isStatusError,
    refetch: refetchStatus,
  } = useQuery({
    queryKey: QUERY_KEYS.VERIFICATION,
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      // Get creator record with verification status
      const { data: creator } = await supabase
        .from("creators")
        .select("verification_status, verified_at")
        .eq("user_id", user.id)
        .maybeSingle();

      return creator as {
        verification_status: VerificationStatus;
        verified_at: string | null;
      } | null;
    },
  });

  // Submit verification mutation
  const submitMutation = useMutation({
    mutationFn: async (data: VerificationData) => {
      const response = await api.post<VerificationResponse>(
        "/api/creator/verify",
        data
      );
      return response.data;
    },
    onSuccess: () => {
      // Invalidate queries to refetch updated status
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.VERIFICATION });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CREATOR });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER });
    },
  });

  // Upload image to Supabase storage
  const uploadImage = async (uri: string, path: string): Promise<string> => {
    const formData = new FormData();
    const fileName = uri.split("/").pop();
    const fileType = fileName?.split(".").pop();

    formData.append("file", {
      uri,
      name: fileName,
      type: `image/${fileType}`,
    } as any);

    const { data, error } = await supabase.storage
      .from("verifications")
      .upload(path, formData, {
        cacheControl: "3600",
        upsert: true,
      });

    if (error) throw error;

    const {
      data: { publicUrl },
    } = supabase.storage.from("verifications").getPublicUrl(data.path);

    return publicUrl;
  };

  // Get current user ID for upload paths
  const getCurrentUserId = async (): Promise<string | null> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id || null;
  };

  return {
    // Verification status
    verificationStatus:
      verificationStatus?.verification_status || VERIFICATION_STATUS.NONE,
    verifiedAt: verificationStatus?.verified_at || null,
    isLoadingStatus,
    isStatusError,
    refetchStatus,

    // Submit verification
    submitVerification: submitMutation.mutateAsync,
    isSubmitting: submitMutation.isPending,
    submitError: submitMutation.error,

    // Helpers
    uploadImage,
    getCurrentUserId,
  };
}

export default useVerification;
