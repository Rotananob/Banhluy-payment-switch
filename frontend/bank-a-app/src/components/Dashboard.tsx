'use client';

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { QRCodeCanvas } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  QrCode,
  ScanLine,
  History,
  ArrowUpRight,
  ArrowDownLeft,
  Copy,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  ShieldCheck,
  Database,
  ArrowRight,
  CreditCard,
} from 'lucide-react';
import {
  getTransactionsApi,
  transferIntraBankApi,
  generateKhqrApi,
  decodeKhqrApi,
  payCrossBankApi,
  TransactionItem,
} from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { VirtualCard } from './VirtualCard';

export const Dashboard: React.FC<{ onBalanceChange: () => void }> = ({
  onBalanceChange,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'transfer' | 'receive' | 'scan'>('overview');
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);

  // Transfer state
  const [toAccount, setToAccount] = useState('BA-00000002');
  const [transferAmount, setTransferAmount] = useState<number | ''>(50);
  const [transferDesc, setTransferDesc] = useState('Coffee share');
  const [transferring, setTransferring] = useState(false);

  // Receive (KHQR generate) state
  const [receiveAmount, setReceiveAmount] = useState<number | ''>(15.0);
  const [generatedQr, setGeneratedQr] = useState<any | null>(null);
  const [generatingQr, setGeneratingQr] = useState(false);

  // Scan & Pay state
  const [khqrPayload, setKhqrPayload] = useState('');
  const [decodedKhqr, setDecodedKhqr] = useState<any | null>(null);
  const [decoding, setDecoding] = useState(false);
  const [payPin, setPayPin] = useState('1234');
  const [paying, setPaying] = useState(false);

  const { user, account } = useAuthStore();

  const loadTransactions = async () => {
    setLoadingTx(true);
    try {
      const res = await getTransactionsApi(1, 20);
      setTransactions(res.data || []);
    } catch (err) {
      toast.error('Failed to load transaction history from PostgreSQL');
    } finally {
      setLoadingTx(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [activeTab]);

  // Handle Intra-Bank Transfer
  const handleIntraTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toAccount || !transferAmount || Number(transferAmount) <= 0) {
      toast.error('Enter a valid Bank A account number and amount');
      return;
    }

    setTransferring(true);
    try {
      await transferIntraBankApi(
        toAccount,
        Number(transferAmount),
        transferDesc
      );
      toast.success(`Transferred $${Number(transferAmount).toFixed(2)} to ${toAccount}`);
      onBalanceChange();
      loadTransactions();
      setToAccount('BA-00000002');
      setTransferAmount(50);
    } catch (err: any) {
      const raw = err.response?.data?.message;
      const msg = Array.isArray(raw) ? raw.join(', ') : typeof raw === 'string' ? raw : 'Transfer failed';
      toast.error(msg);
    } finally {
      setTransferring(false);
    }
  };

  // Handle KHQR Generation
  const handleGenerateQr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiveAmount || Number(receiveAmount) <= 0) {
      toast.error('Enter valid amount for KHQR');
      return;
    }
    setGeneratingQr(true);
    try {
      const res = await generateKhqrApi(Number(receiveAmount));
      setGeneratedQr(res);
      toast.success('KHQR EMVCo code generated from database!');
    } catch (err: any) {
      toast.error('Failed to generate KHQR');
    } finally {
      setGeneratingQr(false);
    }
  };

  // Handle Decode KHQR
  const handleDecodeKhqr = async () => {
    if (!khqrPayload.trim()) {
      toast.error('Please paste a KHQR payload string first');
      return;
    }
    setDecoding(true);
    setDecodedKhqr(null);
    try {
      const res = await decodeKhqrApi(khqrPayload.trim());
      setDecodedKhqr(res);
      toast.success('KHQR decoded successfully!');
    } catch (err: any) {
      toast.error('Invalid KHQR EMVCo payload string');
    } finally {
      setDecoding(false);
    }
  };

  // Handle Cross-Bank Payment
  const handlePayKhqr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!khqrPayload.trim() || !payPin) {
      toast.error('Enter KHQR payload and your PIN');
      return;
    }

    setPaying(true);
    try {
      const res = await payCrossBankApi(khqrPayload.trim(), payPin);
      toast.success(
        `Cross-Bank Transfer Completed! Paid $${res.amount} (+ $${res.fee} switch fee)`
      );
      onBalanceChange();
      loadTransactions();
      setKhqrPayload('');
      setDecodedKhqr(null);
      setActiveTab('overview');
    } catch (err: any) {
      const raw = err.response?.data?.message;
      const msg = Array.isArray(raw) ? raw.join(', ') : typeof raw === 'string' ? raw : 'Payment failed';
      toast.error(msg);
    } finally {
      setPaying(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied EMVCo TLV payload!');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-12">
      {/* Desktop / Tablet Navigation Dock */}
      <div className="hidden md:flex flex-wrap gap-2 mb-8 bg-slate-900/80 p-2 rounded-2xl border border-white/10 shadow-xl">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
        >
          <CreditCard size={18} />
          <span>Overview & Transactions</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('transfer')}
          className={`tab-btn ${activeTab === 'transfer' ? 'active' : ''}`}
        >
          <Send size={18} />
          <span>Intra-Bank Transfer</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('receive')}
          className={`tab-btn ${activeTab === 'receive' ? 'active' : ''}`}
        >
          <QrCode size={18} />
          <span>Generate KHQR (Receive)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('scan')}
          className={`tab-btn ${activeTab === 'scan' ? 'active' : ''}`}
        >
          <ScanLine size={18} />
          <span>Scan & Pay (Cross-Bank)</span>
        </button>
      </div>

      {/* Mobile Bottom Fixed Navigation Bar */}
      <div className="md:hidden mobile-bottom-nav">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`flex flex-col items-center justify-center p-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'overview' ? 'text-blue-400 bg-blue-500/15' : 'text-slate-400'
          }`}
        >
          <CreditCard size={20} />
          <span className="mt-1">Overview</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('transfer')}
          className={`flex flex-col items-center justify-center p-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'transfer' ? 'text-blue-400 bg-blue-500/15' : 'text-slate-400'
          }`}
        >
          <Send size={20} />
          <span className="mt-1">Transfer</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('receive')}
          className={`flex flex-col items-center justify-center p-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'receive' ? 'text-blue-400 bg-blue-500/15' : 'text-slate-400'
          }`}
        >
          <QrCode size={20} />
          <span className="mt-1">Receive</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('scan')}
          className={`flex flex-col items-center justify-center p-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'scan' ? 'text-blue-400 bg-blue-500/15' : 'text-slate-400'
          }`}
        >
          <ScanLine size={20} />
          <span className="mt-1">Scan & Pay</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {/* TAB 1: OVERVIEW & TRANSACTIONS (Responsive 2-column Grid) */}
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
          >
            {/* Left Col: Hologram Card & Quick Action Dock */}
            <div className="lg:col-span-5 space-y-6">
              <div className="flex flex-col items-center lg:items-start">
                <VirtualCard
                  accountNumber={account?.accountNumber}
                  ownerName={user?.fullName}
                  balance={account?.balance}
                  phoneNumber={user?.phoneNumber}
                  bankName="BANK A — BANHLUY"
                  themeColor="blue"
                />
              </div>

              {/* Quick Transfer Shortcut Card */}
              <div className="glass-card p-6 bg-gradient-to-br from-slate-900/90 to-slate-950 border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-xs uppercase font-semibold text-blue-400 flex items-center gap-2">
                    <Sparkles size={14} />
                    <span>Quick Interoperable Actions</span>
                  </div>
                  <span className="text-[10px] bg-emerald-500/15 text-emerald-300 px-2 py-0.5 rounded-full font-mono">
                    Zero Delay
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('transfer')}
                    className="p-4 rounded-2xl bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 text-white font-semibold flex flex-col items-start gap-2 transition"
                  >
                    <Send size={20} className="text-blue-400" />
                    <span className="text-sm">Send Money</span>
                    <span className="text-[11px] text-slate-400">Intra-Bank Transfer</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('scan')}
                    className="p-4 rounded-2xl bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-white font-semibold flex flex-col items-start gap-2 transition"
                  >
                    <ScanLine size={20} className="text-emerald-400" />
                    <span className="text-sm">Scan KHQR</span>
                    <span className="text-[11px] text-slate-400">Pay Cross-Bank</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Col: Live Transaction History from PostgreSQL */}
            <div className="lg:col-span-7 glass-card p-6 sm:p-7">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                    <History className="text-blue-400" size={22} />
                    <span>PostgreSQL Transaction Ledger</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Live ACID database records • Zero localStorage caching
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadTransactions}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1.5 font-semibold bg-blue-500/10 px-3 py-1.5 rounded-xl border border-blue-500/20 w-fit"
                >
                  <RefreshCw
                    size={14}
                    className={loadingTx ? 'animate-spin' : ''}
                  />
                  <span>Sync DB Ledger</span>
                </button>
              </div>

              {loadingTx ? (
                <div className="py-16 text-center text-slate-400 text-sm font-mono">
                  Checking PostgreSQL database transactions...
                </div>
              ) : transactions.length === 0 ? (
                <div className="py-16 text-center text-slate-500 text-sm">
                  No transactions recorded yet in database.
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((tx) => {
                    const isCredit = tx.direction === 'CREDIT';
                    return (
                      <div
                        key={tx.id}
                        className="bg-slate-900/70 border border-white/5 rounded-2xl p-4 flex items-center justify-between hover:border-white/15 transition"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                              isCredit
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : 'bg-red-500/15 text-red-400 border border-red-500/30'
                            }`}
                          >
                            {isCredit ? (
                              <ArrowDownLeft size={22} />
                            ) : (
                              <ArrowUpRight size={22} />
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-white text-sm sm:text-base">
                              {tx.description ||
                                (isCredit ? 'Funds Received' : 'Funds Sent')}
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5 flex flex-wrap items-center gap-2">
                              <span>{new Date(tx.createdAt).toLocaleString()}</span>
                              {tx.counterpartyAccount && (
                                <span className="font-mono text-blue-400 font-semibold">
                                  • {tx.counterpartyAccount}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div
                            className={`font-mono font-extrabold text-base sm:text-lg ${
                              isCredit ? 'text-emerald-400' : 'text-red-400'
                            }`}
                          >
                            {isCredit ? '+' : '-'}${Number(tx.amount).toFixed(2)}
                          </div>
                          <div className="text-[10px] uppercase font-semibold text-slate-400 mt-0.5">
                            {tx.type}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* TAB 2: INTRA-BANK TRANSFER */}
        {activeTab === 'transfer' && (
          <motion.div
            key="transfer"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="max-w-xl mx-auto glass-card p-6 sm:p-8"
          >
            <div className="text-center mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                Intra-Bank Transfer (Bank A)
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Instant ACID transfers inside Bank A with $0.00 fee.
              </p>
            </div>

            <div className="mb-6 bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 flex items-center justify-between">
              <div className="text-xs text-blue-200">
                Test Account Number:{' '}
                <span className="font-mono font-bold">BA-00000002</span>
              </div>
              <button
                type="button"
                onClick={() => setToAccount('BA-00000002')}
                className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 transition"
              >
                Fill BA-00000002
              </button>
            </div>

            <form onSubmit={handleIntraTransfer} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                  Recipient Account Number
                </label>
                <input
                  type="text"
                  value={toAccount}
                  onChange={(e) => setToAccount(e.target.value)}
                  placeholder="BA-XXXXXXXX"
                  className="input-field font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                  Amount (USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={transferAmount}
                  onChange={(e) =>
                    setTransferAmount(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  placeholder="0.00"
                  className="input-field font-mono text-lg font-bold"
                  required
                />
                {/* Preset Amount Pills */}
                <div className="flex flex-wrap gap-2 mt-2.5">
                  {[10, 25, 50, 100, 500].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setTransferAmount(amt)}
                      className="px-3 py-1 rounded-lg bg-white/5 hover:bg-blue-500/20 border border-white/10 text-xs font-mono text-slate-300 font-semibold transition"
                    >
                      +${amt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={transferDesc}
                  onChange={(e) => setTransferDesc(e.target.value)}
                  placeholder="Coffee share / Invoice #101"
                  className="input-field"
                />
              </div>

              <button
                type="submit"
                disabled={transferring}
                className="btn-primary w-full mt-4 !py-4 text-base"
              >
                <Send size={20} />
                <span>
                  {transferring ? 'Executing ACID Transfer in PGSQL...' : 'Send Funds Now ($0.00 Fee)'}
                </span>
              </button>
            </form>
          </motion.div>
        )}

        {/* TAB 3: RECEIVE (GENERATE KHQR) */}
        {activeTab === 'receive' && (
          <motion.div
            key="receive"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="max-w-xl mx-auto glass-card p-6 sm:p-8"
          >
            <div className="text-center mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                Generate KHQR Code (Receive)
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                EMVCo-compliant Bakong KHQR payload. Scan from Bank B to test cross-bank clearing!
              </p>
            </div>

            <form onSubmit={handleGenerateQr} className="space-y-4 mb-8">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                  Request Amount (USD)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={receiveAmount}
                    onChange={(e) =>
                      setReceiveAmount(
                        e.target.value === '' ? '' : Number(e.target.value)
                      )
                    }
                    placeholder="15.00"
                    className="input-field font-mono"
                    required
                  />
                  <button
                    type="submit"
                    disabled={generatingQr}
                    className="btn-primary whitespace-nowrap"
                  >
                    <QrCode size={18} />
                    <span>{generatingQr ? 'Generating...' : 'Generate KHQR'}</span>
                  </button>
                </div>
              </div>
            </form>

            {generatedQr && (
              <div className="bg-slate-950/90 border border-blue-500/30 rounded-3xl p-6 text-center shadow-2xl">
                {/* Bakong KHQR EMVCo Frame */}
                <div className="inline-block bg-white p-5 rounded-3xl mb-4 shadow-xl border-4 border-red-600">
                  <QRCodeCanvas
                    value={generatedQr.payload}
                    size={220}
                    level="M"
                    includeMargin={true}
                  />
                </div>

                <div className="text-2xl font-extrabold font-mono text-white">
                  ${Number(generatedQr.amount).toFixed(2)} USD
                </div>
                <div className="text-xs text-slate-400 mb-5">
                  Payee: <span className="text-white font-semibold">{generatedQr.merchantName}</span> ({generatedQr.accountNumber})
                </div>

                <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 text-left">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase font-mono text-slate-400">
                      EMVCo TLV String (CRC-16 Verified)
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(generatedQr.payload)}
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold"
                    >
                      <Copy size={14} />
                      <span>Copy Payload</span>
                    </button>
                  </div>
                  <div className="font-mono text-xs text-slate-300 break-all bg-black/60 p-3 rounded-xl border border-white/5 max-h-28 overflow-y-auto">
                    {generatedQr.payload}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* TAB 4: SCAN & PAY (KHQR CROSS-BANK) */}
        {activeTab === 'scan' && (
          <motion.div
            key="scan"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="max-w-xl mx-auto glass-card p-6 sm:p-8"
          >
            <div className="text-center mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                Scan & Pay KHQR (Cross-Bank Clearing)
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Paste an EMVCo TLV payload string to pay Bank B across the Bakong / Central Switch clearing house.
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                  Paste KHQR EMVCo Payload String
                </label>
                <textarea
                  rows={3}
                  value={khqrPayload}
                  onChange={(e) => setKhqrPayload(e.target.value)}
                  placeholder="00020101021226360007BANHLUY0111BB-000000010206BANK_B..."
                  className="input-field font-mono text-xs"
                />
              </div>

              <button
                type="button"
                onClick={handleDecodeKhqr}
                disabled={decoding || !khqrPayload.trim()}
                className="w-full py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-semibold flex items-center justify-center gap-2 border border-white/10 transition shadow-lg"
              >
                <span>{decoding ? 'Decoding EMVCo TLV...' : 'Verify & Decode KHQR Payload'}</span>
              </button>

              {decodedKhqr && (
                <form onSubmit={handlePayKhqr} className="mt-6 bg-slate-900/95 border border-blue-500/40 rounded-3xl p-6 space-y-5 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div>
                      <div className="text-xs text-slate-400 uppercase font-semibold">
                        Payee Details
                      </div>
                      <div className="font-bold text-white text-lg sm:text-xl">
                        {decodedKhqr.merchantName}
                      </div>
                      <div className="text-xs font-mono text-blue-400 mt-0.5">
                        {decodedKhqr.accountNumber} ({decodedKhqr.bankType})
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-400 uppercase font-semibold">
                        Transfer Amount
                      </div>
                      <div className="font-mono font-extrabold text-2xl text-emerald-400">
                        ${Number(decodedKhqr.amount).toFixed(2)}
                      </div>
                      <div className="text-[11px] text-amber-400 font-semibold mt-0.5">
                        + $0.50 Switch Fee
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 text-xs text-blue-200">
                    Total debit from your PostgreSQL account will be{' '}
                    <span className="font-bold font-mono text-white">
                      ${(Number(decodedKhqr.amount) + 0.5).toFixed(2)} USD
                    </span>{' '}
                    (includes $0.50 Central Switch clearing fee).
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                      Confirm Your Security PIN
                    </label>
                    <input
                      type="password"
                      value={payPin}
                      onChange={(e) => setPayPin(e.target.value)}
                      placeholder="••••"
                      maxLength={6}
                      className="input-field font-mono tracking-widest text-center text-xl font-bold"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={paying}
                    className="btn-primary w-full !py-4 text-base"
                  >
                    <CheckCircle2 size={20} />
                    <span>
                      {paying ? 'Executing ACID Clearing in PGSQL...' : 'Confirm & Pay Across Bank'}
                    </span>
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
