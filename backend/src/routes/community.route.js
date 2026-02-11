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
  createCommunity,
  getDiscoverCommunities,
  getJoinedCommunities,
  joinCommunity,
  leaveCommunity,
  getCommunityById,
  requestToJoin,
  getJoinRequests,
  handleJoinRequest,
  cancelJoinRequest,
  getJoinRequestStatus,
  getPendingRequestsCount,
} from "../controllers/community.controller.js";

const router = Router();

router.use(auth);

// Community management
router.post("/", createCommunity);
router.get("/discover", getDiscoverCommunities);
router.get("/joined", getJoinedCommunities);
router.post("/:id/join", joinCommunity);
router.delete("/:id/leave", leaveCommunity);
router.get("/:id", getCommunityById);

// Post management
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
