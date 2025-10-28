-- Run this SQL on your Render PostgreSQL database
-- Copy the entire command below and paste it in Render's database shell

UPDATE users
SET password_hash = '$2b$10$oPgE3HAr938CvAVPzqo80uuB4HSZfxcPzkmuXX5VDaIKc9Y9V3RJm',
    updated_at = CURRENT_TIMESTAMP
WHERE email = 'admin@platform.com' AND is_admin = true;

-- After running the above SQL, login with:
-- Email: admin@platform.com
-- Password: Poster$@123&59

