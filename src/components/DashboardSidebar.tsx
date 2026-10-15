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
} from 'lucide-react';
import { AppUser } from '@/lib/session';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

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

  // State for collapsible sub-items
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    dashboard: true,
    meals: true,
    bazar: true,
    schedule: true,
    bills: true,
    users: true,
  });

  const toggleExpand = (menuId: string) => {
    setExpandedMenus((prev) => ({ ...prev, [menuId]: !prev[menuId] }));
  };

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isManager = currentUser?.role === 'admin' || isSuperAdmin;

  const menuSections = [
    {
      id: 'dashboard',
      label: 'ড্যাশবোর্ড ওভারভিউ',
      href: '/dashboard',
      icon: LayoutDashboard,
      badge: null,
      isActive: pathname === '/dashboard',
      subItems: [
        {
          id: 'overview',
          label: 'ওভারভিউ ও লাইভ ব্যালেন্স',
          href: '/dashboard',
          isActive: pathname === '/dashboard',
        },
      ],
    },
    {
      id: 'meals',
      label: 'মিল খাতা ও ব্যবস্থাপনা',
      href: '/dashboard/meals',
      icon: Utensils,
      badge: pendingCounts.mealRequests > 0 ? `${pendingCounts.mealRequests} নতুন` : null,
      isActive: pathname.startsWith('/dashboard/meals'),
      subItems: [
        {
          id: 'meals_table',
          label: 'দৈনিক মিল হাজিরা খাতা',
          href: '/dashboard/meals',
          isActive: pathname === '/dashboard/meals',
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
      href: '/dashboard/bazar',
      icon: ShoppingBag,
      badge: pendingCounts.bazars > 0 ? `${pendingCounts.bazars} নতুন` : null,
      isActive: pathname.startsWith('/dashboard/bazar'),
      subItems: [
        {
          id: 'bazar_list',
          label: 'বাজার তালিকা ও অনুমোদন',
          href: '/dashboard/bazar',
          isActive: pathname === '/dashboard/bazar',
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
      id: 'schedule',
      label: 'ডিউটি রোস্টার',
      href: '/dashboard/schedule',
      icon: Calendar,
      badge: null,
      isActive: pathname.startsWith('/dashboard/schedule'),
      subItems: [
        {
          id: 'roster_view',
          label: 'বাজার ডিউটি শিডিউল (৫ দিন)',
          href: '/dashboard/schedule',
          isActive: pathname === '/dashboard/schedule',
        },
      ],
    },
    {
      id: 'bills',
      label: 'বিল ও বড় বাজার ফান্ড',
      href: '/dashboard/bills',
      icon: Lightbulb,
      badge: null,
      isActive: pathname.startsWith('/dashboard/bills'),
      subItems: [
        {
          id: 'utilities_view',
          label: 'ইউটিলিটি ও ফিক্সড খরচ',
          href: '/dashboard/bills',
          isActive: pathname === '/dashboard/bills',
        },
        {
          id: 'deposit_quick',
          label: '💳 অগ্রিম টাকা জমা প্রদান',
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
            label: 'ইউজার ও সদস্য ম্যানেজমেন্ট',
            href: '/dashboard/users',
            icon: Users,
            badge: isSuperAdmin ? 'সুপার কন্ট্রোল' : 'অ্যাডমিন',
            isActive: pathname.startsWith('/dashboard/users'),
            subItems: [
              {
                id: 'user_management_main',
                label: 'সদস্য তালিকা ও অনুমোদন',
                href: '/dashboard/users',
                isActive: pathname === '/dashboard/users',
              },
              {
                id: 'user_roles',
                label: 'মেস ম্যানেজার ও রোল বণ্টন',
                href: '/dashboard/users#roles',
                isActive: false,
              },
              {
                id: 'user_settlement',
                label: 'হিসাব নিষ্পত্তির আবেদন',
                href: '/dashboard/users#settlement',
                isActive: false,
              },
            ],
          },
        ]
      : []),
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
        className={`fixed lg:sticky top-0 left-0 z-50 lg:z-30 h-screen w-72 bg-slate-900/95 lg:bg-slate-900/80 backdrop-blur-xl border-r border-slate-800/80 flex flex-col transition-transform duration-300 ease-in-out ${
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
                ইআরপি • <span className="text-slate-200 font-medium">{cycleName}</span>
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
                    <Crown className="w-3 h-3 text-purple-400 inline" /> সুপার অ্যাডমিন
                  </span>
                ) : isManager ? (
                  <span className="text-amber-400 font-bold flex items-center gap-0.5">
                    <Shield className="w-3 h-3 text-amber-400 inline" /> মেস ম্যানেজার
                  </span>
                ) : (
                  <span className="text-slate-400">👤 মেস সদস্য</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 custom-scrollbar">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 py-1">
            প্রধান মেনু ও মডিউল
          </div>

          {menuSections.map((section) => {
            const Icon = section.icon;
            const isExpanded = expandedMenus[section.id];
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

        {/* Quick Emergency Action Box */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 space-y-2">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">
            জরুরি শর্টকাট
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => {
                onOpenMealRequest();
                onMobileClose();
              }}
              className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/20 text-indigo-300 text-[11px] font-bold transition-all cursor-pointer"
            >
              <Utensils className="w-3 h-3 text-indigo-400" />
              <span>মিল আবেদন</span>
            </button>
            <button
              onClick={() => {
                onOpenNewBazar();
                onMobileClose();
              }}
              className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/20 text-emerald-300 text-[11px] font-bold transition-all cursor-pointer"
            >
              <ShoppingBag className="w-3 h-3 text-emerald-400" />
              <span>বাজার জমা</span>
            </button>
          </div>
          <button
            onClick={() => {
              onOpenDeposit();
              onMobileClose();
            }}
            className="w-full flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg bg-purple-600/15 hover:bg-purple-600/25 border border-purple-500/20 text-purple-300 text-[11px] font-bold transition-all cursor-pointer"
          >
            <CreditCard className="w-3 h-3 text-purple-400" />
            <span>অগ্রিম টাকা জমা প্রদান</span>
          </button>
        </div>
      </aside>
    </>
  );
};
