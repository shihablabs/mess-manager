'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Utensils,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Plus,
  Shield,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Save,
  Check,
  UserCheck,
  RefreshCw,
} from 'lucide-react';
import { AppUser } from '@/lib/session';
import { toast } from 'sonner';

interface MealsTabProps {
  currentUser: AppUser;
  members: any[];
  cycle?: any;
  requests: any[];
  onRefresh: () => void;
  onOpenRequestModal: () => void;
}

interface MemberMealEntry {
  userId: string;
  morning: number;
  night: number;
}

export const MealsTab: React.FC<MealsTabProps> = ({
  currentUser,
  members = [],
  cycle,
  requests = [],
  onRefresh,
  onOpenRequestModal,
}) => {
  const [subTab, setSubTab] = useState<'sheet' | 'requests'>('sheet');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Date selection (default today YYYY-MM-DD)
  const getTodayStr = () => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  };

  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());
  const [dailyEntries, setDailyEntries] = useState<Record<string, { morning: number; night: number }>>({});
  const [isLoadingDateMeals, setIsLoadingDateMeals] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const canEditMeals = currentUser.role === 'admin' || currentUser.role === 'super_admin';

  // Navigate date
  const changeDateByDays = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  // Fetch meals for selected date
  const fetchDateMeals = useCallback(async (date: string) => {
    try {
      setIsLoadingDateMeals(true);
      const res = await fetch(`/api/meals?date=${date}`);
      const json = await res.json();

      const newEntries: Record<string, { morning: number; night: number }> = {};

      // Initialize with 1 morning, 1 night for all active members as default
      members.forEach((m) => {
        newEntries[m.userId] = { morning: 1, night: 1 };
      });

      // Override if records exist in DB for this date
      if (json.success && Array.isArray(json.meals) && json.meals.length > 0) {
        for (const m of json.meals) {
          if (!newEntries[m.userId]) {
            newEntries[m.userId] = { morning: 0, night: 0 };
          }
          const count = typeof m.consumed === 'number' ? m.consumed : (m.consumed ? 1 : 0);
          if (m.slotId === 'morning') {
            newEntries[m.userId].morning = count;
          } else if (m.slotId === 'night') {
            newEntries[m.userId].night = count;
          }
        }
      }

      setDailyEntries(newEntries);
    } catch (err) {
      console.error('Failed to fetch date meals:', err);
    } finally {
      setIsLoadingDateMeals(false);
    }
  }, [members]);

  useEffect(() => {
    if (members.length > 0) {
      fetchDateMeals(selectedDate);
    }
  }, [selectedDate, members, fetchDateMeals]);

  // Adjust count (0.5 step support for half meal)
  const updateCount = (userId: string, slot: 'morning' | 'night', delta: number) => {
    if (!canEditMeals) return;
    setDailyEntries((prev) => {
      const current = prev[userId] || { morning: 1, night: 1 };
      const currentVal = current[slot];
      const newVal = Math.max(0, Math.round((currentVal + delta) * 10) / 10);
      return {
        ...prev,
        [userId]: {
          ...current,
          [slot]: newVal,
        },
      };
    });
  };

  // Quick actions
  const handleSetAll = (val: number) => {
    if (!canEditMeals) return;
    const updated: Record<string, { morning: number; night: number }> = {};
    members.forEach((m) => {
      updated[m.userId] = { morning: val, night: val };
    });
    setDailyEntries(updated);
  };

  // Save to DB
  const handleSaveMeals = async () => {
    if (!canEditMeals) return;
    try {
      setIsSaving(true);
      const entriesPayload = Object.entries(dailyEntries).map(([userId, val]) => ({
        userId,
        morning: val.morning,
        night: val.night,
      }));

      const res = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          entries: entriesPayload,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSaveSuccessMsg(`${selectedDate} তারিখের মিল সংরক্ষিত হয়েছে!`);
        setTimeout(() => setSaveSuccessMsg(null), 3500);
        toast.success(`${selectedDate} তারিখের মিল হাজিরা সংরক্ষিত হয়েছে!`);
        onRefresh();
      } else {
        toast.error(data.error || 'সংরক্ষণ ব্যর্থ হয়েছে');
      }
    } catch (e: any) {
      toast.error(e.message || 'ত্রুটি ঘটেছে');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReview = async (id: string, status: 'approved' | 'rejected') => {
    try {
      setProcessingId(id);
      const res = await fetch('/api/meal-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          status,
          adminUserId: currentUser.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(status === 'approved' ? 'অনুরোধ অনুমোদিত হয়েছে' : 'অনুরোধ বাতিল করা হয়েছে');
        onRefresh();
        fetchDateMeals(selectedDate);
      } else {
        toast.error(data.error || 'ব্যর্থ হয়েছে');
      }
    } catch (e: any) {
      toast.error(e.message || 'ত্রুটি ঘটেছে');
    } finally {
      setProcessingId(null);
    }
  };

  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const pastRequests = requests.filter((r) => r.status !== 'pending');

  // Daily totals
  let totalMorningMeals = 0;
  let totalNightMeals = 0;
  Object.values(dailyEntries).forEach((e) => {
    totalMorningMeals += e.morning || 0;
    totalNightMeals += e.night || 0;
  });
  const totalMealUnits = totalMorningMeals * 0.5 + totalNightMeals * 1.0;

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Action */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Utensils className="w-5 h-5 text-indigo-400" />
            মিল খাতা ও দৈনিক ব্যবস্থাপনা
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            সকালের মিল ডেডলাইন: আগের রাত ১০:০০ টা | রাতের মিল ডেডলাইন: বিকাল ৪:০০ টা
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={onOpenRequestModal}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-500/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            মিল অফ/অন রিকোয়েস্ট
          </button>
        </div>
      </div>

      {/* Sub-tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setSubTab('sheet')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            subTab === 'sheet'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Calendar className="w-4 h-4" />
          দৈনিক মিল হাজিরা শিট
        </button>

        <button
          onClick={() => setSubTab('requests')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all relative ${
            subTab === 'requests'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Clock className="w-4 h-4" />
          মিল অনুরোধ ও অনুমোদন
          {pendingRequests.length > 0 && (
            <span className="ml-1 px-1.5 py-0.2 text-[10px] bg-amber-500 text-slate-950 font-black rounded-full animate-pulse">
              {pendingRequests.length}
            </span>
          )}
        </button>
      </div>

      {/* SUB-TAB 1: DAILY MEAL ATTENDANCE SHEET */}
      {subTab === 'sheet' && (
        <div className="space-y-5">
          {/* Date Selector & KPI Strip */}
          <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-slate-800 space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              {/* Date Navigation */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => changeDateByDays(-1)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  title="আগের দিন"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="relative flex-1 sm:flex-none">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full sm:w-auto bg-slate-900 border border-slate-700 hover:border-slate-600 text-white font-mono text-xs font-semibold px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  onClick={() => changeDateByDays(1)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  title="পরের দিন"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setSelectedDate(getTodayStr())}
                  className="text-xs px-2.5 py-2 rounded-xl bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 font-medium transition-all"
                >
                  আজ
                </button>
              </div>

              {/* Quick Fill Actions (Manager only) */}
              {canEditMeals && (
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    onClick={() => handleSetAll(1)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors cursor-pointer"
                  >
                    সবার মিল ১
                  </button>
                  <button
                    onClick={() => handleSetAll(0.5)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30 font-medium transition-colors cursor-pointer"
                  >
                    সবার হাফ (০.৫)
                  </button>
                  <button
                    onClick={() => handleSetAll(0)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors cursor-pointer"
                  >
                    সবার মিল ০
                  </button>
                  <button
                    onClick={handleSaveMeals}
                    disabled={isSaving}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg shadow-emerald-600/20 transition-all"
                  >
                    {isSaving ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    {isSaving ? 'সংরক্ষণ হচ্ছে...' : 'ডাটাবেজে সেভ করুন'}
                  </button>
                </div>
              )}
            </div>

            {saveSuccessMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                {saveSuccessMsg}
              </div>
            )}

            {/* Daily Summary Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[11px] text-slate-400">সকালের মিল (০.৫)</span>
                <p className="text-base font-bold text-white mt-0.5">{totalMorningMeals} টি</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[11px] text-slate-400">রাতের মিল (১.০)</span>
                <p className="text-base font-bold text-white mt-0.5">{totalNightMeals} টি</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[11px] text-indigo-400">মোট মিল ইউনিট</span>
                <p className="text-base font-bold text-indigo-300 mt-0.5 font-mono">{totalMealUnits.toFixed(1)}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[11px] text-slate-400">সদস্য সংখ্যা</span>
                <p className="text-base font-bold text-white mt-0.5">{members.length} জন</p>
              </div>
            </div>
          </div>

          {/* Members Meal Grid */}
          <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                সদস্যদের মিল হাজিরা ({members.length})
              </h4>
              {!canEditMeals && (
                <span className="text-[11px] text-slate-400">
                  (শুধুমাত্র এডমিন/ম্যানেজার মিল পরিবর্তন করতে পারেন)
                </span>
              )}
            </div>

            {members.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                কোনো সদস্য পাওয়া যায়নি।
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {members.map((member) => {
                  const entry = dailyEntries[member.userId] || { morning: 1, night: 1 };
                  const memberUnits = entry.morning * 0.5 + entry.night * 1.0;

                  // Check if this member has a request on this date
                  const reqOnDate = requests.find(
                    (r) => r.userId === member.userId && r.date === selectedDate
                  );

                  return (
                    <div
                      key={member.userId}
                      className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition-all space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                            {member.image ? (
                              <img src={member.image} alt={member.name} className="w-full h-full object-cover" />
                            ) : (
                              member.name.charAt(0)
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-bold text-slate-200">{member.name}</span>
                              {member.role === 'super_admin' && (
                                <span className="text-[9px] bg-rose-500/20 text-rose-300 font-bold px-1.5 py-0.2 rounded border border-rose-500/30">
                                  সুপার এডমিন
                                </span>
                              )}
                              {member.role === 'admin' && (
                                <span className="text-[9px] bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.2 rounded border border-amber-500/30">
                                  ম্যানেজার
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500 font-mono">
                              মোট ইউনিট: {memberUnits.toFixed(1)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {canEditMeals && (
                            <button
                              onClick={() => {
                                const isOff = entry.morning === 0 && entry.night === 0;
                                setDailyEntries((prev) => ({
                                  ...prev,
                                  [member.userId]: isOff ? { morning: 1, night: 1 } : { morning: 0, night: 0 },
                                }));
                              }}
                              className={`text-[10px] px-2 py-0.5 rounded font-semibold transition-all cursor-pointer ${
                                entry.morning === 0 && entry.night === 0
                                  ? 'bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30'
                              }`}
                            >
                              {entry.morning === 0 && entry.night === 0 ? 'মিল চালু (১)' : 'আজকের মিল অফ'}
                            </button>
                          )}

                          {reqOnDate && (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                reqOnDate.status === 'approved'
                                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                              }`}
                            >
                              রিকোয়েস্ট: {reqOnDate.slotName} {reqOnDate.action === 'off' ? 'অফ' : 'অন'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Counters */}
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/60">
                        {/* Morning */}
                        <div className="flex items-center justify-between bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
                          <div>
                            <span className="text-[11px] font-semibold text-slate-400">সকাল</span>
                            <span className="text-[10px] text-slate-500 block">(০.৫)</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {canEditMeals && (
                              <button
                                onClick={() => updateCount(member.userId, 'morning', -0.5)}
                                className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center transition-colors cursor-pointer"
                                title="০.৫ কমান"
                              >
                                -
                              </button>
                            )}
                            <span className="w-10 text-center text-sm font-bold font-mono text-white">
                              {entry.morning}
                            </span>
                            {canEditMeals && (
                              <button
                                onClick={() => updateCount(member.userId, 'morning', 0.5)}
                                className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center transition-colors cursor-pointer"
                                title="০.৫ বাড়ান"
                              >
                                +
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Night */}
                        <div className="flex items-center justify-between bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
                          <div>
                            <span className="text-[11px] font-semibold text-slate-400">রাত</span>
                            <span className="text-[10px] text-slate-500 block">(১.০)</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {canEditMeals && (
                              <button
                                onClick={() => updateCount(member.userId, 'night', -0.5)}
                                className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center transition-colors cursor-pointer"
                                title="০.৫ কমান"
                              >
                                -
                              </button>
                            )}
                            <span className="w-10 text-center text-sm font-bold font-mono text-white">
                              {entry.night}
                            </span>
                            {canEditMeals && (
                              <button
                                onClick={() => updateCount(member.userId, 'night', 0.5)}
                                className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center transition-colors cursor-pointer"
                                title="০.৫ বাড়ান"
                              >
                                +
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: MEAL REQUESTS & APPROVALS */}
      {subTab === 'requests' && (
        <div className="space-y-6">
          {/* Pending Requests */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                অপেক্ষমান মিল অনুরোধ ({pendingRequests.length})
              </h4>
              {canEditMeals && (
                <span className="text-[11px] bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Shield className="w-3 h-3" /> এডমিন / ম্যানেজার সিদ্ধান্ত দিন
                </span>
              )}
            </div>

            {pendingRequests.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                বর্তমানে কোনো অপেক্ষমান মিল অনুরোধ নেই।
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((req) => (
                  <div
                    key={req._id}
                    className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-200 text-sm">
                          {req.userName}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            req.action === 'off'
                              ? 'bg-rose-500/20 text-rose-300'
                              : 'bg-emerald-500/20 text-emerald-300'
                          }`}
                        >
                          {req.action === 'off' ? 'মিল অফ (Off)' : 'মিল চালু (On)'}
                        </span>
                        {req.isLate && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Late রিকোয়েস্ট
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">
                        {req.startDate && req.endDate && req.startDate !== req.endDate ? (
                          <span>
                            মেয়াদ: <strong className="text-slate-300">{req.startDate}</strong> থেকে{' '}
                            <strong className="text-slate-300">{req.endDate}</strong>
                          </span>
                        ) : (
                          <span>
                            তারিখ: <strong className="text-slate-300">{req.date}</strong>
                          </span>
                        )}{' '}
                        | স্লট: <strong className="text-slate-300">{req.slotName}</strong>
                        {req.reason && <span> — &quot;{req.reason}&quot;</span>}
                      </p>
                    </div>

                    {canEditMeals ? (
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          onClick={() => handleReview(req._id, 'approved')}
                          disabled={processingId === req._id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition-all"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          অনুমোদন
                        </button>
                        <button
                          onClick={() => handleReview(req._id, 'rejected')}
                          disabled={processingId === req._id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-500 text-white text-xs font-semibold shadow transition-all"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          বাতিল
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                        Admin অনুমোদনের অপেক্ষায়
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Past Requests History */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-3">
            <h4 className="text-sm font-bold text-white">অনুরোধের ইতিহাস ({pastRequests.length})</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                    <th className="py-2">সদস্য</th>
                    <th className="py-2">তারিখ</th>
                    <th className="py-2">স্লট</th>
                    <th className="py-2">অনুরোধ</th>
                    <th className="py-2 text-right">অবস্থা</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {pastRequests.map((r) => (
                    <tr key={r._id} className="text-slate-300">
                      <td className="py-2.5">{r.userName}</td>
                      <td className="py-2.5 font-mono">{r.date}</td>
                      <td className="py-2.5">{r.slotName}</td>
                      <td className="py-2.5">{r.action === 'off' ? 'অফ' : 'অন'}</td>
                      <td className="py-2.5 text-right">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            r.status === 'approved'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {r.status === 'approved' ? 'অনুমোদিত' : 'বাতিল'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
