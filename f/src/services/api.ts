// src/services/api.ts
const API_BASE_URL = 'http://localhost:3000/api/v1';

export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
}
export interface DepositRequest {
  amount: number;
  chain: 'TRC20' | 'BEP20';
  tx_hash: string;
  wallet_address?: string;
}

export interface Deposit {
  id: number;
  amount: number;
  chain: 'TRC20' | 'BEP20';
  tx_hash: string;
  from_address: string | null;
  to_address: string | null;
  status: 'pending' | 'confirmed' | 'failed';
  admin_notes: string | null;
  created_at: string;
  verified_at: string | null;
  updated_at: string;
}

export interface PlatformAddresses {
  BEP20: string;
  TRC20: string;
}

export interface AdminDepositDetail {
  id: number;
  user_id: number;
  email: string;
  full_name: string;
  phone: string;
  amount: number;
  chain: 'TRC20' | 'BEP20';
  tx_hash: string;
  from_address: string | null;
  to_address: string | null;
  status: 'pending' | 'confirmed' | 'failed';
  admin_notes: string | null;
  created_at: string;
  verified_at: string | null;
  verified_by: number | null;
  updated_at: string;
}

export interface AdminDepositStats {
  byStatus: {
    [key: string]: {
      count: number;
      totalAmount: number;
    };
  };
  recent7Days: {
    count: number;
    totalAmount: number;
  };
  pending: {
    count: number;
    totalAmount: number;
  };
}


export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: 'user' | 'admin';
  kyc_status: 'pending' | 'approved' | 'rejected';
  is_admin?: boolean;
  created_at?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface UserBalance {
  currency: string;
  balance: number;
  available_balance: number;
  invested_balance?: number;
  updated_at?: string;
}

export interface WithdrawalRequest {
  amount: number;
  chain: 'TRC20' | 'BEP20';
  wallet_address: string;
}

export interface Withdrawal {
  id: number;
  amount: number;
  chain: string;
  wallet_address: string;
  tx_hash: string | null;
  status: 'pending' | 'processing' | 'completed' | 'rejected' | 'cancelled';
  processed_by: number | null;
  processed_at: string | null;
  rejection_reason: string | null;
  admin_notes: string | null;
  requested_at: string;
  updated_at: string;
}

export interface InvestmentLevel {
  level: number;
  name: string;
  min_amount: number;
  max_amount: number | null;
  daily_rate: number;
  range: string;
  example_amount: number;
  example_daily_profit: number;
}

export interface Investment {
  id: number;
  amount: number;
  level: number;
  profit_rate: number;
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  level_name: string;
  daily_profit: string;
  total_profit_earned: number;
  days_active: number;
  next_profit: string;
}

export interface CreateInvestmentRequest {
  amount: number;
}

export interface KYCSubmission {
  id: string;
  document_type: 'passport' | 'national_id';
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  submitted_at: string;
  reviewed_at?: string;
}

export interface AdminWithdrawalDetail {
  id: number;
  user_id: number;
  email: string;
  full_name: string;
  amount: number;
  chain: 'TRC20' | 'BEP20';
  wallet_address: string;
  status: 'pending' | 'completed' | 'rejected' | 'cancelled';
  tx_hash?: string | null;
  rejection_reason?: string | null;
  admin_notes?: string | null;
  requested_at: string;
  processed_at?: string | null;
  processed_by?: number | null;
  updated_at: string;
}

export interface AdminWithdrawalStats {
  byStatus: {
    [key: string]: {
      count: number;
      totalAmount: number;
    };
  };
  recent7Days: {
    count: number;
    totalAmount: number;
  };
  pending: {
    count: number;
    totalAmount: number;
  };
}

