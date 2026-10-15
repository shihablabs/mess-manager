'use client';

import React, { useState } from 'react';
import { Utensils, X, Clock, AlertTriangle } from 'lucide-react';
import { AppUser } from '@/lib/session';

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
  const [date, setDate] = useState('');
  const [slotId, setSlotId] = useState('night');
  const [action, setAction] = useState<'off' | 'on'>('off');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (!date) {
      setDate(new Date().toISOString().split('T')[0]);
    }
  }, [date]);

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
          date,
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
        alert('মিল অফ/অন অনুরোধ পাঠানো হয়েছে!');
      } else {
        alert(data.error || 'ব্যর্থ হয়েছে');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Utensils className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-white text-base">মিল অফ / অন করার অনুরোধ</h3>
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
              <Clock className="w-4 h-4" /> ডেডলাইন সময়সীমা (SRS ৪.২):
            </div>
            <p className="text-[11px] text-amber-200/80">
              • সকালের মিল: আগের দিন রাত ১০:০০ ঘটিকা
              <br />• রাতের মিল: ঐ দিন বিকাল ৪:০০ ঘটিকা
            </p>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">তারিখ</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-indigo-500 font-mono text-sm"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">মিল স্লট</label>
            <select
              value={slotId}
              onChange={(e) => setSlotId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-indigo-500"
            >
              <option value="morning">সকাল (ওজন ০.৫)</option>
              <option value="night">রাত (ওজন ১.০)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">অনুরোধের ধরন</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAction('off')}
                className={`py-2 rounded-xl font-bold border transition-all ${
                  action === 'off'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}
              >
                মিল অফ (খাব না)
              </button>
              <button
                type="button"
                onClick={() => setAction('on')}
                className={`py-2 rounded-xl font-bold border transition-all ${
                  action === 'on'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}
              >
                মিল চালু (খাব)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">কারণ (ঐচ্ছিক)</label>
            <input
              type="text"
              placeholder="যেমন: বাড়িতে যাচ্ছি / দাওয়াত আছে"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-indigo-500"
            />
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
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/20 transition-all"
            >
              অনুরোধ পাঠান
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
