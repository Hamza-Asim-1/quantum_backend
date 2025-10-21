import { Router } from 'express';
import {
  adminLogin,
  getPendingKYC,
  getAllKYC,
  approveKYC,
  rejectKYC,
  getDashboardStats,
  getKYCById
} from '../controllers/adminKYCController';
import {
  getAllUsers,
  getUserById,
  getUserStats,
} from '../controllers/adminUserController';
import {
  getUserLedgerEntries,
  getLedgerEntryById,
} from '../controllers/adminLedgerController';
import { adminAuthMiddleware } from '../middleware/auth';

const router = Router();

// Public routes
router.post('/login', adminLogin);

// Protected admin routes
router.use(adminAuthMiddleware);

// Dashboard
router.get('/dashboard/stats', getDashboardStats);

// KYC Management
router.get('/kyc/all', getAllKYC);
router.get('/kyc/pending', getPendingKYC);
router.get('/kyc/:id', getKYCById);
router.patch('/kyc/:id/approve', approveKYC);
router.patch('/kyc/:id/reject', rejectKYC);

// User Management
router.get('/users', getAllUsers);
router.get('/users/stats', getUserStats);
router.get('/users/:id', getUserById);

// Ledger Management
router.get('/users/:userId/ledger', getUserLedgerEntries);
router.get('/ledger/:id', getLedgerEntryById);

export default router;