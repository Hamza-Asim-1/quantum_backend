import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

// Response time tracking middleware
export const responseTimeTracker = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Log slow requests
    if (duration > 1000) { // Log requests taking more than 1 second
      logger.warn('Slow request detected', {
        method: req.method,
        url: req.url,
        duration: `${duration}ms`,
        statusCode: res.statusCode,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
    }
    
    // Log all requests in production for monitoring
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      duration: `${duration}ms`,
      statusCode: res.statusCode,
      ip: req.ip
    });
  });
  
  next();
};

// Memory usage monitoring
export const memoryMonitor = (req: Request, res: Response, next: NextFunction): void => {
  const memUsage = process.memoryUsage();
  const memUsageMB = {
    rss: Math.round(memUsage.rss / 1024 / 1024),
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
    external: Math.round(memUsage.external / 1024 / 1024)
  };
  
  // Log high memory usage
  if (memUsageMB.heapUsed > 500) { // More than 500MB
    logger.warn('High memory usage detected', {
      memoryUsage: memUsageMB,
      method: req.method,
      url: req.url
    });
  }
  
  // Add memory info to response headers in development
  if (process.env.NODE_ENV === 'development') {
    res.setHeader('X-Memory-Usage', JSON.stringify(memUsageMB));
  }
  
  next();
};

// Request size limiter
export const requestSizeLimiter = (maxSize: number = 10 * 1024 * 1024) => { // 10MB default
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.get('content-length') || '0', 10);
    
    if (contentLength > maxSize) {
      logger.warn('Request size limit exceeded', {
        contentLength,
        maxSize,
        ip: req.ip,
        url: req.url,
        method: req.method
      });
      
      res.status(413).json({
        status: 'error',
        message: 'Request entity too large',
        maxSize: `${maxSize / 1024 / 1024}MB`
      });
      return;
    }
    
    next();
  };
};

// Connection limiter (basic implementation)
const connectionCounts = new Map<string, number>();
const MAX_CONNECTIONS_PER_IP = 10;

export const connectionLimiter = (req: Request, res: Response, next: NextFunction): void => {
  const clientIP = req.ip || 'unknown';
  const currentConnections = connectionCounts.get(clientIP) || 0;
  
  if (currentConnections >= MAX_CONNECTIONS_PER_IP) {
    logger.warn('Connection limit exceeded', {
      ip: clientIP,
      connections: currentConnections,
      limit: MAX_CONNECTIONS_PER_IP
    });
    
    res.status(429).json({
      status: 'error',
      message: 'Too many connections from this IP',
    });
    return;
  }
  
  // Increment connection count
  connectionCounts.set(clientIP, currentConnections + 1);
  
  // Decrement on response finish
  res.on('finish', () => {
    const newCount = (connectionCounts.get(clientIP) || 1) - 1;
    if (newCount <= 0) {
      connectionCounts.delete(clientIP);
    } else {
      connectionCounts.set(clientIP, newCount);
    }
  });
  
  next();
};

// Cache headers middleware
export const cacheHeaders = (maxAge: number = 3600) => { // 1 hour default
  return (req: Request, res: Response, next: NextFunction): void => {
    // Only cache GET requests
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
      res.setHeader('ETag', `"${Date.now()}"`);
    } else {
      // No cache for non-GET requests
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    
    next();
  };
};

// API versioning middleware
export const apiVersioning = (req: Request, res: Response, next: NextFunction): void => {
  const apiVersion = req.get('API-Version') || 'v1';
  
  // Add version to response headers
  res.setHeader('API-Version', apiVersion);
  
  // Log API version usage
  logger.debug('API version requested', {
    version: apiVersion,
    url: req.url,
    method: req.method
  });
  
  next();
};

// Request ID middleware (if not already implemented)
export const requestIdGenerator = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.headers['x-request-id']) {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    req.headers['x-request-id'] = requestId;
    res.setHeader('X-Request-ID', requestId);
  }
  
  next();
};
