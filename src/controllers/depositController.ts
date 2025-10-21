// backend/src/controllers/depositController.ts
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

// User: Submit deposit request
export const submitDeposit = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const client = await pool.connect();
  
  try {
    const userId = req.user?.id;
    const { amount, chain, tx_hash, wallet_address } = req.body;

    // 🔍 LOG 1: Function called
    console.log('\n========================================');
    console.log('🚀 submitDeposit FUNCTION CALLED');
    console.log('========================================');
    console.log('📥 Request Body:', {
      amount,
      chain,
      tx_hash,
      wallet_address: wallet_address || 'not provided'
    });
    console.log('👤 User ID:', userId);
    console.log('📧 User Email:', req.user?.email);

    // Validation
    if (!amount || !chain || !tx_hash) {
      console.log('❌ VALIDATION FAILED: Missing required fields');
      res.status(400).json({
        status: 'error',
        message: 'amount, chain, and tx_hash are required',
      });
      return;
    }

    if (!['BEP20', 'TRC20'].includes(chain)) {
      console.log('❌ VALIDATION FAILED: Invalid chain:', chain);
      res.status(400).json({
        status: 'error',
        message: 'chain must be BEP20 or TRC20',
      });
      return;
    }

    if (amount <= 0) {
      console.log('❌ VALIDATION FAILED: Invalid amount:', amount);
      res.status(400).json({
        status: 'error',
        message: 'Amount must be greater than 0',
      });
      return;
    }

    if (tx_hash.length < 10) {
      console.log('❌ VALIDATION FAILED: Invalid tx_hash length:', tx_hash.length);
      res.status(400).json({
        status: 'error',
        message: 'Invalid transaction hash format',
      });
      return;
    }


    console.log('✅ All validations passed');

    // 🔍 LOG 2: Starting transaction
    console.log('\n📊 Starting database transaction...');
    await client.query('BEGIN');
    console.log('✅ Transaction started (BEGIN executed)');

    // 🔍 LOG 3: Checking for duplicates
    console.log('\n🔍 Checking for duplicate tx_hash...');
    const duplicateCheck = await client.query(
      'SELECT id FROM deposits WHERE tx_hash = $1',
      [tx_hash]
    );
    console.log('📊 Duplicate check result:', {
      found: duplicateCheck.rows.length > 0,
      count: duplicateCheck.rows.length,
      existingIds: duplicateCheck.rows.map(r => r.id)
    });

    if (duplicateCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      console.log('❌ DUPLICATE FOUND - Transaction rolled back');
      console.log('========================================\n');
      res.status(400).json({
        status: 'error',
        message: 'This transaction hash has already been submitted',
      });
      return;
    }

    console.log('✅ No duplicates found - proceeding with insert');

    // 🔍 LOG 4: About to INSERT
    console.log('\n💾 Executing INSERT query...');
    console.log('📝 Insert parameters:', {
      userId,
      amount,
      chain,
      tx_hash,
      from_address: wallet_address || null,
      status: 'pending'
    });

    const depositResult = await client.query(
      `INSERT INTO deposits (
        user_id, amount, chain, tx_hash, from_address, 
        status, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, amount, chain, tx_hash, status, created_at`,
      [userId, amount, chain, tx_hash, wallet_address || null, 'pending']
    );

    // 🔍 LOG 5: INSERT result
    console.log('✅ INSERT executed successfully!');
    console.log('📊 depositResult object:', {
      command: depositResult.command,
      rowCount: depositResult.rowCount,
      rows: depositResult.rows
    });
    console.log('🎯 Created deposit record:', depositResult.rows[0]);

    // 🔍 LOG 6: Committing transaction
    console.log('\n💾 Committing transaction...');
    await client.query('COMMIT');
    console.log('✅ Transaction committed (COMMIT executed)');

    // 🔍 LOG 7: Sending response
    console.log('\n📤 Sending success response to frontend...');
    const responseData = {
      status: 'success',
      message: 'Deposit request submitted successfully. Your deposit will be confirmed automatically within 5-10 minutes after blockchain verification.',
      data: depositResult.rows[0],
    };
    console.log('📦 Response data:', responseData);
    console.log('========================================\n');

    res.status(201).json(responseData);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌❌❌ ERROR IN submitDeposit ❌❌❌');
    console.error('Error details:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.log('🔄 Transaction rolled back');
    console.log('========================================\n');
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to submit deposit request',
    });
  } finally {
    client.release();
    console.log('🔌 Database connection released\n');
  }
};

// User: Get deposit history
export const getDepositHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { limit = 20, offset = 0, status } = req.query;

    let query = `
      SELECT 
        id, amount, chain, tx_hash, from_address, to_address,
        status, admin_notes, created_at, verified_at, updated_at
      FROM deposits
      WHERE user_id = $1
    `;

    const params: any[] = [userId];

    if (status && status !== 'all') {
      query += ` AND status = $2`;
      params.push(status);
      query += ` ORDER BY created_at DESC LIMIT $3 OFFSET $4`;
      params.push(limit, offset);
    } else {
      query += ` ORDER BY created_at DESC LIMIT $2 OFFSET $3`;
      params.push(limit, offset);
    }

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM deposits WHERE user_id = $1';
    const countParams: any[] = [userId];

    if (status && status !== 'all') {
      countQuery += ' AND status = $2';
      countParams.push(status);
    }

    const countResult = await pool.query(countQuery, countParams);

    res.status(200).json({
      status: 'success',
      data: {
        deposits: result.rows,
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });

  } catch (error) {
    console.error('Get deposit history error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch deposit history',
    });
  }
};

// User: Get single deposit by ID
export const getDepositById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        id, amount, chain, tx_hash, from_address, to_address,
        status, admin_notes, created_at, verified_at, updated_at
      FROM deposits
      WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        status: 'error',
        message: 'Deposit not found',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: result.rows[0],
    });

  } catch (error) {
    console.error('Get deposit by ID error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch deposit details',
    });
  }
};

// User: Get account balance (reuse from original)
export const getBalance = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    const result = await pool.query(
      `SELECT 
        id,
        balance,
        available_balance,
        invested_balance,
        updated_at
      FROM accounts
      WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      res.status(200).json({
        status: 'success',
        data: {
          accounts: [
            {
              currency: 'USDT',
              balance: 0,
              available_balance: 0,
              invested_balance: 0,
            },
          ],
        },
      });
      return;
    }

    const account = result.rows[0];
    res.status(200).json({
      status: 'success',
      data: {
        accounts: [
          {
            currency: 'USDT',
            balance: parseFloat(account.balance),
            available_balance: parseFloat(account.available_balance),
            invested_balance: parseFloat(account.invested_balance),
            updated_at: account.updated_at,
          },
        ],
      },
    });

  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch balance',
    });
  }
};