import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EasyPrint - Printing made easy for students",
  description: "EasyPrint is a platform that allows students to easily print documents from any shop.",
  openGraph: {
    title: "EasyPrint - Printing made easy for students",
    description: "EasyPrint is a platform that allows students to easily print documents from any shop.",
    url: "https://easy-print-frontend.vercel.app/",
    siteName: "EasyPrint",
    images: [ 
      {
        url: '/logo.png',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "EasyPrint - Printing made easy for students",
    description: "EasyPrint is a platform that allows students to easily print documents from any shop.",
    images: ['https://easy-print-frontend.vercel.app/logo.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Toaster position="top-center" />
        <nav className="bg-gray-800 text-white p-4">
          <div className="container mx-auto flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-blue-400">EasyPrint</Link>
            <div className="flex gap-4 items-center">
              {/* <Link href="/orders" className="hover:underline">My Orders</Link> */}
              <Link href="/student/login" className="hover:underline">Student Login</Link>
              <Link href="/shop/login" className="hover:underline">Shop Login</Link>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}


