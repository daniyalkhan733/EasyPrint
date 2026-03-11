"use client";

import { useEffect, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Check, Shield, MapPin, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { API_ENDPOINTS } from '@/lib/api';

interface Shop {
  shop_id: string;
  shop_name: string;
  username: string;
  status: 'Verification Pending' | 'Active' | 'Inactive';
  location: string;
  profile_photo: string;
}

const AdminDashboard = () => {
  const [shops, setShops] = useState<Shop[]>([]);

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.adminShops, {
        headers: {
          Authorization: 'superadmin:Admin@123'
        }
      });
      setShops(response.data);
    } catch (error) {
      console.error("Error fetching shops:", error);
    }
  };

  const verifyShop = async (shopId: string) => {
    try {
      await axios.put(API_ENDPOINTS.verifyShop(shopId), {}, {
        headers: {
          Authorization: 'superadmin:Admin@123'
        }
      });
      fetchShops(); // Refresh list
    } catch (error) {
      console.error("Error verifying shop:", error);
    }
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen p-8">
      <motion.div 
        className="container mx-auto"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-4xl font-bold text-red-500 mb-8 flex items-center gap-2"><Shield />Super-Admin Dashboard</h1>
        
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Verify New Shops</h2>
          <div className="space-y-4">
            {shops.map(shop => (
              <motion.div
                key={shop.shop_id}
                className="flex flex-col md:flex-row justify-between items-start md:items-center bg-gray-700 p-4 rounded-lg gap-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gray-600 flex-shrink-0 overflow-hidden">
                    {shop.profile_photo ? (
                      <Image src={API_ENDPOINTS.pfp(shop.profile_photo)} alt={shop.shop_name} width={64} height={64} className="object-cover" />
                    ) : (
                      <ImageIcon className="w-full h-full text-gray-400 p-4" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-lg">{shop.shop_name}</p>
                    <p className="text-sm text-gray-400">@{shop.username}</p>
                    <p className="text-sm text-gray-400 flex items-center gap-1 mt-1"><MapPin size={14} /> {shop.location}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 self-end md:self-center">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    shop.status === 'Active' ? 'bg-green-500/20 text-green-400' :
                    shop.status === 'Verification Pending' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {shop.status}
                  </span>
                  {shop.status === 'Verification Pending' && (
                    <button
                      onClick={() => verifyShop(shop.shop_id)}
                      className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <Check /> Verify
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminDashboard;
