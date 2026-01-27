import { invalidatePattern } from "./redis.js";
import supabase from "./db.js";
import { logger } from "./logger.js";

export function setupRealtimeSync() {
  logger.info("🔄 Initializing Real-time Cache Invalidation Engine...");

  // Listen for database changes across all key tables
  supabase
    .channel("db-cache-invalidation")
    // 1. User Table - Invalidate profile and dashboard stats
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "users" },
      async (payload) => {
        const userId = payload.new?.id || payload.old?.id;
        if (!userId) {
          logger.warn(
            "[Realtime] User change missing id; invalidating dashboard",
          );
          await invalidatePattern("admin:dashboard:*");
          return;
        }
        logger.debug(`[Realtime] User change detected for: ${userId}`);

        await Promise.all([
          invalidatePattern(`profile:${userId}`),
          invalidatePattern("admin:dashboard:*"),
        ]);
      },
    )
    // 2. Posts Table - Invalidate feed and dashboard cache
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "posts" },
      async (payload) => {
        logger.debug("[Realtime] Post change detected, invalidating feed");
        await Promise.all([
          invalidatePattern("feed:*"),
          invalidatePattern("admin:dashboard:*"),
        ]);
      },
    )
    // 3. Creators Table - Invalidate creator and finance stats
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "creators" },
      async (payload) => {
        const userId = payload.new?.user_id || payload.old?.user_id;
        if (!userId) {
          +logger.warn(
            "[Realtime] Creator stats missing user_id; invalidating finance",
          );
          await Promise.all([
            invalidatePattern("admin:finance:*"),
            invalidatePattern("admin:dashboard:*"),
          ]);
          return;
        }
        logger.debug(`[Realtime] Creator stats changed for: ${userId}`);
        await Promise.all([
          invalidatePattern(`creator_stats:${userId}`),
          invalidatePattern("admin:finance:*"),
          invalidatePattern("admin:dashboard:*"),
        ]);
      },
    )
    // 4. Communities Table - Invalidate community lists
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "communities" },
      async (payload) => {
        logger.debug("[Realtime] Community change detected");
        await Promise.all([
          invalidatePattern("community:*"),
          invalidatePattern("admin:dashboard:*"),
        ]);
      },
    )
    // 5. Payouts Table - Invalidate finance dashboard
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "payouts" },
      async (payload) => {
        logger.debug("[Realtime] Payout change detected");
        await Promise.all([
          invalidatePattern("admin:finance:*"),
          invalidatePattern("admin:dashboard:*"),
        ]);
      },
    )
    // 6. Comments Table - Invalidate specific post comments
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "comments" },
      async (payload) => {
        const postId = payload.new?.post_id || payload.old?.post_id;
        if (!postId) {
          logger.warn(
            "[Realtime] Comment change missing post_id; invalidating all comments",
          );
          await invalidatePattern("comments:post:*");
          return;
        }
        logger.debug(`[Realtime] Comment change detected for post: ${postId}`);
        await invalidatePattern(`comments:post:${postId}`);
      },
    )
    // 7. Comment Likes Table - Invalidate specific post comments
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "comment_likes" },
      async (payload) => {
        logger.debug(
          "[Realtime] Comment like changed, clearing comment caches",
        );
        await invalidatePattern("comments:post:*");
      },
    )
    // 8. Follows Table - Invalidate follower/following lists
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "follows" },
      async (payload) => {
        const followerId = payload.new?.follower_id || payload.old?.follower_id;
        const followingId =
          payload.new?.following_id || payload.old?.following_id;
        if (!followerId || !followingId) {
          logger.warn(
            "[Realtime] Follow change missing ids; invalidating all social",
          );
          await Promise.all([
            invalidatePattern("social:followers:*"),
            invalidatePattern("social:following:*"),
          ]);
          return;
        }
        logger.debug(
          `[Realtime] Follow changed: ${followerId} -> ${followingId}`,
        );
        await Promise.all([
          invalidatePattern(`social:followers:${followingId}`),
          invalidatePattern(`social:following:${followerId}`),
        ]);
      },
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        logger.info("✅ Real-time Cache Invalidation active");
      }
    });
}
