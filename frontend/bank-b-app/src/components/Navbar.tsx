'use client';

import React from 'react';
import { Landmark, LogOut, RefreshCw, Database, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

interface NavbarProps {
  onRefresh: () => void;
  refreshing: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onRefresh, refreshing }) => {
  const { user, account, logout } = useAuthStore();

  return (
    <header className="border-b border-white/10 bg-slate-950/70 backdrop-blur-2xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        {/* Brand & ACID Status Badge */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-xl shadow-purple-500/10">
            <Landmark size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white">
                BANK B
              </span>
              <span className="badge-bank-b">MOCKBANK</span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
              <Database size={12} className="text-emerald-400 animate-pulse" />
              <span className="text-slate-300 font-medium">PostgreSQL 17 • ACID Real-Time DB</span>
            </div>
          </div>
        </div>

        {/* User Info, Live Balance & Sign Out */}
        {user && account && (
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="hidden lg:block text-right">
              <div className="text-sm font-semibold text-slate-100 flex items-center justify-end gap-1">
                <span>{user.fullName}</span>
                <ShieldCheck size={14} className="text-purple-400" />
              </div>
              <div className="text-xs font-mono text-purple-400">
                {account.accountNumber} • {user.phoneNumber}
              </div>
            </div>

            {/* Compact Live Balance Pill */}
            <div className="bg-slate-900/90 border border-white/10 rounded-2xl px-4 py-2 flex items-center gap-3 shadow-lg">
              <div>
                <div className="text-[10px] uppercase font-semibold text-slate-400">
                  Live DB Balance
                </div>
                <div className="font-mono font-extrabold text-base sm:text-lg text-emerald-400">
                  ${Number(account.balance || 0).toFixed(2)} USD
                </div>
              </div>
              <button
                type="button"
                onClick={onRefresh}
                disabled={refreshing}
                title="Sync from PostgreSQL Database"
                className="p-2 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition"
              >
                <RefreshCw
                  size={16}
                  className={refreshing ? 'animate-spin text-purple-400' : ''}
                />
              </button>
            </div>

            <button
              type="button"
              onClick={logout}
              className="p-2.5 sm:p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition flex items-center gap-1.5"
              title="Sign Out"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline text-xs font-semibold">Logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
