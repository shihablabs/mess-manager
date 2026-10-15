'use client';

import React, { useState } from 'react';
import { Utensils, X, Clock, AlertTriangle, Calendar } from 'lucide-react';
import { AppUser } from '@/lib/session';
import { toast } from 'sonner';

interface MealRequestModalProps {
  currentUser: AppUser;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const MealRequestModal: React.FC<MealRequestModalProps> = ({
  currentUser,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const getTodayStr = () => new Date().toISOString().split('T')[0];

  const [isRange, setIsRange] = useState(false);
  const [startDate, setStartDate] = useState(getTodayStr());
  const [endDate, setEndDate] = useState(getTodayStr());
  const [slotId, setSlotId] = useState<'both' | 'morning' | 'night'>('both');
  const [action, setAction] = useState<'off' | 'on'>('off');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const res = await fetch('/api/meal-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          date: startDate,
          startDate,
          endDate: isRange ? endDate : startDate,
          slotId,
          action,
          reason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setReason('');
        onSuccess();
        onClose();
        toast.success(data.message || 'মিল পরিবর্তনের অনুরোধ সফলভাবে পাঠানো হয়েছে!');
      } else {
        toast.error(data.error || 'ব্যর্থ হয়েছে');
      }
    } catch (err: any) {
      toast.error(err.message || 'নেটওয়ার্ক ত্রুটি ঘটেছে');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Utensils className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-white text-base">মিল চালু বা বন্ধের অনুরোধ</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <Clock className="w-4 h-4" /> ডেডলাইন সময়সীমা ও মেস নিয়ম:
            </div>
            <p className="text-[11px] text-amber-200/80">
              • সকালের মিল: আগের দিন রাত ১০:০০ ঘটিকা
              <br />• রাতের মিল: ঐ দিন বিকাল ৪:০০ ঘটিকা
              <br />• যেকোনো মিল বন্ধ বা চালু করার জন্য অ্যাডমিনের অনুমোদন আবশ্যক।
            </p>
          </div>

          {/* Action Type */}
          <div>
            <label className="block text-slate-400 mb-1 font-medium">অনুরোধের ধরন</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAction('off')}
                className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                  action === 'off'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                মিল বন্ধ (Meal Off)
              </button>
              <button
                type="button"
                onClick={() => setAction('on')}
                className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                  action === 'on'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                মিল চালু (Meal On)
              </button>
            </div>
          </div>

          {/* Single Day vs Date Range Toggle */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-slate-400 font-medium">সময়কাল নির্বাচন</label>
              <button
                type="button"
                onClick={() => setIsRange(!isRange)}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5" />
                {isRange ? 'নির্দিষ্ট একটি দিন করুন' : 'একাধিক দিন / ছুটি (Range) করুন'}
              </button>
            </div>

            {isRange ? (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 block mb-0.5">কবে থেকে (From)</span>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-indigo-500 font-mono text-xs"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block mb-0.5">কবে পর্যন্ত (To)</span>
                  <input
                    type="date"
                    required
                    min={startDate}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-indigo-500 font-mono text-xs"
                  />
                </div>
              </div>
            ) : (
              <div>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setEndDate(e.target.value);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-indigo-500 font-mono text-xs"
                />
              </div>
            )}
          </div>

          {/* Slot Selection */}
          <div>
            <label className="block text-slate-400 mb-1 font-medium">কোন বেলার মিল</label>
            <select
              value={slotId}
              onChange={(e) => setSlotId(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-indigo-500"
            >
              <option value="both">উভয় মিল (সকাল ও রাত)</option>
              <option value="morning">শুধুমাত্র সকালের মিল (০.৫)</option>
              <option value="night">শুধুমাত্র রাতের মিল (১.০)</option>
            </select>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-slate-400 mb-1 font-medium">কারণ (ঐচ্ছিক)</label>
            <input
              type="text"
              placeholder="যেমন: বাড়ি যাব, পরীক্ষা, দাওয়াত ইত্যাদি"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-slate-200 font-medium cursor-pointer"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
            >
              {isSubmitting ? 'পাঠানো হচ্ছে...' : 'অনুরোধ পাঠান'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
