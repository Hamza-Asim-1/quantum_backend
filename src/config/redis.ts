import { createClient, RedisClientType } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

// Create Redis client with URL or individual config
const redisClient: RedisClientType = process.env.REDIS_URL 
  ? createClient({
      url: process.env.REDIS_URL,
      legacyMode: false,
    })
  : createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
      password: process.env.REDIS_PASSWORD ? process.env.REDIS_PASSWORD : undefined,
      legacyMode: false,
    });

// Error handling
redisClient.on('error', (err) => {
  console.error('❌ Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('🔄 Redis Client Connecting...');
});

redisClient.on('ready', () => {
  console.log('✅ Redis Client Connected');
});

// Connect to Redis
export const connectRedis = async (): Promise<void> => {
  try {
    await redisClient.connect();
  } catch (error) {
    console.error('❌ Failed to connect to Redis:', error);
    throw error;
  }
};

// Test connection
export const testRedisConnection = async (): Promise<boolean> => {
  try {
    await redisClient.ping();
    console.log('✅ Redis connection test successful');
    return true;
  } catch (error) {
    console.error('❌ Redis connection test failed:', error);
    return false;
  }
};

// Graceful shutdown
export const closeRedis = async (): Promise<void> => {
  await redisClient.quit();
  console.log('Redis connection closed');
};

export default redisClient;