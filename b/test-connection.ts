import pool from './src/config/database';
import dotenv from 'dotenv';

dotenv.config();

async function testConnection() {
  console.log('🔄 Testing database connection...\n');
  
  try {
    const client = await pool.connect();
    console.log('✅ Connected to database\n');
    
    // Test query
    const result = await client.query('SELECT NOW(), version()');
    console.log('⏰ Database time:', result.rows[0].now);
    console.log('📊 PostgreSQL version:', result.rows[0].version.split(' ')[0], result.rows[0].version.split(' ')[1]);
    
    // Check existing tables
    const tables = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);
    
    console.log(`\n📋 Existing tables: ${tables.rows.length}`);
    if (tables.rows.length > 0) {
      tables.rows.forEach(row => {
        console.log(`   - ${row.tablename}`);
      });
    } else {
      console.log('   (no tables yet - ready for migrations)');
    }
    
    client.release();
    await pool.end();
    
    console.log('\n✅ Connection test successful!\n');
    process.exit(0);
    
  } catch (error: any) {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  }
}

testConnection();