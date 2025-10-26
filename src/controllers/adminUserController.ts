import { Request, Response } from 'express';
import pool from '../config/database';

// Get all users with pagination and filters
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      search = '', 
      kyc_status = 'all',
      limit = '50', 
      offset = '0',
      sort = 'newest'
    } = req.query;

    let query = `
      SELECT 
        u.id,
        u.email,
        u.full_name,
        u.phone,
        u.kyc_status,
        u.is_active,
        u.created_at,
        u.updated_at,
        a.balance,
        a.available_balance,
        a.invested_balance,
        (SELECT COUNT(*) FROM investments WHERE user_id = u.id AND status = 'active') as active_investments
      FROM users u
      LEFT JOIN accounts a ON u.id = a.user_id
      WHERE u.is_admin = false
    `;

    const params: any[] = [];
    let paramCount = 0;

    // Search filter
    if (search && search !== '') {
      paramCount++;
      query += ` AND (
        u.full_name ILIKE $${paramCount} OR 
        u.email ILIKE $${paramCount} OR 
        u.id::text LIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
    }

    // KYC status filter
    if (kyc_status && kyc_status !== 'all') {
      paramCount++;
      query += ` AND u.kyc_status = $${paramCount}`;
      params.push(kyc_status);
    }

    // Sorting
    switch (sort) {
      case 'newest':
        query += ' ORDER BY u.created_at DESC';
        break;
      case 'oldest':
        query += ' ORDER BY u.created_at ASC';
        break;
      case 'nameAsc':
        query += ' ORDER BY u.full_name ASC';
        break;
      case 'nameDesc':
        query += ' ORDER BY u.full_name DESC';
        break;
      default:
        query += ' ORDER BY u.created_at DESC';
    }

    // Pagination
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(parseInt(limit as string));
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(parseInt(offset as string));

    console.log('📊 Users Query:', query);
    console.log('📊 Users Params:', params);

    const result = await pool.query(query, params);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM users u 
      WHERE u.is_admin = false
    `;
    const countParams: any[] = [];
    let countParamCount = 0;

    if (search && search !== '') {
      countParamCount++;
      countQuery += ` AND (
        u.full_name ILIKE $${countParamCount} OR 
        u.email ILIKE $${countParamCount} OR 
        u.id::text LIKE $${countParamCount}
      )`;
      countParams.push(`%${search}%`);
    }

    if (kyc_status && kyc_status !== 'all') {
      countParamCount++;
      countQuery += ` AND u.kyc_status = $${countParamCount}`;
      countParams.push(kyc_status);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    console.log(`✅ Found ${result.rows.length} users (total: ${total})`);

    res.status(200).json({
      status: 'success',
      data: {
        users: result.rows,
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch users',
    });
  }
};

// Get user by ID with detailed information
export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        u.id,
        u.email,
        u.full_name,
        u.phone,
        u.kyc_status,
        u.is_active,
        u.referral_code,
        u.referred_by,
        u.created_at,
        u.updated_at,
        a.balance,
        a.available_balance,
        a.invested_balance,
        a.updated_at as balance_updated_at
      FROM users u
      LEFT JOIN accounts a ON u.id = a.user_id
      WHERE u.id = $1 AND u.is_admin = false`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
      return;
    }

    const user = result.rows[0];

    // Get investment summary
    const investmentResult = await pool.query(
      `SELECT 
        COUNT(*) FILTER (WHERE status = 'active') as active_count,
        SUM(amount) FILTER (WHERE status = 'active') as total_invested,
        SUM(amount) FILTER (WHERE status = 'completed') as total_completed
      FROM investments
      WHERE user_id = $1`,
      [id]
    );

    // Get withdrawal summary
    const withdrawalResult = await pool.query(
      `SELECT 
        COUNT(*) as total_count,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
        SUM(amount) FILTER (WHERE status = 'completed') as total_withdrawn
      FROM withdrawals
      WHERE user_id = $1`,
      [id]
    );

    // Get total profit earned
    const profitResult = await pool.query(
      `SELECT 
        COALESCE(SUM(amount), 0) as total_profit
      FROM ledger_entries
      WHERE user_id = $1 AND transaction_type = 'profit'`,
      [id]
    );

    // Get current active investment
    const activeInvestmentResult = await pool.query(
      `SELECT 
        i.id,
        i.amount,
        i.level,
        i.profit_rate,
        i.status,
        i.created_at,
        i.next_profit_date
      FROM investments i
      WHERE i.user_id = $1 AND i.status = 'active'
      ORDER BY i.created_at DESC
      LIMIT 1`,
      [id]
    );

    res.status(200).json({
      status: 'success',
      data: {
        user,
        stats: {
          investments: investmentResult.rows[0],
          withdrawals: withdrawalResult.rows[0],
          total_profit: parseFloat(profitResult.rows[0].total_profit),
        },
        active_investment: activeInvestmentResult.rows[0] || null,
      },
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch user details',
    });
  }
};

// Get user statistics summary
export const getUserStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE is_active = true) as active_users,
        COUNT(*) FILTER (WHERE kyc_status = 'approved') as verified_users,
        COUNT(*) FILTER (WHERE kyc_status = 'pending') as pending_kyc,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as recent_signups,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as monthly_signups
      FROM users
      WHERE is_admin = false
    `);

    res.status(200).json({
      status: 'success',
      data: statsResult.rows[0],
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch user statistics',
    });
  }
};