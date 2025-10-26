import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/database';

// Admin Login
export const adminLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        status: 'error',
        message: 'Email and password are required',
      });
      return;
    }

    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND is_admin = true AND is_active = true',
      [email]
    );

    if (result.rows.length === 0) {
      res.status(401).json({
        status: 'error',
        message: 'Invalid admin credentials',
      });
      return;
    }

    const admin = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, admin.password_hash);

    if (!isPasswordValid) {
      res.status(401).json({
        status: 'error',
        message: 'Invalid admin credentials',
      });
      return;
    }

    // Generate both access and refresh tokens
    const accessToken = jwt.sign(
      {
        id: admin.id,
        email: admin.email,
        type: 'admin',  // Important!
        role: 'admin',
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    const refreshToken = jwt.sign(
      {
        id: admin.id,
        email: admin.email,
        type: 'admin',
      },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.status(200).json({
      status: 'success',
      message: 'Admin login successful',
      data: {
        accessToken,
        refreshToken,  // ✅ Frontend expects this!
        admin: {
          id: admin.id,
          email: admin.email,
          full_name: admin.full_name,  // ✅ Frontend expects this!
          is_admin: true,
        },
      },
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
};

export const getKYCById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        k.id,
        k.user_id,
        u.email,
        u.full_name,
        u.phone,
        k.document_type,
        k.document_number,
        k.document_front_url,
        k.document_back_url,
        k.selfie_url,
        k.status,
        k.rejection_reason,
        k.reviewed_by,
        k.reviewed_at,
        k.submitted_at,
        k.updated_at
      FROM kyc_submissions k
      JOIN users u ON k.user_id = u.id
      WHERE k.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        status: 'error',
        message: 'KYC submission not found',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Get KYC by ID error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch KYC submission',
    });
  }
};

// Get Dashboard Statistics
export const getDashboardStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    // Total users (exclude admins)
    const totalUsersResult = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE is_admin = false'
    );
    const totalUsers = parseInt(totalUsersResult.rows[0].count);

    // Active users (created within last 30 days)
    const activeUsersResult = await pool.query(
      "SELECT COUNT(*) as count FROM users WHERE is_admin = false AND created_at > NOW() - INTERVAL '30 days'"
    );
    const activeUsers = parseInt(activeUsersResult.rows[0].count);

    // ✅ FIX: Use kyc_status instead of is_kyc_verified
    const verifiedUsersResult = await pool.query(
      "SELECT COUNT(*) as count FROM users WHERE is_admin = false AND kyc_status = 'approved'"
    );
    const verifiedUsers = parseInt(verifiedUsersResult.rows[0].count);

    // Recent users (last 7 days)
    const recentUsersResult = await pool.query(
      "SELECT COUNT(*) as count FROM users WHERE is_admin = false AND created_at > NOW() - INTERVAL '7 days'"
    );
    const recentUsers = parseInt(recentUsersResult.rows[0].count);

    // KYC statistics
    const kycStatsResult = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM kyc_submissions
      GROUP BY status
    `);

    const kycStats = {
      pending: 0,
      approved: 0,
      rejected: 0,
      total: 0,
    };

    kycStatsResult.rows.forEach((row) => {
      const status = row.status as 'pending' | 'approved' | 'rejected';
      kycStats[status] = parseInt(row.count);
      kycStats.total += parseInt(row.count);
    });

    // Recent KYC (last 7 days)
    const recentKYCResult = await pool.query(
      "SELECT COUNT(*) as count FROM kyc_submissions WHERE submitted_at > NOW() - INTERVAL '7 days'"
    );
    const recentKYC = parseInt(recentKYCResult.rows[0].count);

    // Total deposits (handle if table doesn't exist)
    let totalDeposits = 0;
    let depositCount = 0;
    try {
      const depositsResult = await pool.query(`
        SELECT 
          COUNT(*) as count,
          COALESCE(SUM(amount), 0) as total
        FROM deposits
        WHERE status = 'confirmed'
      `);
      depositCount = parseInt(depositsResult.rows[0].count);
      totalDeposits = parseFloat(depositsResult.rows[0].total);
    } catch (error) {
      console.log('Deposits table not found or query failed, using defaults');
    }

    // Referral statistics
    let referralStats = {
      totalReferrals: 0,
      totalCommissionsPaid: 0,
      topReferrers: [] as Array<{
        name: string;
        email: string;
        referrals_made: number;
        total_earned: number;
      }>,
      recentReferrals: 0
    };

    try {
      // Total referrals made
      const totalReferralsResult = await pool.query(`
        SELECT COUNT(*) as count FROM users WHERE referred_by IS NOT NULL
      `);
      referralStats.totalReferrals = parseInt(totalReferralsResult.rows[0].count);

      // Total commissions paid
      const totalCommissionsResult = await pool.query(`
        SELECT COALESCE(SUM(commission_amount), 0) as total
        FROM referral_commissions 
        WHERE status = 'paid'
      `);
      referralStats.totalCommissionsPaid = parseFloat(totalCommissionsResult.rows[0].total);

      // Top referrers (last 30 days)
      const topReferrersResult = await pool.query(`
        SELECT 
          u.full_name, u.email,
          COUNT(rc.id) as referrals_made,
          COALESCE(SUM(rc.commission_amount), 0) as total_earned
        FROM users u
        LEFT JOIN referral_commissions rc ON u.id = rc.referrer_id AND rc.status = 'paid'
        WHERE u.total_referrals > 0
        GROUP BY u.id, u.full_name, u.email
        ORDER BY referrals_made DESC, total_earned DESC
        LIMIT 5
      `);
      referralStats.topReferrers = topReferrersResult.rows.map(user => ({
        name: user.full_name,
        email: user.email,
        referrals_made: parseInt(user.referrals_made),
        total_earned: parseFloat(user.total_earned)
      }));

      // Recent referrals (last 7 days)
      const recentReferralsResult = await pool.query(`
        SELECT COUNT(*) as count FROM users 
        WHERE referred_by IS NOT NULL 
        AND created_at > NOW() - INTERVAL '7 days'
      `);
      referralStats.recentReferrals = parseInt(recentReferralsResult.rows[0].count);

    } catch (error) {
      console.log('Referral statistics query failed, using defaults');
    }

    res.status(200).json({
      status: 'success',
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          verified: verifiedUsers,
          recentSignups: recentUsers,
        },
        kyc: {
          total: kycStats.total,
          pending: kycStats.pending,
          approved: kycStats.approved,
          rejected: kycStats.rejected,
          recentSubmissions: recentKYC,
        },
        deposits: {
          total: totalDeposits,
          count: depositCount,
        },
        referrals: {
          totalReferrals: referralStats.totalReferrals,
          totalCommissionsPaid: referralStats.totalCommissionsPaid,
          recentReferrals: referralStats.recentReferrals,
          topReferrers: referralStats.topReferrers,
        },
      },
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch dashboard statistics',
    });
  }
};
// backend/src/controllers/adminKYCController.ts

export const getAllKYC = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, limit = '100', offset = '0' } = req.query;

    let query = `
      SELECT 
        k.id,
        k.user_id,
        k.document_type,
        k.document_number,
        k.document_front_url,
        k.document_back_url,
        k.selfie_url,
        k.status,
        k.rejection_reason,
        k.reviewed_by,
        k.reviewed_at,
        k.submitted_at,
        k.updated_at,
        u.email,
        u.full_name,
        u.phone
      FROM kyc_submissions k
      JOIN users u ON k.user_id = u.id
    `;

    const params: any[] = [];
    
    // ✅ FIX: Only add WHERE clause if status is provided AND it's not 'all'
    if (status && status !== 'all') {
      query += ' WHERE k.status = $1';
      params.push(status);
      query += ` ORDER BY k.submitted_at DESC LIMIT $2 OFFSET $3`;
      params.push(parseInt(limit as string), parseInt(offset as string));
    } else {
      // For 'all' or no status, don't add WHERE clause
      query += ` ORDER BY k.submitted_at DESC LIMIT $1 OFFSET $2`;
      params.push(parseInt(limit as string), parseInt(offset as string));
    }

    console.log('📊 KYC Query:', query);
    console.log('📊 KYC Params:', params);

    const result = await pool.query(query, params);

    console.log(`✅ Found ${result.rows.length} KYC submissions`);

    res.status(200).json({
      status: 'success',
      data: result.rows,
    });
  } catch (error) {
    console.error('Get all KYC error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch KYC submissions',
    });
  }
};

// Get Pending KYC Submissions
export const getPendingKYC = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT 
        k.id,
        k.user_id,
        k.document_type,
        k.document_number,
        k.document_front_url,
        k.document_back_url,
        k.selfie_url,
        k.status,
        k.submitted_at,
        u.email,
        u.full_name,
        u.phone
      FROM kyc_submissions k
      JOIN users u ON k.user_id = u.id
      WHERE k.status = 'pending'
      ORDER BY k.submitted_at DESC`
    );

    res.status(200).json({
      status: 'success',
      data: result.rows,
    });
  } catch (error) {
    console.error('Get pending KYC error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch pending KYC submissions',
    });
  }
};

