const pool = require('./src/config/database').default;

async function fixDepositTrigger() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing deposit trigger...');
    
    // Drop the existing trigger and function
    await client.query('DROP TRIGGER IF EXISTS update_balance_on_deposit_confirm ON deposits');
    await client.query('DROP FUNCTION IF EXISTS update_balance_on_deposit()');
    
    // Create the corrected function
    await client.query(`
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
    `);
    
    // Recreate the trigger
    await client.query(`
      CREATE TRIGGER update_balance_on_deposit_confirm
          AFTER UPDATE ON deposits
          FOR EACH ROW
          EXECUTE FUNCTION update_balance_on_deposit();
    `);
    
    console.log('✅ Deposit trigger fixed successfully!');
    console.log('✅ Now deposits will update balance and available_balance correctly');
    
  } catch (error) {
    console.error('❌ Error fixing trigger:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

fixDepositTrigger();
