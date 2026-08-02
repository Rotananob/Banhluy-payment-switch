'use client';

import React from 'react';
import { Landmark, LogOut, RefreshCw, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

interface NavbarProps {
  onRefresh: () => void;
  refreshing: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onRefresh, refreshing }) => {
  const { user, account, logout } = useAuthStore();

  return (
    <header className="border-b border-white/10 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-500 shadow-lg shadow-blue-500/10">
            <Landmark size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-white">
                BANK A
              </span>
              <span className="badge-bank-a">SAPPHIRE</span>
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-1">
              <ShieldCheck size={12} className="text-emerald-400" />
              <span>ACID Core & KHQR Switch Enabled</span>
            </div>
          </div>
        </div>

        {/* User Info & Balance */}
        {user && account && (
          <div className="flex items-center gap-6">
            <div className="hidden md:block text-right">
              <div className="text-sm font-semibold text-slate-200">
                {user.fullName}
              </div>
              <div className="text-xs font-mono text-blue-400">
                {account.accountNumber} • {user.phoneNumber}
              </div>
            </div>

            <div className="bg-slate-950/80 border border-white/10 rounded-xl px-4 py-2 flex items-center gap-3">
              <div>
                <div className="text-[10px] uppercase font-semibold text-slate-400">
                  Available Balance
                </div>
                <div className="font-mono font-bold text-lg text-emerald-400">
                  ${Number(account.balance || 0).toFixed(2)} USD
                </div>
              </div>
              <button
                type="button"
                onClick={onRefresh}
                disabled={refreshing}
                title="Refresh Balance"
                className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition"
              >
                <RefreshCw
                  size={16}
                  className={refreshing ? 'animate-spin' : ''}
                />
              </button>
            </div>

            <button
              type="button"
              onClick={logout}
              className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition"
              title="Sign Out"
            >
              <LogOut size={18} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
