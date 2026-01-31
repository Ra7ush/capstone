-- Add cover image support for creators
-- Migration: 20260131_cover_image.sql

-- Add cover_image_url to creators table
ALTER TABLE creators ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

-- Add category field (optional, for profile display)
ALTER TABLE creators ADD COLUMN IF NOT EXISTS category TEXT;

-- Comment for documentation
COMMENT ON COLUMN creators.cover_image_url IS 'URL to the creator cover/banner image';
COMMENT ON COLUMN creators.category IS 'Creator category (e.g., Travelling, Music, Art)';
