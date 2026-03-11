"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminDashboard from '@/components/AdminDashboard';

export default function AdminPage() {
  const router = useRouter();
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    const auth = localStorage.getItem('shop-auth');
    if (auth) {
        const authData = JSON.parse(auth);
        if (authData.role === 'superadmin') {
            setIsAuth(true);
        } else {
            router.push('/superadmin/login');
        }
    } else {
      router.push('/superadmin/login');
    }
  }, [router]);

  if (!isAuth) {
    return <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white"><p>Redirecting to login...</p></div>;
  }

  return (
    <main>
      <AdminDashboard />
    </main>
  );
}
