import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config/environment';
import logger from '../utils/logger';
import { AppError } from './errorHandler';

interface JwtPayload {
  id: number;
  email: string;
  type?: string;
  role?: string;
  userId?: number;
  isAdmin?: boolean;
  iat?: number;
  exp?: number;
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

// Enhanced user authentication middleware
export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Authentication failed: No token provided', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.url
      });
      res.status(401).json({
        status: 'error',
        message: 'No token provided',
      });
      return;
    }

    const token = authHeader.substring(7);
    
    // Validate token format
    if (!token || token.length < 10) {
      logger.warn('Authentication failed: Invalid token format', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.url
      });
      res.status(401).json({
        status: 'error',
        message: 'Invalid token format',
      });
      return;
    }
    
    const decoded = jwt.verify(
      token,
      config.JWT_SECRET
    ) as JwtPayload;

    // Validate token payload
    if (!decoded.id || !decoded.email) {
      logger.warn('Authentication failed: Invalid token payload', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.url,
        payload: { id: decoded.id, email: decoded.email }
      });
      res.status(401).json({
        status: 'error',
        message: 'Invalid token payload',
      });
      return;
    }

    // Check token expiration
    if (decoded.exp && decoded.exp < Date.now() / 1000) {
      logger.warn('Authentication failed: Token expired', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.url,
        userId: decoded.id
      });
      res.status(401).json({
        status: 'error',
        message: 'Token expired',
      });
      return;
    }

    // Attach user to request
    req.user = decoded;
    
    logger.debug('User authenticated successfully', {
      userId: decoded.id,
      email: decoded.email,
      ip: req.ip
    });
    
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Authentication failed: Invalid token', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.url,
        error: error.message
      });
      res.status(401).json({
        status: 'error',
        message: 'Invalid token',
      });
      return;
    }

    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Authentication failed: Token expired', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.url,
        error: error.message
      });
      res.status(401).json({
        status: 'error',
        message: 'Token expired',
      });
      return;
    }

    logger.error('Authentication error', error, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url
    });

    res.status(500).json({
      status: 'error',
      message: 'Authentication error',
    });
  }
};

// Enhanced admin authentication middleware
export const adminAuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Admin authentication failed: No token provided', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.url
      });
      res.status(401).json({
        status: 'error',
        message: 'No token provided',
      });
      return;
    }

    const token = authHeader.substring(7);
    
    // Validate token format
    if (!token || token.length < 10) {
      logger.warn('Admin authentication failed: Invalid token format', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.url
      });
      res.status(401).json({
        status: 'error',
        message: 'Invalid token format',
      });
      return;
    }
    
    const decoded = jwt.verify(
      token,
      config.JWT_SECRET
    ) as JwtPayload;

    // Verify it's an admin token
    if (decoded.type !== 'admin' && !decoded.isAdmin) {
      logger.warn('Admin authentication failed: Not an admin token', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.url,
        userId: decoded.id,
        tokenType: decoded.type
      });
      res.status(403).json({
        status: 'error',
        message: 'Admin access required',
      });
      return;
    }

    // Validate admin token payload
    if (!decoded.id || !decoded.email) {
      logger.warn('Admin authentication failed: Invalid token payload', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.url,
        payload: { id: decoded.id, email: decoded.email }
      });
      res.status(401).json({
        status: 'error',
        message: 'Invalid token payload',
      });
      return;
    }

    // Attach admin to request
    req.admin = decoded;
    
    logger.debug('Admin authenticated successfully', {
      adminId: decoded.id,
      email: decoded.email,
      role: decoded.role,
      ip: req.ip
    });
    
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Admin authentication failed: Invalid token', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.url,
        error: error.message
      });
      res.status(401).json({
        status: 'error',
        message: 'Invalid token',
      });
      return;
    }

    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Admin authentication failed: Token expired', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.url,
        error: error.message
      });
      res.status(401).json({
        status: 'error',
        message: 'Token expired',
      });
      return;
    }

    logger.error('Admin authentication error', error, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url
    });

    res.status(500).json({
      status: 'error',
      message: 'Authentication error',
    });
  }
};

// Role-based middleware
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const admin = req.admin;

    if (!admin || !admin.role) {
      logger.warn('Role check failed: No admin or role', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.url,
        adminId: admin?.id
      });
      res.status(403).json({
        status: 'error',
        message: 'Access denied',
      });
      return;
    }

    if (!allowedRoles.includes(admin.role)) {
      logger.warn('Role check failed: Insufficient permissions', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.url,
        adminId: admin.id,
        adminRole: admin.role,
        requiredRoles: allowedRoles
      });
      res.status(403).json({
        status: 'error',
        message: 'Insufficient permissions',
      });
      return;
    }

    logger.debug('Role check passed', {
      adminId: admin.id,
      role: admin.role,
      ip: req.ip
    });

    next();
  };
};

// Optional authentication middleware (doesn't fail if no token)
export const optionalAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    
    if (!token || token.length < 10) {
      return next();
    }
    
    const decoded = jwt.verify(
      token,
      config.JWT_SECRET
    ) as JwtPayload;

    if (decoded.id && decoded.email) {
      req.user = decoded;
    }

    next();
  } catch (error) {
    // Silently continue for optional auth
    next();
  }
};
