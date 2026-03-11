"use client";

import { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import { API_ENDPOINTS } from '@/lib/api';
import { Clock, Printer, Package, CheckCircle, FileText } from 'lucide-react';

interface Order {
  order_id: string;
  status: string;
  student_name: string;
  order_time: number;
  cancellation_reason?: string;
}

const getStatusConfig = (status: string) => {
  const statusLower = status.toLowerCase();
  
  switch (statusLower) {
    case 'pending':
      return {
        icon: <Clock className="w-5 h-5" />,
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/40',
        textColor: 'text-amber-300',
        glowColor: 'shadow-amber-500/20',
        label: 'Pending'
      };
    case 'in progress':
      return {
        icon: <Printer className="w-5 h-5" />,
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/40',
        textColor: 'text-blue-300',
        glowColor: 'shadow-blue-500/20',
        label: 'In Progress'
      };
    case 'ready for pickup':
      return {
        icon: <Package className="w-5 h-5" />,
        bgColor: 'bg-purple-500/10',
        borderColor: 'border-purple-500/40',
        textColor: 'text-purple-300',
        glowColor: 'shadow-purple-500/20',
        label: 'Ready for Pickup'
      };
    case 'completed':
      return {
        icon: <CheckCircle className="w-5 h-5" />,
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/40',
        textColor: 'text-emerald-300',
        glowColor: 'shadow-emerald-500/20',
        label: 'Completed'
      };
    case 'cancelled':
      return {
        icon: <FileText className="w-5 h-5" />,
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/40',
        textColor: 'text-red-300',
        glowColor: 'shadow-red-500/20',
        label: 'Cancelled'
      };
    default:
      return {
        icon: <FileText className="w-5 h-5" />,
        bgColor: 'bg-gray-500/10',
        borderColor: 'border-gray-500/40',
        textColor: 'text-gray-300',
        glowColor: 'shadow-gray-500/20',
        label: status.charAt(0).toUpperCase() + status.slice(1)
      };
  }
};

const OrdersPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');

  useEffect(() => {
    const studentAuth = localStorage.getItem('student-auth');
    if (studentAuth) {
        setUserId(JSON.parse(studentAuth).user_id);
    } else {
        let currentSessionId = localStorage.getItem('sessionId');
        if (!currentSessionId) {
          currentSessionId = uuidv4();
          localStorage.setItem('sessionId', currentSessionId);
        }
        setUserId(currentSessionId);
    }
  }, []);

  useEffect(() => {
    if (!userId) return;

    const fetchOrders = async () => {
      try {
        const response = await axios.get(API_ENDPOINTS.userOrders(userId));
        setOrders(response.data);
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, [userId]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white"><p>Loading your orders...</p></div>;
  }

  return (
    <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white min-h-screen p-4 sm:p-8 font-sans">
      <motion.div
      className="container mx-auto max-w-4xl"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      >
      <div className="mb-8">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-600 bg-clip-text text-transparent mb-2">Your Orders</h1>
        <p className="text-gray-400 mb-6">Track and manage your printing requests</p>
        
        {/* Status Legend */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
          <p className="text-sm text-gray-400 mb-3 font-semibold">Order Status Guide:</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="text-sm text-amber-300">Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <Printer className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-blue-300">In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-purple-300">Ready for Pickup</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-emerald-300">Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-red-400" />
              <span className="text-sm text-red-300">Cancelled</span>
            </div>
          </div>
        </div>
      </div>
      
      {orders.length > 0 ? (
        <>
        {/* Order Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <motion.div 
            className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/30 rounded-xl p-4"
            whileHover={{ scale: 1.05 }}
          >
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-amber-400" />
              <div>
                <p className="text-2xl font-bold text-amber-300">
                  {orders.filter(o => o.status.toLowerCase() === 'pending').length}
                </p>
                <p className="text-xs text-amber-200/70">Pending</p>
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/30 rounded-xl p-4"
            whileHover={{ scale: 1.05 }}
          >
            <div className="flex items-center gap-3">
              <Printer className="w-8 h-8 text-blue-400" />
              <div>
                <p className="text-2xl font-bold text-blue-300">
                  {orders.filter(o => o.status.toLowerCase() === 'in progress').length}
                </p>
                <p className="text-xs text-blue-200/70">In Progress</p>
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/30 rounded-xl p-4"
            whileHover={{ scale: 1.05 }}
          >
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8 text-purple-400" />
              <div>
                <p className="text-2xl font-bold text-purple-300">
                  {orders.filter(o => o.status.toLowerCase() === 'ready for pickup').length}
                </p>
                <p className="text-xs text-purple-200/70">Ready</p>
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/30 rounded-xl p-4"
            whileHover={{ scale: 1.05 }}
          >
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
              <div>
                <p className="text-2xl font-bold text-emerald-300">
                  {orders.filter(o => o.status.toLowerCase() === 'completed').length}
                </p>
                <p className="text-xs text-emerald-200/70">Completed</p>
              </div>
            </div>
          </motion.div>
        </div>
        
        <div className="space-y-4">
        {orders.map((order, index) => {
          const statusConfig = getStatusConfig(order.status);
          return (
          <motion.div
          key={order.order_id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          whileHover={{ scale: 1.02, translateY: -4 }}
          >
          <Link href={`/order/${order.order_id}`} className="block group">
            <div className={`bg-gradient-to-r from-gray-800 to-gray-700 p-6 rounded-xl hover:from-gray-700 hover:to-gray-600 transition-all duration-300 border border-gray-600 hover:border-gray-500 shadow-lg hover:${statusConfig.glowColor}`}>
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg ${statusConfig.bgColor} ${statusConfig.borderColor} border`}>
                  <FileText className="w-5 h-5 text-gray-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-lg text-white group-hover:text-purple-300 transition-colors truncate">
                    {order.order_id}
                  </p>
                  <p className="text-gray-400 text-sm">{order.student_name}</p>
                  {order.status.toLowerCase() === 'cancelled' && order.cancellation_reason && (
                    <p className="text-red-300/80 text-xs mt-1 truncate" title={order.cancellation_reason}>
                      Reason: {order.cancellation_reason}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 text-gray-400 text-sm mt-1">
                <Clock className="w-4 h-4" />
                <span>{new Date(order.order_time * 1000).toLocaleString()}</span>
              </div>
              </div>
              <div className="flex-shrink-0">
              <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold ${statusConfig.bgColor} ${statusConfig.textColor} ${statusConfig.borderColor} border transition-all group-hover:scale-105`}>
                {statusConfig.icon}
                <span className="whitespace-nowrap">{statusConfig.label}</span>
              </div>
              </div>
            </div>
            </div>
          </Link>
          </motion.div>
        );
        })}
        </div>
        </>
      ) : (
        <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-16"
        >
        <div className="inline-block p-8 bg-gradient-to-br from-gray-800 to-gray-700 rounded-2xl border border-gray-600">
          <p className="text-gray-300 text-lg mb-4">You have no orders yet.</p>
          <Link href="/" className="inline-block px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-300 font-semibold">
          Start Printing
          </Link>
        </div>
        </motion.div>
      )}
      </motion.div>
    </div>
  );
};

export default OrdersPage;
