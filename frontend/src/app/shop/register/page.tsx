"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { UploadCloud } from 'lucide-react';
import { API_ENDPOINTS } from '@/lib/api';

const ShopRegisterPage = () => {
  const [shopName, setShopName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [location, setLocation] = useState('');
  const [pricing, setPricing] = useState({ bw: '', color: '' });
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!profilePhoto) {
      setError('Profile photo is required.');
      return;
    }

    const formData = new FormData();
    formData.append('shop_name', shopName);
    formData.append('username', username);
    formData.append('password', password);
    formData.append('location', location);
    formData.append('bw_price', pricing.bw);
    formData.append('color_price', pricing.color);
    formData.append('profile_photo', profilePhoto);

    try {
      const response = await axios.post(API_ENDPOINTS.shopRegister, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        setSuccess('Registration successful! You can log in once the admin verifies your shop.');
        setTimeout(() => router.push('/shop/login'), 3000);
      } else {
        setError(response.data.error || 'Registration failed');
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white py-12">
      <motion.div
        className="w-full max-w-lg p-8 space-y-6 bg-gray-800 rounded-lg"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <h1 className="text-3xl font-bold text-center text-purple-400">Xerox Shop Registration</h1>
        <form onSubmit={handleRegister} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField label="Shop Name" id="shopName" value={shopName} onChange={setShopName} />
            <InputField label="Username" id="username" value={username} onChange={setUsername} />
            <InputField label="Password" id="password" value={password} onChange={setPassword} type="password" />
            <InputField label="Location / Address" id="location" value={location} onChange={setLocation} />
            <InputField label="B&W Price per page" id="bw_price" value={pricing.bw} onChange={(val) => setPricing(p => ({...p, bw: val}))} type="number" />
            <InputField label="Color Price per page" id="color_price" value={pricing.color} onChange={(val) => setPricing(p => ({...p, color: val}))} type="number" />
          </div>
          
          <div>
            <label className="text-sm font-bold text-gray-400 block mb-2">Profile Photo</label>
            <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-600 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                {profilePhoto ? (
                  <p className="text-green-400">{profilePhoto.name}</p>
                ) : (
                  <>
                    <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-400">
                      <label htmlFor="file-upload" className="relative cursor-pointer bg-gray-700 rounded-md font-medium text-purple-400 hover:text-purple-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-purple-500">
                        <span>Upload a file</span>
                        <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={(e) => setProfilePhoto(e.target.files ? e.target.files[0] : null)} accept="image/*" />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
          {success && <p className="text-green-500 text-sm">{success}</p>}
          <button
            type="submit"
            className="w-full py-3 font-bold text-white bg-purple-600 rounded-md hover:bg-purple-700 transition-colors"
          >
            Register
          </button>
        </form>
        <p className="text-center text-sm text-gray-400">
          Already have an account? <Link href="/shop/login" className="text-purple-400 hover:underline">Login here</Link>
        </p>
      </motion.div>
    </div>
  );
};

const InputField = ({ label, id, value, onChange, type = 'text' }: { label: string, id: string, value: string, onChange: (value: string) => void, type?: string }) => (
  <div>
    <label htmlFor={id} className="text-sm font-bold text-gray-400 block">{label}</label>
    <input
      type={type}
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full p-3 mt-2 text-white bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-400"
      required
    />
  </div>
);

export default ShopRegisterPage;