// ==================== USER API SERVICE ====================
class ApiService {
  private getAuthHeaders(): Record<string, string> {
    const token = this.getAccessToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }
  // Add this to the ApiService class (NOT AdminKYCService)

async submitKYC(data: {
  document_type: 'passport' | 'national_id';
  document_number: string;
  document_front: File;
  document_back?: File;
  selfie: File;
}): Promise<KYCSubmission> {
  const formData = new FormData();
  formData.append('document_type', data.document_type);
  formData.append('document_number', data.document_number);
  formData.append('document_front', data.document_front);
  if (data.document_back) {
    formData.append('document_back', data.document_back);
  }
  formData.append('selfie', data.selfie);

  const token = this.getAccessToken();
  
  const response = await fetch(`${API_BASE_URL}/kyc/submit`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      // ⚠️ DON'T set Content-Type for FormData - browser sets it automatically with boundary
    },
    body: formData,
  });

  const result: ApiResponse<KYCSubmission> = await response.json();

  if (!response.ok || result.status === 'error') {
    throw new Error(result.message || 'Failed to submit KYC');
  }

  return result.data!;
}

  private getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  private setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  private clearTokens(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('auth');
  }

  async makeAuthenticatedRequest<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers = {
      ...this.getAuthHeaders(),
      ...options.headers,
    };

    let response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers,
    });

    // If token expired, try to refresh
    if (response.status === 401) {
      try {
        await this.refreshToken();
        // Retry the request with new token
        response = await fetch(`${API_BASE_URL}${url}`, {
          ...options,
          headers: {
            ...this.getAuthHeaders(),
            ...options.headers,
          },
        });
      } catch (refreshError) {
        this.clearTokens();
        window.location.href = '/signin';
        throw new Error('Session expired. Please login again.');
      }
    }

    const result: ApiResponse<T> = await response.json();

    if (!response.ok || result.status === 'error') {
      throw new Error(result.message || 'Request failed');
    }

    return result.data!;
  }
   async submitDeposit(depositData: DepositRequest): Promise<Deposit> {
    return await this.makeAuthenticatedRequest<Deposit>(
      '/deposits/submit',
      {
        method: 'POST',
        body: JSON.stringify(depositData),
      }
    );
  }

  async getDepositHistory(params?: {
    limit?: number;
    offset?: number;
    status?: string;
  }): Promise<{
    deposits: Deposit[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    if (params?.status) queryParams.append('status', params.status);

    const url = `/deposits/history${queryParams.toString() ? `?${queryParams}` : ''}`;

    return await this.makeAuthenticatedRequest<{
      deposits: Deposit[];
      total: number;
      limit: number;
      offset: number;
    }>(url);
  }

  async getDepositById(depositId: number): Promise<Deposit> {
    return await this.makeAuthenticatedRequest<Deposit>(
      `/deposits/${depositId}`
    );
  }

  async getPlatformAddresses(): Promise<{
    addresses: PlatformAddresses;
    instructions: { BEP20: string; TRC20: string };
    warning: string;
  }> {
    return await this.makeAuthenticatedRequest<{
      addresses: PlatformAddresses;
      instructions: { BEP20: string; TRC20: string };
      warning: string;
    }>('/wallets/platform-addresses');
  }

  

  // Authentication
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const result: ApiResponse<AuthResponse> = await response.json();

    if (!response.ok || result.status === 'error') {
      throw new Error(result.message || 'Login failed');
    }

    if (result.data) {
      this.setTokens(result.data.accessToken, result.data.refreshToken);
    }

    return result.data!;
  }

  async register(
    email: string,
    password: string,
    full_name: string,
    phone: string,
    referralCode?: string
  ): Promise<AuthResponse> {
    const requestBody: any = {
      email,
      password,
      full_name,
      phone
    };

    if (referralCode) {
      requestBody.referral_code = referralCode;
    }

    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const result: ApiResponse<AuthResponse> = await response.json();

    if (!response.ok || result.status === 'error') {
      throw new Error(result.message || 'Registration failed');
    }

    if (result.data) {
      this.setTokens(result.data.accessToken, result.data.refreshToken);
    }

    return result.data!;
  }

  async getProfile(): Promise<User> {
    return await this.makeAuthenticatedRequest<{ user: User }>(
      '/auth/profile'
    ).then(response => response.user);
  }

  async refreshToken(): Promise<AuthResponse> {
    const refreshToken = localStorage.getItem('refreshToken');

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    const result: ApiResponse<AuthResponse> = await response.json();

    if (!response.ok || result.status === 'error') {
      this.clearTokens();
      throw new Error(result.message || 'Token refresh failed');
    }

    if (result.data) {
      this.setTokens(result.data.accessToken, result.data.refreshToken);
    }

    return result.data!;
  }

  logout(): void {
    this.clearTokens();
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  // Balance
  async getUserBalance(): Promise<{ accounts: UserBalance[] }> {
    return await this.makeAuthenticatedRequest<{ accounts: UserBalance[] }>(
      '/deposits/balance'
    );
  }

  // Withdrawals
  async requestWithdrawal(withdrawalData: WithdrawalRequest): Promise<Withdrawal> {
    return await this.makeAuthenticatedRequest<Withdrawal>(
      '/withdrawals/request',
      {
        method: 'POST',
        body: JSON.stringify(withdrawalData),
      }
    );
  }

  async getWithdrawalHistory(params?: {
    limit?: number;
    offset?: number;
    status?: string;
  }): Promise<{
    withdrawals: Withdrawal[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    if (params?.status) queryParams.append('status', params.status);

    const url = `/withdrawals/history${queryParams.toString() ? `?${queryParams}` : ''}`;

    return await this.makeAuthenticatedRequest<{
      withdrawals: Withdrawal[];
      total: number;
      limit: number;
      offset: number;
    }>(url);
  }

  async cancelWithdrawal(withdrawalId: number): Promise<void> {
    await this.makeAuthenticatedRequest<void>(
      `/withdrawals/${withdrawalId}/cancel`,
      { method: 'PATCH' }
    );
  }

  // Investments
  async getInvestmentLevels(): Promise<{ levels: InvestmentLevel[] }> {
    return await this.makeAuthenticatedRequest<{ levels: InvestmentLevel[] }>(
      '/investments/levels'
    );
  }

  async createInvestment(investmentData: CreateInvestmentRequest): Promise<Investment> {
    return await this.makeAuthenticatedRequest<Investment>(
      '/investments/create',
      {
        method: 'POST',
        body: JSON.stringify(investmentData),
      }
    );
  }

  async getCurrentInvestment(): Promise<Investment | null> {
    try {
      const response = await this.makeAuthenticatedRequest<Investment>(
        '/investments/current'
      );
      return response;
    } catch (error: any) {
      // If 404 or "No active investment found", return null (this is normal)
      if (error.message.includes('404') || 
          error.message.includes('No active investment found')) {
        return null;
      }
      // Re-throw other errors
      throw error;
    }
  }

  async deleteInvestment(investmentId: number): Promise<{ refunded_amount: number }> {
    return await this.makeAuthenticatedRequest<{ refunded_amount: number }>(
      `/investments/${investmentId}`,
      {
        method: 'DELETE',
      }
    );
  }

  // KYC
  async getKYCStatus(): Promise<KYCSubmission | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/kyc/status`, {
        headers: this.getAuthHeaders(),
      });

      if (response.status === 404) {
        return null;
      }

      const result: ApiResponse<KYCSubmission> = await response.json();

      if (!response.ok || result.status === 'error') {
        throw new Error(result.message || 'Failed to fetch KYC status');
      }

      return result.data!;
    } catch (error) {
      console.error('Get KYC status error:', error);
      throw error;
    }
  }
}

export const apiService = new ApiService();

// ==================== ADMIN API SERVICE ====================
class AdminWithdrawalService {
  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('accessToken');

    if (!token) {
      console.error('❌ No admin token found in localStorage');
      console.error('Available keys:', Object.keys(localStorage));
      throw new Error('No authentication token found. Please login again.');
    }

    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  async getAllWithdrawals(params: {
    limit?: number;
    offset?: number;
    status?: string;
    chain?: string;
    user_id?: string;
  } = {}): Promise<{
    withdrawals: AdminWithdrawalDetail[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) queryParams.append(key, value.toString());
    });

    const url = `${API_BASE_URL}/withdrawals/admin/all${queryParams.toString() ? `?${queryParams}` : ''}`;

    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        errorMessage = `${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    return result.data;
  }

  async getWithdrawalStats(): Promise<AdminWithdrawalStats> {
    const url = `${API_BASE_URL}/withdrawals/admin/stats`;

    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        errorMessage = `${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    return result.data;
  }

  async getWithdrawalById(id: string): Promise<AdminWithdrawalDetail> {
    const url = `${API_BASE_URL}/withdrawals/admin/${id}`;

    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        errorMessage = `${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    return result.data;
  }

  async approveWithdrawal(
    id: string,
    tx_hash: string,
    admin_notes?: string
  ): Promise<AdminWithdrawalDetail> {
    const url = `${API_BASE_URL}/withdrawals/admin/${id}/approve`;

    const response = await fetch(url, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ tx_hash, admin_notes }),
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        errorMessage = `${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    return result.data;
  }

  async rejectWithdrawal(id: string, reason: string): Promise<void> {
    const url = `${API_BASE_URL}/withdrawals/admin/${id}/reject`;

    const response = await fetch(url, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ reason }),
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        errorMessage = `${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }
  }
}

export const adminWithdrawalAPI = new AdminWithdrawalService();

// ==================== ADMIN KYC SERVICE ====================
export interface AdminKYCSubmission {
  id: number;
  user_id: number;
  email: string;
  full_name: string;
  phone: string;
  document_type: 'passport' | 'drivers_license' | 'national_id';
  document_number: string;
  document_front_url: string;
  document_back_url: string | null;
  selfie_url: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  reviewed_by: number | null;
  reviewed_at: string | null;
  submitted_at: string;
  updated_at: string;
}

export interface AdminDashboardStats {
  users: {
    total: number;
    active: number;
    verified: number;
    recentSignups: number;
  };
  kyc: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    recentSubmissions: number;
  };
  deposits: {
    total: number;
    count: number;
  };
}

