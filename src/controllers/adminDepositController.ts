// backend/src/controllers/adminDepositController.ts
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

// Admin: Get all deposits
export const getAllDeposits = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { limit = 50, offset = 0, status, chain, user_id } = req.query;

    let query = `
      SELECT 
        d.id,
        d.user_id,
        u.email,
        u.full_name,
        d.amount,
        d.chain,
        d.tx_hash,
        d.from_address,
        d.to_address,
        d.status,
        d.admin_notes,
        d.created_at,
        d.verified_at,
        d.updated_at
      FROM deposits d
      JOIN users u ON d.user_id = u.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (status) {
      query += ` AND d.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (chain) {
      query += ` AND d.chain = $${paramCount}`;
      params.push(chain);
      paramCount++;
    }

    if (user_id) {
      query += ` AND d.user_id = $${paramCount}`;
      params.push(user_id);
      paramCount++;
    }

    query += ` ORDER BY d.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM deposits WHERE 1=1';
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
        deposits: result.rows,
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  } catch (error) {
    console.error('Get all deposits error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch deposits',
    });
  }
};

// Admin: Get single deposit details
export const getDepositById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        d.id,
        d.user_id,
        u.email,
        u.full_name,
        u.phone,
        d.amount,
        d.chain,
        d.tx_hash,
        d.from_address,
        d.to_address,
        d.status,
        d.admin_notes,
        d.created_at,
        d.verified_at,
        d.verified_by,
        d.updated_at
      FROM deposits d
      JOIN users u ON d.user_id = u.id
      WHERE d.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        status: 'error',
        message: 'Deposit not found',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Get deposit by ID error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch deposit details',
    });
  }
};

// Admin: Manually confirm deposit (if cron fails or for manual override)
export const confirmDeposit = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const { admin_notes } = req.body;
    const adminId = req.user?.id;

    await client.query('BEGIN');

    // Get deposit details
    const depositResult = await client.query(
      'SELECT id, user_id, amount, status, chain FROM deposits WHERE id = $1',
      [id]
    );

    if (depositResult.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({
        status: 'error',
        message: 'Deposit not found',
      });
      return;
    }

    const deposit = depositResult.rows[0];

    if (deposit.status === 'confirmed') {
      await client.query('ROLLBACK');
      res.status(400).json({
        status: 'error',
        message: 'Deposit is already confirmed',
      });
      return;
    }

    // Update deposit status
    // Note: The database trigger will automatically update the balance
    await client.query(
      `UPDATE deposits 
       SET status = $1, 
           admin_notes = $2,
           verified_by = $3,
           verified_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      ['confirmed', admin_notes, adminId, id]
    );

    // Get current balance before trigger runs
    const accountResult = await client.query(
      'SELECT balance, available_balance FROM accounts WHERE user_id = $1',
      [deposit.user_id]
    );

    const balanceBefore = accountResult.rows[0]
      ? parseFloat(accountResult.rows[0].available_balance)
      : 0;

    // Get the updated balance after trigger runs
    const updatedBalanceResult = await client.query(
      'SELECT available_balance FROM accounts WHERE user_id = $1',
      [deposit.user_id]
    );
    
    const balanceAfter = updatedBalanceResult.rows[0]
      ? parseFloat(updatedBalanceResult.rows[0].available_balance)
      : 0;

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
        balanceAfter,
        deposit.chain,
        'deposit',
        id,
        `Deposit confirmed by admin - ${deposit.amount} ${deposit.chain} USDT`,
      ]
    );

    await client.query('COMMIT');

    res.status(200).json({
      status: 'success',
      message: 'Deposit confirmed successfully',
      data: {
        id: parseInt(id),
        status: 'confirmed',
        amount: deposit.amount,
      },
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Confirm deposit error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to confirm deposit',
    });
  } finally {
    client.release();
  }
};

// Admin: Reject deposit
export const rejectDeposit = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

    // Get deposit details
    const depositResult = await client.query(
      'SELECT id, status FROM deposits WHERE id = $1',
      [id]
    );

    if (depositResult.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({
        status: 'error',
        message: 'Deposit not found',
      });
      return;
    }

    const deposit = depositResult.rows[0];

    if (deposit.status !== 'pending') {
      await client.query('ROLLBACK');
      res.status(400).json({
        status: 'error',
        message: `Cannot reject deposit with status: ${deposit.status}`,
      });
      return;
    }

    // Update deposit status to failed
    await client.query(
      `UPDATE deposits 
       SET status = $1, 
           admin_notes = $2,
           verified_by = $3,
           verified_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      ['failed', reason, adminId, id]
    );

    await client.query('COMMIT');

    res.status(200).json({
      status: 'success',
      message: 'Deposit rejected',
      data: {
        id: parseInt(id),
        status: 'failed',
        reason,
      },
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Reject deposit error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to reject deposit',
    });
  } finally {
    client.release();
  }
};

// Admin: Get deposit statistics
export const getDepositStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    // Total deposits by status
    const statusStats = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM deposits
      GROUP BY status
    `);

    // Recent deposits (last 7 days)
    const recentStats = await pool.query(`
      SELECT 
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM deposits
      WHERE created_at > NOW() - INTERVAL '7 days'
    `);

    // Pending deposits
    const pendingStats = await pool.query(`
      SELECT 
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM deposits
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
    console.error('Get deposit stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch deposit statistics',
    });
  }
};