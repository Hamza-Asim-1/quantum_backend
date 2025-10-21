import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface JwtPayload {
  id: number;
  email: string;
  type?: string;
  role?: string;
  userId?: number;
  isAdmin?: boolean;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      admin?: JwtPayload;
    }
  }
}

// User authentication middleware
export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        status: 'error',
        message: 'No token provided',
      });
      return;
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key'
    ) as JwtPayload;

    // Attach user to request
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        status: 'error',
        message: 'Invalid token',
      });
      return;
    }

    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        status: 'error',
        message: 'Token expired',
      });
      return;
    }

    res.status(500).json({
      status: 'error',
      message: 'Authentication error',
    });
  }
};

// Admin authentication middleware
export const adminAuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        status: 'error',
        message: 'No token provided',
      });
      return;
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key'
    ) as JwtPayload;

    // Verify it's an admin token
    if (decoded.type !== 'admin') {
      res.status(403).json({
        status: 'error',
        message: 'Admin access required',
      });
      return;
    }

    // Attach admin to request
    req.admin = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        status: 'error',
        message: 'Invalid token',
      });
      return;
    }

    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        status: 'error',
        message: 'Token expired',
      });
      return;
    }

    res.status(500).json({
      status: 'error',
      message: 'Authentication error',
    });
  }
};

// Optional: Role-based middleware
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const admin = req.admin;

    if (!admin || !admin.role) {
      res.status(403).json({
        status: 'error',
        message: 'Access denied',
      });
      return;
    }

    if (!allowedRoles.includes(admin.role)) {
      res.status(403).json({
        status: 'error',
        message: 'Insufficient permissions',
      });
      return;
    }

    next();
  };
};