class AdminKYCService {

  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('accessToken');

    if (!token) {
      console.error('❌ No admin token found');
      throw new Error('No authentication token found. Please login again.');
    }

    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }
  
  

  async getPendingKYC(): Promise<AdminKYCSubmission[]> {
    const url = `${API_BASE_URL}/admin/kyc/pending`;

    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        errorMessage = `${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    return result.data;
  }

 async getAllKYC(params: {
  status?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<AdminKYCSubmission[]> {
  const queryParams = new URLSearchParams();
  
  // Only add params if they exist and status is not 'all'
  if (params.status && params.status !== 'all') {
    queryParams.append('status', params.status);
  }
  
  if (params.limit) {
    queryParams.append('limit', params.limit.toString());
  }
  
  if (params.offset) {
    queryParams.append('offset', params.offset.toString());
  }

  // ✅ FIXED - calling correct endpoint
  const url = `${API_BASE_URL}/admin/kyc/all${queryParams.toString() ? `?${queryParams}` : ''}`;

  console.log('🔗 Calling URL:', url); // Debug log

  const response = await fetch(url, {
    headers: this.getAuthHeaders(),
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch {
      errorMessage = `${response.status} ${response.statusText}`;
    }
    throw new Error(errorMessage);
  }

  const result = await response.json();
  console.log('✅ getAllKYC returned:', result.data?.length, 'records'); // Debug log
  return result.data;
}


// Add this method to AdminKYCService class (around line 550)

async getKYCById(id: string): Promise<AdminKYCSubmission> {
  const url = `${API_BASE_URL}/admin/kyc/${id}`;

  const response = await fetch(url, {
    headers: this.getAuthHeaders(),
  });


  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch {
      errorMessage = `${response.status} ${response.statusText}`;
    }
    throw new Error(errorMessage);
  }

  const result = await response.json();
  return result.data;
}

  async approveKYC(id: string, adminNotes?: string): Promise<void> {
    const url = `${API_BASE_URL}/admin/kyc/${id}/approve`;

    const response = await fetch(url, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ admin_notes: adminNotes }),
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        errorMessage = `${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }
  }

  async rejectKYC(id: string, reason: string): Promise<void> {
    const url = `${API_BASE_URL}/admin/kyc/${id}/reject`;

    const response = await fetch(url, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ reason }),
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        errorMessage = `${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }
  }

  async getDashboardStats(): Promise<AdminDashboardStats> {
    const url = `${API_BASE_URL}/admin/dashboard/stats`;

    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        errorMessage = `${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    return result.data;
  }
}

