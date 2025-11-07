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

// Investment levels - matches UI
const INVESTMENT_LEVELS = [
  { min: 100, max: 1000, rate: 0.5, level: 1, name: "Starter Plan" },
  { min: 1001, max: 3000, rate: 0.7, level: 2, name: "Growth Plan" },
  { min: 3001, max: 6000, rate: 0.8, level: 3, name: "Professional Plan" },
  { min: 6001, max: 10000, rate: 0.9, level: 4, name: "Premium Plan" },
  { min: 10001, max: 999999999, rate: 1.0, level: 5, name: "Elite Plan" }
];

function determineInvestmentLevel(amount: number) {
  return INVESTMENT_LEVELS.find(level => amount >= level.min && amount <= level.max) || null;
}

// Create new investment (no chain parameter)
export const createInvestment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const client = await pool.connect();
  
  try {
    const userId = req.user?.id;
    const { amount } = req.body;

    // Validation
    if (!amount) {
      res.status(400).json({
        status: 'error',
        message: 'Amount is required',
      });
      return;
    }

    if (amount < 100) {
      res.status(400).json({
        status: 'error',
        message: 'Minimum investment amount is 100 USDT',
      });
      return;
    }

    // Check KYC status
    const kycCheck = await client.query(
      'SELECT status FROM kyc_submissions WHERE user_id = $1 ORDER BY submitted_at DESC LIMIT 1',
      [userId]
    );

    if (kycCheck.rows.length === 0 || kycCheck.rows[0].status !== 'approved') {
      res.status(403).json({
        status: 'error',
        message: 'KYC verification required. Please complete your KYC before creating investments.',
        code: 'KYC_REQUIRED'
      });
      return;
    }

    // Check if user already has an active investment
    const existingInvestment = await client.query(
      'SELECT id FROM investments WHERE user_id = $1 AND status = $2',
      [userId, 'active']
    );

    if (existingInvestment.rows.length > 0) {
      res.status(400).json({
        status: 'error',
        message: 'You already have an active investment. Only one investment allowed at a time.',
      });
      return;
    }

    await client.query('BEGIN');

    // FIXED: Remove total_balance reference
    const accountResult = await client.query(
      `SELECT id, available_balance, invested_balance, balance
       FROM accounts WHERE user_id = $1
       FOR UPDATE`,
      [userId]
    );

    if (accountResult.rows.length === 0 || parseFloat(accountResult.rows[0].available_balance) < amount) {
      await client.query('ROLLBACK');
      res.status(400).json({
        status: 'error',
        message: 'Insufficient available balance',
        data: {
          available: accountResult.rows[0]?.available_balance || 0,
          requested: amount,
        },
      });
      return;
    }

    const accountId = accountResult.rows[0].id;

    // Determine investment level and profit rate
    const levelInfo = determineInvestmentLevel(amount);
    if (!levelInfo) {
      await client.query('ROLLBACK');
      res.status(400).json({
        status: 'error',
        message: 'Invalid investment amount for available plans',
      });
      return;
    }

    // FIXED: Remove start_date since it doesn't exist
const investmentResult = await client.query(
  `INSERT INTO investments (
    user_id, amount, level, profit_rate, 
    status, frequency, next_profit_date, created_at, updated_at
  )
   VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE + INTERVAL '1 day', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
   RETURNING id, amount, level, profit_rate, status, created_at`,
  [userId, amount, levelInfo.level, levelInfo.rate, 'active', 'daily']
);

    const investment = investmentResult.rows[0];

    // Update account balance
    await client.query(
      `UPDATE accounts 
       SET available_balance = available_balance - $1,
           invested_balance = COALESCE(invested_balance, 0) + $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [amount, accountId]
    );

    // Create ledger entry for investment redistribution (amount 0; total balance unchanged)
    await client.query(
      `SELECT create_ledger_entry($1, $2, $3, $4, $5, $6)`,
      [
        userId,
        'investment',
        0, // redistribution only
        'investment',
        investment.id,
        `Investment created - Level ${levelInfo.level} (${levelInfo.rate}% daily)`
      ]
    );

    await client.query('COMMIT');

    res.status(201).json({
      status: 'success',
      message: 'Investment created successfully. Profits will start from tomorrow.',
      data: {
        ...investment,
        level_name: levelInfo.name,
        daily_profit: (amount * levelInfo.rate / 100).toFixed(2),
      },
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create investment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create investment',
    });
  } finally {
    client.release();
  }
};

// FIXED: Get user's current investment
export const getUserInvestment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    const result = await pool.query(
      `SELECT 
        i.id,
        i.amount,
        i.level,
        i.profit_rate,
        i.status,
        i.created_at,
        i.updated_at,
        COALESCE(i.total_profit_earned, 0) as total_profit_earned
      FROM investments i
      WHERE i.user_id = $1 AND i.status = 'active'
      LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        status: 'error',
        message: 'No active investment found',
      });
      return;
    }

    const investment = result.rows[0];
    const levelInfo = INVESTMENT_LEVELS.find(l => l.level === investment.level);

    // FIXED: Use created_at instead of start_date
    const startDate = new Date(investment.created_at);
    const today = new Date();
    const daysDiff = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    res.status(200).json({
      status: 'success',
      data: {
        ...investment,
        level_name: levelInfo?.name || 'Unknown',
        daily_profit: (investment.amount * investment.profit_rate / 100).toFixed(2),
        days_active: daysDiff,
        next_profit: daysDiff >= 0 ? 'Tomorrow' : 'Starting tomorrow',
      },
    });

  } catch (error) {
    console.error('Get user investment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch investment',
    });
  }
};

