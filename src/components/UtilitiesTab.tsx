'use client';

import React, { useState } from 'react';
import { Lightbulb, Package, Plus, DollarSign, Wallet, Shield } from 'lucide-react';
import { formatTaka } from '@/lib/money';
import { AppUser } from '@/lib/session';
import { toast } from 'sonner';

interface UtilitiesTabProps {
  currentUser: AppUser;
  bills: any[];
  deposits: any[];
  cycle: any;
  onRefresh: () => void;
  onOpenDepositModal: () => void;
}

export const UtilitiesTab: React.FC<UtilitiesTabProps> = ({
  currentUser,
  bills,
  deposits,
  cycle,
  onRefresh,
  onOpenDepositModal,
}) => {
  const [newBillType, setNewBillType] = useState('');
  const [newBillAmount, setNewBillAmount] = useState('');
  const [isAddingBill, setIsAddingBill] = useState(false);

  const totalUtility = bills.reduce((sum, b) => sum + b.amount, 0);

  const handleAddBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBillType || !newBillAmount) return;
    try {
      const res = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: newBillType,
          amount: Number(newBillAmount),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsAddingBill(false);
        setNewBillType('');
        setNewBillAmount('');
        toast.success('ইউটিলিটি বিল সফলভাবে যুক্ত হয়েছে!');
        onRefresh();
      } else {
        toast.error(data.error || 'বিল যুক্ত করতে ব্যর্থ হয়েছে');
      }
    } catch (e: any) {
      toast.error(e.message || 'ত্রুটি ঘটেছে');
    }
  };

  const generalDeposits = deposits.filter((d) => d.type === 'general');
  const bigBazarDeposits = deposits.filter((d) => d.type === 'big_bazar');
  const isManager = currentUser.role === 'admin' || currentUser.role === 'super_admin';

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
            পানি, গ্যাস, বিদ্যুৎ ও বড় বাজারের কন্ট্রিবিউশন ট্র্যাক করুন।
          </p>
        </div>

        {isManager && (
          <button
            onClick={onOpenDepositModal}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-500/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            নতুন জমা (Deposit) এন্ট্রি করুন
          </button>
        )}
      </div>

      {/* Utilities Breakdown & Big Bazar Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Utility Bills */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                ইউটিলিটি বিলের তালিকা
              </h4>
              <p className="text-xs text-slate-400">সক্রিয় সদস্যদের মধ্যে সমান ভাগ (SRS ৪.৬)</p>
            </div>
            <span className="text-sm font-extrabold text-amber-400 font-mono">
              মোট: {formatTaka(totalUtility)}
            </span>
          </div>

          <div className="divide-y divide-slate-800/80">
            {bills.map((bill) => (
              <div key={bill._id} className="py-2.5 flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">{bill.type} বিল</span>
                <span className="font-mono text-slate-200 font-bold">{formatTaka(bill.amount)}</span>
              </div>
            ))}
          </div>

          {isManager && (
            <div className="border-t border-slate-800 pt-3">
              {!isAddingBill ? (
                <button
                  onClick={() => setIsAddingBill(true)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  নতুন বিলের ধরন যোগ করুন
                </button>
              ) : (
                <form onSubmit={handleAddBill} className="flex gap-2 text-xs">
                  <input
                    type="text"
                    placeholder="বিলের নাম"
                    value={newBillType}
                    onChange={(e) => setNewBillType(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200"
                  />
                  <input
                    type="number"
                    placeholder="টাকা"
                    value={newBillAmount}
                    onChange={(e) => setNewBillAmount(e.target.value)}
                    className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-indigo-600 rounded-lg text-white font-semibold"
                  >
                    যোগ
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingBill(false)}
                    className="px-2 text-slate-400 hover:text-slate-200"
                  >
                    বাতিল
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* 2. Big Bazar Status */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Package className="w-4 h-4 text-purple-400" />
                বড় বাজার ফান্ড ও বিবরণ (মাসের মুদি)
              </h4>
              <p className="text-xs text-slate-400">চাল, তেল, ডাল, পেঁয়াজ ইত্যাদি অগ্রিম কেনাকাটা</p>
            </div>
            <span className="text-[11px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded font-bold">
              {cycle?.isBigBazarEnabled ? 'চালু (Enabled)' : 'বন্ধ'}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/20 flex justify-between items-center">
              <div>
                <div className="text-slate-300 font-semibold">সদস্য প্রতি জমা নির্ধারিত:</div>
                <div className="text-[11px] text-slate-400">চক্রের শুরুতে প্রদেয়</div>
              </div>
              <div className="text-base font-extrabold text-purple-300 font-mono">
                {formatTaka(cycle?.bigBazarContributionPerMember || 1400)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex justify-between items-center">
              <div>
                <div className="text-slate-300 font-semibold">মোট বড় বাজার কেনাকাটা:</div>
                <div className="text-[11px] text-slate-400">অনুমোদিত ভাউচার হতে</div>
              </div>
              <div className="text-base font-extrabold text-slate-200 font-mono">
                {formatTaka(8400)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex justify-between items-center">
              <div>
                <div className="text-slate-300 font-semibold">অবশিষ্ট মাল ক্যারি (L_carry):</div>
                <div className="text-[11px] text-slate-400">চক্র শেষে অবশিষ্ট পণ্য থাকলে</div>
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
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <Wallet className="w-4 h-4 text-emerald-400" />
          সদস্যদের জমার ইতিহাস ({deposits.length})
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                <th className="py-2">সদস্য</th>
                <th className="py-2">তারিখ</th>
                <th className="py-2">ধরন</th>
                <th className="py-2">নোট</th>
                <th className="py-2 text-right">টাকার পরিমাণ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {deposits.map((d) => (
                <tr key={d._id} className="text-slate-300 hover:bg-slate-800/30">
                  <td className="py-2.5 font-medium text-slate-200">{d.userName}</td>
                  <td className="py-2.5 font-mono text-slate-400">{d.date}</td>
                  <td className="py-2.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        d.type === 'big_bazar'
                          ? 'bg-purple-500/20 text-purple-300'
                          : 'bg-emerald-500/20 text-emerald-300'
                      }`}
                    >
                      {d.type === 'big_bazar' ? 'বড় বাজার' : 'সাধারণ জমা'}
                    </span>
                  </td>
                  <td className="py-2.5 text-slate-400">{d.notes || '—'}</td>
                  <td className="py-2.5 text-right font-mono font-bold text-emerald-400">
                    {formatTaka(d.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
