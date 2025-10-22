import redisClient from '../config/redis';
import logger from './logger';

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
}

class CacheService {
  private defaultTTL = 3600; // 1 hour
  private prefix = 'app:';

  // Set cache with TTL
  async set(key: string, value: any, options: CacheOptions = {}): Promise<boolean> {
    try {
      const fullKey = `${options.prefix || this.prefix}${key}`;
      const ttl = options.ttl || this.defaultTTL;
      
      const serializedValue = JSON.stringify(value);
      await redisClient.setEx(fullKey, ttl, serializedValue);
      
      logger.debug('Cache set', { key: fullKey, ttl });
      return true;
    } catch (error) {
      logger.error('Cache set error', error, { key });
      return false;
    }
  }

  // Get from cache
  async get<T = any>(key: string, options: CacheOptions = {}): Promise<T | null> {
    try {
      const fullKey = `${options.prefix || this.prefix}${key}`;
      const value = await redisClient.get(fullKey);
      
      if (value === null) {
        logger.debug('Cache miss', { key: fullKey });
        return null;
      }
      
      logger.debug('Cache hit', { key: fullKey });
      return JSON.parse(value);
    } catch (error) {
      logger.error('Cache get error', error, { key });
      return null;
    }
  }

  // Delete from cache
  async delete(key: string, options: CacheOptions = {}): Promise<boolean> {
    try {
      const fullKey = `${options.prefix || this.prefix}${key}`;
      const result = await redisClient.del(fullKey);
      
      logger.debug('Cache delete', { key: fullKey, deleted: result > 0 });
      return result > 0;
    } catch (error) {
      logger.error('Cache delete error', error, { key });
      return false;
    }
  }

  // Clear cache by pattern
  async clearPattern(pattern: string, options: CacheOptions = {}): Promise<number> {
    try {
      const fullPattern = `${options.prefix || this.prefix}${pattern}`;
      const keys = await redisClient.keys(fullPattern);
      
      if (keys.length === 0) {
        return 0;
      }
      
      const result = await redisClient.del(keys);
      logger.debug('Cache pattern cleared', { pattern: fullPattern, keysDeleted: result });
      return result;
    } catch (error) {
      logger.error('Cache pattern clear error', error, { pattern });
      return 0;
    }
  }

  // Check if key exists
  async exists(key: string, options: CacheOptions = {}): Promise<boolean> {
    try {
      const fullKey = `${options.prefix || this.prefix}${key}`;
      const result = await redisClient.exists(fullKey);
      
      logger.debug('Cache exists check', { key: fullKey, exists: result > 0 });
      return result > 0;
    } catch (error) {
      logger.error('Cache exists error', error, { key });
      return false;
    }
  }

  // Get TTL
  async getTTL(key: string, options: CacheOptions = {}): Promise<number> {
    try {
      const fullKey = `${options.prefix || this.prefix}${key}`;
      const ttl = await redisClient.ttl(fullKey);
      
      logger.debug('Cache TTL', { key: fullKey, ttl });
      return ttl;
    } catch (error) {
      logger.error('Cache TTL error', error, { key });
      return -1;
    }
  }

  // Increment counter
  async increment(key: string, options: CacheOptions = {}): Promise<number> {
    try {
      const fullKey = `${options.prefix || this.prefix}${key}`;
      const result = await redisClient.incr(fullKey);
      
      // Set TTL if this is a new key
      if (result === 1 && options.ttl) {
        await redisClient.expire(fullKey, options.ttl);
      }
      
      logger.debug('Cache increment', { key: fullKey, value: result });
      return result;
    } catch (error) {
      logger.error('Cache increment error', error, { key });
      return 0;
    }
  }

  // Decrement counter
  async decrement(key: string, options: CacheOptions = {}): Promise<number> {
    try {
      const fullKey = `${options.prefix || this.prefix}${key}`;
      const result = await redisClient.decr(fullKey);
      
      logger.debug('Cache decrement', { key: fullKey, value: result });
      return result;
    } catch (error) {
      logger.error('Cache decrement error', error, { key });
      return 0;
    }
  }

  // Cache with fallback function
  async getOrSet<T>(
    key: string,
    fallback: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    try {
      // Try to get from cache first
      const cached = await this.get<T>(key, options);
      if (cached !== null) {
        return cached;
      }
      
      // If not in cache, execute fallback
      const result = await fallback();
      
      // Store in cache
      await this.set(key, result, options);
      
      return result;
    } catch (error) {
      logger.error('Cache getOrSet error', error, { key });
      // If cache fails, still try fallback
      return await fallback();
    }
  }
}

// Create singleton instance
const cacheService = new CacheService();

export default cacheService;

// Cache decorator for functions
export function cached(ttl: number = 3600, prefix?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const cacheKey = `${propertyName}:${JSON.stringify(args)}`;
      
      // Try to get from cache
      const cached = await cacheService.get(cacheKey, { ttl, prefix });
      if (cached !== null) {
        return cached;
      }
      
      // Execute method and cache result
      const result = await method.apply(this, args);
      await cacheService.set(cacheKey, result, { ttl, prefix });
      
      return result;
    };
  };
}
