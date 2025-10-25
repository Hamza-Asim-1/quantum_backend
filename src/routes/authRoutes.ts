import { Router } from 'express';
import { register, login, getProfile, refreshToken } from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';
import { 
  validateReferralCodeFormat, 
  validateReferralCodeExists, 
  preventSelfReferral 
} from '../middleware/referralValidation';

const router = Router();

router.post('/refresh', refreshToken);
// Public routes
router.post('/register', 
  validateReferralCodeFormat, 
  validateReferralCodeExists, 
  preventSelfReferral, 
  register
);
router.post('/login', login);

// Protected routes
router.get('/profile', authMiddleware, getProfile);

export default router;