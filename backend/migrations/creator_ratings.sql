-- Creator Ratings Table
-- Stores ratings given by users to creators/services

CREATE TABLE IF NOT EXISTS creator_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL, -- Optional: rating can be tied to a specific service
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT, -- Optional review text
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Each user can only rate a creator once per service (or once overall if service is NULL)
  CONSTRAINT unique_user_creator_service_rating UNIQUE NULLS NOT DISTINCT (user_id, creator_id, service_id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_creator_ratings_creator_id ON creator_ratings(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_ratings_user_id ON creator_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_creator_ratings_service_id ON creator_ratings(service_id);

-- Enable RLS
ALTER TABLE creator_ratings ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view all ratings" ON creator_ratings;
CREATE POLICY "Users can view all ratings" ON creator_ratings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create ratings" ON creator_ratings;
CREATE POLICY "Users can create ratings" ON creator_ratings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own ratings" ON creator_ratings;
CREATE POLICY "Users can update their own ratings" ON creator_ratings
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own ratings" ON creator_ratings;
CREATE POLICY "Users can delete their own ratings" ON creator_ratings
  FOR DELETE USING (auth.uid() = user_id);

-- Add average_rating and total_ratings columns to creators table for caching
ALTER TABLE creators
ADD COLUMN IF NOT EXISTS average_rating DECIMAL(2,1) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_ratings INTEGER DEFAULT 0;

-- Function to update creator rating stats when a rating is added/updated/deleted
-- Aggregates from both creator_ratings (general/direct) and service_reviews (course-specific)
CREATE OR REPLACE FUNCTION update_creator_rating_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_creator_id UUID;
  v_avg DECIMAL(2,1);
  v_count INTEGER;
BEGIN
  -- Determine which creator_id to update
  IF TG_TABLE_NAME = 'service_reviews' THEN
    -- For service_reviews, we need to find the creator_id via the services table
    SELECT creator_id INTO v_creator_id FROM services WHERE id = (CASE WHEN TG_OP = 'DELETE' THEN OLD.service_id ELSE NEW.service_id END);
  ELSE
    -- For creator_ratings, it's direct
    v_creator_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.creator_id ELSE NEW.creator_id END;
  END IF;

  IF v_creator_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Calculate new average and count by UNIONing results from both tables
  WITH all_ratings AS (
    SELECT rating FROM creator_ratings WHERE creator_id = v_creator_id
    UNION ALL
    SELECT sr.rating
    FROM service_reviews sr
    JOIN services s ON sr.service_id = s.id
    WHERE s.creator_id = v_creator_id
  )
  SELECT
    COALESCE(ROUND(AVG(rating)::numeric, 1), 0),
    COALESCE(COUNT(*), 0)
  INTO v_avg, v_count
  FROM all_ratings;

  -- Update creators table
  UPDATE creators
  SET
    average_rating = v_avg,
    total_ratings = v_count,
    updated_at = NOW()
  WHERE user_id = v_creator_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for creator_ratings (Keep existing or recreate)
DROP TRIGGER IF EXISTS tr_update_creator_rating_on_insert ON creator_ratings;
CREATE TRIGGER tr_update_creator_rating_on_insert
  AFTER INSERT ON creator_ratings
  FOR EACH ROW EXECUTE FUNCTION update_creator_rating_stats();

DROP TRIGGER IF EXISTS tr_update_creator_rating_on_update ON creator_ratings;
CREATE TRIGGER tr_update_creator_rating_on_update
  AFTER UPDATE ON creator_ratings
  FOR EACH ROW EXECUTE FUNCTION update_creator_rating_stats();

DROP TRIGGER IF EXISTS tr_update_creator_rating_on_delete ON creator_ratings;
CREATE TRIGGER tr_update_creator_rating_on_delete
  AFTER DELETE ON creator_ratings
  FOR EACH ROW EXECUTE FUNCTION update_creator_rating_stats();

-- Add triggers to service_reviews to also update the instructor's aggregate rating
DROP TRIGGER IF EXISTS tr_update_creator_on_service_review_insert ON service_reviews;
CREATE TRIGGER tr_update_creator_on_service_review_insert
  AFTER INSERT ON service_reviews
  FOR EACH ROW EXECUTE FUNCTION update_creator_rating_stats();

DROP TRIGGER IF EXISTS tr_update_creator_on_service_review_update ON service_reviews;
CREATE TRIGGER tr_update_creator_on_service_review_update
  AFTER UPDATE ON service_reviews
  FOR EACH ROW EXECUTE FUNCTION update_creator_rating_stats();

DROP TRIGGER IF EXISTS tr_update_creator_on_service_review_delete ON service_reviews;
CREATE TRIGGER tr_update_creator_on_service_review_delete
  AFTER DELETE ON service_reviews
  FOR EACH ROW EXECUTE FUNCTION update_creator_rating_stats();
