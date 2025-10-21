// src/routes/investmentRoutes.ts

import { Router } from 'express';
import { 
  createInvestment,
  getUserInvestment,
  deleteInvestment, // Changed from cancelInvestment to match your controller
  getInvestmentLevels
} from '../controllers/investmentController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// All investment routes require authentication
router.use(authMiddleware);

// Get investment levels (public info for authenticated users)
router.get('/levels', getInvestmentLevels);

// User investment management
router.post('/create', createInvestment);
router.get('/current', getUserInvestment);

// Changed from /history to match your controller function name
// If you have getInvestmentHistory function, uncomment this:
// router.get('/history', getInvestmentHistory);

// Fixed: Changed from /:id/cancel to /:id to match frontend API calls
// and changed function name to match your controller
router.delete('/:id', deleteInvestment);

export default router;