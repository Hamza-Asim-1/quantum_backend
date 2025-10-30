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

/**
 * Get user's referral information
 */
export const getReferralInfo = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        status: 'error',
        message: 'User not authenticated',
      });
      return;
    }

    // Get user's referral code and stats
    const userResult = await pool.query(
      `SELECT 
        referral_code, total_referrals, total_commission_earned,
        created_at
      FROM users 
      WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
      return;
    }

    const user = userResult.rows[0];

    // Get recent referrals
    const referralsResult = await pool.query(
      `SELECT 
        u.id, u.email, u.full_name, u.created_at,
        rc.commission_amount, rc.status as commission_status
      FROM users u
      LEFT JOIN referral_commissions rc ON u.id = rc.referred_user_id AND rc.referrer_id = $1
      WHERE u.referred_by = $1
      ORDER BY u.created_at DESC
      LIMIT 10`,
      [userId]
    );

    // Aggregate stats (signups, paid referrals, total earned)
    const statsResult = await pool.query(
      `SELECT 
        (SELECT COUNT(*) FROM users WHERE referred_by = $1) AS total_signups,
        (SELECT COUNT(*) FROM referral_commissions WHERE referrer_id = $1 AND status = 'paid') AS total_paid_referrals,
        (SELECT COALESCE(SUM(commission_amount), 0) FROM referral_commissions WHERE referrer_id = $1 AND status = 'paid') AS total_earned`,
      [userId]
    );

    const stats = statsResult.rows[0];
    const totalPaidReferrals = parseInt(stats.total_paid_referrals, 10) || 0;
    const totalEarned = parseFloat(stats.total_earned || 0);
    const avgPerReferral = totalPaidReferrals > 0 ? totalEarned / totalPaidReferrals : 0;

    // Get total commission earned this month
    const monthlyCommissionResult = await pool.query(
      `SELECT COALESCE(SUM(commission_amount), 0) as monthly_commission
      FROM referral_commissions 
      WHERE referrer_id = $1 
      AND status = 'paid'
      AND created_at >= DATE_TRUNC('month', CURRENT_DATE)`,
      [userId]
    );

    res.status(200).json({
      status: 'success',
      data: {
        referral_code: user.referral_code,
        // Use paid referrals and computed totals to reflect actual earnings
        total_referrals: totalPaidReferrals,
        total_commission_earned: totalEarned,
        avg_per_referral: avgPerReferral,
        // Optionally expose signups for UI if needed
        total_signups: parseInt(stats.total_signups, 10) || 0,
        monthly_commission: parseFloat(monthlyCommissionResult.rows[0].monthly_commission),
        referrals: referralsResult.rows.map(ref => ({
          id: ref.id,
          email: ref.email,
          full_name: ref.full_name,
          created_at: ref.created_at,
          commission_amount: ref.commission_amount ? parseFloat(ref.commission_amount) : 0,
          commission_status: ref.commission_status || 'pending'
        }))
      },
    });
  } catch (error) {
    console.error('Get referral info error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch referral information',
    });
  }
};

/**
 * Get referral commission history
 */
export const getReferralCommissions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { limit = 20, offset = 0 } = req.query;

    if (!userId) {
      res.status(401).json({
        status: 'error',
        message: 'User not authenticated',
      });
      return;
    }

    const result = await pool.query(
      `SELECT 
        rc.id, rc.commission_amount, rc.commission_rate, rc.status,
        rc.created_at, rc.paid_at,
        u.email as referred_user_email, u.full_name as referred_user_name,
        d.amount as deposit_amount, d.chain
      FROM referral_commissions rc
      JOIN users u ON rc.referred_user_id = u.id
      JOIN deposits d ON rc.deposit_id = d.id
      WHERE rc.referrer_id = $1
      ORDER BY rc.created_at DESC
      LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    // Get total count
    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM referral_commissions WHERE referrer_id = $1',
      [userId]
    );

    res.status(200).json({
      status: 'success',
      data: {
        commissions: result.rows.map(commission => ({
          id: commission.id,
          commission_amount: parseFloat(commission.commission_amount),
          commission_rate: parseFloat(commission.commission_rate),
          status: commission.status,
          created_at: commission.created_at,
          paid_at: commission.paid_at,
          referred_user: {
            email: commission.referred_user_email,
            full_name: commission.referred_user_name
          },
          deposit: {
            amount: parseFloat(commission.deposit_amount),
            chain: commission.chain
          }
        })),
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  } catch (error) {
    console.error('Get referral commissions error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch referral commissions',
    });
  }
};

/**
 * Validate referral code
 */
export const validateReferralCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { referral_code } = req.body;

    if (!referral_code) {
      res.status(400).json({
        status: 'error',
        message: 'Referral code is required',
      });
      return;
    }

    const result = await pool.query(
      `SELECT id, full_name, email 
      FROM users 
      WHERE referral_code = $1`,
      [referral_code]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        status: 'error',
        message: 'Invalid referral code',
      });
      return;
    }

    const referrer = result.rows[0];

    res.status(200).json({
      status: 'success',
      data: {
        valid: true,
        referrer: {
          name: referrer.full_name,
          email: referrer.email
        }
      },
    });
  } catch (error) {
    console.error('Validate referral code error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to validate referral code',
    });
  }
};

/**
 * Get referral leaderboard (top referrers)
 */
export const getReferralLeaderboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit = 10 } = req.query;

    const result = await pool.query(
      `SELECT 
        u.id, u.full_name, u.email,
        u.total_referrals, u.total_commission_earned,
        COUNT(rc.id) as total_commissions_paid
      FROM users u
      LEFT JOIN referral_commissions rc ON u.id = rc.referrer_id AND rc.status = 'paid'
      WHERE u.total_referrals > 0
      GROUP BY u.id, u.full_name, u.email, u.total_referrals, u.total_commission_earned
      ORDER BY u.total_commission_earned DESC, u.total_referrals DESC
      LIMIT $1`,
      [limit]
    );

    res.status(200).json({
      status: 'success',
      data: {
        leaderboard: result.rows.map((user, index) => ({
          rank: index + 1,
          id: user.id,
          full_name: user.full_name,
          total_referrals: user.total_referrals,
          total_commission_earned: parseFloat(user.total_commission_earned || 0),
          total_commissions_paid: parseInt(user.total_commissions_paid)
        }))
      },
    });
  } catch (error) {
    console.error('Get referral leaderboard error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch referral leaderboard',
    });
  }
};
