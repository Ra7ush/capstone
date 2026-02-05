-- ==========================================
-- SUBSCRIPTION PLAN MIGRATION
-- Adds subscription_plan column to creators table
-- ==========================================

-- 1. Add subscription_plan column to creators table
ALTER TABLE public.creators
ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(20) DEFAULT 'free'
CHECK (subscription_plan IN ('free', 'pro'));

-- 2. Update existing creators to 'free' (default)
UPDATE public.creators
SET subscription_plan = 'free'
WHERE subscription_plan IS NULL;

-- 3. Add index for faster lookups on subscription status
CREATE INDEX IF NOT EXISTS idx_creators_subscription_plan ON public.creators(subscription_plan);

-- 4. Add comment for documentation
COMMENT ON COLUMN creators.subscription_plan IS 'Subscription plan: free or pro. Pro users can publish unlimited services.';
