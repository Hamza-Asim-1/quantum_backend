// backend/src/services/depositScannerService.ts
import pool from '../config/database';
import blockchainService from './blockchainService';

type Chain = 'BEP20' | 'TRC20';

interface ScanResult {
  tx_hash: string;
  from_address: string;
  to_address: string;
  amount: number;
  chain: Chain;
  timeStamp: number;
}

const SYSTEM_CONFIG_KEYS = {
  BEP20_BLOCK: 'last_bep20_block',
  TRC20_TS: 'last_trc20_timestamp',
};

// Get system config value
async function getConfig(key: string, defaultValue: string): Promise<string> {
  const result = await pool.query('SELECT value FROM system_config WHERE key = $1', [key]);
  if (result.rows.length === 0) return defaultValue;
  return result.rows[0].value ?? defaultValue;
}

// Set system config value
async function setConfig(key: string, value: string): Promise<void> {
  await pool.query(
    `INSERT INTO system_config(key, value, updated_at)
     VALUES($1, $2, CURRENT_TIMESTAMP)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
    [key, value]
  );
}

// Get platform wallet address from environment
async function getPlatformAddress(chain: Chain): Promise<string | null> {
  if (chain === 'BEP20') return process.env.PLATFORM_BEP20_ADDRESS || null;
  if (chain === 'TRC20') return process.env.PLATFORM_TRC20_ADDRESS || null;
  return null;
}

// ✅ NEW: Confirm pending deposit by matching tx_hash
async function confirmPendingDeposit(client: any, scannedTx: ScanResult): Promise<void> {
  try {
    console.log(`🔍 Checking for pending deposit with tx_hash: ${scannedTx.tx_hash}`);

    // Find pending deposit matching this tx_hash
    const depositResult = await client.query(
      `SELECT id, user_id, amount, chain, status 
       FROM deposits 
       WHERE tx_hash = $1 AND status = $2`,
      [scannedTx.tx_hash, 'pending']
    );

    if (depositResult.rows.length === 0) {
      console.log(`ℹ️  No pending deposit found for tx_hash: ${scannedTx.tx_hash}`);
      return;
    }

    const deposit = depositResult.rows[0];

    console.log(`✅ Found pending deposit #${deposit.id} for user ${deposit.user_id}`);

    // Verify amount matches (with small tolerance for rounding)
    const amountDiff = Math.abs(parseFloat(deposit.amount) - scannedTx.amount);
    if (amountDiff > 0.01) {
      console.log(`⚠️  Amount mismatch! Expected: ${deposit.amount}, Got: ${scannedTx.amount}`);
      
      // Update deposit with note about mismatch
      await client.query(
        `UPDATE deposits 
         SET admin_notes = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2`,
        [`Amount mismatch detected. Expected: ${deposit.amount}, Received: ${scannedTx.amount}`, deposit.id]
      );
      return;
    }


    // Verify chain matches
    if (deposit.chain !== scannedTx.chain) {
      console.log(`⚠️  Chain mismatch! Expected: ${deposit.chain}, Got: ${scannedTx.chain}`);
      
      await client.query(
        `UPDATE deposits 
         SET admin_notes = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2`,
        [`Chain mismatch detected. Expected: ${deposit.chain}, Received: ${scannedTx.chain}`, deposit.id]
      );
      return;
    }

    // Get current balance before update
    const accountResult = await client.query(
      'SELECT balance, available_balance FROM accounts WHERE user_id = $1',
      [deposit.user_id]
    );

    const balanceBefore = accountResult.rows[0]
      ? parseFloat(accountResult.rows[0].available_balance)
      : 0;

    // Update deposit to confirmed
    await client.query(
      `UPDATE deposits 
       SET status = $1,
           to_address = $2,
           verified_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      ['confirmed', scannedTx.to_address, deposit.id]
    );

    // Update user balance
    // In confirmPendingDeposit function, replace the UPDATE with:

await client.query(
  `INSERT INTO accounts (user_id, balance, available_balance, invested_balance, updated_at)
   VALUES ($1, $2, $2, 0, CURRENT_TIMESTAMP)
   ON CONFLICT (user_id) 
   DO UPDATE SET 
     available_balance = accounts.available_balance + EXCLUDED.balance,
     balance = accounts.balance + EXCLUDED.balance,
     updated_at = CURRENT_TIMESTAMP`,
  [deposit.user_id, deposit.amount]
);
    // Create ledger entry
    await client.query(
      `INSERT INTO ledger_entries (
        user_id, transaction_type, amount, balance_before, balance_after,
        chain, reference_type, reference_id, description, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)`,
      [
        deposit.user_id,
        'deposit',
        deposit.amount,
        balanceBefore,
        balanceBefore + parseFloat(deposit.amount),
        deposit.chain,
        'deposit',
        deposit.id,
        `Deposit auto-confirmed - TX: ${scannedTx.tx_hash.substring(0, 10)}...`,
      ]
    );

    console.log(`✅ Deposit #${deposit.id} confirmed! User ${deposit.user_id} credited ${deposit.amount} ${deposit.chain} USDT`);

  } catch (error) {
    console.error('❌ Error confirming pending deposit:', error);
    throw error;
  }
}

// Map BEP20 transaction to ScanResult
async function mapBEP20Tx(tx: any, platformAddress: string): Promise<ScanResult | null> {
  const toAddr = (tx.to || '').toLowerCase();
  if (toAddr !== platformAddress.toLowerCase()) return null;
  
  const amount = parseFloat(tx.value);
  if (!isFinite(amount) || amount <= 0) return null;
  
  return {
    tx_hash: tx.hash,
    from_address: tx.from,
    to_address: tx.to,
    amount: amount,
    chain: 'BEP20',
    timeStamp: parseInt(tx.timeStamp, 10) || 0,
  };
}

// Map TRC20 transaction to ScanResult
async function mapTRC20Tx(tx: any, platformAddress: string): Promise<ScanResult | null> {
  const toAddr = (tx.to || '').toLowerCase();
  if (toAddr !== platformAddress.toLowerCase()) return null;
  
  const amount = parseFloat(tx.value);
  if (!isFinite(amount) || amount <= 0) return null;
  
  return {
    tx_hash: tx.hash,
    from_address: tx.from,
    to_address: tx.to,
    amount: amount,
    chain: 'TRC20',
    timeStamp: parseInt(tx.timeStamp, 10) || 0,
  };
}

export class DepositScannerService {
  async runScan(): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      console.log('🔄 Starting deposit scan...');

      // Scan BEP20 (Binance Smart Chain)
      const bep20Address = await getPlatformAddress('BEP20');
      if (bep20Address) {
        console.log(`🔍 Scanning BEP20 deposits to: ${bep20Address}`);
        
        const lastBlockStr = await getConfig(SYSTEM_CONFIG_KEYS.BEP20_BLOCK, '0');
        const lastBlock = parseInt(lastBlockStr, 10) || 0;
        
        const txs = await blockchainService.scanBEP20Deposits(bep20Address, lastBlock);
        console.log(`📦 Found ${txs.length} BEP20 transactions`);
        
        let maxBlock = lastBlock;
        
        for (const tx of txs) {
          const mapped = await mapBEP20Tx(tx, bep20Address);
          if (!mapped) continue;
          
          // ✅ Check if this tx_hash matches any pending deposit
          await confirmPendingDeposit(client, mapped);
          
          const bn = parseInt(tx.blockNumber, 10) || 0;
          if (bn > maxBlock) maxBlock = bn;
        }
        
        if (maxBlock > lastBlock) {
          await setConfig(SYSTEM_CONFIG_KEYS.BEP20_BLOCK, String(maxBlock));
          console.log(`✅ Updated last BEP20 block to: ${maxBlock}`);
        }
      } else {
        console.log('⚠️  PLATFORM_BEP20_ADDRESS not configured');
      }

      // Scan TRC20 (TRON)
      const trc20Address = await getPlatformAddress('TRC20');
      if (trc20Address) {
        console.log(`🔍 Scanning TRC20 deposits to: ${trc20Address}`);
        
        const lastTsStr = await getConfig(SYSTEM_CONFIG_KEYS.TRC20_TS, '0');
        const lastTs = parseInt(lastTsStr, 10) || 0;
        
        const txs = await blockchainService.scanTRC20Deposits(trc20Address, lastTs * 1000);
        console.log(`📦 Found ${txs.length} TRC20 transactions`);
        
        let maxTs = lastTs;
        
        for (const tx of txs) {
          const mapped = await mapTRC20Tx(tx, trc20Address);
          if (!mapped) continue;
          
          // ✅ Check if this tx_hash matches any pending deposit
          await confirmPendingDeposit(client, mapped);
          
          const ts = parseInt(tx.timeStamp, 10) || 0;
          if (ts > maxTs) maxTs = ts;
        }
        
        if (maxTs > lastTs) {
          await setConfig(SYSTEM_CONFIG_KEYS.TRC20_TS, String(maxTs));
          console.log(`✅ Updated last TRC20 timestamp to: ${maxTs}`);
        }
      } else {
        console.log('⚠️  PLATFORM_TRC20_ADDRESS not configured');
      }

      await client.query('COMMIT');
      console.log('✅ Deposit scan completed successfully\n');

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Deposit scanner error:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

export default new DepositScannerService();