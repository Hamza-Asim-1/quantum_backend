import { Request, Response } from 'express';
import pool from '../config/database';
import profitCalculationService from '../services/profitCalculationService';
import logger from '../utils/logger';

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    type?: string;
    role?: string;
  };
}

/**
 * USER ENDPOINTS
 */

// Get user's total profit summary
export const getUserProfitSummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    // Get total profit earned
    const profitResult = await pool.query(
      `SELECT 
        COALESCE(SUM(amount), 0) as total_profit,
        COUNT(*) as total_transactions,
        MIN(created_at) as first_profit_date,
        MAX(created_at) as last_profit_date
      FROM ledger_entries
      WHERE user_id = $1 AND transaction_type = 'profit'`,
      [userId]
    );

    // Get current investment profit info
    const investmentResult = await pool.query(
      `SELECT 
        i.id,
        i.amount as investment_amount,
        i.level,
        i.profit_rate,
        i.created_at,
        i.next_profit_date,
        (i.amount * i.profit_rate / 100) as daily_profit
      FROM investments i
      WHERE i.user_id = $1 AND i.status = 'active'
      ORDER BY i.created_at DESC
      LIMIT 1`,
      [userId]
    );

    // Get profit earned for active investment
    let activeInvestmentProfit = 0;
    if (investmentResult.rows.length > 0) {
      const investmentId = investmentResult.rows[0].id;
      const activeProfitResult = await pool.query(
        `SELECT COALESCE(SUM(amount), 0) as profit
         FROM ledger_entries
         WHERE user_id = $1 
           AND reference_id = $2
           AND transaction_type = 'profit'`,
        [userId, investmentId]
      );
      activeInvestmentProfit = parseFloat(activeProfitResult.rows[0].profit);
    }

    const profitData = profitResult.rows[0];
    const investmentData = investmentResult.rows[0] || null;

    res.status(200).json({
      status: 'success',
      data: {
        total_profit: parseFloat(profitData.total_profit),
        total_profit_transactions: parseInt(profitData.total_transactions),
        first_profit_date: profitData.first_profit_date,
        last_profit_date: profitData.last_profit_date,
        active_investment: investmentData ? {
          id: investmentData.id,
          investment_amount: investmentData.investment_amount,
          level: investmentData.level,
          profit_rate: investmentData.profit_rate,
          daily_profit: parseFloat(investmentData.daily_profit),
          investment_start_date: investmentData.created_at,
          next_profit_date: investmentData.next_profit_date,
          profit_earned_from_investment: activeInvestmentProfit,
        } : null,
      },
    });

  } catch (error) {
    logger.error('Get user profit summary error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch profit summary',
    });
  }
};

// Get user's profit history
export const getUserProfitHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { limit = 50, offset = 0 } = req.query;

    const result = await profitCalculationService.getUserProfitHistory(
      userId!, 
      parseInt(limit as string)
    );

    res.status(200).json({
      status: 'success',
      data: {
        profits: result,
        count: result.length,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });

  } catch (error) {
    logger.error('Get user profit history error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch profit history',
    });
  }
};

/**
 * ADMIN ENDPOINTS
 */

// Get all users profit statistics
export const getAllUsersProfitStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit = 100, offset = 0 } = req.query;

    const result = await pool.query(
      `SELECT 
        u.id,
        u.email,
        u.full_name,
        COUNT(DISTINCT le.id) as total_profit_transactions,
        COALESCE(SUM(le.amount), 0) as total_profit_earned,
        MIN(le.created_at) as first_profit_date,
        MAX(le.created_at) as last_profit_date
      FROM users u
      LEFT JOIN ledger_entries le ON u.id = le.user_id AND le.transaction_type = 'profit'
      WHERE u.is_admin = false
      GROUP BY u.id, u.email, u.full_name
      ORDER BY total_profit_earned DESC
      LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(DISTINCT user_id) as total
       FROM ledger_entries
       WHERE transaction_type = 'profit'`
    );

    res.status(200).json({
      status: 'success',
      data: {
        users: result.rows.map(row => ({
          user_id: row.id,
          email: row.email,
          full_name: row.full_name,
          total_profit_transactions: parseInt(row.total_profit_transactions),
          total_profit_earned: parseFloat(row.total_profit_earned),
          first_profit_date: row.first_profit_date,
          last_profit_date: row.last_profit_date,
        })),
        total_users_with_profits: parseInt(countResult.rows[0].total),
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });

  } catch (error) {
    logger.error('Get all users profit stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch profit statistics',
    });
  }
};

