"use client";

import FileUpload from "@/components/FileUpload";
import Link from "next/link";
import { motion } from 'framer-motion';
import { useEffect, useState } from "react";
import Wallet from "@/components/Wallet";

const MotionWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {children}
    </motion.div>
  );
};

export default function HomePage() {
  const [studentAuth, setStudentAuth] = useState<{ username: string; user_id: string } | null>(null);

  useEffect(() => {
    const authData = localStorage.getItem('student-auth');
    if (authData) {
      setStudentAuth(JSON.parse(authData));
    }
  }, []);

  return (
    <main className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
      <div className="container mx-auto">
      <MotionWrapper>
        <header className="text-center mb-12">
        <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex mx-auto px-4">
          <div className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-700 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 pb-6 pt-8 backdrop-blur-2xl lg:static lg:w-auto lg:rounded-xl lg:border lg:bg-gradient-to-br lg:from-gray-800 lg:to-gray-900 lg:p-4 lg:shadow-lg">
          <span className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            {studentAuth ? `✨ Welcome, ${studentAuth.username}` : "🖨️ EasyPrint"}
          </span>
          </div>
          <div className="flex items-center gap-4 mt-4 lg:mt-0">
          {studentAuth && <Wallet />}
          <Link href="/orders" className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-purple-500/50">
            📦 Track Orders
          </Link>
          </div>
        </div>
        </header>
      </MotionWrapper>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left Side - Content */}
        <MotionWrapper>
        <div className="text-center lg:text-left">
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl md:text-7xl">
          <span className="block">Welcome to</span>
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 animate-pulse">
            EasyPrint
          </span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-gray-300 sm:text-xl leading-relaxed">
          The future of document printing is here. Upload your files, configure your prints, and get them delivered, all in one place.
          </p>
          <div className="mt-8 flex gap-3 justify-center lg:justify-start flex-wrap">
          <div className="px-4 py-2 rounded-full bg-blue-500/20 border border-blue-400/50 text-blue-300 text-sm font-medium">
            ⚡ Fast Delivery
          </div>
          <div className="px-4 py-2 rounded-full bg-purple-500/20 border border-purple-400/50 text-purple-300 text-sm font-medium">
            🔒 Secure
          </div>
          <div className="px-4 py-2 rounded-full bg-pink-500/20 border border-pink-400/50 text-pink-300 text-sm font-medium">
            💰 Affordable
          </div>
          </div>
        </div>
        </MotionWrapper>

        {/* Right Side - File Upload */}
        <MotionWrapper>
        <div className="w-full">
          <FileUpload />
        </div>
        </MotionWrapper>
      </div>
      </div>
    </main>
  );
}
