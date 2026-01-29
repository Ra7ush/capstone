import supabase from "../config/db.js";
import { logger } from "../config/logger.js";

// Service type is fixed to 'course' only for now
const SERVICE_TYPES = {
  COURSE: "course",
};

// ============================================
// Service controllers
// ============================================

export async function createService(req, res, next) {
  try {
    const { title, description, category, price, thumbnail_url } = req.body;
    const creatorId = req.user.id;

    const { data, error } = await supabase
      .from("services")
      .insert([
        {
          title,
          description,
          category,
          type: SERVICE_TYPES.COURSE, // Fixed to course
          price: price ? parseFloat(price) : null,
          thumbnail_url,
          creator_id: creatorId,
          status: "draft",
        },
      ])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, data });
  } catch (error) {
    logger.error("Error creating service:", error);
    next(error);
  }
}

export async function getMyServices(req, res, next) {
  try {
    const creatorId = req.user.id;
    const { data, error } = await supabase
      .from("services")
      .select(
        `
        *,
        modules:course_modules(count)
      `,
      )
      .eq("creator_id", creatorId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Transform to include module count
    const services = data.map((service) => ({
      ...service,
      modules_count: service.modules?.[0]?.count || 0,
      modules: undefined,
    }));

    res.status(200).json({ success: true, data: services });
  } catch (error) {
    logger.error("Error fetching services:", error);
    next(error);
  }
}

export async function getServiceById(req, res, next) {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("services")
      .select(
        `
        *,
        modules:course_modules(
          *,
          lessons:lessons(*)
        ),
        resources:course_resources(*)
      `,
      )
      .eq("id", id)
      .single();

    if (error) throw error;

    // Check authorization for draft services
    if (data && data.status === "draft" && data.creator_id !== req.user?.id) {
      return res
        .status(404)
        .json({ success: false, error: "Service not found" });
    }

    // Manual join for creator
    if (data && data.creator_id) {
      const { data: creatorData } = await supabase
        .from("users")
        .select("id, username, profile_image_url")
        .eq("id", data.creator_id)
        .single();

      data.creator = creatorData || null;
    }

    // Sort modules and lessons by order_index
    if (data.modules) {
      data.modules.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
      data.modules.forEach((module) => {
        if (module.lessons) {
          module.lessons.sort(
            (a, b) => (a.order_index || 0) - (b.order_index || 0),
          );
        }
      });
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    logger.error("Error fetching service:", error);
    next(error);
  }
}

export async function updateService(req, res, next) {
  try {
    const { id } = req.params;
    const creator_id = req.user.id;
    const { title, description, category, price, thumbnail_url, status } =
      req.body;

    const update = {};
    if (title !== undefined) update.title = title;
    if (description !== undefined) update.description = description;
    if (category !== undefined) update.category = category;
    if (price !== undefined) update.price = price ? parseFloat(price) : null;
    if (thumbnail_url !== undefined) update.thumbnail_url = thumbnail_url;
    if (status !== undefined) update.status = status;

    const { data, error } = await supabase
      .from("services")
      .update(update)
      .eq("id", id)
      .eq("creator_id", creator_id)
      .select()
      .single();

    if (error) throw error;
    if (!data)
      return res
        .status(404)
        .json({ success: false, error: "Service not found" });

    res.status(200).json({ success: true, data });
  } catch (error) {
    logger.error("Update service error:", error);
    next(error);
  }
}

export async function deleteService(req, res, next) {
  try {
    const { id } = req.params;
    const creator_id = req.user.id;

    const { error } = await supabase
      .from("services")
      .delete()
      .eq("id", id)
      .eq("creator_id", creator_id);

    if (error) throw error;

    res.status(200).json({ success: true, message: "Service deleted" });
  } catch (error) {
    logger.error("Delete service error:", error);
    next(error);
  }
}

export async function publishService(req, res, next) {
  try {
    const { id } = req.params;
    const creator_id = req.user.id;

    const { data, error } = await supabase
      .from("services")
      .update({ status: "published" })
      .eq("id", id)
      .eq("creator_id", creator_id)
      .select()
      .single();

    if (error) throw error;
    if (!data)
      return res
        .status(404)
        .json({ success: false, error: "Service not found" });

    res.status(200).json({ success: true, data });
  } catch (error) {
    logger.error("Publish service error:", error);
    next(error);
  }
}

export async function unpublishService(req, res, next) {
  try {
    const { id } = req.params;
    const creator_id = req.user.id;

    const { data, error } = await supabase
      .from("services")
      .update({ status: "draft" })
      .eq("id", id)
      .eq("creator_id", creator_id)
      .select()
      .single();

    if (error) throw error;
    if (!data)
      return res
        .status(404)
        .json({ success: false, error: "Service not found" });

    res.status(200).json({ success: true, data });
  } catch (error) {
    logger.error("Unpublish service error:", error);
    next(error);
  }
}

export const getAllServices = async (req, res, next) => {
  try {
    const { category, search } = req.query;

    let query = supabase
      .from("services")
      .select(
        `
        *,
        modules:course_modules(count)
      `,
      )
      .eq("status", "published")
      .eq("type", SERVICE_TYPES.COURSE);

    if (category) query = query.eq("category", category);
    if (search) query = query.ilike("title", `%${search}%`);

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) throw error;

    // Manual join for creators
    const creatorIds = [...new Set(data.map((s) => s.creator_id))];
    let creatorsMap = {};

    if (creatorIds.length > 0) {
      const { data: creatorsData } = await supabase
        .from("users")
        .select("id, username, profile_image_url")
        .in("id", creatorIds);

      if (creatorsData) {
        creatorsMap = creatorsData.reduce((acc, c) => {
          acc[c.id] = c;
          return acc;
        }, {});
      }
    }

    // Transform to include module count and creator
    const services = data.map((service) => ({
      ...service,
      modules_count: service.modules?.[0]?.count || 0,
      modules: undefined,
      creator: creatorsMap[service.creator_id] || null,
    }));

    res.json({ success: true, data: services });
  } catch (error) {
    logger.error("Get services error:", error);
    next(error);
  }
};

