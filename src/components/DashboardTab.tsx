'use client';

import React from 'react';
import { BillingEngineOutput, MemberBillingResult } from '@/billing-engine/types';
import { formatTaka } from '@/lib/money';
import { FileText, ArrowUpRight, ArrowDownLeft, Shield, Info, Activity } from 'lucide-react';

interface DashboardTabProps {
  calculation: BillingEngineOutput | null;
  currentUserId: string;
  onOpenStatement: (member: MemberBillingResult) => void;
  auditLogs: any[];
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  calculation,
  currentUserId,
  onOpenStatement,
  auditLogs,
}) => {
  if (!calculation) return null;

  return (
    <div className="space-y-6">
      {/* 1. Members Balance Master Table */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 mb-4 border-b border-slate-800 gap-2">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-400" />
              মেসের সদস্যদের ব্যালেন্স শিট (লাইভ হিসাব)
            </h3>
            <p className="text-xs text-slate-400">
              SRS সূত্র ৫.১–৫.৫ অনুযায়ী স্বয়ংক্রিয় গণনা — অনুমোদিত সব মিল ও বাজারের সর্বশেষ ফল
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
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              CSV ডাউনলোড
            </a>

            <a
              href="/api/export?format=json"
              download
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
            >
              JSON ব্যাকআপ
            </a>
          </div>
        </div>

        {/* Mobile View: Cards (md:hidden) */}
        <div className="md:hidden space-y-3">
          {calculation.allMembersSummary.map((mem) => {
            const isCurrent = mem.userId === currentUserId;
            const isRefund = mem.netBalance >= 0;

            return (
              <div
                key={mem.userId}
                className={`p-4 rounded-xl border transition-all ${
                  isCurrent
                    ? 'bg-indigo-950/20 border-indigo-500/30'
                    : 'bg-slate-900/60 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-200 text-sm">{mem.name}</span>
                    {isCurrent && (
                      <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.2 rounded font-semibold">
                        আপনি
                      </span>
                    )}
                    {!mem.isActive && (
                      <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.2 rounded">
                        ছেড়েছেন
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => onOpenStatement(mem)}
                    className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold px-2 py-1 rounded bg-indigo-500/10 border border-indigo-500/20"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    স্টেটমেন্ট
                  </button>
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
                  <span className="text-slate-400 font-medium">চূড়ান্ত ব্যালেন্স:</span>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${
                      isRefund
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {formatTaka(mem.netBalance, { showSign: true })} {isRefund ? '(ফেরত)' : '(বাকি)'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop View: Full Master Table (hidden md:block) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400">
                <th className="pb-3 px-2">সদস্যের নাম</th>
                <th className="pb-3 px-2 text-center">মিল ইউনিট</th>
                <th className="pb-3 px-2 text-right">মিল খরচ</th>
                <th className="pb-3 px-2 text-right">ফিক্সড</th>
                <th className="pb-3 px-2 text-right">ইউটিলিটি</th>
                <th className="pb-3 px-2 text-right">রুম ভাড়া</th>
                <th className="pb-3 px-2 text-right">মোট দেনা</th>
                <th className="pb-3 px-2 text-right">মোট জমা ও বাজার</th>
                <th className="pb-3 px-2 text-right">বর্তমান ব্যালেন্স</th>
                <th className="pb-3 px-2 text-center">বিবরণী</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {calculation.allMembersSummary.map((mem) => {
                const isCurrent = mem.userId === currentUserId;
                const isRefund = mem.netBalance >= 0;

                return (
                  <tr
                    key={mem.userId}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      isCurrent ? 'bg-indigo-950/20 font-medium' : ''
                    }`}
                  >
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-200">
                          {mem.name}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.2 rounded">
                            আপনি
                          </span>
                        )}
                        {!mem.isActive && (
                          <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.2 rounded">
                            মেস ছেড়েছেন
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center font-mono text-slate-300">
                      {mem.mealUnits}
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-slate-300">
                      {formatTaka(mem.regularMealCost)}
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-slate-300">
                      {formatTaka(mem.fixedShare)}
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-slate-300">
                      {formatTaka(mem.utilityShare)}
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-slate-300">
                      {formatTaka(mem.roomRent)}
                    </td>
                    <td className="py-3 px-2 text-right font-mono font-semibold text-rose-300">
                      {formatTaka(mem.totalDues)}
                    </td>
                    <td className="py-3 px-2 text-right font-mono font-semibold text-emerald-300">
                      {formatTaka(mem.totalCredits)}
                    </td>
                    <td className="py-3 px-2 text-right">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold font-mono ${
                          isRefund
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {formatTaka(mem.netBalance, { showSign: true })}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <button
                        onClick={() => onOpenStatement(mem)}
                        className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors cursor-pointer"
                        title="পূর্ণ হিসাব বিবরণী দেখুন"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
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
