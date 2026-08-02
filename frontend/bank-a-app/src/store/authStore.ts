import { create } from 'zustand';

export interface UserProfile {
  id: string;
  fullName: string;
  phoneNumber: string;
  bankType: 'BANK_A' | 'BANK_B';
}

export interface BankAccount {
  id: string;
  accountNumber: string;
  balance: number;
  balanceCents: string;
  currency: string;
}

interface AuthState {
  user: UserProfile | null;
  account: BankAccount | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (
    user: UserProfile,
    account: BankAccount,
    accessToken: string,
    refreshToken: string
  ) => void;
  updateAccount: (account: BankAccount) => void;
  logout: () => void;
}

// 100% IN-MEMORY ZUSTAND STORE — ZERO LOCALSTORAGE PER RULE 1
// All balances, transactions, and profiles are fetched LIVE from PostgreSQL via HTTP Axios.
export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  account: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  setAuth: (user, account, accessToken, refreshToken) =>
    set({
      user,
      account,
      accessToken,
      refreshToken,
      isAuthenticated: true,
    }),
  updateAccount: (account) => set({ account }),
  logout: () =>
    set({
      user: null,
      account: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    }),
}));
