'use client';

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Landmark, KeyRound, Phone, User, ArrowRight, Shield } from 'lucide-react';
import { loginApi, registerApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const PRESET_USERS = [
  {
    label: 'Bank A User One ($1,000+)',
    phone: '+85511111111',
    pin: '1234',
  },
  {
    label: 'Bank A User Two ($500)',
    phone: '+85511111112',
    pin: '5678',
  },
];

export const AuthModal: React.FC = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('+85511111111');
  const [pin, setPin] = useState('1234');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  const { setAuth } = useAuthStore();

  const handleQuickFill = (phone: string, presetPin: string) => {
    setPhoneNumber(phone);
    setPin(presetPin);
    toast.success(`Loaded test account ${phone}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber || !pin) {
      toast.error('Please provide phone number and PIN');
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        if (!fullName) {
          toast.error('Please provide your full name');
          setLoading(false);
          return;
        }
        const res = await registerApi(phoneNumber, pin, fullName, 'BANK_A');
        setAuth(res.user, res.account, res.accessToken, res.refreshToken);
        toast.success(`Account registered! Welcome, ${res.user.fullName}`);
      } else {
        const res = await loginApi(phoneNumber, pin, 'BANK_A');
        setAuth(res.user, res.account, res.accessToken, res.refreshToken);
        toast.success(`Welcome back, ${res.user.fullName}!`);
      }
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message ||
        'Authentication failed. Verify credentials.';
      toast.error(
        Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="glass-card glow-card w-full max-w-md p-8 relative overflow-hidden">
        {/* Decorative Top Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-blue-400 to-emerald-400" />

        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 mx-auto mb-4 shadow-xl shadow-blue-500/10">
            <Landmark size={30} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {isRegister ? 'Create Sapphire Account' : 'Sign In to Bank A'}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {isRegister
              ? 'Join the Dual-Bank Interoperability Ecosystem'
              : 'Enter your phone number and PIN to access your account'}
          </p>
        </div>

        {/* Quick Test Accounts */}
        {!isRegister && (
          <div className="mb-6 bg-slate-900/60 border border-white/10 rounded-xl p-3">
            <div className="text-[11px] font-mono uppercase text-slate-400 mb-2 flex items-center gap-1">
              <Shield size={12} className="text-blue-400" />
              <span>Quick-Test Seeded Accounts</span>
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {PRESET_USERS.map((item) => (
                <button
                  key={item.phone}
                  type="button"
                  onClick={() => handleQuickFill(item.phone, item.pin)}
                  className="text-left text-xs bg-white/5 hover:bg-blue-500/20 border border-white/5 hover:border-blue-500/40 rounded-lg px-3 py-2 flex items-center justify-between transition"
                >
                  <span className="font-semibold text-slate-200">
                    {item.label}
                  </span>
                  <span className="font-mono text-blue-400">{item.phone}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                Full Name
              </label>
              <div className="relative">
                <User
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Sokha Chan"
                  className="input-field !pl-10"
                  required={isRegister}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
              Cambodian Phone Number
            </label>
            <div className="relative">
              <Phone
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+855XXXXXXXXX"
                className="input-field !pl-10 font-mono"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
              4-6 Digit Security PIN
            </label>
            <div className="relative">
              <KeyRound
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                maxLength={6}
                className="input-field !pl-10 font-mono tracking-widest"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full mt-2"
          >
            <span>{loading ? 'Authenticating...' : isRegister ? 'Register & Open Account' : 'Sign In Now'}</span>
            <ArrowRight size={18} />
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-400">
          {isRegister ? 'Already have an account?' : 'Need a new account?'}{' '}
          <button
            type="button"
            onClick={() => setIsRegister(!isRegister)}
            className="text-blue-400 hover:text-blue-300 font-semibold underline underline-offset-4"
          >
            {isRegister ? 'Sign In' : 'Register Now'}
          </button>
        </div>
      </div>
    </div>
  );
};
