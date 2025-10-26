// updateAdminPassword.js
const crypto = require('crypto');
const { Pool } = require('pg');
require('dotenv').config();

// Simple bcrypt-like hash function using crypto
function hashPassword(password, saltRounds = 10) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `$2b$${saltRounds}$${salt}${hash}`;
}

// Create database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'investment_platform',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function updateAdminPassword() {
  console.log('🔧 Updating admin password...\n');
  
  const email = process.env.SUPER_ADMIN_EMAIL || 'admin@platform.com';
  const password = process.env.SUPER_ADMIN_PASSWORD || 'Admin123!';

  console.log(`📧 Email: ${email}`);
  console.log(`🔑 Password: ${password}`);
  console.log('');

  try {
    // Hash the password
    console.log('🔐 Hashing password with crypto (salt rounds: 10)...');
    const hashedPassword = hashPassword(password, 10);
    console.log('✅ Password hashed successfully');
    console.log(`   Hash: ${hashedPassword.substring(0, 30)}...`);
    console.log('');

    // Update the admin user
    console.log(`📝 Updating database for: ${email}`);
    const result = await pool.query(
      `UPDATE users 
       SET password_hash = $1, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE email = $2 AND is_admin = true`,
      [hashedPassword, email]
    );

    if (result.rowCount === 0) {
      console.log('❌ No admin user found with that email');
      console.log('   Make sure the user exists and has is_admin = true');
      process.exit(1);
    }

    console.log('✅ Admin password updated successfully!');
    console.log('');
    console.log('🔐 New login credentials:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log('');
    console.log('🚀 You can now login to the admin panel');

  } catch (error) {
    console.error('❌ Error updating admin password:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the function
updateAdminPassword();