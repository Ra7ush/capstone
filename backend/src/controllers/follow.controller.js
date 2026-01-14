import supabase from "../config/db.js";

export async function followUser(req, res) {
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

    res.status(200).json({
      success: true,
      message: "Followed successfully",
    });
  } catch (error) {
    console.error("Follow error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to follow user",
    });
  }
}

export async function unfollowUser(req, res) {
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
    console.error("Unfollow error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to unfollow user",
    });
  }
}

export async function getFollowers(req, res) {
  const { id: userId } = req.params;

  try {
    const { data, error } = await supabase
      .from("follows")
      .select(
        "follower_id, users!follows_follower_id_fkey(id, username, email, followers_count, following_count, creators(bio))"
      )
      .eq("following_id", userId);

    if (error) throw error;

    const followers = data.map((f) => ({
      ...f.users,
      bio: f.users.creators?.bio,
    }));

    res.status(200).json({
      success: true,
      data: followers,
    });
  } catch (error) {
    console.error("Get followers error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get followers",
    });
  }
}

export async function getFollowing(req, res) {
  const { id: userId } = req.params;

  try {
    const { data, error } = await supabase
      .from("follows")
      .select(
        "following_id, users!follows_following_id_fkey(id, username, email, followers_count, following_count, creators(bio))"
      )
      .eq("follower_id", userId);

    if (error) throw error;

    const following = data.map((f) => ({
      ...f.users,
      bio: f.users.creators?.bio,
    }));

    res.status(200).json({
      success: true,
      data: following,
    });
  } catch (error) {
    console.error("Get following error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get following",
    });
  }
}
