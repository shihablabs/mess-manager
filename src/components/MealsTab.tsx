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
  ShoppingBag,
  Info,
  Eye,
  RotateCcw,
} from '@/components/icons';
import { AppUser } from '@/lib/session';
import { formatTaka, formatMealUnits } from '@/lib/money';
import { toast } from 'sonner';
import { confirmAction } from '@/lib/alerts';
import { MemberLeaveModal } from '@/components/MemberLeaveModal';
import { useLanguage } from '@/context/LanguageContext';

interface MealsTabProps {
  currentUser: AppUser;
  members: any[];
  cycle?: any;
  calculation?: any;
  requests: any[];
  bazars?: any[];
  onRefresh: () => void;
  onOpenRequestModal: (requestToEdit?: any) => void;
}

export const MealsTab: React.FC<MealsTabProps> = ({
  currentUser,
  members = [],
  cycle,
  calculation,
  requests = [],
  bazars = [],
  onRefresh,
  onOpenRequestModal,
}) => {
  const { t, language } = useLanguage();
  const isBangla = language === 'bn';
  const isManager = currentUser.role === 'admin' || currentUser.role === 'super_admin';

  // Sub-tabs: register (মাসিক পূর্ণাঙ্গ মাস্টার খাতা), sheet (দৈনিক ইনপুট), logs (তারিখভিত্তিক লগ), requests (অনুরোধ)
  const [subTab, setSubTab] = useState<'register' | 'sheet' | 'logs' | 'requests'>('register');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Leave Modal State
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [editingLeave, setEditingLeave] = useState<any | null>(null);

  // Request Hub Category & Filter States
  const [requestCategory, setRequestCategory] = useState<'meals' | 'bazars' | 'leaves'>('meals');
  const [requestSearch, setRequestSearch] = useState('');
  const [requestStatusFilter, setRequestStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [requestTypeFilter, setRequestTypeFilter] = useState<'all' | 'off' | 'on'>('all');

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

  // Filter states for Daily Date-wise Logs
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [logDateFilter, setLogDateFilter] = useState('');
  const [logUserFilter, setLogUserFilter] = useState('');
  const [logSortOrder, setLogSortOrder] = useState<'asc' | 'desc'>('asc');
  const [logAttendanceFilter, setLogAttendanceFilter] = useState<'eaters' | 'all' | 'off'>('eaters');

  // Detailed Modal popup state for individual day meal breakdown
  const [viewingDetailItem, setViewingDetailItem] = useState<{
    date: string;
    formattedDate: string;
    dayName: string;
    dayNumber: number;
    userId: string;
    name: string;
    email?: string;
    image: string;
    morning: number;
    lunch: number;
    night: number;
    total: number;
    mealStatusText: string;
    mealStatusType: 'full' | 'partial' | 'off';
    estimatedCost: number;
  } | null>(null);

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
        toast.success(
          isBangla
            ? `${editingLogItem.date} তারিখের মিল সফলভাবে সংশোধন করা হয়েছে!`
            : `Meals for ${editingLogItem.date} updated successfully!`
        );
        setEditingLogItem(null);
        await fetchAllCycleMeals();
        onRefresh();
      } else {
        toast.error(data.error || (isBangla ? 'মিল সংশোধন ব্যর্থ হয়েছে' : 'Failed to update meals'));
      }
    } catch (e: any) {
      toast.error(isBangla ? 'নেটওয়ার্ক ত্রুটি' : 'Network error');
    } finally {
      setIsSavingLogEdit(false);
    }
  };

  const handleDeleteMealLog = async (date: string, userId: string, memberName: string) => {
    const isConfirmed = await confirmAction({
      title: isBangla ? 'মিল রেকর্ড বাতিলকরণ' : 'Reset Meal Record',
      text: isBangla
        ? `আপনি কি নিশ্চিত যে ${memberName}-এর ${date} তারিখের মিল ০/বাতিল করতে চান?`
        : `Are you sure you want to reset meals for ${memberName} on ${date} to 0?`,
      confirmText: isBangla ? 'হ্যাঁ, বাতিল করুন' : 'Yes, Reset',
      cancelText: isBangla ? 'না' : 'Cancel',
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
        toast.success(
          isBangla
            ? `${memberName} এর ${date} তারিখের মিল ০/বাতিল করা হয়েছে!`
            : `Meals for ${memberName} on ${date} reset to 0!`
        );
        await fetchAllCycleMeals();
        onRefresh();
      } else {
        toast.error(data.error || (isBangla ? 'মুছে ফেলতে ব্যর্থ হয়েছে' : 'Failed to delete'));
      }
    } catch (e: any) {
      toast.error(isBangla ? 'নেটওয়ার্ক ত্রুটি' : 'Network error');
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

  // Helper: check if a member is on active approved leave for a specific date
  const getMemberLeaveForDate = useCallback(
    (userId: string, date: string) => {
      return (requests || []).find((r) => {
        if (r.userId !== userId) return false;
        if (r.status !== 'approved' || r.action !== 'off') return false;
        const sDate = r.startDate || r.date;
        const eDate = r.endDate || sDate;
        return date >= sDate && date <= eDate;
      });
    },
    [requests]
  );

  // 2. Fetch meals for selected single date (Daily input editor)
  const fetchDateMeals = useCallback(async (date: string) => {
    try {
      setIsLoadingDateMeals(true);
      const res = await fetch(`/api/meals?date=${date}&cycleId=${cycle?._id || 'cycle_1'}`);
      const json = await res.json();

      const newEntries: Record<string, { morning: number; lunch: number; night: number }> = {};
      const diningMembers = members.filter((m) => m.role !== 'super_admin');

      // Initialize with default 0 morning, 1 lunch, 1 night UNLESS the member is on approved leave
      diningMembers.forEach((m) => {
        const uid = m.userId || m._id;
        const leave = (requests || []).find((r) => {
          if (r.userId !== uid) return false;
          if (r.status !== 'approved' || r.action !== 'off') return false;
          const s = r.startDate || r.date;
          const e = r.endDate || s;
          return date >= s && date <= e;
        });

        if (leave) {
          newEntries[uid] = { morning: 0, lunch: 0, night: 0 };
        } else {
          newEntries[uid] = { morning: 0, lunch: 1, night: 1 };
        }
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
  }, [members, cycle?._id, requests]);

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

  // Quick actions: auto-protect members on approved leave
  const handleSetAll = (val: number) => {
    if (!canEditMeals) return;
    const updated: Record<string, { morning: number; lunch: number; night: number }> = {};
    const diningMembers = members.filter((m) => m.role !== 'super_admin');
    diningMembers.forEach((m) => {
      const uid = m.userId || m._id;
      const onLeave = getMemberLeaveForDate(uid, selectedDate);
      if (onLeave && val > 0) {
        updated[uid] = { morning: 0, lunch: 0, night: 0 };
      } else {
        updated[uid] = { morning: val, lunch: val, night: val };
      }
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
        setSaveSuccessMsg(
          isBangla
            ? `${selectedDate} তারিখের মিল সংরক্ষিত হয়েছে!`
            : `Meals saved for ${selectedDate}!`
        );
        setTimeout(() => setSaveSuccessMsg(null), 3500);
        toast.success(
          isBangla
            ? `${selectedDate} তারিখের মিল হাজিরা ডাটাবেজে সংরক্ষিত হয়েছে!`
            : `Meal attendance saved to database for ${selectedDate}!`
        );
        fetchAllCycleMeals();
        onRefresh();
      } else {
        toast.error(data.error || (isBangla ? 'সংরক্ষণ ব্যর্থ হয়েছে' : 'Failed to save'));
      }
    } catch (e: any) {
      toast.error(e.message || (isBangla ? 'ত্রুটি ঘটেছে' : 'An error occurred'));
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
        toast.success(
          status === 'approved'
            ? (isBangla ? 'অনুরোধ অনুমোদিত হয়েছে' : 'Request approved successfully')
            : (isBangla ? 'অনুরোধ বাতিল করা হয়েছে' : 'Request rejected')
        );
        onRefresh();
        fetchDateMeals(selectedDate);
        fetchAllCycleMeals();
      } else {
        toast.error(data.error || (isBangla ? 'ব্যর্থ হয়েছে' : 'Failed'));
      }
    } catch (e: any) {
      toast.error(e.message || (isBangla ? 'ত্রুটি ঘটেছে' : 'An error occurred'));
    } finally {
      setProcessingId(null);
    }
  };

  const handleReviewBazar = async (id: string, status: 'approved' | 'rejected') => {
    try {
      setProcessingId(id);
      const res = await fetch('/api/bazars', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          status === 'approved'
            ? (isBangla ? 'বাজার খরচ অনুমোদিত হয়েছে!' : 'Bazar expense approved!')
            : (isBangla ? 'বাজার খরচ বাতিল করা হয়েছে' : 'Bazar expense rejected')
        );
        onRefresh();
      } else {
        toast.error(data.error || (isBangla ? 'ব্যর্থ হয়েছে' : 'Failed'));
      }
    } catch {
      toast.error(isBangla ? 'নেটওয়ার্ক সমস্যা' : 'Network issue');
    } finally {
      setProcessingId(null);
    }
  };

  const handleEndLeaveToday = async (leave: any) => {
    const isConfirmed = await confirmAction({
      title: isBangla ? 'সদস্যের ছুটি আজই সমাপ্ত করবেন?' : 'End member leave today?',
      text: isBangla
        ? `${leave.userName || 'সদস্য'} আগে মেসে ফিরে এসেছেন? আজ থেকে তাঁর মিল পুনরায় চালু করা হবে।`
        : `Has ${leave.userName || 'member'} returned early? Their meals will be resumed from today.`,
      confirmText: isBangla ? 'হ্যাঁ, ছুটি সমাপ্ত ও মিল চালু করুন' : 'Yes, End Leave & Resume Meals',
      cancelText: isBangla ? 'বাতিল' : 'Cancel',
      confirmColor: '#10b981',
    });
    if (!isConfirmed) return;

    try {
      setProcessingId(leave._id);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const res = await fetch('/api/meal-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: leave._id,
          endDate: yesterdayStr,
          adminNote: isBangla
            ? 'সদস্য আগে ফিরে আসায় ছুটি আজ সমাপ্ত করা হয়েছে'
            : 'Leave ended early as member returned',
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          isBangla
            ? 'ছুটি সফলভাবে সমাপ্ত করা হয়েছে এবং আজকের পর থেকে মিল চালু করা হয়েছে!'
            : 'Leave ended successfully and meals resumed!'
        );
        onRefresh();
        fetchDateMeals(selectedDate);
      } else {
        toast.error(data.error || (isBangla ? 'ব্যর্থ হয়েছে' : 'Failed to end leave'));
      }
    } catch {
      toast.error(isBangla ? 'নেটওয়ার্ক ত্রুটি' : 'Network error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteLeave = async (id: string, memberName: string) => {
    const isConfirmed = await confirmAction({
      title: isBangla ? 'ছুটি বাতিল করবেন?' : 'Cancel leave schedule?',
      text: isBangla
        ? `${memberName}-এর এই ছুটির রেকর্ড বাতিল করা হবে এবং মিলগুলো পুনরায় সক্রিয় করা হবে।`
        : `Leave schedule for ${memberName} will be cancelled and meals restored.`,
      confirmText: isBangla ? 'হ্যাঁ, বাতিল করুন' : 'Yes, Cancel Leave',
      cancelText: isBangla ? 'না' : 'No',
      confirmColor: '#e11d48',
    });
    if (!isConfirmed) return;

    try {
      setProcessingId(id);
      const res = await fetch(`/api/meal-requests?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          isBangla
            ? 'ছুটি বাতিল ও মিল পুনরুদ্ধার সম্পন্ন হয়েছে!'
            : 'Leave cancelled and meals restored successfully!'
        );
        onRefresh();
        fetchDateMeals(selectedDate);
      } else {
        toast.error(data.error || (isBangla ? 'ব্যর্থ হয়েছে' : 'Failed to cancel leave'));
      }
    } catch {
      toast.error(isBangla ? 'নেটওয়ার্ক ত্রুটি' : 'Network error');
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

  // 4. Date-wise Grouped Structure for Day-by-Day Logs (Month Day 1 -> 30)
  const dateWiseGroupedLogs = useMemo(() => {
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

    const groups: {
      date: string;
      dayNumber: number;
      dayName: string;
      formattedDate: string;
      totalDayUnits: number;
      eaterCount: number;
      totalMorning: number;
      totalLunch: number;
      totalNight: number;
      members: {
        userId: string;
        name: string;
        email?: string;
        image: string;
        morning: number;
        lunch: number;
        night: number;
        total: number;
        mealStatusText: string;
        mealStatusType: 'full' | 'partial' | 'off';
        estimatedCost: number;
      }[];
    }[] = [];

    Object.entries(matrix).forEach(([date, userObj]) => {
      const d = new Date(date + 'T12:00:00');
      const dayNumber = isNaN(d.getTime()) ? 1 : d.getDate();
      const dayName = isBangla
        ? ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'][d.getDay()] || ''
        : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()] || '';
      const monthNames = isBangla
        ? ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর']
        : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthName = monthNames[d.getMonth()] || '';
      const formattedDate = `${String(dayNumber).padStart(2, '0')} ${monthName} ${d.getFullYear()}`;

      let totalDayUnits = 0;
      let totalMorning = 0;
      let totalLunch = 0;
      let totalNight = 0;
      let eaterCount = 0;

      const memberList: any[] = [];

      Object.entries(userObj).forEach(([userId, counts]) => {
        const mem = diningMembersMap.get(userId);
        if (!mem || mem.role === 'super_admin') return;

        const total = counts.morning + counts.lunch + counts.night;
        totalDayUnits += total;
        totalMorning += counts.morning;
        totalLunch += counts.lunch;
        totalNight += counts.night;
        if (total > 0) eaterCount++;

        let mealStatusText = '';
        let mealStatusType: 'full' | 'partial' | 'off' = 'off';

        if (counts.morning > 0 && counts.lunch > 0 && counts.night > 0) {
          mealStatusText = isBangla ? '৩ বেলা ফুল মিল' : 'Full Day (3 meals)';
          mealStatusType = 'full';
        } else if (
          (counts.morning > 0 && counts.lunch > 0) ||
          (counts.lunch > 0 && counts.night > 0) ||
          (counts.morning > 0 && counts.night > 0)
        ) {
          mealStatusText = isBangla ? '২ বেলা মিল' : '2 Meals';
          mealStatusType = 'partial';
        } else if (total > 0) {
          mealStatusText = isBangla ? '১ বেলা মিল' : '1 Meal';
          mealStatusType = 'partial';
        } else {
          mealStatusText = isBangla ? 'মিল অফ (০)' : 'Meal Off (0)';
          mealStatusType = 'off';
        }

        memberList.push({
          userId,
          name: mem.displayName || mem.name,
          email: mem.email,
          image: mem.image || `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`,
          morning: counts.morning,
          lunch: counts.lunch,
          night: counts.night,
          total,
          mealStatusText,
          mealStatusType,
          estimatedCost: Math.round(total * liveMealRate),
        });
      });

      // Sort member list: eaters first (highest to lowest meal units), then alphabetically
      memberList.sort((a, b) => {
        if (b.total !== a.total) return b.total - a.total;
        return a.name.localeCompare(b.name);
      });

      groups.push({
        date,
        dayNumber,
        dayName,
        formattedDate,
        totalDayUnits,
        eaterCount,
        totalMorning,
        totalLunch,
        totalNight,
        members: memberList,
      });
    });

    // Default sorting: Day 1 -> Day 30 (Chronological ascending, as requested: "1 tarikh theke 2 - 3 then barte barte 30")
    groups.sort((a, b) => a.date.localeCompare(b.date));

    return groups;
  }, [allCycleMeals, members, isBangla, liveMealRate]);

  // Filtered Daily Grouped Logs
  const filteredDailyGroups = useMemo(() => {
    let list = [...dateWiseGroupedLogs];

    // Specific Date Filter
    if (logDateFilter) {
      list = list.filter((g) => g.date === logDateFilter);
    }

    // Sort Order (asc = Day 1 -> 30, desc = Day 30 -> 1)
    if (logSortOrder === 'desc') {
      list = [...list].sort((a, b) => b.date.localeCompare(a.date));
    } else {
      list = [...list].sort((a, b) => a.date.localeCompare(b.date));
    }

    const processed = list.map((group) => {
      let filteredMembers = [...group.members];

      // Attendance filter: eaters vs all vs off
      if (logAttendanceFilter === 'eaters') {
        filteredMembers = filteredMembers.filter((m) => m.total > 0);
      } else if (logAttendanceFilter === 'off') {
        filteredMembers = filteredMembers.filter((m) => m.total === 0);
      }

      // Member filter
      if (logUserFilter) {
        filteredMembers = filteredMembers.filter((m) => m.userId === logUserFilter);
      }

      // Search query
      if (logSearchQuery.trim()) {
        const q = logSearchQuery.toLowerCase().trim();
        filteredMembers = filteredMembers.filter(
          (m) =>
            m.name.toLowerCase().includes(q) ||
            group.date.includes(q) ||
            group.formattedDate.toLowerCase().includes(q) ||
            String(m.total).includes(q)
        );
      }

      return {
        ...group,
        displayMembers: filteredMembers,
      };
    });

    // If search query or member filter is active, only show dates that have matching members
    if (logUserFilter || logSearchQuery.trim()) {
      return processed.filter((g) => g.displayMembers.length > 0);
    }

    return processed;
  }, [
    dateWiseGroupedLogs,
    logDateFilter,
    logSortOrder,
    logAttendanceFilter,
    logUserFilter,
    logSearchQuery,
  ]);

  // Available unique dates for filter dropdown (sorted matching logSortOrder)
  const uniqueDates = useMemo(() => {
    const set = new Set<string>();
    allCycleMeals.forEach((m) => {
      if (m.date) set.add(m.date);
    });
    const arr = Array.from(set).sort();
    return logSortOrder === 'desc' ? arr.reverse() : arr;
  }, [allCycleMeals, logSortOrder]);

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

  const pendingRequests = (requests || []).filter((r) => r.status === 'pending');
  const pastRequests = (requests || []).filter((r) => r.status !== 'pending');

  const activeLeaves = useMemo(() => {
    return (requests || []).filter((r) => r.action === 'off' && r.status === 'approved');
  }, [requests]);

  const pendingBazars = useMemo(() => {
    return (bazars || []).filter((b: any) => b.status === 'pending');
  }, [bazars]);

  // Filtered requests for the Request Hub
  const filteredMealRequests = useMemo(() => {
    let list = requests || [];
    if (requestStatusFilter !== 'all') {
      list = list.filter((r) => r.status === requestStatusFilter);
    }
    if (requestTypeFilter !== 'all') {
      list = list.filter((r) => r.action === requestTypeFilter);
    }
    if (requestSearch.trim()) {
      const q = requestSearch.toLowerCase().trim();
      list = list.filter(
        (r) =>
          (r.userName || '').toLowerCase().includes(q) ||
          (r.reason || '').toLowerCase().includes(q) ||
          (r.date || '').includes(q)
      );
    }
    return list;
  }, [requests, requestStatusFilter, requestTypeFilter, requestSearch]);

  const filteredBazarRequests = useMemo(() => {
    let list = bazars || [];
    if (requestStatusFilter !== 'all') {
      list = list.filter((b) => b.status === requestStatusFilter);
    }
    if (requestSearch.trim()) {
      const q = requestSearch.toLowerCase().trim();
      list = list.filter(
        (b) =>
          (b.description || '').toLowerCase().includes(q) ||
          (b.userName || '').toLowerCase().includes(q) ||
          (b.date || '').includes(q)
      );
    }
    return list;
  }, [bazars, requestStatusFilter, requestSearch]);

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
            {isBangla ? 'মাসিক পূর্ণাঙ্গ মিল খাতা ও হাজিরা ব্যবস্থাপনা' : 'Monthly Meal Register & Attendance'}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {isBangla ? 'চলমান চক্র: ' : 'Active Cycle: '}
            <strong className="text-slate-200">{cycle?.name || (isBangla ? 'চলতি চক্র' : 'Current Cycle')}</strong>
            {' | '}
            {isBangla ? 'লাইভ মিল রেট: ' : 'Live Meal Rate: '}
            <strong className="text-emerald-400">৳{liveMealRate}</strong>
          </p>
        </div>

        {currentUser.role !== 'super_admin' ? (
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => {
                setEditingLeave(null);
                setIsLeaveModalOpen(true);
              }}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-750 text-amber-300 border border-amber-500/30 text-xs font-semibold px-3.5 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>
                {isManager
                  ? (isBangla ? 'ছুটি / মিল বন্ধ শিডিউল' : 'Schedule Member Leave')
                  : (isBangla ? 'ছুটির আবেদন (Leave Request)' : 'Request Leave / Vacation')}
              </span>
            </button>
            <button
              onClick={onOpenRequestModal}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-500/25 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{isBangla ? 'মিল অফ/অন আবেদন' : 'Meal On/Off Request'}</span>
            </button>
          </div>
        ) : (
          <div className="text-xs bg-amber-500/10 text-amber-300 border border-amber-500/20 px-3.5 py-2 rounded-xl flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-amber-400" />
            <span>{isBangla ? 'সুপার অ্যাডমিন অডিট ভিউ' : 'Super Admin Audit View'}</span>
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
          {isBangla ? 'মাসিক মাস্টার মিল রেজিস্টার' : 'Monthly Master Register'}
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
          {isBangla ? 'দৈনিক হাজিরা ইনপুট শিট' : 'Daily Attendance Sheet'}
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
          {isBangla ? 'তারিখভিত্তিক বিস্তারিত মিল লগ' : 'Date-wise Meal Logs'}
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
          {isBangla ? 'অনুরোধ ও অনুমোদন হাব' : 'Requests & Approvals Hub'}
          {(pendingRequests.length + pendingBazars.length) > 0 && (
            <span className="ml-1 px-1.5 py-0.2 text-[10px] bg-amber-500 text-slate-950 font-black rounded-full animate-pulse">
              {pendingRequests.length + pendingBazars.length}
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
                <span>{isBangla ? 'সর্বমোট মাসিক মিল' : 'Total Monthly Meals'}</span>
                <Utensils className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono mt-1">
                {formatMealUnits(totalMonthUnits)} <span className="text-xs font-normal text-slate-400">{isBangla ? 'ইউনিট' : 'Units'}</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                {isBangla
                  ? `সকাল: ${totalMonthMorning} | রাত: ${totalMonthNight}`
                  : `Morning: ${totalMonthMorning} | Night: ${totalMonthNight}`}
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-4 border border-indigo-500/20 bg-indigo-950/10">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>{isBangla ? 'সক্রিয় মিল বর্ডার' : 'Active Dining Members'}</span>
                <UserCheck className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-indigo-300 font-mono mt-1">
                {memberMonthlyStats.length} <span className="text-xs font-normal text-slate-400">{isBangla ? 'জন' : 'Members'}</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                {isBangla
                  ? `সদস্য প্রতি গড়: ${memberMonthlyStats.length > 0 ? formatMealUnits(totalMonthUnits / memberMonthlyStats.length) : 0} মিল`
                  : `Avg per member: ${memberMonthlyStats.length > 0 ? formatMealUnits(totalMonthUnits / memberMonthlyStats.length) : 0} meals`}
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-4 border border-purple-500/20 bg-purple-950/10">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>{isBangla ? 'লাইভ মিল রেট' : 'Live Meal Rate'}</span>
                <Zap className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-purple-300 font-mono mt-1">
                ৳{liveMealRate}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                {isBangla ? 'অনুমোদিত বাজার ÷ মোট মিল' : 'Approved Bazar ÷ Total Meals'}
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-4 border border-cyan-500/20 bg-cyan-950/10">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>{isBangla ? 'আনুমানিক খাদ্য বিল' : 'Estimated Food Bill'}</span>
                <Save className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-cyan-300 font-mono mt-1">
                {formatTaka(totalEstimatedFoodCost)}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                {isBangla ? 'চলমান চক্রের মোট মিল খরচ' : 'Total food cost this cycle'}
              </div>
            </div>
          </div>

          {/* Master Register DataTable */}
          <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Table className="w-4 h-4 text-emerald-400" />
                  <span>
                    {isBangla
                      ? `সদস্যদের মাসিক পূর্ণাঙ্গ মিল তালিকা (${filteredRegister.length} জন)`
                      : `Monthly Member Meal Breakdown (${filteredRegister.length} Members)`}
                  </span>
                </h4>
                <p className="text-xs text-slate-400">
                  {isBangla
                    ? 'চলমান মাসে কার কয়টা সকালের ও রাতের মিল হয়েছে এবং আনুমানিক খাবার খরচের সারসংক্ষেপ'
                    : 'Summary of breakfast, lunch, and dinner counts along with estimated food charges'}
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
                    placeholder={isBangla ? 'সদস্যের নাম দিয়ে খুঁজুন...' : 'Search by member name...'}
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
                  title={isBangla ? 'সম্পূর্ণ মাসের মিল শিট CSV ফাইলে ডাউনলোড করুন' : 'Download full month meals in CSV format'}
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isBangla ? 'CSV এক্সপোর্ট' : 'Export CSV'}</span>
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
                        <span>{isBangla ? 'সদস্যের বিবরণ' : 'Member Details'}</span>
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
                        <span>{isBangla ? 'সকাল' : 'Breakfast'}</span>
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
                        <span>{isBangla ? 'দুপুর' : 'Lunch'}</span>
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
                        <span>{isBangla ? 'রাত' : 'Dinner'}</span>
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
                        <span>{isBangla ? 'মোট মিল ইউনিট' : 'Total Units'}</span>
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
                        <span>{isBangla ? 'খাবার খরচ' : 'Food Cost'}</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-3 px-3 text-center">{isBangla ? 'উপস্থিতি' : 'Attended'}</th>
                    <th className="py-3 px-3 text-center">{isBangla ? 'অ্যাকশন' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                  {filteredRegister.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        {registerSearchQuery
                          ? (isBangla
                              ? `"${registerSearchQuery}" দিয়ে কোনো সদস্য পাওয়া যায়নি`
                              : `No members found matching "${registerSearchQuery}"`)
                          : (isBangla ? 'কোনো সদস্যের মিল রেকর্ড নেই' : 'No meal records found')}
                      </td>
                    </tr>
                  ) : (
                    filteredRegister.map((m) => {
                      const isCurrentUserRow = m.userId === currentUser.id;
                      return (
                        <tr
                          key={m.userId}
                          className={`hover:bg-slate-900/60 transition-colors ${
                            isCurrentUserRow ? 'bg-indigo-950/20' : ''
                          }`}
                        >
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
                                  {isCurrentUserRow && (
                                    <span className="text-[9px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1 rounded font-semibold">
                                      {isBangla ? 'আপনি' : 'You'}
                                    </span>
                                  )}
                                  {m.role === 'admin' && (
                                    <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1 rounded font-normal">
                                      {isBangla ? 'ম্যানেজার' : 'Manager'}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400 block truncate">
                                  {m.email || (isBangla ? 'সদস্য' : 'Resident')}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-200">
                            {m.morningTotal}
                          </td>

                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-200">
                            {m.lunchTotal}
                          </td>

                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-200">
                            {m.nightTotal}
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
                            <span className="font-semibold text-slate-300">{m.attendedDaysCount}</span>{' '}
                            {isBangla ? 'দিন' : 'days'}
                          </td>

                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => {
                                setLogUserFilter(m.userId);
                                setSubTab('logs');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-indigo-600/15 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-[10px] font-semibold transition-all cursor-pointer"
                              title={isBangla ? 'এই সদস্যের সকল তারিখের বিস্তারিত লগ দেখুন' : 'View all date logs for this member'}
                            >
                              {isBangla ? 'লগ দেখুন' : 'View Logs'}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-900 border-t-2 border-slate-800 text-xs font-bold text-slate-200">
                    <td className="py-3 px-3">
                      {isBangla
                        ? `মোট (${filteredRegister.length} জন বর্ডার)`
                        : `Total (${filteredRegister.length} Dining Members)`}
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-amber-300">
                      {filteredRegister.reduce((sum, m) => sum + m.morningTotal, 0)}
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-orange-300">
                      {filteredRegister.reduce((sum, m) => sum + m.lunchTotal, 0)}
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-indigo-300">
                      {filteredRegister.reduce((sum, m) => sum + m.nightTotal, 0)}
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-emerald-400 font-extrabold">
                      {formatMealUnits(filteredRegister.reduce((sum, m) => sum + m.totalUnits, 0))}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-400 font-black">
                      {formatTaka(filteredRegister.reduce((sum, m) => sum + m.estimatedCost, 0))}
                    </td>
                    <td colSpan={2} className="py-3 px-3 text-right text-[10px] text-slate-400">
                      {isBangla ? 'মাসিক চূড়ান্ত মিল রেট:' : 'Cycle Meal Rate:'} ৳{liveMealRate}
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
                  title={isBangla ? 'আগের দিন' : 'Previous Day'}
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
                  title={isBangla ? 'পরের দিন' : 'Next Day'}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setSelectedDate(getTodayStr())}
                  className="text-xs px-2.5 py-2 rounded-xl bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 font-medium transition-all cursor-pointer"
                >
                  {isBangla ? 'আজ' : 'Today'}
                </button>
              </div>

              {/* Quick Fill Actions (Manager only) */}
              {canEditMeals ? (
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    onClick={() => handleSetAll(1)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors cursor-pointer"
                  >
                    {isBangla ? 'সবার মিল ১' : 'All 1 Meal'}
                  </button>
                  <button
                    onClick={() => handleSetAll(0.5)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30 font-medium transition-colors cursor-pointer"
                  >
                    {isBangla ? 'সবার হাফ (০.৫)' : 'All Half (0.5)'}
                  </button>
                  <button
                    onClick={() => handleSetAll(0)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors cursor-pointer"
                  >
                    {isBangla ? 'সবার মিল ০' : 'All 0 Meal'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingLeave(null);
                      setIsLeaveModalOpen(true);
                    }}
                    className="text-xs px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-semibold transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{isBangla ? '+ ছুটি দিন' : '+ Add Leave'}</span>
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
                    {isSaving
                      ? (isBangla ? 'সংরক্ষণ হচ্ছে...' : 'Saving...')
                      : (isBangla ? 'হাজিরা সংরক্ষণ করুন' : 'Save Attendance')}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                  <Info className="w-3.5 h-3.5 text-indigo-400" />
                  <span>
                    {isBangla
                      ? 'শুধুমাত্র মেস ম্যানেজার হাজিরা ইনপুট সংরক্ষণ করতে পারেন'
                      : 'Only Mess Manager can enter daily attendance'}
                  </span>
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
                <span className="text-[11px] text-slate-400">{isBangla ? 'সকালের মিল' : 'Breakfast'}</span>
                <p className="text-base font-bold text-white mt-0.5">{totalMorningMeals}</p>
                <span className="text-[10px] text-amber-400/80 font-mono">{isBangla ? 'সকাল' : 'Morning'}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[11px] text-slate-400">{isBangla ? 'দুপুরের মিল' : 'Lunch'}</span>
                <p className="text-base font-bold text-white mt-0.5">{totalLunchMeals}</p>
                <span className="text-[10px] text-orange-400/80 font-mono">{isBangla ? 'দুপুর' : 'Midday'}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[11px] text-slate-400">{isBangla ? 'রাতের মিল' : 'Dinner'}</span>
                <p className="text-base font-bold text-white mt-0.5">{totalNightMeals}</p>
                <span className="text-[10px] text-indigo-400/80 font-mono">{isBangla ? 'রাত' : 'Night'}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[11px] text-indigo-400">{isBangla ? 'মোট মিল ইউনিট' : 'Total Units'}</span>
                <p className="text-base font-bold text-indigo-300 mt-0.5 font-mono">{formatMealUnits(totalMealUnits)}</p>
                <span className="text-[10px] text-indigo-400/80 font-mono">{totalMorningMeals} + {totalLunchMeals} + {totalNightMeals}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[11px] text-slate-400">{isBangla ? 'ডাইনিং সদস্য সংখ্যা' : 'Dining Members'}</span>
                <p className="text-base font-bold text-white mt-0.5">
                  {members.filter((m) => m.role !== 'super_admin').length} {isBangla ? 'জন' : 'members'}
                </p>
              </div>
            </div>
          </div>

          {/* Members Meal Grid */}
          <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-indigo-400" />
                  <span>
                    {isBangla
                      ? `${selectedDate} তারিখের ব্যক্তিগত মিল তালিকা`
                      : `Meal Attendance for ${selectedDate}`}
                  </span>
                </h4>
                <p className="text-xs text-slate-400">
                  {isBangla
                    ? 'সদস্যদের সকাল, দুপুর ও রাতের মিল পরিবর্তন করতে + / - বাটনে ক্লিক করুন'
                    : 'Adjust morning, lunch, and dinner attendance using the +/- controls'}
                </p>
              </div>
            </div>

            {isLoadingDateMeals ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
                <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
                <span>{isBangla ? 'তারিখের মিল লোড হচ্ছে...' : 'Loading date meals...'}</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {members
                  .filter((m) => m.role !== 'super_admin')
                  .map((member) => {
                    const uId = member.userId || member._id;
                    const entry = dailyEntries[uId] || { morning: 0, lunch: 1, night: 1 };
                    const userTotal = entry.morning + (entry.lunch || 0) + entry.night;
                    const leaveInfo = getMemberLeaveForDate(uId, selectedDate);
                    const isCurrentUser = uId === currentUser.id;

                    return (
                      <div
                        key={uId}
                        className={`p-3.5 rounded-xl border transition-all space-y-3 ${
                          leaveInfo
                            ? 'bg-amber-950/20 border-amber-500/40 shadow-sm shadow-amber-500/5'
                            : isCurrentUser
                            ? 'bg-indigo-950/20 border-indigo-500/30'
                            : 'bg-slate-900/70 border-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={member.image || `https://api.dicebear.com/7.x/bottts/svg?seed=${uId}`}
                              alt={member.name}
                              className="w-8 h-8 rounded-xl object-cover border border-slate-700"
                            />
                            <div className="truncate">
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="font-semibold text-slate-200 text-xs block truncate">
                                  {member.name}
                                </span>
                                {isCurrentUser && (
                                  <span className="text-[9px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1 rounded font-semibold shrink-0">
                                    {isBangla ? 'আপনি' : 'You'}
                                  </span>
                                )}
                              </div>
                              {leaveInfo ? (
                                <span className="text-[10px] text-amber-300 font-medium block truncate flex items-center gap-1">
                                  🌴 {isBangla ? 'ছুটিতে আছেন' : 'On Leave'} ({leaveInfo.startDate} {isBangla ? 'হতে' : 'to'} {leaveInfo.endDate})
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-500 block truncate">
                                  {member.email || (isBangla ? 'মেস সদস্য' : 'Resident')}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-[10px] text-slate-400 block">{isBangla ? 'মোট ইউনিট' : 'Total Units'}</span>
                            <span className={`font-mono font-bold text-xs ${leaveInfo && userTotal === 0 ? 'text-amber-400' : 'text-indigo-300'}`}>
                              {formatMealUnits(userTotal)}
                            </span>
                          </div>
                        </div>

                        {/* Controls for 3 Meal Slots */}
                        <div className="grid grid-cols-3 gap-1.5 text-xs">
                          {/* Morning */}
                          <div className="flex flex-col items-center justify-between bg-slate-950/60 p-2 rounded-lg border border-slate-800/60 gap-1.5">
                            <span className="text-[11px] font-semibold text-amber-300">{isBangla ? 'সকাল' : 'Breakfast'}</span>
                            <div className="flex items-center gap-1">
                              {canEditMeals && (
                                <button
                                  onClick={() => updateCount(uId, 'morning', -0.5)}
                                  className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center transition-colors cursor-pointer"
                                  title={isBangla ? '০.৫ কমান' : 'Reduce 0.5'}
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
                                  title={isBangla ? '০.৫ বাড়ান' : 'Increase 0.5'}
                                >
                                  +
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Lunch */}
                          <div className="flex flex-col items-center justify-between bg-slate-950/60 p-2 rounded-lg border border-slate-800/60 gap-1.5">
                            <span className="text-[11px] font-semibold text-orange-300">{isBangla ? 'দুপুর' : 'Lunch'}</span>
                            <div className="flex items-center gap-1">
                              {canEditMeals && (
                                <button
                                  onClick={() => updateCount(uId, 'lunch', -0.5)}
                                  className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center transition-colors cursor-pointer"
                                  title={isBangla ? '০.৫ কমান' : 'Reduce 0.5'}
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
                                  title={isBangla ? '০.৫ বাড়ান' : 'Increase 0.5'}
                                >
                                  +
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Night */}
                          <div className="flex flex-col items-center justify-between bg-slate-950/60 p-2 rounded-lg border border-slate-800/60 gap-1.5">
                            <span className="text-[11px] font-semibold text-indigo-300">{isBangla ? 'রাত' : 'Dinner'}</span>
                            <div className="flex items-center gap-1">
                              {canEditMeals && (
                                <button
                                  onClick={() => updateCount(uId, 'night', -0.5)}
                                  className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center transition-colors cursor-pointer"
                                  title={isBangla ? '০.৫ কমান' : 'Reduce 0.5'}
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
                                  title={isBangla ? '০.৫ বাড়ান' : 'Increase 0.5'}
                                >
                                  +
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Leave Helper & Early Resume Action */}
                        {leaveInfo && (
                          <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-amber-500/20">
                            <span className="text-amber-400/90 text-[10px] font-medium">
                              {userTotal === 0
                                ? (isBangla ? 'অটো বন্ধ (ছুটি চলছে)' : 'Auto Off (On Leave)')
                                : (isBangla ? 'মিল সক্রিয় করা হয়েছে' : 'Meals Resumed')}
                            </span>
                            {canEditMeals && userTotal === 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  updateCount(uId, 'lunch', 1);
                                  updateCount(uId, 'night', 1);
                                }}
                                className="text-[10px] text-amber-300 hover:text-amber-200 font-semibold underline cursor-pointer"
                              >
                                {isBangla ? 'আগে ফিরেছেন? মিল ১ করুন' : 'Returned early? Set to 1'}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 3: DATE-WISE GROUPED MEAL LOGS (MONTH DAY 1 -> 30) */}
      {subTab === 'logs' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Main Container Card */}
          <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-slate-800 space-y-4">
            {/* Header & Overall Summary */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-3 border-b border-slate-800/80">
              <div>
                <h4 className="text-base font-black text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-400" />
                  <span>
                    {isBangla
                      ? `তারিখভিত্তিক পূর্ণাঙ্গ মিল লগ (${filteredDailyGroups.length} দিন)`
                      : `Date-wise Meal Logs (${filteredDailyGroups.length} Days)`}
                  </span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isBangla
                    ? 'প্রতিদিনের সদস্যভিত্তিক সকাল, দুপুর ও রাতের মিল গ্রহণের তালিকা ও বিস্তারিত হিসাব'
                    : 'Daily member breakfast, lunch, and dinner attendance records organized by date'}
                </p>
              </div>

              {/* Quick Summary Badges */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-semibold flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  <span>
                    {isBangla ? 'সক্রিয় দিন:' : 'Active Days:'}{' '}
                    <strong className="text-white font-mono">{filteredDailyGroups.length}</strong>{' '}
                    {isBangla ? 'দিন' : 'days'}
                  </span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-bold font-mono flex items-center gap-1.5">
                  <Utensils className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {isBangla ? 'সর্বমোট মিল:' : 'Total Meals:'}{' '}
                    {formatMealUnits(
                      filteredDailyGroups.reduce((sum, g) => sum + g.totalDayUnits, 0)
                    )}{' '}
                    {isBangla ? 'ইউনিট' : 'units'}
                  </span>
                </div>
              </div>
            </div>

            {/* Powerful Filter & Sort Toolbar */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-3 bg-slate-950/70 rounded-xl border border-slate-850">
              {/* Left Controls: Sort Order & Attendance Filter */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Chronological Sort Toggle (Day 1 -> 30 default) */}
                <button
                  type="button"
                  onClick={() => setLogSortOrder(logSortOrder === 'asc' ? 'desc' : 'asc')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-bold transition-all cursor-pointer shadow-sm"
                  title={
                    isBangla
                      ? 'তারিখের ক্রমানুসার পরিবর্তন করুন'
                      : 'Toggle chronological sort order'
                  }
                >
                  <ArrowUpDown className="w-3.5 h-3.5 text-indigo-400" />
                  <span>
                    {logSortOrder === 'asc'
                      ? isBangla
                        ? 'তারিখ: ১ হতে ৩০ (১ম দিন আগে)'
                        : 'Date: 1 to 30 (Day 1 First)'
                      : isBangla
                      ? 'তারিখ: ৩০ হতে ১ (সর্বশেষ আগে)'
                      : 'Date: 30 to 1 (Newest First)'}
                  </span>
                </button>

                {/* Attendance Segmented Filter */}
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setLogAttendanceFilter('eaters')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      logAttendanceFilter === 'eaters'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {isBangla ? 'খাবার গ্রহণকারী' : 'Eaters Only'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogAttendanceFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      logAttendanceFilter === 'all'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {isBangla ? 'সকল সদস্য' : 'All Members'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogAttendanceFilter('off')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      logAttendanceFilter === 'off'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {isBangla ? 'মিল বন্ধ / ০' : 'Meal Off'}
                  </button>
                </div>
              </div>

              {/* Right Controls: Date Dropdown, Member Dropdown & Search */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Date Dropdown */}
                <select
                  value={logDateFilter}
                  onChange={(e) => setLogDateFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-750 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 outline-none cursor-pointer focus:border-indigo-500"
                >
                  <option value="">{isBangla ? 'সকল তারিখ (পুরো মাস)' : 'All Dates (Full Month)'}</option>
                  {uniqueDates.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>

                {/* Member Dropdown */}
                <select
                  value={logUserFilter}
                  onChange={(e) => setLogUserFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-750 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 outline-none cursor-pointer focus:border-indigo-500"
                >
                  <option value="">{isBangla ? 'সকল সদস্য' : 'All Members'}</option>
                  {members
                    .filter((m) => m.role !== 'super_admin')
                    .map((m) => (
                      <option key={m.userId || m._id} value={m.userId || m._id}>
                        {m.displayName || m.name}
                      </option>
                    ))}
                </select>

                {/* Search query */}
                <div className="relative flex-1 sm:flex-none">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={logSearchQuery}
                    onChange={(e) => setLogSearchQuery(e.target.value)}
                    placeholder={isBangla ? 'নাম বা তারিখ দিয়ে খুঁজুন...' : 'Search name or date...'}
                    className="bg-slate-900 border border-slate-750 rounded-xl pl-8 pr-6 py-1.5 text-xs text-slate-200 outline-none w-full sm:w-44 focus:border-indigo-500"
                  />
                  {logSearchQuery && (
                    <button
                      onClick={() => setLogSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Date-by-Date Grouped Cards List */}
            {filteredDailyGroups.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 bg-slate-950/40 rounded-2xl border border-dashed border-slate-800 space-y-3">
                <Utensils className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="font-semibold text-slate-400">
                  {isBangla ? 'কোনো মিল লগ পাওয়া যায়নি' : 'No meal logs matched your filter'}
                </p>
                {(logDateFilter || logUserFilter || logSearchQuery) && (
                  <button
                    type="button"
                    onClick={() => {
                      setLogDateFilter('');
                      setLogUserFilter('');
                      setLogSearchQuery('');
                      setLogAttendanceFilter('eaters');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-semibold cursor-pointer"
                  >
                    {isBangla ? 'ফিল্টার রিসেট করুন' : 'Reset Filters'}
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-5">
                {filteredDailyGroups.map((group) => (
                  <div
                    key={group.date}
                    className="glass-panel rounded-2xl border border-slate-800/90 bg-slate-900/60 p-4 sm:p-5 space-y-4 hover:border-slate-750 transition-all shadow-md"
                  >
                    {/* Date Card Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                      <div className="flex items-center gap-3">
                        {/* Day Number Pill */}
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600/15 border border-indigo-500/30 flex flex-col items-center justify-center text-indigo-400 shrink-0 shadow-lg shadow-indigo-600/10">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                            {isBangla ? 'দিন' : 'Day'}
                          </span>
                          <span className="font-black text-lg font-mono leading-none text-white">
                            {group.dayNumber}
                          </span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-black text-white text-base sm:text-lg">
                              {group.formattedDate}
                            </h3>
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-medium">
                              {group.dayName}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5 font-mono">
                            {group.date}
                          </p>
                        </div>
                      </div>

                      {/* Day Stats Badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold font-mono flex items-center gap-1.5 shadow-sm">
                          <Utensils className="w-3.5 h-3.5" />
                          <span>
                            {isBangla ? 'মোট মিল:' : 'Total:'}{' '}
                            {formatMealUnits(group.totalDayUnits)} {isBangla ? 'টি' : 'units'}
                          </span>
                        </div>
                        <div className="px-3 py-1.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-bold flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>
                            {group.eaterCount} {isBangla ? 'জন খেয়েছেন' : 'Ate Today'}
                          </span>
                        </div>
                        <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-400 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800 font-mono">
                          <span title={isBangla ? 'সকালের মোট' : 'Morning total'}>
                            🌅 {formatMealUnits(group.totalMorning)}
                          </span>
                          <span>•</span>
                          <span title={isBangla ? 'দুপুরের মোট' : 'Lunch total'}>
                            ☀️ {formatMealUnits(group.totalLunch)}
                          </span>
                          <span>•</span>
                          <span title={isBangla ? 'রাতের মোট' : 'Dinner total'}>
                            🌙 {formatMealUnits(group.totalNight)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Members Grid for this Date */}
                    {group.displayMembers.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
                        {logAttendanceFilter === 'eaters'
                          ? isBangla
                            ? 'এই দিনে কোনো সদস্যের খাবার চালু ছিল না'
                            : 'No members ate on this date'
                          : isBangla
                          ? 'এই দিনে কোনো রেকর্ড মেলেনি'
                          : 'No records matched for this date'}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                        {group.displayMembers.map((m) => (
                          <div
                            key={m.userId}
                            className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                              m.total > 0
                                ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700 shadow-sm'
                                : 'bg-slate-950/50 border-slate-850 opacity-75'
                            }`}
                          >
                            {/* Member Card Header */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <img
                                  src={m.image}
                                  alt={m.name}
                                  className="w-9 h-9 rounded-xl object-cover border border-slate-700 shrink-0"
                                />
                                <div className="min-w-0">
                                  <p className="font-bold text-white text-xs truncate flex items-center gap-1.5">
                                    <span>{m.name}</span>
                                    {currentUser &&
                                      (currentUser.id === m.userId ||
                                        (currentUser as any).userId === m.userId) && (
                                        <span className="text-[9px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.2 rounded font-semibold shrink-0">
                                          {isBangla ? 'আপনি' : 'You'}
                                        </span>
                                      )}
                                  </p>
                                  <span
                                    className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${
                                      m.total > 0
                                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                        : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                    }`}
                                  >
                                    {m.mealStatusText}
                                  </span>
                                </div>
                              </div>

                              {/* Total Units Big Pill */}
                              <div className="text-right shrink-0">
                                <span className="font-mono font-black text-sm text-emerald-400 block">
                                  {formatMealUnits(m.total)} {isBangla ? 'মিল' : 'meals'}
                                </span>
                                <span className="text-[10px] text-slate-400 block font-mono">
                                  ≈ {formatTaka(m.estimatedCost)}
                                </span>
                              </div>
                            </div>

                            {/* Visual Meal Slot Chips (Morning, Lunch, Dinner) */}
                            <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
                              {/* Morning */}
                              <div
                                className={`py-1 px-1.5 rounded-lg border font-medium ${
                                  m.morning > 0
                                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 font-bold'
                                    : 'bg-slate-950 border-slate-800/80 text-slate-600'
                                }`}
                              >
                                <span className="block text-[9px] text-slate-400">
                                  {isBangla ? 'সকাল' : 'Breakfast'}
                                </span>
                                <span className="font-mono">{m.morning > 0 ? m.morning : '০'}</span>
                              </div>

                              {/* Lunch */}
                              <div
                                className={`py-1 px-1.5 rounded-lg border font-medium ${
                                  m.lunch > 0
                                    ? 'bg-orange-500/10 border-orange-500/30 text-orange-300 font-bold'
                                    : 'bg-slate-950 border-slate-800/80 text-slate-600'
                                }`}
                              >
                                <span className="block text-[9px] text-slate-400">
                                  {isBangla ? 'দুপুর' : 'Lunch'}
                                </span>
                                <span className="font-mono">{m.lunch > 0 ? m.lunch : '০'}</span>
                              </div>

                              {/* Dinner */}
                              <div
                                className={`py-1 px-1.5 rounded-lg border font-medium ${
                                  m.night > 0
                                    ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300 font-bold'
                                    : 'bg-slate-950 border-slate-800/80 text-slate-600'
                                }`}
                              >
                                <span className="block text-[9px] text-slate-400">
                                  {isBangla ? 'রাত' : 'Dinner'}
                                </span>
                                <span className="font-mono">{m.night > 0 ? m.night : '০'}</span>
                              </div>
                            </div>

                            {/* Action Buttons: View Details & Edit (Delete Commented Out per User Instruction) */}
                            <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-800/60">
                              <button
                                type="button"
                                onClick={() =>
                                  setViewingDetailItem({
                                    date: group.date,
                                    formattedDate: group.formattedDate,
                                    dayName: group.dayName,
                                    dayNumber: group.dayNumber,
                                    userId: m.userId,
                                    name: m.name,
                                    email: m.email,
                                    image: m.image,
                                    morning: m.morning,
                                    lunch: m.lunch,
                                    night: m.night,
                                    total: m.total,
                                    mealStatusText: m.mealStatusText,
                                    mealStatusType: m.mealStatusType,
                                    estimatedCost: m.estimatedCost,
                                  })
                                }
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
                                title={isBangla ? 'মিল বিস্তারিত দেখুন' : 'View meal details'}
                              >
                                <Eye className="w-3.5 h-3.5 text-indigo-400" />
                                <span>{isBangla ? 'বিস্তারিত' : 'View Details'}</span>
                              </button>

                              {canEditMeals && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditingLogItem({
                                      date: group.date,
                                      userId: m.userId,
                                      name: m.name,
                                      morning: m.morning,
                                      lunch: m.lunch,
                                      night: m.night,
                                    })
                                  }
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-bold transition-all cursor-pointer"
                                  title={isBangla ? 'মিল সংখ্যা সংশোধন করুন' : 'Edit meal count'}
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                  <span>{isBangla ? 'সংশোধন' : 'Edit'}</span>
                                </button>
                              )}

                              {/*
                                [USER INSTRUCTION]: "delete er proyojon nai ayta comment kore rakho karon delete korle problem hobe edit kore 0 kore dewa jabe so delete er proyojon nai"
                                Delete button intentionally commented out to prevent accidental deletion of meal log history:
                                <button
                                  onClick={() => handleDeleteMealLog(group.date, m.userId, m.name)}
                                  className="p-1.5 rounded-lg bg-rose-600/20 text-rose-300 border border-rose-500/30 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              */}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* POPUP 1: VIEW DETAILS MODAL FOR INDIVIDUAL MEMBER DAY BREAKDOWN */}
      {viewingDetailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl animate-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <img
                  src={viewingDetailItem.image}
                  alt={viewingDetailItem.name}
                  className="w-11 h-11 rounded-2xl object-cover border-2 border-indigo-500/40 shadow-md shadow-indigo-500/10"
                />
                <div>
                  <h4 className="font-bold text-white text-sm sm:text-base flex items-center gap-1.5">
                    <span>{viewingDetailItem.name}</span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    📅 {viewingDetailItem.formattedDate} ({viewingDetailItem.dayName}) •{' '}
                    {isBangla ? `দিন ${viewingDetailItem.dayNumber}` : `Day ${viewingDetailItem.dayNumber}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingDetailItem(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 3 Meal Slots Detailed Cards */}
            <div className="space-y-2.5">
              {/* Morning Slot */}
              <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300">
                    <Sun className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-amber-200 block">
                      {isBangla ? 'সকালের মিল (Breakfast)' : 'Morning / Breakfast'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {isBangla ? 'সাধারণ ওয়েট: ০.৫ ইউনিট' : 'Standard Weight: 0.5 units'}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full ${
                      viewingDetailItem.morning > 0
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-900 text-slate-500 border border-slate-800'
                    }`}
                  >
                    {viewingDetailItem.morning > 0
                      ? `${viewingDetailItem.morning} ${isBangla ? 'ইউনিট (খাওয়া হয়েছে)' : 'Units (Taken)'}`
                      : isBangla
                      ? '০ (খায়নি / বন্ধ)'
                      : '0 (Not Taken)'}
                  </span>
                </div>
              </div>

              {/* Lunch Slot */}
              <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-300">
                    <Utensils className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-orange-200 block">
                      {isBangla ? 'দুপুরের মিল (Lunch)' : 'Midday / Lunch'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {isBangla ? 'সাধারণ ওয়েট: ১.০ ইউনিট' : 'Standard Weight: 1.0 unit'}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full ${
                      viewingDetailItem.lunch > 0
                        ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                        : 'bg-slate-900 text-slate-500 border border-slate-800'
                    }`}
                  >
                    {viewingDetailItem.lunch > 0
                      ? `${viewingDetailItem.lunch} ${isBangla ? 'ইউনিট (খাওয়া হয়েছে)' : 'Units (Taken)'}`
                      : isBangla
                      ? '০ (খায়নি / বন্ধ)'
                      : '0 (Not Taken)'}
                  </span>
                </div>
              </div>

              {/* Night Slot */}
              <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-300">
                    <Moon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-indigo-200 block">
                      {isBangla ? 'রাতের মিল (Dinner)' : 'Night / Dinner'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {isBangla ? 'সাধারণ ওয়েট: ১.০ ইউনিট' : 'Standard Weight: 1.0 unit'}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full ${
                      viewingDetailItem.night > 0
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                        : 'bg-slate-900 text-slate-500 border border-slate-800'
                    }`}
                  >
                    {viewingDetailItem.night > 0
                      ? `${viewingDetailItem.night} ${isBangla ? 'ইউনিট (খাওয়া হয়েছে)' : 'Units (Taken)'}`
                      : isBangla
                      ? '০ (খায়নি / বন্ধ)'
                      : '0 (Not Taken)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Summary Box with Calculation */}
            <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/30 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">
                  {isBangla ? 'এই দিনের মোট মিল:' : 'Day Total Units:'}
                </span>
                <span className="font-mono font-bold text-indigo-200">
                  {formatMealUnits(viewingDetailItem.total)} {isBangla ? 'ইউনিট' : 'Units'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">
                  {isBangla ? 'লাইভ মিল রেট:' : 'Live Meal Rate:'}
                </span>
                <span className="font-mono text-slate-300">
                  {formatTaka(liveMealRate)} / {isBangla ? 'মিল' : 'meal'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1.5 border-t border-indigo-500/20 font-bold">
                <span className="text-emerald-300">
                  {isBangla ? 'আনুমানিক খাবার খরচ:' : 'Estimated Cost:'}
                </span>
                <span className="font-mono text-sm text-emerald-400">
                  {formatTaka(viewingDetailItem.estimatedCost)}
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setViewingDetailItem(null)}
                className="px-4 py-2 rounded-xl text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 transition-colors cursor-pointer"
              >
                {isBangla ? 'বন্ধ করুন' : 'Close'}
              </button>
              {canEditMeals && (
                <button
                  type="button"
                  onClick={() => {
                    const itemToEdit = {
                      date: viewingDetailItem.date,
                      userId: viewingDetailItem.userId,
                      name: viewingDetailItem.name,
                      morning: viewingDetailItem.morning,
                      lunch: viewingDetailItem.lunch,
                      night: viewingDetailItem.night,
                    };
                    setViewingDetailItem(null);
                    setEditingLogItem(itemToEdit);
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>{isBangla ? 'মিল সংশোধন করুন' : 'Edit Meal Count'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* POPUP 2: QUICK EDIT MODAL FOR PAST MEAL CORRECTIONS (WITH ZERO-OUT BUTTON) */}
      {editingLogItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  <Utensils className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    {isBangla ? 'মিল সংশোধন' : 'Edit Meal Record'}
                  </h4>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {editingLogItem.date} • {editingLogItem.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
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
                  <span className="text-xs font-semibold text-amber-300 block">
                    {isBangla ? 'সকালের মিল' : 'Breakfast'}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {isBangla ? 'সকালের খাবার' : 'Morning Slot'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
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
                    type="button"
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
                  <span className="text-xs font-semibold text-orange-300 block">
                    {isBangla ? 'দুপুরের মিল' : 'Lunch'}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {isBangla ? 'দুপুরের খাবার' : 'Midday Slot'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
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
                    type="button"
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
                  <span className="text-xs font-semibold text-indigo-300 block">
                    {isBangla ? 'রাতের মিল' : 'Dinner'}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {isBangla ? 'রাতের খাবার' : 'Night Slot'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
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
                    type="button"
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
                <span className="text-xs text-indigo-300">
                  {isBangla ? 'হিসাবকৃত মোট মিল ইউনিট:' : 'Calculated Total Units:'}
                </span>
                <span className="font-mono font-bold text-sm text-indigo-200">
                  {formatMealUnits(
                    editingLogItem.morning + (editingLogItem.lunch || 0) + editingLogItem.night
                  )}{' '}
                  {isBangla ? 'ইউনিট' : 'Units'}
                </span>
              </div>
            </div>

            {/* Bottom Modal Actions (With Quick Zero-Out Button) */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() =>
                  setEditingLogItem({
                    ...editingLogItem,
                    morning: 0,
                    lunch: 0,
                    night: 0,
                  })
                }
                className="px-2.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1"
                title={isBangla ? 'এই দিনের সকল মিল ০ করুন' : 'Reset all meals to 0 for this day'}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isBangla ? 'সব মিল ০ করুন' : 'Set All to 0'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingLogItem(null)}
                  className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {isBangla ? 'বাতিল' : 'Cancel'}
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
                  {isSavingLogEdit
                    ? isBangla
                      ? 'সংরক্ষণ হচ্ছে...'
                      : 'Saving...'
                    : isBangla
                    ? 'সংরক্ষণ করুন'
                    : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: ORGANIZED & CATEGORIZED REQUEST MANAGEMENT HUB */}
      {subTab === 'requests' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Top Category Tabs: Meals, Bazars, Leaves */}
          <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-950/80 rounded-2xl border border-slate-800">
            <button
              onClick={() => setRequestCategory('meals')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                requestCategory === 'meals'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>{isBangla ? 'মিলের আবেদন' : 'Meal Requests'}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-500/30 font-mono">
                {requests.length}
              </span>
            </button>

            <button
              onClick={() => setRequestCategory('bazars')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                requestCategory === 'bazars'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>{isBangla ? 'বাজার খরচের আবেদন' : 'Bazar Requests'}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  pendingBazars.length > 0
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-900 text-slate-400'
                }`}
              >
                {pendingBazars.length}
              </span>
            </button>

            <button
              onClick={() => setRequestCategory('leaves')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                requestCategory === 'leaves'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{isBangla ? 'মেসের ছুটি ও অনুপস্থিতি শিডিউল' : 'Leave Schedules'}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-500/30 font-mono">
                {activeLeaves.length}
              </span>
            </button>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="glass-panel rounded-2xl p-4 border border-slate-800 space-y-3 bg-slate-900/80">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Search Box */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={requestSearch}
                  onChange={(e) => setRequestSearch(e.target.value)}
                  placeholder={
                    isBangla
                      ? 'সদস্যের নাম বা কারণ দিয়ে খুঁজুন...'
                      : 'Search by member name or reason...'
                  }
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                {requestSearch && (
                  <button
                    onClick={() => setRequestSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1 overflow-x-auto">
                {(['all', 'pending', 'approved', 'rejected'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setRequestStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                      requestStatusFilter === st
                        ? 'bg-slate-800 text-white border border-slate-700'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {st === 'all'
                      ? isBangla
                        ? 'সব অবস্থা'
                        : 'All Status'
                      : st === 'pending'
                      ? isBangla
                        ? 'অপেক্ষমান'
                        : 'Pending'
                      : st === 'approved'
                      ? isBangla
                        ? 'অনুমোদিত'
                        : 'Approved'
                      : isBangla
                      ? 'বাতিল'
                      : 'Rejected'}
                  </button>
                ))}
              </div>

              {/* Type Filter (for meal category) */}
              {requestCategory === 'meals' && (
                <div className="flex items-center gap-1 justify-end">
                  {(['all', 'off', 'on'] as const).map((tp) => (
                    <button
                      key={tp}
                      onClick={() => setRequestTypeFilter(tp)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        requestTypeFilter === tp
                          ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                          : 'text-slate-400 hover:text-slate-300'
                      }`}
                    >
                      {tp === 'all'
                        ? isBangla
                          ? 'সব ধরন'
                          : 'All Types'
                        : tp === 'off'
                        ? isBangla
                          ? 'মিল অফ / ছুটি'
                          : 'Meal Off / Leave'
                        : isBangla
                        ? 'মিল চালু'
                        : 'Meal On'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* CATEGORY 1: MEAL REQUESTS */}
          {requestCategory === 'meals' && (
            <div className="space-y-3">
              {filteredMealRequests.length === 0 ? (
                <div className="glass-panel rounded-2xl p-8 text-center text-xs text-slate-500 border border-slate-800">
                  {isBangla ? 'কোনো মিল অনুরোধ পাওয়া যায়নি' : 'No meal requests found'}
                </div>
              ) : (
                filteredMealRequests.map((req) => (
                  <div
                    key={req._id}
                    className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-slate-700 transition-all"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-sm">
                          {req.userName || (isBangla ? 'সদস্য' : 'Member')}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            req.action === 'off'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {req.action === 'off'
                            ? isBangla
                              ? 'মিল অফ (Off / ছুটি)'
                              : 'Meal Off / Leave'
                            : isBangla
                            ? 'মিল চালু (On)'
                            : 'Meal On'}
                        </span>
                        {req.isLate && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30 flex items-center gap-1 font-semibold">
                            <AlertTriangle className="w-3 h-3" />{' '}
                            {isBangla ? 'Late রিকোয়েস্ট' : 'Late Request'}
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            req.status === 'pending'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : req.status === 'approved'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {req.status === 'pending'
                            ? isBangla
                              ? 'অপেক্ষমান'
                              : 'Pending'
                            : req.status === 'approved'
                            ? isBangla
                              ? 'অনুমোদিত'
                              : 'Approved'
                            : isBangla
                            ? 'বাতিল'
                            : 'Rejected'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        {req.startDate && req.endDate && req.startDate !== req.endDate ? (
                          <span>
                            {isBangla ? 'মেয়াদ:' : 'Period:'}{' '}
                            <strong className="text-slate-200">{req.startDate}</strong>{' '}
                            {isBangla ? 'থেকে' : 'to'}{' '}
                            <strong className="text-slate-200">{req.endDate}</strong>
                          </span>
                        ) : (
                          <span>
                            {isBangla ? 'তারিখ:' : 'Date:'}{' '}
                            <strong className="text-slate-200">{req.date}</strong>
                          </span>
                        )}{' '}
                        | {isBangla ? 'স্লট:' : 'Slot:'}{' '}
                        <strong className="text-slate-300">{req.slotName}</strong>
                        {req.reason && (
                          <span className="text-slate-300"> — &quot;{req.reason}&quot;</span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {/* Member self-edit or manager edit button */}
                      {(String(req.userId) === String(currentUser.id) || canEditMeals) && (
                        <button
                          onClick={() => onOpenRequestModal(req)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-750 text-xs font-semibold transition-all cursor-pointer"
                          title={isBangla ? 'আবেদনটি সম্পাদনা বা পরিবর্তন করুন' : 'Edit this meal request'}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>{isBangla ? 'এডিট' : 'Edit'}</span>
                        </button>
                      )}

                      {req.status === 'pending' && canEditMeals && (
                        <>
                          <button
                            onClick={() => handleReview(req._id, 'approved')}
                            disabled={processingId === req._id}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            {isBangla ? 'অনুমোদন' : 'Approve'}
                          </button>
                          <button
                            onClick={() => handleReview(req._id, 'rejected')}
                            disabled={processingId === req._id}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            {isBangla ? 'বাতিল' : 'Reject'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* CATEGORY 2: BAZAR EXPENSE REQUESTS */}
          {requestCategory === 'bazars' && (
            <div className="space-y-3">
              {filteredBazarRequests.length === 0 ? (
                <div className="glass-panel rounded-2xl p-8 text-center text-xs text-slate-500 border border-slate-800">
                  {isBangla
                    ? 'কোনো অপেক্ষমান বা জমাকৃত বাজার খরচের আবেদন নেই'
                    : 'No pending or submitted bazar requests'}
                </div>
              ) : (
                filteredBazarRequests.map((b) => {
                  const buyer = members.find((m) => (m.userId || m._id) === b.userId);
                  const buyerName =
                    buyer?.displayName ||
                    buyer?.name ||
                    b.userName ||
                    (isBangla ? 'সদস্য' : 'Member');
                  const isPending = b.status === 'pending';

                  return (
                    <div
                      key={b._id}
                      className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-slate-700 transition-all"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white text-sm">{buyerName}</span>
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                            {b.date}
                          </span>
                          <span className="text-xs font-black text-amber-400 font-mono">
                            {formatTaka(b.amount)}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isPending
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : b.status === 'approved'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {isPending
                              ? isBangla
                                ? 'অনুমোদনের অপেক্ষায়'
                                : 'Pending Approval'
                              : b.status === 'approved'
                              ? isBangla
                                ? 'অনুমোদিত'
                                : 'Approved'
                              : isBangla
                              ? 'বাতিল'
                              : 'Rejected'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300">
                          {b.description ||
                            (isBangla ? 'বাজার খরচের ভাউচার' : 'Bazar expense voucher')}
                          {b.type && (
                            <span className="text-slate-500 ml-1.5">
                              (
                              {b.type === 'regular'
                                ? isBangla
                                  ? 'রেগুলার'
                                  : 'Regular'
                                : b.type === 'big'
                                ? isBangla
                                  ? 'বড় বাজার'
                                  : 'Big Bazar'
                                : b.type === 'fixed'
                                ? isBangla
                                  ? 'ফিক্সড ভোজ'
                                  : 'Fixed Feast'
                                : isBangla
                                ? 'অতিরিক্ত বাজার'
                                : 'Extra Bazar'}
                              )
                            </span>
                          )}
                        </p>
                      </div>

                      {isPending && canEditMeals && (
                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          <button
                            onClick={() => handleReviewBazar(b._id, 'approved')}
                            disabled={processingId === b._id}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            {isBangla ? 'অনুমোদন' : 'Approve'}
                          </button>
                          <button
                            onClick={() => handleReviewBazar(b._id, 'rejected')}
                            disabled={processingId === b._id}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            {isBangla ? 'বাতিল' : 'Reject'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* CATEGORY 3: ACTIVE LEAVES & ABSENCE SCHEDULE */}
          {requestCategory === 'leaves' && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-1">
                <span className="text-xs text-slate-400">
                  {isBangla
                    ? 'নির্ধারিত ছুটির দিনগুলোতে সদস্যের মিল দৈনিক ইনপুট শিটে স্বয়ংক্রিয়ভাবে ০ থাকবে'
                    : 'On scheduled leave days, member meal will automatically default to 0 on the daily input sheet'}
                </span>
                <button
                  onClick={() => {
                    setEditingLeave(null);
                    setIsLeaveModalOpen(true);
                  }}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 font-semibold transition-all cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {canEditMeals
                    ? isBangla
                      ? 'নতুন ছুটি নির্ধারণ'
                      : 'Schedule Member Leave'
                    : isBangla
                    ? '+ ছুটির আবেদন'
                    : '+ Request Leave'}
                </button>
              </div>

              {activeLeaves.length === 0 ? (
                <div className="glass-panel rounded-2xl p-8 text-center text-xs text-slate-500 border border-slate-800">
                  {isBangla
                    ? 'বর্তমানে কোনো সদস্যের নির্ধারিত ছুটি সক্রিয় নেই।'
                    : 'No active scheduled leaves at the moment.'}
                </div>
              ) : (
                activeLeaves.map((leave) => {
                  const sDate = leave.startDate || leave.date;
                  const eDate = leave.endDate || sDate;
                  const days =
                    Math.round(
                      (new Date(eDate).getTime() - new Date(sDate).getTime()) /
                        (1000 * 60 * 60 * 24)
                    ) + 1;
                  const currentUId =
                    currentUser?.id ||
                    (currentUser as any)?._id ||
                    (currentUser as any)?.userId;
                  const isMyLeave = Boolean(currentUId && leave.userId === currentUId);

                  return (
                    <div
                      key={leave._id}
                      className="glass-panel p-4 rounded-2xl border border-amber-500/30 bg-amber-950/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-amber-500/50 transition-all"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white text-sm">
                            {leave.userName || (isBangla ? 'সদস্য' : 'Member')}
                          </span>
                          {isMyLeave && (
                            <span className="text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded-full">
                              {isBangla ? 'আপনার ছুটি' : 'Your Leave'}
                            </span>
                          )}
                          <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-mono">
                            🌴 {days} {isBangla ? 'দিন ছুটি' : 'days leave'}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                            {sDate} {isBangla ? 'হতে' : 'to'} {eDate}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300">
                          {leave.reason
                            ? isBangla
                              ? `কারণ: "${leave.reason}"`
                              : `Reason: "${leave.reason}"`
                            : isBangla
                            ? 'ব্যক্তিগত ছুটি'
                            : 'Personal Leave'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {canEditMeals ? (
                          <>
                            <button
                              onClick={() => {
                                setEditingLeave(leave);
                                setIsLeaveModalOpen(true);
                              }}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
                              title={
                                isBangla
                                  ? 'ছুটির তারিখ সংশোধন করুন'
                                  : 'Edit leave dates'
                              }
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              {isBangla ? 'তারিখ সংশোধন' : 'Edit Dates'}
                            </button>
                            <button
                              onClick={() => handleEndLeaveToday(leave)}
                              disabled={processingId === leave._id}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600/80 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer"
                              title={
                                isBangla
                                  ? 'সদস্য আগে ফিরে আসলে ছুটি আজই সমাপ্ত করুন'
                                  : 'End leave today and resume meals if member returned early'
                              }
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              {isBangla ? 'ছুটি সমাপ্ত ও মিল চালু' : 'End Leave & Resume Meals'}
                            </button>
                            <button
                              onClick={() =>
                                handleDeleteLeave(leave._id, leave.userName || 'সদস্য')
                              }
                              disabled={processingId === leave._id}
                              className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all cursor-pointer"
                              title={
                                isBangla
                                  ? 'ছুটি সম্পূর্ণ বাতিল ও মুছুন'
                                  : 'Delete leave schedule completely'
                              }
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : isMyLeave ? (
                          <button
                            onClick={() => handleEndLeaveToday(leave)}
                            disabled={processingId === leave._id}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600/80 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer"
                            title={
                              isBangla
                                ? 'আগে ফিরে আসলে ছুটি আজই সমাপ্ত করে মিল চালু করুন'
                                : 'End leave today and resume meals if returned early'
                            }
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            {isBangla ? 'আগে ফিরেছি, মিল চালু করুন' : 'I am Back, Resume Meals'}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* Member Leave Modal */}
      <MemberLeaveModal
        isOpen={isLeaveModalOpen}
        onClose={() => {
          setIsLeaveModalOpen(false);
          setEditingLeave(null);
        }}
        members={members}
        currentUser={currentUser}
        existingLeave={editingLeave}
        onSuccess={() => {
          onRefresh();
          fetchDateMeals(selectedDate);
          fetchAllCycleMeals();
        }}
      />
    </div>
  );
};
