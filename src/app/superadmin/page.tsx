'use client';

import React, { useState, useEffect } from 'react';
import { Crown, Lock, User, ArrowRight, ShieldCheck, KeyRound, Building2 } from '@/components/icons';
import { signIn, useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SuperAdminPortalPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated as super_admin, redirect to dashboard
  useEffect(() => {
    if (status === 'authenticated' && (session?.user as any)?.role === 'super_admin') {
      router.replace('/dashboard');
    }
  }, [status, session, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      toast.warning('ইউজার আইডি ও পাসওয়ার্ড দিন');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await signIn('super-admin-credentials', {
        username: username.trim(),
        password,
        redirect: false,
      });

      if (res?.error || !res?.ok) {
        if (res?.error && res.error !== 'CredentialsSignin') {
          toast.error(res.error);
        } else {
          toast.error('ভুল ইউজার আইডি বা পাসওয়ার্ড! অনুগ্রহ করে সঠিক তথ্য দিন।');
        }
      } else {
        toast.success('সুপার অ্যাডমিন হিসেবে সফলভাবে প্রবেশ করেছেন!');
        router.push('/dashboard');
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 300);
      }
    } catch (err: any) {
      toast.error(err.message || 'নেটওয়ার্ক সমস্যা হয়েছে');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-950 text-slate-100 relative overflow-hidden selection:bg-purple-600 selection:text-white">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="mb-6 text-center z-10 flex flex-col items-center">
        <Link href="/" className="inline-flex items-center gap-2.5 mb-3 group">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-purple-500 flex items-center justify-center shadow-xl shadow-purple-600/30 group-hover:scale-105 transition-transform">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <span className="font-extrabold text-xl text-white tracking-wide">Developer Zone</span>
        </Link>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/60 border border-purple-500/30 text-purple-300 text-xs font-semibold">
          <Crown className="w-3.5 h-3.5 text-purple-400" />
          <span>সুপার অ্যাডমিন সিকিউরিটি পোর্টাল</span>
        </div>
      </div>

      {/* Login Card */}
      <div className="relative w-full max-w-md bg-slate-900/90 border border-purple-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl z-10 animate-in fade-in zoom-in-95 duration-200">
        <div className="mb-6">
          <h2 className="text-2xl font-black text-white">প্রশাসনিক প্রবেশাধিকার</h2>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            এটি একটি সুরক্ষিত প্রবেশদ্বার। সিস্টেম ওভারসিয়ার ব্যতীত সাধারণ মেম্বারদের জন্য গুগল লগইন নির্ধারিত।
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              ইউজার আইডি বা ইউজারনেম
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="superadmin"
                required
                autoFocus
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-purple-500 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              পাসওয়ার্ড
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-purple-500 transition-colors"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 shadow-xl shadow-purple-600/30 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>যাচাই করা হচ্ছে...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>সুপার অ্যাডমিন লগইন</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
          <Link
            href="/"
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            ← সাধারণ ওয়েবসাইটে ফিরে যান
          </Link>
        </div>
      </div>

      {/* Security Note */}
      <p className="mt-8 text-[11px] text-slate-500 text-center z-10 flex items-center gap-1.5">
        <KeyRound className="w-3.5 h-3.5" />
        <span>সুরক্ষিত এনক্রিপ্টেড সেশন • শুধুমাত্র অনুমোদিত ব্যক্তিদের জন্য</span>
      </p>
    </div>
  );
}
