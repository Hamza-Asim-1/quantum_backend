import { Router } from 'express';
import { register, login, getProfile, refreshToken, forgotPassword, verifyOtp, resetPassword } from '../controllers/authController';
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
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password', resetPassword);

// Protected routes
router.get('/profile', authMiddleware, getProfile);

export default router;