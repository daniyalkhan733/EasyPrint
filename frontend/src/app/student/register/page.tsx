"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { API_ENDPOINTS } from '@/lib/api';

const StudentRegisterPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.post(API_ENDPOINTS.studentRegister, { username, password });
      if (response.data.success) {
        router.push('/student/login');
      } else {
        setError(response.data.error || 'Registration failed');
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
      <motion.div
        className="w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-lg"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <h1 className="text-3xl font-bold text-center text-blue-400">Student Registration</h1>
        <form onSubmit={handleRegister} className="space-y-6">
          <div>
            <label htmlFor="username" className="text-sm font-bold text-gray-400 block">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 mt-2 text-white bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
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
              className="w-full p-3 mt-2 text-white bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full py-3 font-bold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          >
            Register
          </button>
        </form>
        <p className="text-center text-sm text-gray-400">
          Already have an account? <Link href="/student/login" className="text-blue-400 hover:underline">Login here</Link>
        </p>
      </motion.div>
    </div>
  );
};

export default StudentRegisterPage;
