import app from './app';
import config from './config/environment';
import { testConnection, closePool } from './config/database';
import { connectRedis, testRedisConnection, closeRedis } from './config/redis';
import cronJobService from './services/cronJobs';
import runMigrations from './database/runMigrations';
import logger from './utils/logger';

// Start Server
const startServer = async () => {
  try {
    // Test Database Connection
    logger.info('🔍 Testing database connection...');
    const dbConnected = await testConnection();
    if (!dbConnected) {
      throw new Error('Failed to connect to database');
    }

    // Run Database Migrations
    logger.info('🔄 Running database migrations...');
    await runMigrations();
    logger.info('✅ Database migrations completed');

    // Connect to Redis
    logger.info('🔍 Connecting to Redis...');
    await connectRedis();
    await testRedisConnection();
    
    // Start cron jobs
    cronJobService.startAll();
    
    // Start Express Server
    const server = app.listen(config.PORT, () => {
      logger.info('');
      logger.info('═══════════════════════════════════════════════════════');
      logger.info(`🚀 Server running on port ${config.PORT}`);
      logger.info(`🌍 Environment: ${config.NODE_ENV}`);
      logger.info(`🔗 API URL: http://localhost:${config.PORT}/api/v1`);
      logger.info(`❤️  Health Check: http://localhost:${config.PORT}/health`);
      logger.info('═══════════════════════════════════════════════════════');
      logger.info('');
    });

    // Graceful Shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`\n${signal} received. Starting graceful shutdown...`);
      
      server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
          await closePool();
          await closeRedis();
          logger.info('✅ All connections closed successfully');
          process.exit(0);
        } catch (error) {
          logger.error('❌ Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('⏰ Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the application
startServer();