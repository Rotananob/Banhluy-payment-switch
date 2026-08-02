import axios from 'axios';
import { useAuthStore, UserProfile, BankAccount } from '@/store/authStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT access token to requests
apiClient.interceptors.request.use(
  (config) => {
    const { accessToken } = useAuthStore.getState();
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle 401 Unauthorized (auto-logout if token is expired/invalid)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export interface AuthResponse {
  user: UserProfile;
  account: BankAccount;
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface TransactionItem {
  id: string;
  type: string;
  amount: number;
  amountCents: string;
  currency: string;
  direction: 'CREDIT' | 'DEBIT';
  counterpartyAccount?: string;
  counterpartyName?: string;
  counterpartyBank?: string;
  reference?: string;
  description?: string;
  createdAt: string;
}

export interface TransactionsResponse {
  data: TransactionItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// AUTH API
export const loginApi = async (
  phoneNumber: string,
  pin: string,
  bankType: 'BANK_A' | 'BANK_B' = 'BANK_A'
): Promise<AuthResponse> => {
  const res = await apiClient.post<AuthResponse>('/auth/login', {
    phoneNumber,
    pin,
    bankType,
  });
  return res.data;
};

export const registerApi = async (
  phoneNumber: string,
  pin: string,
  fullName: string,
  bankType: 'BANK_A' | 'BANK_B' = 'BANK_A'
): Promise<AuthResponse> => {
  const res = await apiClient.post<AuthResponse>('/auth/register', {
    phoneNumber,
    pin,
    fullName,
    bankType,
  });
  return res.data;
};

// BANK A API
export const getProfileApi = async () => {
  const res = await apiClient.get('/bank-a/profile');
  return res.data;
};

export const getTransactionsApi = async (page = 1, limit = 20): Promise<TransactionsResponse> => {
  const res = await apiClient.get<TransactionsResponse>(`/bank-a/transactions?page=${page}&limit=${limit}`);
  return res.data;
};

export const transferIntraBankApi = async (
  toAccountNumber: string,
  amount: number,
  description?: string
) => {
  const res = await apiClient.post('/bank-a/transfer', {
    toAccountNumber,
    amount,
    description,
  });
  return res.data;
};

// CENTRAL SWITCH KHQR & CROSS-BANK API
export const generateKhqrApi = async (amount: number) => {
  const res = await apiClient.post('/central-switch/khqr/generate', { amount });
  return res.data;
};

export const decodeKhqrApi = async (payload: string) => {
  const res = await apiClient.post('/central-switch/khqr/decode', { payload });
  return res.data;
};

export const payCrossBankApi = async (khqrPayload: string, pin: string) => {
  const res = await apiClient.post('/central-switch/pay', {
    khqrPayload,
    pin,
  });
  return res.data;
};
