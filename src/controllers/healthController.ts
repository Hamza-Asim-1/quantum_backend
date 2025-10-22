import { Request, Response } from 'express';
import { testConnection } from '../config/database';
import { testRedisConnection } from '../config/redis';
import logger from '../utils/logger';
import config from '../config/environment';

interface HealthCheck {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  services: {
    database: ServiceStatus;
    redis: ServiceStatus;
  };
  system: {
    memory: NodeJS.MemoryUsage;
    platform: string;
    nodeVersion: string;
  };
}

interface ServiceStatus {
  status: 'up' | 'down';
  responseTime?: number;
  error?: string;
}

// Basic health check
export const healthCheck = async (req: Request, res: Response): Promise<void> => {
  try {
    const startTime = Date.now();
    
    // Test database connection
    const dbStartTime = Date.now();
    const dbConnected = await testConnection();
    const dbResponseTime = Date.now() - dbStartTime;
    
    // Test Redis connection
    const redisStartTime = Date.now();
    const redisConnected = await testRedisConnection();
    const redisResponseTime = Date.now() - redisStartTime;
    
    const health: HealthCheck = {
      status: dbConnected && redisConnected ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.NODE_ENV,
      version: '1.0.0',
      services: {
        database: {
          status: dbConnected ? 'up' : 'down',
          responseTime: dbResponseTime,
          ...(dbConnected ? {} : { error: 'Database connection failed' })
        },
        redis: {
          status: redisConnected ? 'up' : 'down',
          responseTime: redisResponseTime,
          ...(redisConnected ? {} : { error: 'Redis connection failed' })
        }
      },
      system: {
        memory: process.memoryUsage(),
        platform: process.platform,
        nodeVersion: process.version
      }
    };

    const statusCode = health.status === 'healthy' ? 200 : 503;
    
    logger.info('Health check performed', {
      status: health.status,
      responseTime: Date.now() - startTime,
      services: health.services
    });

    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Health check failed', error);
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Detailed health check (for monitoring systems)
export const detailedHealthCheck = async (req: Request, res: Response): Promise<void> => {
  try {
    const startTime = Date.now();
    
    // Test database with query
    const dbStartTime = Date.now();
    let dbStatus: ServiceStatus = { status: 'down' };
    
    try {
      const dbConnected = await testConnection();
      dbStatus = {
        status: dbConnected ? 'up' : 'down',
        responseTime: Date.now() - dbStartTime
      };
    } catch (error) {
      dbStatus = {
        status: 'down',
        responseTime: Date.now() - dbStartTime,
        error: error instanceof Error ? error.message : 'Database error'
      };
    }
    
    // Test Redis with ping
    const redisStartTime = Date.now();
    let redisStatus: ServiceStatus = { status: 'down' };
    
    try {
      const redisConnected = await testRedisConnection();
      redisStatus = {
        status: redisConnected ? 'up' : 'down',
        responseTime: Date.now() - redisStartTime
      };
    } catch (error) {
      redisStatus = {
        status: 'down',
        responseTime: Date.now() - redisStartTime,
        error: error instanceof Error ? error.message : 'Redis error'
      };
    }
    
    const health: HealthCheck = {
      status: dbStatus.status === 'up' && redisStatus.status === 'up' ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.NODE_ENV,
      version: '1.0.0',
      services: {
        database: dbStatus,
        redis: redisStatus
      },
      system: {
        memory: process.memoryUsage(),
        platform: process.platform,
        nodeVersion: process.version
      }
    };

    const statusCode = health.status === 'healthy' ? 200 : 503;
    
    logger.info('Detailed health check performed', {
      status: health.status,
      totalResponseTime: Date.now() - startTime,
      services: health.services,
      memory: health.system.memory
    });

    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Detailed health check failed', error);
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Detailed health check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Readiness check (for Kubernetes/Render)
export const readinessCheck = async (req: Request, res: Response): Promise<void> => {
  try {
    const dbConnected = await testConnection();
    const redisConnected = await testRedisConnection();
    
    if (dbConnected && redisConnected) {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        reason: 'Dependencies not available'
      });
    }
  } catch (error) {
    logger.error('Readiness check failed', error);
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Liveness check (for Kubernetes/Render)
export const livenessCheck = (req: Request, res: Response): void => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
};
