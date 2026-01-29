import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { serviceApi } from "@/lib/api";
import type { Service, CourseModule, Lesson, CourseResource } from "@/types";
import { supabase } from "@/lib/supabase";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system/legacy";

// ============================================
// Image Upload Helper
// ============================================

/**
 * Upload a course cover image to Supabase storage
 */
export async function uploadCourseImage(uri: string): Promise<string> {
  try {
    // Compress and convert image
    const manipulatedImage = await manipulateAsync(uri, [], {
      compress: 0.8,
      format: SaveFormat.JPEG,
    });

    const finalUri = manipulatedImage.uri;
    const originalName = uri.split("/").pop();
    const fileName = `${originalName?.split(".")[0] || "course"}_${Date.now()}.jpg`;

    // Read file as base64 and convert to ArrayBuffer
    const base64 = await FileSystem.readAsStringAsync(finalUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const fileData = decode(base64);

    // Use 'community' bucket with 'courses' folder path
    const filePath = `courses/${fileName}`;

    const { data, error } = await supabase.storage
      .from("community")
      .upload(filePath, fileData, {
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
    console.error("Error uploading course image:", error);
    throw error;
  }
}

// ============================================
// Query Keys
// ============================================

export const serviceKeys = {
  all: ["services"] as const,
  mine: () => [...serviceKeys.all, "mine"] as const,
  detail: (id: string) => [...serviceKeys.all, "detail", id] as const,
  modules: (serviceId: string) =>
    [...serviceKeys.all, "modules", serviceId] as const,
  lessons: (moduleId: string) =>
    [...serviceKeys.all, "lessons", moduleId] as const,
  resources: (serviceId: string) =>
    [...serviceKeys.all, "resources", serviceId] as const,
};

// ============================================
// Service Hooks
// ============================================

/**
 * Hook to fetch current user's services
 */
export function useMyServices() {
  return useQuery({
    queryKey: serviceKeys.mine(),
    queryFn: async () => {
      const response = await serviceApi.getMyServices();
      return response.data as Service[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to fetch a single service with modules and lessons
 */
export function useService(id: string | undefined) {
  return useQuery({
    queryKey: serviceKeys.detail(id || ""),
    queryFn: async () => {
      if (!id) throw new Error("Service ID required");
      const response = await serviceApi.getServiceById(id);
      return response.data as Service;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook to create a new service
 */
export function useCreateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: serviceApi.createService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: serviceKeys.mine() });
    },
  });
}

/**
 * Hook to update a service
 */
export function useUpdateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Parameters<typeof serviceApi.updateService>[1];
    }) => serviceApi.updateService(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: serviceKeys.mine() });
      queryClient.invalidateQueries({
        queryKey: serviceKeys.detail(variables.id),
      });
    },
  });
}

/**
 * Hook to delete a service
 */
export function useDeleteService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: serviceApi.deleteService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: serviceKeys.mine() });
    },
  });
}

/**
 * Hook to publish a service
 */
export function usePublishService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: serviceApi.publishService,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: serviceKeys.mine() });
      queryClient.invalidateQueries({ queryKey: serviceKeys.detail(id) });
    },
  });
}

/**
 * Hook to unpublish a service
 */
export function useUnpublishService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: serviceApi.unpublishService,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: serviceKeys.mine() });
      queryClient.invalidateQueries({ queryKey: serviceKeys.detail(id) });
    },
  });
}

// ============================================
// Module Hooks
// ============================================

/**
 * Hook to create a module
 */
export function useCreateModule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ serviceId, title }: { serviceId: string; title: string }) =>
      serviceApi.createModule(serviceId, { title }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: serviceKeys.detail(variables.serviceId),
      });
    },
  });
}

/**
 * Hook to update a module
 */
export function useUpdateModule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      moduleId,
      serviceId,
      data,
    }: {
      moduleId: string;
      serviceId: string;
      data: { title?: string; order_index?: number };
    }) => serviceApi.updateModule(moduleId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: serviceKeys.detail(variables.serviceId),
      });
    },
  });
}

/**
 * Hook to delete a module
 */
export function useDeleteModule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      moduleId,
      serviceId,
    }: {
      moduleId: string;
      serviceId: string;
    }) => serviceApi.deleteModule(moduleId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: serviceKeys.detail(variables.serviceId),
      });
    },
  });
}

// ============================================
// Lesson Hooks
// ============================================

/**
 * Hook to create a lesson
 */
