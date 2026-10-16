'use client';

import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  Plus,
  Sparkles,
  Search,
  Calendar,
  User,
  Filter,
  RotateCcw,
  Tag,
  ChevronDown,
  Trash2,
  Edit2,
  X,
  FileText,
  Eye,
  Printer,
  Package,
  Clock,
  ArrowRight,
  ExternalLink,
  Receipt,
  CheckCircle,
  Check,
} from '@/components/icons';
import { formatTaka } from '@/lib/money';
import { AppUser } from '@/lib/session';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { confirmAction } from '@/lib/alerts';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';

interface BazarTabProps {
  currentUser: AppUser;
  bazars: any[];
  fixedEvents: any[];
  members?: any[];
  slots?: any[];
  onRefresh: () => void;
  onOpenNewBazarModal: () => void;
  onOpenFixedEventModal?: () => void;
}

export const BazarTab: React.FC<BazarTabProps> = ({
  currentUser,
  bazars = [],
  fixedEvents = [],
  members = [],
  slots = [],
  onRefresh,
  onOpenNewBazarModal,
  onOpenFixedEventModal,
}) => {
  const { t, language } = useLanguage();

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [activeTypeFilter, setActiveTypeFilter] = useState<'all' | 'regular' | 'big' | 'extra'>('all');

  // Popups & Modal states
  const [viewingDetailsBazar, setViewingDetailsBazar] = useState<any | null>(null);

  // Edit State
  const [editingBazar, setEditingBazar] = useState<any | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editType, setEditType] = useState('regular');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [processingBazarId, setProcessingBazarId] = useState<string | null>(null);

  const isSuperAdmin = currentUser.role === 'super_admin';
  const isManager = currentUser.role === 'admin' || isSuperAdmin;

  // Today string YYYY-MM-DD
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Today's Active Bazar Duty Slot
  const todaySlot = useMemo(() => {
    return slots.find((s: any) => todayStr >= s.startDate && todayStr <= s.endDate);
  }, [slots, todayStr]);

  const todayDutyUser = useMemo(() => {
    if (!todaySlot) return null;
    if (todaySlot.assignedUsers && todaySlot.assignedUsers.length > 0) {
      return todaySlot.assignedUsers[0];
    }
    const uid = todaySlot.assignedUserIds?.[0];
    return members.find((m: any) => (m.userId || m._id) === uid);
  }, [todaySlot, members]);

  // Unique member options for filter
  const memberOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; image?: string; role?: string }>();
    members.forEach((m: any) => {
      const id = m.userId || m._id;
      if (id && m.name && !map.has(id)) {
        map.set(id, { id, name: m.name, image: m.image, role: m.role });
      }
    });
    bazars.forEach((b: any) => {
      if (b.userId && !map.has(b.userId)) {
        map.set(b.userId, {
          id: b.userId,
          name: b.userName || 'সদস্য',
          image: b.userImage,
          role: b.userRole,
        });
      }
    });
    return Array.from(map.values());
  }, [members, bazars]);

  // Helper to compute member's total bazar spending (excluding fixed feasts which are in Special Feast)
  const getMemberSpending = (userId: string) => {
    const bazarTotal = bazars
      .filter((b) => b.userId === userId && b.status === 'approved' && b.type !== 'fixed')
      .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

    return {
      bazarTotal,
      grandTotal: bazarTotal,
    };
  };

  // Filtered bazars list (Special Feasts are exclusively managed in /dashboard/feasts)
  const filteredBazars = useMemo(() => {
    return bazars.filter((b) => {
      // Exclude special feast vouchers from regular bazar list
      if (b.type === 'fixed') return false;

      // Type filter
      if (activeTypeFilter !== 'all' && b.type !== activeTypeFilter) return false;

      // Member filter
      if (selectedMemberId !== 'all' && b.userId !== selectedMemberId) return false;

      // Date filter
      if (selectedDate && b.date !== selectedDate) return false;

      // Search query (matches description, buyer name, or amount)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const descMatch = (b.description || '').toLowerCase().includes(query);
        const userMatch = (b.userName || '').toLowerCase().includes(query);
        const amountMatch = String(b.amount || '').includes(query);
        const itemMatch = b.items?.some((it: any) => (it.name || '').toLowerCase().includes(query));
        if (!descMatch && !userMatch && !amountMatch && !itemMatch) return false;
      }

      return true;
    });
  }, [bazars, activeTypeFilter, selectedMemberId, selectedDate, searchQuery]);

  // Aggregate stats across all bazars (only approved bazars count in meal pool / fund totals)
  const totalRegularBazar = useMemo(() => {
    return bazars
      .filter((b) => (b.type === 'regular' || !b.type) && b.status === 'approved')
      .reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
  }, [bazars]);

  const totalBigBazar = useMemo(() => {
    return bazars
      .filter((b) => b.type === 'big' && b.status === 'approved')
      .reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
  }, [bazars]);

  const totalExtraBazar = useMemo(() => {
    return bazars
      .filter((b) => b.type === 'extra' && b.status === 'approved')
      .reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
  }, [bazars]);

  const totalFixedEventsCost = useMemo(() => {
    return fixedEvents.reduce((sum, e) => sum + (Number(e.cost) || 0), 0);
  }, [fixedEvents]);

  const totalFilteredAmount = useMemo(() => {
    return filteredBazars.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
  }, [filteredBazars]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedMemberId !== 'all' ||
    selectedDate !== '' ||
    activeTypeFilter !== 'all';

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedMemberId('all');
    setSelectedDate('');
    setActiveTypeFilter('all');
  };

  // Start editing a bazar entry
  const startEdit = (b: any) => {
    setEditingBazar(b);
    setEditAmount(String(b.amount));
    setEditDescription(b.description || '');
    setEditDate(b.date || todayStr);
    setEditType(b.type || 'regular');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBazar) return;
    try {
      setIsSavingEdit(true);
      const res = await fetch('/api/bazars', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingBazar._id,
          amount: Number(editAmount),
          description: editDescription,
          date: editDate,
          type: editType,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('বাজারের খরচ সফলভাবে হালনাগাদ করা হয়েছে!');
        setEditingBazar(null);
        onRefresh();
      } else {
        toast.error(data.error || 'আপডেট ব্যর্থ হয়েছে');
      }
    } catch (err: any) {
      toast.error('নেটওয়ার্ক ত্রুটি ঘটেছে');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Approve bazar entry
  const handleApproveBazar = async (id: string, desc: string) => {
    try {
      setProcessingBazarId(id);
      const res = await fetch('/api/bazars', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          status: 'approved',
          adminUserId: currentUser.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`"${desc || 'বাজার'}" সফলভাবে অনুমোদন করা হয়েছে!`);
        onRefresh();
      } else {
        toast.error(data.error || 'অনুমোদন ব্যর্থ হয়েছে');
      }
    } catch {
      toast.error('নেটওয়ার্ক ত্রুটি ঘটেছে');
    } finally {
      setProcessingBazarId(null);
    }
  };

  // Reject bazar entry
  const handleRejectBazar = async (id: string, desc: string) => {
    const isConfirmed = await confirmAction({
      title: 'বাজার এন্ট্রি বাতিল করবেন?',
      text: `"${desc || 'এই বাজার'}" বাতিল করা হবে এবং হিসাবে যুক্ত হবে না।`,
      icon: 'warning',
      confirmText: 'হ্যাঁ, বাতিল করুন',
      confirmColor: '#e11d48',
    });
    if (!isConfirmed) return;

    try {
      setProcessingBazarId(id);
      const res = await fetch('/api/bazars', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          status: 'rejected',
          adminUserId: currentUser.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`"${desc || 'বাজার'}" বাতিল করা হয়েছে`);
        onRefresh();
      } else {
        toast.error(data.error || 'বাতিল করতে ব্যর্থ হয়েছে');
      }
    } catch {
      toast.error('নেটওয়ার্ক ত্রুটি ঘটেছে');
    } finally {
      setProcessingBazarId(null);
    }
  };

  // Delete bazar entry
  const handleDeleteBazar = async (id: string, desc: string) => {
    const isConfirmed = await confirmAction({
      title: language === 'en' ? 'Delete bazar entry?' : 'বাজার এন্ট্রিটি মুছে ফেলতে চান?',
      text: language === 'en'
        ? `"${desc || 'This bazar'}" will be completely removed from records.`
        : `"${desc || 'এই বাজার'}" তালিকা থেকে সম্পূর্ণ মুছে ফেলা হবে।`,
      icon: 'warning',
      confirmText: language === 'en' ? 'Yes, Delete' : 'হ্যাঁ, মুছে ফেলুন',
      cancelText: language === 'en' ? 'Cancel' : 'বাতিল',
      confirmColor: '#e11d48',
    });

    if (!isConfirmed) return;

    try {
      const res = await fetch(`/api/bazars?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success(language === 'en' ? 'Bazar entry deleted successfully!' : 'বাজার তালিকা থেকে মুছে ফেলা হয়েছে!');
        onRefresh();
      } else {
        toast.error(data.error || (language === 'en' ? 'Failed to delete' : 'মুছে ফেলতে ব্যর্থ হয়েছে'));
      }
    } catch (err: any) {
      toast.error(language === 'en' ? 'Network error occurred' : 'নেটওয়ার্ক ত্রুটি ঘটেছে');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Header Banner & Actions */}
      <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 text-amber-400 shadow-inner">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                {language === 'en' ? 'Bazar List & Expenses Ledger' : 'বাজার তালিকা ও খরচের খাতা'}
              </h2>
              <p className="text-xs text-slate-400">
                {language === 'en'
                  ? 'Member bazar vouchers, itemized breakdowns, and meal pool management'
                  : 'সকল সদস্যের সরাসরি যুক্তকৃত বাজার, আইটেম ফর্দ এবং মিল পুলের স্বয়ংক্রিয় হিসাব'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap self-stretch sm:self-auto justify-end">
          <Link
            href="/dashboard/schedule"
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer shadow-sm"
          >
            <Calendar className="w-4 h-4 text-indigo-400" />
            <span>{language === 'en' ? 'Duty Roster' : 'বাজার ডিউটি রোস্টার'}</span>
          </Link>

          <Link
            href="/dashboard/feasts"
            className="flex items-center gap-1.5 bg-slate-800/90 hover:bg-slate-750 text-amber-300 text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-amber-500/30 transition-all cursor-pointer shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{language === 'en' ? 'Special Feasts' : 'স্পেশাল ভোজ'}</span>
          </Link>

          <button
            onClick={onOpenNewBazarModal}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'en' ? 'Add New Bazar' : 'নতুন বাজার এন্ট্রি করুন'}</span>
          </button>
        </div>
      </div>

      {/* 2. Top 4 Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Regular Bazar */}
        <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950 space-y-1.5 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-medium">
              <ShoppingBag className="w-4 h-4 text-amber-400" />
              {language === 'en' ? 'Regular Meal Bazar' : 'মোট রেগুলার বাজার'}
            </span>
            <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-mono">
              {language === 'en' ? 'Meal Pool' : 'মিল পুল'}
            </span>
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {formatTaka(totalRegularBazar)}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/60">
            <span>
              {language === 'en' ? 'Vouchers: ' : 'ভাউচার সংখ্যা: '}
              {bazars.filter((b) => b.type === 'regular' || !b.type).length} {language === 'en' ? '' : 'টি'}
            </span>
            {totalExtraBazar > 0 && (
              <span className="text-emerald-400">
                {language === 'en' ? 'Extra: ' : 'এক্সট্রা: '}{formatTaka(totalExtraBazar)}
              </span>
            )}
          </div>
        </div>

        {/* Card 2: Big Bazar Cost */}
        <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950 space-y-1.5 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-medium">
              <Package className="w-4 h-4 text-purple-400" />
              {language === 'en' ? 'Big Bazar Cost' : 'বড় বাজার খরচ'}
            </span>
            <span className="text-[10px] bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded-full font-mono">
              {language === 'en' ? 'Monthly Fund' : 'মাসিক ফান্ড'}
            </span>
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {formatTaka(totalBigBazar)}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/60">
            <span>{language === 'en' ? 'Wholesale Vouchers' : 'চাল, তেল ও পাইকারি ভাউচার'}</span>
            <span className="text-purple-300 font-bold">
              {bazars.filter((b) => b.type === 'big').length} {language === 'en' ? '' : 'টি'}
            </span>
          </div>
        </div>

        {/* Card 3: Extra & Non-Meal Bazar */}
        <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950 space-y-1.5 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-medium">
              <Tag className="w-4 h-4 text-emerald-400" />
              {language === 'en' ? 'Extra / Other Bazar' : 'এক্সট্রা ও অন্যান্য বাজার'}
            </span>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono">
              {language === 'en' ? 'Non-Meal' : 'নন-মিল'}
            </span>
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {formatTaka(totalExtraBazar)}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/60">
            <span>
              {language === 'en' ? 'Vouchers: ' : 'ভাউচার: '}
              {bazars.filter((b) => b.type === 'extra').length} {language === 'en' ? '' : 'টি'}
            </span>
            <Link
              href="/dashboard/feasts"
              className="text-amber-400 hover:text-amber-300 font-medium inline-flex items-center gap-1 transition-colors"
            >
              <span>{language === 'en' ? 'Special Feasts →' : 'স্পেশাল ভোজ →'}</span>
            </Link>
          </div>
        </div>

        {/* Card 4: Today's Active Bazar Duty (Live Slot) */}
        <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-emerald-500/40 bg-gradient-to-b from-emerald-950/30 to-slate-950 space-y-1.5 relative overflow-hidden shadow-lg shadow-emerald-500/10">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <Clock className="w-4 h-4 text-emerald-400" />
              {language === 'en' ? "Today's Bazar Duty" : 'আজকের বাজার দায়িত্ব কার?'}
            </span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              আজকের ডিউটি
            </span>
          </div>

          {todayDutyUser ? (
            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={todayDutyUser.image || `https://api.dicebear.com/7.x/bottts/svg?seed=${todayDutyUser.id || todayDutyUser.userId}`}
                  alt={todayDutyUser.name}
                  className="w-10 h-10 rounded-xl object-cover border-2 border-emerald-500/50 shrink-0"
                />
                <div className="truncate">
                  <span className="text-sm font-bold text-white block truncate">
                    {todayDutyUser.name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono block">
                    স্লট #{todaySlot?.slotIndex} ({todaySlot?.startDate?.slice(5)} হতে {todaySlot?.endDate?.slice(5)})
                  </span>
                </div>
              </div>
              <Link
                href="/dashboard/schedule"
                className="p-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 shrink-0 transition-colors"
                title="রোস্টার শিডিউল দেখুন"
              >
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="pt-2 text-xs text-slate-400 flex items-center justify-between">
              <span>আজকের জন্য কোনো স্লট নির্ধারিত নেই</span>
              <Link href="/dashboard/schedule" className="text-indigo-400 hover:underline">
                রোস্টার দেখুন
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* 3. Members Bazar Contribution Overview Bar */}
      {memberOptions.length > 0 && (
        <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-slate-800 space-y-3 bg-slate-900/70">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-400" />
              {language === 'en' ? 'Member Monthly Bazar Contributions' : 'সদস্যদের চলতি মাসের মোট বাজার অবদান'}
            </h4>
            <span className="text-[11px] text-slate-400">
              {language === 'en' ? 'Click any member card to filter vouchers' : 'যেকোনো সদস্যের কার্ডে ক্লিক করে সরাসরি ফিল্টার করুন'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {memberOptions.map((m) => {
              const spending = getMemberSpending(m.id);
              const isSelected = selectedMemberId === m.id;

              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedMemberId(isSelected ? 'all' : m.id)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 group ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-950/40 shadow-md shadow-indigo-500/20'
                      : 'border-slate-800 bg-slate-950/60 hover:bg-slate-900 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={m.image || `https://api.dicebear.com/7.x/bottts/svg?seed=${m.id}`}
                      alt={m.name}
                      className="w-7 h-7 rounded-lg object-cover border border-slate-700 shrink-0"
                    />
                    <div className="truncate">
                      <span className="text-xs font-bold text-white block truncate group-hover:text-indigo-300">
                        {m.name}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-slate-800/80 pt-1.5 space-y-0.5 text-[10px] font-mono">
                    <div className="flex justify-between text-slate-400">
                      <span>{language === 'en' ? 'Bazar:' : 'বাজার:'}</span>
                      <span className="text-emerald-400 font-bold">{formatTaka(spending.bazarTotal)}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Special Feasts Link Banner (Separated into Dedicated Module) */}
      <div className="glass-panel rounded-2xl p-4 border border-amber-500/20 bg-amber-500/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
              <span>{language === 'en' ? 'Special Feast & Event Hub' : 'স্পেশাল ভোজ ও ইভেন্ট হাব'}</span>
              <span className="text-[10px] px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded font-semibold border border-amber-500/30">
                {language === 'en' ? 'Dedicated Menu' : 'স্বতন্ত্র মেনু'}
              </span>
            </h4>
            <p className="text-[11px] sm:text-xs text-slate-400">
              {language === 'en'
                ? 'Special feast requests, member attendance, buyer organizer credit, and settlement math are managed in the Special Feast menu.'
                : 'বিশেষ ভোজের শিডিউল, আবেদন, উপস্থিত সদস্য তালিকা এবং কাটাকাটি হিসাব দেখতে স্পেশাল ভোজ মেনু ব্যবহার করুন।'}
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/feasts"
          className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
        >
          <span>{language === 'en' ? 'Open Special Feasts' : 'স্পেশাল ভোজ মেনু খুলুন'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* 5. Easy Search & Filter Toolbar */}
      <div className="glass-panel rounded-2xl p-4 border border-slate-800 space-y-3 bg-slate-900/80">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'en' ? 'Search by item, name or description...' : 'পণ্যের নাম, জিনিস বা বিবরণ দিয়ে খুঁজুন...'}
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                ×
              </button>
            )}
          </div>

          {/* Member Filter Dropdown */}
          <div className="relative">
            <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              aria-label="Member Filter"
              className="w-full pl-9 pr-8 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white appearance-none focus:outline-none focus:border-amber-500 transition-colors cursor-pointer"
            >
              <option value="all">{language === 'en' ? 'All Members (Buyers)' : 'সকল সদস্য (ক্রেতা)'}</option>
              {memberOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Date Filter */}
          <div className="relative">
            <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              aria-label="Date Filter"
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 transition-colors cursor-pointer font-mono"
            />
          </div>

          {/* Reset Filters & Count */}
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs border border-slate-700 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{language === 'en' ? 'Reset' : 'রিসেট ফিল্টার'}</span>
              </button>
            )}
            <div
              className={`text-xs text-slate-300 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 ${
                hasActiveFilters ? '' : 'w-full text-center'
              }`}
            >
              {language === 'en' ? 'Vouchers: ' : 'মোট ভাউচার: '}
              <strong className="font-bold text-amber-400 font-mono">{filteredBazars.length}</strong> {language === 'en' ? '' : 'টি'}
            </div>
          </div>
        </div>

        {/* Row 2: Type Filter Chips & Total Filtered Amount */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60">
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs py-0.5">
            <span className="text-[11px] text-slate-400 font-medium mr-1 flex items-center gap-1">
              <Tag className="w-3 h-3" /> {language === 'en' ? 'Type:' : 'ধরণ:'}
            </span>
            {[
              { id: 'all', label: language === 'en' ? 'All Bazar' : 'সব বাজার' },
              { id: 'regular', label: language === 'en' ? 'Regular' : 'রেগুলার বাজার' },
              { id: 'big', label: language === 'en' ? 'Big Bazar' : 'বড় বাজার' },
              { id: 'extra', label: language === 'en' ? 'Extra' : 'এক্সট্রা বাজার' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTypeFilter(tab.id as any)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTypeFilter === tab.id
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="text-xs text-slate-300 bg-slate-950 px-3.5 py-1.5 rounded-xl border border-slate-800">
            {language === 'en' ? 'Filtered Total: ' : 'ফিল্টারকৃত মোট খরচ: '}
            <strong className="text-emerald-400 font-mono font-bold">{formatTaka(totalFilteredAmount)}</strong>
          </div>
        </div>
      </div>

      {/* 6. Clean Bazar DataTable & Mobile Cards */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden bg-slate-900/60">
        {filteredBazars.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center text-slate-500">
              <ShoppingBag className="w-7 h-7" />
            </div>
            <h4 className="text-sm font-bold text-slate-300">
              {language === 'en' ? 'No bazar entries found' : 'কোনো বাজার এন্ট্রি পাওয়া যায়নি'}
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {hasActiveFilters
                ? (language === 'en' ? 'No records match your filters. Please reset filters.' : 'আপনার দেওয়া ফিল্টারে কোনো বাজার মিলছে না। অনুগ্রহ করে ফিল্টার রিসেট করুন।')
                : (language === 'en' ? 'No bazar vouchers recorded yet for this cycle.' : 'চলতি মাসে এখনো কোনো বাজার যুক্ত করা হয়নি। উপরে "নতুন বাজার এন্ট্রি করুন" বাটনে ক্লিক করে যুক্ত করুন।')}
            </p>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="text-xs text-amber-400 hover:underline cursor-pointer font-semibold"
              >
                {language === 'en' ? 'Reset Filters' : 'ফিল্টার রিসেট করুন'}
              </button>
            )}
          </div>
        ) : (
          <div>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[10px] tracking-wider font-bold">
                  <tr>
                    <th className="py-3 px-4">{language === 'en' ? 'Date' : 'তারিখ'}</th>
                    <th className="py-3 px-4">{language === 'en' ? 'Description & Items' : 'বিবরণ ও ফর্দ'}</th>
                    <th className="py-3 px-4">{language === 'en' ? 'Type' : 'ধরণ'}</th>
                    <th className="py-3 px-4">{language === 'en' ? 'Buyer Name' : 'ক্রেতার নাম'}</th>
                    <th className="py-3 px-4 text-center">{language === 'en' ? 'Status' : 'স্ট্যাটাস'}</th>
                    <th className="py-3 px-4 text-right">{language === 'en' ? 'Amount' : 'টাকার পরিমাণ'}</th>
                    <th className="py-3 px-4 text-center">{language === 'en' ? 'Actions' : 'অ্যাকশন'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {filteredBazars.map((b) => {
                    const isCreator = b.userId === currentUser.id;
                    const canEditOrDelete = isManager || isCreator;
                    const hasItems = b.items && b.items.length > 0;
                    const isPending = !b.status || b.status === 'pending';
                    const isApproved = b.status === 'approved';

                    return (
                      <tr key={b._id} className="hover:bg-slate-800/40 transition-colors group">
                        {/* Date */}
                        <td className="py-3 px-4 font-mono text-slate-300 whitespace-nowrap font-medium">
                          {b.date}
                        </td>

                        {/* Description & Item Overview */}
                        <td className="py-3 px-4 max-w-xs">
                          <div className="space-y-1">
                            <span className="font-semibold text-white block truncate" title={b.description}>
                              {b.description}
                            </span>
                            {hasItems && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-amber-300/90 font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                📋 {b.items.length}টি আইটেমের ফর্দ যুক্ত
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Type Badge */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                              b.type === 'regular'
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                : b.type === 'big'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {b.type === 'regular'
                              ? (language === 'en' ? 'Regular' : 'রেগুলার')
                              : b.type === 'big'
                              ? (language === 'en' ? 'Big Bazar' : 'বড় বাজার')
                              : (language === 'en' ? 'Extra' : 'এক্সট্রা')}
                          </span>
                        </td>

                        {/* Buyer */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <img
                              src={b.userImage || `https://api.dicebear.com/7.x/bottts/svg?seed=${b.userId}`}
                              alt={b.userName || 'Buyer'}
                              className="w-7 h-7 rounded-lg object-cover border border-slate-700"
                            />
                            <div>
                              <span className="font-bold text-white text-xs block">{b.userName || 'Unknown'}</span>
                              <span className="text-[10px] text-slate-400 block capitalize">
                                {b.userRole === 'super_admin'
                                   ? (language === 'en' ? 'Super Admin' : 'সুপার এডমিন')
                                   : b.userRole === 'admin'
                                   ? (language === 'en' ? 'Manager' : 'ম্যানেজার')
                                   : (language === 'en' ? 'Member' : 'সদস্য')}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {isApproved ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              {language === 'en' ? 'Approved' : 'অনুমোদিত'}
                            </span>
                          ) : b.status === 'rejected' ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              {language === 'en' ? 'Rejected' : 'বাতিল'}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              {language === 'en' ? 'Pending' : 'পেন্ডিং'}
                            </span>
                          )}
                        </td>

                        {/* Amount */}
                        <td className="py-3 px-4 text-right font-mono font-black text-amber-400 text-sm whitespace-nowrap">
                          {formatTaka(b.amount)}
                        </td>

                        {/* Actions: View Details, Approve, Reject, Edit, Delete */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Manager Quick Approve */}
                            {isManager && !isApproved && (
                              <button
                                onClick={() => handleApproveBazar(b._id, b.description)}
                                disabled={processingBazarId === b._id}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all cursor-pointer shadow-sm"
                                title="Approve"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>{language === 'en' ? 'Approve' : 'অনুমোদন'}</span>
                              </button>
                            )}

                            {/* Manager Quick Reject */}
                            {isManager && isPending && (
                              <button
                                onClick={() => handleRejectBazar(b._id, b.description)}
                                disabled={processingBazarId === b._id}
                                className="p-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/40 text-xs transition-colors cursor-pointer"
                                title="Reject"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* View Details Button */}
                            <button
                              onClick={() => setViewingDetailsBazar(b)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/35 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-all cursor-pointer shadow-sm"
                              title="Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>{language === 'en' ? 'Details' : 'বিস্তারিত দেখুন'}</span>
                            </button>

                            {/* Edit Button */}
                            {canEditOrDelete && (
                              <button
                                onClick={() => startEdit(b)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                                title="Edit"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Delete Button */}
                            {canEditOrDelete && (
                              <button
                                onClick={() => handleDeleteBazar(b._id, b.description)}
                                className="p-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/35 text-rose-300 border border-rose-500/30 transition-colors cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Compact Cards View */}
            <div className="md:hidden divide-y divide-slate-800/60">
              {filteredBazars.map((b) => {
                const isCreator = b.userId === currentUser.id;
                const canEditOrDelete = isManager || isCreator;
                const hasItems = b.items && b.items.length > 0;

                return (
                  <div key={b._id} className="p-4 space-y-3 hover:bg-slate-800/30 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white text-xs">{b.description}</span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                              b.type === 'regular'
                                ? 'bg-blue-500/20 text-blue-300'
                                : b.type === 'big'
                                ? 'bg-purple-500/20 text-purple-300'
                                : 'bg-emerald-500/20 text-emerald-300'
                            }`}
                          >
                            {b.type === 'regular'
                              ? (language === 'en' ? 'Regular' : 'রেগুলার')
                              : b.type === 'big'
                              ? (language === 'en' ? 'Big Bazar' : 'বড় বাজার')
                              : (language === 'en' ? 'Extra' : 'এক্সট্রা')}
                          </span>
                          {b.status === 'approved' ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              {language === 'en' ? 'Approved' : 'অনুমোদিত'}
                            </span>
                          ) : b.status === 'rejected' ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              {language === 'en' ? 'Rejected' : 'বাতিল'}
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              {language === 'en' ? 'Pending' : 'পেন্ডিং'}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                          <img
                            src={b.userImage || `https://api.dicebear.com/7.x/bottts/svg?seed=${b.userId}`}
                            alt={b.userName}
                            className="w-4 h-4 rounded-full"
                          />
                          <span>{b.userName}</span>
                          <span>•</span>
                          <span className="font-mono">{b.date}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-mono font-black text-amber-400 text-sm">
                          {formatTaka(b.amount)}
                        </div>
                        {hasItems && (
                          <span className="text-[10px] text-amber-300/80 block font-mono">
                            {b.items.length} {language === 'en' ? 'items' : 'টি জিনিস'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/50">
                      <button
                        onClick={() => setViewingDetailsBazar(b)}
                        className="flex items-center gap-1 text-[11px] font-bold bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 px-3 py-1.5 rounded-lg cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{language === 'en' ? 'Details' : 'বিস্তারিত দেখুন'}</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        {isManager && b.status !== 'approved' && (
                          <button
                            onClick={() => handleApproveBazar(b._id, b.description)}
                            disabled={processingBazarId === b._id}
                            className="p-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold cursor-pointer"
                            title="অনুমোদন করুন"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {isManager && (!b.status || b.status === 'pending') && (
                          <button
                            onClick={() => handleRejectBazar(b._id, b.description)}
                            disabled={processingBazarId === b._id}
                            className="p-1.5 rounded-lg bg-rose-600/20 text-rose-300 border border-rose-500/40 text-xs cursor-pointer"
                            title="বাতিল করুন"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canEditOrDelete && (
                          <>
                            <button
                              onClick={() => startEdit(b)}
                              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 text-xs cursor-pointer"
                              title="এডিট"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteBazar(b._id, b.description)}
                              className="p-1.5 rounded-lg bg-rose-600/20 text-rose-300 border border-rose-500/30 text-xs cursor-pointer"
                              title="মুছুন"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 7. POPUP MODAL: VIEW DETAILS (আইটেমওয়ারী ফর্দ ও ক্রেতার খরচ বিবরণী) */}
      {viewingDetailsBazar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">
                    {language === 'en' ? 'Bazar Voucher & Expense Receipt' : 'বাজার ভাউচার ও খরচের বিস্তারিত রসিদ'}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-0.5">
                    <span>{viewingDetailsBazar.date}</span>
                    <span>•</span>
                    <span className="uppercase text-amber-300 font-bold">
                      {viewingDetailsBazar.type === 'regular'
                        ? (language === 'en' ? 'Regular Bazar' : 'রেগুলার বাজার')
                        : viewingDetailsBazar.type === 'big'
                        ? (language === 'en' ? 'Big Bazar' : 'বড় বাজার')
                        : (language === 'en' ? 'Extra Bazar' : 'এক্সট্রা বাজার')}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setViewingDetailsBazar(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Modal Content */}
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto text-xs">
              {/* Buyer Profile & Live Spending Card */}
              {(() => {
                const buyerSpending = getMemberSpending(viewingDetailsBazar.userId);
                return (
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            viewingDetailsBazar.userImage ||
                            `https://api.dicebear.com/7.x/bottts/svg?seed=${viewingDetailsBazar.userId}`
                          }
                          alt={viewingDetailsBazar.userName}
                          className="w-11 h-11 rounded-xl object-cover border-2 border-indigo-500/40"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white text-sm">{viewingDetailsBazar.userName}</span>
                            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.2 rounded capitalize">
                              {viewingDetailsBazar.userRole === 'super_admin'
                                ? (language === 'en' ? 'Super Admin' : 'সুপার এডমিন')
                                : viewingDetailsBazar.userRole === 'admin'
                                ? (language === 'en' ? 'Manager' : 'ম্যানেজার')
                                : (language === 'en' ? 'Member' : 'সদস্য')}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400">
                            {language === 'en' ? 'Buyer / Paid By' : 'এই ভাউচারের ক্রেতা / পরিশোধকারী'}
                          </span>
                        </div>
                      </div>

                      <Link
                        href={`/dashboard/profile?userId=${viewingDetailsBazar.userId}`}
                        className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                      >
                        <span>{language === 'en' ? 'Profile' : 'প্রোফাইল'}</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>

                    {/* Buyer's Total Bazar Breakdown */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 font-mono text-center">
                      <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-sans">
                          {language === 'en' ? 'Total Monthly Bazar' : 'চলতি মাসে মোট বাজার'}
                        </span>
                        <span className="text-xs font-bold text-emerald-400">
                          {formatTaka(buyerSpending.bazarTotal)}
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-sans">
                          {language === 'en' ? 'Current Voucher' : 'বর্তমান ভাউচার'}
                        </span>
                        <span className="text-xs font-bold text-amber-400">
                          {formatTaka(viewingDetailsBazar.amount)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Itemized Receipt Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-amber-400" />
                    বাজারের জিনিসপত্রের ফর্দ ও মূল্যের হিসাব
                  </span>
                  {viewingDetailsBazar.items && (
                    <span className="text-[11px] text-slate-400 font-mono">
                      মোট {viewingDetailsBazar.items.length} টি আইটেম
                    </span>
                  )}
                </div>

                {viewingDetailsBazar.items && viewingDetailsBazar.items.length > 0 ? (
                  <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900 text-slate-400 text-[10px] uppercase font-bold border-b border-slate-800">
                        <tr>
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">জিনিসের নাম</th>
                          <th className="py-2.5 px-3">পরিমাণ</th>
                          <th className="py-2.5 px-3 text-right">মূল্য (টাকা)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        {viewingDetailsBazar.items.map((it: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-900/40">
                            <td className="py-2.5 px-3 text-slate-500 font-mono">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-semibold text-white font-sans">{it.name}</td>
                            <td className="py-2.5 px-3 text-slate-300 font-sans">{it.qty || '—'}</td>
                            <td className="py-2.5 px-3 text-right font-bold text-amber-400">
                              {formatTaka(it.price)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <span className="text-[11px] text-slate-400 block font-semibold">বিবরণ ও আইটেম:</span>
                    <p className="text-slate-200 leading-relaxed font-sans whitespace-pre-wrap">
                      {viewingDetailsBazar.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Total Paid Amount Box */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-950 to-slate-950 border border-amber-500/40 flex items-center justify-between">
                <div>
                  <span className="text-xs text-amber-300 font-bold block">সর্বমোট ভাউচার মূল্য</span>
                  <span className="text-[11px] text-slate-400">
                    {viewingDetailsBazar.paidFromBigBazarFund
                      ? 'বড় বাজার ফান্ড থেকে পরিশোধ করা হয়েছে'
                      : 'ক্রেতার নিজ পকেট থেকে পরিশোধিত'}
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-black text-amber-400 font-mono">
                  {formatTaka(viewingDetailsBazar.amount)}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/70 shrink-0">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 cursor-pointer transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>প্রিন্ট রসিদ</span>
              </button>

              <button
                onClick={() => setViewingDetailsBazar(null)}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/25 cursor-pointer transition-all"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. MODAL: EDIT BAZAR ENTRY */}
      {editingBazar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-indigo-400" />
                বাজারের খরচ ও বিবরণ সংশোধন
              </h3>
              <button
                onClick={() => setEditingBazar(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">বাজারের বিবরণ / আইটেম</label>
                <input
                  type="text"
                  required
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">টাকার পরিমাণ (৳)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-mono font-bold text-sm outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">তারিখ</label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-mono outline-none focus:border-indigo-500 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">বাজারের ধরণ</label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="regular">রেগুলার</option>
                    <option value="big">বড় বাজার</option>
                    <option value="extra">এক্সট্রা</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingBazar(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSavingEdit ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
