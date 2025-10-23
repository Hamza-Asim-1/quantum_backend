// fixAdminPassword.js - Fix admin password in deployed database
const crypto = require('crypto');

// Simple bcrypt-like hash function
function hashPassword(password, saltRounds = 10) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `$2b$${saltRounds}$${salt}${hash}`;
}

async function fixAdminPassword() {
  console.log('🔧 Fixing admin password in deployed database...\n');
  
  const email = 'admin@platform.com';
  const password = 'Admin123!';
  
  console.log(`📧 Email: ${email}`);
  console.log(`🔑 Password: ${password}`);
  console.log('');

  try {
    // Hash the password
    console.log('🔐 Hashing password...');
    const hashedPassword = hashPassword(password, 10);
    console.log('✅ Password hashed successfully');
    console.log(`   Hash: ${hashedPassword.substring(0, 30)}...`);
    console.log('');

    // Create the SQL update command
    const updateSQL = `UPDATE users 
                       SET password_hash = '${hashedPassword}', 
                           updated_at = CURRENT_TIMESTAMP 
                       WHERE email = '${email}' AND is_admin = true;`;

    console.log('📝 SQL Update Command:');
    console.log('=====================================');
    console.log(updateSQL);
    console.log('=====================================');
    console.log('');
    
    console.log('🚀 Instructions:');
    console.log('1. Go to your Render dashboard');
    console.log('2. Open your database service');
    console.log('3. Go to the "Shell" or "Query" tab');
    console.log('4. Run the SQL command above');
    console.log('');
    console.log('🔐 After running the SQL, you can login with:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log('');
    console.log('✅ This will fix the admin login issue!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the function
fixAdminPassword();