export const adminKYCAPI = new AdminKYCService();


export interface AdminUser {
  id: number;
  email: string;
  full_name: string;
  phone: string;
  kyc_status: 'pending' | 'approved' | 'rejected';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  balance: string | number | null;
  available_balance: string | number | null;
  invested_balance: string | number | null;
  active_investments: number;
}

export interface AdminUserDetail {
  user: {
    id: number;
    email: string;
    full_name: string;
    phone: string;
    kyc_status: 'pending' | 'approved' | 'rejected';
    is_active: boolean;
    referral_code: string;
    referred_by: number | null;
    created_at: string;
    updated_at: string;
    balance: string | number | null;
    available_balance: string | number | null;
    invested_balance: string | number | null;
    balance_updated_at: string;
  };
  stats: {
    investments: {
      active_count: number;
      total_invested: string | number | null;
      total_completed: string | number | null;
    };
    withdrawals: {
      total_count: number;
      pending_count: number;
      completed_count: number;
      total_withdrawn: string | number | null;
    };
    total_profit: string | number;
  };
  active_investment: {
    id: number;
    amount: number;
    level: number;
    profit_rate: number;
    status: string;
    created_at: string;
    next_profit_date: string;
  } | null;
}

export interface LedgerEntry {
  id: number;
  user_id: number;
  transaction_type: 'deposit' | 'withdrawal' | 'investment' | 'profit' | 'referral_commission' | 'refund' | 'adjustment';
  amount: string | number;
  balance_before: string | number;
  balance_after: string | number;
  chain: 'TRC20' | 'BEP20' | null;
  reference_type: string | null;
  reference_id: number | null;
  description: string;
  metadata: any;
  created_at: string;
}
export interface LedgerResponse {
  entries: LedgerEntry[];
  total: number;
  limit: number;
  offset: number;
  summary: {
    transaction_type: string;
    count: number;
    total_amount: number;
  }[];
}

