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

// Admin: Get all withdrawals
export const getAllWithdrawals = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { limit = 50, offset = 0, status, chain, user_id } = req.query;

    let query = `
      SELECT 
        w.id,
        w.user_id,
        u.email,
        u.full_name,
        w.amount,
        w.chain,
        w.wallet_address,
        w.status,
        w.tx_hash,
        w.rejection_reason,
        w.admin_notes,
        w.requested_at,
        w.processed_at,
        w.processed_by
      FROM withdrawals w
      JOIN users u ON w.user_id = u.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (status) {
      query += ` AND w.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (chain) {
      query += ` AND w.chain = $${paramCount}`;
      params.push(chain);
      paramCount++;
    }

    if (user_id) {
      query += ` AND w.user_id = $${paramCount}`;
      params.push(user_id);
      paramCount++;
    }

    query += ` ORDER BY w.requested_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM withdrawals WHERE 1=1';
    const countParams: any[] = [];
    let countParamCount = 1;

    if (status) {
      countQuery += ` AND status = $${countParamCount}`;
      countParams.push(status);
      countParamCount++;
    }

    if (chain) {
      countQuery += ` AND chain = $${countParamCount}`;
      countParams.push(chain);
      countParamCount++;
    }

    if (user_id) {
      countQuery += ` AND user_id = $${countParamCount}`;
      countParams.push(user_id);
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
    console.error('Get all withdrawals error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch withdrawals',
    });
  }
};

// Admin: Get pending withdrawals
export const getPendingWithdrawals = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT 
        w.id,
        w.user_id,
        u.email,
        u.full_name,
        w.amount,
        w.chain,
        w.wallet_address,
        w.status,
        w.requested_at
      FROM withdrawals w
      JOIN users u ON w.user_id = u.id
      WHERE w.status = 'pending'
      ORDER BY w.requested_at ASC`
    );

    res.status(200).json({
      status: 'success',
      data: result.rows,
    });
  } catch (error) {
    console.error('Get pending withdrawals error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch pending withdrawals',
    });
  }
};

// Admin: Get single withdrawal details
export const getWithdrawalById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        w.id,
        w.user_id,
        u.email,
        u.full_name,
        w.amount,
        w.chain,
        w.wallet_address,
        w.status,
        w.tx_hash,
        w.rejection_reason,
        w.admin_notes,
        w.requested_at,
        w.processed_at,
        w.processed_by,
        w.updated_at
      FROM withdrawals w
      JOIN users u ON w.user_id = u.id
      WHERE w.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        status: 'error',
        message: 'Withdrawal not found',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Get withdrawal by ID error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch withdrawal details',
    });
  }
};

// Admin: Approve and process withdrawal
export const approveWithdrawal = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { tx_hash, admin_notes } = req.body;
    const adminId = req.user?.id;

    if (!tx_hash) {
      res.status(400).json({
        status: 'error',
        message: 'tx_hash is required',
      });
      return;
    }

    await client.query('BEGIN');

    // Get withdrawal details
    const withdrawalResult = await client.query(
      'SELECT id, user_id, amount, status FROM withdrawals WHERE id = $1',
      [id]
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
        message: `Cannot approve withdrawal with status: ${withdrawal.status}`,
      });
      return;
    }

    // Check if tx_hash already used
    const duplicateCheck = await client.query(
      'SELECT id FROM withdrawals WHERE tx_hash = $1 AND id != $2',
      [tx_hash, id]
    );

    if (duplicateCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      res.status(409).json({
        status: 'error',
        message: 'Transaction hash already used',
      });
      return;
    }

    // Update withdrawal status
    const updatedWithdrawal = await client.query(
      `UPDATE withdrawals 
       SET status = $1, 
           tx_hash = $2,
           admin_notes = $3,
           processed_by = $4,
           processed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING id, amount, chain, tx_hash, status, processed_at`,
      ['completed', tx_hash, admin_notes, adminId, id]
    );

    // No need to update accounts table further - balance was already deducted during request
    // Just create a completion ledger entry
    const currentAccountBalance = await client.query(
      'SELECT balance FROM accounts WHERE user_id = $1',
      [withdrawal.user_id]
    );

    const currentBalance = parseFloat(currentAccountBalance.rows[0]?.balance || 0);

    await client.query(
      `INSERT INTO ledger_entries (
        user_id, transaction_type, amount, balance_before, balance_after, 
        reference_type, reference_id, description, created_at
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`,
      [
        withdrawal.user_id,
        'withdrawal',
        -withdrawal.amount,
        currentBalance,
        currentBalance, // Balance doesn't change here as it was already deducted
        'withdrawal',
        id,
        `Withdrawal completed - TX: ${tx_hash.substring(0, 12)}...`
      ]
    );

    await client.query('COMMIT');

    res.status(200).json({
      status: 'success',
      message: 'Withdrawal approved and processed',
      data: updatedWithdrawal.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Approve withdrawal error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to approve withdrawal',
    });
  } finally {
    client.release();
  }
};

