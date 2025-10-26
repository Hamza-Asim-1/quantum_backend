import { Pool, PoolConfig } from 'pg';
import config from './environment';
import logger from '../utils/logger';

const poolConfig: PoolConfig = {
  host: config.DB_HOST,
  port: config.DB_PORT,
  database: config.DB_NAME,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  // SSL configuration for production
  ssl: config.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false,
};

// If DATABASE_URL is provided (Render, Railway, etc.), use it instead
let pool: Pool;

if (config.DATABASE_URL) {
  pool = new Pool({
    connectionString: config.DATABASE_URL,
    ssl: config.NODE_ENV === 'production' ? {
      rejectUnauthorized: false
    } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
  logger.info('Using DATABASE_URL for connection');
} else {
  pool = new Pool(poolConfig);
  logger.info('Using individual database config for connection');
}

export default pool;

// Test connection
export const testConnection = async (): Promise<boolean> => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    logger.info('✅ Database connected successfully', { 
      timestamp: result.rows[0].now,
      environment: config.NODE_ENV 
    });
    return true;
  } catch (error) {
    logger.error('❌ Database connection failed', error);
    return false;
  }
};

// Graceful shutdown
export const closePool = async (): Promise<void> => {
  await pool.end();
  logger.info('Database pool closed');
};