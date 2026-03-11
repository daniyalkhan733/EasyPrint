"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Clock3, Coins, Copy, Plus, Wallet as WalletIcon, X } from 'lucide-react';
import { API_ENDPOINTS } from '@/lib/api';
import toast from 'react-hot-toast';

type TopupAction = 'success' | 'failed' | 'cancelled';
type TopupUiState = 'idle' | 'initiating' | 'awaiting_payment' | 'verifying' | 'success' | 'failed' | 'cancelled' | 'expired';

interface TopupTransaction {
  transaction_id: string;
  amount_inr: number;
  coins_to_credit: number;
  merchant_upi_id: string;
  upi_link: string;
  expires_at: number;
}

interface WalletTransaction {
  transaction_id: string;
  status: string;
  amount_inr: number;
  coins_credited: number;
  created_at: number;
}

const QUICK_AMOUNTS = [20, 50, 100, 250, 500];
const MIN_TOPUP = 1;
const MAX_TOPUP = 50000;

const Wallet = () => {
  const [balance, setBalance] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isTopupOpen, setIsTopupOpen] = useState(false);
  const [amountInput, setAmountInput] = useState('100');
  const [uiState, setUiState] = useState<TopupUiState>('idle');
  const [transaction, setTransaction] = useState<TopupTransaction | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<WalletTransaction[]>([]);
  const [countdown, setCountdown] = useState<number>(0);

  const fetchWallet = useCallback(async (currentUserId: string) => {
    try {
      const response = await axios.get(API_ENDPOINTS.wallet(currentUserId));
      setBalance(Number(response.data.balance || 0));
    } catch (error) {
      console.error("Error fetching wallet:", error);
    }
  }, []);

  const fetchTransactions = useCallback(async (currentUserId: string) => {
    try {
      const response = await axios.get(API_ENDPOINTS.walletTransactions(currentUserId));
      setRecentTransactions(response.data.transactions || []);
    } catch (error) {
      console.error("Error fetching wallet transactions:", error);
    }
  }, []);

  useEffect(() => {
    const authData = localStorage.getItem('student-auth');
    if (authData) {
      const parsed = JSON.parse(authData);
      setUserId(parsed.user_id);
    }
  }, []);

  useEffect(() => {
    if (!userId) return;
    fetchWallet(userId);
    fetchTransactions(userId);

    const interval = setInterval(() => fetchWallet(userId), 10000); // Refresh every 10 seconds
    const txInterval = setInterval(() => fetchTransactions(userId), 15000);

    return () => {
      clearInterval(interval);
      clearInterval(txInterval);
    };
  }, [userId, fetchWallet, fetchTransactions]);

  useEffect(() => {
    if (uiState !== 'awaiting_payment' || !transaction) return;

    const timer = setInterval(() => {
      const remaining = Math.max(0, transaction.expires_at - Math.floor(Date.now() / 1000));
      setCountdown(remaining);
      if (remaining <= 0) {
        setUiState('expired');
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [uiState, transaction]);

  const parsedAmount = useMemo(() => {
    const value = Number(amountInput);
    return Number.isFinite(value) ? value : 0;
  }, [amountInput]);

  const resetTopupFlow = () => {
    setUiState('idle');
    setTransaction(null);
    setCountdown(0);
  };

  const closeTopupModal = () => {
    setIsTopupOpen(false);
    resetTopupFlow();
  };

  const handleInitiateTopup = async () => {
    if (!userId) {
      toast.error('Please login to add EP-Coins.');
      return;
    }

    if (parsedAmount < MIN_TOPUP || parsedAmount > MAX_TOPUP) {
      toast.error(`Amount must be between ${MIN_TOPUP} and ${MAX_TOPUP} INR.`);
      return;
    }

    if (!Number.isInteger(parsedAmount * 100)) {
      toast.error('Amount can have at most 2 decimal places.');
      return;
    }

    setUiState('initiating');
    try {
      const response = await axios.post(API_ENDPOINTS.walletTopupInitiate, {
        user_id: userId,
        amount: parsedAmount,
      });
      setTransaction(response.data);
      setCountdown(Math.max(0, response.data.expires_at - Math.floor(Date.now() / 1000)));
      setUiState('awaiting_payment');
      toast.success('UPI payment request created. Complete payment and verify.');
      await fetchTransactions(userId);
    } catch (error) {
      console.error('Error initiating top-up:', error);
      toast.error('Could not start payment. Please try again.');
      setUiState('idle');
    }
  };

  const handleCompleteTopup = async (action: TopupAction) => {
    if (!userId || !transaction) return;

    setUiState('verifying');
    try {
      const response = await axios.post(API_ENDPOINTS.walletTopupComplete, {
        user_id: userId,
        transaction_id: transaction.transaction_id,
        action,
      });

      if (response.data.status === 'success') {
        setBalance(Number(response.data.balance || 0));
        setUiState('success');
        toast.success(`Added ${response.data.coins_added ?? transaction.coins_to_credit} EP-Coins successfully.`);
      } else if (response.data.status === 'failed') {
        setUiState('failed');
        toast.error('Payment marked as failed.');
      } else if (response.data.status === 'cancelled') {
        setUiState('cancelled');
        toast('Payment cancelled.');
      } else {
        setUiState('idle');
      }

      await fetchWallet(userId);
      await fetchTransactions(userId);
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 410) {
        setUiState('expired');
        toast.error('Payment session expired. Start a new top-up.');
      } else {
        console.error('Error completing top-up:', error);
        toast.error('Could not verify payment. Please retry.');
        setUiState('awaiting_payment');
      }
    }
  };

  const copyText = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied.`);
    } catch {
      toast.error(`Could not copy ${label.toLowerCase()}.`);
    }
  };

  if (balance === null) {
    return null;
  }

  return (
    <>
      <motion.div
        className="flex items-center gap-2 bg-green-500/20 text-green-300 px-4 py-2 rounded-lg"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <WalletIcon size={20} />
        <span className="font-bold">EP-Coins:</span>
        <span className="flex items-center gap-1">
          <Coins size={16} />
          {balance.toFixed(2)}
        </span>
        <button
          onClick={() => setIsTopupOpen(true)}
          className="ml-1 inline-flex items-center justify-center rounded-full bg-green-400/20 p-1.5 hover:bg-green-400/30 transition"
          title="Add EP-Coins"
          aria-label="Add EP-Coins"
        >
          <Plus size={14} />
        </button>
      </motion.div>

      <AnimatePresence>
        {isTopupOpen && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/70 p-4 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeTopupModal}
          >
            <motion.div
              className="w-full max-w-lg rounded-2xl bg-gray-900 border border-gray-700 p-5"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-white">Add EP-Coins</h3>
                  <p className="text-sm text-gray-400">1 INR = 1 EP-Coin via UPI</p>
                </div>
                <button onClick={closeTopupModal} className="p-2 rounded-lg hover:bg-gray-800" title="Close">
                  <X size={18} className="text-gray-300" />
                </button>
              </div>

              {(uiState === 'idle' || uiState === 'initiating') && (
                <div className="space-y-4">
                  <div className="grid grid-cols-5 gap-2">
                    {QUICK_AMOUNTS.map((amount) => (
                      <button
                        key={amount}
                        onClick={() => setAmountInput(String(amount))}
                        className={`rounded-lg border px-2 py-2 text-sm transition ${
                          parsedAmount === amount
                            ? 'border-blue-500 bg-blue-500/20 text-blue-200'
                            : 'border-gray-700 bg-gray-800 text-gray-200 hover:border-gray-500'
                        }`}
                      >
                        INR {amount}
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="text-sm text-gray-300">Custom Amount (INR)</label>
                    <input
                      type="number"
                      min={MIN_TOPUP}
                      max={MAX_TOPUP}
                      step="0.01"
                      value={amountInput}
                      onChange={(e) => setAmountInput(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 p-3 text-white outline-none focus:border-blue-500"
                      placeholder="Enter amount"
                    />
                    <p className="mt-1 text-xs text-gray-500">Minimum INR {MIN_TOPUP}, maximum INR {MAX_TOPUP}.</p>
                  </div>

                  <div className="rounded-lg border border-green-800 bg-green-500/10 p-3 text-sm text-green-200">
                    You will receive <span className="font-semibold">{Math.max(parsedAmount, 0).toFixed(2)} EP-Coins</span>.
                  </div>

                  <button
                    onClick={handleInitiateTopup}
                    disabled={uiState === 'initiating'}
                    className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
                  >
                    {uiState === 'initiating' ? 'Creating UPI Request...' : 'Proceed To UPI Payment'}
                  </button>
                </div>
              )}

              {(uiState === 'awaiting_payment' || uiState === 'verifying') && transaction && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-gray-700 bg-gray-800 p-3 text-sm text-gray-200">
                    <div className="flex justify-between"><span>Transaction</span><span className="font-mono text-xs">{transaction.transaction_id}</span></div>
                    <div className="flex justify-between mt-1"><span>Pay Amount</span><span>INR {transaction.amount_inr.toFixed(2)}</span></div>
                    <div className="flex justify-between mt-1"><span>Coins To Credit</span><span>{transaction.coins_to_credit.toFixed(2)} EP</span></div>
                    <div className="flex justify-between mt-1"><span>UPI ID</span><span>{transaction.merchant_upi_id}</span></div>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-yellow-800 bg-yellow-500/10 p-3 text-yellow-200 text-sm">
                    <span className="flex items-center gap-2"><Clock3 size={16} /> Expires In</span>
                    <span className="font-semibold">{Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      onClick={() => window.open(transaction.upi_link, '_blank')}
                      className="rounded-lg bg-emerald-600 py-2.5 font-medium text-white hover:bg-emerald-500"
                    >
                      Open UPI App
                    </button>
                    <button
                      onClick={() => copyText(transaction.merchant_upi_id, 'UPI ID')}
                      className="rounded-lg border border-gray-600 bg-gray-800 py-2.5 font-medium text-gray-100 hover:bg-gray-700 inline-flex items-center justify-center gap-2"
                    >
                      <Copy size={14} /> Copy UPI ID
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      onClick={() => handleCompleteTopup('success')}
                      disabled={uiState === 'verifying'}
                      className="rounded-lg bg-blue-600 py-2.5 font-medium text-white hover:bg-blue-500 disabled:opacity-60"
                    >
                      I Have Paid
                    </button>
                    <button
                      onClick={() => handleCompleteTopup('failed')}
                      disabled={uiState === 'verifying'}
                      className="rounded-lg border border-red-700 bg-red-500/20 py-2.5 font-medium text-red-200 hover:bg-red-500/30 disabled:opacity-60"
                    >
                      Payment Failed
                    </button>
                    <button
                      onClick={() => handleCompleteTopup('cancelled')}
                      disabled={uiState === 'verifying'}
                      className="rounded-lg border border-gray-600 bg-gray-800 py-2.5 font-medium text-gray-200 hover:bg-gray-700 disabled:opacity-60"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {uiState === 'success' && (
                <div className="rounded-lg border border-green-800 bg-green-500/10 p-4 text-green-200 text-sm flex items-start gap-2">
                  <CheckCircle2 size={18} className="mt-0.5" />
                  <div>
                    <p className="font-semibold">Payment verified and coins added.</p>
                    <p className="text-green-300/90">New balance: {balance?.toFixed(2)} EP-Coins.</p>
                  </div>
                </div>
              )}

              {(uiState === 'failed' || uiState === 'cancelled' || uiState === 'expired') && (
                <div className="rounded-lg border border-red-800 bg-red-500/10 p-4 text-red-200 text-sm flex items-start gap-2">
                  <AlertCircle size={18} className="mt-0.5" />
                  <div>
                    <p className="font-semibold">
                      {uiState === 'failed' && 'Payment failed.'}
                      {uiState === 'cancelled' && 'Payment cancelled.'}
                      {uiState === 'expired' && 'Payment session expired.'}
                    </p>
                    <p className="text-red-300/90">No coins were added. Start a new top-up if needed.</p>
                  </div>
                </div>
              )}

              <div className="mt-4 flex justify-end gap-2">
                {(uiState === 'success' || uiState === 'failed' || uiState === 'cancelled' || uiState === 'expired') && (
                  <button
                    onClick={resetTopupFlow}
                    className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-100 hover:bg-gray-700"
                  >
                    Add More
                  </button>
                )}
                <button
                  onClick={closeTopupModal}
                  className="rounded-lg bg-gray-700 px-3 py-2 text-sm text-white hover:bg-gray-600"
                >
                  Done
                </button>
              </div>

              {recentTransactions.length > 0 && (
                <div className="mt-5 border-t border-gray-700 pt-4">
                  <h4 className="text-sm font-semibold text-gray-200 mb-2">Recent Top-ups</h4>
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {recentTransactions.slice(0, 5).map((tx) => (
                      <div key={tx.transaction_id} className="rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-xs text-gray-300 flex justify-between gap-3">
                        <span className="font-mono truncate">{tx.transaction_id}</span>
                        <span>INR {Number(tx.amount_inr || 0).toFixed(2)}</span>
                        <span className="uppercase">{tx.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Wallet;
