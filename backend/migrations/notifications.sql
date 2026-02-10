-- ============================================
-- Notifications Table Migration
-- ============================================
-- This creates a full notification system for NexusHub.
-- Notification types:
--   follow         → "X started following you"
--   message        → "X sent you a message"
--   community_join → "X joined your community"
--   purchase       → "X purchased your service"
--   like           → "X liked your post"
--   comment        → "X commented on your post"
--   mention        → "X mentioned you"
--   verification   → "Your verification was approved/rejected"

-- 1. Create the notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,   -- who receives the notification
  actor_id      UUID REFERENCES users(id) ON DELETE SET NULL,           -- who triggered it (nullable for system notifications)
  type          TEXT NOT NULL CHECK (type IN (
    'follow', 'message', 'community_join', 'purchase',
    'like', 'comment', 'mention', 'verification', 'system'
  )),
  title         TEXT NOT NULL,                                           -- short title for display
  body          TEXT,                                                     -- optional longer description
  data          JSONB DEFAULT '{}'::jsonb,                               -- flexible payload (post_id, community_id, service_id, etc.)
  is_read       BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- 2. Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- 3. RLS Policies (users can only see their own notifications)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can insert notifications (backend creates them)
CREATE POLICY "Service role can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Helper function to create a notification (called from backend)
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_actor_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT DEFAULT NULL,
  p_data JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  -- Don't notify yourself
  IF p_user_id = p_actor_id THEN
    RETURN NULL;
  END IF;

  INSERT INTO notifications (user_id, actor_id, type, title, body, data)
  VALUES (p_user_id, p_actor_id, p_type, p_title, p_body, p_data)
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

-- 5. Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM notifications
  WHERE user_id = p_user_id AND is_read = FALSE;

  RETURN v_count;
END;
$$;

-- 6. Enable Supabase Realtime on the notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
