// API configuration - centralized API URL management
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

// API endpoints
export const API_ENDPOINTS = {
  // Auth
  studentRegister: `${API_URL}/api/student/register`,
  studentLogin: `${API_URL}/api/student/login`,
  shopRegister: `${API_URL}/api/shop/register`,
  shopLogin: `${API_URL}/api/shop/login`,
  superadminLogin: `${API_URL}/api/superadmin/login`,
  
  // Shop
  shopInfo: (shopId: string) => `${API_URL}/api/shop/${shopId}`,
  shopUpdatePricing: (shopId: string) => `${API_URL}/api/shop/${shopId}/pricing`,
  shopToggleStatus: (shopId: string) => `${API_URL}/api/shop/${shopId}/status`,
  activePricing: `${API_URL}/api/pricing`,
  activeShops: `${API_URL}/api/shops/active`,
  
  // Wallet
  wallet: (userId: string) => `${API_URL}/api/wallet/${userId}`,
  walletTransactions: (userId: string) => `${API_URL}/api/wallet/${userId}/transactions`,
  walletTopupInitiate: `${API_URL}/api/wallet/topup/initiate`,
  walletTopupComplete: `${API_URL}/api/wallet/topup/complete`,
  
  // Orders
  createOrder: `${API_URL}/api/orders/create`,
  shopViewOrders: (shopId: string) => `${API_URL}/api/orders/shop-view?shop_id=${shopId}`,
  orderStatus: (orderId: string) => `${API_URL}/api/orders/${orderId}/status`,
  orderDetails: (orderId: string) => `${API_URL}/api/orders/${orderId}`,
  orderCancel: (orderId: string) => `${API_URL}/api/orders/${orderId}/cancel`,
  orderCancelShop: (orderId: string) => `${API_URL}/api/orders/${orderId}/cancel/shop`,
  userOrders: (sessionId: string) => `${API_URL}/api/orders/user/${sessionId}`,
  
  // Admin
  adminShops: `${API_URL}/api/admin/shops`,
  verifyShop: (shopId: string) => `${API_URL}/api/admin/shops/${shopId}/verify`,
  updatePricing: (shopId: string) => `${API_URL}/api/admin/shops/${shopId}/pricing`,
  
  // Static files
  pfp: (filename: string) => `${API_URL}/pfp/${filename}`,
  processed: (filename: string) => `${API_URL}/processed/${filename}`,
};
