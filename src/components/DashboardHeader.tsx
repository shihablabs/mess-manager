'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  RefreshCw,
  Crown,
  Shield,
  User,
  LogOut,
  FileText,
  Utensils,
  ShoppingBag,
  Wallet,
  BookOpen,
  ChevronDown,
  Sparkles,
  Zap,
  Calendar,
} from '@/components/icons';
import { AppUser } from '@/lib/session';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { toast } from 'sonner';

import { usePathname } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { LanguageToggle } from '@/components/LanguageToggle';

interface DashboardHeaderProps {
  currentUser: AppUser | null;
  activeTab?: string;
  cycleName?: string;
  isCycleClosed?: boolean;
  isLoading?: boolean;
  cycles?: any[];
  currentCycleId?: string;
  onSelectCycle?: (cycleId: string) => void;
  onRefresh?: () => void;
  onToggleMobileMenu: () => void;
  onOpenMyStatement: () => void;
  onOpenMealRequest: () => void;
  onOpenNewBazar: () => void;
  onOpenDeposit: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  currentUser,
  activeTab,
  cycleName = 'অক্টোবর ২০২৬',
  isCycleClosed = false,
  isLoading = false,
  cycles = [],
  currentCycleId,
  onSelectCycle,
  onRefresh,
  onToggleMobileMenu,
  onOpenMyStatement,
  onOpenMealRequest,
  onOpenNewBazar,
  onOpenDeposit,
}) => {
  const pathname = usePathname();
  const { t, language } = useLanguage();
  const currentPathSegment = pathname?.split('/')[2] || 'dashboard';
  const effectiveTab = activeTab || currentPathSegment;
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const getTabTitle = (tab: string) => {
    switch (tab) {
      case 'dashboard':
        return t('nav.overview');
      case 'meals':
        return t('nav.meals');
      case 'bazar':
        return t('nav.bazar');
      case 'schedule':
      case 'roster':
        return t('nav.schedule');
      case 'feasts':
      case 'feast':
        return t('nav.feasts');
      case 'bills':
      case 'utilities':
        return t('nav.bills');
      case 'users':
      case 'members':
        return t('nav.members');
      case 'profile':
        return t('nav.profile');
      case 'settings':
        return t('nav.settings');
      default:
        return t('nav.dashboard');
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isManager = currentUser?.role === 'admin';

  return (
    <header className="sticky top-0 z-30 h-16 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 flex items-center justify-between px-3 sm:px-6">
      {/* Left: Mobile hamburger toggle & Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="md:hidden p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-900 border border-slate-800 transition-colors cursor-pointer"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 hidden sm:inline">
            {language === 'en' ? 'Mess Dashboard /' : 'মেস ড্যাশবোর্ড /'}
          </span>
          <h1 className="text-sm sm:text-base font-bold text-white tracking-wide truncate max-w-[140px] xs:max-w-xs sm:max-w-none">
            {getTabTitle(effectiveTab)}
          </h1>
          {isCycleClosed && (
            <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full font-bold">
              {language === 'en' ? 'Cycle Closed' : 'চক্র বন্ধ'}
            </span>
          )}
        </div>

        {/* Cycle / Month Selector (Supports switching to previous or current months) */}
        {cycles && cycles.length > 0 && (
          <div className="hidden lg:flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1 text-xs ml-2">
            <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <select
              value={currentCycleId || ''}
              onChange={(e) => onSelectCycle && onSelectCycle(e.target.value)}
              className="bg-transparent text-slate-200 font-semibold outline-none cursor-pointer text-xs"
              title={language === 'en' ? 'Select accounting cycle' : 'হিসাব চক্র বাছাই করুন'}
            >
              {cycles.map((c) => (
                <option key={c._id} value={c._id} className="bg-slate-900 text-slate-200">
                  {c.name} {c.status === 'open' ? (language === 'en' ? '🟢 (Active)' : '🟢 (চলমান)') : (language === 'en' ? '🔒 (Archived)' : '🔒 (আর্কাইভ)')}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Language Toggle, Refresh action & Profile Dropdown Menu */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Language Switcher Toggle */}
        <LanguageToggle />

        {/* Refresh Button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isLoading}
            title={language === 'en' ? 'Refresh data' : 'তথ্য রিফ্রেশ করুন'}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        )}

        {/* Quick Emergency Meal Request Button */}
        <button
          onClick={onOpenMealRequest}
          title={language === 'en' ? 'Quick Meal Request' : 'দ্রুত মিল অন/অফ আবেদন'}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/30 text-indigo-300 text-xs font-semibold transition-all cursor-pointer"
        >
          <Zap className="w-3.5 h-3.5 text-indigo-400" />
          <span>{t('nav.entryMeal')}</span>
        </button>

        {/* Profile Dropdown Menu */}
        {currentUser && (
          <div className="relative" ref={dropdownRef}>
            {/* Trigger Button */}
            <button
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 p-1 sm:pl-2.5 sm:pr-2 sm:py-1 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-700/80 transition-all shadow-md cursor-pointer group"
            >
              <div className="relative">
                <img
                  src={currentUser.image}
                  alt={currentUser.name}
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl object-cover border ${
                    isSuperAdmin
                      ? 'border-purple-400 ring-2 ring-purple-500/20'
                      : isManager
                      ? 'border-amber-400 ring-2 ring-amber-500/20'
                      : 'border-emerald-400 ring-2 ring-emerald-500/20'
                  }`}
                />
              </div>

              <div className="text-left hidden sm:block">
                <div className="font-bold text-xs text-white truncate max-w-[110px] md:max-w-[140px] flex items-center gap-1">
                  {currentUser.name}
                </div>
                <div className="text-[10px] font-semibold">
                  {isSuperAdmin ? (
                    <span className="text-purple-400">👑 {language === 'en' ? 'Super Admin' : 'সুপার অ্যাডমিন'}</span>
                  ) : isManager ? (
                    <span className="text-amber-400">🛡️ {language === 'en' ? 'Mess Manager' : 'মেস ম্যানেজার'}</span>
                  ) : (
                    <span className="text-emerald-400">👤 {language === 'en' ? 'Member' : 'সদস্য'}</span>
                  )}
                </div>
              </div>

              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 group-hover:text-white ${
                  isDropdownOpen ? 'rotate-180 text-indigo-400' : ''
                }`}
              />
            </button>

            {/* Dropdown Popover */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                {/* Profile Header Info */}
                <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl mb-2 flex items-center gap-3">
                  <img
                    src={currentUser.image}
                    alt={currentUser.name}
                    className="w-10 h-10 rounded-xl object-cover border border-slate-700"
                  />
                  <div className="flex-1 truncate">
                    <h4 className="text-xs font-bold text-white truncate">{currentUser.name}</h4>
                    <p className="text-[11px] text-slate-400 truncate">{currentUser.email || 'developerzone.local'}</p>
                    <div className="mt-1">
                      {isSuperAdmin ? (
                        <span className="text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          <Crown className="w-3 h-3 text-purple-400" />
                          {language === 'en' ? 'Super Admin (System Controller)' : 'সুপার অ্যাডমিন (System Controller)'}
                        </span>
                      ) : isManager ? (
                        <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          <Shield className="w-3 h-3 text-amber-400" />
                          {language === 'en' ? 'Mess Manager' : 'মেস ম্যানেজার'}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          <User className="w-3 h-3 text-emerald-400" />
                          {language === 'en' ? 'Active Member' : 'সক্রিয় মেস সদস্য'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Profile Page Navigation Link (Hidden for Super Admin) */}
                {!isSuperAdmin ? (
                  <div className="mb-2 space-y-1">
                    <Link
                      href="/dashboard/profile"
                      onClick={() => setIsDropdownOpen(false)}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-indigo-400" />
                        <span>{language === 'en' ? 'My Profile & Detailed Ledger' : 'আমার প্রোফাইল ও বিস্তারিত হিসাব'}</span>
                      </div>
                      <span className="text-[10px] bg-indigo-500/25 px-2 py-0.5 rounded text-indigo-200">
                        {language === 'en' ? 'Page' : 'পেজ'}
                      </span>
                    </Link>

                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        onOpenMyStatement();
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        <span>{t('nav.myStatement')}</span>
                      </div>
                      <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                        {language === 'en' ? 'Modal' : 'মডাল'}
                      </span>
                    </button>
                  </div>
                ) : (
                  <div className="mb-2 space-y-1">
                    <Link
                      href="/dashboard/users"
                      onClick={() => setIsDropdownOpen(false)}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-purple-600/15 hover:bg-purple-600/25 text-purple-300 border border-purple-500/30 text-xs font-semibold transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-purple-400" />
                        <span>{t('nav.superAdminPortal')}</span>
                      </div>
                      <span className="text-[10px] bg-purple-500/25 px-2 py-0.5 rounded text-purple-200">
                        {language === 'en' ? 'Panel' : 'কন্ট্রোল'}
                      </span>
                    </Link>
                  </div>
                )}

                {/* Emergency Actions Menu */}
                <div className="p-1 space-y-0.5 border-b border-slate-800/80 pb-2 mb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 block mb-1">
                    ⚡ {language === 'en' ? 'Quick Actions' : 'জরুরি অ্যাকশনসমূহ'}
                  </span>

                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onOpenMealRequest();
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <Utensils className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t('nav.entryMeal')}</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onOpenNewBazar();
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{t('nav.entryBazar')}</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onOpenDeposit();
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <Wallet className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{t('nav.entryDeposit')}</span>
                  </button>
                </div>

                {/* System Guide */}
                <div className="p-1 border-b border-slate-800/80 pb-2 mb-2">
                  <Link
                    href="/#calculation-guide"
                    onClick={() => setIsDropdownOpen(false)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                    <span>{t('nav.userGuide')}</span>
                  </Link>
                </div>

                {/* Logout Button */}
                <div className="p-1">
                  <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 border border-transparent hover:border-rose-500/20 transition-all cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-400" />
                    <span>{t('nav.logout')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
