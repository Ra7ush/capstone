-- ============================================================
-- Migration: Instagram-style Message Requests
-- ============================================================
-- Adds a request_status column to the conversations table.
--   'accepted' – both users follow each other OR the recipient accepted the request
--   'pending'  – sender does NOT mutually follow the recipient; awaiting approval
--   'declined' – recipient declined the request
--
-- Existing conversations are assumed accepted (they were created before this feature).
-- ============================================================

-- 1. Add the request_status column with a default of 'accepted'
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS request_status TEXT NOT NULL DEFAULT 'accepted';

-- 2. Add the user who initiated the conversation (needed to know who is requester vs receiver)
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS initiated_by UUID REFERENCES users(id);

-- 3. Index for fast lookups of pending requests for a user
CREATE INDEX IF NOT EXISTS idx_conversations_request_status
  ON conversations (request_status)
  WHERE request_status = 'pending';
