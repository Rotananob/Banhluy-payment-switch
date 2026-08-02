'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { AuthModal } from '@/components/AuthModal';
import { Navbar } from '@/components/Navbar';
import { Dashboard } from '@/components/Dashboard';
import { getProfileApi } from '@/lib/api';
import { Database, ShieldCheck } from 'lucide-react';

export default function HomePage() {
  const { isAuthenticated, setAuth, logout, user, account, accessToken } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  const refreshAccount = useCallback(async () => {
    if (!accessToken) {
      setInitialLoading(false);
      return;
    }
    setRefreshing(true);
    try {
      const res = await getProfileApi();
      if (res.user && res.account) {
        setAuth(
          res.user,
          res.account,
          useAuthStore.getState().accessToken || '',
          useAuthStore.getState().refreshToken || ''
        );
      }
    } catch (err) {
      logout();
    } finally {
      setRefreshing(false);
      setInitialLoading(false);
    }
  }, [accessToken, setAuth, logout]);

  useEffect(() => {
    if (mounted) {
      if (accessToken) {
        refreshAccount();
      } else {
        setInitialLoading(false);
      }
    }
  }, [mounted, accessToken, refreshAccount]);

  if (!mounted || (initialLoading && accessToken)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 mb-4 animate-bounce">
          <Database size={28} />
        </div>
        <div className="text-base font-bold text-white">
          Connecting to Real PostgreSQL 17 Database...
        </div>
        <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
          <ShieldCheck size={14} className="text-emerald-400" />
          <span>Verifying ACID Ledger • Zero localStorage caching</span>
        </div>
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
      <footer className="border-t border-white/5 py-6 text-center text-xs text-slate-500 font-mono">
        BanhLuy Dual-Bank Interoperability Ecosystem — Bank A Sapphire System © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
