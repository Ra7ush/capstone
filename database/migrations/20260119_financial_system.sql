-- Migration: 20260119_financial_system.sql
-- Description: Adds wallet balance to creators and creates payouts tracking table

-- 1. Update creators table with wallet balance
ALTER TABLE public.creators
ADD COLUMN IF NOT EXISTS wallet_balance DECIMAL(12, 2) DEFAULT 0.00;

-- 2. Create payouts table
-- Changed REFERENCES public.creators(id) to public.creators(user_id)
CREATE TABLE IF NOT EXISTS public.payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL REFERENCES public.creators(user_id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

-- 4. Policies
-- Creators can view their own payouts
CREATE POLICY "Creators can view own payouts" ON public.payouts
    FOR SELECT USING (
        creator_id = auth.uid()
    );

-- 5. Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS tr_payouts_updated_at ON public.payouts;
CREATE TRIGGER tr_payouts_updated_at
    BEFORE UPDATE ON public.payouts
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
