"use client";

import { useEffect, useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Store, MapPin, IndianRupee, CheckCircle, Loader2, Circle, Info } from 'lucide-react';
import Image from 'next/image';
import { API_ENDPOINTS, API_URL } from '@/lib/api';

interface Shop {
  shop_id: string;
  shop_name: string;
  location: string;
  pricing: {
    bw: number;
    color: number;
  };
  profile_photo: string;
  isLive: boolean;
}

interface ShopSelectorProps {
  selectedShopId: string | null;
  onSelectShop: (shop: Shop) => void;
}

const ShopSelector = ({ selectedShopId, onSelectShop }: ShopSelectorProps) => {
  const [shops, setShops] = useState<Shop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchActiveShops();
    // Refresh shops list frequently so online/offline state stays in sync.
    const interval = setInterval(fetchActiveShops, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchActiveShops = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.activeShops, {
        params: { _t: Date.now() },
      });
      setShops(response.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching shops:", err);
      setError("Unable to load shops. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 shadow-2xl border border-gray-700">
        <div className="flex items-center justify-center gap-3">
          <Loader2 className="animate-spin text-blue-400" size={24} />
          <p className="text-gray-300">Loading available shops...</p>
        </div>
      </div>
    );
  }

  if (error || shops.length === 0) {
    return (
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 shadow-2xl border border-gray-700">
        <div className="text-center">
          <Store className="mx-auto mb-4 text-gray-500" size={48} />
          <p className="text-gray-400 text-lg">
            {error || "No shops available at the moment."}
          </p>
          <button
            onClick={fetchActiveShops}
            className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 shadow-2xl border border-gray-700">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 flex items-center gap-2">
          <Store size={28} />
          Select a Print Shop
        </h2>
        <p className="text-gray-400 mt-2">Choose a shop based on pricing and location</p>
      </div>

      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800">
        <AnimatePresence>
          {shops.map((shop, index) => (
            <motion.button
              key={shop.shop_id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.02, x: 4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => shop.isLive && onSelectShop(shop)}
              disabled={!shop.isLive}
              className={`
                w-full relative p-4 rounded-lg border-2 transition-all text-left flex items-center gap-4
                ${
                  selectedShopId === shop.shop_id
                    ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20'
                    : shop.isLive
                    ? 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800/80'
                    : 'border-gray-800 bg-gray-900/50 opacity-60 cursor-not-allowed'
                }
              `}
            >
              {/* Selected Indicator */}
              {selectedShopId === shop.shop_id && (
                <div className="absolute -left-1 top-1/2 -translate-y-1/2">
                  <div className="w-1 h-12 bg-blue-500 rounded-r-full"></div>
                </div>
              )}

              {/* Shop Profile Photo */}
              {shop.profile_photo ? (
                <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-gray-700 flex-shrink-0">
                  <Image
                    src={API_ENDPOINTS.pfp(shop.profile_photo)}
                    alt={shop.shop_name}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <Store className="text-white" size={24} />
                </div>
              )}

              {/* Shop Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-base text-white truncate">{shop.shop_name}</h3>
                  {selectedShopId === shop.shop_id && (
                    <CheckCircle className="text-blue-400 flex-shrink-0" size={16} />
                  )}
                </div>
                <div className="flex items-center gap-1 text-gray-400 text-xs">
                  <MapPin size={12} />
                  <span className="truncate">{shop.location}</span>
                </div>
              </div>

              {/* Pricing Compact */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-center">
                  <div className="flex items-center gap-1 text-white font-semibold text-sm">
                    <IndianRupee size={12} />
                    {shop.pricing.bw}
                  </div>
                  <span className="text-gray-500 text-xs">B&W</span>
                </div>
                <div className="w-px h-8 bg-gray-700"></div>
                <div className="text-center">
                  <div className="flex items-center gap-1 text-white font-semibold text-sm">
                    <IndianRupee size={12} />
                    {shop.pricing.color}
                  </div>
                  <span className="text-gray-500 text-xs">Color</span>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex-shrink-0">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                  shop.isLive 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/40' 
                    : 'bg-gray-500/20 text-gray-500 border border-gray-500/40'
                }`}>
                  <span className={`relative flex h-2 w-2`}>
                    {shop.isLive && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    )}
                    <span
                      className={`relative inline-flex rounded-full h-2 w-2 ${
                        shop.isLive ? 'bg-green-500' : 'bg-gray-500'
                      }`}
                    ></span>
                  </span>
                  {shop.isLive ? 'Online' : 'Offline'}
                </div>
              </div>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {selectedShopId && (
        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-blue-400 text-sm flex items-center gap-2">
            <CheckCircle size={16} />
            Shop selected! You can now upload your documents.
          </p>
        </div>
      )}
    </div>
  );
};

export default ShopSelector;
