import { createClient, RedisClientType } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

// Extract Redis URL from command line or use direct URL
const getRedisUrl = (): string | null => {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return null;
  
  // If it's a command line, extract the URL part
  if (redisUrl.includes('redis-cli')) {
    const urlMatch = redisUrl.match(/redis:\/\/[^\s]+/);
    return urlMatch ? urlMatch[0] : null;
  }
  
  // If it's already a URL, use it directly
  return redisUrl;
};

// Create Redis client with URL or individual config
const redisUrl = getRedisUrl();
const redisClient: RedisClientType = redisUrl
  ? createClient({
      url: redisUrl,
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