'use client';

import React, { useState } from 'react';
import { useDashboard } from '@/context/DashboardContext';
import { GlobalLoader } from '@/components/GlobalLoader';
import { MasterErrorBoundary } from '@/components/MasterErrorBoundary';
import {
  Settings,
  Shield,
  Crown,
  ShoppingBag,
  Bell,
  Save,
  CheckCircle,
  Clock,
  Sparkles,
  Smartphone,
  CreditCard,
  Download,
  Upload,
  User,
  Info,
  Layers,
  Plus,
  Trash2,
} from '@/components/icons';
import { formatTaka } from '@/lib/money';
import { toast } from 'sonner';

function SettingsContent() {
  const { currentUser, summaryData, cycles, currentCycleId, refreshData, isLoading } = useDashboard();
  const cycle = summaryData?.cycle || cycles?.find((c: any) => c._id === currentCycleId) || cycles?.[0];

  // Super Admin Big Bazar Settings state
  const [isBigBazarEnabled, setIsBigBazarEnabled] = useState<boolean>(
    cycle?.isBigBazarEnabled ?? true
  );
  const [bigBazarContribution, setBigBazarContribution] = useState<string>(
    String(cycle?.bigBazarContributionPerMember ?? 1400)
  );
  const [isSavingBigBazar, setIsSavingBigBazar] = useState(false);

  // Meal Slots settings state (Task 9)
  const defaultSlots = [
    { id: 'morning', name: 'সকাল', weight: 0.5, cutoffTime: '22:00' },
    { id: 'night', name: 'রাত', weight: 1.0, cutoffTime: '16:00' },
  ];
  const [mealSlots, setMealSlots] = useState<any[]>(() => {
    return summaryData?.mess?.mealSlots?.length ? summaryData.mess.mealSlots : defaultSlots;
  });
  const [isSavingMealSlots, setIsSavingMealSlots] = useState(false);

  React.useEffect(() => {
    if (summaryData?.mess?.mealSlots?.length) {
      setMealSlots(summaryData.mess.mealSlots);
    }
  }, [summaryData?.mess?.mealSlots]);

  // Member notification preference state
  const [mealReminderMorning, setMealReminderMorning] = useState(true);
  const [mealReminderNight, setMealReminderNight] = useState(true);
  const [bazarReminder, setBazarReminder] = useState(true);

  if (isLoading || !currentUser) {
    return <GlobalLoader message="সেটিংস লোড হচ্ছে..." />;
  }

  const isSuperAdmin = currentUser.role === 'super_admin';
  const isManagerOrAdmin = currentUser.role === 'super_admin' || currentUser.role === 'admin';

  const handleSlotChange = (index: number, field: string, value: any) => {
    setMealSlots((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleAddSlot = () => {
    const nextId = `slot_${mealSlots.length + 1}`;
    setMealSlots((prev) => [
      ...prev,
      { id: nextId, name: 'নতুন মিল', weight: 1.0, cutoffTime: '12:00' },
    ]);
  };

  const handleRemoveSlot = (index: number) => {
    if (mealSlots.length <= 1) {
      toast.error('কমপক্ষে একটি মিল স্লট থাকতে হবে');
      return;
    }
    setMealSlots((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveMealSlots = async () => {
    try {
      setIsSavingMealSlots(true);
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_meal_slots',
          mealSlots,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'মিল স্লট সফলভাবে সংরক্ষিত হয়েছে!');
        refreshData();
      } else {
        toast.error(data.error || 'সংরক্ষণ ব্যর্থ হয়েছে');
      }
    } catch (e: any) {
      toast.error('নেটওয়ার্ক ত্রুটি ঘটেছে');
    } finally {
      setIsSavingMealSlots(false);
    }
  };

  // Save Big Bazar Settings (Super Admin only)
  const handleSaveBigBazarSettings = async () => {
    if (!isSuperAdmin) return;
    try {
      setIsSavingBigBazar(true);
      const res = await fetch('/api/cycles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cycleId: cycle?._id,
          isBigBazarEnabled,
          bigBazarContributionPerMember: Number(bigBazarContribution),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('বড় বাজার ও মেস সেটিংস সফলভাবে আপডেট করা হয়েছে!');
        refreshData();
      } else {
        toast.error(data.error || 'সেটিংস আপডেট ব্যর্থ হয়েছে');
      }
    } catch (e: any) {
      toast.error('নেটওয়ার্ক ত্রুটি ঘটেছে');
    } finally {
      setIsSavingBigBazar(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-400" />
            {isSuperAdmin ? 'সুপার অ্যাডমিন ও মেস সেটিংস' : 'অ্যাকাউন্ট ও ব্যক্তিগত সেটিংস'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {isSuperAdmin
              ? 'বড় বাজার পলিসি, মেস রুলস ও অ্যাডভান্স কনফিগারেশন নিয়ন্ত্রণ করুন।'
              : 'আপনার প্রোফাইল তথ্য, মিল নোটিফিকেশন ও পছন্দসমূহ পরিচালনা করুন।'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isSuperAdmin ? (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              সুপার অ্যাডমিন এক্সেস
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-400" />
              সদস্য মোড
            </span>
          )}
        </div>
      </div>

      {/* SUPER ADMIN SETTINGS */}
      {isSuperAdmin && (
        <div className="space-y-5">
          {/* Section 1: Big Bazar Control */}
          <div className="glass-panel rounded-2xl p-5 border border-purple-500/30 bg-purple-950/10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-purple-900/40">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">বড় বাজার পলিসি কনফিগারেশন</h3>
                  <p className="text-xs text-slate-400">
                    ১০-১৫ তারিখের চাল, তেল ও মাসিক বড় বাজার ফিচার নিয়ন্ত্রণ (শুধুমাত্র সুপার অ্যাডমিন)
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {/* Enable / Disable Switch */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <div>
                  <span className="text-xs font-bold text-white block">বড় বাজার ফান্ড সিস্টেম স্ট্যাটাস</span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    বন্ধ থাকলে মেসের কোনো বড় বাজার চাঁদা ধার্য হবে না এবং সমস্ত বাজার সরাসরি রেগুলার মিল পুলে যাবে।
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBigBazarEnabled(!isBigBazarEnabled)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out ${
                    isBigBazarEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                      isBigBazarEnabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Per-member Contribution Input */}
              {isBigBazarEnabled && (
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <label className="block text-xs font-semibold text-slate-300">
                    সদস্য প্রতি বড় বাজার চাঁদার পরিমাণ (টাকা)
                  </label>
                  <p className="text-[11px] text-slate-400">
                    প্রতিটি সক্রিয় সদস্যের নিকট থেকে বড় বাজারের জন্য এই পরিমাণ টাকা সংগ্রহ করা হবে।
                  </p>
                  <div className="flex items-center gap-3 pt-1">
                    <div className="relative w-48">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">৳</span>
                      <input
                        type="number"
                        min="0"
                        value={bigBazarContribution}
                        onChange={(e) => setBigBazarContribution(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-750 rounded-xl text-xs text-white font-mono font-bold outline-none focus:border-purple-500"
                      />
                    </div>
                    <span className="text-xs text-slate-400">টাকা / সদস্য</span>
                  </div>
                </div>
              )}

              {/* Save Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleSaveBigBazarSettings}
                  disabled={isSavingBigBazar}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-600/30 flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isSavingBigBazar ? 'সংরক্ষণ হচ্ছে...' : 'বড় বাজার পলিসি সংরক্ষণ করুন'}
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: Backup & 6-Month Archive Hub */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800">
              <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">মেস ডাটাবেজ ব্যাকআপ ও আর্কাইভ হাব</h3>
                <p className="text-xs text-slate-400">৬ মাসের হিসাবের সম্পূর্ণ তথ্য JSON আকারে ডাউনলোড বা ব্যাকআপ রাখুন</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <div>
                <span className="text-xs font-bold text-slate-200 block">বর্তমান চক্রের পূর্ণাঙ্গ ব্যাকআপ (JSON)</span>
                <span className="text-[11px] text-slate-400 block">মিল, বাজার, ইউটিলিটি, ডিপোজিট ও সদস্য তালিকা এক ফাইলে এক্সপোর্ট হবে।</span>
              </div>
              <a
                href="/api/backup"
                download={`mess_backup_${cycle?.name || 'cycle'}.json`}
                className="px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
              >
                <Download className="w-4 h-4" />
                ব্যাকআপ ডাউনলোড করুন
              </a>
            </div>
          </div>
        </div>
      )}

      {/* SECTION: MEAL SLOTS CONFIGURATION (Task 9 & SRS 4.5) */}
      <div className="glass-panel rounded-2xl p-5 border border-indigo-500/30 bg-slate-900/60 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">মিল স্লট কনফিগারেশন (নাম, ওজন ও বন্ধের সময়)</h3>
              <p className="text-xs text-slate-400">
                মিল স্লটের নাম, মিল গণনা ওজন (Weight) ও মিল অন/অফের ডেডলাইন (Cutoff Time)
              </p>
            </div>
          </div>
          {isManagerOrAdmin && (
            <button
              type="button"
              onClick={handleAddSlot}
              className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              নতুন স্লট যোগ করুন
            </button>
          )}
        </div>

        {/* Meal Slots Table / Card Grid */}
        <div className="space-y-3">
          <div className="hidden md:grid grid-cols-12 gap-3 px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-950/60 rounded-xl border border-slate-800">
            <div className="col-span-3">স্লট আইডি / কোড</div>
            <div className="col-span-3">স্লটের নাম</div>
            <div className="col-span-2">মিল ওজন (Weight)</div>
            <div className="col-span-3">বন্ধের সময় (Cutoff)</div>
            <div className="col-span-1 text-center">একশন</div>
          </div>

          {mealSlots.map((slot: any, index: number) => (
            <div
              key={slot.id || index}
              className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col md:grid md:grid-cols-12 gap-3 items-center"
            >
              <div className="w-full md:col-span-3 flex items-center justify-between md:justify-start gap-2">
                <span className="text-[11px] text-slate-400 md:hidden">আইডি:</span>
                <input
                  type="text"
                  disabled={!isManagerOrAdmin || slot.id === 'morning' || slot.id === 'night'}
                  value={slot.id}
                  onChange={(e) => handleSlotChange(index, 'id', e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-300 font-mono w-full md:w-32 disabled:opacity-75 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="w-full md:col-span-3 flex items-center justify-between md:justify-start gap-2">
                <span className="text-[11px] text-slate-400 md:hidden">নাম:</span>
                <input
                  type="text"
                  disabled={!isManagerOrAdmin}
                  value={slot.name}
                  onChange={(e) => handleSlotChange(index, 'name', e.target.value)}
                  placeholder="যেমন: সকাল, রাত"
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-medium w-full focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="w-full md:col-span-2 flex items-center justify-between md:justify-start gap-2">
                <span className="text-[11px] text-slate-400 md:hidden">ওজন:</span>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="5"
                  disabled={!isManagerOrAdmin}
                  value={slot.weight}
                  onChange={(e) => handleSlotChange(index, 'weight', parseFloat(e.target.value) || 0)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-amber-300 font-mono font-bold w-full md:w-24 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="w-full md:col-span-3 flex items-center justify-between md:justify-start gap-2">
                <span className="text-[11px] text-slate-400 md:hidden">বন্ধের সময়:</span>
                <div className="relative w-full">
                  <input
                    type="time"
                    disabled={!isManagerOrAdmin}
                    value={slot.cutoffTime || '16:00'}
                    onChange={(e) => handleSlotChange(index, 'cutoffTime', e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-emerald-300 font-mono font-bold w-full focus:outline-none focus:border-indigo-500 cursor-pointer"
                  />
                </div>
              </div>

              <div className="w-full md:col-span-1 flex justify-end md:justify-center">
                {isManagerOrAdmin && mealSlots.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveSlot(index)}
                    className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all cursor-pointer"
                    title="স্লট মুছুন"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Helpful instructions for deadlines */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
          <p className="flex items-center gap-1.5 font-medium text-slate-300">
            <Info className="w-3.5 h-3.5 text-indigo-400" />
            মিল বন্ধের সময় (Cutoff Time) সহায়িকা:
          </p>
          <p className="pl-5 text-slate-400">
            • <strong className="text-slate-300">সকালের মিল:</strong> ডেডলাইন আগের রাতের জন্য প্রযোজ্য (যেমন রাত ১০:০০ / ২২:০০)।
          </p>
          <p className="pl-5 text-slate-400">
            • <strong className="text-slate-300">দুপুর ও রাতের মিল:</strong> ডেডলাইন ওই দিনের নির্দিষ্ট সময়ের পূর্বে প্রযোজ্য (যেমন দুপুর ০৯:০০ ও বিকাল ১৬:০০)।
          </p>
          <p className="pl-5 text-slate-400">
            • সদস্য মিল রিকোয়েস্ট পাঠালে এই ডেডলাইনের পর স্বয়ংক্রিয়ভাবে বিলম্বিত (Late) হিসেবে চিহ্নিত হবে।
          </p>
        </div>

        {/* Save button */}
        {isManagerOrAdmin && (
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSaveMealSlots}
              disabled={isSavingMealSlots}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSavingMealSlots ? 'সংরক্ষণ হচ্ছে...' : 'মিল স্লট কনফিগারেশন সংরক্ষণ করুন'}
            </button>
          </div>
        )}
      </div>

      {/* MEMBER & GENERAL SETTINGS */}
      <div className="space-y-5">
        {/* Profile Card */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
            <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">ব্যক্তিগত প্রোফাইল তথ্য</h3>
              <p className="text-xs text-slate-400">আপনার মেস অ্যাকাউন্ট ও লগইন সংক্রান্ত বিবরণ</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400 block text-[11px]">নাম:</span>
              <strong className="text-white block mt-0.5">{currentUser.name}</strong>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400 block text-[11px]">ইমেইল:</span>
              <strong className="text-white block mt-0.5">{currentUser.email || '—'}</strong>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400 block text-[11px]">পদবী / ভূমিকা:</span>
              <strong className="text-amber-400 block mt-0.5 uppercase">
                {currentUser.role === 'super_admin' ? 'সুপার অ্যাডমিন' : currentUser.role === 'admin' ? 'মেস ম্যানেজার' : 'বর্ডার সদস্য'}
              </strong>
            </div>
          </div>
        </div>

        {/* Meal Notification Reminders */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">খাবার ও নোটিফিকেশন পছন্দসমূহ</h3>
              <p className="text-xs text-slate-400">মিল এন্ট্রি ও বাজার শিডিউল সম্পর্কিত অনুস্মারক</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div>
                <span className="text-xs font-semibold text-white block">সকালের মিল অন/অফ রিমাইন্ডার</span>
                <span className="text-[11px] text-slate-400">প্রতিদিন রাত ১০টার আগে সকালের মিলের নোটিফিকেশন</span>
              </div>
              <input
                type="checkbox"
                checked={mealReminderMorning}
                onChange={(e) => {
                  setMealReminderMorning(e.target.checked);
                  toast.success('নোটিফিকেশন পছন্দ সংরক্ষিত হয়েছে');
                }}
                className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div>
                <span className="text-xs font-semibold text-white block">রাতের মিল অন/অফ রিমাইন্ডার</span>
                <span className="text-[11px] text-slate-400">দুপুর ১২টার আগে রাতের মিল নির্ধারণের নোটিফিকেশন</span>
              </div>
              <input
                type="checkbox"
                checked={mealReminderNight}
                onChange={(e) => {
                  setMealReminderNight(e.target.checked);
                  toast.success('নোটিফিকেশন পছন্দ সংরক্ষিত হয়েছে');
                }}
                className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div>
                <span className="text-xs font-semibold text-white block">বাজার রোস্টার ডিউটি অ্যালার্ট</span>
                <span className="text-[11px] text-slate-400">আপনার নির্ধারিত বাজারের দিনের ১ দিন আগে সতর্কবার্তা</span>
              </div>
              <input
                type="checkbox"
                checked={bazarReminder}
                onChange={(e) => {
                  setBazarReminder(e.target.checked);
                  toast.success('নোটিফিকেশন পছন্দ সংরক্ষিত হয়েছে');
                }}
                className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Upcoming Features Preview */}
        <div className="glass-panel rounded-2xl p-5 border border-indigo-500/20 bg-indigo-950/10 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-indigo-300 flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              পরবর্তী ভার্সনে আসন্ন ফিচারসমূহ (Upcoming V1.1)
            </h4>
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">
              কাজ চলছে
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-2.5">
              <Smartphone className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-200 block">এসএমএস গেটওয়ে অ্যালার্ট</strong>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  মিল বন্ধের সময় পার হওয়ার পূর্বে সরাসরি মোবাইলে বাংলা এসএমএস অ্যালার্ট পাঠানো।
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-2.5">
              <CreditCard className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-200 block">বিকাশ / নগদ অটো রিকনসিলিয়েশন</strong>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  মেসের কিউআর কোড বা মার্চেন্ট পেমেন্টে ট্রানজেকশন আইডি দিয়ে স্বয়ংক্রিয় জমা ক্রেডিট।
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <MasterErrorBoundary>
      <SettingsContent />
    </MasterErrorBoundary>
  );
}
