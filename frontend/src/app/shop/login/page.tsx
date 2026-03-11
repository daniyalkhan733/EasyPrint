"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { API_ENDPOINTS } from '@/lib/api';

const ShopLoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.post(API_ENDPOINTS.shopLogin, { username, password });
      if (response.data.success && response.data.role === 'shop') {
        localStorage.setItem('shop-auth', JSON.stringify(response.data));
        router.push('/shop');
      } else {
        setError(response.data.error || 'Invalid username or password');
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Login failed. Please try again.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
      <motion.div
        className="w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-lg"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <h1 className="text-3xl font-bold text-center text-purple-400">Shop Login</h1>
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="username" className="text-sm font-bold text-gray-400 block">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 mt-2 text-white bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-400"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="text-sm font-bold text-gray-400 block">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 mt-2 text-white bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-400"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full py-3 font-bold text-white bg-purple-600 rounded-md hover:bg-purple-700 transition-colors"
          >
            Login
          </button>
        </form>
        <p className="text-center text-sm text-gray-400">
          New shop? <Link href="/shop/register" className="text-purple-400 hover:underline">Register here</Link>
        </p>
      </motion.div>
    </div>
  );
};

export default ShopLoginPage;