class AdminUserService {
  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('accessToken');

    if (!token) {
      console.error('❌ No admin token found');
      throw new Error('No authentication token found. Please login again.');
    }

    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  // Get all users with filters
  async getAllUsers(params: {
    search?: string;
    kyc_status?: string;
    limit?: number;
    offset?: number;
    sort?: string;
  } = {}): Promise<{
    users: AdminUser[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, value.toString());
      }
    });

    const url = `${API_BASE_URL}/admin/users${queryParams.toString() ? `?${queryParams}` : ''}`;

    console.log('🔗 Calling URL:', url);

    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        errorMessage = `${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('✅ getAllUsers returned:', result.data);
    return result.data;
  }

  // Get user by ID with detailed info
  async getUserById(id: string): Promise<AdminUserDetail> {
    const url = `${API_BASE_URL}/admin/users/${id}`;

    console.log('🔗 Calling URL:', url);

    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        errorMessage = `${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('✅ getUserById returned:', result.data);
    return result.data;
  }

  // Get user statistics
  async getUserStats(): Promise<{
    total_users: number;
    active_users: number;
    verified_users: number;
    pending_kyc: number;
    recent_signups: number;
    monthly_signups: number;
  }> {
    const url = `${API_BASE_URL}/admin/users/stats`;

    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        errorMessage = `${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    return result.data;
  }

  // Get user ledger entries (transaction history)
  async getUserLedger(userId: string, params: {
    transaction_type?: string;
    limit?: number;
    offset?: number;
    sort?: string;
  } = {}): Promise<LedgerResponse> {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, value.toString());
      }
    });

    const url = `${API_BASE_URL}/admin/users/${userId}/ledger${queryParams.toString() ? `?${queryParams}` : ''}`;

    console.log('🔗 Calling URL:', url);

    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        errorMessage = `${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('✅ getUserLedger returned:', result.data);
    return result.data;
  }

  // Get single ledger entry by ID
  async getLedgerEntryById(id: string): Promise<LedgerEntry> {
    const url = `${API_BASE_URL}/admin/ledger/${id}`;

    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        errorMessage = `${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    return result.data;
  }
}

export const adminUserAPI = new AdminUserService();
export interface AdminAuthResponse {
  admin: {
    id: number;
    email: string;
    full_name: string;
    is_admin: boolean;
  };
  accessToken: string;
  refreshToken: string;
}

class AdminAuthService {
  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('accessToken');

    if (!token) {
      throw new Error('No authentication token found. Please login again.');
    }

    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  private setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  private clearTokens(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('admin');
  }

  // Admin Login
  async login(email: string, password: string): Promise<AdminAuthResponse> {
    const response = await fetch(`${API_BASE_URL}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const result: ApiResponse<AdminAuthResponse> = await response.json();

    if (!response.ok || result.status === 'error') {
      throw new Error(result.message || 'Admin login failed');
    }

    if (result.data) {
      this.setTokens(result.data.accessToken, result.data.refreshToken);
      localStorage.setItem('admin', JSON.stringify(result.data.admin));
    }

    return result.data!;
  }

  // Admin Logout
  logout(): void {
    this.clearTokens();
  }

  // Check if admin is authenticated
  isAuthenticated(): boolean {
    const token = localStorage.getItem('accessToken');
    const admin = localStorage.getItem('admin');
    return !!(token && admin);
  }

  // Get admin profile from localStorage
  getAdmin(): AdminAuthResponse['admin'] | null {
    const adminStr = localStorage.getItem('admin');
    if (!adminStr) return null;
    try {
      return JSON.parse(adminStr);
    } catch {
      return null;
    }
  }

  // Verify admin token (optional - for protected routes)
  async verifyToken(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/dashboard/stats`, {
        headers: this.getAuthHeaders(),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const adminAuthAPI = new AdminAuthService();
class AdminDepositService {
  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('accessToken');

    if (!token) {
      console.error('❌ No admin token found');
      throw new Error('No authentication token found. Please login again.');
    }

    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  async getAllDeposits(params: {
    limit?: number;
    offset?: number;
    status?: string;
    chain?: string;
    user_id?: string;
  } = {}): Promise<{
    deposits: AdminDepositDetail[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) queryParams.append(key, value.toString());
    });

    const url = `${API_BASE_URL}/deposits/admin/all${queryParams.toString() ? `?${queryParams}` : ''}`;

    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        errorMessage = `${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    return result.data;
  }

  async getDepositStats(): Promise<AdminDepositStats> {
    const url = `${API_BASE_URL}/deposits/admin/stats`;

    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        errorMessage = `${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    return result.data;
  }

  async getDepositById(id: string): Promise<AdminDepositDetail> {
    const url = `${API_BASE_URL}/deposits/admin/${id}`;

    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        errorMessage = `${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    return result.data;
  }

  async confirmDeposit(
    id: string,
    admin_notes?: string
  ): Promise<AdminDepositDetail> {
    const url = `${API_BASE_URL}/deposits/admin/${id}/confirm`;

    const response = await fetch(url, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ admin_notes }),
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        errorMessage = `${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    return result.data;
  }

  async rejectDeposit(id: string, reason: string): Promise<void> {
    const url = `${API_BASE_URL}/deposits/admin/${id}/reject`;

    const response = await fetch(url, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ reason }),
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        errorMessage = `${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }
  }
}

export const adminDepositAPI = new AdminDepositService();
