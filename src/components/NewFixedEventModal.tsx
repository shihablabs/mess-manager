'use client';

import React, { useState } from 'react';
import { Sparkles, X, RotateCw } from '@/components/icons';
import { toast } from 'sonner';
import { calculateFixedEventPerPerson } from '@/billing-engine';

interface NewFixedEventModalProps {
  members: any[];
  fixedExtraWeightDefault?: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const NewFixedEventModal: React.FC<NewFixedEventModalProps> = ({
  members,
  fixedExtraWeightDefault = 0.5,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [title, setTitle] = useState('শুক্রবার স্পেশাল গরুর মাংস ভোজ');
  const [date, setDate] = useState('');
  const [cost, setCost] = useState('600');
  const [mealTime, setMealTime] = useState<'morning' | 'lunch' | 'dinner'>('lunch');
  const [attendeeIds, setAttendeeIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (!date) {
      setDate(new Date().toISOString().split('T')[0]);
    }
    // Default all active members checked
    if (attendeeIds.length === 0 && members.length > 0) {
      setAttendeeIds(members.filter((m) => m.role !== 'admin').map((m) => m.userId));
    }
  }, [date, attendeeIds.length, members]);

  if (!isOpen) return null;

  const toggleAttendee = (userId: string) => {
    if (attendeeIds.includes(userId)) {
      setAttendeeIds(attendeeIds.filter((id) => id !== userId));
    } else {
      setAttendeeIds([...attendeeIds, userId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !cost || Number(cost) <= 0 || attendeeIds.length === 0) {
      toast.warning('শিরোনাম, খরচ এবং অন্তত একজন উপস্থিত সদস্য নির্বাচন করুন');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/fixed-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          date,
          cost: Number(cost),
          mealTime,
          attendeeUserIds: attendeeIds,
          extraMealWeight: fixedExtraWeightDefault ?? 0.5,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onSuccess();
        onClose();
        toast.success('বিশেষ ভোজ (Fixed Event) সফলভাবে যুক্ত হয়েছে!');
      } else {
        toast.error(data.error || 'ব্যর্থ হয়েছে');
      }
    } catch (err: any) {
      toast.error(err.message || 'নেটওয়ার্ক ত্রুটি ঘটেছে');
    } finally {
      setIsSubmitting(false);
    }
  };

  const perPerson = calculateFixedEventPerPerson(Number(cost || 0), attendeeIds.length);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-white text-base">নতুন বিশেষ ভোজ (Fixed Event) শিডিউল</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-medium">ভোজের নাম বা উপলক্ষ</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-amber-500 font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">তারিখ</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-amber-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">বেলা (Meal Time)</label>
              <select
                value={mealTime}
                onChange={(e) => setMealTime(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-amber-500"
              >
                <option value="lunch">দুপুর (ডিফল্ট)</option>
                <option value="dinner">রাত</option>
                <option value="morning">সকাল</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">মোট ভোজের খরচ (টাকা)</label>
            <input
              type="number"
              required
              min="1"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-amber-500 font-mono text-sm"
            />
          </div>

          {/* Attendees Selection */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-slate-400 font-medium">
                উপস্থিত সদস্য বাছাই ({attendeeIds.length} জন নির্বাচিত)
              </label>
              <span className="text-amber-400 font-mono font-bold">
                জনপ্রতি প্রদেয়: ৳{perPerson}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 bg-slate-950 border border-slate-800 rounded-xl">
              {members
                .filter((m) => m.role !== 'admin')
                .map((m) => {
                  const isChecked = attendeeIds.includes(m.userId);
                  return (
                    <label
                      key={m.userId}
                      onClick={() => toggleAttendee(m.userId)}
                      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer border transition-all ${
                        isChecked
                          ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="rounded accent-amber-500"
                      />
                      <span className="text-xs truncate">{m.name}</span>
                    </label>
                  );
                })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-slate-200 font-medium"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-lg shadow-amber-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>যুক্ত হচ্ছে...</span>
                </>
              ) : (
                <span>ভোজ যুক্ত করুন</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
