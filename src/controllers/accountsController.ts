// src/controllers/accountsController.ts
import { Request, Response } from 'express';
import pool from '../config/database';

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
  };
}

export const getUserBalance = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    const result = await pool.query(
      'SELECT balance, available_balance, invested_balance FROM accounts WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      res.status(200).json({
        status: 'success',
        data: {
          accounts: [{
            currency: 'USDT',
            balance: 0,
            available_balance: 0,
            invested_balance: 0
          }]
        }
      });
      return;
    }

    const account = result.rows[0];
    res.status(200).json({
      status: 'success',
      data: {
        accounts: [{
          currency: 'USDT',
          balance: parseFloat(account.balance),
          available_balance: parseFloat(account.available_balance),
          invested_balance: parseFloat(account.invested_balance)
        }]
      }
    });

  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch balance'
    });
  }
};

export const getAccountDetails = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  // Implementation here if needed
};