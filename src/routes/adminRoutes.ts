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
import {
  getAllUsersProfitStats,
  getProfitRunHistory,
  getProfitStatistics,
  getUserProfitDetails,
} from '../controllers/profitController';
import { adminAuthMiddleware } from '../middleware/auth';

const router = Router();

// Public routes
router.post('/login', adminLogin);

// Temporary endpoint to fix admin password (remove after use)
router.post('/fix-admin-password', async (_req, res): Promise<void> => {
  try {
    const bcrypt = require('bcrypt');
    const pool = require('../config/database').default;
    
    const email = 'admin@platform.com';
    const password = 'Admin123!';
    
    console.log('🔧 Fixing admin password...');
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Update the admin user
    const result = await pool.query(
      `UPDATE users 
       SET password_hash = $1, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE email = $2 AND is_admin = true`,
      [hashedPassword, email]
    );
    
    if (result.rowCount === 0) {
      res.status(404).json({
        status: 'error',
        message: 'Admin user not found'
      });
      return;
    }
    
    res.json({
      status: 'success',
      message: 'Admin password fixed successfully!',
      credentials: {
        email: email,
        password: password
      }
    });
    
  } catch (error) {
    console.error('Error fixing admin password:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fix admin password',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

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

// Profit Management
router.get('/profits/stats', getProfitStatistics);
router.get('/profits/runs', getProfitRunHistory);
router.get('/profits/users', getAllUsersProfitStats);
router.get('/profits/users/:userId', getUserProfitDetails);

export default router;