export async function getServicesByCreator(req, res, next) {
  try {
    const { creatorId } = req.params;

    const { data, error } = await supabase
      .from("services")
      .select(
        `
        *,
        modules:course_modules(count)
      `,
      )
      .eq("creator_id", creatorId)
      .eq("status", "published")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Manual join for creator (only one needed since they all belong to the same creator)
    let creator = null;
    if (data.length > 0) {
      const { data: creatorData } = await supabase
        .from("users")
        .select("id, username, profile_image_url")
        .eq("id", creatorId)
        .single();
      creator = creatorData;
    }

    // Transform to include module count and creator
    const services = data.map((service) => ({
      ...service,
      modules_count: service.modules?.[0]?.count || 0,
      modules: undefined,
      creator: creator,
    }));

    res.status(200).json({ success: true, data: services });
  } catch (error) {
    logger.error("Get services error:", error);
    next(error);
  }
}

// ============================================
// Module controllers
// ============================================

export async function createModule(req, res, next) {
  try {
    const { serviceId } = req.params;
    const { title } = req.body;
    const creator_id = req.user.id;

    // Verify ownership
    const { data: service, error: serviceError } = await supabase
      .from("services")
      .select("id")
      .eq("id", serviceId)
      .eq("creator_id", creator_id)
      .single();

    if (serviceError || !service) {
      return res
        .status(404)
        .json({ success: false, error: "Service not found" });
    }

    let moduleData = null;
    let retries = 0;
    const MAX_RETRIES = 3;
    let lastError = null;

    while (retries < MAX_RETRIES) {
      try {
        // Get max order_index
        const { data: maxOrder } = await supabase
          .from("course_modules")
          .select("order_index")
          .eq("service_id", serviceId)
          .order("order_index", { ascending: false })
          .limit(1)
          .single();

        const order_index = (maxOrder?.order_index || 0) + 1;

        const { data, error } = await supabase
          .from("course_modules")
          .insert([
            {
              service_id: serviceId,
              title,
              order_index,
            },
          ])
          .select()
          .single();

        if (error) {
          // Check for unique constraint violation (PostgreSQL code 23505)
          if (error.code === "23505") {
            lastError = error;
            retries++;
            continue;
          }
          throw error;
        }

        moduleData = data;
        break;
      } catch (err) {
        lastError = err;
        if (retries >= MAX_RETRIES - 1) throw err;
        retries++;
      }
    }

    if (!moduleData) {
      throw lastError || new Error("Failed to create module after retries");
    }
    res.status(201).json({ success: true, data: moduleData });
  } catch (error) {
    logger.error("Create module error:", error);
    next(error);
  }
}

