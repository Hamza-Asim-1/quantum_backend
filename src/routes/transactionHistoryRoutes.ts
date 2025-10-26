// src/routes/transactionHistoryRoutes.ts

import { Router } from 'express';
import {
  getTransactionHistory,
  getTransactionById,
  exportTransactions,
} from '../controllers/transactionHistoryController';
import { authMiddleware, adminAuthMiddleware } from '../middleware/auth';

const router = Router();

// All routes require admin authentication
router.use(authMiddleware);
router.use(adminAuthMiddleware);

/**
 * @route   GET /api/v1/transactions
 * @desc    Get all transactions with filters
 * @access  Admin
 */
router.get('/', getTransactionHistory);

/**
 * @route   GET /api/v1/transactions/export
 * @desc    Export transactions to CSV/JSON
 * @access  Admin
 */
router.get('/export', exportTransactions);

/**
 * @route   GET /api/v1/transactions/:id
 * @desc    Get single transaction details
 * @access  Admin
 */
router.get('/:id', getTransactionById);

export default router;