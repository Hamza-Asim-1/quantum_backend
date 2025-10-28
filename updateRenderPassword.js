// updateRenderPassword.js
// Script to update admin password on Render database
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
require('dotenv').config();

async function updateRenderPassword() {
  console.log('🔧 Updating admin password on Render database...\n');
  
  const email = 'admin@platform.com';
  const password = 'Poster$@123&59';

  // Check if DATABASE_URL is provided (Render uses this)
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not found in environment variables');
    console.error('Please set DATABASE_URL in your Render environment variables');
    console.error('or run this locally with your local DATABASE_URL');
    process.exit(1);
  }

  console.log('📧 Email:', email);
  console.log('🔑 New Password:', password);
  console.log('');

  try {
    // Create connection pool
    const pool = new Pool({
      connectionString: databaseUrl,
      ssl: {
        rejectUnauthorized: false
      }
    });

    // Hash the password using bcrypt
    console.log('🔐 Hashing password with bcrypt...');
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('✅ Password hashed successfully');
    console.log(`   Hash: ${hashedPassword.substring(0, 30)}...\n`);

    // Update the admin user
    console.log(`📝 Updating admin password in database...`);
    const result = await pool.query(
      `UPDATE users 
       SET password_hash = $1, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE email = $2 AND is_admin = true
       RETURNING id, email, full_name, is_admin, is_active`,
      [hashedPassword, email]
    );

    if (result.rows.length === 0) {
      console.log('❌ No admin user found with that email');
      console.log('   Make sure the user exists and has is_admin = true');
      await pool.end();
      process.exit(1);
    }

    const admin = result.rows[0];
    
    console.log('✅ Admin password updated successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Admin Details:');
    console.log(`  ID: ${admin.id}`);
    console.log(`  Email: ${admin.email}`);
    console.log(`  Name: ${admin.full_name}`);
    console.log(`  Is Admin: ${admin.is_admin}`);
    console.log(`  Is Active: ${admin.is_active}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🎉 You can now login with:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log('\n🚀 Restart your Render service for changes to take effect\n');

    await pool.end();
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error updating admin password:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

updateRenderPassword();

