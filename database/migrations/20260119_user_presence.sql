-- ==========================================
-- USER PRESENCE MIGRATION
-- ==========================================

-- 1. Add last_seen_at column to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- 2. Add index for performance on status queries
CREATE INDEX IF NOT EXISTS idx_users_last_seen_at ON public.users(last_seen_at);

-- 3. Ensure the column is public for Realtime tracking if needed
-- (Though presence handles most of this)
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