export async function getModulesByService(req, res, next) {
  try {
    const { serviceId } = req.params;
    const userId = req.user?.id;

    // Verify service visibility
    const { data: service, error: serviceError } = await supabase
      .from("services")
      .select("status, creator_id")
      .eq("id", serviceId)
      .single();

    if (serviceError || !service) {
      return res
        .status(404)
        .json({ success: false, error: "Service not found" });
    }

    if (service.status === "draft" && service.creator_id !== userId) {
      return res
        .status(404)
        .json({ success: false, error: "Service not found" });
    }

    const { data, error } = await supabase
      .from("course_modules")
      .select(
        `
        *,
        lessons:lessons(*)
      `,
      )
      .eq("service_id", serviceId)
      .order("order_index", { ascending: true });

    if (error) throw error;

    // Sort lessons within each module
    data.forEach((module) => {
      if (module.lessons) {
        module.lessons.sort(
          (a, b) => (a.order_index || 0) - (b.order_index || 0),
        );
      }
    });

    res.status(200).json({ success: true, data });
  } catch (error) {
    logger.error("Get modules error:", error);
    next(error);
  }
}

export async function updateModule(req, res, next) {
  try {
    const { moduleId } = req.params;
    const { title, order_index } = req.body;
    const creator_id = req.user.id;

    // Verify ownership via service
    const { data: module, error: moduleError } = await supabase
      .from("course_modules")
      .select("service_id")
      .eq("id", moduleId)
      .single();

    if (moduleError || !module) {
      return res
        .status(404)
        .json({ success: false, error: "Module not found" });
    }

    const { data: service } = await supabase
      .from("services")
      .select("id")
      .eq("id", module.service_id)
      .eq("creator_id", creator_id)
      .single();

    if (!service) {
      return res.status(403).json({ success: false, error: "Not authorized" });
    }

    const update = {};
    if (title !== undefined) update.title = title;
    if (order_index !== undefined) update.order_index = order_index;

    const { data, error } = await supabase
      .from("course_modules")
      .update(update)
      .eq("id", moduleId)
      .select()
      .single();

    if (error) throw error;

    res.status(200).json({ success: true, data });
  } catch (error) {
    logger.error("Update module error:", error);
    next(error);
  }
}

export async function deleteModule(req, res, next) {
  try {
    const { moduleId } = req.params;
    const creator_id = req.user.id;

    // Verify ownership via service
    const { data: module, error: moduleError } = await supabase
      .from("course_modules")
      .select("service_id")
      .eq("id", moduleId)
      .single();

    if (moduleError || !module) {
      return res
        .status(404)
        .json({ success: false, error: "Module not found" });
    }

    const { data: service } = await supabase
      .from("services")
      .select("id")
      .eq("id", module.service_id)
      .eq("creator_id", creator_id)
      .single();

    if (!service) {
      return res.status(403).json({ success: false, error: "Not authorized" });
    }

    const { error } = await supabase
      .from("course_modules")
      .delete()
      .eq("id", moduleId);

    if (error) throw error;

    res.status(200).json({ success: true, message: "Module deleted" });
  } catch (error) {
    logger.error("Delete module error:", error);
    next(error);
  }
}

// ============================================
// Lesson controllers
// ============================================

