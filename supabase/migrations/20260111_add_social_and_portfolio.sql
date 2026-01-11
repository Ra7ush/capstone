-- Add social_links and portfolio_url to creator_verification_requests
ALTER TABLE creator_verification_requests
ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS portfolio_url TEXT;

-- Update RLS or other logic if needed (usually existing RLS covers new columns)
COMMENT ON COLUMN creator_verification_requests.social_links IS 'Stores social handles like { github: "...", linkedin: "...", instagram: "..." }';
COMMENT ON COLUMN creator_verification_requests.portfolio_url IS 'Stores a link to the creators portfolio or CV document';
