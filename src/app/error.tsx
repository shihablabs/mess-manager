'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from '@/components/icons';
import Link from 'next/link';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Root App Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full glass-panel p-8 rounded-3xl border border-rose-500/30 text-center space-y-6 shadow-2xl">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black text-white">অ্যাপ্লিকেশনে ত্রুটি দেখা দিয়েছে</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            কোনো একটি ডেটা বা রেন্ডারিং প্রক্রিয়ায় সমস্যা ঘটেছে। নিরাপদ রিকভারির জন্য নিচের বাটনে ক্লিক করুন।
          </p>
          {error?.message && (
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono text-rose-300 text-left break-all select-all">
              {error.message}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={() => reset()}
            className="w-full flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>পুনরায় চেষ্টা করুন</span>
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-xs transition-all"
          >
            <Home className="w-4 h-4" />
            <span>হোমে যান</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