// Get profit run history (admin)
export const getProfitRunHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit = 30 } = req.query;

    const result = await profitCalculationService.getProfitRunHistory(parseInt(limit as string));

    res.status(200).json({
      status: 'success',
      data: {
        profit_runs: result,
        count: result.length,
      },
    });

  } catch (error) {
    logger.error('Get profit run history error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch profit run history',
    });
  }
};

// Get overall profit statistics (admin)
export const getProfitStatistics = async (_req: Request, res: Response): Promise<void> => {
  try {
    // Total profit distributed
    const totalProfitResult = await pool.query(
      `SELECT 
        COALESCE(SUM(amount), 0) as total_profit_distributed,
        COUNT(*) as total_transactions,
        COUNT(DISTINCT user_id) as total_users_received_profit
      FROM ledger_entries
      WHERE transaction_type = 'profit'`
    );

    // Profit distributed today
    const todayProfitResult = await pool.query(
      `SELECT 
        COALESCE(SUM(amount), 0) as today_profit,
        COUNT(*) as today_transactions
      FROM ledger_entries
      WHERE transaction_type = 'profit'
        AND DATE(created_at) = CURRENT_DATE`
    );

    // Profit distributed this month
    const monthProfitResult = await pool.query(
      `SELECT 
        COALESCE(SUM(amount), 0) as month_profit,
        COUNT(*) as month_transactions
      FROM ledger_entries
      WHERE transaction_type = 'profit'
        AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)`
    );

    // Get active investments count
    const activeInvestmentsResult = await pool.query(
      `SELECT 
        COUNT(*) as active_investments,
        SUM(amount) as total_invested,
        AVG(profit_rate) as avg_profit_rate
      FROM investments
      WHERE status = 'active'`
    );

    const totalProfit = totalProfitResult.rows[0];
    const todayProfit = todayProfitResult.rows[0];
    const monthProfit = monthProfitResult.rows[0];
    const activeInvestments = activeInvestmentsResult.rows[0];

    res.status(200).json({
      status: 'success',
      data: {
        total_profit_distributed: parseFloat(totalProfit.total_profit_distributed),
        total_profit_transactions: parseInt(totalProfit.total_transactions),
        total_users_received_profit: parseInt(totalProfit.total_users_received_profit),
        today_profit: parseFloat(todayProfit.today_profit),
        today_profit_transactions: parseInt(todayProfit.today_transactions),
        this_month_profit: parseFloat(monthProfit.month_profit),
        this_month_profit_transactions: parseInt(monthProfit.month_transactions),
        active_investments_count: parseInt(activeInvestments.active_investments),
        total_active_investment_amount: parseFloat(activeInvestments.total_invested || 0),
        average_profit_rate: parseFloat(activeInvestments.avg_profit_rate || 0),
      },
    });

  } catch (error) {
    logger.error('Get profit statistics error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch profit statistics',
    });
  }
};

// Get specific user's profit details (admin)
export const getUserProfitDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    // Get user info
    const userResult = await pool.query(
      `SELECT id, email, full_name
       FROM users
       WHERE id = $1 AND is_admin = false`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
      return;
    }

    // Get profit summary
    const profitSummaryResult = await pool.query(
      `SELECT 
        COALESCE(SUM(amount), 0) as total_profit,
        COUNT(*) as transaction_count,
        MIN(created_at) as first_profit,
        MAX(created_at) as last_profit,
        AVG(amount) as avg_profit_per_transaction
      FROM ledger_entries
      WHERE user_id = $1 AND transaction_type = 'profit'`,
      [userId]
    );

    // Get profit history
    const profitHistoryResult = await profitCalculationService.getUserProfitHistory(
      parseInt(userId),
      100
    );

    res.status(200).json({
      status: 'success',
      data: {
        user: userResult.rows[0],
        summary: {
          total_profit: parseFloat(profitSummaryResult.rows[0].total_profit),
          transaction_count: parseInt(profitSummaryResult.rows[0].transaction_count),
          first_profit: profitSummaryResult.rows[0].first_profit,
          last_profit: profitSummaryResult.rows[0].last_profit,
          avg_profit_per_transaction: parseFloat(profitSummaryResult.rows[0].avg_profit_per_transaction || 0),
        },
        history: profitHistoryResult,
      },
    });

  } catch (error) {
    logger.error('Get user profit details error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch user profit details',
    });
  }
};
