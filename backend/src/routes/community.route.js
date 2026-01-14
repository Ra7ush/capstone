import { Router } from "express";
import { auth } from "../middlewares/auth.js";
import {
  createPost,
  getFeed,
  getPostById,
  updatePost,
  deletePost,
  likePost,
  unlikePost,
  addComment,
  getComments,
  deleteComment,
  likeComment,
  unlikeComment,
  editComment,
} from "../controllers/community.controller.js";

const router = Router();

router.use(auth);

router.post("/posts", createPost);
router.get("/posts/feed", getFeed);
router.get("/posts/:id", getPostById);
router.put("/posts/:id", updatePost);
router.delete("/posts/:id", deletePost);
router.post("/posts/:id/like", likePost);
router.post("/posts/:id/comment", addComment);
router.get("/posts/:id/comments", getComments);
router.delete("/posts/:id/like", unlikePost);
router.delete("/posts/:id/comments/:commentId", deleteComment);
router.post("/comments/:commentId/like", likeComment);
router.delete("/comments/:commentId/like", unlikeComment);
router.put("/comments/:commentId", editComment);

export default router;
