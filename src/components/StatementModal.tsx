'use client';

import React from 'react';
import { MemberBillingResult, BillingEngineOutput } from '@/billing-engine/types';
import { formatTaka } from '@/lib/money';
import { Printer, X, CheckCircle, FileText } from 'lucide-react';

interface StatementModalProps {
  member: MemberBillingResult | null;
  calculation: BillingEngineOutput | null;
  cycleName: string;
  onClose: () => void;
}

export const StatementModal: React.FC<StatementModalProps> = ({
  member,
  calculation,
  cycleName,
  onClose,
}) => {
  const [formattedDate, setFormattedDate] = React.useState('');

  React.useEffect(() => {
    setFormattedDate(new Date().toLocaleDateString('bn-BD'));
  }, []);

  if (!member || !calculation) return null;

  const isRefund = member.netBalance >= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="font-bold text-white text-base">হিসাব-বিবরণী (Statement)</h3>
              <p className="text-xs text-slate-400">{cycleName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              প্রিন্ট / PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Statement Content (SRS Section 4.10) */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-200 print:text-black print:bg-white">
          {/* Header Info */}
          <div className="flex justify-between items-start border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-xl font-bold text-white print:text-black">শান্তিনীড় মেস</h2>
              <p className="text-xs text-slate-400 print:text-gray-600">হিসাব চক্র: {cycleName}</p>
              <p className="text-xs text-slate-400 print:text-gray-600">
                প্রস্তুতকরণের তারিখ: {formattedDate || '—'}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400">সদস্যের নাম:</span>
              <div className="text-base font-bold text-indigo-400 print:text-black">
                {member.name}
              </div>
              <span className="text-xs text-slate-400">
                স্ট্যাটাস: {member.isActive ? 'সক্রিয়' : 'মেস ছেড়েছেন'}
              </span>
            </div>
          </div>

          {/* Dues Breakdown */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              দেনা বা খরচের বিবরণী (Dues)
            </h4>
            <div className="space-y-2 text-xs border border-slate-800 rounded-xl p-3 bg-slate-950/40">
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span>
                  মিল খরচ ({member.mealUnits} ইউনিট × {formatTaka(calculation.mealRate, { decimals: 2 })})
                </span>
                <span className="font-mono font-bold text-slate-200">{formatTaka(member.regularMealCost)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span>রুম ভাড়া</span>
                <span className="font-mono font-bold text-slate-200">{formatTaka(member.roomRent)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span>ইউটিলিটি বিলের অংশ (সমান ভাগ)</span>
                <span className="font-mono font-bold text-slate-200">{formatTaka(member.utilityShare)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span>ফিক্সড বাজার শেয়ার (উপস্থিত ভোজ)</span>
                <span className="font-mono font-bold text-slate-200">{formatTaka(member.fixedShare)}</span>
              </div>
              <div className="flex justify-between pt-1 font-bold text-rose-400">
                <span>মোট প্রদেয় দেনা</span>
                <span className="font-mono text-sm">{formatTaka(member.totalDues)}</span>
              </div>
            </div>
          </div>

          {/* Credits Breakdown */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              জমা ও খরচের বিবরণী (Credits)
            </h4>
            <div className="space-y-2 text-xs border border-slate-800 rounded-xl p-3 bg-slate-950/40">
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span>সাধারণ জমা (General Deposits)</span>
                <span className="font-mono font-bold text-slate-200">{formatTaka(member.generalDeposits)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span>বড় বাজারের জমা (Big Bazar Contribution)</span>
                <span className="font-mono font-bold text-slate-200">{formatTaka(member.bigBazarDeposits)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span>অনুমোদিত নিজস্ব বাজার খরচ (Personal Money)</span>
                <span className="font-mono font-bold text-slate-200">
                  {formatTaka(member.approvedBazarSpentOwnMoney)}
                </span>
              </div>
              <div className="flex justify-between pt-1 font-bold text-emerald-400">
                <span>মোট পাওনা / ক্রেডিট</span>
                <span className="font-mono text-sm">{formatTaka(member.totalCredits)}</span>
              </div>
            </div>
          </div>

          {/* Net Final Balance */}
          <div
            className={`p-4 rounded-xl border flex items-center justify-between ${
              isRefund
                ? 'bg-emerald-950/30 border-emerald-500/30'
                : 'bg-rose-950/30 border-rose-500/30'
            }`}
          >
            <div>
              <div className="text-xs font-bold text-slate-300">
                চূড়ান্ত ব্যালেন্স = মোট পাওনা বাদ মোট দেনা
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {isRefund
                  ? 'মেস থেকে সদস্য এই টাকা ফেরত পাবেন।'
                  : 'সদস্যকে মেসের ফান্ডে এই টাকা পরিশোধ করতে হবে।'}
              </div>
            </div>
            <div
              className={`text-2xl font-black font-mono ${
                isRefund ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatTaka(member.netBalance, { showSign: true })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
