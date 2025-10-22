import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import logger from '../utils/logger';

// Generic validation middleware
export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Validate request body, query, and params
      const validationResult = schema.safeParse({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      if (!validationResult.success) {
        const errors = validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        logger.warn('Validation failed', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          url: req.url,
          method: req.method,
          errors
        });

        res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors,
        });
        return;
      }

      // Replace request data with validated data
      req.body = validationResult.data.body || req.body;
      req.query = validationResult.data.query || req.query;
      req.params = validationResult.data.params || req.params;

      next();
    } catch (error) {
      logger.error('Validation middleware error', error);
      res.status(500).json({
        status: 'error',
        message: 'Validation error',
      });
    }
  };
};

// Common validation schemas
export const commonSchemas = {
  // Pagination
  pagination: z.object({
    query: z.object({
      page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
      limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 10),
    }),
  }),

  // User registration
  userRegistration: z.object({
    body: z.object({
      email: z.string().email('Invalid email format'),
      password: z.string().min(8, 'Password must be at least 8 characters'),
      firstName: z.string().min(1, 'First name is required'),
      lastName: z.string().min(1, 'Last name is required'),
    }),
  }),

  // User login
  userLogin: z.object({
    body: z.object({
      email: z.string().email('Invalid email format'),
      password: z.string().min(1, 'Password is required'),
    }),
  }),

  // Password change
  passwordChange: z.object({
    body: z.object({
      currentPassword: z.string().min(1, 'Current password is required'),
      newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    }),
  }),

  // KYC submission
  kycSubmission: z.object({
    body: z.object({
      documentType: z.enum(['passport', 'drivers_license', 'national_id']),
      documentNumber: z.string().min(1, 'Document number is required'),
      firstName: z.string().min(1, 'First name is required'),
      lastName: z.string().min(1, 'Last name is required'),
      dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
      address: z.string().min(1, 'Address is required'),
      city: z.string().min(1, 'City is required'),
      country: z.string().min(2, 'Country code is required'),
      postalCode: z.string().min(1, 'Postal code is required'),
    }),
  }),

  // Deposit
  deposit: z.object({
    body: z.object({
      amount: z.number().positive('Amount must be positive'),
      currency: z.enum(['USD', 'EUR', 'BTC', 'ETH']),
      paymentMethod: z.enum(['bank_transfer', 'crypto', 'card']),
      transactionHash: z.string().optional(),
    }),
  }),

  // Withdrawal
  withdrawal: z.object({
    body: z.object({
      amount: z.number().positive('Amount must be positive'),
      currency: z.enum(['USD', 'EUR', 'BTC', 'ETH']),
      bankAccount: z.string().min(1, 'Bank account is required'),
      routingNumber: z.string().optional(),
      swiftCode: z.string().optional(),
    }),
  }),

  // Investment
  investment: z.object({
    body: z.object({
      planId: z.number().int().positive('Invalid plan ID'),
      amount: z.number().positive('Amount must be positive'),
      duration: z.number().int().positive('Duration must be positive'),
    }),
  }),

  // Admin user creation
  adminUserCreation: z.object({
    body: z.object({
      email: z.string().email('Invalid email format'),
      password: z.string().min(8, 'Password must be at least 8 characters'),
      firstName: z.string().min(1, 'First name is required'),
      lastName: z.string().min(1, 'Last name is required'),
      role: z.enum(['super_admin', 'admin', 'moderator']),
    }),
  }),

  // ID parameter
  idParam: z.object({
    params: z.object({
      id: z.string().regex(/^\d+$/, 'Invalid ID format'),
    }),
  }),

  // UUID parameter
  uuidParam: z.object({
    params: z.object({
      id: z.string().uuid('Invalid UUID format'),
    }),
  }),
};

// Sanitize input middleware
export const sanitizeInput = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    // Sanitize string inputs
    const sanitizeString = (str: string): string => {
      return str
        .trim()
        .replace(/[<>]/g, '') // Remove potential HTML tags
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+=/gi, ''); // Remove event handlers
    };

    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
      const sanitizeObject = (obj: any): any => {
        if (typeof obj === 'string') {
          return sanitizeString(obj);
        }
        if (Array.isArray(obj)) {
          return obj.map(sanitizeObject);
        }
        if (obj && typeof obj === 'object') {
          const sanitized: any = {};
          for (const key in obj) {
            sanitized[key] = sanitizeObject(obj[key]);
          }
          return sanitized;
        }
        return obj;
      };

      req.body = sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      for (const key in req.query) {
        if (typeof req.query[key] === 'string') {
          req.query[key] = sanitizeString(req.query[key] as string);
        }
      }
    }

    next();
  } catch (error) {
    logger.error('Input sanitization error', error);
    next();
  }
};

// Rate limiting for specific endpoints
export const createEndpointRateLimit = (_windowMs: number, _max: number, _message?: string) => {
  return (_req: Request, _res: Response, next: NextFunction): void => {
    // This would integrate with your rate limiting solution
    // For now, just pass through
    next();
  };
};
