-- ==========================================
-- PURCHASE -> PAYOUT TRIGGER
-- Creates payout + updates creator wallet on purchase
-- ==========================================

-- 1) Function: handle purchase settlement
CREATE OR REPLACE FUNCTION handle_purchase_payout()
RETURNS TRIGGER AS $$
DECLARE
  v_creator_id UUID;
  v_gross_amount NUMERIC(12, 2);
  v_platform_fee NUMERIC(12, 2);
  v_creator_earnings NUMERIC(12, 2);
BEGIN
  -- Only handle completed purchases
  IF NEW.status IS DISTINCT FROM 'completed' THEN
    RETURN NEW;
  END IF;

  -- Fetch creator_id from service
  SELECT creator_id INTO v_creator_id
  FROM public.services
  WHERE id = NEW.service_id;

  IF v_creator_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_gross_amount := COALESCE(NEW.amount, 0);
  IF v_gross_amount <= 0 THEN
    RETURN NEW;
  END IF;

  v_platform_fee := ROUND(v_gross_amount * 0.20, 2);
  v_creator_earnings := v_gross_amount - v_platform_fee;

  -- Create payout record (creator share only) - STAYS PENDING until admin processes it
  INSERT INTO public.payouts (
    creator_id,
    amount,
    status,
    method,
    transaction_reference,
    created_at
  ) VALUES (
    v_creator_id,
    v_creator_earnings,
    'pending',
    'bank_transfer',
    'PUR-' || NEW.id::text,
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2) Trigger: after insert on purchases
DROP TRIGGER IF EXISTS trg_purchase_payout ON public.purchases;

CREATE TRIGGER trg_purchase_payout
AFTER INSERT ON public.purchases
FOR EACH ROW
EXECUTE FUNCTION handle_purchase_payout();
