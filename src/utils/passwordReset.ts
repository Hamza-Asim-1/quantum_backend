import bcrypt from 'bcrypt';
import config from '../config/environment';

/**
 * Generate a 6-digit OTP
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Hash OTP using bcrypt (same as passwords)
 */
export async function hashOTP(otp: string): Promise<string> {
  return await bcrypt.hash(otp, config.BCRYPT_ROUNDS);
}

/**
 * Compare plain OTP with hashed OTP
 */
export async function compareOTP(plainOTP: string, hashedOTP: string): Promise<boolean> {
  return await bcrypt.compare(plainOTP, hashedOTP);
}

/**
 * Generate OTP expiry timestamp (default 5 minutes from now)
 */
export function generateOTPExpiry(): Date {
  const expiryMinutes = config.OTP_EXPIRES_IN_MINUTES;
  return new Date(Date.now() + expiryMinutes * 60 * 1000);
}

/**
 * Check if OTP has expired
 */
export function isOTPExpired(expiresAt: Date): boolean {
  return new Date() > new Date(expiresAt);
}