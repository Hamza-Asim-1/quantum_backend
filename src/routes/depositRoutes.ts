import { Router } from 'express';
import {
  //recordDeposit,
  getDepositHistory,
  getBalance,
  // getDepositById,
  submitDeposit,
  //getAllDeposits,
  //getLedger,
} from '../controllers/depositController';
import {
  getAllDeposits,
  getDepositById as adminGetDepositById,
  confirmDeposit,
  rejectDeposit,
  getDepositStats,
} from '../controllers/adminDepositController';
import { authMiddleware, adminAuthMiddleware } from '../middleware/auth';

const router = Router();

// User routes (protected)
//router.get('/history', authMiddleware, getDepositHistory);

//router.get('/ledger', authMiddleware, getLedger);
router.post('/submit',  authMiddleware,submitDeposit);

// User views their deposit history
router.get('/history', authMiddleware ,getDepositHistory);
router.get('/balance', authMiddleware ,getBalance);
// User views single deposit
//router.get('/:id',  getDepositById);

// User gets their balance

// Admin routes (protected)
//router.post('/record', adminAuthMiddleware, recordDeposit);
//router.get('/all', adminAuthMiddleware, getAllDeposits);
router.get('/admin/all', adminAuthMiddleware, getAllDeposits);

// Admin gets deposit statistics
router.get('/admin/stats', adminAuthMiddleware, getDepositStats);

// Admin views single deposit detail
router.get('/admin/:id', adminAuthMiddleware, adminGetDepositById);

// Admin manually confirms deposit
router.patch('/admin/:id/confirm', adminAuthMiddleware, confirmDeposit);

// Admin rejects deposit
router.patch('/admin/:id/reject', adminAuthMiddleware, rejectDeposit);


export default router;
