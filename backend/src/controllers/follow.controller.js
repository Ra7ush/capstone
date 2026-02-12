import supabase from "../config/db.js";
import { logger } from "../config/logger.js";
import { getOrSet } from "../config/redis.js";
import { createNotification } from "./notification.controller.js";

export async function followUser(req, res, next) {
  const { id: followingId } = req.params;
  const followerId = req.user.id;

  if (followerId === followingId) {
    return res.status(400).json({
      success: false,
      error: "You cannot follow yourself",
    });
  }

  try {
    const { error } = await supabase.rpc("follow_user", {
      follower: followerId,
      following: followingId,
    });

    if (error) throw error;

    // Get follower's username for the notification
    const { data: followerUser } = await supabase
      .from("users")
      .select("username")
      .eq("id", followerId)
      .single();

    // Notify the person being followed
    await createNotification({
      userId: followingId,
      actorId: followerId,
      type: "follow",
      title: `${followerUser?.username || "Someone"} started following you`,
      data: { follower_id: followerId },
    });

    res.status(200).json({
      success: true,
      message: "Followed successfully",
    });
  } catch (error) {
    logger.error("Follow error:", error);
    next(error);
  }
}

export async function unfollowUser(req, res, next) {
  const { id: followingId } = req.params;
  const followerId = req.user.id;

  try {
    const { error } = await supabase.rpc("unfollow_user", {
      follower: followerId,
      following: followingId,
    });

    if (error) throw error;

    res.status(200).json({
      success: true,
      message: "Unfollowed successfully",
    });
  } catch (error) {
    logger.error("Unfollow error:", error);
    next(error);
  }
}

export async function getFollowers(req, res, next) {
  const { id: userId } = req.params;

  try {
    const followers = await getOrSet(
      `social:followers:${userId}`,
      async () => {
        const { data, error } = await supabase
          .from("follows")
          .select(
            "follower_id, users!follows_follower_id_fkey(id, username, profile_image_url, followers_count, following_count, creators(bio))",
          )
          .eq("following_id", userId);

        if (error) throw error;

        return data.map((f) => ({
          ...f.users,
          bio: f.users.creators?.bio,
        }));
      },
      600, // 10 minutes TTL
    );

    res.status(200).json({
      success: true,
      data: followers,
    });
  } catch (error) {
    logger.error("Get followers error:", error);
    next(error);
  }
}

export async function getFollowing(req, res, next) {
  const { id: userId } = req.params;
  try {
    const following = await getOrSet(
      `social:following:${userId}`,
      async () => {
        const { data, error } = await supabase
          .from("follows")
          .select(
            "following_id, users!follows_following_id_fkey(id, username, profile_image_url, followers_count, following_count, creators(bio))",
          )
          .eq("follower_id", userId);
        if (error) throw error;
        return data.map((f) => ({
          ...f.users,
          bio: f.users.creators?.bio,
        }));
      },
      600, // 10 minutes TTL
    );
    res.status(200).json({
      success: true,
      data: following,
    });
  } catch (error) {
    logger.error("Get following error:", error);
    next(error);
  }
}

export async function checkFollowing(req, res, next) {
  const { id: targetUserId } = req.params;
  const currentUserId = req.user.id;

  try {
    const { data, error } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", currentUserId)
      .eq("following_id", targetUserId)
      .maybeSingle();

    if (error) throw error;

    res.status(200).json({
      success: true,
      isFollowing: !!data,
    });
  } catch (error) {
    logger.error("Check following error:", error);
    next(error);
  }
}
