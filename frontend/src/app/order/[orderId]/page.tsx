"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle,
  Clock,
  FileText,
  Printer,
  Package,
  Copy,
  Layers,
  Scissors,
  RefreshCw,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { API_ENDPOINTS } from "@/lib/api";
import toast from "react-hot-toast";

interface FileConfig {
  name: string;
  pages: string;
  colorPages: string;
  sided: "one-sided" | "two-sided";
  copies: number;
  pageSize: string;
}

interface FileEntry {
  pdf_filename: string;
  original_name: string;
  config: FileConfig;
}

interface OrderDetails {
  order_id: string;
  files: (string | FileEntry)[];
  status: "Pending" | "In Progress" | "Ready for Pickup" | "Completed" | "Cancelled";
  config?: FileConfig[];
  order_time: number;
  user_id?: string;
  session_id?: string;
  cancellation_reason?: string;
  cancelled_by?: string;
}

// Helper to get config array from order (handles both old and new format)
const getOrderConfig = (order: OrderDetails): FileConfig[] => {
  if (order.config && order.config.length > 0) {
    return order.config;
  }
  return order.files
    .filter((f): f is FileEntry => typeof f !== 'string' && 'config' in f)
    .map(f => f.config);
};

const statusConfig = {
  Pending: {
    icon: <Clock />,
    color: "text-yellow-400",
    description: "Your order has been received and is waiting to be processed.",
  },
  "In Progress": {
    icon: <Printer />,
    color: "text-blue-400",
    description: "The shop is currently printing and preparing your order.",
  },
  "Ready for Pickup": {
    icon: <Package />,
    color: "text-purple-400",
    description: "Your order is ready for you to pick up.",
  },
  Completed: {
    icon: <CheckCircle />,
    color: "text-green-400",
    description: "Your order has been picked up.",
  },
  Cancelled: {
    icon: <XCircle />,
    color: "text-red-400",
    description: "This order was cancelled.",
  },
};

