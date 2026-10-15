'use client';

import React, { useState } from 'react';
import { AppUser } from '@/lib/session';
import { Shield, RefreshCw, Building2, LogOut, Crown, LayoutDashboard, BookOpen } from 'lucide-react';
import { useSession, signIn, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SuperAdminLoginModal } from '@/components/SuperAdminLoginModal';

interface NavbarProps {
  currentUser?: AppUser;
  cycleName?: string;
  isCycleClosed?: boolean;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  cycleName = 'চলমান চক্র',
  isCycleClosed = false,
  onRefresh,
  isLoading = false,
}) => {
  const { data: session, status } = useSession();
  const [isSuperAdminModalOpen, setIsSuperAdminModalOpen] = useState(false);
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith('/dashboard');

  const displayUser: AppUser = currentUser || {
    id: (session?.user as any)?.id || 'user',
    name: session?.user?.name || 'ব্যবহারকারী',
    email: session?.user?.email || '',
    role: (session?.user as any)?.role || 'member',
    image: session?.user?.image || 'https://api.dicebear.com/7.x/bottts/svg?seed=user',
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 glass-panel">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Cycle Info */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 sm:w-10 h-9 sm:h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-bold text-base sm:text-lg text-white tracking-wide">Developer Zone</span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                হিসাব চক্র: <span className="text-slate-200">{cycleName}</span>
              </p>
            </div>
          </Link>
        </div>

        {/* Center / Right Navigation Links */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          <nav className="flex items-center gap-1 mr-1 sm:mr-2">
            <Link
              href="/"
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                !isDashboard
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden xs:inline sm:inline">গাইড ও নিয়ম</span>
            </Link>

            <Link
              href="/dashboard"
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                isDashboard
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/25'
                  : 'text-slate-300 hover:text-white bg-slate-900 border border-slate-800'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>ড্যাশবোর্ড</span>
            </Link>
          </nav>

          {/* Refresh Button (on dashboard) */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              title="পুনরায় লোড করুন"
              className="p-1.5 sm:p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
          )}

          {/* If authenticated via Google */}
          {status === 'authenticated' && session?.user ? (
            <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-900/90 border border-emerald-500/30 rounded-xl px-2 sm:px-2.5 py-1 sm:py-1.5 shadow-inner">
              <div className="relative shrink-0">
                <img
                  src={session.user.image || displayUser.image}
                  alt={session.user.name || displayUser.name}
                  className="w-7 sm:w-8 h-7 sm:h-8 rounded-full border border-emerald-400 object-cover"
                />
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full border-2 border-slate-900 ${
                    displayUser.role === 'super_admin'
                      ? 'bg-purple-400'
                      : displayUser.role === 'admin'
                      ? 'bg-amber-400'
                      : 'bg-emerald-400'
                  }`}
                />
              </div>

              <div className="text-left text-xs hidden sm:block">
                <div className="font-semibold text-slate-200 truncate max-w-[100px] md:max-w-[140px] flex items-center gap-1">
                  {displayUser.name || session.user.name}
                  {displayUser.role === 'super_admin' && (
                    <Crown className="w-3.5 h-3.5 text-purple-400 inline shrink-0" />
                  )}
                  {displayUser.role === 'admin' && (
                    <Shield className="w-3.5 h-3.5 text-amber-400 inline shrink-0" />
                  )}
                </div>
                <div className="text-[10px] font-medium">
                  {displayUser.role === 'super_admin' ? (
                    <span className="text-purple-400">👑 সুপার এডমিন</span>
                  ) : displayUser.role === 'admin' ? (
                    <span className="text-amber-400">🛡️ মেস ম্যানেজার</span>
                  ) : (
                    <span className="text-slate-400">👤 সদস্য</span>
                  )}
                </div>
              </div>

              <button
                onClick={() => signOut()}
                title="লগআউট"
                className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => signIn('google')}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold bg-white text-slate-900 hover:bg-slate-100 transition-all shadow-sm cursor-pointer"
                title="গুগল দিয়ে লগইন করুন (মেম্বার)"
              >
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span className="hidden xs:inline sm:inline">মেম্বার লগইন</span>
              </button>

              <button
                onClick={() => setIsSuperAdminModalOpen(true)}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-600/20 text-purple-300 border border-purple-500/40 hover:bg-purple-600/30 transition-all cursor-pointer"
                title="সুপার অ্যাডমিন লগইন (আইডি ও পাসওয়ার্ড)"
              >
                <Crown className="w-3.5 h-3.5 text-purple-400" />
                <span className="hidden sm:inline">সুপার অ্যাডমিন</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Super Admin Login Modal */}
      <SuperAdminLoginModal
        isOpen={isSuperAdminModalOpen}
        onClose={() => setIsSuperAdminModalOpen(false)}
      />
    </header>
  );
};
