'use client';

import React, { useState, useEffect } from 'react';
import { Wallet, X } from 'lucide-react';
import { toast } from 'sonner';

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
  const [selectedUser, setSelectedUser] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'general' | 'big_bazar'>('general');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter dining members (exclude only super_admin)
  const diningMembers = members.filter((m) => m.role !== 'super_admin');

  // Ensure selectedUser is correctly initialized when modal opens or members change
  useEffect(() => {
    if (diningMembers.length > 0) {
      const currentValid = diningMembers.some((m) => (m.userId || m._id) === selectedUser);
      if (!currentValid) {
        setSelectedUser(diningMembers[0].userId || diningMembers[0]._id);
      }
    }
  }, [members, isOpen, selectedUser]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      toast.warning('সঠিক টাকার অঙ্ক লিখুন');
      return;
    }
    if (!selectedUser) {
      toast.warning('সদস্য বাছাই করুন');
      return;
    }

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
        toast.success('জমা সফলভাবে এন্ট্রি হয়েছে এবং ব্যালেন্সে যুক্ত হয়েছে!');
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
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-white text-base">জমা (Deposit) এন্ট্রি করুন</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer"
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
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-emerald-500 cursor-pointer"
            >
              {diningMembers.map((m) => {
                const id = m.userId || m._id;
                return (
                  <option key={id} value={id}>
                    {m.name} {m.role === 'admin' ? '(মেস ম্যানেজার)' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">জমার ধরন</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-emerald-500 cursor-pointer"
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
            <label className="block text-slate-400 mb-1 font-medium">নোট / বিবরণ (ঐচ্ছিক)</label>
            <input
              type="text"
              placeholder="যেমন: খালা বিল / বিকাশ মারফত / ক্যাশ"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
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
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
            >
              {isSubmitting ? 'সংরক্ষণ হচ্ছে...' : 'জমা নিশ্চিত করুন'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
