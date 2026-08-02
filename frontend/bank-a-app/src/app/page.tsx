'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { AuthModal } from '@/components/AuthModal';
import { Navbar } from '@/components/Navbar';
import { Dashboard } from '@/components/Dashboard';
import { getProfileApi } from '@/lib/api';
import toast from 'react-hot-toast';

export default function HomePage() {
  const { isAuthenticated, setAuth, logout, user, account } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const refreshAccount = useCallback(async () => {
    if (!isAuthenticated) return;
    setRefreshing(true);
    try {
      const res = await getProfileApi();
      if (res.user && res.account) {
        setAuth(res.user, res.account, useAuthStore.getState().accessToken || '', useAuthStore.getState().refreshToken || '');
      }
    } catch (err) {
      // Don't toast on auto refresh error
    } finally {
      setRefreshing(false);
    }
  }, [isAuthenticated, setAuth]);

  useEffect(() => {
    if (mounted && isAuthenticated) {
      refreshAccount();
    }
  }, [mounted, isAuthenticated, refreshAccount]);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        Loading BanhLuy Banking System...
      </div>
    );
  }

  if (!isAuthenticated || !user || !account) {
    return <AuthModal />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar onRefresh={refreshAccount} refreshing={refreshing} />
      <main className="flex-1">
        <Dashboard onBalanceChange={refreshAccount} />
      </main>
      <footer className="border-t border-white/5 py-6 text-center text-xs text-slate-500">
        BanhLuy Dual-Bank Interoperability Ecosystem — Bank A Sapphire System © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
