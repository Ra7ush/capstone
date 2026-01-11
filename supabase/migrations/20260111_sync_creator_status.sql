-- 1. Ensure the creators table constraint allows 'rejected' and 'unverified'
ALTER TABLE creators DROP CONSTRAINT IF EXISTS creators_verification_status_check;
ALTER TABLE creators ADD CONSTRAINT creators_verification_status_check
CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected'));

-- 2. Update the trigger function to handle both approved and rejected cases
CREATE OR REPLACE FUNCTION handle_verification_status_sync()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'approved' THEN
        -- Mark creator as verified
        UPDATE creators
        SET verification_status = 'verified'
        WHERE user_id = NEW.user_id;
    ELSIF NEW.status = 'rejected' THEN
        -- Mark creator as rejected
        UPDATE creators
        SET verification_status = 'rejected'
        WHERE user_id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Re-create the trigger using the improved function
DROP TRIGGER IF EXISTS tr_on_verification_approval ON creator_verification_requests;

CREATE TRIGGER tr_on_verification_status_change
AFTER UPDATE ON creator_verification_requests
FOR EACH ROW
WHEN (NEW.status IN ('approved', 'rejected') AND OLD.status = 'pending')
EXECUTE FUNCTION handle_verification_status_sync();
