'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  X,
  Clock,
  UserCheck,
  Check,
  RotateCw,
  AlertTriangle,
  Info,
} from '@/components/icons';
import { toast } from 'sonner';

interface MemberLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: any[];
  onSuccess: () => void;
  preselectedUserId?: string;
  existingLeave?: any;
}

export const MemberLeaveModal: React.FC<MemberLeaveModalProps> = ({
  isOpen,
  onClose,
  members = [],
  onSuccess,
  preselectedUserId,
  existingLeave,
}) => {
  const getTodayStr = () => new Date().toISOString().split('T')[0];

  const eligibleMembers = useMemo(() => {
    return members.filter((m) => m.role !== 'super_admin');
  }, [members]);

  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(getTodayStr());
  const [endDate, setEndDate] = useState<string>(getTodayStr());
  const [slotId, setSlotId] = useState<string>('all');
  const [reason, setReason] = useState<string>('বাড়িতে যাওয়া / ব্যক্তিগত ছুটি');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Set default 10 days duration when opening fresh modal
  useEffect(() => {
    if (!isOpen) return;

    if (existingLeave) {
      setSelectedUserId(existingLeave.userId);
      setStartDate(existingLeave.startDate || existingLeave.date || getTodayStr());
      setEndDate(existingLeave.endDate || existingLeave.date || getTodayStr());
      setSlotId(existingLeave.slotId || 'all');
      setReason(existingLeave.reason || 'বাড়িতে যাওয়া / ব্যক্তিগত ছুটি');
    } else {
      const start = getTodayStr();
      setStartDate(start);
      // Default 10 days
      const d = new Date(start);
      d.setDate(d.getDate() + 9);
      setEndDate(d.toISOString().split('T')[0]);

      if (preselectedUserId) {
        setSelectedUserId(preselectedUserId);
      } else if (eligibleMembers.length > 0 && !selectedUserId) {
        setSelectedUserId(eligibleMembers[0].userId || eligibleMembers[0]._id);
      }
    }
  }, [isOpen, existingLeave, preselectedUserId, eligibleMembers]);

  if (!isOpen) return null;

  // Calculate day difference
  const durationDays = useMemo(() => {
    if (!startDate || !endDate) return 1;
    const startMs = new Date(startDate).getTime();
    const endMs = new Date(endDate).getTime();
    if (isNaN(startMs) || isNaN(endMs) || endMs < startMs) return 1;
    return Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1;
  }, [startDate, endDate]);

  const applyDurationPill = (days: number) => {
    if (!startDate) return;
    const d = new Date(startDate);
    d.setDate(d.getDate() + (days - 1));
    setEndDate(d.toISOString().split('T')[0]);
  };

  const selectedMember = eligibleMembers.find(
    (m) => (m.userId || m._id) === selectedUserId
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUserId) {
      toast.warning('সদস্য নির্বাচন করুন');
      return;
    }
    if (!startDate || !endDate || endDate < startDate) {
      toast.warning('সঠিক শুরুর ও সমাপ্তির তারিখ নির্বাচন করুন');
      return;
    }

    try {
      setIsSubmitting(true);

      if (existingLeave && existingLeave._id) {
        // Edit existing leave
        const res = await fetch('/api/meal-requests', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: existingLeave._id,
            startDate,
            endDate,
            adminNote: reason,
          }),
        });
        const data = await res.json();
        if (data.success) {
          toast.success('ছুটি সফলভাবে সংশোধন করা হয়েছে!');
          onSuccess();
          onClose();
        } else {
          toast.error(data.error || 'সংশোধন ব্যর্থ হয়েছে');
        }
      } else {
        // Create new direct leave
        const res = await fetch('/api/meal-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: selectedUserId,
            startDate,
            endDate,
            slotId: 'all',
            action: 'off',
            reason: reason.trim() || 'বাড়িতে যাওয়া / ব্যক্তিগত ছুটি',
            isAdminDirect: true,
          }),
        });

        const data = await res.json();
        if (data.success) {
          toast.success(
            `${selectedMember?.name || 'সদস্য'}-এর ${startDate} থেকে ${endDate} পর্যন্ত (${durationDays} দিন) মিল বন্ধ শিডিউল করা হয়েছে!`
          );
          onSuccess();
          onClose();
        } else {
          toast.error(data.error || 'সংরক্ষণ ব্যর্থ হয়েছে');
        }
      }
    } catch (err: any) {
      toast.error('নেটওয়ার্ক ত্রুটি ঘটেছে');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base">
                {existingLeave ? 'ছুটি / মিল বন্ধের সময় সংশোধন' : 'সদস্যের মিল বন্ধ / ছুটি শিডিউল'}
              </h3>
              <p className="text-[11px] text-slate-400">
                বাড়ি যাওয়া বা যেকোনো মেয়াদের জন্য স্বয়ংক্রিয় মিল অফ নির্ধারণ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto">
          {/* Member Picker */}
          <div>
            <label className="block text-slate-300 mb-1 font-semibold">
              সদস্য নির্বাচন করুন *
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              disabled={Boolean(existingLeave || preselectedUserId)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white outline-none focus:border-amber-500 disabled:opacity-60 text-xs font-semibold"
            >
              {eligibleMembers.map((m) => {
                const uid = m.userId || m._id;
                return (
                  <option key={uid} value={uid}>
                    {m.displayName || m.name}{' '}
                    {m.role === 'admin' ? '(মেস ম্যানেজার 👑)' : '(সদস্য)'}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Date Range */}
          <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400" />
                ছুটির মেয়াদ ({durationDays} দিন মিল বন্ধ থাকবে)
              </span>
              <span className="text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                {durationDays} Days Off
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1 text-[11px]">শুরুর তারিখ</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500 font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 text-[11px]">সমাপ্তির তারিখ</label>
                <input
                  type="date"
                  required
                  min={startDate}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500 font-mono text-xs"
                />
              </div>
            </div>

            {/* Quick Preset Duration Pills */}
            <div>
              <span className="text-[10px] text-slate-500 block mb-1.5">
                দ্রুত দিন বাছাই করুন:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[3, 5, 7, 10, 15, 20, 30].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => applyDurationPill(days)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
                      durationDays === days
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {days} দিন
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-slate-300 mb-1 font-semibold">
              ছুটির কারণ বা মন্তব্য
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="যেমন: ১০ দিনের জন্য বাড়ি গিয়েছে"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500 text-xs"
            />
          </div>

          {/* UX Assurance Banner */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-200/90 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-400">
              <Info className="w-3.5 h-3.5 flex-shrink-0" />
              <span>সহজ ও স্বাচ্ছন্দ্যময় নিয়ম:</span>
            </div>
            <p className="leading-relaxed">
              • এই নির্ধারিত {durationDays} দিনের প্রতিদিনের মিল ইনপুট শিটে সদস্য স্বয়ংক্রিয়ভাবে
              <strong className="text-white"> বন্ধ (০ মিল)</strong> অবস্থায় থাকবে।
              <br />• সদস্য যদি {durationDays} দিন শেষ হওয়ার আগেই ফিরে আসেন, তবে দৈনিক হাজিরা শিট থেকে সরাসরি
              <strong className="text-white"> &apos;+&apos; ক্লিক করে মিল চালু</strong> করা যাবে অথবা যেকোনো সময় ছুটি সংশোধন করা যাবে।
            </p>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 font-semibold"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedUserId}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>সংরক্ষণ হচ্ছে...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{existingLeave ? 'ছুটি আপডেট করুন' : 'ছুটি নির্ধারণ করুন'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
