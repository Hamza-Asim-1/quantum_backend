import { Request, Response } from 'express';
import pool from '../config/database';
import { uploadToR2, validateFileType, validateFileSize } from '../utils/r2Upload';

// Extended Request interface (or update your types/index.ts)
interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    type?: string;
    role?: string;
    userId?: number;
    isAdmin?: boolean;
  };
}

// Submit KYC
export const submitKYC = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const client = await pool.connect();

  try {
    // Fix: Use req.user.id instead of req.user.userId
    const userId = req.user?.id;
    const { document_type, document_number } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    // Validate required fields
    if (!document_type || !document_number) {
      res.status(400).json({
        status: 'error',
        message: 'Document type and number are required',
      });
      return;
    }

    // Validate files
    if (!files.document_front || !files.selfie) {
      res.status(400).json({
        status: 'error',
        message: 'Document front and selfie are required',
      });
      return;
    }

    const documentFront = files.document_front[0];
    const documentBack = files.document_back?.[0];
    const selfie = files.selfie[0];

    // Validate file types and sizes
    const filesToValidate = [documentFront, selfie];
    if (documentBack) filesToValidate.push(documentBack);

    for (const file of filesToValidate) {
      if (!validateFileType(file.mimetype)) {
        res.status(400).json({
          status: 'error',
          message: `Invalid file type: ${file.originalname}. Only JPEG, PNG, WEBP, and PDF allowed.`,
        });
        return;
      }

      if (!validateFileSize(file.size)) {
        res.status(400).json({
          status: 'error',
          message: `File too large: ${file.originalname}. Maximum 5MB allowed.`,
        });
        return;
      }
    }

    // Check if user already has pending or approved KYC
    const existingKYC = await client.query(
      'SELECT id, status FROM kyc_submissions WHERE user_id = $1 AND status IN ($2, $3)',
      [userId, 'pending', 'approved']
    );

    if (existingKYC.rows.length > 0) {
      const status = existingKYC.rows[0].status;
      res.status(400).json({
        status: 'error',
        message: `You already have a ${status} KYC submission`,
      });
      return;
    }

    // Upload files to R2
    console.log('📤 Uploading files to R2...');
    const documentFrontUrl = await uploadToR2(documentFront, 'kyc/documents');
    const selfieUrl = await uploadToR2(selfie, 'kyc/selfies');
    const documentBackUrl = documentBack
      ? await uploadToR2(documentBack, 'kyc/documents')
      : null;

    // Insert KYC submission
    const result = await client.query(
      `INSERT INTO kyc_submissions 
       (user_id, document_type, document_number, document_front_url, document_back_url, selfie_url, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, status, submitted_at`,
      [
        userId,
        document_type,
        document_number,
        documentFrontUrl,
        documentBackUrl,
        selfieUrl,
        'pending',
      ]
    );

    res.status(201).json({
      status: 'success',
      message: 'KYC submitted successfully',
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('KYC submission error:', error);
    res.status(500).json({
      status: 'error',
      message: 'KYC submission failed',
      error: error.message,
    });
  } finally {
    client.release();
  }
};

// Get user's KYC status
export const getKYCStatus = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const client = await pool.connect();

  try {
    // Fix: Use req.user.id instead of req.user.userId
    const userId = req.user?.id;

    const result = await client.query(
      `SELECT id, document_type, status, rejection_reason, submitted_at, reviewed_at
       FROM kyc_submissions 
       WHERE user_id = $1 
       ORDER BY submitted_at DESC 
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        status: 'error',
        message: 'No KYC submission found',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Get KYC status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get KYC status',
      error: error.message,
    });
  } finally {
    client.release();
  }
};