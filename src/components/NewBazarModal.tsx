'use client';

import React, { useState } from 'react';
import { ShoppingBag, X } from 'lucide-react';
import { AppUser } from '@/lib/session';

interface NewBazarModalProps {
  currentUser: AppUser;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const NewBazarModal: React.FC<NewBazarModalProps> = ({
  currentUser,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'regular' | 'fixed' | 'extra' | 'big'>('regular');
  const [splitType, setSplitType] = useState<'meal_pool' | 'all_equal' | 'custom_members'>('meal_pool');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/bazars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          amount: Number(amount),
          description,
          type,
          splitType,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAmount('');
        setDescription('');
        onSuccess();
        onClose();
        alert('বাজার এন্ট্রি সফল হয়েছে! এটি Admin অনুমোদনের পর হিসাবে যুক্ত হবে।');
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
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-white text-base">নতুন বাজার ভাউচার এন্ট্রি</h3>
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
            <label className="block text-slate-400 mb-1 font-medium">বাজারের ধরন</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-amber-500"
            >
              <option value="regular">রেগুলার বাজার (প্রতিদিনের মূল বাজার)</option>
              <option value="extra">এক্সট্রা বাজার (অতিথি/নাস্তা/বিশেষ কেনাকাটা)</option>
              <option value="big">বড় বাজার (মাসের মুদি চাল/তেল/মসলা)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">টাকার পরিমাণ (টাকা)</label>
            <input
              type="number"
              required
              min="1"
              placeholder="যেমন: ১৫০০"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-amber-500 font-mono text-sm"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">কী কী কেনা হয়েছে (বিবরণ)</label>
            <textarea
              required
              rows={3}
              placeholder="যেমন: ৩ কেজি মাছ, শাকসবজি, ডিম ও কাঁচামরিচ"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-amber-500"
            />
          </div>

          {type === 'extra' && (
            <div>
              <label className="block text-slate-400 mb-1 font-medium">এক্সট্রা বাজারের ভাগের পদ্ধতি</label>
              <select
                value={splitType}
                onChange={(e) => setSplitType(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-amber-500"
              >
                <option value="meal_pool">মিল পুলে ভাগ (ডিফল্ট - সবার মিল অনুযায়ী)</option>
                <option value="all_equal">সবার সমান ভাগ (Equal Split)</option>
              </select>
            </div>
          )}

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
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-lg shadow-amber-600/20 transition-all"
            >
              ভাউচার জমা দিন
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