export function useCreateLesson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      moduleId,
      serviceId,
      data,
    }: {
      moduleId: string;
      serviceId: string;
      data: {
        title: string;
        description?: string;
        video_url?: string;
        video_duration?: number;
        is_preview?: boolean;
      };
    }) => serviceApi.createLesson(moduleId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: serviceKeys.detail(variables.serviceId),
      });
    },
  });
}

/**
 * Hook to update a lesson
 */
export function useUpdateLesson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      lessonId,
      serviceId,
      data,
    }: {
      lessonId: string;
      serviceId: string;
      data: {
        title?: string;
        description?: string;
        video_url?: string;
        video_duration?: number;
        is_preview?: boolean;
        order_index?: number;
      };
    }) => serviceApi.updateLesson(lessonId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: serviceKeys.detail(variables.serviceId),
      });
    },
  });
}

/**
 * Hook to delete a lesson
 */
export function useDeleteLesson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      lessonId,
      serviceId,
    }: {
      lessonId: string;
      serviceId: string;
    }) => serviceApi.deleteLesson(lessonId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: serviceKeys.detail(variables.serviceId),
      });
    },
  });
}

// ============================================
// Resource Hooks
// ============================================

/**
 * Hook to add a resource
 */
export function useAddResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      serviceId,
      data,
    }: {
      serviceId: string;
      data: {
        title: string;
        file_url: string;
        file_type?: string;
        file_size?: number;
        lesson_id?: string;
      };
    }) => serviceApi.addResource(serviceId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: serviceKeys.detail(variables.serviceId),
      });
    },
  });
}

/**
 * Hook to delete a resource
 */
export function useDeleteResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      resourceId,
      serviceId,
    }: {
      resourceId: string;
      serviceId: string;
    }) => serviceApi.deleteResource(resourceId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: serviceKeys.detail(variables.serviceId),
      });
    },
  });
}

// ============================================
// Combined Hook for Service Management
// ============================================

/**
 * Combined hook for all service-related operations
 */
export function useServiceManagement(serviceId?: string) {
  const queryClient = useQueryClient();

  // Queries
  const myServices = useMyServices();
  const service = useService(serviceId);

  // Service mutations
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();
  const publishService = usePublishService();
  const unpublishService = useUnpublishService();

  // Module mutations
  const createModule = useCreateModule();
  const updateModule = useUpdateModule();
  const deleteModule = useDeleteModule();

  // Lesson mutations
  const createLesson = useCreateLesson();
  const updateLesson = useUpdateLesson();
  const deleteLesson = useDeleteLesson();

  // Resource mutations
  const addResource = useAddResource();
  const deleteResource = useDeleteResource();

  // Refresh function
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: serviceKeys.mine() });
    if (serviceId) {
      queryClient.invalidateQueries({
        queryKey: serviceKeys.detail(serviceId),
      });
    }
  };

  return {
    // Data
    services: myServices.data || [],
    service: service.data,
    isLoading: myServices.isLoading,
    isLoadingService: service.isLoading,
    isRefetching: myServices.isRefetching,
    error: myServices.error,
    serviceError: service.error,

    // Service operations
    createService: createService.mutateAsync,
    isCreating: createService.isPending,
    updateService: updateService.mutateAsync,
    isUpdating: updateService.isPending,
    deleteService: deleteService.mutateAsync,
    isDeleting: deleteService.isPending,
    publishService: publishService.mutateAsync,
    isPublishing: publishService.isPending,
    unpublishService: unpublishService.mutateAsync,
    isUnpublishing: unpublishService.isPending,

    // Module operations
    createModule: createModule.mutateAsync,
    isCreatingModule: createModule.isPending,
    updateModule: updateModule.mutateAsync,
    isUpdatingModule: updateModule.isPending,
    deleteModule: deleteModule.mutateAsync,
    isDeletingModule: deleteModule.isPending,

    // Lesson operations
    createLesson: createLesson.mutateAsync,
    isCreatingLesson: createLesson.isPending,
    updateLesson: updateLesson.mutateAsync,
    isUpdatingLesson: updateLesson.isPending,
    deleteLesson: deleteLesson.mutateAsync,
    isDeletingLesson: deleteLesson.isPending,

    // Resource operations
    addResource: addResource.mutateAsync,
    isAddingResource: addResource.isPending,
    deleteResource: deleteResource.mutateAsync,
    isDeletingResource: deleteResource.isPending,

    // Utilities
    refresh,
    refetch: myServices.refetch,
    refetchService: service.refetch,
  };
}
