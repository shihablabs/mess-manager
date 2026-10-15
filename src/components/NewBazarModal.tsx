'use client';

import React, { useState } from 'react';
import { ShoppingBag, X, Info, Plus, Trash2, Calendar, ListPlus, Calculator, Check } from 'lucide-react';
import { AppUser } from '@/lib/session';
import { formatTaka } from '@/lib/money';
import { toast } from 'sonner';

interface NewBazarModalProps {
  currentUser: AppUser;
  members?: any[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ItemRow {
  name: string;
  qty: string;
  price: string;
}

export const NewBazarModal: React.FC<NewBazarModalProps> = ({
  currentUser,
  members = [],
  isOpen,
  onClose,
  onSuccess,
}) => {
  const getTodayStr = () => new Date().toISOString().split('T')[0];

  const [entryMode, setEntryMode] = useState<'multi' | 'single'>('multi');
  const [payerId, setPayerId] = useState<string>(currentUser.id);
  const [date, setDate] = useState<string>(getTodayStr());
  const [type, setType] = useState<'regular' | 'fixed' | 'extra' | 'big'>('regular');
  const [splitType, setSplitType] = useState<'meal_pool' | 'all_equal' | 'custom_members'>('meal_pool');
  
  // Single mode state
  const [singleAmount, setSingleAmount] = useState('');
  const [singleDescription, setSingleDescription] = useState('');

  // Multi-item mode state
  const [items, setItems] = useState<ItemRow[]>([
    { name: '', qty: '', price: '' },
    { name: '', qty: '', price: '' },
  ]);
  const [extraNote, setExtraNote] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const isManagerOrAdmin =
    currentUser.role === 'super_admin' || currentUser.role === 'admin';

  // Multi-item calculations
  const totalItemAmount = items.reduce((sum, it) => sum + (parseFloat(it.price) || 0), 0);
  const validItemsCount = items.filter((it) => it.name.trim() && parseFloat(it.price) > 0).length;

  const handleAddItem = () => {
    setItems((prev) => [...prev, { name: '', qty: '', price: '' }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof ItemRow, value: string) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let finalAmount = 0;
    let finalDescription = '';
    let finalItems: { name: string; qty?: string; price: number }[] | undefined = undefined;

    if (entryMode === 'multi') {
      const validItems = items.filter((it) => it.name.trim() && parseFloat(it.price) > 0);
      if (validItems.length === 0) {
        toast.error('অন্তত একটি জিনিসের নাম এবং সঠিক মূল্য লিখুন');
        return;
      }
      finalAmount = validItems.reduce((sum, it) => sum + parseFloat(it.price), 0);
      finalItems = validItems.map((it) => ({
        name: it.name.trim(),
        qty: it.qty.trim() || undefined,
        price: parseFloat(it.price),
      }));

      const itemsText = validItems
        .map((it) => `${it.name.trim()}${it.qty.trim() ? ` (${it.qty.trim()})` : ''} - ৳${it.price}`)
        .join(', ');
      finalDescription = extraNote.trim() ? `${itemsText} | নোট: ${extraNote.trim()}` : itemsText;
    } else {
      if (!singleAmount || !singleDescription.trim()) {
        toast.error('টাকার পরিমাণ ও বিবরণ দিন');
        return;
      }
      finalAmount = Number(singleAmount);
      finalDescription = singleDescription.trim();
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/bazars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: isManagerOrAdmin ? payerId : currentUser.id,
          amount: finalAmount,
          description: finalDescription,
          items: finalItems,
          date,
          type,
          splitType,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSingleAmount('');
        setSingleDescription('');
        setItems([
          { name: '', qty: '', price: '' },
          { name: '', qty: '', price: '' },
        ]);
        setExtraNote('');
        onSuccess();
        onClose();
        toast.success(data.message || 'বাজার সফলভাবে সরাসরি যুক্ত হয়েছে!');
      } else {
        toast.error(data.error || 'বাজার যুক্ত করতে ব্যর্থ হয়েছে');
      }
    } catch (err: any) {
      toast.error(err.message || 'নেটওয়ার্ক ত্রুটি ঘটেছে');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">বাজার ভাউচার এন্ট্রি</h3>
              <p className="text-[11px] text-slate-400">একসাথে একাধিক আইটেমের ফর্দ বা একক খরচ যুক্ত করুন</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto">
          {/* Mode Switcher */}
          <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
            <button
              type="button"
              onClick={() => setEntryMode('multi')}
              className={`flex-1 py-1.5 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                entryMode === 'multi'
                  ? 'bg-amber-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ListPlus className="w-3.5 h-3.5" />
              একাধিক জিনিসের ফর্দ (Multi-Item)
            </button>
            <button
              type="button"
              onClick={() => setEntryMode('single')}
              className={`flex-1 py-1.5 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                entryMode === 'single'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              একক মোট টাকা (Single Entry)
            </button>
          </div>

          {/* Date & Buyer Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Date */}
            <div>
              <label className="block text-slate-400 mb-1 font-medium">বাজারের তারিখ</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-amber-500 font-mono"
              />
            </div>

            {/* Payer */}
            {isManagerOrAdmin && members.length > 0 ? (
              <div>
                <label className="block text-slate-400 mb-1 font-medium">ক্রেতার নাম (Payer)</label>
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
            ) : (
              <div>
                <label className="block text-slate-400 mb-1 font-medium">ক্রেতা</label>
                <input
                  type="text"
                  disabled
                  value={`${currentUser.name} (আপনি)`}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-slate-400"
                />
              </div>
            )}
          </div>

          {/* Bazar Type */}
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

          {/* MODE 1: MULTI-ITEMIZED LIST */}
          {entryMode === 'multi' && (
            <div className="space-y-3 p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-bold text-amber-300 flex items-center gap-1.5">
                  <ListPlus className="w-4 h-4 text-amber-400" />
                  বাজারের জিনিসপত্রের তালিকা (আইটেমওয়ারী)
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  আইটেম সংখ্যা: <strong>{items.length}</strong>
                </span>
              </div>

              {/* Items Table / Row List */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {items.map((it, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                    <span className="text-slate-500 font-mono text-[11px] w-5 text-center shrink-0">
                      #{idx + 1}
                    </span>
                    <input
                      type="text"
                      placeholder="জিনিসের নাম (যেমন: চাল/ডিম)"
                      value={it.name}
                      onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-750 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500"
                    />
                    <input
                      type="text"
                      placeholder="পরিমাণ (৫ কেজি)"
                      value={it.qty}
                      onChange={(e) => handleItemChange(idx, 'qty', e.target.value)}
                      className="w-24 bg-slate-950 border border-slate-750 rounded-lg px-2 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500"
                    />
                    <div className="relative w-24 shrink-0">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs">৳</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="দাম"
                        value={it.price}
                        onChange={(e) => handleItemChange(idx, 'price', e.target.value)}
                        className="w-full pl-5 pr-2 py-1.5 bg-slate-950 border border-slate-750 rounded-lg text-xs font-mono font-bold text-amber-300 placeholder-slate-500 outline-none focus:border-amber-500"
                      />
                    </div>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer shrink-0"
                        title="এই আইটেমটি মুছুন"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add More Item Button & Total Row */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-amber-300 font-semibold text-xs border border-amber-500/20 cursor-pointer transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  আরেকটি জিনিস যোগ করুন
                </button>

                <div className="text-right">
                  <span className="text-[11px] text-slate-400 block">মোট হিসাবকৃত খরচ</span>
                  <span className="text-sm font-extrabold text-amber-400 font-mono">
                    {formatTaka(totalItemAmount)}
                  </span>
                </div>
              </div>

              {/* Optional note */}
              <div>
                <label className="block text-slate-400 mb-1 font-medium">অতিরিক্ত নোট বা মন্তব্য (ঐচ্ছিক)</label>
                <input
                  type="text"
                  placeholder="যেমন: শুক্রবারের রাতের রান্নার জন্য কেনা হয়েছে"
                  value={extraNote}
                  onChange={(e) => setExtraNote(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-amber-500 text-xs"
                />
              </div>
            </div>
          )}

          {/* MODE 2: SINGLE AMOUNT & TEXT DESCRIPTION */}
          {entryMode === 'single' && (
            <div className="space-y-3">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">মোট খরচের পরিমাণ (টাকা)</label>
                <input
                  type="number"
                  required={entryMode === 'single'}
                  min="1"
                  placeholder="যেমন: ১৫০০"
                  value={singleAmount}
                  onChange={(e) => setSingleAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-amber-500 font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">বাজারের বিবরণ</label>
                <textarea
                  required={entryMode === 'single'}
                  rows={2}
                  placeholder="যেমন: ডিম ২ ডজন, আলু ৫ কেজি, তেল ১ লিটার"
                  value={singleDescription}
                  onChange={(e) => setSingleDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-amber-500"
                />
              </div>
            </div>
          )}

          {/* Extra Bazar Split Method */}
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

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800 shrink-0">
            <div className="text-xs">
              <span className="text-slate-400">সর্বমোট ভাউচার: </span>
              <strong className="text-white font-mono font-extrabold text-sm">
                {formatTaka(entryMode === 'multi' ? totalItemAmount : Number(singleAmount) || 0)}
              </strong>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-slate-200 font-medium cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="submit"
                disabled={isSubmitting || (entryMode === 'multi' && totalItemAmount <= 0)}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold shadow-lg shadow-amber-600/25 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'সংরক্ষণ হচ্ছে...' : 'বাজার যুক্ত করুন'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
