import Router from "express";
import { auth } from "../middlewares/auth.js";
import {
  followUser,
  getFollowers,
  getFollowing,
  checkFollowing,
  unfollowUser,
} from "../controllers/follow.controller.js";

const router = Router();

router.use(auth);

router.post("/follow/:id", followUser);
router.delete("/unfollow/:id", unfollowUser);
router.get("/followers/:id", getFollowers);
router.get("/following/:id", getFollowing);
router.get("/check/:id", checkFollowing);

export default router;
