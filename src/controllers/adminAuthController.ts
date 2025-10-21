import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import pool from '../config/database';
import { loginSchema } from '../utils/validation';
import { generateTokens } from '../utils/jwt';
import { User } from '../types';

// Admin Login
export const adminLogin = async (
  req: Request,
  res: Response
): Promise<void> => {
  const client = await pool.connect();

  try {
    // Validate input
    const validatedData = loginSchema.parse(req.body);

    // Find admin user
    const result = await client.query(
      'SELECT * FROM users WHERE email = $1 AND is_admin = TRUE',
      [validatedData.email]
    );

    if (result.rows.length === 0) {
      res.status(401).json({
        status: 'error',
        message: 'Invalid admin credentials',
      });
      return;
    }

    const admin: User = result.rows[0];

    // Check if account is active
    if (!admin.is_active) {
      res.status(403).json({
        status: 'error',
        message: 'Admin account is deactivated',
      });
      return;
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      validatedData.password,
      admin.password_hash
    );

    if (!isPasswordValid) {
      res.status(401).json({
        status: 'error',
        message: 'Invalid admin credentials',
      });
      return;
    }

    // Generate tokens
    const tokens = generateTokens({
      id: admin.id,
      userId: admin.id,
      email: admin.email,
      isAdmin: true,
      type: 'admin',
      role: 'admin',
    });

    // Log admin login
    await client.query(
      `INSERT INTO admin_actions (admin_id, action_type, description, ip_address)
       VALUES ($1, $2, $3, $4)`,
      [
        admin.id,
        'other',
        'Admin login',
        req.ip || req.socket.remoteAddress,
      ]
    );

    res.status(200).json({
      status: 'success',
      message: 'Admin login successful',
      data: {
        admin: {
          id: admin.id,
          email: admin.email,
          full_name: admin.full_name,
          is_admin: true,
        },
        ...tokens,
      },
    });
  } catch (error: any) {
    console.error('Admin login error:', error);

    if (error.name === 'ZodError') {
      res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: error.errors,
      });
      return;
    }

    res.status(500).json({
      status: 'error',
      message: 'Admin login failed',
      error: error.message,
    });
  } finally {
    client.release();
  }
};