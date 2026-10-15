'use client';

import React, { useState } from 'react';
import { ShoppingBag, X, Info, ShieldCheck, Calendar } from 'lucide-react';
import { AppUser } from '@/lib/session';

interface NewBazarModalProps {
  currentUser: AppUser;
  members?: any[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const NewBazarModal: React.FC<NewBazarModalProps> = ({
  currentUser,
  members = [],
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [payerId, setPayerId] = useState<string>(currentUser.id);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'regular' | 'fixed' | 'extra' | 'big'>('regular');
  const [splitType, setSplitType] = useState<'meal_pool' | 'all_equal' | 'custom_members'>('meal_pool');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const isManagerOrAdmin =
    currentUser.role === 'super_admin' || currentUser.role === 'admin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/bazars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: isManagerOrAdmin ? payerId : currentUser.id,
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
        alert(data.message || 'বাজার সফলভাবে সরাসরি যুক্ত ও অনুমোদিত হয়েছে!');
      } else {
        alert(data.error || 'বাজার যুক্ত করতে ব্যর্থ হয়েছে');
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
            <h3 className="font-bold text-white text-base">বাজার ভাউচার এন্ট্রি</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Rules reminder banner */}
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1 text-slate-300">
            <div className="flex items-center gap-1.5 font-bold text-indigo-400">
              <Info className="w-4 h-4" /> বাজার এন্ট্রি নিয়মাবলী:
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              • <strong>রেগুলার বাজার:</strong> নির্ধারিত রোস্টার ডিউটি স্লট চলাকালীন সদস্য সরাসরি তুলতে পারবেন।
              <br />• <strong>ফিক্সড ও এক্সট্রা বাজার:</strong> যেকোনো সদস্য যেকোনো দিন যুক্ত করতে পারবেন।
              <br />• <strong>বড় বাজার:</strong> মেস অ্যাডমিন/ম্যানেজার ১০-১৫ তারিখের মধ্যে নিয়ন্ত্রণ ও এন্ট্রি করবেন।
            </p>
          </div>

          {/* If Manager, allow choosing payer */}
          {isManagerOrAdmin && members.length > 0 && (
            <div>
              <label className="block text-slate-400 mb-1 font-medium">কার খরচে বাজার হয়েছে (Payer)</label>
              <select
                value={payerId}
                onChange={(e) => setPayerId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-amber-500 font-medium"
              >
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.name} ({m.role === 'super_admin' ? 'সুপার এডমিন' : m.role === 'admin' ? 'ম্যানেজার' : 'সদস্য'})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-slate-400 mb-1 font-medium">বাজারের ধরন</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-amber-500"
            >
              <option value="regular">রেগুলার বাজার (ডিউটি রোস্টার চলাকালীন সরাসরি এন্ট্রি)</option>
              <option value="extra">এক্সট্রা বাজার (অতিথি/নাস্তা/মসলা - সবার জন্য উন্মুক্ত)</option>
              <option value="fixed">ফিক্সড স্পেশাল বাজার (শুক্রবার ভোজ - সবার জন্য উন্মুক্ত)</option>
              {isManagerOrAdmin && (
                <option value="big">বড় বাজার (১০-১৫ তারিখের মাসিক চাল/তেল - অ্যাডমিন)</option>
              )}
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
            <label className="block text-slate-400 mb-1 font-medium">বাজারের বিবরণ</label>
            <textarea
              required
              rows={2}
              placeholder="যেমন: ডিম ২ ডজন, আলু ৫ কেজি, তেল ১ লিটার"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-amber-500"
            />
          </div>

          {type === 'extra' && (
            <div>
              <label className="block text-slate-400 mb-1 font-medium">এক্সট্রা বাজারের ভাগ পদ্ধতি</label>
              <select
                value={splitType}
                onChange={(e) => setSplitType(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-amber-500"
              >
                <option value="meal_pool">মিল পুল (সকলের মিল রেটের সাথে যোগ হবে)</option>
                <option value="all_equal">সকল সদস্যের মধ্যে সমান ভাগ</option>
              </select>
            </div>
          )}

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
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-lg shadow-amber-600/25 transition-all cursor-pointer"
            >
              {isSubmitting ? 'যুক্ত হচ্ছে...' : 'বাজার যুক্ত করুন'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
