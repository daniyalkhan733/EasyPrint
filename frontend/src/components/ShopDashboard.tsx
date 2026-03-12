"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Clock, FileText, Printer, Truck, Package, ChevronDown, ChevronUp, Filter, Archive, LogOut, User, IndianRupee, ShoppingBag, MapPin, Store, Coins, Palette, X, AlertTriangle, Layers, Scissors, Zap } from 'lucide-react';
import Image from 'next/image';
import { API_ENDPOINTS } from '@/lib/api';
import toast from 'react-hot-toast';

interface FileConfig {
    name: string;
    pages: string;
    colorPages: string;
    sided: 'one-sided' | 'two-sided';
    copies: number;
    pageSize: string;
    // New fields from updated FileUpload
    printMode?: 'bw' | 'color' | 'mixed';
    bwPages?: number;
    colorPagesCount?: number;
    estimatedCost?: number;
    orientation?: string;
}

interface FileEntry {
  pdf_filename: string;
  original_name: string;
  config: FileConfig;
}

interface Order {
  order_id: string;
  files: (string | FileEntry)[];
  status: 'Pending' | 'In Progress' | 'Ready for Pickup' | 'Completed' | 'Cancelled';
  config?: FileConfig[];
  student_name: string;
  order_time: number;
  priority?: boolean;
  total_cost?: number;
}

// Helper to get PDF filename from files array (handles both old and new format)
const getPdfFilename = (file: string | FileEntry): string => {
  return typeof file === 'string' ? file : file.pdf_filename;
};

// Helper to get config array from order (handles both old and new format)
const getOrderConfig = (order: Order): FileConfig[] => {
  if (order.config && order.config.length > 0) {
    return order.config;
  }
  return order.files
    .filter((f): f is FileEntry => typeof f !== 'string' && 'config' in f)
    .map(f => f.config);
};

interface ShopInfo {
  shop_id: string;
  shop_name: string;
  username: string;
  location: string;
  profile_photo: string;
  pricing: {
    bw: number;
    color: number;
  };
  isLive?: boolean;
}

type OrderStatus = 'Pending' | 'In Progress' | 'Ready for Pickup' | 'Completed' | 'Cancelled';
type ViewMode = 'active' | 'completed' | 'profile';

const statusIcons = {
  Pending: <Clock className="text-yellow-400" />,
  'In Progress': <Printer className="text-blue-400" />,
  'Ready for Pickup': <Package className="text-purple-400" />,
  Completed: <CheckCircle className="text-green-400" />,
  Cancelled: <FileText className="text-red-400" />,
};

interface ShopDashboardProps {
  shopId: string;
}

