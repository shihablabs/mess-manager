'use client';

import React, { useEffect } from 'react';
import { ShieldAlert, RefreshCw, Home, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard Error Caught by Next.js Error Boundary:', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 sm:p-8">
      <div className="max-w-md w-full glass-panel p-6 sm:p-8 rounded-3xl border border-rose-500/30 text-center space-y-5 shadow-2xl shadow-rose-950/50">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-xl shadow-rose-500/10">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
            ড্যাশবোর্ড নিরাপত্তা রিকভারি
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            পেজ লোড করার সময় একটি ত্রুটি ঘটেছে
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            মেসের ডেটা বা গণনায় সাময়িক অসামঞ্জস্য পাওয়া গেছে। সিস্টেম ক্র্যাশ হওয়া রোধ করা হয়েছে।
          </p>
          {error?.message && (
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-rose-300 text-left break-all select-all">
              Error: {error.message}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
          <button
            onClick={() => reset()}
            className="w-full flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>পুনরায় লোড করুন</span>
          </button>
          <Link
            href="/dashboard"
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-xs transition-all"
          >
            <Home className="w-4 h-4 text-emerald-400" />
            <span>ওভারভিউ</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
