import { Router } from "express";
import { auth } from "../middlewares/auth.js";
import {
  createService,
  getMyServices,
  getServiceById,
  updateService,
  deleteService,
  publishService,
  unpublishService,
  getAllServices,
  getServicesByCreator,
  createModule,
  getModulesByService,
  updateModule,
  deleteModule,
  createLesson,
  getLessonsByModule,
  updateLesson,
  deleteLesson,
  addResource,
  getResourcesByService,
  deleteResource,
} from "../controllers/service.controller.js";

const router = Router();

router.use(auth);

// Service routes (order matters - specific routes before parameterized)
router.get("/mine", getMyServices);
router.get("/", getAllServices);
router.post("/", createService);
router.get("/creator/:creatorId", getServicesByCreator);
router.get("/:id", getServiceById);
router.put("/:id", updateService);
router.delete("/:id", deleteService);
router.post("/:id/publish", publishService);
router.post("/:id/unpublish", unpublishService);

// Module routes
router.post("/:serviceId/modules", createModule);
router.get("/:serviceId/modules", getModulesByService);
router.put("/modules/:moduleId", updateModule);
router.delete("/modules/:moduleId", deleteModule);

// Lesson routes
router.post("/modules/:moduleId/lessons", createLesson);
router.get("/modules/:moduleId/lessons", getLessonsByModule);
router.put("/lessons/:lessonId", updateLesson);
router.delete("/lessons/:lessonId", deleteLesson);

// Resource routes
router.post("/:serviceId/resources", addResource);
router.get("/:serviceId/resources", getResourcesByService);
router.delete("/resources/:resourceId", deleteResource);

export default router;
