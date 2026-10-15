'use client';

import React, { useState } from 'react';
import { Utensils, X, Clock, AlertTriangle, Calendar, RotateCw } from '@/components/icons';
import { AppUser } from '@/lib/session';
import { toast } from 'sonner';
import Swal from 'sweetalert2';

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
  const [slotId, setSlotId] = useState<'both' | 'morning' | 'lunch' | 'night'>('both');
  const [action, setAction] = useState<'off' | 'on'>('off');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Check if request violates the deadline
  const checkIsLate = (reqDate: string, reqSlot: string) => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const hour = now.getHours();

    if (reqDate < todayStr) return true;
    if (reqDate === todayStr) {
      if (reqSlot === 'morning' || reqSlot === 'both') return true;
      if (reqSlot === 'lunch' && hour >= 9) return true;
      if (reqSlot === 'night' && hour >= 16) return true;
    }
    if (reqDate === tomorrowStr) {
      if ((reqSlot === 'morning' || reqSlot === 'both') && hour >= 22) return true;
    }
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isLate = checkIsLate(startDate, slotId);

    if (isLate) {
      const result = await Swal.fire({
        title: '⚠️ সময়সীমা (Deadline) অতিক্রান্ত!',
        html: `
          <div style="text-align: left; font-size: 13px; line-height: 1.6; color: #cbd5e1;">
            <p style="margin-bottom: 8px;">
              <strong style="color: #f87171;">দুঃখিত, এই মিলের জন্য সাধারণ আবেদনের নির্ধারিত সময় পার হয়ে গেছে।</strong>
            </p>
            <p style="font-size: 12px; color: #94a3b8;">মেসের নির্ধারিত সময়সূচি:</p>
            <ul style="font-size: 12px; color: #94a3b8; padding-left: 18px; margin: 4px 0 8px;">
              <li>সকালের মিল: আগের দিন রাত ১০:০০ টা</li>
              <li>দুপুরের মিল: ঐ দিন সকাল ০৯:০০ টা</li>
              <li>রাতের মিল: ঐ দিন বিকাল ০৪:০০ টা</li>
            </ul>
            <div style="background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 8px; padding: 8px 12px; margin-top: 8px; color: #fbbf24; font-size: 12px;">
              ⚠️ এটি <strong>"বিলম্বিত আবেদন (Late Request)"</strong> হিসেবে জমা হবে এবং সুপার অ্যাডমিন / মেস ম্যানেজারের বিশেষ অনুমোদন সাপেক্ষে কার্যকর হবে।
            </div>
            <p style="margin-top: 10px; font-weight: 600; color: #f1f5f9;">
              আপনি কি নিশ্চিত যে আবেদনটি পাঠাতে চান?
            </p>
          </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e11d48',
        cancelButtonColor: '#334155',
        confirmButtonText: 'হ্যাঁ, বিলম্বিত আবেদন জমা দিন',
        cancelButtonText: 'বাতিল করুন',
        background: '#0f172a',
        color: '#f8fafc',
        customClass: {
          popup: 'rounded-2xl border border-slate-700 shadow-2xl',
        },
      });

      if (!result.isConfirmed) {
        return;
      }
    }

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
          isLate,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setReason('');
        onSuccess();
        onClose();
        Swal.fire({
          title: 'অনুরোধ জমা হয়েছে!',
          text: isLate
            ? 'আপনার বিলম্বিত আবেদনটি সুপার অ্যাডমিন / ম্যানেজারের পর্যালোচনার জন্য জমা হয়েছে।'
            : (data.message || 'মিল পরিবর্তনের অনুরোধ সফলভাবে পাঠানো হয়েছে!'),
          icon: 'success',
          confirmButtonColor: '#4f46e5',
          background: '#0f172a',
          color: '#f8fafc',
        });
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
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <Clock className="w-4 h-4 text-amber-400" /> ডেডলাইন সময়সীমা ও মেস নিয়ম:
            </div>
            <p className="text-[11px] text-amber-200/80 leading-relaxed">
              • সকালের মিল: আগের দিন রাত ১০:০০ ঘটিকা
              <br />• দুপুরের মিল: ঐ দিন সকাল ০৯:০০ ঘটিকা
              <br />• রাতের মিল: ঐ দিন বিকাল ০৪:০০ ঘটিকা
              <br />• সময় পার হয়ে গেলে আবেদনটি <strong>বিলম্বিত (Late Request)</strong> হিসেবে যাবে।
            </p>
          </div>

          {/* Action Type */}
          <div>
            <label className="block text-slate-400 mb-1 font-medium">অনুরোধের ধরন</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAction('off')}
                className={`py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
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
                className={`py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
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

          {/* Slot Selection (3 Meal Slots Supported) */}
          <div>
            <label className="block text-slate-400 mb-1 font-medium">কোন বেলার মিল</label>
            <select
              value={slotId}
              onChange={(e) => setSlotId(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="both">সারাদিন / সব মিল (সকাল, দুপুর ও রাত)</option>
              <option value="morning">শুধুমাত্র সকালের মিল (সকাল)</option>
              <option value="lunch">শুধুমাত্র দুপুরের মিল (দুপুর)</option>
              <option value="night">শুধুমাত্র রাতের মিল (রাত)</option>
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
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/25 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>পাঠানো হচ্ছে...</span>
                </>
              ) : (
                <span>অনুরোধ পাঠান</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
