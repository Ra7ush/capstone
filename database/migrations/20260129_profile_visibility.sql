-- ==========================================
-- PROFILE VISIBILITY MIGRATION
-- ==========================================

-- 1. Add is_public column to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

-- 2. Update existing users to be public (default)
UPDATE public.users SET is_public = true WHERE is_public IS NULL;

-- 3. Notify Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
