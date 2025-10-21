import app from './app';
import { testConnection, closePool } from './config/database';
import { connectRedis, testRedisConnection, closeRedis } from './config/redis';
import cronJobService from './services/cronJobs';

const PORT = process.env.PORT || 3000;

// Start Server
const startServer = async () => {
  try {
    // Test Database Connection
    console.log(' Testing database connection...');
    const dbConnected = await testConnection();
    if (!dbConnected) {
      throw new Error('Failed to connect to database');
    }

    // Connect to Redis
    console.log(' Connecting to Redis...');
    await connectRedis();
    await testRedisConnection();
    cronJobService.startAll();
    // Start Express Server
    const server = app.listen(PORT, () => {
      console.log('');
      console.log('═══════════════════════════════════════════════════════');
      console.log(` Server running on port ${PORT}`);
      console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(` API URL: http://localhost:${PORT}/api/v1`);
      console.log(`  Health Check: http://localhost:${PORT}/health`);
      console.log('═══════════════════════════════════════════════════════');
      console.log('');
    });

    // Graceful Shutdown
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n${signal} received. Starting graceful shutdown...`);
      
      server.close(async () => {
        console.log('HTTP server closed');
        
        try {
          await closePool();
          await closeRedis();
          console.log(' All connections closed successfully');
          process.exit(0);
        } catch (error) {
          console.error(' Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('  Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error(' Failed to start server:', error);
    process.exit(1);
  }
};

// Start the application
startServer();