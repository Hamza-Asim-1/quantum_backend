import { Request } from 'express';

// User types
export interface User {
  id: number;
  email: string;
  password_hash: string;
  full_name: string;
  phone: string | null;
  referral_code: string;
  referred_by: number | null;
  kyc_status: 'pending' | 'approved' | 'rejected';
  is_active: boolean;
  is_admin: boolean;
  created_at: Date;
  updated_at: Date;
}

// JWT Payload
export interface JWTPayload {
  id: number;
  userId: number;
  email: string;
  isAdmin: boolean;
  type?: string;
  role?: string;
}

// Extended Request with user
export interface AuthRequest extends Request {
  user?: JWTPayload;
}

// API Response types
export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  message: string;
  data?: T;
  error?: string;
}

// Auth DTOs
export interface RegisterDTO {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  referral_code?: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: number;
    email: string;
    full_name: string;
    is_admin: boolean;
    kyc_status: string;
  };
  accessToken: string;
  refreshToken: string;
}