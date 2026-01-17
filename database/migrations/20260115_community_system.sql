-- ==========================================
-- COMMUNITY SYSTEM MIGRATION
-- ==========================================

-- 1. Create Communities Table
CREATE TABLE IF NOT EXISTS public.communities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    banner_url TEXT,
    privacy TEXT DEFAULT 'public' CHECK (privacy IN ('public', 'private')),
    category TEXT DEFAULT 'General' CHECK (category IN ('Art', 'Health', 'Gaming', 'Tech', 'Business', 'Lifestyle', 'Education', 'General')),
    members_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Community Members Table
CREATE TABLE IF NOT EXISTS public.community_members (
    community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('member', 'admin')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (community_id, user_id)
);

-- 3. Update Posts Table to link to community
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS community_id UUID REFERENCES public.communities(id) ON DELETE SET NULL;

-- 4. Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.communities;
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_members;

-- 5. RPC function to increment member count (Trigger-based or manual)
CREATE OR REPLACE FUNCTION increment_community_members(community_row_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.communities
  SET members_count = members_count + 1
  WHERE id = community_row_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_community_members(community_row_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.communities
  SET members_count = GREATEST(0, members_count - 1)
  WHERE id = community_row_id;
END;
$$ LANGUAGE plpgsql;

-- 6. Add Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_communities_creator_id ON public.communities(creator_id);
CREATE INDEX IF NOT EXISTS idx_community_members_user_id ON public.community_members(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_community_id ON public.posts(community_id);

-- 7. Security Policies (RLS)
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;

-- Communities: Everyone can view public communities
CREATE POLICY "Public communities are viewable by everyone"
ON public.communities FOR SELECT
USING (privacy = 'public');

-- Communities: Authenticated users can see all (for joining/discovery)
-- Or use a more restricted policy if needed
CREATE POLICY "Authenticated users can view communities"
ON public.communities FOR SELECT
TO authenticated
USING (true);

-- Communities: Only creators can update their own
CREATE POLICY "Creators can update their communities"
ON public.communities FOR UPDATE
TO authenticated
USING (auth.uid() = creator_id);

-- Community Members: Users can see their own memberships
CREATE POLICY "Users can view their own memberships"
ON public.community_members FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Community Members: Members can see other members in the same community
CREATE POLICY "Members can view community peers"
ON public.community_members FOR SELECT
TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.community_members
    WHERE community_id = public.community_members.community_id
    AND user_id = auth.uid()
));
