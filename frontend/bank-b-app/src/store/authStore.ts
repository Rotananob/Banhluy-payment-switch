import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
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
    }),
    {
      name: 'bank-b-auth-storage',
      // ONLY persist tokens so account balance is NEVER cached in localStorage!
      // All balances and transactions are fetched LIVE from real PostgreSQL database!
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);
