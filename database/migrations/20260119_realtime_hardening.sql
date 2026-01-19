-- ==========================================
-- REALTIME RELIABILITY HARDENING
-- ==========================================

-- 1. Set Replica Identity to FULL for messages
-- This ensures that UPDATE events contain all columns,
-- which allows the client-side filter `conversation_id=eq.ID` to work correctly.
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- 2. Ensure conversations table also has full identity for list updates
ALTER TABLE public.conversations REPLICA IDENTITY FULL;

-- 3. Verify Realtime is enabled for all tables in the publication
-- This is already done in previous migrations, but we re-run to be safe.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        -- Add tables if they are not already there
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
        EXCEPTION WHEN duplicate_object THEN
            NULL; -- already exists
        END;

        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
        EXCEPTION WHEN duplicate_object THEN
            NULL; -- already exists
        END;
    END IF;
END $$;
