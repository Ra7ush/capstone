-- ==========================================
-- USER BLOCKING SYSTEM MIGRATION
-- ==========================================

-- 1. Create User Blocks Table
CREATE TABLE IF NOT EXISTS public.user_blocks (
    blocker_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (blocker_id, blocked_id),
    CONSTRAINT cannot_block_self CHECK (blocker_id <> blocked_id)
);

-- 2. Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_blocks;

-- 3. Add Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker_id ON public.user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked_id ON public.user_blocks(blocked_id);

-- 4. Enable RLS
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

-- 5. Policies
-- Users can see who they have blocked
CREATE POLICY "Users can view their own block list"
ON public.user_blocks FOR SELECT
TO authenticated
USING (auth.uid() = blocker_id);

-- Users can block others
CREATE POLICY "Users can block others"
ON public.user_blocks FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = blocker_id);

-- Users can unblock others
CREATE POLICY "Users can unblock others"
ON public.user_blocks FOR DELETE
TO authenticated
USING (auth.uid() = blocker_id);
