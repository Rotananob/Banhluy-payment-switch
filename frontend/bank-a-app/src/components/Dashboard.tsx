'use client';

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { QRCodeCanvas } from 'qrcode.react';
import {
  Send,
  QrCode,
  ScanLine,
  History,
  ArrowUpRight,
  ArrowDownLeft,
  Copy,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Wallet,
  Sparkles,
  RefreshCw,
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

export const Dashboard: React.FC<{ onBalanceChange: () => void }> = ({
  onBalanceChange,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'transfer' | 'receive' | 'scan'>('overview');
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);

  // Transfer state
  const [toAccount, setToAccount] = useState('BA-00000002');
  const [transferAmount, setTransferAmount] = useState<number | ''>(50);
  const [transferDesc, setTransferDesc] = useState('Dinner split');
  const [transferring, setTransferring] = useState(false);

  // Receive (KHQR generate) state
  const [receiveAmount, setReceiveAmount] = useState<number | ''>(25.5);
  const [generatedQr, setGeneratedQr] = useState<any | null>(null);
  const [generatingQr, setGeneratingQr] = useState(false);

  // Scan & Pay state
  const [khqrPayload, setKhqrPayload] = useState('');
  const [decodedKhqr, setDecodedKhqr] = useState<any | null>(null);
  const [decoding, setDecoding] = useState(false);
  const [payPin, setPayPin] = useState('1234');
  const [paying, setPaying] = useState(false);

  const { account } = useAuthStore();

  const loadTransactions = async () => {
    setLoadingTx(true);
    try {
      const res = await getTransactionsApi(1, 20);
      setTransactions(res.data || []);
    } catch (err) {
      toast.error('Failed to load transaction history');
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
      const msg = err.response?.data?.message || 'Transfer failed';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
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
      toast.success('KHQR EMVCo code generated!');
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
        `Cross-Bank Transfer Completed! Paid $${res.amount} (+ $${res.fee} fee)`
      );
      onBalanceChange();
      loadTransactions();
      setKhqrPayload('');
      setDecodedKhqr(null);
      setActiveTab('overview');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Payment failed';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setPaying(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 mb-8 bg-slate-900/60 p-2 rounded-2xl border border-white/10">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
        >
          <History size={18} />
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

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Main Hero Card */}
          <div className="glass-card glow-card p-8 bg-gradient-to-br from-blue-900/40 via-slate-900/80 to-slate-950/90 border-blue-500/20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="text-xs uppercase font-semibold text-blue-400 tracking-wider mb-2 flex items-center gap-2">
                  <Sparkles size={16} />
                  <span>Bank A Primary Checking</span>
                </div>
                <div className="text-4xl md:text-5xl font-extrabold font-mono text-white tracking-tight">
                  ${Number(account?.balance || 0).toFixed(2)}
                  <span className="text-sm text-slate-400 font-sans ml-2">USD</span>
                </div>
                <div className="text-sm font-mono text-slate-400 mt-2">
                  Account: <span className="text-blue-300">{account?.accountNumber}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('transfer')}
                  className="btn-primary"
                >
                  <Send size={18} />
                  <span>Send Money</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('scan')}
                  className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold flex items-center gap-2 border border-white/10 transition"
                >
                  <ScanLine size={18} />
                  <span>Scan KHQR</span>
                </button>
              </div>
            </div>
          </div>

          {/* Transactions Card */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <History className="text-blue-400" size={20} />
                <span>Transaction History</span>
              </h2>
              <button
                type="button"
                onClick={loadTransactions}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold"
              >
                <RefreshCw
                  size={14}
                  className={loadingTx ? 'animate-spin' : ''}
                />
                <span>Refresh List</span>
              </button>
            </div>

            {loadingTx ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                Loading transactions...
              </div>
            ) : transactions.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-sm">
                No transactions recorded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((tx) => {
                  const isCredit = tx.direction === 'CREDIT';
                  return (
                    <div
                      key={tx.id}
                      className="bg-slate-900/60 border border-white/5 rounded-xl p-4 flex items-center justify-between hover:border-white/10 transition"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            isCredit
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}
                        >
                          {isCredit ? (
                            <ArrowDownLeft size={20} />
                          ) : (
                            <ArrowUpRight size={20} />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-white text-sm">
                            {tx.description ||
                              (isCredit ? 'Funds Received' : 'Funds Sent')}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                            <span>{new Date(tx.createdAt).toLocaleString()}</span>
                            {tx.counterpartyAccount && (
                              <span className="font-mono text-blue-400">
                                • {tx.counterpartyAccount}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div
                          className={`font-mono font-bold text-base ${
                            isCredit ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {isCredit ? '+' : '-'}${Number(tx.amount).toFixed(2)}
                        </div>
                        <div className="text-[10px] uppercase font-semibold text-slate-500 mt-0.5">
                          {tx.type}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: INTRA-BANK TRANSFER */}
      {activeTab === 'transfer' && (
        <div className="max-w-xl mx-auto glass-card p-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-white">
              Intra-Bank Transfer (Bank A)
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Transfer funds instantly between Bank A accounts with zero fees.
            </p>
          </div>

          <div className="mb-6 bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 flex items-center justify-between">
            <div className="text-xs text-blue-200">
              Need a recipient account? Click to test with{' '}
              <span className="font-mono font-bold">BA-00000002</span>
            </div>
            <button
              type="button"
              onClick={() => setToAccount('BA-00000002')}
              className="px-3 py-1 rounded bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 transition"
            >
              Select BA-00000002
            </button>
          </div>

          <form onSubmit={handleIntraTransfer} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
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
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
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
                className="input-field font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                Description (Optional)
              </label>
              <input
                type="text"
                value={transferDesc}
                onChange={(e) => setTransferDesc(e.target.value)}
                placeholder="Payment for dinner"
                className="input-field"
              />
            </div>

            <button
              type="submit"
              disabled={transferring}
              className="btn-primary w-full mt-4"
            >
              <Send size={18} />
              <span>
                {transferring ? 'Processing ACID Transfer...' : 'Execute Transfer'}
              </span>
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: RECEIVE (GENERATE KHQR) */}
      {activeTab === 'receive' && (
        <div className="max-w-xl mx-auto glass-card p-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-white">
              Generate KHQR Code (Receive)
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Create an EMVCo-compliant KHQR payment payload. Scan from Bank B to
              test cross-bank clearing!
            </p>
          </div>

          <form onSubmit={handleGenerateQr} className="space-y-4 mb-8">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
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
                  placeholder="25.50"
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
            <div className="bg-slate-950/80 border border-blue-500/30 rounded-2xl p-6 text-center">
              <div className="bg-white p-4 rounded-2xl inline-block mb-4 shadow-xl">
                <QRCodeCanvas
                  value={generatedQr.payload}
                  size={200}
                  level="M"
                  includeMargin={true}
                />
              </div>

              <div className="text-lg font-bold text-white">
                ${Number(generatedQr.amount).toFixed(2)} USD
              </div>
              <div className="text-xs text-slate-400 mb-4">
                Payee: {generatedQr.merchantName} ({generatedQr.accountNumber})
              </div>

              <div className="bg-slate-900 border border-white/10 rounded-xl p-3 text-left">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] uppercase font-mono text-slate-400">
                    EMVCo TLV String (CRC-16 Verified)
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(generatedQr.payload)}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    <Copy size={12} />
                    <span>Copy Payload</span>
                  </button>
                </div>
                <div className="font-mono text-xs text-slate-300 break-all bg-black/40 p-2 rounded border border-white/5 max-h-24 overflow-y-auto">
                  {generatedQr.payload}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: SCAN & PAY (KHQR CROSS-BANK) */}
      {activeTab === 'scan' && (
        <div className="max-w-xl mx-auto glass-card p-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-white">
              Scan & Pay KHQR (Cross-Bank Clearing)
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Paste a KHQR EMVCo payload string to pay any bank across the Bakong /
              Central Switch clearing house.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
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
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold flex items-center justify-center gap-2 border border-white/10 transition"
            >
              <span>{decoding ? 'Decoding EMVCo TLV...' : 'Verify & Decode KHQR Payload'}</span>
            </button>

            {decodedKhqr && (
              <form onSubmit={handlePayKhqr} className="mt-6 bg-slate-900/90 border border-blue-500/40 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <div className="text-xs text-slate-400 uppercase">
                      Payee Details
                    </div>
                    <div className="font-bold text-white text-lg">
                      {decodedKhqr.merchantName}
                    </div>
                    <div className="text-xs font-mono text-blue-400">
                      {decodedKhqr.accountNumber} ({decodedKhqr.bankType})
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400 uppercase">
                      Transfer Amount
                    </div>
                    <div className="font-mono font-extrabold text-2xl text-emerald-400">
                      ${Number(decodedKhqr.amount).toFixed(2)}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      + $0.50 Cross-Bank Fee
                    </div>
                  </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 text-xs text-blue-200">
                  Total debit from your account will be{' '}
                  <span className="font-bold font-mono">
                    ${(Number(decodedKhqr.amount) + 0.5).toFixed(2)} USD
                  </span>{' '}
                  (including $0.50 Central Switch clearing house fee).
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Confirm Your Security PIN
                  </label>
                  <input
                    type="password"
                    value={payPin}
                    onChange={(e) => setPayPin(e.target.value)}
                    placeholder="••••"
                    maxLength={6}
                    className="input-field font-mono tracking-widest text-center"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={paying}
                  className="btn-primary w-full"
                >
                  <CheckCircle2 size={18} />
                  <span>
                    {paying ? 'Executing Clearing Transaction...' : 'Confirm & Pay Across Bank'}
                  </span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
