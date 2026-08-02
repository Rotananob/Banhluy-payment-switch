'use client';

import React from 'react';
import { Landmark, Wifi, ShieldCheck, Database } from 'lucide-react';
import { motion } from 'framer-motion';

interface VirtualCardProps {
  accountNumber?: string;
  ownerName?: string;
  balance?: number;
  phoneNumber?: string;
  bankName?: string;
  themeColor?: 'blue' | 'purple';
}

export const VirtualCard: React.FC<VirtualCardProps> = ({
  accountNumber = 'BA-00000000',
  ownerName = 'VALUED MEMBER',
  balance = 0,
  phoneNumber = '+855 XX XXX XXX',
  bankName = 'BANK A — BANHLUY',
  themeColor = 'blue',
}) => {
  const isBlue = themeColor === 'blue';

  return (
    <motion.div
      whileHover={{ y: -6, rotateX: 3, rotateY: -3 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className={`relative w-full max-w-[420px] aspect-[1.586/1] rounded-3xl p-6 sm:p-7 flex flex-col justify-between overflow-hidden shadow-2xl cursor-pointer select-none ${
        isBlue
          ? 'bg-gradient-to-br from-blue-600 via-blue-900 to-slate-950 border border-blue-400/30 shadow-blue-500/20'
          : 'bg-gradient-to-br from-purple-600 via-purple-950 to-slate-950 border border-purple-400/30 shadow-purple-500/20'
      }`}
    >
      {/* Shimmer / Hologram Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.18)_0%,transparent_50%)] pointer-events-none" />
      <div className="absolute -right-20 -bottom-20 w-64 h-64 rounded-full bg-white/5 blur-3xl pointer-events-none" />

      {/* Top Row: Brand & Contactless Icon */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isBlue
                ? 'bg-blue-500/30 border border-blue-400/40 text-blue-200'
                : 'bg-purple-500/30 border border-purple-400/40 text-purple-200'
            }`}
          >
            <Landmark size={22} />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-extrabold tracking-widest uppercase text-white drop-shadow-md">
              {bankName}
            </div>
            <div className="text-[10px] font-mono uppercase text-slate-300 flex items-center gap-1">
              <Database size={10} className="text-emerald-400 animate-pulse" />
              <span>ACID PostgreSQL Ledger</span>
            </div>
          </div>
        </div>

        <div className="text-white/80">
          <Wifi size={24} className="rotate-90" />
        </div>
      </div>

      {/* EMV Chip & Account Number */}
      <div className="space-y-3 my-2 relative z-10">
        <div className="w-12 h-9 rounded-lg bg-gradient-to-tr from-amber-500 via-yellow-200 to-amber-600 border border-amber-300/60 shadow-md flex items-center justify-center">
          <div className="w-8 h-5 border border-amber-800/40 rounded-sm grid grid-cols-2 gap-0.5 opacity-70" />
        </div>

        <div>
          <div className="text-[10px] uppercase font-semibold text-slate-300 tracking-widest">
            Cambodia National Account Number
          </div>
          <div className="font-mono text-lg sm:text-2xl font-bold tracking-[0.15em] text-white drop-shadow">
            {accountNumber}
          </div>
        </div>
      </div>

      {/* Bottom Row: Owner & Balance */}
      <div className="flex items-end justify-between relative z-10 pt-2 border-t border-white/10">
        <div>
          <div className="text-[10px] uppercase font-semibold text-slate-300 tracking-wider">
            Cardholder Name
          </div>
          <div className="font-bold text-sm sm:text-base text-white uppercase tracking-wide truncate max-w-[180px]">
            {ownerName}
          </div>
          <div className="text-[11px] font-mono text-slate-300 mt-0.5">
            {phoneNumber}
          </div>
        </div>

        <div className="text-right">
          <div className="text-[10px] uppercase font-semibold text-emerald-300 flex items-center justify-end gap-1">
            <ShieldCheck size={12} />
            <span>Live Balance</span>
          </div>
          <div className="font-mono text-xl sm:text-2xl font-extrabold text-white drop-shadow-lg">
            ${Number(balance || 0).toFixed(2)}
            <span className="text-xs font-sans font-medium text-slate-300 ml-1">
              USD
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
