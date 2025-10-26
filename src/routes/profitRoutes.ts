// src/routes/profitRoutes.ts

import { Router } from 'express';
import {
  getUserProfitSummary,
  getUserProfitHistory,
} from '../controllers/profitController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// All profit routes require authentication
router.use(authMiddleware);

// User profit endpoints
router.get('/summary', getUserProfitSummary);
router.get('/history', getUserProfitHistory);

export default router;
