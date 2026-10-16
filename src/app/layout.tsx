import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'মেস ম্যানেজার — স্মার্ট মেস হিসাব ও ম্যানেজমেন্ট সিস্টেম',
  description:
    'স্বয়ংক্রিয় মিল হিসাব, রেগুলার ও ফিক্সড বাজার, বড় বাজার, ইউটিলিটি বিল এবং রিয়েল-টাইম ব্যালেন্স ট্র্যাকিং।',
};

import { AuthProvider } from '@/components/AuthProvider';
import { LanguageProvider } from '@/context/LanguageContext';
import { Toaster } from 'sonner';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
        <AuthProvider>
          <LanguageProvider>
            {children}
            <Toaster
              position="top-center"
              richColors
              theme="dark"
              closeButton
              duration={3500}
            />
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
