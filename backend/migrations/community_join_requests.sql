-- ============================================
-- Community Join Requests System
-- Private community join request/approval flow
-- ============================================

-- Join requests table
CREATE TABLE IF NOT EXISTS community_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  message TEXT,                    -- optional message from user
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- One pending/approved request per user per community
  CONSTRAINT unique_user_community_request UNIQUE (user_id, community_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_join_requests_community_id ON community_join_requests(community_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_user_id ON community_join_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_status ON community_join_requests(status);
CREATE INDEX IF NOT EXISTS idx_join_requests_community_pending
  ON community_join_requests(community_id, status) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE community_join_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can view requests for communities they own or their own requests
CREATE POLICY "Users can view own requests"
  ON community_join_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Community creators can view requests"
  ON community_join_requests FOR SELECT
  USING (
    community_id IN (
      SELECT id FROM communities WHERE creator_id = auth.uid()
    )
  );

-- Users can create requests
CREATE POLICY "Users can create join requests"
  ON community_join_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete/cancel their own pending requests
CREATE POLICY "Users can cancel own pending requests"
  ON community_join_requests FOR DELETE
  USING (auth.uid() = user_id AND status = 'pending');

-- Community creators can update (approve/reject) requests
CREATE POLICY "Creators can update requests"
  ON community_join_requests FOR UPDATE
  USING (
    community_id IN (
      SELECT id FROM communities WHERE creator_id = auth.uid()
    )
  );

-- Service role can manage all requests (backend)
DROP POLICY IF EXISTS "Service role can manage join requests" ON community_join_requests;
CREATE POLICY "Service role can manage join requests"
  ON community_join_requests FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Update notification type check to include join_request
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'follow', 'message', 'community_join', 'purchase',
    'like', 'comment', 'mention', 'verification', 'system',
    'join_request'
  ));
