'use client';

import React, { useState } from 'react';
import { Utensils, X, Clock, AlertTriangle, Calendar, RotateCw } from '@/components/icons';
import { AppUser } from '@/lib/session';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { useLanguage } from '@/context/LanguageContext';

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
  const { language } = useLanguage();
  const isBangla = language === 'bn';

  const getTodayStr = () => new Date().toISOString().split('T')[0];

  const [isRange, setIsRange] = useState(false);
  const [startDate, setStartDate] = useState(getTodayStr());
  const [endDate, setEndDate] = useState(getTodayStr());
  const [slotId, setSlotId] = useState<'both' | 'morning' | 'lunch' | 'night'>('both');
  const [action, setAction] = useState<'off' | 'on'>('off');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Check if request violates the cutoff deadline
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
        title: isBangla ? '⚠️ সময়সীমা (Deadline) অতিক্রান্ত!' : '⚠️ Deadline Passed!',
        html: `
          <div style="text-align: left; font-size: 13px; line-height: 1.6; color: #cbd5e1;">
            <p style="margin-bottom: 8px;">
              <strong style="color: #f87171;">${
                isBangla
                  ? 'দুঃখিত, এই মিলের জন্য সাধারণ আবেদনের নির্ধারিত সময় পার হয়ে গেছে।'
                  : 'The standard cutoff deadline for this meal slot has passed.'
              }</strong>
            </p>
            <p style="font-size: 12px; color: #94a3b8;">${isBangla ? 'মেসের নির্ধারিত সময়সূচি:' : 'Mess Standard Schedule:'}</p>
            <ul style="font-size: 12px; color: #94a3b8; padding-left: 18px; margin: 4px 0 8px;">
              <li>${isBangla ? 'সকালের মিল: আগের দিন রাত ১০:০০ টা' : 'Morning Meal: Previous night 10:00 PM'}</li>
              <li>${isBangla ? 'দুপুরের মিল: ঐ দিন সকাল ০৯:০০ টা' : 'Lunch Meal: Same day 09:00 AM'}</li>
              <li>${isBangla ? 'রাতের মিল: ঐ দিন বিকাল ০৪:০০ টা' : 'Dinner Meal: Same day 04:00 PM'}</li>
            </ul>
            <div style="background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 8px; padding: 8px 12px; margin-top: 8px; color: #fbbf24; font-size: 12px;">
              ⚠️ ${
                isBangla
                  ? 'এটি <strong>"বিলম্বিত আবেদন (Late Request)"</strong> হিসেবে জমা হবে এবং মেস ম্যানেজারের বিশেষ অনুমোদন সাপেক্ষে কার্যকর হবে।'
                  : 'This will be flagged as a <strong>Late Request</strong> requiring Manager review.'
              }
            </div>
            <p style="margin-top: 10px; font-weight: 600; color: #f1f5f9;">
              ${isBangla ? 'আপনি কি নিশ্চিত যে আবেদনটি পাঠাতে চান?' : 'Are you sure you want to submit this request?'}
            </p>
          </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e11d48',
        cancelButtonColor: '#334155',
        confirmButtonText: isBangla ? 'হ্যাঁ, বিলম্বিত আবেদন জমা দিন' : 'Yes, Submit Late Request',
        cancelButtonText: isBangla ? 'বাতিল করুন' : 'Cancel',
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
          title: isBangla ? 'অনুরোধ জমা হয়েছে!' : 'Request Submitted!',
          text: isLate
            ? (isBangla
                ? 'আপনার বিলম্বিত আবেদনটি মেস ম্যানেজারের পর্যালোচনার জন্য জমা হয়েছে।'
                : 'Your late request has been submitted for manager review.')
            : (data.message || (isBangla ? 'মিল পরিবর্তনের অনুরোধ সফলভাবে পাঠানো হয়েছে!' : 'Meal request submitted successfully!')),
          icon: 'success',
          confirmButtonColor: '#4f46e5',
          background: '#0f172a',
          color: '#f8fafc',
        });
      } else {
        toast.error(data.error || (isBangla ? 'ব্যর্থ হয়েছে' : 'Failed to submit request'));
      }
    } catch (err: any) {
      toast.error(err.message || (isBangla ? 'নেটওয়ার্ক ত্রুটি ঘটেছে' : 'Network error occurred'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Utensils className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-white text-base">
              {isBangla ? 'মিল চালু বা বন্ধের অনুরোধ' : 'Meal On / Off Request'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs overflow-y-auto max-h-[80vh]">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>{isBangla ? 'ডেডলাইন সময়সীমা ও মেস নিয়ম:' : 'Cutoff Deadlines & Mess Rules:'}</span>
            </div>
            <p className="text-[11px] text-amber-200/80 leading-relaxed">
              {isBangla ? (
                <>
                  • সকালের মিল: আগের দিন রাত ১০:০০ ঘটিকা
                  <br />• দুপুরের মিল: ঐ দিন সকাল ০৯:০০ ঘটিকা
                  <br />• রাতের মিল: ঐ দিন বিকাল ০৪:০০ ঘটিকা
                  <br />• সময় পার হয়ে গেলে আবেদনটি <strong>বিলম্বিত (Late Request)</strong> হিসেবে যাবে।
                </>
              ) : (
                <>
                  • Breakfast: Previous day by 10:00 PM
                  <br />• Lunch: Same day by 09:00 AM
                  <br />• Dinner: Same day by 04:00 PM
                  <br />• Requests after cutoff will require <strong>Manager Special Approval</strong>.
                </>
              )}
            </p>
          </div>

          {/* Action Type */}
          <div>
            <label className="block text-slate-400 mb-1 font-medium">
              {isBangla ? 'অনুরোধের ধরন' : 'Request Action'}
            </label>
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
                {isBangla ? 'মিল বন্ধ (Meal Off)' : 'Turn Meal OFF'}
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
                {isBangla ? 'মিল চালু (Meal On)' : 'Turn Meal ON'}
              </button>
            </div>
          </div>

          {/* Single Day vs Date Range Toggle */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-slate-400 font-medium">
                {isBangla ? 'সময়কাল নির্বাচন' : 'Duration Selection'}
              </label>
              <button
                type="button"
                onClick={() => setIsRange(!isRange)}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5" />
                {isRange
                  ? (isBangla ? 'নির্দিষ্ট একটি দিন করুন' : 'Switch to Single Day')
                  : (isBangla ? 'একাধিক দিন / ছুটি (Range) করুন' : 'Switch to Date Range')}
              </button>
            </div>

            {isRange ? (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 block mb-0.5">
                    {isBangla ? 'কবে থেকে (From)' : 'From Date'}
                  </span>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-indigo-500 font-mono text-xs cursor-pointer"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block mb-0.5">
                    {isBangla ? 'কবে পর্যন্ত (To)' : 'To Date'}
                  </span>
                  <input
                    type="date"
                    required
                    min={startDate}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-indigo-500 font-mono text-xs cursor-pointer"
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
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-indigo-500 font-mono text-xs cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Slot Selection */}
          <div>
            <label className="block text-slate-400 mb-1 font-medium">
              {isBangla ? 'কোন বেলার মিল' : 'Meal Slot'}
            </label>
            <select
              value={slotId}
              onChange={(e) => setSlotId(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="both">
                {isBangla ? 'সারাদিন / সব মিল (সকাল, দুপুর ও রাত)' : 'Full Day / All Meals (Morning, Lunch, Dinner)'}
              </option>
              <option value="morning">
                {isBangla ? 'শুধুমাত্র সকালের মিল (Breakfast)' : 'Breakfast Only (Morning)'}
              </option>
              <option value="lunch">
                {isBangla ? 'শুধুমাত্র দুপুরের মিল (Lunch)' : 'Lunch Only (Midday)'}
              </option>
              <option value="night">
                {isBangla ? 'শুধুমাত্র রাতের মিল (Dinner)' : 'Dinner Only (Night)'}
              </option>
            </select>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-slate-400 mb-1 font-medium">
              {isBangla ? 'কারণ (ঐচ্ছিক)' : 'Reason (Optional)'}
            </label>
            <input
              type="text"
              placeholder={isBangla ? 'যেমন: বাড়ি যাব, পরীক্ষা, দাওয়াত ইত্যাদি' : 'e.g., Going home, exam, dining out'}
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
              {isBangla ? 'বাতিল' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/25 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{isBangla ? 'পাঠানো হচ্ছে...' : 'Submitting...'}</span>
                </>
              ) : (
                <span>{isBangla ? 'অনুরোধ পাঠান' : 'Submit Request'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
