'use client';

import React, { useState } from 'react';
import {
  LayoutDashboard,
  Utensils,
  ShoppingBag,
  Calendar,
  Lightbulb,
  Users,
  ChevronDown,
  Building2,
  BookOpen,
  PlusCircle,
  FileText,
  Clock,
  Sparkles,
  Shield,
  Crown,
  X,
  CreditCard,
  UserCheck,
  User,
  Settings,
} from '@/components/icons';
import { AppUser } from '@/lib/session';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';

interface DashboardSidebarProps {
  currentUser: AppUser | null;
  pendingCounts: { mealRequests: number; bazars: number };
  cycleName?: string;
  isMobileOpen: boolean;
  onMobileClose: () => void;
  // Modal quick openers
  onOpenMealRequest: () => void;
  onOpenNewBazar: () => void;
  onOpenFixedEvent: () => void;
  onOpenDeposit: () => void;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  currentUser,
  pendingCounts,
  cycleName = 'অক্টোবর ২০২৬',
  isMobileOpen,
  onMobileClose,
  onOpenMealRequest,
  onOpenNewBazar,
  onOpenFixedEvent,
  onOpenDeposit,
}) => {
  const pathname = usePathname();
  const { t, language } = useLanguage();

  // Accordion state: only ONE menu section can be expanded at a time
  const currentSectionId = pathname?.split('/')[2] || 'dashboard';
  const [expandedSection, setExpandedSection] = useState<string | null>(currentSectionId);

  // Auto-sync expanded section when navigating between routes
  React.useEffect(() => {
    const secId = pathname?.split('/')[2] || 'dashboard';
    setExpandedSection(secId);
  }, [pathname]);

  const toggleExpand = (menuId: string) => {
    setExpandedSection((prev) => (prev === menuId ? null : menuId));
  };

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isManager = currentUser?.role === 'admin' || isSuperAdmin;

  const menuSections = [
    {
      id: 'dashboard',
      label: language === 'en' ? 'Dashboard Overview' : 'ড্যাশবোর্ড ওভারভিউ',
      href: '/dashboard',
      icon: LayoutDashboard,
      badge: null,
      isActive: pathname === '/dashboard',
      subItems: [
        {
          id: 'overview',
          label: language === 'en' ? 'Overview & Live Balance' : 'ওভারভিউ ও লাইভ ব্যালেন্স',
          href: '/dashboard',
          isActive: pathname === '/dashboard',
        },
      ],
    },
    {
      id: 'meals',
      label: language === 'en' ? 'Meal Register & System' : 'মিল খাতা ও ব্যবস্থাপনা',
      href: '/dashboard/meals',
      icon: Utensils,
      badge: pendingCounts.mealRequests > 0
        ? (language === 'en' ? `${pendingCounts.mealRequests} new` : `${pendingCounts.mealRequests} নতুন`)
        : null,
      isActive: pathname.startsWith('/dashboard/meals'),
      subItems: [
        {
          id: 'meals_table',
          label: language === 'en' ? 'Daily Meal Sheet' : 'দৈনিক মিল হাজিরা খাতা',
          href: '/dashboard/meals',
          isActive: pathname === '/dashboard/meals',
        },
        {
          id: 'meal_request_quick',
          label: language === 'en' ? '⚡ Emergency Meal Request' : '⚡ জরুরি মিল অন/অফ আবেদন',
          action: () => {
            onOpenMealRequest();
            onMobileClose();
          },
          isQuickAction: true,
        },
      ],
    },
    {
      id: 'bazar',
      label: language === 'en' ? 'Bazar List & Expenses' : 'বাজার তালিকা ও খরচ',
      href: '/dashboard/bazar',
      icon: ShoppingBag,
      isActive: pathname.startsWith('/dashboard/bazar'),
      subItems: [
        {
          id: 'bazar_list',
          label: language === 'en' ? 'Bazar List & Vouchers' : 'বাজার তালিকা ও ফর্দ',
          href: '/dashboard/bazar',
          isActive: pathname === '/dashboard/bazar',
        },
        {
          id: 'new_bazar_quick',
          label: language === 'en' ? '🛒 Add Bazar Voucher' : '🛒 নতুন বাজার এন্ট্রি',
          action: () => {
            onOpenNewBazar();
            onMobileClose();
          },
          isQuickAction: true,
        },
      ],
    },
    {
      id: 'feasts',
      label: language === 'en' ? 'Special Feast' : 'স্পেশাল ভোজ',
      href: '/dashboard/feasts',
      icon: Sparkles,
      badge: null,
      isActive: pathname.startsWith('/dashboard/feasts'),
      subItems: [
        {
          id: 'feasts_all',
          label: language === 'en' ? 'Feast List & Hub' : 'ভোজ তালিকা ও আবেদন',
          href: '/dashboard/feasts',
          isActive: pathname === '/dashboard/feasts',
        },
        {
          id: 'new_feast_quick',
          label: language === 'en' ? '✨ Schedule / Request Feast' : '✨ বিশেষ ভোজ আয়োজন / আবেদন',
          action: () => {
            onOpenFixedEvent();
            onMobileClose();
          },
          isQuickAction: true,
        },
      ],
    },
    {
      id: 'schedule',
      label: language === 'en' ? 'Duty Roster' : 'ডিউটি রোস্টার',
      href: '/dashboard/schedule',
      icon: Calendar,
      badge: null,
      isActive: pathname.startsWith('/dashboard/schedule'),
      subItems: [
        {
          id: 'roster_view',
          label: language === 'en' ? 'Bazar Duty Schedule (5-Days)' : 'বাজার ডিউটি শিডিউল (৫ দিন)',
          href: '/dashboard/schedule',
          isActive: pathname === '/dashboard/schedule',
        },
      ],
    },
    {
      id: 'bills',
      label: language === 'en' ? 'Bills & Big Bazar Fund' : 'বিল ও বড় বাজার ফান্ড',
      href: '/dashboard/bills',
      icon: Lightbulb,
      badge: null,
      isActive: pathname.startsWith('/dashboard/bills'),
      subItems: [
        {
          id: 'utilities_view',
          label: language === 'en' ? 'Utilities & Fixed Bills' : 'ইউটিলিটি ও ফিক্সড খরচ',
          href: '/dashboard/bills',
          isActive: pathname === '/dashboard/bills',
        },
        {
          id: 'deposit_quick',
          label: language === 'en' ? '💳 Deposit Money' : '💳 অগ্রিম টাকা জমা প্রদান',
          action: () => {
            onOpenDeposit();
            onMobileClose();
          },
          isQuickAction: true,
        },
      ],
    },
    // 6. User Management: STRICTLY for Super Admin and Mess Manager
    ...(isManager
      ? [
          {
            id: 'users',
            label: language === 'en' ? 'Members & Room Rent' : 'ইউজার ও সদস্য ম্যানেজমেন্ট',
            href: '/dashboard/users',
            icon: Users,
            badge: isSuperAdmin ? (language === 'en' ? 'Super Control' : 'সুপার কন্ট্রোল') : (language === 'en' ? 'Admin' : 'অ্যাডমিন'),
            isActive: pathname.startsWith('/dashboard/users'),
            subItems: [
              {
                id: 'user_management_main',
                label: language === 'en' ? 'Member List & Approvals' : 'সদস্য তালিকা ও অনুমোদন',
                href: '/dashboard/users',
                isActive: pathname === '/dashboard/users',
              },
              {
                id: 'user_roles',
                label: language === 'en' ? 'Roles & Permissions' : 'মেস ম্যানেজার ও রোল বণ্টন',
                href: '/dashboard/users#roles',
                isActive: false,
              },
              {
                id: 'user_settlement',
                label: language === 'en' ? 'Departure Settlements' : 'হিসাব নিষ্পত্তির আবেদন',
                href: '/dashboard/users#settlement',
                isActive: false,
              },
            ],
          },
        ]
      : []),
    ...(!isSuperAdmin
      ? [
          {
            id: 'profile',
            label: language === 'en' ? 'My Profile & Ledger' : 'আমার প্রোফাইল ও হিসাব',
            href: '/dashboard/profile',
            icon: User,
            badge: null,
            isActive: pathname.startsWith('/dashboard/profile'),
            subItems: [
              {
                id: 'profile_view',
                label: language === 'en' ? 'Personal Balance & Ledger' : 'ব্যক্তিগত ব্যালেন্স ও লেজার',
                href: '/dashboard/profile',
                isActive: pathname === '/dashboard/profile',
              },
            ],
          },
        ]
      : []),
    {
      id: 'settings',
      label: language === 'en' ? 'Settings' : 'সেটিংস',
      href: '/dashboard/settings',
      icon: Settings,
      badge: null,
      isActive: pathname.startsWith('/dashboard/settings'),
      subItems: [
        {
          id: 'settings_main',
          label: isSuperAdmin
            ? (language === 'en' ? 'Global Mess Configuration' : 'বড় বাজার ও মেস কনফিগারেশন')
            : (language === 'en' ? 'Preferences & Settings' : 'ব্যক্তিগত পছন্দ ও সেটিংস'),
          href: '/dashboard/settings',
          isActive: pathname === '/dashboard/settings',
        },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onMobileClose}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 lg:z-30 h-[100dvh] max-h-[100dvh] lg:h-screen lg:max-h-screen w-72 bg-slate-900/95 lg:bg-slate-900/80 backdrop-blur-xl border-r border-slate-800/80 flex flex-col overflow-hidden transition-transform duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Sidebar Brand Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <Link
            href="/"
            onClick={onMobileClose}
            className="flex items-center gap-3 group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-black text-white text-base tracking-wide flex items-center gap-1.5">
                Developer Zone
              </span>
              <p className="text-[10px] text-slate-400">
                {language === 'en' ? 'Mess Manager • ' : 'মেস ম্যানেজার • '}
                <span className="text-slate-200 font-medium">{cycleName}</span>
              </p>
            </div>
          </Link>

          {/* Mobile close button */}
          <button
            onClick={onMobileClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current User Quick Badge */}
        {currentUser && (
          <div className="px-4 py-3 mx-3 my-2.5 rounded-xl bg-slate-800/40 border border-slate-800 flex items-center gap-2.5">
            <img
              src={currentUser.image || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
              alt={currentUser.name}
              className="w-8 h-8 rounded-full border border-indigo-500/40 object-cover shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
              <div className="flex items-center gap-1 text-[10px]">
                {isSuperAdmin ? (
                  <span className="text-purple-400 font-bold flex items-center gap-0.5">
                    <Crown className="w-3 h-3 text-purple-400 inline" />{' '}
                    {language === 'en' ? 'Super Admin' : 'সুপার অ্যাডমিন'}
                  </span>
                ) : isManager ? (
                  <span className="text-amber-400 font-bold flex items-center gap-0.5">
                    <Shield className="w-3 h-3 text-amber-400 inline" />{' '}
                    {language === 'en' ? 'Mess Manager' : 'মেস ম্যানেজার'}
                  </span>
                ) : (
                  <span className="text-slate-400">
                    {language === 'en' ? '👤 Resident Member' : '👤 মেস সদস্য'}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Sections */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-1 custom-scrollbar">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 py-1">
            {language === 'en' ? 'Main Menu & Modules' : 'প্রধান মেনু ও মডিউল'}
          </div>

          {menuSections.map((section) => {
            const Icon = section.icon;
            const isExpanded = expandedSection === section.id;
            const isSectionActive = section.isActive;

            return (
              <div key={section.id} className="space-y-0.5">
                {/* Parent Menu Item */}
                <div
                  className={`flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                    isSectionActive
                      ? 'bg-indigo-600/20 text-white border border-indigo-500/30 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Link
                    href={section.href}
                    onClick={onMobileClose}
                    className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isSectionActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-200'
                      }`}
                    />
                    <span className="truncate">{section.label}</span>
                  </Link>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {section.badge && (
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded-full font-bold">
                        {section.badge}
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(section.id);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-200 rounded transition-transform cursor-pointer"
                    >
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180 text-indigo-400' : ''
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Sub-items (Accordion) */}
                {isExpanded && section.subItems && (
                  <div className="pl-8 pr-1 py-1 space-y-1 border-l-2 border-slate-800 ml-4 mb-1">
                    {section.subItems.map((sub) => {
                      if (sub.isQuickAction) {
                        return (
                          <button
                            key={sub.id}
                            onClick={sub.action}
                            className="w-full text-left flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-slate-400 hover:text-indigo-300 hover:bg-slate-800/40 transition-colors cursor-pointer"
                          >
                            <span>{sub.label}</span>
                            <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
                          </button>
                        );
                      }

                      return (
                        <Link
                          key={sub.id}
                          href={sub.href || '#'}
                          onClick={onMobileClose}
                          className={`block px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                            sub.isActive
                              ? 'text-indigo-400 bg-indigo-500/10 font-bold'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                          }`}
                        >
                          {sub.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Quick Emergency Action Box: অগ্রিম টাকা জমা ও বাজার জমা পাশাপাশি */}
        <div className="shrink-0 p-3 pb-safe border-t border-slate-800/80 bg-slate-950/90 space-y-2">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1 flex items-center justify-between">
            <span>{language === 'en' ? 'Quick Actions' : 'জরুরি শর্টকাট'}</span>
            <span className="text-[9px] text-slate-500 font-medium">
              {language === 'en' ? '2 actions' : '২টি অ্যাকশন'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {/* অগ্রিম টাকা জমা */}
            <button
              type="button"
              onClick={() => {
                onOpenDeposit();
                onMobileClose();
              }}
              className="flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600/20 to-teal-600/20 hover:from-emerald-600/30 hover:to-teal-600/30 border border-emerald-500/30 hover:border-emerald-500/50 text-emerald-300 hover:text-white text-[11px] font-bold transition-all shadow-sm cursor-pointer group active:scale-95"
              title={language === 'en' ? 'Deposit money to mess account' : 'মেসে অগ্রিম টাকা জমা প্রদান করুন'}
            >
              <CreditCard className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform shrink-0" />
              <span className="truncate">{language === 'en' ? 'Deposit Money' : 'অগ্রিম টাকা জমা'}</span>
            </button>

            {/* বাজার জমা */}
            <button
              type="button"
              onClick={() => {
                onOpenNewBazar();
                onMobileClose();
              }}
              className="flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600/20 to-purple-600/20 hover:from-indigo-600/30 hover:to-purple-600/30 border border-indigo-500/30 hover:border-indigo-500/50 text-indigo-300 hover:text-white text-[11px] font-bold transition-all shadow-sm cursor-pointer group active:scale-95"
              title={language === 'en' ? 'Submit new grocery expense voucher' : 'নতুন বাজার খরচ জমা দিন'}
            >
              <ShoppingBag className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform shrink-0" />
              <span className="truncate">{language === 'en' ? 'Add Bazar' : 'বাজার জমা'}</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
