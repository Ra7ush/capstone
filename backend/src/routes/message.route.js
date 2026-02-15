import { Router } from "express";
import { auth } from "../middlewares/auth.js";
import {
  getMessages,
  getConversations,
  sendMessage,
  getOrCreateConversation,
  markAsRead,
  updateMessage,
  deleteMessage,
  getMessageRequests,
  getMessageRequestsCount,
  acceptMessageRequest,
  declineMessageRequest,
} from "../controllers/message.controller.js";
import {
  validateRequest,
  sendMessageSchema,
  getOrCreateConversationSchema,
} from "../validators/schemas.js";

const router = Router();

router.use(auth);

// Message requests (must be before /:conversationId to avoid conflicts)
router.get("/requests", getMessageRequests);
router.get("/requests/count", getMessageRequestsCount);
router.put("/requests/:conversationId/accept", acceptMessageRequest);
router.put("/requests/:conversationId/decline", declineMessageRequest);

router.get("/", getConversations);
router.get("/:conversationId", getMessages);
router.post("/send", validateRequest({ body: sendMessageSchema }), sendMessage);
router.post(
  "/get-or-create",
  validateRequest({ body: getOrCreateConversationSchema }),
  getOrCreateConversation,
);
router.put("/:conversationId/read", markAsRead);
router.put("/:id", updateMessage);
router.delete("/:id", deleteMessage);

export default router;