export async function createLesson(req, res, next) {
  try {
    const { moduleId } = req.params;
    const { title, description, video_url, video_duration, is_preview } =
      req.body;
    const creator_id = req.user.id;

    // Verify ownership via module -> service
    const { data: module, error: moduleError } = await supabase
      .from("course_modules")
      .select("service_id")
      .eq("id", moduleId)
      .single();

    if (moduleError || !module) {
      return res
        .status(404)
        .json({ success: false, error: "Module not found" });
    }

    const { data: service } = await supabase
      .from("services")
      .select("id")
      .eq("id", module.service_id)
      .eq("creator_id", creator_id)
      .single();

    if (!service) {
      return res.status(403).json({ success: false, error: "Not authorized" });
    }

    let lessonData = null;
    let retries = 0;
    const MAX_RETRIES = 3;
    let lastError = null;
    while (retries < MAX_RETRIES) {
      try {
        // Get max order_index for lessons in this module
        const { data: maxOrder } = await supabase
          .from("lessons")
          .select("order_index")
          .eq("module_id", moduleId)
          .order("order_index", { ascending: false })
          .limit(1)
          .single();
        const order_index = (maxOrder?.order_index || 0) + 1;
        const { data, error } = await supabase
          .from("lessons")
          .insert([
            {
              module_id: moduleId,
              title,
              description,
              video_url,
              video_duration: video_duration ? parseInt(video_duration) : null,
              is_preview: is_preview || false,
              order_index,
            },
          ])
          .select()
          .single();
        if (error) {
          // Check for unique constraint violation (PostgreSQL code 23505)
          if (error.code === "23505") {
            lastError = error;
            retries++;
            continue;
          }
          throw error;
        }
        lessonData = data;
        break;
      } catch (err) {
        lastError = err;
        if (retries >= MAX_RETRIES - 1) throw err;
        retries++;
      }
    }
    if (!lessonData) {
      throw lastError || new Error("Failed to create lesson after retries");
    }
    res.status(201).json({ success: true, data: lessonData });
  } catch (error) {
    logger.error("Create lesson error:", error);
    next(error);
  }
}

export async function getLessonsByModule(req, res, next) {
  try {
    const { moduleId } = req.params;
    const userId = req.user?.id;

    // Verify visibility via module -> service
    const { data: module, error: moduleError } = await supabase
      .from("course_modules")
      .select("service_id")
      .eq("id", moduleId)
      .single();

    if (moduleError || !module) {
      return res
        .status(404)
        .json({ success: false, error: "Module not found" });
    }

    const { data: service, error: serviceError } = await supabase
      .from("services")
      .select("status, creator_id")
      .eq("id", module.service_id)
      .single();

    if (serviceError || !service) {
      return res
        .status(404)
        .json({ success: false, error: "Service not found" });
    }

    if (service.status === "draft" && service.creator_id !== userId) {
      return res
        .status(404)
        .json({ success: false, error: "Service not found" });
    }

    const { data, error } = await supabase
      .from("lessons")
      .select("*")
      .eq("module_id", moduleId)
      .order("order_index", { ascending: true });

    if (error) throw error;

    res.status(200).json({ success: true, data });
  } catch (error) {
    logger.error("Get lessons error:", error);
    next(error);
  }
}

export async function updateLesson(req, res, next) {
  try {
    const { lessonId } = req.params;
    const {
      title,
      description,
      video_url,
      video_duration,
      is_preview,
      order_index,
    } = req.body;
    const creator_id = req.user.id;

    // Verify ownership via lesson -> module -> service
    const { data: lesson, error: lessonError } = await supabase
      .from("lessons")
      .select("module_id")
      .eq("id", lessonId)
      .single();

    if (lessonError || !lesson) {
      return res
        .status(404)
        .json({ success: false, error: "Lesson not found" });
    }

    const { data: module } = await supabase
      .from("course_modules")
      .select("service_id")
      .eq("id", lesson.module_id)
      .single();

    if (!module) {
      return res
        .status(404)
        .json({ success: false, error: "Module not found" });
    }

    const { data: service } = await supabase
      .from("services")
      .select("id")
      .eq("id", module.service_id)
      .eq("creator_id", creator_id)
      .single();

    if (!service) {
      return res.status(403).json({ success: false, error: "Not authorized" });
    }

    const update = {};
    if (title !== undefined) update.title = title;
    if (description !== undefined) update.description = description;
    if (video_url !== undefined) update.video_url = video_url;
    if (video_duration !== undefined)
      update.video_duration = video_duration ? parseInt(video_duration) : null;
    if (is_preview !== undefined) update.is_preview = is_preview;
    if (order_index !== undefined) update.order_index = order_index;

    const { data, error } = await supabase
      .from("lessons")
      .update(update)
      .eq("id", lessonId)
      .select()
      .single();

    if (error) throw error;

    res.status(200).json({ success: true, data });
  } catch (error) {
    logger.error("Update lesson error:", error);
    next(error);
  }
}

