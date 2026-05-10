-- ==========================================
-- UPDATE FINANCIAL STATS (Platform fees from purchases)
-- ==========================================

CREATE OR REPLACE FUNCTION get_financial_stats()
RETURNS JSON AS $$
DECLARE
  pending_total DECIMAL(12, 2);
  paid_total DECIMAL(12, 2);
  fees_collected_total DECIMAL(12, 2);
BEGIN
  -- 1. Pending Payouts (creator share)
  SELECT COALESCE(SUM(amount), 0)
  INTO pending_total
  FROM public.payouts
  WHERE status = 'pending';

  -- 2. Paid Last 30 Days (creator share)
  SELECT COALESCE(SUM(amount), 0)
  INTO paid_total
  FROM public.payouts
  WHERE status IN ('paid', 'completed')
    AND created_at >= (CURRENT_TIMESTAMP - INTERVAL '30 days');

  -- 3. Platform Revenue (20% of Courses + 100% of Subscriptions)
  SELECT 
    COALESCE(SUM(
      CASE 
        WHEN service_id IS NOT NULL THEN amount * 0.20 -- Course Fee
        ELSE amount -- Subscription Fee (100% to platform)
      END
    ), 0)
  INTO fees_collected_total
  FROM public.purchases
  WHERE status = 'completed'
    AND purchased_at >= date_trunc('month', CURRENT_TIMESTAMP);

  RETURN json_build_object(
    'pending_payouts', CAST(pending_total AS NUMERIC(12,2)),
    'paid_last_30_days', CAST(paid_total AS NUMERIC(12,2)),
    'platform_fees_collected', CAST(fees_collected_total AS NUMERIC(12,2))
  );
END;
$$ LANGUAGE plpgsql;
