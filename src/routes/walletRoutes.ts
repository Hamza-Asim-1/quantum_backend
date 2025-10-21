// backend/src/routes/walletRoutes.ts
import { Router } from 'express';
import { getPlatformAddresses } from '../controllers/walletController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// User gets platform deposit addresses
router.get('/platform-addresses', authMiddleware, getPlatformAddresses);

export default router;