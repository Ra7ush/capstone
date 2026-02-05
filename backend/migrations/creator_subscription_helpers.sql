-- ==========================================
-- UPGRADE CREATOR TO PRO MIGRATION
-- Helper SQL to upgrade a creator to pro plan
-- ==========================================

-- Example usage:
-- UPDATE public.creators SET subscription_plan = 'pro' WHERE user_id = '<user_id>';

-- To upgrade a specific creator:
-- UPDATE public.creators
-- SET subscription_plan = 'pro'
-- WHERE user_id = 'YOUR_USER_ID_HERE';

-- To downgrade a creator back to free:
-- UPDATE public.creators
-- SET subscription_plan = 'free'
-- WHERE user_id = 'YOUR_USER_ID_HERE';

-- ==========================================
-- OPTIONAL: Function to upgrade creator to pro
-- ==========================================

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

-- ==========================================
-- OPTIONAL: Function to downgrade creator to free
-- ==========================================

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

-- Example usage of the functions:
-- SELECT upgrade_creator_to_pro('YOUR_USER_ID_HERE');
-- SELECT downgrade_creator_to_free('YOUR_USER_ID_HERE');
