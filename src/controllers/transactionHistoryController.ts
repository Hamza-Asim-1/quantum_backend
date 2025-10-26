// src/controllers/transactionHistoryController.ts

import { Request, Response } from 'express';
import pool from '../config/database';

/**
 * Get Complete Transaction History
 * Combines deposits and withdrawals with user details and KYC info
 */
export const getTransactionHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      limit = 50,
      offset = 0,
      transaction_type,
      status,
      user_id,
      document_number,
      start_date,
      end_date,
      search,
    } = req.query;

    // Build WHERE conditions
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (transaction_type && transaction_type !== 'all') {
      conditions.push(`transaction_type = $${paramCount}`);
      values.push(transaction_type);
      paramCount++;
    }

    if (status) {
      conditions.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    if (user_id) {
      conditions.push(`user_id = $${paramCount}`);
      values.push(user_id);
      paramCount++;
    }

    if (document_number) {
      conditions.push(`document_number ILIKE $${paramCount}`);
      values.push(`%${document_number}%`);
      paramCount++;
    }

    if (start_date) {
      conditions.push(`transaction_time >= $${paramCount}`);
      values.push(start_date);
      paramCount++;
    }

    if (end_date) {
      conditions.push(`transaction_time <= $${paramCount}`);
      values.push(end_date);
      paramCount++;
    }

    if (search) {
      conditions.push(`(user_name ILIKE $${paramCount} OR user_email ILIKE $${paramCount})`);
      values.push(`%${search}%`);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Main query
    const query = `
      WITH all_transactions AS (
        -- Deposits
        SELECT 
          CONCAT('DEP-', d.id) as transaction_id,
          'deposit' as transaction_type,
          u.id as user_id,
          u.full_name as user_name,
          u.email as user_email,
          COALESCE(k.document_number, 'N/A') as document_number,
          COALESCE(k.document_type, 'N/A') as document_type,
          d.amount as amount,
          d.created_at as transaction_time,
          d.status as status,
          d.chain as chain,
          d.tx_hash as tx_hash,
          NULL::DECIMAL as fee
        FROM deposits d
        JOIN users u ON d.user_id = u.id
        LEFT JOIN kyc_submissions k ON u.id = k.user_id AND k.status = 'approved'

        UNION ALL

        -- Withdrawals
        SELECT 
          CONCAT('WITH-', w.id) as transaction_id,
          'withdrawal' as transaction_type,
          u.id as user_id,
          u.full_name as user_name,
          u.email as user_email,
          COALESCE(k.document_number, 'N/A') as document_number,
          COALESCE(k.document_type, 'N/A') as document_type,
          w.amount as amount,
          w.requested_at as transaction_time,
          w.status as status,
          w.chain as chain,
          w.tx_hash as tx_hash,
          w.fee as fee
        FROM withdrawals w
        JOIN users u ON w.user_id = u.id
        LEFT JOIN kyc_submissions k ON u.id = k.user_id AND k.status = 'approved'
      )
      SELECT * FROM all_transactions
      ${whereClause}
      ORDER BY transaction_time DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    values.push(limit, offset);

    const result = await pool.query(query, values);

    // Get total count
    const countQuery = `
      WITH all_transactions AS (
        SELECT d.id, d.user_id, u.full_name as user_name, u.email as user_email, 
               COALESCE(k.document_number, 'N/A') as document_number,
               'deposit' as transaction_type, d.status, d.created_at as transaction_time
        FROM deposits d
        JOIN users u ON d.user_id = u.id
        LEFT JOIN kyc_submissions k ON u.id = k.user_id AND k.status = 'approved'
        
        UNION ALL
        
        SELECT w.id, w.user_id, u.full_name as user_name, u.email as user_email,
               COALESCE(k.document_number, 'N/A') as document_number,
               'withdrawal' as transaction_type, w.status, w.requested_at as transaction_time
        FROM withdrawals w
        JOIN users u ON w.user_id = u.id
        LEFT JOIN kyc_submissions k ON u.id = k.user_id AND k.status = 'approved'
      )
      SELECT COUNT(*) as total FROM all_transactions
      ${whereClause}
    `;

    const countResult = await pool.query(countQuery, values.slice(0, -2));

    // Statistics
    const statsQuery = `
      WITH all_transactions AS (
        SELECT 'deposit' as type, amount, status FROM deposits
        UNION ALL
        SELECT 'withdrawal' as type, amount, status FROM withdrawals
      )
      SELECT 
        type,
        status,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total_amount
      FROM all_transactions
      GROUP BY type, status
    `;

    const statsResult = await pool.query(statsQuery);

    res.status(200).json({
      status: 'success',
      data: {
        transactions: result.rows,
        pagination: {
          total: parseInt(countResult.rows[0].total),
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          pages: Math.ceil(parseInt(countResult.rows[0].total) / parseInt(limit as string)),
        },
        summary: {
          total_transactions: parseInt(countResult.rows[0].total),
          statistics: statsResult.rows,
        },
      },
    });
  } catch (error) {
    console.error('Get transaction history error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch transaction history',
    });
  }
};

/**
 * Get Transaction by ID
 */
export const getTransactionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { type } = req.query;

    if (!type || (type !== 'deposit' && type !== 'withdrawal')) {
      res.status(400).json({
        status: 'error',
        message: 'Valid transaction type is required (deposit or withdrawal)',
      });
      return;
    }

    let query: string;
    let transactionId: string;

    if (type === 'deposit') {
      transactionId = id.replace('DEP-', '');
      query = `
        SELECT 
          CONCAT('DEP-', d.id) as transaction_id,
          'deposit' as transaction_type,
          u.id as user_id,
          u.full_name as user_name,
          u.email as user_email,
          u.phone as user_phone,
          COALESCE(k.document_number, 'N/A') as document_number,
          COALESCE(k.document_type, 'N/A') as document_type,
          d.amount,
          d.created_at as transaction_time,
          d.status,
          d.chain,
          d.tx_hash,
          d.from_address,
          d.to_address,
          d.admin_notes,
          d.verified_at
        FROM deposits d
        JOIN users u ON d.user_id = u.id
        LEFT JOIN kyc_submissions k ON u.id = k.user_id AND k.status = 'approved'
        WHERE d.id = $1
      `;
    } else {
      transactionId = id.replace('WITH-', '');
      query = `
        SELECT 
          CONCAT('WITH-', w.id) as transaction_id,
          'withdrawal' as transaction_type,
          u.id as user_id,
          u.full_name as user_name,
          u.email as user_email,
          u.phone as user_phone,
          COALESCE(k.document_number, 'N/A') as document_number,
          COALESCE(k.document_type, 'N/A') as document_type,
          w.amount,
          w.requested_at as transaction_time,
          w.status,
          w.chain,
          w.tx_hash,
          w.wallet_address,
          w.fee,
          w.admin_notes,
          w.rejection_reason,
          w.approved_at,
          w.completed_at
        FROM withdrawals w
        JOIN users u ON w.user_id = u.id
        LEFT JOIN kyc_submissions k ON u.id = k.user_id AND k.status = 'approved'
        WHERE w.id = $1
      `;
    }

    const result = await pool.query(query, [transactionId]);

    if (result.rows.length === 0) {
      res.status(404).json({
        status: 'error',
        message: 'Transaction not found',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Get transaction by ID error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch transaction',
    });
  }
};

/**
 * Export Transactions
 */
export const exportTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { format = 'json' } = req.query;

    const query = `
      WITH all_transactions AS (
        SELECT 
          CONCAT('DEP-', d.id) as transaction_id,
          'deposit' as transaction_type,
          u.full_name as user_name,
          u.email as user_email,
          COALESCE(k.document_number, 'N/A') as document_number,
          d.amount,
          d.created_at as transaction_time,
          d.status
        FROM deposits d
        JOIN users u ON d.user_id = u.id
        LEFT JOIN kyc_submissions k ON u.id = k.user_id AND k.status = 'approved'
        
        UNION ALL
        
        SELECT 
          CONCAT('WITH-', w.id) as transaction_id,
          'withdrawal' as transaction_type,
          u.full_name as user_name,
          u.email as user_email,
          COALESCE(k.document_number, 'N/A') as document_number,
          w.amount,
          w.requested_at as transaction_time,
          w.status
        FROM withdrawals w
        JOIN users u ON w.user_id = u.id
        LEFT JOIN kyc_submissions k ON u.id = k.user_id AND k.status = 'approved'
      )
      SELECT * FROM all_transactions
      ORDER BY transaction_time DESC
    `;

    const result = await pool.query(query);

    if (format === 'csv') {
      const headers = [
        'Transaction ID',
        'Type',
        'User Name',
        'Email',
        'Document Number',
        'Amount',
        'Time',
        'Status',
      ];

      const csv = [
        headers.join(','),
        ...result.rows.map((row) =>
          [
            row.transaction_id,
            row.transaction_type,
            `"${row.user_name}"`,
            row.user_email,
            row.document_number,
            row.amount,
            row.transaction_time,
            row.status,
          ].join(',')
        ),
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=transactions.csv');
      res.send(csv);
    } else {
      res.status(200).json({
        status: 'success',
        data: result.rows,
      });
    }
  } catch (error) {
    console.error('Export transactions error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to export transactions',
    });
  }
};