import { Request, Response } from 'express';
import pool from '../config/database';

// Get ledger entries for a specific user
export const getUserLedgerEntries = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { 
      transaction_type = 'all',
      limit = '50', 
      offset = '0',
      sort = 'newest'
    } = req.query;

    let query = `
      SELECT 
        id,
        user_id,
        transaction_type,
        amount,
        balance_before,
        balance_after,
        chain,
        reference_type,
        reference_id,
        description,
        metadata,
        created_at
      FROM ledger_entries
      WHERE user_id = $1
    `;

    const params: any[] = [userId];
    let paramCount = 1;

    // Transaction type filter
    if (transaction_type && transaction_type !== 'all') {
      paramCount++;
      query += ` AND transaction_type = $${paramCount}`;
      params.push(transaction_type);
    }

    // Sorting
    if (sort === 'oldest') {
      query += ' ORDER BY created_at ASC';
    } else {
      query += ' ORDER BY created_at DESC';
    }

    // Pagination
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(parseInt(limit as string));
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(parseInt(offset as string));

    console.log('📊 Ledger Query:', query);
    console.log('📊 Ledger Params:', params);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM ledger_entries 
      WHERE user_id = $1
    `;
    const countParams: any[] = [userId];

    if (transaction_type && transaction_type !== 'all') {
      countQuery += ` AND transaction_type = $2`;
      countParams.push(transaction_type);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    // Get summary by transaction type
    const summaryResult = await pool.query(
      `SELECT 
        transaction_type,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM ledger_entries
      WHERE user_id = $1
      GROUP BY transaction_type`,
      [userId]
    );

    console.log(`✅ Found ${result.rows.length} ledger entries (total: ${total})`);

    res.status(200).json({
      status: 'success',
      data: {
        entries: result.rows,
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        summary: summaryResult.rows,
      },
    });
  } catch (error) {
    console.error('Get user ledger entries error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch ledger entries',
    });
  }
};

// Get ledger entry by ID
export const getLedgerEntryById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        l.*,
        u.email,
        u.full_name
      FROM ledger_entries l
      JOIN users u ON l.user_id = u.id
      WHERE l.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        status: 'error',
        message: 'Ledger entry not found',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Get ledger entry by ID error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch ledger entry',
    });
  }
};