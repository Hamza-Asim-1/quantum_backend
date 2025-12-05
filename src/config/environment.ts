import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface EnvironmentConfig {
  // Server
  NODE_ENV: string;
  PORT: number;
  
  // Database
  DB_HOST: string;
  DB_PORT: number;
  DB_NAME: string;
  DB_USER: string;
  DB_PASSWORD: string;
  DATABASE_URL?: string;
  
  // Redis
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD?: string;
  
  // JWT
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
  
  // CORS
  CORS_ORIGIN: string[];
  
  // AWS S3
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  AWS_REGION?: string;
  AWS_S3_BUCKET?: string;
  
  // Email Configuration (NodeMailer with GoDaddy)
  EMAIL_HOST: string;
  EMAIL_PORT: number;
  EMAIL_SECURE: boolean;
  EMAIL_USER: string;
  EMAIL_PASSWORD: string;
  EMAIL_FROM: string;
  EMAIL_FROM_NAME: string;
  
  // OTP Configuration
  OTP_EXPIRES_IN_MINUTES: number;
  
  // Blockchain
  BLOCKCHAIN_RPC_URL?: string;
  BLOCKCHAIN_PRIVATE_KEY?: string;
  
  // Cron Jobs
  DEPOSIT_SCAN_INTERVAL_MINUTES: number;
  
  // Security
  BCRYPT_ROUNDS: number;
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  
  // Logging
  LOG_LEVEL: string;
  LOG_FILE?: string;
}

// Validate required environment variables
const requiredEnvVars = [
  'JWT_SECRET',
  'DB_HOST',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'REDIS_HOST',
  'EMAIL_HOST',
  'EMAIL_USER',
  'EMAIL_PASSWORD',
  'EMAIL_FROM'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  console.error('Please check your .env file or environment configuration.');
  process.exit(1);
}

// Parse and validate environment configuration
const config: EnvironmentConfig = {
  // Server
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  
  // Database
  DB_HOST: process.env.DB_HOST!,
  DB_PORT: parseInt(process.env.DB_PORT || '5432', 10),
  DB_NAME: process.env.DB_NAME!,
  DB_USER: process.env.DB_USER!,
  DB_PASSWORD: process.env.DB_PASSWORD!,
  DATABASE_URL: process.env.DATABASE_URL,
  
  // Redis
  REDIS_HOST: process.env.REDIS_HOST!,
  REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,
  
  // JWT
  JWT_SECRET: process.env.JWT_SECRET!,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  
  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173', 'http://localhost', 'capacitor://localhost'],
  
  // AWS S3
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_REGION: process.env.AWS_REGION,
  AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,
  
  // Email Configuration (NodeMailer with GoDaddy)
  EMAIL_HOST: process.env.EMAIL_HOST!,
  EMAIL_PORT: parseInt(process.env.EMAIL_PORT || '587', 10),
  EMAIL_SECURE: process.env.EMAIL_SECURE === 'true',
  EMAIL_USER: process.env.EMAIL_USER!,
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD!,
  EMAIL_FROM: process.env.EMAIL_FROM!,
  EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME || 'Quantum Pips',
  
  // OTP Configuration
  OTP_EXPIRES_IN_MINUTES: parseInt(process.env.OTP_EXPIRES_IN_MINUTES || '5', 10),
  
  // Blockchain
  BLOCKCHAIN_RPC_URL: process.env.BLOCKCHAIN_RPC_URL,
  BLOCKCHAIN_PRIVATE_KEY: process.env.BLOCKCHAIN_PRIVATE_KEY,
  
  // Cron Jobs
  DEPOSIT_SCAN_INTERVAL_MINUTES: parseInt(process.env.DEPOSIT_SCAN_INTERVAL_MINUTES || '5', 10),
  
  // Security
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_FILE: process.env.LOG_FILE,
};

// Validate configuration values
if (config.PORT < 1 || config.PORT > 65535) {
  console.error('❌ Invalid PORT. Must be between 1 and 65535');
  process.exit(1);
}

if (config.DEPOSIT_SCAN_INTERVAL_MINUTES < 1 || config.DEPOSIT_SCAN_INTERVAL_MINUTES > 60) {
  console.error('❌ Invalid DEPOSIT_SCAN_INTERVAL_MINUTES. Must be between 1 and 60');
  process.exit(1);
}

if (config.BCRYPT_ROUNDS < 10 || config.BCRYPT_ROUNDS > 15) {
  console.error('❌ Invalid BCRYPT_ROUNDS. Must be between 10 and 15');
  process.exit(1);
}

if (config.OTP_EXPIRES_IN_MINUTES < 1 || config.OTP_EXPIRES_IN_MINUTES > 60) {
  console.error('❌ Invalid OTP_EXPIRES_IN_MINUTES. Must be between 1 and 60');
  process.exit(1);
}

if (![465, 587, 25].includes(config.EMAIL_PORT)) {
  console.warn('⚠️  Unusual EMAIL_PORT. Common ports are 465 (SSL), 587 (TLS), or 25');
}

export default config;