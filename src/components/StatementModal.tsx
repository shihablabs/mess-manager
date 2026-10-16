'use client';

import React, { useState } from 'react';
import { MemberBillingResult, BillingEngineOutput } from '@/billing-engine/types';
import { calculateDepartureMealRateImpact } from '@/billing-engine';
import { formatTaka, formatMealUnits } from '@/lib/money';
import { Printer, X, CheckCircle, FileText, UserMinus, Clock, AlertTriangle } from '@/components/icons';
import { AppUser } from '@/lib/session';
import { toast } from 'sonner';
import { confirmAction } from '@/lib/alerts';

interface StatementModalProps {
  member: MemberBillingResult | null;
  calculation: BillingEngineOutput | null;
  cycleName: string;
  currentUser?: AppUser;
  deposits?: any[];
  onRefresh?: () => void;
  onClose: () => void;
}

export const StatementModal: React.FC<StatementModalProps> = ({
  member,
  calculation,
  cycleName,
  currentUser,
  deposits = [],
  onRefresh,
  onClose,
}) => {
  const [formattedDate, setFormattedDate] = React.useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [settlementRequested, setSettlementRequested] = useState(false);
  const [settlementType, setSettlementType] = useState<'current_rate_final' | 'cycle_end_adjustment'>('current_rate_final');
  const [rentSettlementType, setRentSettlementType] = useState<'pro_rata' | 'full_month'>('pro_rata');
  const [departureDate, setDepartureDate] = useState<string>(new Date().toISOString().split('T')[0]);

  React.useEffect(() => {
    setFormattedDate(new Date().toLocaleDateString('bn-BD'));
  }, []);

  if (!member || !calculation) return null;

  const isRefund = member.netBalance >= 0;
  const isManagerOrSuperAdmin =
    currentUser?.role === 'super_admin' || currentUser?.role === 'admin';
  const isOwnStatement = currentUser?.id === member.userId;

  // Filter approved deposit entries for this member
  const memberApprovedDeposits = deposits.filter(
    (d) =>
      String(d.userId) === String(member.userId) &&
      (d.isPaid || d.status === 'approved')
  );

  const getMethodName = (method?: string) => {
    switch (method?.toLowerCase()) {
      case 'bkash':
        return 'বিকাশ';
      case 'nagad':
        return 'নগদ';
      case 'rocket':
        return 'রকেট';
      case 'bank':
        return 'ব্যাংক';
      case 'cash':
      default:
        return 'ক্যাশ';
    }
  };

  // Handle member requesting settlement
  const handleRequestSettlement = async () => {
    const isConfirmed = await confirmAction({
      title: 'চূড়ান্ত হিসাব নিষ্পত্তির আবেদন',
      text: 'আপনি কি মেস ছাড়ার জন্য বর্তমান চলতি চক্রে আপনার হিসাব চূড়ান্ত নিষ্পত্তির আবেদন পাঠাতে চান?',
      confirmText: 'হ্যাঁ, আবেদন পাঠান',
      confirmColor: '#4f46e5',
      icon: 'question',
    });
    if (!isConfirmed) return;
    try {
      setIsSubmitting(true);
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request_settlement',
          userId: member.userId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSettlementRequested(true);
        toast.success('হিসাব নিষ্পত্তির আবেদন অ্যাডমিনের নিকট পাঠানো হয়েছে!');
        onRefresh?.();
      } else {
        toast.error(data.error || 'আবেদন পাঠাতে ব্যর্থ হয়েছে');
      }
    } catch (e: any) {
      toast.error(e.message || 'ত্রুটি ঘটেছে');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle admin finalizing settlement
  const handleConfirmSettlement = async () => {
    const isConfirmed = await confirmAction({
      title: 'সদস্যের চূড়ান্ত হিসাব নিষ্পত্তি (Settle)',
      text: `আপনি কি নিশ্চিত যে ${member.name}-এর অবশিষ্ট দেনা/পাওনা চূড়ান্ত নিষ্পত্তি করতে চান? এর পর এই চক্রে তাঁর হিসাব অপরিবর্তনীয় থাকবে।`,
      confirmText: 'হ্যাঁ, চূড়ান্ত নিষ্পত্তি সম্পন্ন করুন',
      confirmColor: '#10b981',
      icon: 'warning',
    });
    if (!isConfirmed) return;
    try {
      setIsSubmitting(true);
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm_settlement',
          userId: member.userId,
          settlementType,
          rentSettlementType,
          leftDate: departureDate,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('সদস্যের হিসাব চূড়ান্ত নিষ্পত্তি সম্পন্ন হয়েছে!');
        onRefresh?.();
        onClose();
      } else {
        toast.error(data.error || 'নিষ্পত্তি ব্যর্থ হয়েছে');
      }
    } catch (e: any) {
      toast.error(e.message || 'ত্রুটি ঘটেছে');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm print:static print:p-0 print:bg-white print:z-auto print:block">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden print:border-none print:shadow-none print:w-full print:max-w-none printable-statement">
        {/* Modal Actions Bar (hidden when printing) */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/40 print:hidden no-print">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-semibold text-slate-300">
              সদস্যের ব্যক্তিগত আর্থিক হিসাব বিবরণী
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              প্রিন্ট / PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Statement Content (SRS Section 4.10) */}
        <div className="p-6 overflow-y-auto space-y-5 text-slate-200 print:text-black print:bg-white max-h-[85vh] print:max-h-none print:overflow-visible print:p-2">
          {/* Header Info */}
          <div className="flex justify-between items-start border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-xl font-bold text-white print:text-black">Developer Zone</h2>
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
              <span className="text-xs font-mono text-slate-400">ID: {member.userId.slice(-6)}</span>
            </div>
          </div>

          {/* KPI Strip for Member */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print-avoid-break">
            <div className="p-3 bg-slate-950/50 border border-slate-800/80 rounded-xl print:border-gray-300">
              <span className="text-[11px] text-slate-400 block">মোট মিল ইউনিট</span>
              <span className="text-base font-bold text-white print:text-black font-mono">
                {formatMealUnits(member.mealUnits)}
              </span>
            </div>
            <div className="p-3 bg-slate-950/50 border border-slate-800/80 rounded-xl print:border-gray-300">
              <span className="text-[11px] text-slate-400 block">মিল রেট</span>
              <span className="text-base font-bold text-indigo-400 print:text-black font-mono">
                {formatTaka(calculation.mealRate)}
              </span>
            </div>
            <div className="p-3 bg-slate-950/50 border border-slate-800/80 rounded-xl print:border-gray-300">
              <span className="text-[11px] text-slate-400 block">মোট জমা (Credit)</span>
              <span className="text-base font-bold text-emerald-400 print:text-black font-mono">
                {formatTaka(member.totalCredits)}
              </span>
            </div>
            <div className="p-3 bg-slate-950/50 border border-slate-800/80 rounded-xl print:border-gray-300">
              <span className="text-[11px] text-slate-400 block">মোট খরচ (Debit)</span>
              <span className="text-base font-bold text-rose-400 print:text-black font-mono">
                {formatTaka(member.totalDues)}
              </span>
            </div>
          </div>

          {/* Dues Breakdown */}
          <div className="space-y-3 print-avoid-break">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              দেনা ও খরচের ভাগ (Dues / Debits)
            </h4>
            <div className="space-y-2 text-xs border border-slate-800 rounded-xl p-3 bg-slate-950/40 print:border-gray-300 print:bg-white">
              {/* Prominent Distinct House Rent */}
              <div className="flex justify-between py-1.5 border-b border-slate-800/80 print:border-gray-200 bg-amber-500/5 print:bg-gray-50 px-2 rounded">
                <div className="flex flex-col">
                  <span className="font-bold text-amber-300 print:text-black">
                    🏠 নির্ধারিত বাসা / রুম ভাড়া (ডিফল্ট ফিক্সড চার্জ)
                  </span>
                  {member.stayedDays !== undefined && member.totalDays && member.stayedDays < member.totalDays && (
                    <span className="text-[10px] text-amber-400/80">
                      (অবস্থান: {member.stayedDays}/{member.totalDays} দিন{member.unrecoveredRent ? ` • অনাদায়ী অংশ: ৳${member.unrecoveredRent}` : ''})
                    </span>
                  )}
                </div>
                <span className="font-mono font-bold text-amber-300 print:text-black">
                  {formatTaka(member.roomRent)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80 print:border-gray-200 px-2">
                <div className="flex flex-col">
                  <span>
                    মিল বাবদ খরচ ({formatMealUnits(member.mealUnits)} × {formatTaka(member.effectiveMealRate ?? calculation.mealRate)})
                  </span>
                  {member.effectiveMealRate !== undefined && member.effectiveMealRate !== calculation.mealRate && (
                    <span className="text-[10px] text-indigo-400">
                      ({member.settlementType === 'current_rate_final' ? 'মাঝপথে ছাড়ায় লকড রেট' : 'সমন্বয়কৃত চূড়ান্ত রেট'})
                    </span>
                  )}
                </div>
                <span className="font-mono font-bold text-slate-200 print:text-black">{formatTaka(member.regularMealCost)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80 print:border-gray-200 px-2">
                <span>ফিক্সড বাজার শেয়ার (স্পেশাল মিল)</span>
                <span className="font-mono font-bold text-slate-200 print:text-black">{formatTaka(member.fixedShare)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80 print:border-gray-200 px-2">
                <div className="flex flex-col">
                  <span>ইউটিলিটি ও আনুষঙ্গিক বিলের ভাগ</span>
                  {member.stayedDays !== undefined && member.totalDays && member.stayedDays < member.totalDays && !member.isUtilityExempt && (
                    <span className="text-[10px] text-slate-400">
                      (দিনের অনুপাতে: {member.stayedDays}/{member.totalDays} দিন)
                    </span>
                  )}
                </div>
                <span className="font-mono font-bold text-slate-200 print:text-black">
                  {member.isUtilityExempt ? 'মওকুফ (৳০)' : formatTaka(member.utilityShare)}
                </span>
              </div>
              {member.extraShareNonPool > 0 && (
                <div className="flex justify-between py-1 border-b border-slate-800/80 print:border-gray-200 px-2">
                  <span>এক্সট্রা বাজার শেয়ার (নন-পুল)</span>
                  <span className="font-mono font-bold text-slate-200 print:text-black">
                    {formatTaka(member.extraShareNonPool)}
                  </span>
                </div>
              )}
              <div className="flex justify-between pt-1 font-bold text-rose-400 print:text-red-700 px-2">
                <span>মোট দেনা (Total Dues)</span>
                <span className="font-mono text-sm">{formatTaka(member.totalDues)}</span>
              </div>
            </div>
          </div>

          {/* Credits Breakdown with Itemized Installments */}
          <div className="space-y-3 print-avoid-break">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>জমা ও পরিশোধের বিবরণী (Credits & Paid Installments)</span>
              {memberApprovedDeposits.length > 0 && (
                <span className="text-[10px] text-emerald-400 lowercase font-normal">
                  ({memberApprovedDeposits.length}টি কিস্তির হিসাব)
                </span>
              )}
            </h4>
            <div className="space-y-2 text-xs border border-slate-800 rounded-xl p-3 bg-slate-950/40 print:border-gray-300 print:bg-white">
              {/* Itemized Installments (200, 300, 500, etc.) */}
              {memberApprovedDeposits.length > 0 ? (
                <div className="space-y-1.5 pb-2 border-b border-slate-800/80 print:border-gray-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    পরিশোধকৃত কিস্তিসমূহ:
                  </span>
                  {memberApprovedDeposits.map((dep, idx) => (
                    <div
                      key={dep._id || idx}
                      className="flex justify-between py-1 px-2 rounded bg-slate-900/60 print:bg-gray-50 border border-slate-800/60 print:border-gray-200 text-[11px]"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-400 print:text-gray-600">
                          {dep.date || '—'}
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-slate-800 print:bg-gray-200 text-[10px] font-medium">
                          {getMethodName(dep.paymentMethod)}
                        </span>
                        {dep.notes && (
                          <span className="text-slate-300 print:text-gray-800 italic">
                            ({dep.notes})
                          </span>
                        )}
                      </div>
                      <span className="font-mono font-bold text-emerald-400 print:text-green-700">
                        +{formatTaka(dep.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex justify-between py-1 border-b border-slate-800/80 print:border-gray-200">
                  <span>সাধারণ জমা (General Deposits)</span>
                  <span className="font-mono font-bold text-slate-200 print:text-black">
                    {formatTaka(member.generalDeposits)}
                  </span>
                </div>
              )}

              {member.bigBazarDeposits > 0 && (
                <div className="flex justify-between py-1 border-b border-slate-800/80 print:border-gray-200 px-2">
                  <span>বড় বাজারের জমা (Big Bazar Contribution)</span>
                  <span className="font-mono font-bold text-slate-200 print:text-black">
                    {formatTaka(member.bigBazarDeposits)}
                  </span>
                </div>
              )}

              {member.approvedBazarSpentOwnMoney > 0 && (
                <div className="flex justify-between py-1 border-b border-slate-800/80 print:border-gray-200 px-2">
                  <span>অনুমোদিত নিজস্ব বাজার খরচ (Personal Money)</span>
                  <span className="font-mono font-bold text-emerald-400 print:text-green-700">
                    +{formatTaka(member.approvedBazarSpentOwnMoney)}
                  </span>
                </div>
              )}

              {member.openingCarryCredit > 0 && (
                <div className="flex justify-between py-1 border-b border-slate-800/80 print:border-gray-200 px-2">
                  <span>পূর্ববর্তী মাসের অবশিষ্ট জমা (Carry-over)</span>
                  <span className="font-mono font-bold text-emerald-400 print:text-green-700">
                    +{formatTaka(member.openingCarryCredit)}
                  </span>
                </div>
              )}

              <div className="flex justify-between pt-1 font-bold text-emerald-400 print:text-green-700 px-2">
                <span>মোট পাওনা / ক্রেডিট (Total Credits)</span>
                <span className="font-mono text-sm">{formatTaka(member.totalCredits)}</span>
              </div>
            </div>
          </div>

          {/* Net Final Balance */}
          <div
            className={`p-4 rounded-xl border flex items-center justify-between print-avoid-break ${
              isRefund
                ? 'bg-emerald-950/30 border-emerald-500/30 print:border-green-600 print:bg-green-50'
                : 'bg-rose-950/30 border-rose-500/30 print:border-red-600 print:bg-red-50'
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

          {/* SETTLEMENT ACTIONS SECTION (Print Hidden) */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3 print:hidden">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <UserMinus className="w-4 h-4 text-amber-400" />
                মেস ছাড়ার চূড়ান্ত হিসাব নিষ্পত্তি (Settlement)
              </h5>
              <span className="text-[10px] text-slate-500">স্বচ্ছ ও নিরাপদ এক্সিট প্রসেস</span>
            </div>

            <p className="text-[11px] text-slate-400">
              সদস্য মেস ছাড়তে চাইলে এই হিসাব অনুযায়ী অবশিষ্ট টাকা লেনদেন করে হিসাব নিষ্পত্তি করা হয়।
            </p>

            {isManagerOrSuperAdmin && (
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      মেস ছাড়ার তারিখ
                    </label>
                    <input
                      type="date"
                      value={departureDate}
                      onChange={(e) => setDepartureDate(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      হিসাব নিষ্পত্তির ধরন
                    </label>
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                        <input
                          type="radio"
                          name="settlementType"
                          value="current_rate_final"
                          checked={settlementType === 'current_rate_final'}
                          onChange={() => setSettlementType('current_rate_final')}
                          className="accent-emerald-500"
                        />
                        <span>
                          <strong className="text-emerald-400">এখনকার রেটে চূড়ান্ত</strong> (ডিফল্ট)
                        </span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                        <input
                          type="radio"
                          name="settlementType"
                          value="cycle_end_adjustment"
                          checked={settlementType === 'cycle_end_adjustment'}
                          onChange={() => setSettlementType('cycle_end_adjustment')}
                          className="accent-indigo-500"
                        />
                        <span>
                          <strong className="text-indigo-400">চক্র শেষে সমন্বয়</strong>
                        </span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      রুম ভাড়ার সমন্বয়
                    </label>
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                        <input
                          type="radio"
                          name="rentSettlementType"
                          value="pro_rata"
                          checked={rentSettlementType === 'pro_rata'}
                          onChange={() => setRentSettlementType('pro_rata')}
                          className="accent-emerald-500"
                        />
                        <span>
                          <strong className="text-emerald-400">দিনের অনুপাতে</strong> (ডিফল্ট)
                        </span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                        <input
                          type="radio"
                          name="rentSettlementType"
                          value="full_month"
                          checked={rentSettlementType === 'full_month'}
                          onChange={() => setRentSettlementType('full_month')}
                          className="accent-indigo-500"
                        />
                        <span>
                          <strong className="text-indigo-400">পুরো মাস</strong>
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {settlementType === 'current_rate_final' && (() => {
                  const impact = calculateDepartureMealRateImpact({
                    mealPoolTotal: calculation.mealPoolTotal,
                    totalMealUnits: calculation.totalMealUnits,
                    departingMealUnits: member.mealUnits,
                    settledMealRate: calculation.mealRate,
                  });
                  return impact.rateIncrease > 0 ? (
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">মিল রেট বৃদ্ধির সতর্কবার্তা:</span>
                        <p>
                          এই রেটে ছাড়লে বাকিদের মিল রেট প্রায় ৳{impact.rateIncrease.toFixed(2)} বাড়তে পারে (৳{impact.currentMealRate.toFixed(2)} → ৳{impact.projectedRemainingMealRate.toFixed(2)})।
                        </p>
                      </div>
                    </div>
                  ) : null;
                })()}

                <p className="text-[10px] text-slate-400 italic">
                  * {rentSettlementType === 'pro_rata'
                      ? 'দিনের অনুপাত বেছে নিলে বাকি অংশ অনাদায়ী ভাড়া (unrecovered rent) হিসেবে মেসের রিপোর্টে সংরক্ষিত থাকবে, অন্য কোনো সদস্যের ঘাড়ে চাপানো হবে না।'
                      : 'পুরো মাস বেছে নিলে সদস্য পূর্ণ মাসের নির্ধারিত রুম ভাড়া পরিশোধ করবেন।'}
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {/* If member viewing own statement */}
              {isOwnStatement && !settlementRequested && (
                <button
                  onClick={handleRequestSettlement}
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold transition-all cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5" />
                  হিসাব নিষ্পত্তির আবেদন পাঠান
                </button>
              )}

              {settlementRequested && (
                <span className="text-xs px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 animate-spin" />
                  নিষ্পত্তির আবেদন প্রেরিত (অ্যাডমিন অনুমোদনের অপেক্ষায়)
                </span>
              )}

              {/* Admin/Manager can finalize settlement */}
              {isManagerOrSuperAdmin && (
                <button
                  onClick={handleConfirmSettlement}
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-lg shadow-rose-600/20 transition-all cursor-pointer ml-auto"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  হিসাব চূড়ান্ত নিষ্পত্তি অনুমোদন করুন
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
