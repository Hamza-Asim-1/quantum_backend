import bcrypt from 'bcrypt';
import pool from '../src/config/database';
import dotenv from 'dotenv';

dotenv.config();

async function createAdmin() {
  try {
    console.log('🔐 Creating default admin user...\n');

    const email = 'admin@platform.com';
    const password = 'SuperSecurePassword123!';
    const passwordHash = await bcrypt.hash(password, 10);

    // Check if admin already exists
    const existingAdmin = await pool.query(
      'SELECT id, email FROM admin_users WHERE email = $1',
      [email]
    );

    if (existingAdmin.rows.length > 0) {
      console.log('⚠️  Admin user already exists!');
      console.log('Updating password...\n');
      
      await pool.query(
        'UPDATE admin_users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2',
        [passwordHash, email]
      );
      
      console.log('✅ Admin password updated successfully!\n');
    } else {
      const result = await pool.query(
        `INSERT INTO admin_users (email, password_hash, role, full_name, is_active)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, email, role, created_at`,
        [email, passwordHash, 'super_admin', 'Platform Administrator', true]
      );

      console.log('✅ Admin user created successfully!\n');
      console.log('Admin Details:');
      console.log('─────────────────────────────────');
      console.log('ID:', result.rows[0].id);
      console.log('Email:', result.rows[0].email);
      console.log('Role:', result.rows[0].role);
      console.log('Created:', result.rows[0].created_at);
    }

    console.log('\n📋 Login Credentials:');
    console.log('─────────────────────────────────');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('\n⚠️  IMPORTANT: Change this password in production!\n');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin:', error);
    await pool.end();
    process.exit(1);
  }
}

createAdmin();