const ShopDashboard = ({ shopId }: ShopDashboardProps) => {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [shopInfo, setShopInfo] = useState<ShopInfo | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('active');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'All'>('All');
  const [isEditingPricing, setIsEditingPricing] = useState(false);
  const [editedPricing, setEditedPricing] = useState({ bw: 1, color: 5 });
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [selectedCancelOrder, setSelectedCancelOrder] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    fetchOrders();
    fetchShopInfo();
    const interval = setInterval(fetchOrders, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [shopId]);

  const fetchShopInfo = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.shopInfo(shopId));
      const normalizedShop = {
        ...response.data,
        isLive: response.data?.isLive ?? true,
      };
      setShopInfo(normalizedShop);
      if (response.data?.pricing) {
        setEditedPricing(response.data.pricing);
      }
    } catch (error) {
      console.error("Error fetching shop info:", error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('shop-auth');
    router.push('/shop/login');
  };

  const updatePricing = async () => {
    try {
      await axios.put(API_ENDPOINTS.shopUpdatePricing(shopId), { pricing: editedPricing });
      setShopInfo(prev => prev ? { ...prev, pricing: editedPricing } : prev);
      setIsEditingPricing(false);
    } catch (error) {
      console.error("Error updating pricing:", error);
    }
  };

  const toggleShopStatus = async () => {
    if (!shopInfo) return;
    
    setIsTogglingStatus(true);
    try {
      const currentStatus = shopInfo.isLive ?? true;
      const newStatus = !currentStatus;
      const response = await axios.put(API_ENDPOINTS.shopToggleStatus(shopId), { isLive: newStatus });
      const persistedStatus = response.data?.isLive ?? newStatus;
      setShopInfo(prev => prev ? { ...prev, isLive: persistedStatus } : prev);
    } catch (error) {
      console.error("Error toggling shop status:", error);
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const openCancelModal = (order: Order) => {
    setSelectedCancelOrder(order);
    setCancelReason('');
    setIsCancelModalOpen(true);
  };

  const closeCancelModal = () => {
    setIsCancelModalOpen(false);
    setSelectedCancelOrder(null);
    setCancelReason('');
  };

  const handleCancelOrder = async () => {
    if (!selectedCancelOrder || !cancelReason) {
      toast.error('Please select a cancellation reason');
      return;
    }

    setIsCancelling(true);
    try {
      const response = await axios.post(API_ENDPOINTS.orderCancelShop(selectedCancelOrder.order_id), {
        shop_id: shopId,
        cancellation_reason: cancelReason,
      });

      toast.success(`Order cancelled. ${response.data.refund_amount > 0 ? `₹${response.data.refund_amount} refunded to student.` : ''}`);
      
      // Update local state
      setOrders(orders.map(order => 
        order.order_id === selectedCancelOrder.order_id 
          ? { ...order, status: 'Cancelled' as OrderStatus } 
          : order
      ));
      
      closeCancelModal();
      fetchOrders(); // Refresh orders
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        toast.error(error.response.data?.error || 'Failed to cancel order');
      } else {
        toast.error('Failed to cancel order');
      }
      console.error("Error cancelling order:", error);
    } finally {
      setIsCancelling(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.shopViewOrders(shopId));
      setOrders(response.data.sort((a: Order, b: Order) => b.order_id.localeCompare(a.order_id)));
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  };

  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    try {
      await axios.put(API_ENDPOINTS.orderStatus(orderId), { status });
      setOrders(orders.map(order => order.order_id === orderId ? { ...order, status } : order));
    } catch (error) {
      console.error("Error updating order status:", error);
    }
  };

  // Separate active and completed orders
  const activeOrders = orders.filter(order => order.status !== 'Completed' && order.status !== 'Cancelled');
  const completedOrders = orders.filter(order => order.status === 'Completed' || order.status === 'Cancelled');

  // Calculate stats
  const totalOrders = orders.length;
  const totalEarnings = completedOrders.reduce((acc, order) => {
    if (order.status === 'Completed' && order.total_cost) {
      return acc + order.total_cost;
    }
    return acc;
  }, 0);

  // Apply filters
  const getFilteredOrders = () => {
    if (viewMode === 'profile') return [];
    const ordersToFilter = viewMode === 'active' ? activeOrders : completedOrders;
    
    if (statusFilter === 'All') {
      return ordersToFilter;
    }
    
    return ordersToFilter.filter(order => order.status === statusFilter);
  };

  const filteredOrders = getFilteredOrders();
  const selectedOrder = orders.find(o => o.order_id === selectedOrderId);

  return (
    <div className="bg-gray-900 text-white min-h-screen p-4 sm:p-8 font-sans">
      <motion.div 
        className="container mx-auto"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header with Shop Info */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 p-4 bg-gray-800 rounded-xl">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gray-700 overflow-hidden flex-shrink-0">
              {shopInfo?.profile_photo ? (
                <Image src={API_ENDPOINTS.pfp(shopInfo.profile_photo)} alt="Shop" width={56} height={56} className="object-cover w-full h-full" />
              ) : (
                <Store className="w-full h-full p-3 text-gray-400" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-purple-400">{shopInfo?.shop_name || 'Loading...'}</h1>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-gray-400 text-sm flex items-center gap-1">
                  <MapPin size={14} /> {shopInfo?.location || 'N/A'}
                </p>
                <div className="flex items-center gap-1">
                  <span className={`h-2 w-2 rounded-full ${shopInfo?.isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></span>
                  <span className={`text-xs font-medium ${shopInfo?.isLive ? 'text-green-400' : 'text-gray-500'}`}>
                    {shopInfo?.isLive ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-4 sm:mt-0 flex items-center gap-2 bg-red-600/20 text-red-400 px-4 py-2 rounded-lg hover:bg-red-600/40 transition-colors"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <h2 className="text-3xl font-bold text-white">Dashboard</h2>
          
          {/* View Mode Toggle */}
          <div className="flex gap-2 bg-gray-800 p-1 rounded-lg">
            <motion.button
              onClick={() => {
                setViewMode('active');
                setStatusFilter('All');
              }}
              className={`px-4 py-2 rounded-md flex items-center gap-2 transition-all ${
                viewMode === 'active' 
                  ? 'bg-purple-600 text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Truck size={18} />
              Active Orders
              {activeOrders.length > 0 && (
                <span className="bg-purple-500 text-white text-xs px-2 py-1 rounded-full">
                  {activeOrders.length}
                </span>
              )}
            </motion.button>
            <motion.button
              onClick={() => {
                setViewMode('completed');
                setStatusFilter('All');
              }}
              className={`px-4 py-2 rounded-md flex items-center gap-2 transition-all ${
                viewMode === 'completed' 
                  ? 'bg-green-600 text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Archive size={18} />
              Completed
              {completedOrders.length > 0 && (
                <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                  {completedOrders.length}
                </span>
              )}
            </motion.button>
            <motion.button
              onClick={() => setViewMode('profile')}
              className={`px-4 py-2 rounded-md flex items-center gap-2 transition-all ${
                viewMode === 'profile' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <User size={18} />
              Profile
            </motion.button>
          </div>
        </div>

        {/* Profile/Stats View */}
        {viewMode === 'profile' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          >
            <StatCard icon={<ShoppingBag className="text-purple-400" />} label="Total Orders" value={totalOrders} />
            <StatCard icon={<CheckCircle className="text-green-400" />} label="Completed" value={completedOrders.length} />
            <StatCard icon={<Clock className="text-yellow-400" />} label="Pending" value={activeOrders.length} />
            <StatCard icon={<IndianRupee className="text-emerald-400" />} label="Total Earnings" value={`₹${totalEarnings}`} />
            
            <div className="md:col-span-2 lg:col-span-4 bg-gray-800 p-6 rounded-xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">Pricing Details (EP-Coins per page)</h3>
                {!isEditingPricing ? (
                  <button
                    onClick={() => setIsEditingPricing(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm transition"
                  >
                    Edit Pricing
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditedPricing(shopInfo?.pricing || { bw: 1, color: 5 });
                        setIsEditingPricing(false);
                      }}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-sm transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={updatePricing}
                      className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm transition"
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-700 p-4 rounded-lg">
                  <p className="text-gray-400 text-sm mb-2">B&W Price (per page)</p>
                  {isEditingPricing ? (
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={editedPricing.bw}
                      onChange={(e) => setEditedPricing({ ...editedPricing, bw: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 bg-gray-600 rounded text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                      title="B&W price per page"
                      placeholder="Enter B&W price"
                    />
                  ) : (
                    <p className="text-2xl font-bold flex items-center gap-1">
                      <Coins size={20} className="text-yellow-400" /> {shopInfo?.pricing.bw || 1}
                    </p>
                  )}
                </div>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <p className="text-gray-400 text-sm mb-2">Color Price (per page)</p>
                  {isEditingPricing ? (
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={editedPricing.color}
                      onChange={(e) => setEditedPricing({ ...editedPricing, color: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 bg-gray-600 rounded text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                      title="Color price per page"
                      placeholder="Enter color price"
                    />
                  ) : (
                    <p className="text-2xl font-bold flex items-center gap-1">
                      <Coins size={20} className="text-yellow-400" /> {shopInfo?.pricing.color || 5}
                    </p>
                  )}
                </div>
              </div>
              <p className="mt-4 text-sm text-gray-400">
                These prices are shown to students when placing orders. Changes will apply to new orders immediately.
              </p>

            {/* Shop Status Toggle */}
            <div className="md:col-span-2 lg:col-span-4 bg-gray-800 p-6 rounded-xl">
              <h3 className="text-xl font-semibold mb-4">Shop Status</h3>
              <div className="flex items-center justify-between bg-gray-700 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="relative flex h-6 w-6">
                    {shopInfo?.isLive && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    )}
                    <span
                      className={`relative inline-flex rounded-full h-6 w-6 ${
                        shopInfo?.isLive ? 'bg-green-500' : 'bg-gray-500'
                      }`}
                    ></span>
                  </div>
                  <div>
                    <p className="font-semibold text-lg">
                      {shopInfo?.isLive ? '🟢 Shop is Online' : '🔴 Shop is Offline'}
                    </p>
                    <p className="text-sm text-gray-400">
                      {shopInfo?.isLive 
                        ? 'Students can place orders from your shop'
                        : 'Your shop is hidden from students'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={toggleShopStatus}
                  disabled={isTogglingStatus}
                  className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                    shopInfo?.isLive
                      ? 'bg-red-600 hover:bg-red-500'
                      : 'bg-green-600 hover:bg-green-500'
                  } ${isTogglingStatus ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isTogglingStatus ? 'Updating...' : shopInfo?.isLive ? 'Go Offline' : 'Go Online'}
                </button>
              </div>
              <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-sm text-blue-300">
                  💡 <strong>Tip:</strong> Toggle your shop status based on your availability. 
                  When offline, students won&apos;t see your shop in the selection list.
                </p>
              </div>
            </div>
            </div>
          </motion.div>
        )}
        
        {viewMode !== 'profile' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <motion.div 
            className="lg:col-span-1 bg-gray-800 p-6 rounded-xl shadow-2xl border border-gray-700"
            layout
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                {viewMode === 'active' ? (
                  <>
                    <Truck className="text-purple-400" size={24} />
                    <span>Active Orders</span>
                  </>
                ) : (
                  <>
                    <Archive className="text-green-400" size={24} />
                    <span>Completed Orders</span>
                  </>
                )}
              </h2>
              
              {/* Status Filter Dropdown */}
              <div className="relative w-full sm:w-auto">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'All')}
                  className="w-full sm:w-auto bg-gray-700 border border-gray-600 px-4 py-2 pl-3 pr-10 rounded-lg text-sm font-medium focus:ring-2 focus:ring-purple-500 focus:border-purple-500 appearance-none cursor-pointer hover:bg-gray-600 transition-all"
                  title="Filter orders by status"
                >
                  <option value="All">All Status</option>
                  {viewMode === 'active' ? (
                    <>
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Ready for Pickup">Ready</option>
                    </>
                  ) : (
                    <>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </>
                  )}
                </select>
                <Filter size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
              </div>
            </div>
            
            <AnimatePresence mode="popLayout">
              <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800">
                {filteredOrders.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center py-12 px-4"
                  >
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-700/50 mb-4">
                      <Package size={32} className="text-gray-500" />
                    </div>
                    <p className="text-gray-400 font-medium">No {viewMode === 'active' ? 'active' : 'completed'} orders</p>
                    <p className="text-gray-500 text-sm mt-1">
                      {viewMode === 'active' ? 'New orders will appear here' : 'Completed orders will be listed here'}
                    </p>
                  </motion.div>
                ) : (
                  filteredOrders.map(order => (
                    <motion.div 
                      key={order.order_id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => setSelectedOrderId(order.order_id)} 
                      className={`cursor-pointer p-4 border-2 rounded-xl transition-all ${
                        selectedOrderId === order.order_id 
                          ? 'border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/20' 
                          : 'border-gray-700 hover:border-purple-400 hover:bg-gray-700/50'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-base mb-1 truncate">{order.order_id}</p>
                          <p className="text-sm text-gray-400 mb-2 flex items-center gap-1">
                            <User size={12} />
                            {order.student_name}
                          </p>
                          <div className="flex items-center gap-4">
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <Clock size={12} />
                              {new Date(order.order_time * 1000).toLocaleString()}
                            </p>
                            {order.total_cost !== undefined && (
                              <p className="text-xs text-yellow-400 flex items-center gap-1 font-semibold">
                                <Coins size={12} />
                                {order.total_cost.toFixed(2)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 ml-3">
                          {order.priority && (
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-bold">
                              <Zap size={12} />
                              Priority
                            </div>
                          )}
                          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${
                            order.status === 'Pending' ? 'bg-yellow-500/10 border border-yellow-500/30' :
                            order.status === 'In Progress' ? 'bg-blue-500/10 border border-blue-500/30' :
                            order.status === 'Ready for Pickup' ? 'bg-purple-500/10 border border-purple-500/30' :
                            order.status === 'Completed' ? 'bg-green-500/10 border border-green-500/30' :
                            'bg-red-500/10 border border-red-500/30'
                          }`}>
                            <span className="hidden sm:inline text-xs font-medium">{order.status}</span>
                            <span className="text-sm">{statusIcons[order.status]}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </AnimatePresence>
          </motion.div>
          
          <div className="lg:col-span-2">
            <AnimatePresence>
              {selectedOrder ? (
                <motion.div 
                  key={selectedOrder.order_id}
                  className="bg-gray-800 p-6 rounded-xl shadow-2xl"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 50 }}
                >
                  {/* Order Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-gray-700">
                    <div className="flex-1">
                      <h2 className="text-3xl font-bold mb-2 text-purple-300 break-all">{selectedOrder.order_id}</h2>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <FileText size={14} />
                          {selectedOrder.files.length} file(s)
                        </span>
                        <span className="text-gray-600">•</span>
                        <span className="flex items-center gap-1">
                          <User size={14} />
                          {selectedOrder.student_name}
                        </span>
                        {selectedOrder.priority && (
                          <>
                            <span className="text-gray-600">•</span>
                            <span className="flex items-center gap-1.5 font-bold text-green-400">
                              <Zap size={14} />
                              Priority Order
                            </span>
                          </>
                        )}
                      </div>
                      {selectedOrder.total_cost !== undefined && (
                        <div className="mt-3">
                          <span className="text-lg font-bold text-yellow-400 flex items-center gap-2">
                            <Coins size={18} />
                            Total Paid: {selectedOrder.total_cost.toFixed(2)} EP-Coins
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Status Controls */}
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                      <div className="flex flex-col flex-1 sm:flex-initial">
                        <label htmlFor="status-select" className="text-xs font-medium text-gray-400 mb-1.5">
                          Update Status
                        </label>
                        <select 
                          id="status-select"
                          onChange={(e) => updateOrderStatus(selectedOrder.order_id, e.target.value as Order['status'])} 
                          value={selectedOrder.status} 
                          className="bg-gray-700 border border-gray-600 px-4 py-2.5 rounded-lg text-sm font-medium focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all cursor-pointer hover:bg-gray-600"
                        >
                          <option value="Pending">Pending</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Ready for Pickup">Ready for Pickup</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </div>
                      
                      {selectedOrder.status !== 'Completed' && selectedOrder.status !== 'Cancelled' && (
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-transparent mb-1.5 select-none">Action</span>
                          <button
                            onClick={() => openCancelModal(selectedOrder)}
                            className="px-4 py-2.5 bg-red-600/20 text-red-400 border border-red-600/50 rounded-lg hover:bg-red-600/30 hover:border-red-500 transition-all flex items-center justify-center gap-2 font-medium text-sm whitespace-nowrap"
                            title="Cancel this order"
                          >
                            <X size={16} />
                            <span className="hidden sm:inline">Cancel Order</span>
                            <span className="sm:hidden">Cancel</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Files Section */}
                  <div className="mt-6 space-y-4">
                    <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                      <Printer size={20} className="text-purple-400" />
                      Files & Print Options
                    </h3>
                    <div className="space-y-3">
                      {selectedOrder.files.map((fileEntry, index) => {
                        const config = typeof fileEntry === 'string' 
                          ? (selectedOrder.config?.[index] || { name: fileEntry, copies: 1, pages: 'All', sided: 'one-sided', pageSize: 'A4' } as FileConfig)
                          : fileEntry.config;
                        const pdfFilename = getPdfFilename(fileEntry);
                        return (
                          <FileConfigCard key={index} file={config} pdfFilename={pdfFilename} />
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-gray-800 p-6 rounded-xl shadow-2xl border border-gray-700">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-purple-500/10 border-2 border-purple-500/30 mb-4">
                    <FileText size={40} className="text-purple-400" />
                  </div>
                  <p className="text-gray-300 text-lg font-semibold mb-2">No Order Selected</p>
                  <p className="text-gray-500 text-sm text-center max-w-sm">
                    Select an order from the list to view details and manage its status
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>
          </div>
        )}

        {/* Cancellation Modal */}
        <AnimatePresence>
          {isCancelModalOpen && selectedCancelOrder && (
            <motion.div
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeCancelModal}
            >
              <motion.div
                className="w-full max-w-lg rounded-2xl bg-gray-900 border-2 border-gray-700 shadow-2xl"
                initial={{ y: 20, opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 20, opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="flex items-start justify-between p-6 border-b border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-red-500/20 rounded-xl border border-red-500/30">
                      <AlertTriangle size={28} className="text-red-400" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white">Cancel Order</h3>
                      <p className="text-sm text-gray-400 mt-0.5">Order ID: {selectedCancelOrder.order_id}</p>
                    </div>
                  </div>
                  <button 
                    onClick={closeCancelModal} 
                    className="p-2 rounded-lg hover:bg-gray-800 transition-colors" 
                    title="Close"
                  >
                    <X size={20} className="text-gray-400" />
                  </button>
                </div>

                {/* Modal Content */}
                <div className="p-6">
                  <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                    <p className="text-sm text-yellow-200 flex items-start gap-2">
                      <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                      <span>
                        <strong className="font-semibold">Important:</strong> Cancelling this order will automatically refund the student if they paid with EP-Coins. This action cannot be undone.
                      </span>
                    </p>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm text-gray-300 font-semibold block mb-3">
                      Select Cancellation Reason <span className="text-red-400">*</span>
                    </label>
                    
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                      {[
                        { value: 'Out of paper/supplies', icon: '📄' },
                        { value: 'Printer not working', icon: '🖨️' },
                        { value: 'Too busy - cannot fulfill', icon: '⏰' },
                        { value: 'Shop closing early', icon: '🔒' },
                        { value: 'Cannot print these files', icon: '❌' },
                        { value: 'Student requested specific changes', icon: '✏️' },
                        { value: 'Other technical issues', icon: '⚙️' }
                      ].map((reason) => (
                        <label
                          key={reason.value}
                          className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                            cancelReason === reason.value
                              ? 'border-red-500 bg-red-500/20 shadow-lg shadow-red-500/10'
                              : 'border-gray-700 bg-gray-800 hover:border-gray-600 hover:bg-gray-750'
                          }`}
                        >
                          <input
                            type="radio"
                            name="cancelReason"
                            value={reason.value}
                            checked={cancelReason === reason.value}
                            onChange={(e) => setCancelReason(e.target.value)}
                            className="w-4 h-4 text-red-500 focus:ring-red-500 focus:ring-2 focus:ring-offset-gray-900"
                          />
                          <span className="text-lg">{reason.icon}</span>
                          <span className="text-sm text-gray-200 font-medium flex-1">{reason.value}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex gap-3 p-6 border-t border-gray-700 bg-gray-800/50">
                  <button
                    onClick={closeCancelModal}
                    className="flex-1 rounded-xl border-2 border-gray-600 bg-gray-800 py-3 text-sm font-semibold text-gray-200 hover:bg-gray-700 hover:border-gray-500 transition-all"
                  >
                    Keep Order
                  </button>
                  <button
                    onClick={handleCancelOrder}
                    disabled={!cancelReason || isCancelling}
                    className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-red-600/20 disabled:shadow-none"
                  >
                    {isCancelling ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Cancelling...
                      </span>
                    ) : (
                      'Confirm Cancellation'
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

const FileConfigCard = ({ file, pdfFilename }: { file: FileConfig; pdfFilename: string }) => {
    const [isOpen, setIsOpen] = useState(true);
    
    const getPrintModeLabel = (mode?: string) => {
        switch(mode) {
            case 'bw': return 'Black & White';
            case 'color': return 'Full Color';
            case 'mixed': return 'Mixed (B&W + Color)';
            default: return 'N/A';
        }
    };

    const handlePrint = () => {
        const printUrl = `http://localhost:5001/processed/${pdfFilename}`;
        window.open(printUrl, '_blank');
    };
    
    return (
        <motion.div 
            className="bg-gray-700/50 rounded-xl overflow-hidden border border-gray-600 hover:border-gray-500 transition-all"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <div className="w-full p-4 flex justify-between items-center bg-gray-700/30">
                <button 
                    className="flex items-center gap-3 flex-1 text-left group" 
                    onClick={() => setIsOpen(!isOpen)} 
                    title={isOpen ? "Collapse details" : "Expand details"}
                >
                    <div className="p-2 bg-gray-600/50 rounded-lg group-hover:bg-gray-600 transition-colors">
                        <FileText size={20} className="text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-base text-white truncate">{file.name}</p>
                        {file.estimatedCost !== undefined && (
                            <span className="text-xs text-yellow-400 flex items-center gap-1 mt-1">
                                <Coins size={12} /> {file.estimatedCost} EP-Coins
                            </span>
                        )}
                    </div>
                    <div className="p-2 hover:bg-gray-600 rounded-lg transition-colors">
                        {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                </button>
                <button
                    onClick={handlePrint}
                    className="ml-3 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg flex items-center gap-2 text-sm font-medium transition-all shadow-lg shadow-purple-600/20 hover:shadow-purple-500/30"
                    title="Open PDF for printing"
                >
                    <Printer size={16} />
                    <span className="hidden sm:inline">Print PDF</span>
                    <span className="sm:hidden">Print</span>
                </button>
            </div>
            <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-4 pb-4"
                >
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                        <InfoItem label="Copies" value={file.copies} icon={<Layers size={14} />} />
                        <InfoItem label="Page Size" value={file.pageSize} icon={<FileText size={14} />} />
                        <InfoItem label="Sided" value={file.sided} icon={<Scissors size={14} />} />
                        <InfoItem label="Pages" value={file.pages} icon={<FileText size={14} />} />
                        {file.printMode && (
                            <InfoItem label="Print Mode" value={getPrintModeLabel(file.printMode)} icon={<Palette size={14} />} />
                        )}
                        {file.printMode === 'mixed' && file.colorPages && (
                            <InfoItem label="Color Pages" value={file.colorPages} icon={<Palette size={14} />} />
                        )}
                        {file.bwPages !== undefined && (
                            <InfoItem label="B&W Pages" value={file.bwPages} icon={<FileText size={14} />} />
                        )}
                        {file.colorPagesCount !== undefined && (
                            <InfoItem label="Color Count" value={file.colorPagesCount} icon={<Palette size={14} />} />
                        )}
                        {file.orientation && (
                            <InfoItem label="Orientation" value={file.orientation} icon={<FileText size={14} />} />
                        )}
                    </div>
                    {file.estimatedCost !== undefined && (
                        <div className="mt-3 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                            <p className="text-yellow-400 font-semibold flex items-center gap-2 text-sm">
                                <Coins size={16} />
                                Total Estimated Cost: {file.estimatedCost} EP-Coins
                            </p>
                        </div>
                    )}
                </motion.div>
            )}
            </AnimatePresence>
        </motion.div>
    )
}

const InfoItem = ({label, value, icon}: {label: string, value: string | number, icon?: React.ReactNode}) => (
    <div className="bg-gray-600/50 p-3 rounded-lg border border-gray-600 hover:border-gray-500 transition-colors">
        <p className="text-gray-400 text-xs mb-1.5 flex items-center gap-1">
            {icon}
            {label}
        </p>
        <p className="font-semibold text-sm text-white">{value}</p>
    </div>
)

const StatCard = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | number }) => (
  <motion.div 
    className="bg-gray-800 p-6 rounded-xl flex items-center gap-4"
    whileHover={{ scale: 1.02 }}
  >
    <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center">
      {icon}
    </div>
    <div>
      <p className="text-gray-400 text-sm">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  </motion.div>
);

export default ShopDashboard;
