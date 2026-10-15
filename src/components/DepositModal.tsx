'use client';

import React, { useState, useEffect } from 'react';
import { Wallet, X, Info, Check, Clock, ShieldCheck, Sparkles, AlertCircle } from '@/components/icons';
import { toast } from 'sonner';
import { AppUser } from '@/lib/session';

interface DepositModalProps {
  members: any[];
  currentUser?: AppUser | null;
  cycleId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const DepositModal: React.FC<DepositModalProps> = ({
  members,
  currentUser,
  cycleId,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [selectedUser, setSelectedUser] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'general' | 'big_bazar' | 'utility' | 'rent'>('general');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isManager = currentUser?.role === 'admin' || isSuperAdmin;

  // Filter dining members (exclude super_admin from list of resident members)
  const diningMembers = members.filter((m) => m.role !== 'super_admin');

  // Initialize selectedUser
  useEffect(() => {
    if (!isOpen) return;

    if (!isManager && currentUser?.id) {
      setSelectedUser(currentUser.id);
      return;
    }

    if (isManager && diningMembers.length > 0) {
      const currentValid = diningMembers.some((m) => (m.userId || m._id) === selectedUser);
      if (!currentValid && selectedUser !== 'mess_fund') {
        setSelectedUser(diningMembers[0].userId || diningMembers[0]._id);
      }
    }
  }, [isOpen, isManager, currentUser?.id, diningMembers, selectedUser]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      toast.warning('সঠিক টাকার অঙ্ক লিখুন');
      return;
    }

    const effectiveUserId = isManager ? selectedUser : (currentUser?.id || selectedUser);
    if (!effectiveUserId) {
      toast.warning('সদস্য বাছাই করুন');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/deposits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: effectiveUserId,
          cycleId: cycleId || 'cycle_1',
          amount: numAmount,
          type,
          paymentMethod,
          notes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAmount('');
        setNotes('');
        onSuccess();
        onClose();
        toast.success(
          data.message ||
            (isManager
              ? 'জমা সফলভাবে এন্ট্রি হয়েছে এবং ব্যালেন্সে যুক্ত হয়েছে!'
              : 'জমার রিকোয়েস্ট সফলভাবে পাঠানো হয়েছে!')
        );
      } else {
        toast.error(data.error || 'জমা এন্ট্রি করতে ব্যর্থ হয়েছে');
      }
    } catch (err: any) {
      toast.error(err.message || 'নেটওয়ার্ক ত্রুটি ঘটেছে');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base">
                {isManager ? 'জমা (Deposit) এন্ট্রি করুন' : 'জমা প্রদানের রিকোয়েস্ট (Deposit Request)'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {isManager ? 'সরাসরি অনুমোদিত মেস জমা' : 'অ্যাডমিনের অনুমোদনের জন্য রিকোয়েস্ট'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Mode Indicator Banner */}
        <div className="px-5 pt-4">
          {isManager ? (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>
                <strong>অ্যাডমিন মোড:</strong> এই জমাটি সাথে সাথে অনুমোদিত হবে এবং সংশ্লিষ্ট অ্যাকাউন্টে যোগ হবে।
              </span>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs flex items-center gap-2">
              <Clock className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                <strong>সদস্য রিকোয়েস্ট:</strong> জমাটি সাবমিট করার পর মেস ম্যানেজার অনুমোদনের পর কার্যকর হবে।
              </span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Member Selection / Self Indicator */}
          <div>
            <label className="block text-slate-300 mb-1 font-semibold">
              জমা প্রদানকারী সদস্য
            </label>
            {isManager ? (
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-200 outline-none focus:border-emerald-500 transition cursor-pointer text-xs"
              >
                <optgroup label="👤 মেস সদস্যবৃন্দ">
                  {diningMembers.map((m) => {
                    const id = m.userId || m._id;
                    return (
                      <option key={id} value={id}>
                        {m.name} {m.role === 'admin' ? '(মেস ম্যানেজার)' : ''}
                      </option>
                    );
                  })}
                </optgroup>
                <optgroup label="🏦 মেস সাধারণ তহবিল (সরাসরি ক্যাশ)">
                  <option value="mess_fund">
                    🏦 মেস সাধারণ তহবিল (ক্যাশ বাক্স / সরাসরি ইউটিলিটি পরিশোধ)
                  </option>
                </optgroup>
              </select>
            ) : (
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 flex items-center justify-between">
                <span className="font-semibold text-white">{currentUser?.name || 'আপনি'}</span>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30">
                  আপনার অ্যাকাউন্ট
                </span>
              </div>
            )}
          </div>

          {selectedUser === 'mess_fund' && isManager && (
            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 text-xs flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-indigo-400" />
              <div className="leading-relaxed">
                <strong>সাধারণ তহবিল মোড:</strong> এই টাকা কোনো একক সদস্যের ব্যক্তিগত ব্যালেন্সে নয়, সরাসরি মেসের ক্যাশ বক্স ও সাধারণ তহবিলে জমা হিসেবে যুক্ত হবে।
              </div>
            </div>
          )}

          {/* Deposit Type */}
          <div>
            <label className="block text-slate-300 mb-1 font-semibold">জমার খাত / ধরন</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-200 outline-none focus:border-emerald-500 transition cursor-pointer text-xs"
            >
              <option value="general">সাধারণ মেস জমা (General Meal Deposit)</option>
              <option value="utility">ইউটিলিটি ও খালা বিল ফান্ড (Utility / Bills Fund)</option>
              <option value="big_bazar">বড় বাজার ফান্ড কন্ট্রিবিউশন (Big Bazar Fund)</option>
              <option value="rent">বাসা ভাড়া / রুম রেন্ট (House Rent)</option>
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-slate-300 mb-1 font-semibold">টাকার পরিমাণ (টাকা)</label>
            <input
              type="number"
              required
              min="1"
              placeholder="যেমন: ১০০০ বা ৫০০০"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-emerald-500 transition font-mono text-sm"
            />
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-slate-300 mb-1 font-semibold">পরিশোধের মাধ্যম</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-200 outline-none focus:border-emerald-500 transition cursor-pointer text-xs"
            >
              <option value="cash">💵 নগদ (Cash)</option>
              <option value="bkash">📱 বিকাশ (bKash)</option>
              <option value="nagad">📱 নগদ ওয়ালেট (Nagad)</option>
              <option value="rocket">📱 রকেট (Rocket)</option>
              <option value="bank">🏦 ব্যাংক ট্রান্সফার (Bank Transfer)</option>
              <option value="other">🔄 অন্যান্য (Other)</option>
            </select>
          </div>

          {/* Notes / Trx ID */}
          <div>
            <label className="block text-slate-300 mb-1 font-semibold">মন্তব্য ও ট্রানজেকশন নোট</label>
            <textarea
              rows={2}
              placeholder="যেমন: অক্টোবর মাসের ইউটিলিটি বিলের জন্য - বিকাশ TrxID #XXXXXX"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-emerald-500 transition placeholder-slate-500 text-xs"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition cursor-pointer"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold shadow-lg shadow-emerald-500/25 transition cursor-pointer disabled:opacity-50"
            >
              {isSubmitting
                ? 'সংরক্ষণ হচ্ছে...'
                : isManager
                ? 'সরাসরি জমা এন্ট্রি করুন'
                : 'জমার রিকোয়েস্ট পাঠান'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
