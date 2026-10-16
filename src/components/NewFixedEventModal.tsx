'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  X,
  Plus,
  Trash2,
  Search,
  Check,
  Users,
  DollarSign,
  Info,
  Calendar,
  RotateCw,
  ShoppingBag,
} from '@/components/icons';
import { toast } from 'sonner';
import { calculateFixedEventPerPerson } from '@/billing-engine';
import { useLanguage } from '@/context/LanguageContext';

interface NewFixedEventModalProps {
  members: any[];
  currentUser?: any;
  fixedExtraWeightDefault?: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ExpenseItemRow {
  id: string;
  name: string;
  amount: string;
}

export const NewFixedEventModal: React.FC<NewFixedEventModalProps> = ({
  members = [],
  currentUser,
  fixedExtraWeightDefault = 0.5,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { isBangla } = useLanguage();

  // Basic Event details
  const [title, setTitle] = useState(
    isBangla ? 'শুক্রবার স্পেশাল গরুর মাংস ভোজ' : 'Friday Special Feast'
  );
  const [date, setDate] = useState('');
  const [mealTime, setMealTime] = useState<'morning' | 'lunch' | 'dinner'>('lunch');
  const [buyerUserId, setBuyerUserId] = useState<string>('');

  // Itemized expenses with dynamic rows and auto-sum
  const [items, setItems] = useState<ExpenseItemRow[]>([
    { id: '1', name: isBangla ? 'গরুর মাংস / মুরগি' : 'Beef / Chicken', amount: '800' },
    { id: '2', name: isBangla ? 'পোলাও চাল ও ঘি' : 'Polao Rice & Ghee', amount: '350' },
    { id: '3', name: isBangla ? 'মসলা, সালাদ ও কোল্ড ড্রিংকস' : 'Spices & Salad', amount: '150' },
  ]);

  // Attendance and search
  const [attendeeIds, setAttendeeIds] = useState<string[]>([]);
  const [searchMember, setSearchMember] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Eligible mess members: Resident members & Mess Managers (excluding only super_admin)
  const eligibleMembers = useMemo(() => {
    return members.filter((m) => m.role !== 'super_admin');
  }, [members]);

  // Total expense auto-counted from rows
  const totalCost = useMemo(() => {
    return items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
  }, [items]);

  // Per person cost using pure billing engine function
  const perPerson = useMemo(() => {
    return calculateFixedEventPerPerson(totalCost, attendeeIds.length);
  }, [totalCost, attendeeIds.length]);

  // Selected buyer user details
  const selectedBuyer = useMemo(() => {
    return eligibleMembers.find((m) => m.userId === buyerUserId) || null;
  }, [eligibleMembers, buyerUserId]);

  // Initialize defaults on open
  useEffect(() => {
    if (!isOpen) return;

    if (!date) {
      setDate(new Date().toISOString().split('T')[0]);
    }

    // Default buyer to current logged-in user or mess manager
    if (!buyerUserId && eligibleMembers.length > 0) {
      const defaultBuyer =
        eligibleMembers.find((m) => m.userId === currentUser?.id) ||
        eligibleMembers.find((m) => m.role === 'admin') ||
        eligibleMembers[0];
      if (defaultBuyer) {
        setBuyerUserId(defaultBuyer.userId);
      }
    }

    // Default all eligible resident members (including Mess Manager) selected
    if (attendeeIds.length === 0 && eligibleMembers.length > 0) {
      setAttendeeIds(eligibleMembers.map((m) => m.userId));
    }
  }, [isOpen, date, buyerUserId, eligibleMembers, attendeeIds.length, currentUser?.id]);

  if (!isOpen) return null;

  // Handlers for expense item rows
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        name: '',
        amount: '',
      },
    ]);
  };

  const handleUpdateItem = (id: string, field: 'name' | 'amount', value: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      toast.info(isBangla ? 'কমপক্ষে একটি খরচের আইটেম থাকতে হবে' : 'At least one item is required');
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Handlers for attendee selection
  const toggleAttendee = (userId: string) => {
    if (attendeeIds.includes(userId)) {
      setAttendeeIds(attendeeIds.filter((id) => id !== userId));
    } else {
      setAttendeeIds([...attendeeIds, userId]);
    }
  };

  const handleSelectAll = () => {
    setAttendeeIds(eligibleMembers.map((m) => m.userId));
  };

  const handleDeselectAll = () => {
    setAttendeeIds([]);
  };

  // Filtered members by search query
  const filteredMembers = eligibleMembers.filter((m) => {
    const q = searchMember.toLowerCase().trim();
    if (!q) return true;
    const name = (m.displayName || m.name || '').toLowerCase();
    const phone = (m.phone || '').toLowerCase();
    const email = (m.email || '').toLowerCase();
    return name.includes(q) || phone.includes(q) || email.includes(q);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.warning(isBangla ? 'ভোজের নাম বা উপলক্ষ দিন' : 'Please provide event title');
      return;
    }

    if (totalCost <= 0) {
      toast.warning(isBangla ? 'ভোজের খরচের পরিমাণ শূন্যের বেশি হতে হবে' : 'Total cost must be greater than 0');
      return;
    }

    if (attendeeIds.length === 0) {
      toast.warning(isBangla ? 'অন্তত একজন উপস্থিত সদস্য বাছাই করুন' : 'Select at least one attendee');
      return;
    }

    // Filter valid expense items
    const validItems = items
      .filter((it) => it.name.trim() && Number(it.amount) > 0)
      .map((it) => ({
        name: it.name.trim(),
        amount: Number(it.amount),
      }));

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/fixed-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          date,
          cost: totalCost,
          mealTime,
          buyerUserId: buyerUserId || currentUser?.id,
          items: validItems.length > 0 ? validItems : [{ name: title.trim(), amount: totalCost }],
          attendeeUserIds: attendeeIds,
          extraMealWeight: fixedExtraWeightDefault ?? 0.5,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(
          isBangla
            ? 'বিশেষ ভোজ সফলভাবে তৈরি হয়েছে! বাজারকারীর ক্রেডিট ও সদস্যদের দেনা যুক্ত হয়েছে।'
            : 'Special feast scheduled successfully! Buyer credit and member shares updated.'
        );
        onSuccess();
        onClose();
      } else {
        toast.error(data.error || (isBangla ? 'সংরক্ষণ ব্যর্থ হয়েছে' : 'Failed to save'));
      }
    } catch (err: any) {
      toast.error(err.message || (isBangla ? 'নেটওয়ার্ক সমস্যা হয়েছে' : 'Network error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base">
                {isBangla ? 'নতুন বিশেষ ভোজ (Fixed Event) শিডিউল' : 'New Special Feast (Fixed Event)'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {isBangla
                  ? 'বাজারকারী ক্রেডিট পাবে এবং উপস্থিত সদস্যদের মাঝে খরচ সমানভাবে বণ্টিত হবে'
                  : 'Buyer receives credit and attendees split the cost equally'}
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

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 overflow-y-auto text-xs">
          {/* Section 1: Event Info */}
          <div className="space-y-3 bg-slate-950/60 p-3.5 sm:p-4 rounded-xl border border-slate-800/80">
            <div>
              <label className="block text-slate-300 mb-1 font-semibold">
                {isBangla ? 'ভোজের নাম বা উপলক্ষ' : 'Feast Title / Occasion'} *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={isBangla ? 'যেমন: শুক্রবার স্পেশাল খাসির মাংস' : 'e.g. Friday Special Feast'}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-amber-500 font-medium text-xs sm:text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 mb-1 font-medium flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {isBangla ? 'তারিখ' : 'Date'} *
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">
                  {isBangla ? 'বেলা (Meal Time)' : 'Meal Time'}
                </label>
                <select
                  value={mealTime}
                  onChange={(e) => setMealTime(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500 text-xs"
                >
                  <option value="lunch">{isBangla ? 'দুপুর (Lunch)' : 'Lunch'}</option>
                  <option value="dinner">{isBangla ? 'রাত (Dinner)' : 'Dinner'}</option>
                  <option value="morning">{isBangla ? 'সকাল (Breakfast)' : 'Breakfast'}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Buyer Selection & Financial Relationship */}
          <div className="space-y-3 bg-amber-500/5 p-3.5 sm:p-4 rounded-xl border border-amber-500/20">
            <div>
              <label className="block text-amber-300 mb-1 font-semibold flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-amber-400" />
                {isBangla ? 'বাজারকারী / খরচ পরিশোধকারী' : 'Purchased / Paid By (Buyer)'} *
              </label>
              <select
                value={buyerUserId}
                onChange={(e) => setBuyerUserId(e.target.value)}
                className="w-full bg-slate-900 border border-amber-500/40 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-amber-400 text-xs font-semibold"
              >
                {eligibleMembers.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.displayName || m.name}{' '}
                    {m.role === 'admin'
                      ? isBangla
                        ? '(মেস ম্যানেজার 👑)'
                        : '(Mess Manager 👑)'
                      : isBangla
                      ? '(সদস্য)'
                      : '(Member)'}
                  </option>
                ))}
              </select>
            </div>

            {/* Accounting Logic Explanation Banner */}
            <div className="p-3 bg-slate-950/70 border border-amber-500/20 rounded-lg text-[11px] text-slate-300 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-amber-400">
                <Info className="w-3.5 h-3.5 flex-shrink-0" />
                <span>
                  {isBangla ? 'স্বয়ংক্রিয় হিসাব ও কাটাকাটি নীতি' : 'Automatic Accounting & Settlement'}
                </span>
              </div>
              <p className="leading-relaxed text-slate-300">
                {isBangla ? (
                  <>
                    বাজারকারী (
                    <strong className="text-amber-300">
                      {selectedBuyer?.displayName || selectedBuyer?.name || 'মেস ম্যানেজার'}
                    </strong>
                    ) নিজের পকেট থেকে মোট <strong className="text-white font-mono">৳{totalCost}</strong> খরচ করায়
                    তাঁর ব্যক্তিগত বাজার ব্যালেন্সে <span className="text-emerald-400 font-semibold">+৳{totalCost} ক্রেডিট</span> হিসেবে জমা হবে।
                    আর নিচে উপস্থিত <strong className="text-white">{attendeeIds.length} জন</strong> সদস্যের প্রত্যেকের দেনায় সমপরিমাণ{' '}
                    <span className="text-rose-300 font-semibold font-mono">৳{perPerson}</span> যোগ হবে। মাস শেষে এই প্লাস-মাইনাস কাটাকাটি হয়ে সমন্বয় হবে।
                  </>
                ) : (
                  <>
                    The buyer (
                    <strong className="text-amber-300">
                      {selectedBuyer?.displayName || selectedBuyer?.name || 'Mess Manager'}
                    </strong>
                    ) spends <strong className="text-white font-mono">৳{totalCost}</strong> and receives{' '}
                    <span className="text-emerald-400 font-semibold">+৳{totalCost} credit</span>. Each of the{' '}
                    <strong className="text-white">{attendeeIds.length} attendees</strong> is debited{' '}
                    <span className="text-rose-300 font-semibold font-mono">৳{perPerson}</span>. At month end, credits and debits cancel out cleanly.
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Section 3: Itemized Expenses Breakdown with Auto-Sum */}
          <div className="space-y-3 bg-slate-950/60 p-3.5 sm:p-4 rounded-xl border border-slate-800/80">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  {isBangla ? 'বাজারের খরচের বিবরণ ও আইটেম তালিকা' : 'Expense Items & Breakdown'}
                </h4>
                <p className="text-[11px] text-slate-400">
                  {isBangla
                    ? 'একাধিক খরচের আইটেম লিখুন, মোট খরচ স্বয়ংক্রিয়ভাবে হিসাব হবে'
                    : 'Add multiple expense items, total will sum automatically'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-lg font-semibold text-[11px] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                {isBangla ? 'আইটেম যোগ করুন' : 'Add Item'}
              </button>
            </div>

            {/* Items List */}
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 bg-slate-900/90 p-2 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors"
                >
                  <span className="text-[11px] font-mono text-slate-500 w-5 text-center">
                    {idx + 1}.
                  </span>
                  <input
                    type="text"
                    required
                    value={item.name}
                    onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                    placeholder={
                      isBangla
                        ? 'পণ্যের নাম (যেমন: গরুর মাংস, চাল, মসলা)'
                        : 'Item name (e.g. Beef, Rice, Spices)'
                    }
                    className="flex-1 bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-slate-200 outline-none focus:border-amber-500 text-xs"
                  />
                  <div className="relative w-28 sm:w-32 flex-shrink-0">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono">
                      ৳
                    </span>
                    <input
                      type="number"
                      required
                      min="1"
                      step="any"
                      value={item.amount}
                      onChange={(e) => handleUpdateItem(item.id, 'amount', e.target.value)}
                      placeholder="0"
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-6 pr-2.5 py-1.5 text-right text-emerald-400 font-mono font-bold outline-none focus:border-amber-500 text-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    title={isBangla ? 'মুছে ফেলুন' : 'Delete'}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Auto-Counted Total Banner */}
            <div className="flex flex-wrap items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-700/60 mt-2">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium">
                  {isBangla ? 'মোট বাজার খরচ:' : 'Total Feast Cost:'}
                </span>
                <span className="text-lg font-black text-amber-400 font-mono">
                  ৳{totalCost.toLocaleString('en-US')}
                </span>
              </div>
              <div className="text-[11px] text-slate-300 font-mono">
                {isBangla ? 'উপস্থিত:' : 'Attendees:'}{' '}
                <strong className="text-white">{attendeeIds.length} জন</strong> |{' '}
                {isBangla ? 'জনপ্রতি পড়বে:' : 'Per Person:'}{' '}
                <strong className="text-emerald-400 font-bold">
                  ৳{perPerson.toLocaleString('en-US')}
                </strong>
              </div>
            </div>
          </div>

          {/* Section 4: Attendees Selection with Search, Mess Manager, Select All */}
          <div className="space-y-3 bg-slate-950/60 p-3.5 sm:p-4 rounded-xl border border-slate-800/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="block text-slate-200 font-semibold flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-indigo-400" />
                  {isBangla ? 'উপস্থিত সদস্য বাছাই' : 'Select Participating Attendees'}
                  <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full text-[10px] font-mono ml-1">
                    {attendeeIds.length} / {eligibleMembers.length}{' '}
                    {isBangla ? 'জন নির্বাচিত' : 'Selected'}
                  </span>
                </label>
                <p className="text-[11px] text-slate-400">
                  {isBangla
                    ? 'মেস ম্যানেজার সহ সব সদস্য উপস্থিত থাকতে পারেন'
                    : 'Mess manager and all dining residents are included'}
                </p>
              </div>

              {/* Quick Select Buttons */}
              <div className="flex items-center gap-1.5 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-lg text-[10px] font-medium transition-colors"
                >
                  {isBangla ? 'সবাইকে নির্বাচন' : 'Select All'}
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-300 border border-slate-700 rounded-lg text-[10px] font-medium transition-colors"
                >
                  {isBangla ? 'সব বাতিল' : 'Deselect All'}
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchMember}
                onChange={(e) => setSearchMember(e.target.value)}
                placeholder={
                  isBangla
                    ? 'সদস্যের নাম বা ফোন নম্বর দিয়ে খুঁজুন...'
                    : 'Search member by name or phone...'
                }
                className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 text-xs outline-none focus:border-amber-500"
              />
              {searchMember && (
                <button
                  type="button"
                  onClick={() => setSearchMember('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  ×
                </button>
              )}
            </div>

            {/* Member Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 pr-1.5">
              {filteredMembers.length === 0 ? (
                <div className="col-span-2 text-center py-4 text-slate-500">
                  {isBangla ? 'কোনো সদস্য পাওয়া যায়নি' : 'No members found'}
                </div>
              ) : (
                filteredMembers.map((m) => {
                  const isChecked = attendeeIds.includes(m.userId);
                  const isManager = m.role === 'admin';
                  const name = m.displayName || m.name || (isBangla ? 'সদস্য' : 'Member');

                  return (
                    <div
                      key={m.userId}
                      onClick={() => toggleAttendee(m.userId)}
                      className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer border transition-all select-none ${
                        isChecked
                          ? isManager
                            ? 'bg-amber-500/15 border-amber-500/50 shadow-sm shadow-amber-500/10'
                            : 'bg-emerald-500/10 border-emerald-500/40 shadow-sm shadow-emerald-500/5'
                          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Member Avatar */}
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                            isManager
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : isChecked
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {name.substring(0, 1).toUpperCase()}
                        </div>

                        {/* Name & Role Badge */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`truncate font-semibold text-xs ${
                                isChecked ? 'text-white' : 'text-slate-300'
                              }`}
                            >
                              {name}
                            </span>
                            {isManager && (
                              <span className="flex-shrink-0 text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded font-bold">
                                {isBangla ? 'ম্যানেজার' : 'Manager'}
                              </span>
                            )}
                          </div>
                          {m.phone && (
                            <span className="text-[10px] text-slate-500 font-mono block">
                              {m.phone}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Custom Checkbox */}
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all flex-shrink-0 ${
                          isChecked
                            ? isManager
                              ? 'bg-amber-500 border-amber-400 text-slate-950 font-bold'
                              : 'bg-emerald-500 border-emerald-400 text-slate-950 font-bold'
                            : 'border-slate-700 bg-slate-950'
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 font-semibold transition-colors"
            >
              {isBangla ? 'বাতিল' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || totalCost <= 0 || attendeeIds.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>{isBangla ? 'সংরক্ষণ হচ্ছে...' : 'Saving...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {isBangla
                      ? `ভোজ নিশ্চিত করুন (মোট ৳${totalCost})`
                      : `Confirm Feast (৳${totalCost})`}
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