// Approve KYC
// Approve KYC
export const approveKYC = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const adminId = (req as any).admin?.id;

    await client.query('BEGIN');

    // Update KYC submission
    const kycResult = await client.query(
      `UPDATE kyc_submissions 
       SET status = 'approved', 
           reviewed_at = NOW(),
           reviewed_by = $1,
           updated_at = NOW()
       WHERE id = $2 AND status = 'pending'
       RETURNING user_id`,
      [adminId, id]
    );

    if (kycResult.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({
        status: 'error',
        message: 'KYC submission not found or already reviewed',
      });
      return;
    }

    const userId = kycResult.rows[0].user_id;

    // ✅ FIX: Update user's kyc_status (not is_kyc_verified)
    await client.query(
      `UPDATE users 
       SET kyc_status = 'approved',
           updated_at = NOW()
       WHERE id = $1`,
      [userId]
    );

    await client.query('COMMIT');

    res.status(200).json({
      status: 'success',
      message: 'KYC approved successfully',
      data: {
        id: parseInt(id),
        status: 'approved',
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Approve KYC error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to approve KYC',
    });
  } finally {
    client.release();
  }
};
// Reject KYC
export const rejectKYC = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = (req as any).admin?.id;

    const result = await pool.query(
      `UPDATE kyc_submissions 
       SET status = 'rejected', 
           reviewed_at = NOW(),
           reviewed_by = $1,
           rejection_reason = $2
       WHERE id = $3 AND status = 'pending'
       RETURNING id`,
      [adminId, reason || 'Not specified', id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        status: 'error',
        message: 'KYC submission not found or already reviewed',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      message: 'KYC rejected successfully',
      data: {
        id: parseInt(id),
        status: 'rejected',
        reason: reason || 'Not specified',
      },
    });
  } catch (error) {
    console.error('Reject KYC error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to reject KYC',
    });
  }
};