import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import config from '../config/environment';
import logger from '../utils/logger';

// Create a separate pool for migrations
let pool: Pool;

if (config.DATABASE_URL) {
  pool = new Pool({
    connectionString: config.DATABASE_URL,
    ssl: config.NODE_ENV === 'production' ? {
      rejectUnauthorized: false
    } : false,
    max: 1, // Single connection for migrations
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
  logger.info('Using DATABASE_URL for migrations');
} else {
  pool = new Pool({
    host: config.DB_HOST,
    port: config.DB_PORT,
    database: config.DB_NAME,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    ssl: config.NODE_ENV === 'production' ? {
      rejectUnauthorized: false
    } : false,
    max: 1, // Single connection for migrations
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
  logger.info('Using individual database config for migrations');
}

async function runMigrations() {
  const client = await pool.connect();
  
  try {
    logger.info('🔄 Starting database migrations...');
    
    // Create migrations table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Get list of migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    logger.info(`📁 Found ${files.length} migration files`);
    
    for (const file of files) {
      // Check if migration already ran
      const result = await client.query(
        'SELECT id FROM migrations WHERE filename = $1',
        [file]
      );
      
      if (result.rows.length > 0) {
        logger.info(`⏭️  Skipping ${file} (already executed)`);
        continue;
      }
      
      logger.info(`🔄 Running migration: ${file}`);
      
      // Read and execute migration file
      const migrationPath = path.join(migrationsDir, file);
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      
      await client.query('BEGIN');
      
      try {
        await client.query(migrationSQL);
        await client.query(
          'INSERT INTO migrations (filename) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        
        logger.info(`✅ Migration ${file} completed successfully`);
      } catch (error) {
        await client.query('ROLLBACK');
        logger.error(`❌ Migration ${file} failed:`, error);
        throw error;
      }
    }
    
    logger.info('🎉 All migrations completed successfully!');
    
  } catch (error) {
    logger.error('❌ Migration error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      logger.info('✅ Migration process completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ Migration process failed:', error);
      process.exit(1);
    });
}

export default runMigrations;
