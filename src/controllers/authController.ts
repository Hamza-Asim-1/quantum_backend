// src/controllers/authController.ts

import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/database';

/**
 * User Login
 */
// Add this function to your authController.ts

/**
 * Refresh Access Token
 */
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        status: 'error',
        message: 'Refresh token is required',
      });
      return;
    }

    // Verify the refresh token
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_SECRET || 'your-secret-key'
    ) as any;

    // Get user from database
    let user;
    if (decoded.type === 'admin') {
      // Check admin_users table first
      const adminResult = await pool.query(
        'SELECT * FROM admin_users WHERE id = $1',
        [decoded.id]
      );
      
      if (adminResult.rows.length === 0) {
        // Check users table for admin flag
        const userResult = await pool.query(
          'SELECT * FROM users WHERE id = $1 AND is_admin = true',
          [decoded.id]
        );
        
        if (userResult.rows.length === 0) {
          res.status(401).json({
            status: 'error',
            message: 'Invalid refresh token',
          });
          return;
        }
        user = userResult.rows[0];
      } else {
        user = adminResult.rows[0];
      }
    } else {
      // Regular user
      const userResult = await pool.query(
        'SELECT * FROM users WHERE id = $1',
        [decoded.id]
      );

      if (userResult.rows.length === 0) {
        res.status(401).json({
          status: 'error',
          message: 'Invalid refresh token',
        });
        return;
      }
      user = userResult.rows[0];
    }

    // Generate new tokens
    const newAccessToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        type: decoded.type,
        role: decoded.type === 'admin' ? 'admin' : 'user',
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    const newRefreshToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        type: decoded.type,
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: decoded.type === 'admin' ? 'admin' : 'user',
          kyc_status: user.kyc_status,
        },
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      status: 'error',
      message: 'Invalid refresh token',
    });
  }
};
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        status: 'error',
        message: 'Email and password are required',
      });
      return;
    }

    // Check in users table first
    const userResult = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);

      if (!isPasswordValid) {
        res.status(401).json({
          status: 'error',
          message: 'Invalid credentials',
        });
        return;
      }

      // Check if user is admin
      if (user.is_admin) {
        // Generate ADMIN token
        const accessToken = jwt.sign(
          {
            id: user.id,
            email: user.email,
            type: 'admin', // IMPORTANT: Set type to admin
            role: 'admin',
          },
          process.env.JWT_SECRET || 'your-secret-key',
          { expiresIn: '24h' }
        );

        const refreshToken = jwt.sign(
          {
            id: user.id,
            email: user.email,
            type: 'admin',
          },
          process.env.JWT_SECRET || 'your-secret-key',
          { expiresIn: '7d' }
        );

        res.status(200).json({
          status: 'success',
          data: {
            user: {
              id: user.id,
              email: user.email,
              full_name: user.full_name,
              role: 'admin',
              kyc_status: user.kyc_status,
            },
            accessToken,
            refreshToken,
          },
        });
        return;
      }

      // Regular user token
      const accessToken = jwt.sign(
        {
          id: user.id,
          email: user.email,
          type: 'user', // Regular user
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      const refreshToken = jwt.sign(
        {
          id: user.id,
          email: user.email,
          type: 'user',
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );

      res.status(200).json({
        status: 'success',
        data: {
          user: {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            role: 'user',
            kyc_status: user.kyc_status,
          },
          accessToken,
          refreshToken,
        },
      });
      return;
    }

    // Check in admin_users table (if you have a separate table)
    const adminResult = await pool.query(
      'SELECT * FROM admin_users WHERE email = $1',
      [email]
    );

    if (adminResult.rows.length > 0) {
      const admin = adminResult.rows[0];

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, admin.password_hash);

      if (!isPasswordValid) {
        res.status(401).json({
          status: 'error',
          message: 'Invalid credentials',
        });
        return;
      }

      // Generate admin token
      const accessToken = jwt.sign(
        {
          id: admin.id,
          email: admin.email,
          type: 'admin', // IMPORTANT: Set type to admin
          role: admin.role || 'admin',
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
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );

      res.status(200).json({
        status: 'success',
        data: {
          user: {
            id: admin.id,
            email: admin.email,
            full_name: admin.full_name,
            role: admin.role || 'admin',
          },
          accessToken,
          refreshToken,
        },
      });
      return;
    }

    // No user or admin found
    res.status(401).json({
      status: 'error',
      message: 'Invalid credentials',
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Login failed',
    });
  }
};

/**
 * User Registration
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  
  try {
    const { email, password, full_name, phone, referral_code } = req.body;

    if (!email || !password || !full_name) {
      res.status(400).json({
        status: 'error',
        message: 'Email, password, and full name are required',
      });
      return;
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      res.status(409).json({
        status: 'error',
        message: 'User already exists',
      });
      return;
    }

    // Start transaction
    await client.query('BEGIN');

    // Validate referral code if provided
    let referrerId = null;
    if (referral_code) {
      const referrerResult = await client.query(
        'SELECT id FROM users WHERE referral_code = $1',
        [referral_code]
      );

      if (referrerResult.rows.length === 0) {
        await client.query('ROLLBACK');
        res.status(400).json({
          status: 'error',
          message: 'Invalid referral code',
        });
        return;
      }

      referrerId = referrerResult.rows[0].id;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Generate unique referral code
    const referralCode = `${Math.random().toString(36).substr(2, 8).toUpperCase()}${Date.now().toString().slice(-4)}`;

    // Insert user with referral relationship
    const result = await client.query(
      `INSERT INTO users (email, password_hash, full_name, phone, referral_code, referred_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, full_name, kyc_status, referral_code`,
      [email, passwordHash, full_name, phone, referralCode, referrerId]
    );

    const user = result.rows[0];

    // Create account for new user
    await client.query(
      `INSERT INTO accounts (user_id, balance, available_balance, invested_balance)
       VALUES ($1, 0, 0, 0)`,
      [user.id]
    );

    // Commit transaction
    await client.query('COMMIT');

    // Generate token
    const accessToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        type: 'user',
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    const refreshToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        type: 'user',
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: 'user',
          kyc_status: user.kyc_status,
          referral_code: user.referral_code,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Registration error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Registration failed',
    });
  } finally {
    client.release();
  }
};

/**
 * Get User Profile
 */
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({
        status: 'error',
        message: 'User not authenticated',
      });
      return;
    }

    const result = await pool.query(
      `SELECT 
        u.id, u.email, u.full_name, u.phone, u.kyc_status, u.is_admin, 
        u.referral_code, u.total_referrals, u.total_commission_earned,
        u.created_at,
        referrer.full_name as referrer_name, referrer.email as referrer_email
      FROM users u
      LEFT JOIN users referrer ON u.referred_by = referrer.id
      WHERE u.id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
      return;
    }

    const user = result.rows[0];

    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          phone: user.phone,
          kyc_status: user.kyc_status,
          is_admin: user.is_admin,
          referral_code: user.referral_code,
          total_referrals: user.total_referrals || 0,
          total_commission_earned: parseFloat(user.total_commission_earned || 0),
          referrer: user.referrer_name ? {
            name: user.referrer_name,
            email: user.referrer_email
          } : null,
          created_at: user.created_at,
        },
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch profile',
    });
  }
};