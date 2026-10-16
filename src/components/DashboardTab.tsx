'use client';

import React, { useState, useMemo } from 'react';
import { BillingEngineOutput, MemberBillingResult } from '@/billing-engine/types';
import { formatTaka } from '@/lib/money';
import {
  FileText,
  Shield,
  Info,
  Activity,
  Search,
  User,
  ArrowUpDown,
  Filter,
  CheckCircle,
  AlertCircle,
  ExternalLink,
} from '@/components/icons';
import Link from 'next/link';

interface DashboardTabProps {
  calculation: BillingEngineOutput | null;
  currentUserId: string;
  onOpenStatement: (member: MemberBillingResult) => void;
  auditLogs: any[];
  members?: any[];
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  calculation,
  currentUserId,
  onOpenStatement,
  auditLogs,
  members = [],
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'refund' | 'due'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'mealUnits' | 'totalDues' | 'netBalance'>('name');
  const [sortAsc, setSortAsc] = useState(true);

  // Build member avatar map
  const memberMap = useMemo(() => {
    const map = new Map<string, any>();
    (members || []).forEach((m: any) => {
      const id = m.userId || m._id;
      if (id) map.set(id, m);
    });
    return map;
  }, [members]);

  // Filtered & sorted members summary (DataTable)
  const filteredMembers = useMemo(() => {
    if (!calculation?.allMembersSummary) return [];
    let list = [...calculation.allMembersSummary];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      list = list.filter((m) => m.name.toLowerCase().includes(query) || m.userId.includes(query));
    }

    // Filter by balance status
    if (statusFilter === 'refund') {
      list = list.filter((m) => m.netBalance >= 0);
    } else if (statusFilter === 'due') {
      list = list.filter((m) => m.netBalance < 0);
    }

    // Sort
    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') cmp = a.name.localeCompare(b.name, 'bn');
      else if (sortBy === 'mealUnits') cmp = a.mealUnits - b.mealUnits;
      else if (sortBy === 'totalDues') cmp = a.totalDues - b.totalDues;
      else if (sortBy === 'netBalance') cmp = a.netBalance - b.netBalance;
      return sortAsc ? cmp : -cmp;
    });

    return list;
  }, [calculation?.allMembersSummary, searchQuery, statusFilter, sortBy, sortAsc]);

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(col);
      setSortAsc(true);
    }
  };

  if (!calculation) return null;

  const refundCount = calculation.allMembersSummary.filter((m) => m.netBalance >= 0).length;
  const dueCount = calculation.allMembersSummary.filter((m) => m.netBalance < 0).length;

  return (
    <div className="space-y-6">
      {/* 1. Members Balance Master Table (DataTable) */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
        {/* Header & Export Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-800 gap-2">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-400" />
              মেসের সদস্যদের ব্যালেন্স শিট (লাইভ হিসাব)
            </h3>
            <p className="text-xs text-slate-400">
              অনুমোদিত সব মিল, বাজার ও জমার সর্বশেষ সমন্বিত ফলাফল
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400 flex items-center gap-1.5 mr-2">
              <span>রাউন্ডিং ব্যবধান:</span>
              <span className="font-mono text-slate-300 bg-slate-800 px-2 py-0.5 rounded">
                {calculation.totals.roundingDifference > 0 ? '+' : ''}
                {calculation.totals.roundingDifference} টাকা
              </span>
            </span>

            <a
              href="/api/export?format=csv"
              download
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              CSV ডাউনলোড
            </a>

            <a
              href="/api/export?format=json"
              download
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors cursor-pointer"
            >
              JSON ব্যাকআপ
            </a>
          </div>
        </div>

        {/* DataTable Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          {/* Search Box */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="সদস্যের নাম দিয়ে খুঁজুন..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                ×
              </button>
            )}
          </div>

          {/* Status Filter Chips */}
          <div className="flex items-center gap-1.5 text-xs overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              সকল সদস্য ({calculation.allMembersSummary.length})
            </button>
            <button
              onClick={() => setStatusFilter('refund')}
              className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                statusFilter === 'refund'
                  ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              পাওনা / প্লাস ({refundCount})
            </button>
            <button
              onClick={() => setStatusFilter('due')}
              className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                statusFilter === 'due'
                  ? 'bg-rose-600/30 text-rose-300 border border-rose-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              দেনা / বকেয়া ({dueCount})
            </button>
          </div>
        </div>

        {/* Mobile View: Cards (md:hidden) */}
        <div className="md:hidden space-y-3 pt-2">
          {filteredMembers.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">কোনো সদস্য খুঁজে পাওয়া যায়নি</p>
          ) : (
            filteredMembers.map((mem) => {
              const isCurrent = mem.userId === currentUserId;
              const isRefund = mem.netBalance >= 0;
              const memberUser = memberMap.get(mem.userId);
              const avatarUrl =
                memberUser?.image ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(mem.name)}&background=1e293b&color=94a3b8`;

              return (
                <div
                  key={mem.userId}
                  className={`p-4 rounded-xl border transition-all ${
                    isCurrent
                      ? 'bg-indigo-950/25 border-indigo-500/40 shadow-sm'
                      : 'bg-slate-900/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={avatarUrl}
                        alt={mem.name}
                        className="w-9 h-9 rounded-full object-cover border border-slate-700 shrink-0"
                      />
                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-200 text-sm truncate">{mem.name}</span>
                          {isCurrent && (
                            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.2 rounded font-semibold shrink-0">
                              আপনি
                            </span>
                          )}
                        </div>
                        {!mem.isActive && (
                          <span className="text-[10px] text-rose-400 block">মেস ছেড়েছেন</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Link
                        href={`/dashboard/profile?userId=${mem.userId}`}
                        className="p-1.5 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg transition-colors cursor-pointer"
                        title="প্রোফাইল পেজ"
                      >
                        <User className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => onOpenStatement(mem)}
                        className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold px-2 py-1 rounded bg-indigo-500/10 border border-indigo-500/20 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        স্টেটমেন্ট
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs border-y border-slate-800/60 py-2.5 mb-2.5">
                    <div>
                      <span className="text-slate-400 block text-[11px]">মোট মিল:</span>
                      <span className="font-mono text-slate-200 font-bold">{mem.mealUnits} ইউনিট</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">মিল খরচ:</span>
                      <span className="font-mono text-slate-200">{formatTaka(mem.regularMealCost)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">মোট দেনা:</span>
                      <span className="font-mono text-rose-300 font-semibold">{formatTaka(mem.totalDues)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">মোট জমা:</span>
                      <span className="font-mono text-emerald-300 font-semibold">{formatTaka(mem.totalCredits)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-0.5">
                    <span className="text-slate-400 font-medium">নিট ব্যালেন্স:</span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${
                        isRefund
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {formatTaka(mem.netBalance, { showSign: true })} {isRefund ? '(পাওনা)' : '(বাকি)'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop View: Full Master DataTable (hidden md:block) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th
                  onClick={() => toggleSort('name')}
                  className="pb-3 px-3 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>সদস্যের নাম ও ছবি</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('mealUnits')}
                  className="pb-3 px-2 text-center cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>মিল ইউনিট</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="pb-3 px-2 text-right">মিল খরচ</th>
                <th className="pb-3 px-2 text-right">ফিক্সড</th>
                <th className="pb-3 px-2 text-right">ইউটিলিটি</th>
                <th className="pb-3 px-2 text-right">রুম ভাড়া</th>
                <th
                  onClick={() => toggleSort('totalDues')}
                  className="pb-3 px-2 text-right cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>মোট দেনা</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="pb-3 px-2 text-right">মোট জমা ও বাজার</th>
                <th
                  onClick={() => toggleSort('netBalance')}
                  className="pb-3 px-2 text-right cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>বর্তমান ব্যালেন্স</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="pb-3 px-2 text-center">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500">
                    কোনো সদস্য খুঁজে পাওয়া যায়নি
                  </td>
                </tr>
              ) : (
                filteredMembers.map((mem) => {
                  const isCurrent = mem.userId === currentUserId;
                  const isRefund = mem.netBalance >= 0;
                  const memberUser = memberMap.get(mem.userId);
                  const avatarUrl =
                    memberUser?.image ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(mem.name)}&background=1e293b&color=94a3b8`;

                  return (
                    <tr
                      key={mem.userId}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isCurrent ? 'bg-indigo-950/20 font-medium' : ''
                      }`}
                    >
                      {/* Name with Profile Picture */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={avatarUrl}
                            alt={mem.name}
                            className="w-8 h-8 rounded-full object-cover border border-slate-700 shrink-0"
                          />
                          <div className="truncate max-w-[150px]">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-white truncate">{mem.name}</span>
                              {isCurrent && (
                                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.2 rounded shrink-0">
                                  আপনি
                                </span>
                              )}
                            </div>
                            {!mem.isActive && (
                              <span className="text-[9px] text-rose-400 block">মেস ছেড়েছেন</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Meal Units */}
                      <td className="py-3 px-2 text-center font-mono text-slate-200">
                        {mem.mealUnits}
                      </td>

                      {/* Meal Cost */}
                      <td className="py-3 px-2 text-right font-mono text-slate-300">
                        {formatTaka(mem.regularMealCost)}
                      </td>

                      {/* Fixed Feast */}
                      <td className="py-3 px-2 text-right font-mono text-slate-300">
                        {formatTaka(mem.fixedShare)}
                      </td>

                      {/* Utility */}
                      <td className="py-3 px-2 text-right font-mono text-slate-300">
                        {formatTaka(mem.utilityShare)}
                      </td>

                      {/* Room Rent */}
                      <td className="py-3 px-2 text-right font-mono text-slate-300">
                        {formatTaka(mem.roomRent)}
                      </td>

                      {/* Total Dues */}
                      <td className="py-3 px-2 text-right font-mono font-semibold text-rose-300">
                        {formatTaka(mem.totalDues)}
                      </td>

                      {/* Total Credits */}
                      <td className="py-3 px-2 text-right font-mono font-semibold text-emerald-300">
                        {formatTaka(mem.totalCredits)}
                      </td>

                      {/* Net Balance (Plus / Minus) */}
                      <td className="py-3 px-2 text-right">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold font-mono ${
                            isRefund
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {formatTaka(mem.netBalance, { showSign: true })}
                        </span>
                      </td>

                      {/* Action Buttons: Profile Page & Statement Modal */}
                      <td className="py-3 px-2 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Link
                            href={`/dashboard/profile?userId=${mem.userId}`}
                            className="p-1.5 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg transition-colors cursor-pointer"
                            title="পূর্ণাঙ্গ প্রোফাইল ও ইতিহাস দেখুন"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            onClick={() => onOpenStatement(mem)}
                            className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors cursor-pointer"
                            title="স্টেটমেন্ট মডাল দেখুন"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Mess Pool Breakdown & Audit Trail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pool Summary */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Info className="w-4 h-4 text-indigo-400" />
            মিল রেট গণনার ভিত্তি ও পুলের সারসংক্ষেপ
          </h4>
          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">অনুমোদিত রেগুলার বাজার (B_regular)</span>
              <span className="font-mono text-slate-200">{formatTaka(calculation.totalRegularBazar)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">মিল পুলে এক্সট্রা বাজার (B_extra pool)</span>
              <span className="font-mono text-slate-200">{formatTaka(calculation.totalExtraBazarPool)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">বড় বাজারের খরচ বাদ ক্যারি (S_big - L_carry)</span>
              <span className="font-mono text-slate-200">
                {formatTaka(calculation.totalBigBazarCost - calculation.bigBazarCarryToNextCycle)}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800 font-semibold">
              <span className="text-slate-300">মোট মিল পুল (Meal Pool Total)</span>
              <span className="font-mono text-indigo-400">{formatTaka(calculation.mealPoolTotal)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">সক্রিয় মোট মিল ইউনিট (U_total)</span>
              <span className="font-mono text-slate-200">{calculation.totalMealUnits} ইউনিট</span>
            </div>
            <div className="flex justify-between py-2 bg-indigo-950/30 px-3 rounded-xl border border-indigo-500/20 font-bold">
              <span className="text-indigo-300">মিল রেট = পুল ÷ মোট মিল</span>
              <span className="font-mono text-indigo-300 text-sm">{formatTaka(calculation.mealRate, { decimals: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Audit Log Activity */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-3">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            অডিট ট্রেইল ও কার্যক্রম ইতিহাস (Audit Log)
          </h4>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {auditLogs.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">কোনো অডিট লগ রেকর্ড নেই</p>
            ) : (
              auditLogs.map((log) => (
                <div
                  key={log._id}
                  className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-start justify-between gap-3 text-xs"
                >
                  <div>
                    <p className="font-medium text-slate-200">{log.action}</p>
                    <p className="text-[11px] text-slate-400">
                      কর্তৃক: <span className="text-slate-300">{log.performedByUserName}</span>
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-500 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleDateString('bn-BD')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
