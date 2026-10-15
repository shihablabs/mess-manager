'use client';

import React, { useState } from 'react';
import { Calendar, RefreshCw, ArrowRightLeft, Shield, CheckCircle } from 'lucide-react';
import { AppUser } from '@/lib/session';
import { toast } from 'sonner';

interface RosterTabProps {
  currentUser: AppUser;
  slots: any[];
  requests: any[];
  onRefresh: () => void;
}

export const RosterTab: React.FC<RosterTabProps> = ({
  currentUser,
  slots,
  requests,
  onRefresh,
}) => {
  const [isRequesting, setIsRequesting] = useState(false);
  const [fromSlot, setFromSlot] = useState(1);
  const [toSlot, setToSlot] = useState(2);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAutoGenerate = async () => {
    try {
      const res = await fetch('/api/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'auto_generate' }),
      });
      const data = await res.json();
      if (data.success) {
        onRefresh();
        toast.success('বাজারের ডিউটি রোস্টার সফলভাবে বণ্টন করা হয়েছে!');
      } else {
        toast.error(data.error || 'বণ্টন ব্যর্থ হয়েছে');
      }
    } catch (e: any) {
      toast.error(e.message || 'ত্রুটি ঘটেছে');
    }
  };

  const handleRequestChange = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const res = await fetch('/api/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request_change',
          userId: currentUser.id,
          fromSlotIndex: Number(fromSlot),
          toSlotIndex: Number(toSlot),
          reason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsRequesting(false);
        setReason('');
        onRefresh();
        toast.success('স্লট পরিবর্তনের আবেদন পাঠানো হয়েছে!');
      } else {
        toast.error(data.error || 'আবেদন পাঠাতে ব্যর্থ হয়েছে');
      }
    } catch (e: any) {
      toast.error(e.message || 'ত্রুটি ঘটেছে');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            বাজারের দায়িত্বের রোস্টার (Duty Roster)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            চক্রের দিনগুলোকে সদস্যদের মধ্যে সমান ভাগে বণ্টন করে স্বয়ংক্রিয়ভাবে স্লট তৈরি করা হয়।
          </p>
        </div>

        <div className="flex items-center gap-2">
          {(currentUser.role === 'admin' || currentUser.role === 'super_admin') && (
            <button
              onClick={handleAutoGenerate}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              স্লট পুনর্বণ্টন করুন
            </button>
          )}

          <button
            onClick={() => setIsRequesting(!isRequesting)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20 transition-colors"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            স্লট বদলের আবেদন
          </button>
        </div>
      </div>

      {/* Slot Change Form Drawer */}
      {isRequesting && (
        <form
          onSubmit={handleRequestChange}
          className="glass-panel rounded-2xl p-5 border border-indigo-500/30 bg-indigo-950/20 space-y-4"
        >
          <h4 className="text-sm font-bold text-indigo-300">স্লট অদলবদলের অনুরোধ</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">আমার বর্তমান স্লট</label>
              <select
                value={fromSlot}
                onChange={(e) => setFromSlot(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200"
              >
                {slots.map((s) => (
                  <option key={s.slotIndex} value={s.slotIndex}>
                    স্লট {s.slotIndex} ({s.startDate} হতে {s.endDate})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">যে স্লটে যেতে চান</label>
              <select
                value={toSlot}
                onChange={(e) => setToSlot(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200"
              >
                {slots.map((s) => (
                  <option key={s.slotIndex} value={s.slotIndex}>
                    স্লট {s.slotIndex} ({s.startDate} হতে {s.endDate})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">কারণ (ঐচ্ছিক)</label>
              <input
                type="text"
                placeholder="যেমন: পরীক্ষা বা জরুরি কাজ"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsRequesting(false)}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
            >
              আবেদন জমা দিন
            </button>
          </div>
        </form>
      )}

      {/* Duty Roster Slots Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {slots.map((slot) => {
          const isCurrentUserSlot = slot.assignedUsers.some((u: any) => u.id === currentUser.id);

          return (
            <div
              key={slot._id}
              className={`glass-panel rounded-2xl p-5 border transition-all ${
                isCurrentUserSlot
                  ? 'border-indigo-500/50 bg-indigo-950/20'
                  : 'border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                  স্লট #{slot.slotIndex}
                </span>
                {isCurrentUserSlot && (
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-bold">
                    আপনার স্লট
                  </span>
                )}
              </div>

              <div className="mb-4">
                <div className="text-sm font-semibold text-white">
                  {slot.startDate} হতে {slot.endDate}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">মেয়াদ: ৫ দিন</div>
              </div>

              <div className="border-t border-slate-800 pt-3">
                <div className="text-[11px] text-slate-400 mb-1.5">দায়িত্বপ্রাপ্ত সদস্য:</div>
                <div className="flex flex-wrap gap-1.5">
                  {slot.assignedUsers.map((user: any) => (
                    <span
                      key={user.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 text-xs text-slate-200 border border-slate-700"
                    >
                      <CheckCircle className="w-3 h-3 text-emerald-400" />
                      {user.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
