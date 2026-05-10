-- ==========================================
-- PAYOUT PROCESSING LOGIC
-- Handles moving money from PENDING -> WALLET
-- ==========================================

-- 1) Trigger Function: Update creator wallet when payout is marked 'paid'
CREATE OR REPLACE FUNCTION handle_payout_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Check status transition to 'paid' (or 'completed')
  IF (NEW.status = 'paid' OR NEW.status = 'completed') AND (OLD.status = 'pending' OR OLD.status = 'processing') THEN
    
    -- Update creator wallet_balance and total_earnings
    UPDATE public.creators
    SET 
      wallet_balance = COALESCE(wallet_balance, 0) + NEW.amount,
      total_earnings = COALESCE(total_earnings, 0) + NEW.amount,
      updated_at = NOW()
    WHERE user_id = NEW.creator_id;

    -- Optional: Log the transaction or notify user
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2) Register the Trigger
DROP TRIGGER IF EXISTS trg_payout_completion ON public.payouts;
CREATE TRIGGER trg_payout_completion
AFTER UPDATE ON public.payouts
FOR EACH ROW
EXECUTE FUNCTION handle_payout_completion();

-- 3) RPC: Process Single Payout
-- Drop first because return type might have changed
DROP FUNCTION IF EXISTS process_single_payout(UUID);
CREATE OR REPLACE FUNCTION process_single_payout(p_id UUID)
RETURNS JSON AS $$
DECLARE
  v_payout_record RECORD;
BEGIN
  -- 1. Fetch the payout record
  SELECT * INTO v_payout_record FROM public.payouts WHERE id = p_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Payout record not found');
  END IF;

  IF v_payout_record.status != 'pending' THEN
    RETURN json_build_object('success', false, 'message', 'Payout is already processed or in progress');
  END IF;

  -- 2. Mark as paid (Trigger will handle the wallet update)
  UPDATE public.payouts
  SET 
    status = 'paid'
  WHERE id = p_id;

  RETURN json_build_object('success', true, 'message', 'Payout processed successfully', 'amount', v_payout_record.amount);
END;
$$ LANGUAGE plpgsql;

-- 4) RPC: Process All Pending Payouts
-- Drop first because return type might have changed
DROP FUNCTION IF EXISTS process_all_pending_payouts();
CREATE OR REPLACE FUNCTION process_all_pending_payouts()
RETURNS JSON AS $$
DECLARE
  v_count INTEGER;
  v_total NUMERIC(12, 2);
BEGIN
  -- Calculate totals for the response
  SELECT COUNT(*), COALESCE(SUM(amount), 0)
  INTO v_count, v_total
  FROM public.payouts
  WHERE status = 'pending';

  -- Update all to paid (Trigger will handle the wallet updates)
  UPDATE public.payouts
  SET 
    status = 'paid'
  WHERE status = 'pending';

  RETURN json_build_object(
    'success', true, 
    'message', 'Processed all pending payouts', 
    'count', v_count, 
    'total_amount', v_total
  );
END;
$$ LANGUAGE plpgsql;
