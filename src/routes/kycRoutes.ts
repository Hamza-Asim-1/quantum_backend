// src/routes/kycRoutes.ts

import { Router } from 'express';
import multer from 'multer';
import { submitKYC, getKYCStatus } from '../controllers/kycController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(), // Store in memory for direct upload to R2
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow only specific file types
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WEBP, and PDF files are allowed.'));
    }
  },
});

// All KYC routes require authentication
router.use(authMiddleware);

// Submit KYC with file uploads
router.post('/submit', 
  upload.fields([
    { name: 'document_front', maxCount: 1 },
    { name: 'document_back', maxCount: 1 },
    { name: 'selfie', maxCount: 1 }
  ]), 
  submitKYC
);

// Get user's KYC status
router.get('/status', getKYCStatus);

export default router;