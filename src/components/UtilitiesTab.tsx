'use client';

import React, { useState } from 'react';
import {
  Lightbulb,
  Package,
  Plus,
  DollarSign,
  Wallet,
  Shield,
  ToggleLeft,
  ToggleRight,
  Edit2,
  Check,
  X,
  AlertCircle,
  UserCheck,
} from 'lucide-react';
import { formatTaka } from '@/lib/money';
import { AppUser } from '@/lib/session';
import { toast } from 'sonner';

interface UtilitiesTabProps {
  currentUser: AppUser;
  bills: any[];
  deposits: any[];
  members?: any[];
  cycle: any;
  onRefresh: () => void;
  onOpenDepositModal: () => void;
}

export const UtilitiesTab: React.FC<UtilitiesTabProps> = ({
  currentUser,
  bills,
  deposits,
  members = [],
  cycle,
  onRefresh,
  onOpenDepositModal,
}) => {
  const [newBillType, setNewBillType] = useState('');
  const [newBillAmount, setNewBillAmount] = useState('');
  const [newBillPayer, setNewBillPayer] = useState<string>('mess_fund');
  const [isAddingBill, setIsAddingBill] = useState(false);

  // Big Bazar management state
  const [isTogglingBigBazar, setIsTogglingBigBazar] = useState(false);
  const [isEditingContribution, setIsEditingContribution] = useState(false);
  const [contributionInput, setContributionInput] = useState(
    String(cycle?.bigBazarContributionPerMember ?? 1400)
  );

  const totalUtility = bills.reduce((sum, b) => sum + b.amount, 0);
  const isManager = currentUser.role === 'admin' || currentUser.role === 'super_admin';

  // Add utility bill (support specific member paying Khala/Electricity bill from own pocket)
  const handleAddBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBillType || !newBillAmount || Number(newBillAmount) <= 0) {
      toast.warning('বিলের নাম ও সঠিক টাকার পরিমাণ দিন');
      return;
    }

    try {
      const res = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cycleId: cycle?._id,
          type: newBillType,
          amount: Number(newBillAmount),
          paidByUserId: newBillPayer,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsAddingBill(false);
        setNewBillType('');
        setNewBillAmount('');
        setNewBillPayer('mess_fund');
        if (newBillPayer !== 'mess_fund') {
          toast.success('বিল যুক্ত হয়েছে এবং পরিশোধকারী সদস্যের অ্যাকাউন্টে জমা হিসেবে ক্রেডিট করা হয়েছে!');
        } else {
          toast.success('ইউটিলিটি বিল সফলভাবে যুক্ত হয়েছে!');
        }
        onRefresh();
      } else {
        toast.error(data.error || 'বিল যুক্ত করতে ব্যর্থ হয়েছে');
      }
    } catch (e: any) {
      toast.error(e.message || 'ত্রুটি ঘটেছে');
    }
  };

  // Toggle Big Bazar On / Off for the cycle
  const handleToggleBigBazar = async () => {
    try {
      setIsTogglingBigBazar(true);
      const newStatus = !cycle?.isBigBazarEnabled;
      const res = await fetch('/api/cycles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_cycle_config',
          cycleId: cycle?._id,
          isBigBazarEnabled: newStatus,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          newStatus
            ? 'বড় বাজার ফিচার সফলভাবে চালু করা হয়েছে!'
            : 'বড় বাজার ফিচার বন্ধ করা হয়েছে (সকল বাজার রেগুলার হিসেবে গণ্য হবে)'
        );
        onRefresh();
      } else {
        toast.error(data.error || 'আপডেট ব্যর্থ হয়েছে');
      }
    } catch (err: any) {
      toast.error(err.message || 'নেটওয়ার্ক ত্রুটি');
    } finally {
      setIsTogglingBigBazar(false);
    }
  };

  // Save member contribution for Big Bazar
  const handleSaveContribution = async () => {
    try {
      const val = Number(contributionInput);
      if (isNaN(val) || val < 0) {
        toast.warning('সঠিক টাকার অঙ্ক লিখুন');
        return;
      }
      const res = await fetch('/api/cycles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_cycle_config',
          cycleId: cycle?._id,
          bigBazarContributionPerMember: val,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsEditingContribution(false);
        toast.success('বড় বাজার সদস্য প্রতি বরাদ্দ আপডেট হয়েছে!');
        onRefresh();
      } else {
        toast.error(data.error || 'আপডেট ব্যর্থ');
      }
    } catch (err: any) {
      toast.error(err.message || 'নেটওয়ার্ক ত্রুটি');
    }
  };

  const generalDeposits = deposits.filter((d) => d.type === 'general');
  const bigBazarDeposits = deposits.filter((d) => d.type === 'big_bazar');

  return (
    <div className="space-y-6">
      {/* Top Banner & Add Deposit action */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-400" />
            ইউটিলিটি বিল, বড় বাজার ও জমা ব্যবস্থাপনা
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            বাড়ি ভাড়া, গ্যাস, বিদ্যুৎ, পানি ও বুয়া বিলের সমান বণ্টন এবং বড় বাজার বাজেট ট্র্যাকিং।
          </p>
        </div>

        {isManager && (
          <button
            onClick={onOpenDepositModal}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            নতুন জমা (Deposit) এন্ট্রি করুন
          </button>
        )}
      </div>

      {/* Utilities Breakdown & Big Bazar Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Utility Bills Card */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                ইউটিলিটি বিলের তালিকা
              </h4>
              <p className="text-xs text-slate-400">সক্রিয় ও অনাবাসিক নয় এমন সদস্যদের মধ্যে সমান ভাগ</p>
            </div>
            <span className="text-sm font-extrabold text-amber-400 font-mono">
              মোট: {formatTaka(totalUtility)}
            </span>
          </div>

          <div className="divide-y divide-slate-800/80">
            {bills.length === 0 ? (
              <p className="py-4 text-xs text-slate-500 text-center">কোনো ইউটিলিটি বিল যুক্ত করা হয়নি</p>
            ) : (
              bills.map((bill) => (
                <div key={bill._id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-200 font-medium">{bill.type} বিল</span>
                    {bill.paidByUserId && (
                      <span className="ml-2 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-semibold">
                        সদস্যের পকেট থেকে পরিশোধিত
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-slate-200 font-bold">{formatTaka(bill.amount)}</span>
                </div>
              ))
            )}
          </div>

          {/* Add Bill Form */}
          {isManager && (
            <div className="border-t border-slate-800 pt-3">
              {!isAddingBill ? (
                <button
                  onClick={() => setIsAddingBill(true)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  নতুন বিল যুক্ত করুন (বুয়া, কারেন্ট, গ্যাস, ইন্টারনেট)
                </button>
              ) : (
                <form onSubmit={handleAddBill} className="space-y-3 p-3 rounded-xl bg-slate-900/60 border border-slate-700 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">নতুন বিল এন্ট্রি</span>
                    <button
                      type="button"
                      onClick={() => setIsAddingBill(false)}
                      className="text-slate-400 hover:text-slate-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">বিলের নাম</label>
                      <input
                        type="text"
                        placeholder="যেমন: খালা বিল / বিদ্যুৎ বিল"
                        value={newBillType}
                        onChange={(e) => setNewBillType(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">টাকার পরিমাণ (৳)</label>
                      <input
                        type="number"
                        placeholder="টাকা"
                        value={newBillAmount}
                        onChange={(e) => setNewBillAmount(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200"
                        required
                      />
                    </div>
                  </div>

                  {/* Who paid the bill */}
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">কে বিলটি পরিশোধ করেছেন?</label>
                    <select
                      value={newBillPayer}
                      onChange={(e) => setNewBillPayer(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200"
                    >
                      <option value="mess_fund">মেস ক্যাশ / ফান্ড থেকে পরিশোধ</option>
                      {members.map((m) => (
                        <option key={m.userId} value={m.userId}>
                          {m.name} (নিজ পকেট থেকে দিয়েছেন — তার জমার সাথে যোগ হবে)
                        </option>
                      ))}
                    </select>
                    {newBillPayer !== 'mess_fund' && (
                      <p className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        এই বিলের পুরো টাকা নির্বাচিত সদস্যের অ্যাকাউন্টে অগ্রিম ক্রেডিট (জমা) হিসেবে যোগ হবে এবং মেসের সকল সদস্যের মাঝে সমানভাবে ভাগ হবে।
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingBill(false)}
                      className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    >
                      বাতিল
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white font-semibold shadow-md shadow-indigo-600/20"
                    >
                      সংরক্ষণ করুন
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* 2. Big Bazar Card with Enable/Disable Toggle */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Package className="w-4 h-4 text-purple-400" />
                বড় বাজার ফান্ড ও কন্ট্রোল (১০-১৫ তারিখ)
              </h4>
              <p className="text-xs text-slate-400">চাল, তেল, ডাল, পেঁয়াজ ইত্যাদি অগ্রিম কেনাকাটার ফান্ড</p>
            </div>

            {/* Enable/Disable Toggle Button */}
            {isManager ? (
              <button
                onClick={handleToggleBigBazar}
                disabled={isTogglingBigBazar}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  cycle?.isBigBazarEnabled
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-rose-500/20 hover:text-rose-300'
                    : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-emerald-500/20 hover:text-emerald-300'
                }`}
                title="বড় বাজার সক্রিয় বা নিষ্ক্রিয় করুন"
              >
                {cycle?.isBigBazarEnabled ? (
                  <>
                    <ToggleRight className="w-4 h-4 text-purple-400" />
                    <span>চালু (সক্রিয়)</span>
                  </>
                ) : (
                  <>
                    <ToggleLeft className="w-4 h-4 text-slate-500" />
                    <span>বন্ধ (নিষ্ক্রিয়)</span>
                  </>
                )}
              </button>
            ) : (
              <span
                className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${
                  cycle?.isBigBazarEnabled
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {cycle?.isBigBazarEnabled ? 'চালু' : 'বন্ধ'}
              </span>
            )}
          </div>

          {!cycle?.isBigBazarEnabled && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>এই চক্রে বড় বাজার ফিচার বন্ধ রাখা হয়েছে। সকল বাজার সাধারণ রেগুলার বাজার হিসেবে গণ্য হবে।</span>
            </div>
          )}

          <div className="space-y-3 text-xs">
            {/* Member contribution per member */}
            <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/20 flex justify-between items-center">
              <div>
                <div className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <span>সদস্য প্রতি জমা নির্ধারিত:</span>
                  {isManager && !isEditingContribution && (
                    <button
                      onClick={() => setIsEditingContribution(true)}
                      className="text-purple-400 hover:text-purple-300 p-0.5 rounded cursor-pointer"
                      title="টাকা পরিবর্তন করুন"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <div className="text-[11px] text-slate-400">মাসের শুরুতে প্রত্যেক সদস্য এই টাকা জমা দেয়</div>
              </div>

              {isEditingContribution ? (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={contributionInput}
                    onChange={(e) => setContributionInput(e.target.value)}
                    className="w-20 bg-slate-900 border border-purple-500 rounded px-2 py-1 text-right text-xs text-purple-200"
                  />
                  <button
                    onClick={handleSaveContribution}
                    className="p-1 bg-purple-600 rounded text-white hover:bg-purple-500 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setIsEditingContribution(false)}
                    className="p-1 text-slate-400 hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="text-base font-extrabold text-purple-300 font-mono">
                  {formatTaka(cycle?.bigBazarContributionPerMember || 1400)}
                </div>
              )}
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex justify-between items-center">
              <div>
                <div className="text-slate-300 font-semibold">অবশিষ্ট মাল ক্যারি (L_carry):</div>
                <div className="text-[11px] text-slate-400">চক্র শেষে অবশিষ্ট পণ্য থাকলে পরবর্তী চক্রে জমা</div>
              </div>
              <div className="text-base font-extrabold text-emerald-400 font-mono">
                {formatTaka(cycle?.bigBazarCarryToNext || 0)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Deposits History List */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-400" />
            সদস্যদের জমার ইতিহাস ({deposits.length})
          </h4>
          <span className="text-xs text-slate-400">
            সাধারণ জমা ও বিলের অগ্রিম পেমেন্ট রেকর্ড
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                <th className="py-2.5 px-3">সদস্য</th>
                <th className="py-2.5 px-3">তারিখ</th>
                <th className="py-2.5 px-3">ধরণ</th>
                <th className="py-2.5 px-3">বিবরণ / নোট</th>
                <th className="py-2.5 px-3 text-right">পরিমাণ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {deposits.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500">
                    কোনো জমার রেকর্ড নেই
                  </td>
                </tr>
              ) : (
                deposits.map((d) => (
                  <tr key={d._id} className="hover:bg-slate-900/40">
                    <td className="py-2.5 px-3 font-medium text-slate-200">{d.userName}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-400">{d.date}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          d.type === 'big_bazar'
                            ? 'bg-purple-500/20 text-purple-300'
                            : 'bg-emerald-500/20 text-emerald-300'
                        }`}
                      >
                        {d.type === 'big_bazar' ? 'বড় বাজার' : 'সাধারণ জমা'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 max-w-xs truncate">{d.notes || '—'}</td>
                    <td className="py-2.5 px-3 text-right font-bold font-mono text-emerald-400">
                      {formatTaka(d.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
