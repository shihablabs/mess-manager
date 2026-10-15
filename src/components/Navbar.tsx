'use client';

import React from 'react';
import { AppUser, DEMO_USERS } from '@/lib/session';
import { Shield, User, RefreshCw, Sparkles, Building2 } from 'lucide-react';

interface NavbarProps {
  currentUser: AppUser;
  onSwitchUser: (user: AppUser) => void;
  cycleName: string;
  isCycleClosed: boolean;
  onRefresh: () => void;
  isLoading: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onSwitchUser,
  cycleName,
  isCycleClosed,
  onRefresh,
  isLoading,
}) => {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 glass-panel">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Cycle Info */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-white tracking-wide">শান্তিনীড় মেস</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                ERP v1.0
              </span>
              <span
                className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                  isCycleClosed
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                }`}
              >
                {isCycleClosed ? 'চক্র বন্ধ (Closed)' : 'চলমান চক্র (Active)'}
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              হিসাব চক্র: <span className="text-slate-200">{cycleName}</span>
            </p>
          </div>
        </div>

        {/* User Role Switcher & Live indicator */}
        <div className="flex items-center gap-3">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            title="পুনরায় লোড করুন"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>

          {/* User selector dropdown / switcher */}
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-xl px-2.5 py-1.5 shadow-inner">
            <div className="relative">
              <img
                src={currentUser.image}
                alt={currentUser.name}
                className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700"
              />
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${
                  currentUser.role === 'admin' ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
              />
            </div>

            <div className="hidden md:block text-left mr-1">
              <div className="text-xs font-semibold text-slate-200 flex items-center gap-1">
                {currentUser.name}
                {currentUser.role === 'admin' && (
                  <Shield className="w-3 h-3 text-amber-400" />
                )}
              </div>
              <div className="text-[10px] text-slate-400 capitalize">
                {currentUser.role === 'admin' ? 'ম্যানেজার / Admin' : 'মেম্বার / Member'}
              </div>
            </div>

            <select
              value={currentUser.id}
              onChange={(e) => {
                const found = DEMO_USERS.find((u) => u.id === e.target.value);
                if (found) onSwitchUser(found);
              }}
              className="bg-slate-800 text-xs text-slate-300 border border-slate-700 rounded-lg px-2 py-1 outline-none focus:border-indigo-500 cursor-pointer"
            >
              <optgroup label="ভূমিকা পরিবর্তন করুন (Role Switch)">
                {DEMO_USERS.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.role === 'admin' ? '👑 ' : '👤 '}
                    {u.name} ({u.role})
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>
      </div>
    </header>
  );
};
