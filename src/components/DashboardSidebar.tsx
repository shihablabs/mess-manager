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
} from 'lucide-react';
import { AppUser } from '@/lib/session';
import Link from 'next/link';

interface DashboardSidebarProps {
  currentUser: AppUser | null;
  activeTab: string;
  onTabChange: (tabId: string) => void;
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
  activeTab,
  onTabChange,
  pendingCounts,
  cycleName = 'অক্টোবর ২০২৬',
  isMobileOpen,
  onMobileClose,
  onOpenMealRequest,
  onOpenNewBazar,
  onOpenFixedEvent,
  onOpenDeposit,
}) => {
  // State for collapsible sub-items
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    dashboard: true,
    meals: true,
    bazar: true,
    roster: false,
    utilities: false,
    members: true,
  });

  const toggleExpand = (menuId: string) => {
    setExpandedMenus((prev) => ({ ...prev, [menuId]: !prev[menuId] }));
  };

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isManager = currentUser?.role === 'admin' || isSuperAdmin;

  const menuSections = [
    {
      id: 'dashboard',
      label: 'ড্যাশবোর্ড',
      icon: LayoutDashboard,
      badge: null,
      subItems: [
        {
          id: 'overview',
          label: 'ওভারভিউ ও লাইভ ব্যালেন্স',
          action: () => {
            onTabChange('dashboard');
            onMobileClose();
          },
          isActive: activeTab === 'dashboard',
        },
      ],
    },
    {
      id: 'meals',
      label: 'মিল খাতা ও ব্যবস্থাপনা',
      icon: Utensils,
      badge: pendingCounts.mealRequests > 0 ? `${pendingCounts.mealRequests} নতুন` : null,
      subItems: [
        {
          id: 'meals_table',
          label: 'দৈনিক মিল হাজিরা খাতা',
          action: () => {
            onTabChange('meals');
            onMobileClose();
          },
          isActive: activeTab === 'meals',
        },
        {
          id: 'meal_request_quick',
          label: '⚡ জরুরি মিল অন/অফ আবেদন',
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
      label: 'বাজার খরচ ও ভাউচার',
      icon: ShoppingBag,
      badge: pendingCounts.bazars > 0 ? `${pendingCounts.bazars} নতুন` : null,
      subItems: [
        {
          id: 'bazar_list',
          label: 'বাজার তালিকা ও অনুমোদন',
          action: () => {
            onTabChange('bazar');
            onMobileClose();
          },
          isActive: activeTab === 'bazar',
        },
        {
          id: 'new_bazar_quick',
          label: '🛒 নতুন বাজার এন্ট্রি',
          action: () => {
            onOpenNewBazar();
            onMobileClose();
          },
          isQuickAction: true,
        },
        {
          id: 'fixed_event_quick',
          label: '🍗 বিশেষ ভোজ (Fixed Event)',
          action: () => {
            onOpenFixedEvent();
            onMobileClose();
          },
          isQuickAction: true,
        },
      ],
    },
    {
      id: 'roster',
      label: 'ডিউটি রোস্টার',
      icon: Calendar,
      badge: null,
      subItems: [
        {
          id: 'roster_view',
          label: 'বাজার ডিউটি শিডিউল',
          action: () => {
            onTabChange('roster');
            onMobileClose();
          },
          isActive: activeTab === 'roster',
        },
      ],
    },
    {
      id: 'utilities',
      label: 'বিল ও বড় বাজার ফান্ড',
      icon: Lightbulb,
      badge: null,
      subItems: [
        {
          id: 'utilities_view',
          label: 'ইউটিলিটি ও ফান্ড জমা',
          action: () => {
            onTabChange('utilities');
            onMobileClose();
          },
          isActive: activeTab === 'utilities',
        },
        {
          id: 'deposit_quick',
          label: '💰 টাকা জমা এন্ট্রি',
          action: () => {
            onOpenDeposit();
            onMobileClose();
          },
          isQuickAction: true,
        },
      ],
    },
    {
      id: 'members',
      label: isSuperAdmin ? 'সদস্য ও প্রশাসনিক নিয়ন্ত্রণ' : 'সদস্য তালিকা ও দায়িত্ব',
      icon: Users,
      badge: null,
      subItems: [
        {
          id: 'members_view',
          label: 'সদস্য তালিকা ও রুম ভাড়া',
          action: () => {
            onTabChange('members');
            onMobileClose();
          },
          isActive: activeTab === 'members',
        },
      ],
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-950 border-r border-slate-800/80 text-slate-200 w-72">
      {/* Brand Header */}
      <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/40">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base text-white tracking-wide">Developer Zone</span>
            </div>
            <p className="text-[11px] text-indigo-400 font-semibold tracking-wide">স্মার্ট মেস ইআরপি</p>
          </div>
        </Link>

        {/* Mobile close button */}
        <button
          onClick={onMobileClose}
          className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Cycle Indicator Badge */}
      <div className="px-4 py-3 bg-slate-900/60 border-b border-slate-800/60 flex items-center justify-between text-xs">
        <span className="text-slate-400 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          চলমান চক্র:
        </span>
        <span className="font-bold text-slate-200 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60 font-mono text-[11px]">
          {cycleName}
        </span>
      </div>

      {/* Navigation Menu with Accordion Sub-items */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 custom-scrollbar">
        {menuSections.map((menu) => {
          const Icon = menu.icon;
          const isMainActive = activeTab === menu.id;
          const isExpanded = expandedMenus[menu.id] ?? false;

          return (
            <div key={menu.id} className="rounded-xl overflow-hidden transition-all">
              {/* Main Menu Item */}
              <div
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-xs font-semibold transition-all ${
                  isMainActive
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900/80'
                }`}
                onClick={() => {
                  onTabChange(menu.id);
                  toggleExpand(menu.id);
                }}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 ${
                      isMainActive ? 'text-indigo-400' : 'text-slate-400'
                    }`}
                  />
                  <span>{menu.label}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {menu.badge && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {menu.badge}
                    </span>
                  )}
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                      isExpanded ? 'rotate-180 text-indigo-400' : ''
                    }`}
                  />
                </div>
              </div>

              {/* Sub-items (Accordion) */}
              {isExpanded && menu.subItems && (
                <div className="mt-1 ml-4 pl-3 border-l-2 border-slate-800/80 space-y-1 py-1 animate-in fade-in duration-150">
                  {menu.subItems.map((sub) => (
                    <button
                      key={sub.id}
                      onClick={sub.action}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                        sub.isActive
                          ? 'bg-indigo-600/30 text-white font-bold border-l-2 border-indigo-400'
                          : sub.isQuickAction
                          ? 'text-indigo-300/90 hover:text-indigo-200 hover:bg-indigo-950/30'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                      }`}
                    >
                      <span className="truncate">{sub.label}</span>
                      {sub.isQuickAction && (
                        <PlusCircle className="w-3 h-3 text-indigo-400 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Sidebar Footer with Quick Guide Link & Current User Badge */}
      <div className="p-3.5 border-t border-slate-800/80 bg-slate-900/50 space-y-2.5">
        <Link
          href="/#calculation-guide"
          className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold transition-colors"
        >
          <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
          <span>হিসাবের নিয়ম ও গাইড</span>
        </Link>

        {/* User Mini Card */}
        {currentUser && (
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-950/80 border border-slate-800/80">
            <img
              src={currentUser.image}
              alt={currentUser.name}
              className="w-8 h-8 rounded-full border border-slate-700 object-cover shrink-0"
            />
            <div className="truncate flex-1 text-xs">
              <div className="font-bold text-white truncate flex items-center gap-1">
                {currentUser.name}
              </div>
              <div className="text-[10px] font-medium truncate">
                {currentUser.role === 'super_admin' ? (
                  <span className="text-purple-400 font-bold flex items-center gap-0.5">
                    <Crown className="w-3 h-3 text-purple-400 inline" /> সুপার অ্যাডমিন
                  </span>
                ) : currentUser.role === 'admin' ? (
                  <span className="text-amber-400 font-bold flex items-center gap-0.5">
                    <Shield className="w-3 h-3 text-amber-400 inline" /> মেস ম্যানেজার
                  </span>
                ) : (
                  <span className="text-slate-400">👤 সাধারণ সদস্য</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar (hidden on mobile, visible md:block) */}
      <aside className="hidden md:block shrink-0 sticky top-0 h-screen z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onMobileClose}
          />
          <div className="relative z-10 animate-in slide-in-from-left duration-200 shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