// Admin: Reject withdrawal
export const rejectWithdrawal = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.user?.id;

    if (!reason) {
      res.status(400).json({
        status: 'error',
        message: 'Rejection reason is required',
      });
      return;
    }

    await client.query('BEGIN');

    // Get withdrawal details
    const withdrawalResult = await client.query(
      'SELECT id, user_id, amount, status FROM withdrawals WHERE id = $1',
      [id]
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
        message: `Cannot reject withdrawal with status: ${withdrawal.status}`,
      });
      return;
    }

    // Update withdrawal status
    await client.query(
      `UPDATE withdrawals 
       SET status = $1, 
           rejection_reason = $2,
           processed_by = $3,
           processed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      ['rejected', reason, adminId, id]
    );

    // Return amount to available balance and total balance
    await client.query(
      `UPDATE accounts 
       SET available_balance = available_balance + $1,
           balance = balance + $1,
           updated_at = CURRENT_TIMESTAMP 
       WHERE user_id = $2`,
      [withdrawal.amount, withdrawal.user_id]
    );

    // Create refund ledger entry
    const currentBalance = await client.query(
      'SELECT available_balance, balance FROM accounts WHERE user_id = $1',
      [withdrawal.user_id]
    );

    const newBalance = parseFloat(currentBalance.rows[0].balance);
    const oldBalance = newBalance - withdrawal.amount;

    await client.query(
      `INSERT INTO ledger_entries (
        user_id, transaction_type, amount, balance_before, balance_after, 
        reference_type, reference_id, description, created_at
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`,
      [
        withdrawal.user_id,
        'refund',
        withdrawal.amount,
        oldBalance,
        newBalance,
        'withdrawal',
        id,
        `Withdrawal rejected: ${reason}`
      ]
    );

    await client.query('COMMIT');

    res.status(200).json({
      status: 'success',
      message: 'Withdrawal rejected',
      data: {
        id: parseInt(id),
        status: 'rejected',
        reason,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Reject withdrawal error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to reject withdrawal',
    });
  } finally {
    client.release();
  }
};

// Admin: Get withdrawal statistics
export const getWithdrawalStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    // Total withdrawals by status
    const statusStats = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM withdrawals
      GROUP BY status
    `);

    // Recent withdrawals (last 7 days)
    const recentStats = await pool.query(`
      SELECT 
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM withdrawals
      WHERE requested_at > NOW() - INTERVAL '7 days'
    `);

    // Pending amount
    const pendingStats = await pool.query(`
      SELECT 
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM withdrawals
      WHERE status = 'pending'
    `);

    const stats = {
      byStatus: {} as any,
      recent7Days: {
        count: parseInt(recentStats.rows[0]?.count || 0),
        totalAmount: parseFloat(recentStats.rows[0]?.total_amount || 0),
      },
      pending: {
        count: parseInt(pendingStats.rows[0]?.count || 0),
        totalAmount: parseFloat(pendingStats.rows[0]?.total_amount || 0),
      },
    };

    statusStats.rows.forEach((row) => {
      stats.byStatus[row.status] = {
        count: parseInt(row.count),
        totalAmount: parseFloat(row.total_amount || 0),
      };
    });

    res.status(200).json({
      status: 'success',
      data: stats,
    });
  } catch (error) {
    console.error('Get withdrawal stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch withdrawal statistics',
    });
  }
};