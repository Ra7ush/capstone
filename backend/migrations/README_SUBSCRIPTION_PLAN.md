# Subscription Plan Migration Guide

## Overview
This guide explains how to add subscription plan support to track whether a creator is on the free or pro plan.

## Database Changes

### Step 1: Run the Migration SQL

In your Supabase Dashboard, go to **SQL Editor** and run the following migration:

```sql
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
```

### Step 2: (Optional) Run Helper Functions

For easier plan management, you can also run the helper functions:

```sql
-- Function to upgrade creator to pro
CREATE OR REPLACE FUNCTION upgrade_creator_to_pro(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.creators
  SET subscription_plan = 'pro'
  WHERE user_id = p_user_id;
  
  IF FOUND THEN
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to downgrade creator to free
CREATE OR REPLACE FUNCTION downgrade_creator_to_free(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.creators
  SET subscription_plan = 'free'
  WHERE user_id = p_user_id;
  
  IF FOUND THEN
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

## How to Upgrade/Downgrade a Creator

### Option 1: Direct SQL Update
```sql
-- Upgrade to Pro
UPDATE public.creators SET subscription_plan = 'pro' WHERE user_id = 'USER_UUID_HERE';

-- Downgrade to Free
UPDATE public.creators SET subscription_plan = 'free' WHERE user_id = 'USER_UUID_HERE';
```

### Option 2: Using Helper Functions
```sql
-- Upgrade to Pro
SELECT upgrade_creator_to_pro('USER_UUID_HERE');

-- Downgrade to Free
SELECT downgrade_creator_to_free('USER_UUID_HERE');
```

## Backend Changes

The following backend files have been updated:

### `backend/src/controllers/service.controller.js`

1. **`createService`** - Checks subscription plan and returns warning if free limit reached
2. **`getMyServices`** - Returns `is_pro` status in metadata
3. **`publishService`** - Enforces free limit (1 service) unless user is Pro

## Frontend Changes

### `mobile/types/index.ts`

Updated types:
- `ServiceMeta` - Now includes `is_pro` field
- `CreateServiceResponse` - Now includes `is_pro` in metadata

### API Response Format

```typescript
// getMyServices Response
{
  success: true,
  data: Service[],
  meta: {
    published_count: number,      // Number of published services
    is_pro: boolean,             // Whether creator is on Pro plan
    free_limit_reached: boolean,  // Whether free limit (1) is reached
    free_services_allowed: 1      // Free tier allows 1 service
  }
}

// createService Response
{
  success: true,
  data: Service,
  warning?: string,  // Warning if limit reached
  meta: {
    published_count: number,
    is_pro: boolean,
    free_limit_reached: boolean
  }
}
```

## How It Works

1. **Free Tier Creators**: Can publish 1 service. Attempting to publish a 2nd service returns a 403 error with message: "Free plan limit reached. Upgrade to Pro plan to publish more services."

2. **Pro Tier Creators**: Can publish unlimited services.

3. **Warnings**: When a free tier creator creates a service after already having 1 published service, they receive a warning (but creation still succeeds as draft).

## Testing

1. Run the migration SQL in Supabase
2. Test creating a service as a free user
3. Test publishing the first service (should succeed)
4. Test creating another service and attempting to publish (should fail with error)
5. Upgrade a user to Pro: `UPDATE creators SET subscription_plan = 'pro' WHERE user_id = '...'`
6. Test publishing additional services as Pro user (should succeed)
