import { Request, Response } from 'express';
import pool from '../config/database';

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    type?: string;
    role?: string;
  };
}

// Validate wallet address format
const isValidAddress = (address: string, chain: string): boolean => {
  if (chain === 'BEP20') {
    // Ethereum/BSC address format (0x + 40 hex chars)
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  } else if (chain === 'TRC20') {
    // TRON address format (T + 33 chars)
    return /^T[a-zA-Z0-9]{33}$/.test(address);
  }
  return false;
};

// User: Request withdrawal (simplified - no wallet pre-registration required)
export const requestWithdrawal = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const userId = req.user?.id;
    const { amount, chain, wallet_address } = req.body;

    // Validation
    if (!amount || !chain || !wallet_address) {
      res.status(400).json({
        status: 'error',
        message: 'amount, chain, and wallet_address are required',
      });
      return;
    }

    if (!['BEP20', 'TRC20'].includes(chain)) {
      res.status(400).json({
        status: 'error',
        message: 'chain must be BEP20 or TRC20',
      });
      return;
    }

    if (amount <= 0) {
      res.status(400).json({
        status: 'error',
        message: 'Amount must be greater than 0',
      });
      return;
    }

    // Validate wallet address format
    if (!isValidAddress(wallet_address, chain)) {
      res.status(400).json({
        status: 'error',
        message: `Invalid ${chain} wallet address format`,
      });
      return;
    }

    // Get withdrawal limits from config or use defaults
    const minWithdrawal = parseFloat(process.env.MIN_WITHDRAWAL_AMOUNT || '10');
    const maxWithdrawal = parseFloat(process.env.MAX_WITHDRAWAL_AMOUNT || '50000');

    if (amount < minWithdrawal) {
      res.status(400).json({
        status: 'error',
        message: `Minimum withdrawal amount is ${minWithdrawal} USDT`,
      });
      return;
    }

    if (amount > maxWithdrawal) {
      res.status(400).json({
        status: 'error',
        message: `Maximum withdrawal amount is ${maxWithdrawal} USDT`,
      });
      return;
    }

    await client.query('BEGIN');

    // Check user balance using your actual schema
    const accountResult = await client.query(
      'SELECT id, available_balance FROM accounts WHERE user_id = $1',
      [userId]
    );

    if (accountResult.rows.length === 0 || parseFloat(accountResult.rows[0].available_balance) < amount) {
      await client.query('ROLLBACK');
      res.status(400).json({
        status: 'error',
        message: 'Insufficient balance',
        data: {
          available: accountResult.rows[0]?.available_balance || 0,
          requested: amount,
        },
      });
      return;
    }

    const accountId = accountResult.rows[0].id;
    const availableBalance = parseFloat(accountResult.rows[0].available_balance);

    // Create withdrawal request
 const withdrawalResult = await client.query(
  `INSERT INTO withdrawals (
    user_id, amount, chain, wallet_address, 
    status, requested_at, updated_at
  )
   VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
   RETURNING id, amount, chain, wallet_address, status, requested_at`,
  [userId, amount, chain, wallet_address, 'pending']
);

    const withdrawal = withdrawalResult.rows[0];

    // Deduct from available balance immediately
 await client.query(
  'UPDATE accounts SET available_balance = available_balance - $1, balance = balance - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
  [amount, accountId]
);

    // Create ledger entry
    await client.query(
      `INSERT INTO ledger_entries (
        user_id, transaction_type, amount, balance_before, balance_after, 
        reference_type, reference_id, description, created_at
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`,
      [
        userId, 
        'withdrawal', 
        -amount,
        availableBalance,
        availableBalance - amount,
        'withdrawal',
        withdrawal.id,
        `Withdrawal request: ${amount} USDT to ${chain} address ${wallet_address.substring(0, 10)}...`
      ]
    );

    await client.query('COMMIT');

    res.status(201).json({
      status: 'success',
      message: 'Withdrawal request submitted successfully. Admin will review within 24-48 hours.',
      data: {
        ...withdrawal,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Request withdrawal error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to request withdrawal',
    });
  } finally {
    client.release();
  }
};

// User: Get withdrawal history
export const getWithdrawalHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { limit = 20, offset = 0, status } = req.query;

    let query = `
      SELECT 
        id, amount, chain, wallet_address, status, 
        tx_hash, rejection_reason, admin_notes, requested_at, processed_at
      FROM withdrawals
      WHERE user_id = $1
    `;

    const params: any[] = [userId];

    if (status) {
      query += ` AND status = $2`;
      params.push(status);
      query += ` ORDER BY requested_at DESC LIMIT $3 OFFSET $4`;
      params.push(limit, offset);
    } else {
      query += ` ORDER BY requested_at DESC LIMIT $2 OFFSET $3`;
      params.push(limit, offset);
    }

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM withdrawals WHERE user_id = $1';
    const countParams: any[] = [userId];

    if (status) {
      countQuery += ' AND status = $2';
      countParams.push(status);
    }

    const countResult = await pool.query(countQuery, countParams);

    res.status(200).json({
      status: 'success',
      data: {
        withdrawals: result.rows,
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  } catch (error) {
    console.error('Get withdrawal history error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch withdrawal history',
    });
  }
};

// User: Cancel pending withdrawal
export const cancelWithdrawal = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    await client.query('BEGIN');

    // Get withdrawal
    const withdrawalResult = await client.query(
      'SELECT id, user_id, amount, status FROM withdrawals WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (withdrawalResult.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({
        status: 'error',
        message: 'Withdrawal not found',
      });
      return;
    }

    const withdrawal = withdrawalResult.rows[0];

    if (withdrawal.status !== 'pending') {
      await client.query('ROLLBACK');
      res.status(400).json({
        status: 'error',
        message: `Cannot cancel withdrawal with status: ${withdrawal.status}`,
      });
      return;
    }

    // Update withdrawal status
    await client.query(
      'UPDATE withdrawals SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['cancelled', id]
    );

    // Return amount to available balance
await client.query(
  `UPDATE accounts 
   SET available_balance = available_balance + $1,
       balance = balance + $1,
       updated_at = CURRENT_TIMESTAMP 
   WHERE user_id = $2`,
  [withdrawal.amount, userId]
);

    // Create refund ledger entry
    const currentBalance = await client.query(
      'SELECT available_balance FROM accounts WHERE user_id = $1',
      [userId]
    );

    await client.query(
      `INSERT INTO ledger_entries (
        user_id, transaction_type, amount, balance_before, balance_after, 
        reference_type, reference_id, description, created_at
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`,
      [
        userId, 
        'refund', 
        withdrawal.amount,
        parseFloat(currentBalance.rows[0].available_balance) - withdrawal.amount,
        parseFloat(currentBalance.rows[0].available_balance),
        'withdrawal',
        id,
        `Withdrawal cancelled - Amount refunded: ${withdrawal.amount} USDT`
      ]
    );

    await client.query('COMMIT');

    res.status(200).json({
      status: 'success',
      message: 'Withdrawal cancelled successfully',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Cancel withdrawal error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to cancel withdrawal',
    });
  } finally {
    client.release();
  }
};