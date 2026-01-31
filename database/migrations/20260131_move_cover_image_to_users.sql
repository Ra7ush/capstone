-- Move cover image support to users table (so all users can have it)
-- Migration: 20260131_move_cover_image_to_users.sql

-- Add cover_image_url to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

-- (Optional) If we want to keep category on creators, we leave it there.
-- If users also need category, we would move it too. For now keeping category on creators as originally planned unless specified otherwise.
-- The user request specifically mentioned "cover image ... to be added to the user".

COMMENT ON COLUMN users.cover_image_url IS 'URL to the user profile cover/banner image';
