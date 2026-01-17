-- ==========================================
-- LIKE SYSTEM SYNCHRONIZATION & REPAIR
-- ==========================================

-- 1. Ensure post_likes and posts match user's explicit schema
-- The user has already created post_likes with UNIQUE(post_id, user_id).

-- 2. Data Repair: Migrate and Clean
-- Move any stray records from the old 'likes' table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'likes') THEN
        INSERT INTO public.post_likes (post_id, user_id, created_at)
        SELECT post_id, user_id, created_at FROM public.likes
        ON CONFLICT (post_id, user_id) DO NOTHING;

        DROP TABLE public.likes;
    END IF;
END $$;

-- 3. Data Repair: Fix "9 likes from one user" anomaly
-- Delete duplicates that might have been created before the unique constraint was applied
DELETE FROM public.post_likes a
USING public.post_likes b
WHERE a.id < b.id
  AND a.user_id = b.user_id
  AND a.post_id = b.post_id;

-- 4. Create or update the increment/decrement functions to match user's parameter naming
CREATE OR REPLACE FUNCTION increment_likes(post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.posts
  SET likes_count = likes_count + 1,
      updated_at = NOW()
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_likes(post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.posts
  SET likes_count = GREATEST(0, likes_count - 1),
      updated_at = NOW()
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create Sync Function to reconcile all counts with actual records
CREATE OR REPLACE FUNCTION sync_post_likes_count()
RETURNS VOID AS $$
BEGIN
  UPDATE public.posts p
  SET likes_count = (
    SELECT COUNT(*)
    FROM public.post_likes l
    WHERE l.post_id = p.id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute initial sync
SELECT sync_post_likes_count();
