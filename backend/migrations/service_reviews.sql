-- ============================================
-- Service Reviews & Ratings System
-- Udemy-style review system for purchased services
-- ============================================

-- Reviews table - users can review services they've purchased
CREATE TABLE IF NOT EXISTS service_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- One review per user per service
  CONSTRAINT unique_user_service_review UNIQUE (user_id, service_id)
);

-- If table already exists, ensure id default uses built-in function (no extension needed)
ALTER TABLE service_reviews ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_service_reviews_service_id ON service_reviews(service_id);
CREATE INDEX IF NOT EXISTS idx_service_reviews_user_id ON service_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_service_reviews_rating ON service_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_service_reviews_created_at ON service_reviews(created_at DESC);

-- Enable RLS
ALTER TABLE service_reviews ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view reviews"
  ON service_reviews FOR SELECT USING (true);

CREATE POLICY "Users can create reviews"
  ON service_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews"
  ON service_reviews FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews"
  ON service_reviews FOR DELETE USING (auth.uid() = user_id);

-- Add cached rating stats to services table
ALTER TABLE services
ADD COLUMN IF NOT EXISTS average_rating DECIMAL(2,1) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;

-- Function to update service rating stats
CREATE OR REPLACE FUNCTION update_service_rating_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_service_id UUID;
  v_avg DECIMAL(2,1);
  v_count INTEGER;
BEGIN
  -- Determine which service_id to update
  IF TG_OP = 'DELETE' THEN
    v_service_id := OLD.service_id;
  ELSE
    v_service_id := NEW.service_id;
  END IF;

  -- Calculate new average and count
  SELECT
    COALESCE(ROUND(AVG(rating)::numeric, 1), 0),
    COALESCE(COUNT(*), 0)
  INTO v_avg, v_count
  FROM service_reviews
  WHERE service_id = v_service_id;

  -- Update services table
  UPDATE services
  SET
    average_rating = v_avg,
    total_reviews = v_count
  WHERE id = v_service_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers to automatically update stats
DROP TRIGGER IF EXISTS tr_update_service_rating_on_insert ON service_reviews;
CREATE TRIGGER tr_update_service_rating_on_insert
  AFTER INSERT ON service_reviews
  FOR EACH ROW EXECUTE FUNCTION update_service_rating_stats();

DROP TRIGGER IF EXISTS tr_update_service_rating_on_update ON service_reviews;
CREATE TRIGGER tr_update_service_rating_on_update
  AFTER UPDATE ON service_reviews
  FOR EACH ROW EXECUTE FUNCTION update_service_rating_stats();

DROP TRIGGER IF EXISTS tr_update_service_rating_on_delete ON service_reviews;
CREATE TRIGGER tr_update_service_rating_on_delete
  AFTER DELETE ON service_reviews
  FOR EACH ROW EXECUTE FUNCTION update_service_rating_stats();
