// updateAdminPassword.ts
// Place this file in your backend root directory (same level as src/)

import bcrypt from 'bcrypt';
import pool from './src/config/database';
import dotenv from 'dotenv';

dotenv.config();

async function updateAdminPassword() {
  console.log('🔧 Updating admin password...\n');
  
  const email = process.env.SUPER_ADMIN_EMAIL || 'admin@platform.com';
  const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!password) {
    console.error('❌ SUPER_ADMIN_PASSWORD not found in .env file');
    console.error('Please add SUPER_ADMIN_PASSWORD to your .env file');
    process.exit(1);
  }

  console.log(`📧 Email: ${email}`);
  console.log(`🔑 Password: ${password}`);
  console.log('');

  try {
    // Hash the password
    console.log('🔐 Hashing password with bcrypt (salt rounds: 10)...');
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('✅ Password hashed successfully');
    console.log(`   Hash: ${hashedPassword.substring(0, 30)}...`);
    console.log('');

    // Update the admin user
    console.log(`📝 Updating database for: ${email}`);
    const result = await pool.query(
      `UPDATE users 
       SET password_hash = $1, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE email = $2 
       RETURNING id, email, full_name, is_admin, is_active`,
      [hashedPassword, email]
    );

    if (result.rows.length === 0) {
      console.error(`\n❌ No user found with email: ${email}`);
      console.error('Please check if the admin user exists in the database');
      process.exit(1);
    }

    const admin = result.rows[0];
    
    console.log('\n✅ Admin password updated successfully!');
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
    console.log('');
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Failed to update admin password:', error);
    await pool.end();
    process.exit(1);
  }
}

updateAdminPassword();