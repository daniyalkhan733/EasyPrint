"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Edit } from 'lucide-react';

const PricingPage = () => {
  const [pricing, setPricing] = useState({ bw: 1, color: 5 });
  const [shopId, setShopId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const auth = localStorage.getItem('shop-auth');
    if (auth) {
      const authData = JSON.parse(auth);
      if (authData.role === 'shop') {
        setShopId(authData.shop_id);
      } else {
        router.push('/shop/login');
      }
    } else {
      router.push('/shop/login');
    }
  }, [router]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId) return;

    try {
      await axios.put(`http://localhost:5001/api/admin/shops/${shopId}/pricing`, { pricing }, {
        headers: {
          // This is not secure, but follows the simple auth pattern from the backend
          Authorization: 'superadmin:Admin@123' 
        }
      });
      alert('Pricing updated successfully!');
    } catch (error) {
      console.error("Error updating pricing:", error);
      alert('Failed to update pricing.');
    }
  };

  if (!shopId) {
    return <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white"><p>Loading...</p></div>;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
      <motion.div
        className="w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-lg"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <h1 className="text-3xl font-bold text-center text-purple-400 flex items-center justify-center gap-2">
          <Edit /> Manage Pricing
        </h1>
        <form onSubmit={handleUpdate} className="space-y-6">
          <div>
            <label htmlFor="bw" className="text-sm font-bold text-gray-400 block">Black & White (per page)</label>
            <input
              type="number"
              id="bw"
              value={pricing.bw}
              onChange={(e) => setPricing(p => ({ ...p, bw: Number(e.target.value) }))}
              className="w-full p-3 mt-2 text-white bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-400"
              required
            />
          </div>
          <div>
            <label htmlFor="color" className="text-sm font-bold text-gray-400 block">Color (per page)</label>
            <input
              type="number"
              id="color"
              value={pricing.color}
              onChange={(e) => setPricing(p => ({ ...p, color: Number(e.target.value) }))}
              className="w-full p-3 mt-2 text-white bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-400"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 font-bold text-white bg-purple-600 rounded-md hover:bg-purple-700 transition-colors"
          >
            Update Prices
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default PricingPage;
