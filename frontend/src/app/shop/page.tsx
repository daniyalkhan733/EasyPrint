"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ShopDashboard from '@/components/ShopDashboard';

interface ShopAuth {
  success: boolean;
  role: string;
  shop_id: string;
}

export default function ShopPage() {
  const router = useRouter();
  const [isAuth, setIsAuth] = useState(false);
  const [shopId, setShopId] = useState<string | null>(null);

  useEffect(() => {
    const authStr = localStorage.getItem('shop-auth');
    if (authStr) {
      try {
        const auth: ShopAuth = JSON.parse(authStr);
        if (auth.success && auth.role === 'shop' && auth.shop_id) {
          setIsAuth(true);
          setShopId(auth.shop_id);
        } else {
          router.push('/shop/login');
        }
      } catch {
        router.push('/shop/login');
      }
    } else {
      router.push('/shop/login');
    }
  }, [router]);

  if (!isAuth || !shopId) {
    return <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white"><p>Redirecting to login...</p></div>;
  }

  return (
    <main>
      <ShopDashboard shopId={shopId} />
    </main>
  );
}
