-- ==========================================
-- ATOMIC LIKE SYSTEM (Engineering Solution)
-- ==========================================

-- 1. Ensure absolute data integrity with UNIQUE constraint
-- First, clean up any existing duplicates that might have leaked
DELETE FROM public.post_likes a
USING public.post_likes b
WHERE a.id < b.id
  AND a.user_id = b.user_id
  AND a.post_id = b.post_id;

-- Now add the constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'post_likes_user_id_post_id_key'
    ) THEN
        ALTER TABLE public.post_likes
        ADD CONSTRAINT post_likes_user_id_post_id_key UNIQUE(post_id, user_id);
    END IF;
END $$;

-- 2. Create the Atomic Handler
-- This function handles the entire like/unlike lifecycle in ONE transaction.
-- It returns the FINAL authoritative count and the new state.
DROP FUNCTION IF EXISTS handle_post_like(uuid, uuid, text);

CREATE OR REPLACE FUNCTION handle_post_like(
    p_post_id UUID,
    p_user_id UUID,
    p_action TEXT
)
RETURNS TABLE (
    new_likes_count INTEGER,
    new_has_liked BOOLEAN
) AS $$
BEGIN
    -- Perform the action
    IF p_action = 'like' THEN
        INSERT INTO public.post_likes (post_id, user_id)
        VALUES (p_post_id, p_user_id)
        ON CONFLICT (post_id, user_id) DO NOTHING;
        new_has_liked := TRUE;
    ELSIF p_action = 'unlike' THEN
        DELETE FROM public.post_likes
        WHERE post_id = p_post_id AND user_id = p_user_id;
        new_has_liked := FALSE;
    END IF;

    -- Recalculate and Synchronize the count IMMEDIATELY
    -- This ensures the 'likes_count' column is ALWAYS accurate to the table rows.
    UPDATE public.posts
    SET likes_count = (
        SELECT COUNT(*)
        FROM public.post_likes
        WHERE post_id = p_post_id
    ),
    updated_at = NOW()
    WHERE id = p_post_id;

    -- Return the authoritative values
    RETURN QUERY
    SELECT
        likes_count,
        EXISTS(
          SELECT 1 FROM public.post_likes
          WHERE post_id = p_post_id AND user_id = p_user_id
        )
    FROM public.posts
    WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;