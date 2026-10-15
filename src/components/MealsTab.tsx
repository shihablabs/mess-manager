'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Search,
  Filter,
  ArrowUpDown,
  Download,
  Sun,
  Moon,
  Coffee,
  Table,
  FileText,
  User,
  Zap,
  Edit2,
  Trash2,
  X,
} from '@/components/icons';
import { AppUser } from '@/lib/session';
import { formatTaka, formatMealUnits } from '@/lib/money';
import { toast } from 'sonner';
import { confirmAction } from '@/lib/alerts';

interface MealsTabProps {
  currentUser: AppUser;
  members: any[];
  cycle?: any;
  calculation?: any;
  requests: any[];
  onRefresh: () => void;
  onOpenRequestModal: () => void;
}

export const MealsTab: React.FC<MealsTabProps> = ({
  currentUser,
  members = [],
  cycle,
  calculation,
  requests = [],
  onRefresh,
  onOpenRequestModal,
}) => {
  // Sub-tabs: register (মাসিক পূর্ণাঙ্গ মাস্টার খাতা), sheet (দৈনিক ইনপুট), logs (তারিখভিত্তিক লগ), requests (অনুরোধ)
  const [subTab, setSubTab] = useState<'register' | 'sheet' | 'logs' | 'requests'>('register');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Today string YYYY-MM-DD
  const getTodayStr = () => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  };

  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());
  const [dailyEntries, setDailyEntries] = useState<Record<string, { morning: number; lunch: number; night: number }>>({});
  const [isLoadingDateMeals, setIsLoadingDateMeals] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Full Month Meals State
  const [allCycleMeals, setAllCycleMeals] = useState<any[]>([]);
  const [isLoadingAllMeals, setIsLoadingAllMeals] = useState<boolean>(false);

  // DataTable filter states for Monthly Master Register
  const [registerSearchQuery, setRegisterSearchQuery] = useState('');
  const [registerSortKey, setRegisterSortKey] = useState<'totalUnits' | 'name' | 'morningTotal' | 'lunchTotal' | 'nightTotal' | 'estimatedCost'>('totalUnits');
  const [registerSortAsc, setRegisterSortAsc] = useState(false);

  // DataTable filter states for Daily Logs
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [logDateFilter, setLogDateFilter] = useState('');
  const [logUserFilter, setLogUserFilter] = useState('');

  const canEditMeals = currentUser.role === 'admin' || currentUser.role === 'super_admin';
  const liveMealRate = calculation?.mealRate || 0;

  // Quick Edit Modal state for Daily Logs
  const [editingLogItem, setEditingLogItem] = useState<{
    date: string;
    userId: string;
    name: string;
    morning: number;
    lunch: number;
    night: number;
  } | null>(null);
  const [isSavingLogEdit, setIsSavingLogEdit] = useState(false);

  const handleSaveLogEdit = async () => {
    if (!editingLogItem) return;
    try {
      setIsSavingLogEdit(true);
      const res = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: editingLogItem.date,
          cycleId: cycle?._id || 'cycle_1',
          entries: [
            {
              userId: editingLogItem.userId,
              morning: editingLogItem.morning,
              lunch: editingLogItem.lunch,
              night: editingLogItem.night,
            },
          ],
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${editingLogItem.date} তারিখের মিল সফলভাবে সংশোধন করা হয়েছে!`);
        setEditingLogItem(null);
        await fetchAllCycleMeals();
        onRefresh();
      } else {
        toast.error(data.error || 'মিল সংশোধন ব্যর্থ হয়েছে');
      }
    } catch (e: any) {
      toast.error('নেটওয়ার্ক ত্রুটি');
    } finally {
      setIsSavingLogEdit(false);
    }
  };

  const handleDeleteMealLog = async (date: string, userId: string, memberName: string) => {
    const isConfirmed = await confirmAction({
      title: 'মিল রেকর্ড বাতিলকরণ',
      text: `আপনি কি নিশ্চিত যে ${memberName}-এর ${date} তারিখের মিল ০/বাতিল করতে চান?`,
      confirmText: 'হ্যাঁ, বাতিল করুন',
      confirmColor: '#e11d48',
      icon: 'warning',
    });
    if (!isConfirmed) return;
    try {
      const res = await fetch(`/api/meals?date=${date}&userId=${userId}&cycleId=${cycle?._id || 'cycle_1'}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${memberName} এর ${date} তারিখের মিল ০/বাতিল করা হয়েছে!`);
        await fetchAllCycleMeals();
        onRefresh();
      } else {
        toast.error(data.error || 'মুছে ফেলতে ব্যর্থ হয়েছে');
      }
    } catch (e: any) {
      toast.error('নেটওয়ার্ক ত্রুটি');
    }
  };

  // 1. Fetch All Meals for the Cycle (Full month)
  const fetchAllCycleMeals = useCallback(async () => {
    try {
      setIsLoadingAllMeals(true);
      const res = await fetch(`/api/meals?cycleId=${cycle?._id || 'cycle_1'}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.meals)) {
        setAllCycleMeals(json.meals);
      }
    } catch (err) {
      console.error('Failed to fetch all cycle meals:', err);
    } finally {
      setIsLoadingAllMeals(false);
    }
  }, [cycle?._id]);

  useEffect(() => {
    fetchAllCycleMeals();
  }, [fetchAllCycleMeals]);

  // Navigate date
  const changeDateByDays = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  // 2. Fetch meals for selected single date (Daily input editor)
  const fetchDateMeals = useCallback(async (date: string) => {
    try {
      setIsLoadingDateMeals(true);
      const res = await fetch(`/api/meals?date=${date}&cycleId=${cycle?._id || 'cycle_1'}`);
      const json = await res.json();

      const newEntries: Record<string, { morning: number; lunch: number; night: number }> = {};
      const diningMembers = members.filter((m) => m.role !== 'super_admin');

      // Initialize with 0 morning, 1 lunch, 1 night for all active members as default
      diningMembers.forEach((m) => {
        newEntries[m.userId || m._id] = { morning: 0, lunch: 1, night: 1 };
      });

      // Override if records exist in DB for this date
      if (json.success && Array.isArray(json.meals) && json.meals.length > 0) {
        for (const m of json.meals) {
          if (!newEntries[m.userId]) {
            newEntries[m.userId] = { morning: 0, lunch: 0, night: 0 };
          }
          const count = typeof m.consumed === 'number' ? m.consumed : (m.consumed ? 1 : 0);
          if (m.slotId === 'morning') {
            newEntries[m.userId].morning = count;
          } else if (m.slotId === 'lunch') {
            newEntries[m.userId].lunch = count;
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
  }, [members, cycle?._id]);

  useEffect(() => {
    if (members.length > 0) {
      fetchDateMeals(selectedDate);
    }
  }, [selectedDate, members, fetchDateMeals]);

  // Adjust count (0.5 step support for half meal)
  const updateCount = (userId: string, slot: 'morning' | 'lunch' | 'night', delta: number) => {
    if (!canEditMeals) return;
    setDailyEntries((prev) => {
      const current = prev[userId] || { morning: 0, lunch: 1, night: 1 };
      const currentVal = current[slot] ?? 0;
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
    const updated: Record<string, { morning: number; lunch: number; night: number }> = {};
    const diningMembers = members.filter((m) => m.role !== 'super_admin');
    diningMembers.forEach((m) => {
      const uid = m.userId || m._id;
      updated[uid] = { morning: val, lunch: val, night: val };
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
        lunch: val.lunch,
        night: val.night,
      }));

      const res = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cycleId: cycle?._id || 'cycle_1',
          date: selectedDate,
          entries: entriesPayload,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSaveSuccessMsg(`${selectedDate} তারিখের মিল সংরক্ষিত হয়েছে!`);
        setTimeout(() => setSaveSuccessMsg(null), 3500);
        toast.success(`${selectedDate} তারিখের মিল হাজিরা ডাটাবেজে সংরক্ষিত হয়েছে!`);
        fetchAllCycleMeals();
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
        fetchAllCycleMeals();
      } else {
        toast.error(data.error || 'ব্যর্থ হয়েছে');
      }
    } catch (e: any) {
      toast.error(e.message || 'ত্রুটি ঘটেছে');
    } finally {
      setProcessingId(null);
    }
  };

  // 3. Compute Per-Member Full Month Stats
  const memberMonthlyStats = useMemo(() => {
    const diningMembers = members.filter((m) => m.role !== 'super_admin');

    return diningMembers.map((m) => {
      const uId = m.userId || m._id;
      const userRecords = allCycleMeals.filter((r) => r.userId === uId);

      let morningTotal = 0;
      let lunchTotal = 0;
      let nightTotal = 0;
      const attendedDates = new Set<string>();

      for (const rec of userRecords) {
        const count = typeof rec.consumed === 'number' ? rec.consumed : (rec.consumed ? 1 : 0);
        if (rec.slotId === 'morning') {
          morningTotal += count;
          if (count > 0) attendedDates.add(rec.date);
        } else if (rec.slotId === 'lunch') {
          lunchTotal += count;
          if (count > 0) attendedDates.add(rec.date);
        } else if (rec.slotId === 'night') {
          nightTotal += count;
          if (count > 0) attendedDates.add(rec.date);
        }
      }

      const totalUnits = morningTotal + lunchTotal + nightTotal;
      const estimatedCost = Math.round(totalUnits * liveMealRate);

      return {
        userId: uId,
        name: m.name,
        email: m.email,
        image: m.image || `https://api.dicebear.com/7.x/bottts/svg?seed=${uId}`,
        role: m.role,
        isActive: m.isActive ?? true,
        morningTotal,
        lunchTotal,
        nightTotal,
        totalUnits,
        estimatedCost,
        attendedDaysCount: attendedDates.size,
      };
    });
  }, [members, allCycleMeals, liveMealRate]);

  // Master Register Filtered & Sorted List
  const filteredRegister = useMemo(() => {
    let list = [...memberMonthlyStats];
    if (registerSearchQuery.trim()) {
      const q = registerSearchQuery.toLowerCase().trim();
      list = list.filter(
        (m) => m.name.toLowerCase().includes(q) || (m.email || '').toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      const valA: any = a[registerSortKey];
      const valB: any = b[registerSortKey];
      if (typeof valA === 'string') {
        return registerSortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return registerSortAsc ? valA - valB : valB - valA;
    });

    return list;
  }, [memberMonthlyStats, registerSearchQuery, registerSortKey, registerSortAsc]);

  // Master Summary KPI calculations
  const totalMonthUnits = memberMonthlyStats.reduce((sum, m) => sum + m.totalUnits, 0);
  const totalMonthMorning = memberMonthlyStats.reduce((sum, m) => sum + m.morningTotal, 0);
  const totalMonthLunch = memberMonthlyStats.reduce((sum, m) => sum + m.lunchTotal, 0);
  const totalMonthNight = memberMonthlyStats.reduce((sum, m) => sum + m.nightTotal, 0);
  const totalEstimatedFoodCost = Math.round(totalMonthUnits * liveMealRate);

  // 4. Date-wise Matrix for Daily Logs DataTable
  const dateWiseMealLogs = useMemo(() => {
    const diningMembersMap = new Map<string, any>();
    members.forEach((m) => diningMembersMap.set(m.userId || m._id, m));

    // Map: date -> userId -> { morning: 0, lunch: 0, night: 0 }
    const matrix: Record<string, Record<string, { morning: number; lunch: number; night: number }>> = {};

    for (const rec of allCycleMeals) {
      if (!matrix[rec.date]) matrix[rec.date] = {};
      if (!matrix[rec.date][rec.userId]) matrix[rec.date][rec.userId] = { morning: 0, lunch: 0, night: 0 };
      const count = typeof rec.consumed === 'number' ? rec.consumed : (rec.consumed ? 1 : 0);
      if (rec.slotId === 'morning') matrix[rec.date][rec.userId].morning = count;
      else if (rec.slotId === 'lunch') matrix[rec.date][rec.userId].lunch = count;
      else if (rec.slotId === 'night') matrix[rec.date][rec.userId].night = count;
    }

    const rows: any[] = [];
    Object.entries(matrix).forEach(([date, userObj]) => {
      Object.entries(userObj).forEach(([userId, counts]) => {
        const mem = diningMembersMap.get(userId);
        if (!mem || mem.role === 'super_admin') return;
        const total = counts.morning + counts.lunch + counts.night;
        rows.push({
          date,
          userId,
          name: mem.name,
          email: mem.email,
          image: mem.image || `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`,
          morning: counts.morning,
          lunch: counts.lunch,
          night: counts.night,
          total,
        });
      });
    });

    // Sort newest date first
    rows.sort((a, b) => b.date.localeCompare(a.date));
    return rows;
  }, [allCycleMeals, members]);

  // Filtered Daily Logs
  const filteredDailyLogs = useMemo(() => {
    let list = [...dateWiseMealLogs];

    if (logDateFilter) {
      list = list.filter((r) => r.date === logDateFilter);
    }

    if (logUserFilter) {
      list = list.filter((r) => r.userId === logUserFilter);
    }

    if (logSearchQuery.trim()) {
      const q = logSearchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.date.includes(q) ||
          String(r.total).includes(q)
      );
    }

    return list;
  }, [dateWiseMealLogs, logDateFilter, logUserFilter, logSearchQuery]);

  // Available unique dates for filter dropdown
  const uniqueDates = useMemo(() => {
    const set = new Set<string>();
    allCycleMeals.forEach((m) => {
      if (m.date) set.add(m.date);
    });
    return Array.from(set).sort().reverse();
  }, [allCycleMeals]);

  // CSV Export for Monthly Master Register
  const handleExportCSV = () => {
    try {
      const headers = [
        'সদস্যের নাম',
        'ইমেইল',
        'মোট সকালের মিল',
        'মোট দুপুরের মিল',
        'মোট রাতের মিল',
        'সর্বমোট মিল ইউনিট',
        'মিল রেট (টাকা)',
        'আনুমানিক খাবার খরচ (টাকা)',
        'হাজিরার দিন সংখ্যা',
        'স্ট্যাটাস',
      ];

      const csvRows = [headers.join(',')];

      memberMonthlyStats.forEach((m) => {
        const row = [
          `"${m.name.replace(/"/g, '""')}"`,
          `"${(m.email || '').replace(/"/g, '""')}"`,
          m.morningTotal,
          m.lunchTotal,
          m.nightTotal,
          formatMealUnits(m.totalUnits),
          liveMealRate,
          m.estimatedCost,
          m.attendedDaysCount,
          `"${m.isActive ? 'সক্রিয়' : 'অনুপস্থিত'}"`,
        ];
        csvRows.push(row.join(','));
      });

      // UTF-8 BOM for proper Bengali text rendering in Excel
      const blob = new Blob(['\uFEFF' + csvRows.join('\n')], {
        type: 'text/csv;charset=utf-8;',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `monthly_meals_register_${cycle?.name || 'cycle'}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('মাসিক মিল খাতা CSV সফলভাবে ডাউনলোড হয়েছে!');
    } catch (e: any) {
      toast.error('CSV ডাউনলোড ব্যর্থ হয়েছে');
    }
  };

  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const pastRequests = requests.filter((r) => r.status !== 'pending');

  // Daily totals for single-day stepper
  let totalMorningMeals = 0;
  let totalLunchMeals = 0;
  let totalNightMeals = 0;
  Object.values(dailyEntries).forEach((e) => {
    totalMorningMeals += e.morning || 0;
    totalLunchMeals += e.lunch || 0;
    totalNightMeals += e.night || 0;
  });
  const totalMealUnits = totalMorningMeals + totalLunchMeals + totalNightMeals;

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Action */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Utensils className="w-5 h-5 text-indigo-400" />
            মাসিক পূর্ণাঙ্গ মিল খাতা ও হাজিরা ব্যবস্থাপনা
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            চলমান চক্র: <strong className="text-slate-200">{cycle?.name || 'অক্টোবর ২০২৬'}</strong> | লাইভ মিল রেট: <strong className="text-emerald-400">৳{liveMealRate}</strong>
          </p>
        </div>

        {currentUser.role !== 'super_admin' ? (
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onOpenRequestModal}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-500/25 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              মিল অফ/অন আবেদন
            </button>
          </div>
        ) : (
          <div className="text-xs bg-amber-500/10 text-amber-300 border border-amber-500/20 px-3.5 py-2 rounded-xl flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-amber-400" />
            <span>সুপার অ্যাডমিন অডিট ভিউ</span>
          </div>
        )}
      </div>

      {/* Sub-tab Switcher: 4 distinct views */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setSubTab('register')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            subTab === 'register'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Table className="w-4 h-4" />
          মাসিক মাস্টার মিল রেজিস্টার (DataTable)
        </button>

        <button
          onClick={() => setSubTab('sheet')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            subTab === 'sheet'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Calendar className="w-4 h-4" />
          দৈনিক হাজিরা ইনপুট শিট
        </button>

        <button
          onClick={() => setSubTab('logs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            subTab === 'logs'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <FileText className="w-4 h-4" />
          তারিখভিত্তিক বিস্তারিত মিল লগ
        </button>

        <button
          onClick={() => setSubTab('requests')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all relative cursor-pointer ${
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

      {/* VIEW 1: MONTHLY MASTER REGISTER (DATA TABLE) */}
      {subTab === 'register' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Top KPI Cards for Full Month */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="glass-panel rounded-2xl p-4 border border-emerald-500/20 bg-emerald-950/10">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>সর্বমোট মাসিক মিল</span>
                <Utensils className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono mt-1">
                {formatMealUnits(totalMonthUnits)} <span className="text-xs font-normal text-slate-400">ইউনিট</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                সকাল: {totalMonthMorning} | রাত: {totalMonthNight}
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-4 border border-indigo-500/20 bg-indigo-950/10">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>সক্রিয় মিল বর্ডার</span>
                <UserCheck className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-indigo-300 font-mono mt-1">
                {memberMonthlyStats.length} <span className="text-xs font-normal text-slate-400">জন</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                সদস্য প্রতি গড়: {memberMonthlyStats.length > 0 ? formatMealUnits(totalMonthUnits / memberMonthlyStats.length) : 0} মিল
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-4 border border-purple-500/20 bg-purple-950/10">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>লাইভ মিল রেট</span>
                <Zap className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-purple-300 font-mono mt-1">
                ৳{liveMealRate}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                অনুমোদিত বাজার ÷ মোট মিল
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-4 border border-cyan-500/20 bg-cyan-950/10">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>আনুমানিক খাদ্য বিল</span>
                <Save className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-cyan-300 font-mono mt-1">
                {formatTaka(totalEstimatedFoodCost)}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                চলমান চক্রের মোট মিল খরচ
              </div>
            </div>
          </div>

          {/* Master Register DataTable */}
          <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Table className="w-4 h-4 text-emerald-400" />
                  সদস্যদের মাসিক পূর্ণাঙ্গ মিল তালিকা ({filteredRegister.length} জন)
                </h4>
                <p className="text-xs text-slate-400">
                  চলমান মাসে কার কয়টা সকালের ও রাতের মিল হয়েছে এবং আনুমানিক খাবার খরচের সারসংক্ষেপ
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                {/* Search Bar */}
                <div className="relative flex-1 sm:w-60">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={registerSearchQuery}
                    onChange={(e) => setRegisterSearchQuery(e.target.value)}
                    placeholder="সদস্যের নাম দিয়ে খুঁজুন..."
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
                  />
                  {registerSearchQuery && (
                    <button
                      onClick={() => setRegisterSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* CSV Export Button */}
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all cursor-pointer"
                  title="সম্পূর্ণ মাসের মিল শিট CSV ফাইলে ডাউনলোড করুন"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>CSV এক্সপোর্ট</span>
                </button>
              </div>
            </div>

            {/* DataTable */}
            <div className="overflow-x-auto rounded-xl border border-slate-800/80">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-bold">
                    <th
                      onClick={() => {
                        if (registerSortKey === 'name') setRegisterSortAsc(!registerSortAsc);
                        else {
                          setRegisterSortKey('name');
                          setRegisterSortAsc(true);
                        }
                      }}
                      className="py-3 px-3 cursor-pointer hover:text-white"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>সদস্যের বিবরণ</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      onClick={() => {
                        if (registerSortKey === 'morningTotal') setRegisterSortAsc(!registerSortAsc);
                        else {
                          setRegisterSortKey('morningTotal');
                          setRegisterSortAsc(false);
                        }
                      }}
                      className="py-3 px-3 text-center cursor-pointer hover:text-white"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <Sun className="w-3 h-3 text-amber-400" />
                        <span>সকাল</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      onClick={() => {
                        if (registerSortKey === 'lunchTotal') setRegisterSortAsc(!registerSortAsc);
                        else {
                          setRegisterSortKey('lunchTotal');
                          setRegisterSortAsc(false);
                        }
                      }}
                      className="py-3 px-3 text-center cursor-pointer hover:text-white"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <Coffee className="w-3 h-3 text-orange-400" />
                        <span>দুপুর</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      onClick={() => {
                        if (registerSortKey === 'nightTotal') setRegisterSortAsc(!registerSortAsc);
                        else {
                          setRegisterSortKey('nightTotal');
                          setRegisterSortAsc(false);
                        }
                      }}
                      className="py-3 px-3 text-center cursor-pointer hover:text-white"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <Moon className="w-3 h-3 text-indigo-400" />
                        <span>রাত</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      onClick={() => {
                        if (registerSortKey === 'totalUnits') setRegisterSortAsc(!registerSortAsc);
                        else {
                          setRegisterSortKey('totalUnits');
                          setRegisterSortAsc(false);
                        }
                      }}
                      className="py-3 px-3 text-center cursor-pointer hover:text-white"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <Utensils className="w-3 h-3 text-emerald-400" />
                        <span>মোট মিল ইউনিট</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      onClick={() => {
                        if (registerSortKey === 'estimatedCost') setRegisterSortAsc(!registerSortAsc);
                        else {
                          setRegisterSortKey('estimatedCost');
                          setRegisterSortAsc(false);
                        }
                      }}
                      className="py-3 px-3 text-right cursor-pointer hover:text-white"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>খাবার খরচ</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-3 px-3 text-center">উপস্থিতি</th>
                    <th className="py-3 px-3 text-center">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                  {filteredRegister.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        {registerSearchQuery
                          ? `"${registerSearchQuery}" দিয়ে কোনো সদস্য পাওয়া যায়নি`
                          : 'কোনো সদস্যের মিল রেকর্ড নেই'}
                      </td>
                    </tr>
                  ) : (
                    filteredRegister.map((m) => (
                      <tr key={m.userId} className="hover:bg-slate-900/60 transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={m.image}
                              alt={m.name}
                              className="w-8 h-8 rounded-xl object-cover border border-slate-700 shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="font-bold text-white text-xs truncate flex items-center gap-1.5">
                                <span>{m.name}</span>
                                {m.role === 'admin' && (
                                  <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1 rounded font-normal">
                                    ম্যানেজার
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 block truncate">
                                {m.email || 'সদস্য'}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-200">
                          {m.morningTotal} টি
                        </td>

                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-200">
                          {m.lunchTotal} টি
                        </td>

                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-200">
                          {m.nightTotal} টি
                        </td>

                        <td className="py-3 px-3 text-center">
                          <span className="inline-block px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono font-extrabold text-xs">
                            {formatMealUnits(m.totalUnits)}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                          {formatTaka(m.estimatedCost)}
                        </td>

                        <td className="py-3 px-3 text-center text-[11px] text-slate-400">
                          <span className="font-semibold text-slate-300">{m.attendedDaysCount}</span> দিন
                        </td>

                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => {
                              setLogUserFilter(m.userId);
                              setSubTab('logs');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600/15 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-[10px] font-semibold transition-all cursor-pointer"
                            title="এই সদস্যের সকল তারিখের বিস্তারিত লগ দেখুন"
                          >
                            লগ দেখুন
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-900 border-t-2 border-slate-800 text-xs font-bold text-slate-200">
                    <td className="py-3 px-3">
                      মোট ({filteredRegister.length} জন বর্ডার)
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-amber-300">
                      {filteredRegister.reduce((sum, m) => sum + m.morningTotal, 0)} টি
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-orange-300">
                      {filteredRegister.reduce((sum, m) => sum + m.lunchTotal, 0)} টি
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-indigo-300">
                      {filteredRegister.reduce((sum, m) => sum + m.nightTotal, 0)} টি
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-emerald-400 font-extrabold">
                      {formatMealUnits(filteredRegister.reduce((sum, m) => sum + m.totalUnits, 0))}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-400 font-black">
                      {formatTaka(filteredRegister.reduce((sum, m) => sum + m.estimatedCost, 0))}
                    </td>
                    <td colSpan={2} className="py-3 px-3 text-right text-[10px] text-slate-400">
                      মাসিক চূড়ান্ত মিল রেট: ৳{liveMealRate}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: DAILY ATTENDANCE STEPPER & INPUT SHEET */}
      {subTab === 'sheet' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Date Selector & KPI Strip */}
          <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-slate-800 space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              {/* Date Navigation */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => changeDateByDays(-1)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                  title="আগের দিন"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="relative flex-1 sm:flex-none">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full sm:w-auto bg-slate-900 border border-slate-700 hover:border-slate-600 text-white font-mono text-xs font-semibold px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500 cursor-pointer"
                  />
                </div>

                <button
                  onClick={() => changeDateByDays(1)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                  title="পরের দিন"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setSelectedDate(getTodayStr())}
                  className="text-xs px-2.5 py-2 rounded-xl bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 font-medium transition-all cursor-pointer"
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
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
                  >
                    {isSaving ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    {isSaving ? 'সংরক্ষণ হচ্ছে...' : 'হাজিরা সংরক্ষণ করুন'}
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
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 pt-2 border-t border-slate-800/80">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[11px] text-slate-400">সকালের মিল</span>
                <p className="text-base font-bold text-white mt-0.5">{totalMorningMeals} টি</p>
                <span className="text-[10px] text-amber-400/80 font-mono">সকাল</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[11px] text-slate-400">দুপুরের মিল</span>
                <p className="text-base font-bold text-white mt-0.5">{totalLunchMeals} টি</p>
                <span className="text-[10px] text-orange-400/80 font-mono">দুপুর</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[11px] text-slate-400">রাতের মিল</span>
                <p className="text-base font-bold text-white mt-0.5">{totalNightMeals} টি</p>
                <span className="text-[10px] text-indigo-400/80 font-mono">রাত</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[11px] text-indigo-400">মোট মিল ইউনিট</span>
                <p className="text-base font-bold text-indigo-300 mt-0.5 font-mono">{formatMealUnits(totalMealUnits)}</p>
                <span className="text-[10px] text-indigo-400/80 font-mono">{totalMorningMeals} + {totalLunchMeals} + {totalNightMeals}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[11px] text-slate-400">ডাইনিং সদস্য সংখ্যা</span>
                <p className="text-base font-bold text-white mt-0.5">{members.filter((m) => m.role !== 'super_admin').length} জন</p>
              </div>
            </div>
          </div>

          {/* Members Meal Grid */}
          <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-indigo-400" />
                  {selectedDate} তারিখের ব্যক্তিগত মিল তালিকা
                </h4>
                <p className="text-xs text-slate-400">
                  সদস্যদের সকাল, দুপুর ও রাতের মিল পরিবর্তন করতে + / - বাটনে ক্লিক করুন
                </p>
              </div>
            </div>

            {isLoadingDateMeals ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
                <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
                <span>তারিখের মিল লোড হচ্ছে...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {members
                  .filter((m) => m.role !== 'super_admin')
                  .map((member) => {
                    const uId = member.userId || member._id;
                    const entry = dailyEntries[uId] || { morning: 0, lunch: 1, night: 1 };
                    const userTotal = entry.morning + (entry.lunch || 0) + entry.night;

                    return (
                      <div
                        key={uId}
                        className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700 transition-all space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={member.image || `https://api.dicebear.com/7.x/bottts/svg?seed=${uId}`}
                              alt={member.name}
                              className="w-8 h-8 rounded-xl object-cover border border-slate-700"
                            />
                            <div className="truncate">
                              <span className="font-semibold text-slate-200 text-xs block truncate">
                                {member.name}
                              </span>
                              <span className="text-[10px] text-slate-500 block truncate">
                                {member.email || 'মেস সদস্য'}
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-[10px] text-slate-400 block">মোট ইউনিট</span>
                            <span className="font-mono font-bold text-indigo-300 text-xs">
                              {formatMealUnits(userTotal)}
                            </span>
                          </div>
                        </div>

                        {/* Controls for 3 Meal Slots */}
                        <div className="grid grid-cols-3 gap-1.5 text-xs">
                          {/* Morning */}
                          <div className="flex flex-col items-center justify-between bg-slate-950/60 p-2 rounded-lg border border-slate-800/60 gap-1.5">
                            <span className="text-[11px] font-semibold text-amber-300">সকাল</span>
                            <div className="flex items-center gap-1">
                              {canEditMeals && (
                                <button
                                  onClick={() => updateCount(uId, 'morning', -0.5)}
                                  className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center transition-colors cursor-pointer"
                                  title="০.৫ কমান"
                                >
                                  -
                                </button>
                              )}
                              <span className="w-7 text-center text-xs font-bold font-mono text-white">
                                {entry.morning}
                              </span>
                              {canEditMeals && (
                                <button
                                  onClick={() => updateCount(uId, 'morning', 0.5)}
                                  className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center transition-colors cursor-pointer"
                                  title="০.৫ বাড়ান"
                                >
                                  +
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Lunch */}
                          <div className="flex flex-col items-center justify-between bg-slate-950/60 p-2 rounded-lg border border-slate-800/60 gap-1.5">
                            <span className="text-[11px] font-semibold text-orange-300">দুপুর</span>
                            <div className="flex items-center gap-1">
                              {canEditMeals && (
                                <button
                                  onClick={() => updateCount(uId, 'lunch', -0.5)}
                                  className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center transition-colors cursor-pointer"
                                  title="০.৫ কমান"
                                >
                                  -
                                </button>
                              )}
                              <span className="w-7 text-center text-xs font-bold font-mono text-white">
                                {entry.lunch}
                              </span>
                              {canEditMeals && (
                                <button
                                  onClick={() => updateCount(uId, 'lunch', 0.5)}
                                  className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center transition-colors cursor-pointer"
                                  title="০.৫ বাড়ান"
                                >
                                  +
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Night */}
                          <div className="flex flex-col items-center justify-between bg-slate-950/60 p-2 rounded-lg border border-slate-800/60 gap-1.5">
                            <span className="text-[11px] font-semibold text-indigo-300">রাত</span>
                            <div className="flex items-center gap-1">
                              {canEditMeals && (
                                <button
                                  onClick={() => updateCount(uId, 'night', -0.5)}
                                  className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center transition-colors cursor-pointer"
                                  title="০.৫ কমান"
                                >
                                  -
                                </button>
                              )}
                              <span className="w-7 text-center text-xs font-bold font-mono text-white">
                                {entry.night}
                              </span>
                              {canEditMeals && (
                                <button
                                  onClick={() => updateCount(uId, 'night', 0.5)}
                                  className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center transition-colors cursor-pointer"
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

      {/* VIEW 3: DATE-WISE DETAILED MEAL LOGS (DATATABLE) */}
      {subTab === 'logs' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  তারিখভিত্তিক বিস্তারিত মিল লগ ({filteredDailyLogs.length} রেকর্ড)
                </h4>
                <p className="text-xs text-slate-400">
                  প্রতিদিনের সকাল ও রাতের মিলের বিস্তারিত উপস্থিতি ইতিহাস
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                {/* Date Dropdown Filter */}
                <select
                  value={logDateFilter}
                  onChange={(e) => setLogDateFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 outline-none cursor-pointer"
                >
                  <option value="">সকল তারিখ</option>
                  {uniqueDates.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>

                {/* Member Dropdown Filter */}
                <select
                  value={logUserFilter}
                  onChange={(e) => setLogUserFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 outline-none cursor-pointer"
                >
                  <option value="">সকল সদস্য</option>
                  {members
                    .filter((m) => m.role !== 'super_admin')
                    .map((m) => (
                      <option key={m.userId || m._id} value={m.userId || m._id}>
                        {m.name}
                      </option>
                    ))}
                </select>

                {/* Search query */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={logSearchQuery}
                    onChange={(e) => setLogSearchQuery(e.target.value)}
                    placeholder="খুঁজুন..."
                    className="bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 outline-none w-36 sm:w-44 focus:border-indigo-500"
                  />
                  {logSearchQuery && (
                    <button
                      onClick={() => setLogSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Logs Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-bold">
                    <th className="py-2.5 px-3">তারিখ</th>
                    <th className="py-2.5 px-3">সদস্যের নাম</th>
                    <th className="py-2.5 px-3 text-center">সকালের মিল</th>
                    <th className="py-2.5 px-3 text-center">দুপুরের মিল</th>
                    <th className="py-2.5 px-3 text-center">রাতের মিল</th>
                    <th className="py-2.5 px-3 text-center">মোট মিল ইউনিট</th>
                    <th className="py-2.5 px-3 text-center">স্ট্যাটাস</th>
                    {canEditMeals && (
                      <th className="py-2.5 px-3 text-center">অ্যাকশন</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                  {filteredDailyLogs.length === 0 ? (
                    <tr>
                      <td colSpan={canEditMeals ? 8 : 7} className="py-8 text-center text-slate-500">
                        কোনো মিল লগ পাওয়া যায়নি
                      </td>
                    </tr>
                  ) : (
                    filteredDailyLogs.map((row, idx) => (
                      <tr key={`${row.date}_${row.userId}_${idx}`} className="hover:bg-slate-900/50">
                        <td className="py-2.5 px-3 font-mono font-semibold text-slate-300">
                          {row.date}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <img
                              src={row.image}
                              alt={row.name}
                              className="w-6 h-6 rounded-lg object-cover border border-slate-700"
                            />
                            <span className="font-medium text-slate-200">{row.name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-300">
                          {row.morning}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-300">
                          {row.lunch}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-300">
                          {row.night}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-400">
                          {formatMealUnits(row.total)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              row.total > 0
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : 'bg-rose-500/15 text-rose-400'
                            }`}
                          >
                            {row.total > 0 ? 'খাবার চালু' : 'মিল অফ'}
                          </span>
                        </td>
                        {canEditMeals && (
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() =>
                                  setEditingLogItem({
                                    date: row.date,
                                    userId: row.userId,
                                    name: row.name,
                                    morning: row.morning,
                                    lunch: row.lunch,
                                    night: row.night,
                                  })
                                }
                                className="p-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 transition-colors cursor-pointer"
                                title="মিল সংশোধন বা এডিট করুন"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteMealLog(row.date, row.userId, row.name)}
                                className="p-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 transition-colors cursor-pointer"
                                title="মিল ০ বা ডিলিট করুন"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Quick Edit Modal for Past Meal Corrections */}
      {editingLogItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  <Utensils className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">মিল সংশোধন</h4>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {editingLogItem.date} • {editingLogItem.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingLogItem(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Morning Meal Input */}
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-amber-300 block">সকালের মিল</span>
                  <span className="text-[10px] text-slate-500 block">সকালের খাবার</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setEditingLogItem({
                        ...editingLogItem,
                        morning: Math.max(0, Number((editingLogItem.morning - 0.5).toFixed(1))),
                      })
                    }
                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={editingLogItem.morning}
                    onChange={(e) =>
                      setEditingLogItem({
                        ...editingLogItem,
                        morning: Math.max(0, parseFloat(e.target.value) || 0),
                      })
                    }
                    className="w-14 text-center bg-slate-900 border border-slate-750 rounded-lg py-1 text-xs text-white font-mono font-bold"
                  />
                  <button
                    onClick={() =>
                      setEditingLogItem({
                        ...editingLogItem,
                        morning: Number((editingLogItem.morning + 0.5).toFixed(1)),
                      })
                    }
                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Lunch Meal Input */}
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-orange-300 block">দুপুরের মিল</span>
                  <span className="text-[10px] text-slate-500 block">দুপুরের খাবার</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setEditingLogItem({
                        ...editingLogItem,
                        lunch: Math.max(0, Number((editingLogItem.lunch - 0.5).toFixed(1))),
                      })
                    }
                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={editingLogItem.lunch}
                    onChange={(e) =>
                      setEditingLogItem({
                        ...editingLogItem,
                        lunch: Math.max(0, parseFloat(e.target.value) || 0),
                      })
                    }
                    className="w-14 text-center bg-slate-900 border border-slate-750 rounded-lg py-1 text-xs text-white font-mono font-bold"
                  />
                  <button
                    onClick={() =>
                      setEditingLogItem({
                        ...editingLogItem,
                        lunch: Number((editingLogItem.lunch + 0.5).toFixed(1)),
                      })
                    }
                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Night Meal Input */}
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-indigo-300 block">রাতের মিল</span>
                  <span className="text-[10px] text-slate-500 block">রাতের খাবার</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setEditingLogItem({
                        ...editingLogItem,
                        night: Math.max(0, Number((editingLogItem.night - 0.5).toFixed(1))),
                      })
                    }
                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={editingLogItem.night}
                    onChange={(e) =>
                      setEditingLogItem({
                        ...editingLogItem,
                        night: Math.max(0, parseFloat(e.target.value) || 0),
                      })
                    }
                    className="w-14 text-center bg-slate-900 border border-slate-750 rounded-lg py-1 text-xs text-white font-mono font-bold"
                  />
                  <button
                    onClick={() =>
                      setEditingLogItem({
                        ...editingLogItem,
                        night: Number((editingLogItem.night + 0.5).toFixed(1)),
                      })
                    }
                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Real-time Units Calculation Preview */}
              <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/30 flex items-center justify-between">
                <span className="text-xs text-indigo-300">হিসাবকৃত মোট মিল ইউনিট:</span>
                <span className="font-mono font-bold text-sm text-indigo-200">
                  {formatMealUnits(editingLogItem.morning + (editingLogItem.lunch || 0) + editingLogItem.night)} ইউনিট
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingLogItem(null)}
                className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleSaveLogEdit}
                disabled={isSavingLogEdit}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSavingLogEdit ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                {isSavingLogEdit ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: MEAL REQUESTS & APPROVALS */}
      {subTab === 'requests' && (
        <div className="space-y-6 animate-in fade-in duration-200">
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
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition-all cursor-pointer"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          অনুমোদন
                        </button>
                        <button
                          onClick={() => handleReview(req._id, 'rejected')}
                          disabled={processingId === req._id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-500 text-white text-xs font-semibold shadow transition-all cursor-pointer"
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
