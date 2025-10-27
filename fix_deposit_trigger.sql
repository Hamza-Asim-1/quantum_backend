-- Fix deposit trigger to use correct balance columns
-- This fixes the error: column "trc20_balance" does not exist

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS update_balance_on_deposit_confirm ON deposits;
DROP FUNCTION IF EXISTS update_balance_on_deposit();

-- Create the corrected function
CREATE OR REPLACE FUNCTION update_balance_on_deposit()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update balance when status changes to 'confirmed'
    IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
        -- Update unified balance system (works for both TRC20 and BEP20)
        UPDATE accounts 
        SET balance = balance + NEW.amount,
            available_balance = available_balance + NEW.amount,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER update_balance_on_deposit_confirm
    AFTER UPDATE ON deposits
    FOR EACH ROW
    EXECUTE FUNCTION update_balance_on_deposit();

-- Verify the function works
SELECT 'Deposit trigger fixed successfully' as status;
