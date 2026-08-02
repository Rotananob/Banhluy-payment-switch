'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Landmark,
  CreditCard,
  DollarSign,
  CheckCircle2,
  RefreshCw,
  Terminal,
  Printer,
  Sparkles,
} from 'lucide-react';
import { depositToAccount, AtmDepositResponse } from '@/lib/api';

const PRESET_ACCOUNTS = [
  {
    accountNumber: 'BA-00000001',
    name: 'Bank A User One',
    bank: 'BANK_A',
    badgeColor: '#2563EB',
  },
  {
    accountNumber: 'BB-00000001',
    name: 'Bank B User One',
    bank: 'BANK_B',
    badgeColor: '#7C3AED',
  },
];

const PRESET_AMOUNTS = [10, 20, 50, 100, 200, 500];

export default function AtmPage() {
  const [accountNumber, setAccountNumber] = useState('BA-00000001');
  const [amount, setAmount] = useState<number | ''>(100);
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState<AtmDepositResponse | null>(null);

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountNumber || !amount || Number(amount) <= 0) {
      toast.error('Please enter a valid account number and amount (> $0)');
      return;
    }

    setLoading(true);
    setReceipt(null);
    try {
      const result = await depositToAccount(accountNumber, Number(amount));
      setReceipt(result);
      toast.success(
        `Successfully deposited $${result.amount.toFixed(2)} to ${result.accountHolder}`
      );
    } catch (err: any) {
      const raw = err.response?.data?.message;
      const errorMsg = Array.isArray(raw)
        ? raw.join(', ')
        : typeof raw === 'string'
          ? raw
          : 'Deposit failed. Check account number.';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setReceipt(null);
  };

  return (
    <main className="atm-frame">
      {/* ATM Header */}
      <header className="atm-header">
        <div className="atm-logo">
          <Terminal className="text-emerald-400" size={28} />
          <span>BANHLUY ATM KIOSK</span>
        </div>
        <div className="atm-status-badge">
          <div className="status-dot" />
          <span>ACID SYSTEM ONLINE</span>
        </div>
      </header>

      {/* ATM Main Display Area */}
      <div className="atm-body">
        {/* Left Panel: Display Screen or Printed Receipt */}
        <div className="screen-panel">
          <AnimatePresence mode="wait">
            {!receipt ? (
              <motion.div
                key="screen"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col justify-between h-full"
              >
                <div>
                  <div className="flex items-center gap-2 text-emerald-400 font-mono text-sm mb-2">
                    <Sparkles size={16} />
                    <span>SYSTEM READY // INSERT DEPOSIT INSTRUMENT</span>
                  </div>
                  <h1 className="text-2xl font-bold mb-4">
                    Instant Cash Deposit
                  </h1>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Select a target bank account or enter manually below. Your deposit
                    is executed immediately inside an atomic Postgres transaction.
                  </p>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 my-4">
                  <div className="text-xs font-mono text-slate-500 uppercase mb-2">
                    Selected Destination
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-mono text-lg font-bold text-emerald-400">
                        {accountNumber || 'NO ACCOUNT SELECTED'}
                      </div>
                      <div className="text-sm text-slate-300">
                        Amount: ${Number(amount || 0).toFixed(2)}
                      </div>
                    </div>
                    <Landmark size={32} className="text-slate-600" />
                  </div>
                </div>

                <div className="text-xs font-mono text-slate-500">
                  CLEARING HOUSE INTEROPERABILITY VERIFIED
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="receipt"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                className="receipt-card"
              >
                <div className="receipt-header">
                  <Printer
                    size={28}
                    className="mx-auto mb-2 text-emerald-600"
                  />
                  <div className="font-bold text-lg">BANHLUY ATM RECEIPT</div>
                  <div className="text-xs text-slate-500">
                    TRANSACTION COMPLETED
                  </div>
                </div>

                <div className="receipt-row">
                  <span>TX ID</span>
                  <span className="font-mono text-xs">
                    {receipt.depositId.slice(0, 13)}...
                  </span>
                </div>
                <div className="receipt-row">
                  <span>ACCOUNT</span>
                  <span className="font-bold">{receipt.accountNumber}</span>
                </div>
                <div className="receipt-row">
                  <span>HOLDER</span>
                  <span>{receipt.accountHolder}</span>
                </div>
                <div className="receipt-row">
                  <span>BANK</span>
                  <span>{receipt.bankType}</span>
                </div>
                <div className="receipt-row">
                  <span>AMOUNT</span>
                  <span className="text-emerald-600 font-bold">
                    +${receipt.amount.toFixed(2)}
                  </span>
                </div>

                <div className="receipt-total">
                  <div className="flex justify-between">
                    <span>NEW BALANCE</span>
                    <span>${receipt.newBalance.toFixed(2)} USD</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleReset}
                  className="mt-6 w-full bg-slate-900 text-white rounded-lg py-2 text-sm font-sans flex items-center justify-center gap-2 hover:bg-slate-800 transition"
                >
                  <RefreshCw size={16} />
                  <span>New Transaction</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Panel: Keypad & Input Controls */}
        <form onSubmit={handleDeposit} className="keypad-panel">
          {/* Quick Select Accounts */}
          <div className="input-group">
            <span className="input-label">Quick-Select Account</span>
            <div className="preset-accounts">
              {PRESET_ACCOUNTS.map((acc) => (
                <div
                  key={acc.accountNumber}
                  onClick={() => setAccountNumber(acc.accountNumber)}
                  className={`preset-card ${
                    accountNumber === acc.accountNumber
                      ? acc.bank === 'BANK_A'
                        ? 'selected-a'
                        : 'selected-b'
                      : ''
                  }`}
                >
                  <div className="text-xs font-mono text-slate-400">
                    {acc.accountNumber}
                  </div>
                  <div className="font-bold text-sm text-white">
                    {acc.name}
                  </div>
                  <div
                    className="text-[10px] uppercase mt-1 font-semibold inline-block px-1.5 py-0.5 rounded"
                    style={{
                      backgroundColor: `${acc.badgeColor}22`,
                      color: acc.badgeColor,
                    }}
                  >
                    {acc.bank}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Account Number Input */}
          <div className="input-group">
            <label className="input-label" htmlFor="accountNumber">
              Account Number
            </label>
            <input
              id="accountNumber"
              type="text"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="BA-XXXXXXXX or BB-XXXXXXXX"
              className="atm-input"
              required
            />
          </div>

          {/* Amount Quick Select */}
          <div className="input-group">
            <span className="input-label">Select Amount (USD)</span>
            <div className="amount-grid">
              {PRESET_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setAmount(amt)}
                  className="amount-btn"
                >
                  ${amt}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Amount Input */}
          <div className="input-group">
            <label className="input-label" htmlFor="amount">
              Custom Amount
            </label>
            <div className="relative">
              <DollarSign
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) =>
                  setAmount(e.target.value === '' ? '' : Number(e.target.value))
                }
                placeholder="0.00"
                className="atm-input !pl-10"
                required
              />
            </div>
          </div>

          {/* Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="deposit-btn mt-2"
          >
            {loading ? (
              <RefreshCw size={22} className="animate-spin" />
            ) : (
              <CreditCard size={22} />
            )}
            <span>{loading ? 'Processing Deposit...' : 'Deposit Funds Now'}</span>
          </button>
        </form>
      </div>
    </main>
  );
}
