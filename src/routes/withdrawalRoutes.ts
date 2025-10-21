import { Router } from 'express';
import {
  requestWithdrawal,
  getWithdrawalHistory,
  cancelWithdrawal,
} from '../controllers/withdrawalController';
import {
  getAllWithdrawals,
  getPendingWithdrawals,
  getWithdrawalById,  // Added new endpoint
  approveWithdrawal,
  rejectWithdrawal,
  getWithdrawalStats,
} from '../controllers/adminWithdrawalController';
import { authMiddleware, adminAuthMiddleware } from '../middleware/auth';

const router = Router();

// User routes (protected)
router.post('/request', authMiddleware, requestWithdrawal);
router.get('/history', authMiddleware, getWithdrawalHistory);
router.patch('/:id/cancel', authMiddleware, cancelWithdrawal);

// Admin routes (protected)
router.get('/admin/all', adminAuthMiddleware, getAllWithdrawals);
router.get('/admin/pending', adminAuthMiddleware, getPendingWithdrawals);
router.get('/admin/stats', adminAuthMiddleware, getWithdrawalStats);
router.get('/admin/:id', adminAuthMiddleware, getWithdrawalById);  // Added new route
router.patch('/admin/:id/approve', adminAuthMiddleware, approveWithdrawal);
router.patch('/admin/:id/reject', adminAuthMiddleware, rejectWithdrawal);

export default router;