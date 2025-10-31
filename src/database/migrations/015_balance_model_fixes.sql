-- Migration 015: Balance model fixes and standardized ledger helper

-- 1) Remove any stray balance columns from investments (safety – only if exist)
ALTER TABLE investments DROP COLUMN IF EXISTS balance_before;
ALTER TABLE investments DROP COLUMN IF EXISTS balance_after;

-- 2) Create or replace helper function to create ledger entries using real account balances
--    Signature simplified: no chain param, we log total balance transitions only
CREATE OR REPLACE FUNCTION create_ledger_entry(
    p_user_id INTEGER,
    p_transaction_type VARCHAR,
    p_amount DECIMAL,
    p_reference_type VARCHAR,
    p_reference_id INTEGER,
    p_description TEXT,
    p_metadata JSONB DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_balance_before DECIMAL(18, 2);
    v_balance_after DECIMAL(18, 2);
    v_ledger_id INTEGER;
BEGIN
    -- Ensure account row exists
    IF NOT EXISTS (SELECT 1 FROM accounts WHERE user_id = p_user_id) THEN
        INSERT INTO accounts (user_id, balance, available_balance, invested_balance)
        VALUES (p_user_id, 0, 0, 0);
    END IF;

    -- Read real total balance
    SELECT balance INTO v_balance_before FROM accounts WHERE user_id = p_user_id;
    v_balance_after := v_balance_before + p_amount;

    -- Insert immutable ledger entry (chain left NULL intentionally)
    INSERT INTO ledger_entries (
        user_id, transaction_type, amount, balance_before, balance_after,
        chain, reference_type, reference_id, description, metadata
    ) VALUES (
        p_user_id, p_transaction_type, p_amount, v_balance_before, v_balance_after,
        NULL, p_reference_type, p_reference_id, p_description, p_metadata
    ) RETURNING id INTO v_ledger_id;

    RETURN v_ledger_id;
END;
$$ LANGUAGE plpgsql;

-- 3) Enforce accounts.balance = available_balance + invested_balance via BEFORE triggers
CREATE OR REPLACE FUNCTION enforce_account_total_balance()
RETURNS TRIGGER AS $$
BEGIN
    NEW.balance := COALESCE(NEW.available_balance, 0) + COALESCE(NEW.invested_balance, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_account_total_balance_ins ON accounts;
DROP TRIGGER IF EXISTS trg_enforce_account_total_balance_upd ON accounts;

CREATE TRIGGER trg_enforce_account_total_balance_ins
BEFORE INSERT ON accounts
FOR EACH ROW
EXECUTE FUNCTION enforce_account_total_balance();

CREATE TRIGGER trg_enforce_account_total_balance_upd
BEFORE UPDATE OF available_balance, invested_balance ON accounts
FOR EACH ROW
EXECUTE FUNCTION enforce_account_total_balance();


