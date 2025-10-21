// src/routes/accountsRoutes.ts
import { Router } from 'express';
import { getUserBalance, getAccountDetails } from '../controllers/accountsController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);
router.get('/balance', getUserBalance);
router.get('/details', getAccountDetails);

export default router;