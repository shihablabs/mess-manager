'use client';

import React, { useState } from 'react';
import { Wallet, X } from 'lucide-react';

interface DepositModalProps {
  members: any[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const DepositModal: React.FC<DepositModalProps> = ({
  members,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [selectedUser, setSelectedUser] = useState(members[0]?.userId || 'user_1');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'general' | 'big_bazar'>('general');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/deposits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser,
          amount: Number(amount),
          type,
          notes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAmount('');
        setNotes('');
        onSuccess();
        onClose();
        alert('জমা সফলভাবে এন্ট্রি হয়েছে!');
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
            <Wallet className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-white text-base">জমা (Deposit) এন্ট্রি করুন</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-medium">সদস্য বাছাই করুন</label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-emerald-500"
            >
              {members
                .filter((m) => m.role !== 'admin')
                .map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">জমার ধরন</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-emerald-500"
            >
              <option value="general">সাধারণ মেস জমা (General Deposit)</option>
              <option value="big_bazar">বড় বাজারের কন্ট্রিবিউশন (Big Bazar Fund)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">টাকার পরিমাণ (টাকা)</label>
            <input
              type="number"
              required
              min="1"
              placeholder="যেমন: ৫০০০"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-emerald-500 font-mono text-sm"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">নোট / মাধ্যম (ঐচ্ছিক)</label>
            <input
              type="text"
              placeholder="যেমন: বিকাশ মারফত / ক্যাশ দেওয়া হয়েছে"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-emerald-500"
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
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-600/20 transition-all"
            >
              জমা নিশ্চিত করুন
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
