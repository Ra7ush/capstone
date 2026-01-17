-- ==========================================
-- CASCADE DELETE MIGRATION
-- ==========================================
--
-- RATIONALE: Changed from ON DELETE SET NULL to ON DELETE CASCADE
--
-- Previous behavior (SET NULL): When a community was deleted, posts would
-- remain but lose their community association (community_id = NULL).
--
-- New behavior (CASCADE): When a community is deleted, ALL posts belonging
-- to that community are permanently deleted.
--
-- This change was made because:
-- 1. Posts are inherently tied to their community context and have no meaning outside it
-- 2. Orphaned posts (with NULL community_id) create data integrity issues
-- 3. Community deletion is an intentional action that should clean up all related content
-- 4. This aligns with how community_members already handles deletion (CASCADE)
--
-- WARNING: This is a destructive operation. Ensure proper confirmation dialogs
-- exist in the application before allowing community deletion.
-- ==========================================

-- 1. Identify the existing foreign key constraint on the posts table
-- Note: In Supabase/PostgreSQL, we need to drop the existing constraint by name.
-- Since the previous migration didn't name it explicitly, we'll find and drop it.

DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.posts'::regclass
    AND contype = 'f'
    AND confrelid = 'public.communities'::regclass;

    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.posts DROP CONSTRAINT ' || constraint_name;
    END IF;
END $$;

-- 2. Add the constraint back with ON DELETE CASCADE
ALTER TABLE public.posts
ADD CONSTRAINT posts_community_id_fkey
FOREIGN KEY (community_id)
REFERENCES public.communities(id)
ON DELETE CASCADE;

-- 3. Also ensure community_members is definitely cascading (it was in the initial, but good to reinforce)
-- (Already handled in initial migration but listed here for integrity check)
-- ALTER TABLE public.community_members
-- DROP CONSTRAINT IF EXISTS community_members_community_id_fkey,
-- ADD CONSTRAINT community_members_community_id_fkey
-- FOREIGN KEY (community_id)
-- REFERENCES public.communities(id)
-- ON DELETE CASCADE;
