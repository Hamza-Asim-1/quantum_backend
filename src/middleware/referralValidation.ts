import { Request, Response, NextFunction } from 'express';
import pool from '../config/database';

/**
 * Validate referral code format
 */
export const validateReferralCodeFormat = (req: Request, res: Response, next: NextFunction): void => {
  const { referral_code } = req.body;

  if (referral_code && typeof referral_code !== 'string') {
    res.status(400).json({
      status: 'error',
      message: 'Referral code must be a string',
    });
    return;
  }

  if (referral_code && (referral_code.length < 8 || referral_code.length > 20)) {
    res.status(400).json({
      status: 'error',
      message: 'Referral code must be between 8 and 20 characters',
    });
    return;
  }

  if (referral_code && !/^[A-Z0-9]+$/.test(referral_code)) {
    res.status(400).json({
      status: 'error',
      message: 'Referral code must contain only uppercase letters and numbers',
    });
    return;
  }

  next();
};

/**
 * Check if referral code exists and is valid
 */
export const validateReferralCodeExists = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { referral_code } = req.body;

  if (!referral_code) {
    return next();
  }

  try {
    const result = await pool.query(
      'SELECT id FROM users WHERE referral_code = $1',
      [referral_code]
    );

    if (result.rows.length === 0) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid referral code',
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Referral code validation error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to validate referral code',
    });
  }
};

/**
 * Prevent self-referral
 */
export const preventSelfReferral = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { referral_code } = req.body;
  const userId = (req as any).user?.id;

  if (!referral_code || !userId) {
    return next();
  }

  try {
    const result = await pool.query(
      'SELECT referral_code FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length > 0 && result.rows[0].referral_code === referral_code) {
      res.status(400).json({
        status: 'error',
        message: 'Cannot use your own referral code',
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Self-referral prevention error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to validate referral code',
    });
  }
};