// Delete/Cancel investment and refund amount
export const deleteInvestment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const client = await pool.connect();
  
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    await client.query('BEGIN');

    const investmentResult = await client.query(
      'SELECT id, user_id, amount, status, created_at FROM investments WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (investmentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({
        status: 'error',
        message: 'Investment not found',
      });
      return;
    }

    const investment = investmentResult.rows[0];
    // CHANGE 1: Ensure amount is a number
    const investmentAmount = parseFloat(investment.amount);

    if (investment.status !== 'active') {
      await client.query('ROLLBACK');
      res.status(400).json({
        status: 'error',
        message: `Cannot delete investment with status: ${investment.status}`,
      });
      return;
    }

    // Update investment status to cancelled
    await client.query(
      'UPDATE investments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['cancelled', id]
    );

    // CHANGE 2: Get account balance BEFORE updating it
    const accountResult = await client.query(
      'SELECT id, available_balance, invested_balance, balance FROM accounts WHERE user_id = $1 FOR UPDATE',
      [userId]
    );

    if (accountResult.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(500).json({
        status: 'error',
        message: 'User account not found',
      });
      return;
    }

    const account = accountResult.rows[0];
    const accountId = account.id;

    // NOW update the account balances (using investmentAmount which is already a number)
    await client.query(
      `UPDATE accounts 
       SET available_balance = available_balance + $1,
           invested_balance = GREATEST(invested_balance - $1, 0),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [investmentAmount, accountId]
    );

    // CHANGE 4: Calculate balance_after as a number, not string concatenation

    // Create ledger entry via helper with amount 0 (redistribution)
    await client.query(
      `SELECT create_ledger_entry($1, $2, $3, $4, $5, $6)`,
      [
        userId,
        'refund',
        0,
        'investment',
        id,
        `Investment cancelled - Amount unlocked: ${investmentAmount} USDT`
      ]
    );

    await client.query('COMMIT');

    res.status(200).json({
      status: 'success',
      message: 'Investment deleted successfully. Amount has been refunded to your available balance.',
      data: {
        refunded_amount: investmentAmount,  // Return the numeric value
      },
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete investment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete investment',
    });
  } finally {
    client.release();
  }
};

// Get investment levels info (unchanged)
export const getInvestmentLevels = async (_req: Request, res: Response): Promise<void> => {
  try {
    res.status(200).json({
      status: 'success',
      data: {
        levels: INVESTMENT_LEVELS.map(level => ({
          level: level.level,
          name: level.name,
          min_amount: level.min,
          max_amount: level.max === Infinity ? null : level.max,
          daily_rate: level.rate,
          range: level.max === Infinity ? `${level.min.toLocaleString()}+` : `${level.min.toLocaleString()} - ${level.max.toLocaleString()}`,
          example_amount: level.max === Infinity ? level.min * 1.5 : Math.floor((level.min + level.max) / 2),
          example_daily_profit: Math.floor((level.max === Infinity ? level.min * 1.5 : (level.min + level.max) / 2) * level.rate / 100 * 100) / 100
        }))
      },
    });
  } catch (error) {
    console.error('Get investment levels error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch investment levels',
    });
  }
};