export async function deleteLesson(req, res, next) {
  try {
    const { lessonId } = req.params;
    const creator_id = req.user.id;

    // Verify ownership via lesson -> module -> service
    const { data: lesson, error: lessonError } = await supabase
      .from("lessons")
      .select("module_id")
      .eq("id", lessonId)
      .single();

    if (lessonError || !lesson) {
      return res
        .status(404)
        .json({ success: false, error: "Lesson not found" });
    }

    const { data: module } = await supabase
      .from("course_modules")
      .select("service_id")
      .eq("id", lesson.module_id)
      .single();

    if (!module) {
      return res
        .status(404)
        .json({ success: false, error: "Module not found" });
    }

    const { data: service } = await supabase
      .from("services")
      .select("id")
      .eq("id", module.service_id)
      .eq("creator_id", creator_id)
      .single();

    if (!service) {
      return res.status(403).json({ success: false, error: "Not authorized" });
    }

    const { error } = await supabase
      .from("lessons")
      .delete()
      .eq("id", lessonId);

    if (error) throw error;

    res.status(200).json({ success: true, message: "Lesson deleted" });
  } catch (error) {
    logger.error("Delete lesson error:", error);
    next(error);
  }
}

// ============================================
// Resource controllers
// ============================================

export async function addResource(req, res, next) {
  try {
    const { serviceId } = req.params;
    const { title, file_url, file_type, file_size, lesson_id } = req.body;
    const creator_id = req.user.id;

    // Verify ownership
    const { data: service, error: serviceError } = await supabase
      .from("services")
      .select("id")
      .eq("id", serviceId)
      .eq("creator_id", creator_id)
      .single();

    if (serviceError || !service) {
      return res
        .status(404)
        .json({ success: false, error: "Service not found" });
    }

    const { data, error } = await supabase
      .from("course_resources")
      .insert([
        {
          service_id: serviceId,
          lesson_id: lesson_id || null,
          title,
          file_url,
          file_type,
          file_size: file_size ? parseInt(file_size) : null,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, data });
  } catch (error) {
    logger.error("Add resource error:", error);
    next(error);
  }
}

export async function getResourcesByService(req, res, next) {
  try {
    const { serviceId } = req.params;
    const userId = req.user?.id;

    // Verify service visibility
    const { data: service, error: serviceError } = await supabase
      .from("services")
      .select("status, creator_id")
      .eq("id", serviceId)
      .single();

    if (serviceError || !service) {
      return res
        .status(404)
        .json({ success: false, error: "Service not found" });
    }

    if (service.status === "draft" && service.creator_id !== userId) {
      return res
        .status(404)
        .json({ success: false, error: "Service not found" });
    }

    const { data, error } = await supabase
      .from("course_resources")
      .select("*")
      .eq("service_id", serviceId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    res.status(200).json({ success: true, data });
  } catch (error) {
    logger.error("Get resources error:", error);
    next(error);
  }
}

export async function deleteResource(req, res, next) {
  try {
    const { resourceId } = req.params;
    const creator_id = req.user.id;

    // Verify ownership via resource -> service
    const { data: resource, error: resourceError } = await supabase
      .from("course_resources")
      .select("service_id")
      .eq("id", resourceId)
      .single();

    if (resourceError || !resource) {
      return res
        .status(404)
        .json({ success: false, error: "Resource not found" });
    }

    const { data: service } = await supabase
      .from("services")
      .select("id")
      .eq("id", resource.service_id)
      .eq("creator_id", creator_id)
      .single();

    if (!service) {
      return res.status(403).json({ success: false, error: "Not authorized" });
    }

    const { error } = await supabase
      .from("course_resources")
      .delete()
      .eq("id", resourceId);

    if (error) throw error;

    res.status(200).json({ success: true, message: "Resource deleted" });
  } catch (error) {
    logger.error("Delete resource error:", error);
    next(error);
  }
}
