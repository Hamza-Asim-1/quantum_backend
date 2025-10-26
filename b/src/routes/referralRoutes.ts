import { Router } from 'express';
import {
  getReferralInfo,
  getReferralCommissions,
  validateReferralCode,
  getReferralLeaderboard
} from '../controllers/referralController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Public routes
router.post('/validate-code', validateReferralCode);
router.get('/leaderboard', getReferralLeaderboard);

// Protected routes
router.use(authMiddleware);

// User referral management
router.get('/info', getReferralInfo);
router.get('/commissions', getReferralCommissions);

export default router;
