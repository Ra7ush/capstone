-- ==========================================
-- MESSAGING SYSTEM MIGRATION
-- ==========================================

-- 1. Create Conversations Table
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Conversation Participants Table
CREATE TABLE IF NOT EXISTS public.conversation_participants (
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (conversation_id, user_id)
);

-- 3. Create Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Enable Realtime
-- Check if publication exists first (standard for Supabase migrations)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- 5. Add Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_participants_user_id ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);

-- 6. Security Policies (RLS)
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Conversations: Users can see conversations they are part of
CREATE POLICY "Users can view their own conversations"
ON public.conversations FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.conversation_participants
        WHERE conversation_id = public.conversations.id
        AND user_id = auth.uid()
    )
);

-- Participants: Users can view participants of conversations they are part of
CREATE POLICY "Users can view conversation participants"
ON public.conversation_participants FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.conversation_participants AS sub
        WHERE sub.conversation_id = public.conversation_participants.conversation_id
        AND sub.user_id = auth.uid()
    )
);

-- Participants: Users can join/be added to conversations (Simplified for now)
CREATE POLICY "Users can be added to conversations"
ON public.conversation_participants FOR INSERT
TO authenticated
WITH CHECK (true);

-- Messages: Users can view messages in conversations they are part of
CREATE POLICY "Users can view messages in their conversations"
ON public.messages FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.conversation_participants
        WHERE conversation_id = public.messages.conversation_id
        AND user_id = auth.uid()
    )
);

-- Messages: Users can send messages to conversations they are part of
CREATE POLICY "Users can send messages to their conversations"
ON public.messages FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
        SELECT 1 FROM public.conversation_participants
        WHERE conversation_id = public.messages.conversation_id
        AND user_id = auth.uid()
    )
);

-- 7. Trigger to update last_message_at in conversations
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversations
    SET last_message_at = NOW(),
        updated_at = NOW()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversation_timestamp
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_timestamp();

-- 8. RPC to get or create a conversation between two users
CREATE OR REPLACE FUNCTION get_or_create_conversation(p_user1 UUID, p_user2 UUID)
RETURNS UUID AS $$
DECLARE
    v_conversation_id UUID;
BEGIN
    -- Try to find an existing conversation with exactly these two participants
    SELECT conversation_id INTO v_conversation_id
    FROM public.conversation_participants
    WHERE user_id = p_user1
    AND conversation_id IN (
        SELECT conversation_id
        FROM public.conversation_participants
        WHERE user_id = p_user2
    );

    -- If not found, create a new one
    IF v_conversation_id IS NULL THEN
        INSERT INTO public.conversations DEFAULT VALUES
        RETURNING id INTO v_conversation_id;

        INSERT INTO public.conversation_participants (conversation_id, user_id)
        VALUES (v_conversation_id, p_user1), (v_conversation_id, p_user2);
    END IF;

    RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql;
