import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone', // For Docker deployment
  
  // Allow images from backend
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '5001',
        pathname: '/pfp/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '5001',
        pathname: '/pfp/**',
      },
      {
        protocol: 'http',
        hostname: 'backend',
        port: '5001',
        pathname: '/pfp/**',
      },
    ],
  },
};

export default nextConfig;