const OrderStatus = () => {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    const studentAuth = localStorage.getItem('student-auth');
    if (studentAuth) {
      const parsed = JSON.parse(studentAuth);
      setUserId(parsed.user_id);
      setIsLoggedIn(true);
    } else {
      const currentSessionId = localStorage.getItem('sessionId');
      if (currentSessionId) {
        setSessionId(currentSessionId);
      }
      setIsLoggedIn(false);
    }
  }, []);

  useEffect(() => {
    if (!orderId) return;

    const fetchOrderStatus = async () => {
      try {
        const response = await axios.get(
          API_ENDPOINTS.orderDetails(orderId)
        );
        setOrder(response.data);
      } catch (error) {
        console.error("Error fetching order status:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderStatus();
    const interval = setInterval(fetchOrderStatus, 5000);
    return () => clearInterval(interval);
  }, [orderId]);

  // Calculate time remaining for cancellation
  useEffect(() => {
    if (!order) return;

    const updateTimeRemaining = () => {
      const orderTime = order.order_time * 1000; // Convert to milliseconds
      const now = Date.now();
      const elapsed = Math.floor((now - orderTime) / 1000); // Elapsed in seconds
      
      // Time limits: 5 minutes (300s) for logged users, 1 minute (60s) for guests
      const timeLimit = isLoggedIn ? 300 : 60;
      const remaining = Math.max(0, timeLimit - elapsed);
      
      setTimeRemaining(remaining);
    };

    updateTimeRemaining();
    const timer = setInterval(updateTimeRemaining, 1000);
    return () => clearInterval(timer);
  }, [order, isLoggedIn]);

  const canCancelOrder = () => {
    if (!order) return false;
    
    // Can't cancel if not pending
    if (order.status.toLowerCase() !== 'pending') return false;
    
    // Can't cancel if time expired
    if (timeRemaining <= 0) return false;
    
    return true;
  };

  const handleCancelOrder = async () => {
    if (!order || isCancelling) return;

    setIsCancelling(true);
    try {
      const payload: { user_id?: string; session_id?: string } = {};
      if (userId) {
        payload.user_id = userId;
      } else if (sessionId) {
        payload.session_id = sessionId;
      }

      const response = await axios.post(
        API_ENDPOINTS.orderCancel(orderId),
        payload
      );

      toast.success(
        response.data.refund_amount > 0
          ? `Order cancelled. ${response.data.refund_amount} EP-Coins refunded.`
          : 'Order cancelled successfully.'
      );
      
      setShowCancelConfirm(false);
      
      // Refresh order data
      const updatedOrder = await axios.get(API_ENDPOINTS.orderDetails(orderId));
      setOrder(updatedOrder.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMsg = error.response?.data?.error || 'Failed to cancel order.';
        toast.error(errorMsg);
      } else {
        toast.error('Failed to cancel order.');
      }
    } finally {
      setIsCancelling(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="flex items-center gap-2">
          <RefreshCw className="animate-spin" />
          <p className="text-xl">Loading order status...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <p>Order not found.</p>
      </div>
    );
  }

  const currentStatus = statusConfig[order.status];

  return (
    <div className="bg-gray-900 text-white min-h-screen p-4 sm:p-8 font-sans">
      <motion.div
        className="container mx-auto max-w-4xl"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex justify-end mb-4">
          <Link
            href="/orders"
            className="inline-flex items-center px-4 py-2 rounded-md bg-purple-600 hover:bg-purple-500 text-white text-sm"
          >
            All Orders
          </Link>
        </div>

        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-4xl font-bold text-purple-400">
              Order Status
            </h1>
            <div className="flex items-center gap-2 text-gray-400 mt-2">
              <span>{order.order_id}</span>
              <button onClick={() => copyToClipboard(order.order_id)} className="hover:text-white" title="Copy order ID">
                <Copy size={16} />
              </button>
            </div>
            <p className="text-gray-500 text-sm">{new Date(order.order_time * 1000).toLocaleString()}</p>
          </div>
          <div className="text-right">
            <div
              className={`flex items-center gap-2 ${currentStatus.color} p-2 rounded-lg bg-gray-800`}
            >
              {currentStatus.icon}
              <span className="font-bold text-lg">{order.status}</span>
            </div>
            <p className="text-sm text-gray-400 mt-1">
              {currentStatus.description}
            </p>
          </div>
        </div>

        {/* Cancellation Controls */}
        {order.status === 'Pending' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            {canCancelOrder() ? (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-yellow-400 mt-0.5" />
                    <div>
                      <p className="font-semibold text-yellow-300">Cancellation Available</p>
                      <p className="text-sm text-yellow-200/80">
                        You can cancel this order for the next{' '}
                        <span className="font-mono font-bold">{formatTime(timeRemaining)}</span>
                        {isLoggedIn && ' (EP-Coins will be refunded)'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowCancelConfirm(true)}
                    className="flex-shrink-0 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <XCircle size={18} />
                    Cancel Order
                  </button>
                </div>
              </div>
            ) : timeRemaining === 0 ? (
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-semibold text-gray-300">Cancellation Window Closed</p>
                    <p className="text-sm text-gray-400">
                      The {isLoggedIn ? '5-minute' : '1-minute'} cancellation window has expired. 
                      Your order is being processed.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </motion.div>
        )}

        {order.status !== 'Pending' && order.status !== 'Cancelled' && (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-300">Cannot Cancel</p>
                <p className="text-sm text-gray-400">
                  This order cannot be cancelled as it is already being processed.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Cancellation Reason Display */}
        {order.status === 'Cancelled' && order.cancellation_reason && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4"
          >
            <div className="flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-400 mt-0.5" />
              <div>
                <p className="font-semibold text-red-300">Order Cancelled</p>
                <p className="text-sm text-red-200/80 mt-1">
                  <span className="font-medium">Reason:</span> {order.cancellation_reason}
                </p>
                {order.cancelled_by === 'shop' && (
                  <p className="text-xs text-red-300/60 mt-2">
                    Cancelled by shop. {userId ? 'Any payment has been refunded to your wallet.' : ''}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Order Summary</h2>
          <div className="bg-gray-800 p-6 rounded-lg">
            {getOrderConfig(order).map((file, index) => (
              <div key={index} className="border-b border-gray-700 last:border-b-0 py-4">
                <div className="flex items-center gap-4">
                  <FileText size={24} />
                  <p className="font-semibold text-lg">{file.name}</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Layers size={16} />
                    <span>{file.copies} copies</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText size={16} />
                    <span>Pages: {file.pages}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText size={16} />
                    <span>Color: {file.colorPages}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Scissors size={16} />
                    <span>{file.sided}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cancel Confirmation Modal */}
        <AnimatePresence>
          {showCancelConfirm && (
            <motion.div
              className="fixed inset-0 z-50 bg-black/80 p-4 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isCancelling && setShowCancelConfirm(false)}
            >
              <motion.div
                className="w-full max-w-md rounded-2xl bg-gray-900 border border-red-500/30 p-6"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className="p-2 bg-red-500/20 rounded-lg">
                    <XCircle size={24} className="text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">Cancel Order?</h3>
                    <p className="text-sm text-gray-400 mt-1">
                      Are you sure you want to cancel this order?
                    </p>
                  </div>
                </div>

                <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 mb-4">
                  <p className="text-sm text-gray-300">
                    <strong>Order ID:</strong> {order.order_id}
                  </p>
                  {isLoggedIn && (
                    <p className="text-sm text-green-300 mt-2">
                      ✓ Your EP-Coins will be refunded automatically.
                    </p>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCancelConfirm(false)}
                    disabled={isCancelling}
                    className="flex-1 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    Keep Order
                  </button>
                  <button
                    onClick={handleCancelOrder}
                    disabled={isCancelling}
                    className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isCancelling ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        Cancelling...
                      </>
                    ) : (
                      <>
                        <XCircle size={16} />
                        Yes, Cancel
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default OrderStatus;