import bcrypt from 'bcrypt';
import { randomInt } from 'crypto';

/**
 * Generate a 6-digit OTP code using cryptographically secure random number generator
 * @returns {string} 6-digit numeric OTP
 */
export const generateOTP = (): string => {
  // Generate a cryptographically secure random 6-digit number (100000 to 999999)
  const min = 100000;
  const max = 999999;
  return randomInt(min, max + 1).toString();
};

/**
 * Hash an OTP using bcrypt
 * @param otp - The 6-digit OTP code
 * @returns {Promise<string>} Bcrypt hashed OTP
 */
export const hashOTP = async (otp: string): Promise<string> => {
  const saltRounds = 10;
  return await bcrypt.hash(otp, saltRounds);
};

/**
 * Compare OTP with hashed OTP
 * @param otp - The plain OTP code
 * @param hashedOTP - The hashed OTP from database
 * @returns {Promise<boolean>} True if OTP matches
 */
export const compareOTP = async (otp: string, hashedOTP: string): Promise<boolean> => {
  return await bcrypt.compare(otp, hashedOTP);
};

/**
 * Generate OTP expiry time (5 minutes from now)
 * @returns {Date} Expiry timestamp
 */
export const generateOTPExpiry = (): Date => {
  const now = new Date();
  const expiry = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes
  return expiry;
};

/**
 * Verify if an OTP has expired
 * @param expiry - Expiry timestamp
 * @returns {boolean} True if OTP is expired
 */
export const isOTPExpired = (expiry: Date | string): boolean => {
  const expiryDate = typeof expiry === 'string' ? new Date(expiry) : expiry;
  return new Date() > expiryDate;
};
