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
} from "../controllers/message.controller.js";

const router = Router();

router.use(auth);

router.get("/", getConversations);
router.get("/:conversationId", getMessages);
router.post("/send", sendMessage);
router.post("/get-or-create", getOrCreateConversation);
router.put("/:conversationId/read", markAsRead);
router.put("/:id", updateMessage);
router.delete("/:id", deleteMessage);

export default router;
