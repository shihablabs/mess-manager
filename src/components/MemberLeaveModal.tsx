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
import { useLanguage } from '@/context/LanguageContext';
import { AppUser } from '@/lib/session';

interface MemberLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: any[];
  currentUser?: AppUser | null;
  onSuccess: () => void;
  preselectedUserId?: string;
  existingLeave?: any;
}

export const MemberLeaveModal: React.FC<MemberLeaveModalProps> = ({
  isOpen,
  onClose,
  members = [],
  currentUser,
  onSuccess,
  preselectedUserId,
  existingLeave,
}) => {
  const { language } = useLanguage();
  const isBangla = language === 'bn';

  const isManager = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  const getTodayStr = () => new Date().toISOString().split('T')[0];

  const eligibleMembers = useMemo(() => {
    return members.filter((m) => m.role !== 'super_admin');
  }, [members]);

  const currentUserId = useMemo(() => {
    return currentUser?.id || (currentUser as any)?._id || (currentUser as any)?.userId || '';
  }, [currentUser]);

  const currentMember = useMemo(() => {
    if (!currentUserId) return null;
    return eligibleMembers.find(
      (m) =>
        (m.userId && m.userId === currentUserId) ||
        (m._id && m._id === currentUserId) ||
        (m.id && m.id === currentUserId)
    );
  }, [eligibleMembers, currentUserId]);

  const effectiveCurrentUserId = useMemo(() => {
    return currentMember
      ? currentMember.userId || currentMember._id || currentMember.id
      : currentUserId;
  }, [currentMember, currentUserId]);

  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(getTodayStr());
  const [endDate, setEndDate] = useState<string>(getTodayStr());
  const [slotId, setSlotId] = useState<string>('all');
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Set default duration when modal opens or props change
  useEffect(() => {
    if (!isOpen) return;

    if (existingLeave) {
      setSelectedUserId(existingLeave.userId);
      setStartDate(existingLeave.startDate || existingLeave.date || getTodayStr());
      setEndDate(existingLeave.endDate || existingLeave.date || getTodayStr());
      setSlotId(existingLeave.slotId || 'all');
      setReason(existingLeave.reason || (isBangla ? 'বাড়িতে যাওয়া / ছুটি' : 'Going home / Personal leave'));
    } else {
      const start = getTodayStr();
      setStartDate(start);
      // Default 10 days duration
      const d = new Date(start);
      d.setDate(d.getDate() + 9);
      setEndDate(d.toISOString().split('T')[0]);
      setReason(isBangla ? 'বাড়িতে যাওয়া / ছুটি' : 'Going home / Personal leave');

      if (!isManager && effectiveCurrentUserId) {
        setSelectedUserId(effectiveCurrentUserId);
      } else if (preselectedUserId) {
        setSelectedUserId(preselectedUserId);
      } else if (eligibleMembers.length > 0 && !selectedUserId) {
        setSelectedUserId(eligibleMembers[0].userId || eligibleMembers[0]._id);
      }
    }
  }, [isOpen, existingLeave, preselectedUserId, eligibleMembers, isManager, effectiveCurrentUserId, isBangla]);

  // Day difference calculation (must be declared BEFORE any early return)
  const durationDays = useMemo(() => {
    if (!startDate || !endDate) return 1;
    const startMs = new Date(startDate).getTime();
    const endMs = new Date(endDate).getTime();
    if (isNaN(startMs) || isNaN(endMs) || endMs < startMs) return 1;
    return Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1;
  }, [startDate, endDate]);

  const selectedMember = useMemo(() => {
    return (
      eligibleMembers.find((m) => (m.userId || m._id) === selectedUserId) ||
      currentMember
    );
  }, [eligibleMembers, selectedUserId, currentMember]);

  const applyDurationPill = (days: number) => {
    if (!startDate) return;
    const d = new Date(startDate);
    d.setDate(d.getDate() + (days - 1));
    setEndDate(d.toISOString().split('T')[0]);
  };

  // Safe early return ONLY after all React Hooks have executed unconditionally
  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const targetUserId =
      !isManager && effectiveCurrentUserId ? effectiveCurrentUserId : selectedUserId;

    if (!targetUserId) {
      toast.warning(isBangla ? 'সদস্য নির্বাচন করুন' : 'Please select a member');
      return;
    }
    if (!startDate || !endDate || endDate < startDate) {
      toast.warning(isBangla ? 'সঠিক শুরুর ও সমাপ্তির তারিখ নির্বাচন করুন' : 'Please select valid start and end dates');
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
          toast.success(isBangla ? 'ছুটি সফলভাবে সংশোধন করা হয়েছে!' : 'Leave schedule updated successfully!');
          onSuccess();
          onClose();
        } else {
          toast.error(data.error || (isBangla ? 'সংশোধন ব্যর্থ হয়েছে' : 'Failed to update leave'));
        }
      } else {
        // Create new leave schedule or request
        const res = await fetch('/api/meal-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: targetUserId,
            startDate,
            endDate,
            slotId: 'all',
            action: 'off',
            reason: reason.trim() || (isBangla ? 'বাড়িতে যাওয়া / ছুটি' : 'Going home / Personal leave'),
            isAdminDirect: isManager,
          }),
        });

        const data = await res.json();
        if (data.success) {
          if (isManager) {
            toast.success(
              isBangla
                ? `${selectedMember?.name || 'সদস্য'}-এর ${startDate} থেকে ${endDate} পর্যন্ত (${durationDays} দিন) মিল বন্ধ শিডিউল কার্যকর হয়েছে!`
                : `Scheduled ${durationDays} days leave for ${selectedMember?.name || 'member'} from ${startDate} to ${endDate}!`
            );
          } else {
            toast.success(
              isBangla
                ? `আপনার ${startDate} থেকে ${endDate} পর্যন্ত (${durationDays} দিন) ছুটির আবেদন মেস ম্যানেজারের কাছে জমা হয়েছে!`
                : `Your leave request for ${durationDays} days (${startDate} to ${endDate}) has been submitted for approval!`
            );
          }
          onSuccess();
          onClose();
        } else {
          toast.error(data.error || (isBangla ? 'সংরক্ষণ ব্যর্থ হয়েছে' : 'Failed to save leave'));
        }
      }
    } catch (err: any) {
      toast.error(isBangla ? 'নেটওয়ার্ক ত্রুটি ঘটেছে' : 'Network error occurred');
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
                {existingLeave
                  ? (isBangla ? 'ছুটি / মিল বন্ধের সময় সংশোধন' : 'Edit Leave / Meal-Off Schedule')
                  : isManager
                  ? (isBangla ? 'সদস্যের মিল বন্ধ / ছুটি শিডিউল' : 'Schedule Member Leave / Vacation')
                  : (isBangla ? 'ছুটি / মিল বন্ধের আবেদন' : 'Request Leave / Vacation')}
              </h3>
              <p className="text-[11px] text-slate-400">
                {isManager
                  ? (isBangla
                      ? 'বাড়ি যাওয়া বা যেকোনো মেয়াদের জন্য স্বয়ংক্রিয় মিল অফ নির্ধারণ'
                      : 'Schedule automatic 0 meals for members going home or on leave')
                  : (isBangla
                      ? 'বাড়ি যাওয়া বা ছুটির দিনগুলোতে মিল বন্ধের জন্য আবেদন করুন'
                      : 'Request automatic meal-off for going home or personal absence')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto max-h-[80vh]">
          {/* Member Picker */}
          <div>
            <label className="block text-slate-300 mb-1 font-semibold">
              {isBangla ? 'সদস্য নির্বাচন *' : 'Selected Member *'}
            </label>
            {isManager && !existingLeave ? (
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                disabled={Boolean(preselectedUserId)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white outline-none focus:border-amber-500 disabled:opacity-60 text-xs font-semibold cursor-pointer"
              >
                {eligibleMembers.map((m) => {
                  const uid = m.userId || m._id;
                  return (
                    <option key={uid} value={uid}>
                      {m.displayName || m.name}{' '}
                      {m.role === 'admin'
                        ? (isBangla ? '(মেস ম্যানেজার 👑)' : '(Mess Manager 👑)')
                        : (isBangla ? '(সদস্য)' : '(Resident Member)')}
                    </option>
                  );
                })}
              </select>
            ) : (
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <span className="font-bold text-white text-xs">
                  {selectedMember?.name || currentUser?.name || 'Member'}
                </span>
                <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 font-medium">
                  {!isManager ? (isBangla ? 'আপনার অ্যাকাউন্ট' : 'Your Account') : (isBangla ? 'সংশোধনাধীন' : 'Editing')}
                </span>
              </div>
            )}
          </div>

          {/* Date Range */}
          <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400" />
                {isBangla
                  ? `ছুটির মেয়াদ (${durationDays} দিন মিল বন্ধ থাকবে)`
                  : `Duration (${durationDays} days meal off)`}
              </span>
              <span className="text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                {durationDays} {isBangla ? 'দিন' : 'Days Off'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1 text-[11px]">
                  {isBangla ? 'শুরুর তারিখ' : 'Start Date'}
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500 font-mono text-xs cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 text-[11px]">
                  {isBangla ? 'সমাপ্তির তারিখ' : 'End Date'}
                </label>
                <input
                  type="date"
                  required
                  min={startDate}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500 font-mono text-xs cursor-pointer"
                />
              </div>
            </div>

            {/* Quick Preset Duration Pills */}
            <div>
              <span className="text-[10px] text-slate-500 block mb-1.5">
                {isBangla ? 'দ্রুত দিন বাছাই করুন:' : 'Quick Duration Presets:'}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[3, 5, 7, 10, 15, 20, 30].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => applyDurationPill(days)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer ${
                      durationDays === days
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {days} {isBangla ? 'দিন' : 'Days'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-slate-300 mb-1 font-semibold">
              {isBangla ? 'ছুটির কারণ বা মন্তব্য' : 'Reason / Note'}
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={isBangla ? 'যেমন: ১০ দিনের জন্য বাড়ি গমন' : 'e.g., Going home for 10 days'}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500 text-xs"
            />
          </div>

          {/* UX Assurance Banner */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-200/90 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-400">
              <Info className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{isBangla ? 'স্বাচ্ছন্দ্যময় নিয়মাবলী:' : 'Helpful Mess Guidelines:'}</span>
            </div>
            <p className="leading-relaxed">
              {isBangla ? (
                <>
                  • নির্ধারিত {durationDays} দিনের প্রতিটি দিন মিল শিটে স্বয়ংক্রিয়ভাবে{' '}
                  <strong className="text-white">০ মিল</strong> থাকবে।
                  <br />• সদস্য আগে ফিরে আসলে দৈনিক হাজিরা শিট থেকে সরাসরি{' '}
                  <strong className="text-white">&apos;+&apos; ক্লিক করে মিল চালু</strong> করা যাবে অথবা যেকোনো সময় ছুটি সমাপ্ত করা যাবে।
                </>
              ) : (
                <>
                  • For all {durationDays} days, daily meals will be automatically kept at{' '}
                  <strong className="text-white">0 meals</strong>.
                  <br />• If returning earlier, meals can be resumed anytime from the daily attendance sheet by clicking{' '}
                  <strong className="text-white">&apos;+&apos;</strong> or ending the leave.
                </>
              )}
            </p>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 font-semibold cursor-pointer"
            >
              {isBangla ? 'বাতিল' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (!isManager && !currentUser?.id ? false : !selectedUserId)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>{isBangla ? 'সংরক্ষণ হচ্ছে...' : 'Saving...'}</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>
                    {existingLeave
                      ? (isBangla ? 'ছুটি আপডেট করুন' : 'Update Leave')
                      : isManager
                      ? (isBangla ? 'ছুটি নির্ধারণ করুন' : 'Schedule Leave')
                      : (isBangla ? 'ছুটির আবেদন জমা দিন' : 'Submit Leave Request')}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
