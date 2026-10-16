'use client';

import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Search,
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
  XCircle,
  Clock,
  Utensils,
  ShoppingBag,
  DollarSign,
  Users,
  ChevronDown,
  ChevronUp,
  Calendar,
  Info,
  TrendingUp,
  TrendingDown,
  AlertCircle,
} from '@/components/icons';
import { formatTaka } from '@/lib/money';
import { useLanguage } from '@/context/LanguageContext';
import { toast } from 'sonner';
import { NewFixedEventModal } from './NewFixedEventModal';

interface FeastsTabProps {
  events: any[];
  members: any[];
  currentUser?: any;
  currentCycleId?: string;
  onRefresh: () => void;
  onOpenCreateModal?: () => void;
}

export const FeastsTab: React.FC<FeastsTabProps> = ({
  events = [],
  members = [],
  currentUser,
  currentCycleId,
  onRefresh,
}) => {
  const { isBangla, language } = useLanguage();
  const isManager = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  // Filters
  const [activeTab, setActiveTab] = useState<'approved' | 'pending' | 'my'>('approved');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Filtered lists
  const approvedEvents = useMemo(() => {
    return events.filter((e) => (e.status || 'approved') === 'approved');
  }, [events]);

  const pendingEvents = useMemo(() => {
    return events.filter((e) => e.status === 'pending');
  }, [events]);

  const myEvents = useMemo(() => {
    if (!currentUser?.id) return [];
    return events.filter(
      (e) =>
        e.buyerUserId === currentUser.id ||
        (e.attendeeUserIds || []).includes(currentUser.id) ||
        e.requestedBy === currentUser.id
    );
  }, [events, currentUser?.id]);

  // Financial Stats for Current User
  const stats = useMemo(() => {
    let totalFeastCost = 0;
    let myFeastCost = 0; // Consumption share of user
    let myFeastCredit = 0; // Organizer spending credit of user

    approvedEvents.forEach((ev) => {
      const cost = Number(ev.cost) || 0;
      totalFeastCost += cost;

      const attendees = ev.attendeeUserIds || [];
      const perPerson = attendees.length > 0 ? Math.round(cost / attendees.length) : 0;

      // If user attended, they owe perPerson
      if (currentUser?.id && attendees.includes(currentUser.id)) {
        myFeastCost += perPerson;
      }

      // If user bought/organized, they get full cost credited
      if (currentUser?.id && ev.buyerUserId === currentUser.id) {
        myFeastCredit += cost;
      }
    });

    const netBalance = myFeastCredit - myFeastCost;

    return {
      totalFeasts: approvedEvents.length,
      pendingCount: pendingEvents.length,
      totalFeastCost,
      myFeastCost,
      myFeastCredit,
      netBalance,
    };
  }, [approvedEvents, pendingEvents, currentUser?.id]);

  // Current displayed list based on active tab & search query
  const displayedEvents = useMemo(() => {
    let list: any[] = [];
    if (activeTab === 'approved') list = approvedEvents;
    else if (activeTab === 'pending') list = pendingEvents;
    else if (activeTab === 'my') list = myEvents;

    if (!searchQuery.trim()) return list;

    const query = searchQuery.toLowerCase().trim();
    return list.filter((e) => {
      const title = String(e.title || '').toLowerCase();
      const buyer = String(e.buyerName || '').toLowerCase();
      const date = String(e.date || '');
      const itemsStr = Array.isArray(e.items)
        ? e.items.map((it: any) => it.name).join(' ').toLowerCase()
        : '';
      return title.includes(query) || buyer.includes(query) || date.includes(query) || itemsStr.includes(query);
    });
  }, [activeTab, approvedEvents, pendingEvents, myEvents, searchQuery]);

  // Actions
  const handleApprove = async (eventId: string) => {
    try {
      setActionLoadingId(eventId);
      const res = await fetch('/api/fixed-events', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: eventId, status: 'approved' }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(isBangla ? 'বিশেষ ভোজ সফলভাবে অনুমোদন করা হয়েছে!' : 'Feast approved successfully!');
        onRefresh();
      } else {
        toast.error(data.error || 'অনুমোদন ব্যর্থ হয়েছে');
      }
    } catch (err: any) {
      toast.error(err.message || 'নেটওয়ার্ক সমস্যা');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (eventId: string) => {
    const reason = window.prompt(isBangla ? 'বাতিলের কারণ লিখুন (ঐচ্ছিক):' : 'Rejection reason (optional):');
    if (reason === null) return;

    try {
      setActionLoadingId(eventId);
      const res = await fetch('/api/fixed-events', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: eventId, status: 'rejected', adminNote: reason }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(isBangla ? 'বিশেষ ভোজ বাতিল করা হয়েছে' : 'Feast rejected');
        onRefresh();
      } else {
        toast.error(data.error || 'বাতিল ব্যর্থ হয়েছে');
      }
    } catch (err: any) {
      toast.error(err.message || 'নেটওয়ার্ক সমস্যা');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (eventId: string, isPending: boolean) => {
    const confirmMsg = isPending
      ? isBangla
        ? 'আপনি কি নিশ্চিত যে এই আবেদনটি প্রত্যাহার বা মুছে ফেলতে চান?'
        : 'Are you sure you want to cancel this request?'
      : isBangla
      ? 'আপনি কি নিশ্চিত যে এই বিশেষ ভোজটি মুছে ফেলতে চান? সংশ্লিষ্ট বাজার এন্ট্রি ও কাটাকাটি হিসাব মুছে যাবে।'
      : 'Are you sure you want to delete this feast?';

    if (!window.confirm(confirmMsg)) return;

    try {
      setActionLoadingId(eventId);
      const res = await fetch(`/api/fixed-events?id=${eventId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        toast.success(isBangla ? 'সফলভাবে মুছে ফেলা হয়েছে' : 'Deleted successfully');
        onRefresh();
      } else {
        toast.error(data.error || 'মুছতে ব্যর্থ হয়েছে');
      }
    } catch (err: any) {
      toast.error(err.message || 'নেটওয়ার্ক সমস্যা');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenEdit = (event: any) => {
    setEditingEvent(event);
    setIsModalOpen(true);
  };

  const handleOpenNew = () => {
    setEditingEvent(null);
    setIsModalOpen(true);
  };

  // Helper for meal time display
  const getMealTimeBadge = (mealTime: string) => {
    switch (mealTime) {
      case 'dinner':
        return { label: isBangla ? '🌙 রাতের ভোজ (Dinner)' : '🌙 Dinner', bg: 'bg-purple-500/15 text-purple-300 border-purple-500/30' };
      case 'morning':
        return { label: isBangla ? '☀️ সকালের নাস্তা (Breakfast)' : '☀️ Breakfast', bg: 'bg-amber-500/15 text-amber-300 border-amber-500/30' };
      case 'lunch':
      default:
        return { label: isBangla ? '🍛 দুপুরের ভোজ (Lunch)' : '🍛 Lunch', bg: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' };
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & OVERVIEW BANNER */}
      <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <span>{isBangla ? 'বিশেষ ভোজ ব্যবস্থাপনা' : 'Special Feast Management'}</span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                  {isBangla ? 'ফিক্সড ইভেন্ট' : 'Fixed Event'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {isBangla
                  ? 'মেসের স্পেশাল আয়োজন, বিরিয়ানি ও ভোজের হিসাব। যে বাজার করবে সে ক্রেডিট পাবে এবং অংশগ্রহণকারীরা ভাগ করে বহন করবে।'
                  : 'Special feast organizer receives full credit; participating attendees split the cost equally.'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleOpenNew}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>{isBangla ? 'নতুন বিশেষ ভোজ আয়োজন' : 'Schedule Special Feast'}</span>
        </button>
      </div>

      {/* 2. STATS STRIP (TOTAL, MY SHARE, MY CREDIT, NET SETTLEMENT) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Feasts in Cycle */}
        <div className="glass-card rounded-2xl p-4 border border-slate-800/80 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1 font-medium">
              <Utensils className="w-4 h-4 text-amber-400" />
              {isBangla ? 'মোট বিশেষ ভোজ' : 'Total Feasts'}
            </span>
            <span className="text-[10px] text-amber-300 font-semibold">{stats.totalFeasts} টি</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono">
            {formatTaka(stats.totalFeastCost)}
          </div>
          <p className="text-[10px] text-slate-400">
            {isBangla ? 'চলতি চক্রের সকল অনুমোদিত ভোজ' : 'All approved feasts this cycle'}
          </p>
        </div>

        {/* My Feast Consumption Cost */}
        <div className="glass-card rounded-2xl p-4 border border-slate-800/80 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1 font-medium">
              <Users className="w-4 h-4 text-indigo-400" />
              {isBangla ? 'আমার খাওয়ার খরচ' : 'My Consumption'}
            </span>
            <span className="text-[10px] text-rose-300 font-semibold">{isBangla ? 'দেনা / খরচ' : 'Due'}</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-300 font-mono">
            {formatTaka(stats.myFeastCost)}
          </div>
          <p className="text-[10px] text-slate-400">
            {isBangla ? 'উপস্থিত ভোজগুলোর আপনার ভাগ' : 'Your share of attended feasts'}
          </p>
        </div>

        {/* My Feast Organizer Credit */}
        <div className="glass-card rounded-2xl p-4 border border-slate-800/80 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1 font-medium">
              <ShoppingBag className="w-4 h-4 text-emerald-400" />
              {isBangla ? 'আমার বাজার ক্রেডিট' : 'My Bazar Credit'}
            </span>
            <span className="text-[10px] text-emerald-400 font-semibold">{isBangla ? 'পাওনা / জমা' : 'Credit'}</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
            {formatTaka(stats.myFeastCredit)}
          </div>
          <p className="text-[10px] text-slate-400">
            {isBangla ? 'আপনার আয়োজিত ভোজের বিল' : 'Bills of feasts you organized'}
          </p>
        </div>

        {/* Net Settlement for User */}
        <div
          className={`glass-card rounded-2xl p-4 border space-y-1 ${
            stats.netBalance >= 0 ? 'border-emerald-500/40 bg-emerald-950/20' : 'border-indigo-500/40 bg-indigo-950/20'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className={`flex items-center gap-1 ${stats.netBalance >= 0 ? 'text-emerald-300' : 'text-indigo-300'}`}>
              {stats.netBalance >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {isBangla ? 'নিট কাটাকাটি স্থিতি' : 'Net Impact'}
            </span>
            <span className={`text-[10px] font-bold ${stats.netBalance >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {stats.netBalance >= 0 ? (isBangla ? 'উদ্বৃত্ত পাওনা' : 'Refund') : (isBangla ? 'পরিশোধ বাকি' : 'Payable')}
            </span>
          </div>
          <div
            className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${
              stats.netBalance >= 0 ? 'text-emerald-400' : 'text-indigo-300'
            }`}
          >
            {stats.netBalance >= 0 ? `+${formatTaka(stats.netBalance)}` : `-${formatTaka(Math.abs(stats.netBalance))}`}
          </div>
          <p className="text-[10px] text-slate-300">
            {stats.netBalance >= 0
              ? isBangla
                ? '✓ ভোজ থেকে মেস আপনার কাছে দেনাদার'
                : 'Mess credits you for feasts'
              : isBangla
              ? 'ভোজ বাবদ মেসে দিতে হবে'
              : 'Feast share due to mess'}
          </p>
        </div>
      </div>

      {/* 3. TOOLBAR: SEARCH & CATEGORY TABS */}
      <div className="glass-panel rounded-2xl p-4 border border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs">
            <button
              onClick={() => setActiveTab('approved')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'approved'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>{isBangla ? 'অনুমোদিত ভোজসমূহ' : 'Approved Feasts'}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950/30 font-mono">
                {approvedEvents.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('pending')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'pending'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{isBangla ? 'অপেক্ষমান আবেদন' : 'Pending Requests'}</span>
              {pendingEvents.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-mono animate-pulse">
                  {pendingEvents.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('my')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'my'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{isBangla ? 'আমার ভোজ ও খরচ' : 'My Feasts'}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950/30 font-mono">
                {myEvents.length}
              </span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isBangla ? 'ভোজের নাম বা আয়োজক খুঁজুন...' : 'Search feasts or buyers...'}
              className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all"
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
        </div>
      </div>

      {/* 4. FEAST CARDS LIST */}
      {displayedEvents.length === 0 ? (
        <div className="glass-panel rounded-2xl p-10 border border-slate-800 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">
            {activeTab === 'pending'
              ? isBangla
                ? 'কোনো অপেক্ষমান ভোজের আবেদন নেই'
                : 'No pending feast requests'
              : activeTab === 'my'
              ? isBangla
                ? 'আপনি এখনও কোনো বিশেষ ভোজে অংশ নেননি বা আয়োজন করেননি'
                : 'No feasts found for you'
              : isBangla
              ? 'এখনও কোনো বিশেষ ভোজের এন্ট্রি নেই'
              : 'No special feasts recorded'}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {isBangla
              ? 'মেসের সকলে মিলে স্পেশাল বিরিয়ানি বা মাংসের আয়োজনের জন্য ওপরের বোতামে চাপ দিয়ে নতুন ভোজের আবেদন করুন।'
              : 'Schedule special feasts with automatic cost sharing among participants.'}
          </p>
          <button
            onClick={handleOpenNew}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isBangla ? 'বিশেষ ভোজ আয়োজন করুন' : 'Schedule Feast'}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {displayedEvents.map((ev) => {
            const isExpanded = expandedEventId === ev._id;
            const mealBadge = getMealTimeBadge(ev.mealTime);
            const attendeesCount = (ev.attendeeUserIds || []).length;
            const perPerson = attendeesCount > 0 ? Math.round(Number(ev.cost) / attendeesCount) : 0;
            const isUserBuyer = currentUser?.id && ev.buyerUserId === currentUser.id;
            const isUserAttendee = currentUser?.id && (ev.attendeeUserIds || []).includes(currentUser.id);
            const isPending = ev.status === 'pending';
            const isRejected = ev.status === 'rejected';

            const isLoading = actionLoadingId === ev._id;

            return (
              <div
                key={ev._id}
                className={`glass-panel rounded-2xl border p-5 space-y-4 transition-all relative overflow-hidden ${
                  isPending
                    ? 'border-amber-500/40 bg-gradient-to-br from-amber-950/20 via-slate-900 to-slate-950'
                    : isRejected
                    ? 'border-rose-500/30 bg-slate-950/60 opacity-80'
                    : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                }`}
              >
                {/* Header: Title, Slot, Date & Status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${mealBadge.bg}`}>
                        {mealBadge.label}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        {ev.date}
                      </span>
                      {isPending && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                          {isBangla ? 'অপেক্ষমান আবেদন' : 'Pending Review'}
                        </span>
                      )}
                      {isRejected && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          {isBangla ? 'বাতিল' : 'Rejected'}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-white truncate">{ev.title}</h3>
                  </div>

                  {/* Per Person & Total Cost Pill */}
                  <div className="text-right shrink-0">
                    <div className="text-lg font-black text-amber-400 font-mono">
                      {formatTaka(ev.cost)}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {isBangla ? 'জনপ্রতি ' : 'Per person '}
                      <strong className="text-white font-mono">৳{perPerson}</strong>
                    </div>
                  </div>
                </div>

                {/* Organizer / Buyer Card */}
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={
                        ev.buyer?.image ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(ev.buyerName || 'M')}&background=1e293b&color=94a3b8`
                      }
                      alt={ev.buyerName}
                      className="w-8 h-8 rounded-full object-cover border border-slate-700 shrink-0"
                    />
                    <div className="truncate text-xs">
                      <span className="text-slate-400 block text-[10px]">
                        {isBangla ? 'বাজারকারী ও আয়োজক:' : 'Buyer & Organizer:'}
                      </span>
                      <span className="font-bold text-white truncate flex items-center gap-1.5">
                        {ev.buyerName}
                        {isUserBuyer && (
                          <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-semibold">
                            {isBangla ? 'আপনি' : 'You'}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="text-right text-[11px]">
                    <span className="text-emerald-400 font-semibold font-mono">
                      +{formatTaka(ev.cost)}
                    </span>
                    <span className="text-slate-500 block text-[10px]">
                      {isBangla ? 'ক্রেডিট পাবেন' : 'Credit given'}
                    </span>
                  </div>
                </div>

                {/* Personal Settlement Impact Badge for Logged-In User */}
                {currentUser?.id && (
                  <div
                    className={`p-2.5 rounded-xl border text-[11px] leading-tight flex items-center justify-between gap-2 ${
                      isUserBuyer && isUserAttendee
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                        : isUserBuyer
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                        : isUserAttendee
                        ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-200'
                        : 'bg-slate-950/40 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {isUserBuyer && isUserAttendee
                          ? isBangla
                            ? `আপনি বাজার করেছেন (+৳${ev.cost}) এবং খেয়েছেন (-৳${perPerson})`
                            : `You paid (+৳${ev.cost}) and ate (-৳${perPerson})`
                          : isUserBuyer
                          ? isBangla
                            ? `আপনি আয়োজন করেছেন → পুরো বিল আপনার ক্রেডিট (+৳${ev.cost})`
                            : `You paid → Full bill credited (+৳${ev.cost})`
                          : isUserAttendee
                          ? isBangla
                            ? `আপনি খেয়েছেন → আপনার দেনায় যোগ হবে (-৳${perPerson})`
                            : `You ate → Share charged (-৳${perPerson})`
                          : isBangla
                          ? 'আপনি এই ভোজে অংশগ্রহণ করেননি (কোনো চার্জ নেই)'
                          : 'You did not attend (no charge)'}
                      </span>
                    </div>

                    {(isUserBuyer || isUserAttendee) && (
                      <span className="font-mono font-bold shrink-0">
                        {isUserBuyer && isUserAttendee
                          ? `নিট: +৳${ev.cost - perPerson}`
                          : isUserBuyer
                          ? `+৳${ev.cost}`
                          : `-৳${perPerson}`}
                      </span>
                    )}
                  </div>
                )}

                {/* Attendees Summary Bar */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-300 font-semibold">
                      {isBangla ? `উপস্থিত সদস্য (${attendeesCount} জন):` : `Attendees (${attendeesCount}):`}
                    </span>
                  </div>

                  <button
                    onClick={() => setExpandedEventId(isExpanded ? null : ev._id)}
                    className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
                  >
                    <span>{isExpanded ? (isBangla ? 'বিবরণ লুকান' : 'Hide details') : (isBangla ? 'আইটেম ও সদস্য দেখুন' : 'View details')}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Collapsible Details: Items Breakdown & Attendees Chips */}
                {isExpanded && (
                  <div className="space-y-3 pt-3 border-t border-slate-800 text-xs animate-in fade-in duration-150">
                    {/* Itemized Expenses */}
                    {Array.isArray(ev.items) && ev.items.length > 0 && (
                      <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                        <span className="text-[11px] text-slate-400 font-semibold block">
                          {isBangla ? 'বাজারের ফর্দ ও খরচ:' : 'Itemized Expenses:'}
                        </span>
                        <div className="divide-y divide-slate-800/60">
                          {ev.items.map((it: any, idx: number) => (
                            <div key={idx} className="flex justify-between py-1 text-xs">
                              <span className="text-slate-300">{it.name}</span>
                              <span className="font-mono text-slate-200">{formatTaka(it.amount)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Attendees List */}
                    <div>
                      <span className="text-[11px] text-slate-400 font-semibold block mb-1.5">
                        {isBangla ? 'অংশগ্রহণকারী সদস্যবৃন্দ:' : 'Participating Members:'}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {(ev.attendees || []).map((att: any) => {
                          const isSelf = currentUser?.id && att.id === currentUser.id;
                          return (
                            <span
                              key={att.id}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium border ${
                                isSelf
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                                  : 'bg-slate-800/60 text-slate-300 border-slate-700/60'
                              }`}
                            >
                              <span>{att.name}</span>
                              {isSelf && (
                                <span className="text-[9px] bg-amber-400 text-slate-950 px-1 rounded font-black">
                                  {isBangla ? 'আপনি' : 'You'}
                                </span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Admin Note if Rejected */}
                    {ev.adminNote && (
                      <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-300">
                        <strong>{isBangla ? 'ম্যানেজারের মন্তব্য: ' : 'Admin note: '}</strong>
                        {ev.adminNote}
                      </div>
                    )}
                  </div>
                )}

                {/* Action Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <div className="text-[11px] text-slate-500">
                    {ev.createdAt && (
                      <span>
                        {new Date(ev.createdAt).toLocaleDateString(language === 'en' ? 'en-US' : 'bn-BD')}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Pending Review Actions */}
                    {isPending && isManager && (
                      <>
                        <button
                          disabled={isLoading}
                          onClick={() => handleApprove(ev._id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>{isBangla ? 'অনুমোদন' : 'Approve'}</span>
                        </button>
                        <button
                          disabled={isLoading}
                          onClick={() => handleReject(ev._id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>{isBangla ? 'বাতিল' : 'Reject'}</span>
                        </button>
                      </>
                    )}

                    {/* Ordinary member canceling their own pending request */}
                    {isPending && !isManager && (ev.requestedBy === currentUser?.id || ev.buyerUserId === currentUser?.id) && (
                      <button
                        disabled={isLoading}
                        onClick={() => handleDelete(ev._id, true)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{isBangla ? 'আবেদন প্রত্যাহার' : 'Cancel Request'}</span>
                      </button>
                    )}

                    {/* Manager Edit & Delete for Approved Feasts */}
                    {!isPending && isManager && (
                      <>
                        <button
                          onClick={() => handleOpenEdit(ev)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3 text-indigo-400" />
                          <span>{isBangla ? 'এডিট' : 'Edit'}</span>
                        </button>
                        <button
                          disabled={isLoading}
                          onClick={() => handleDelete(ev._id, false)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-medium transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3 text-rose-400" />
                          <span>{isBangla ? 'মুছুন' : 'Delete'}</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. CREATE / EDIT MODAL */}
      <NewFixedEventModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingEvent(null);
        }}
        onSuccess={() => {
          onRefresh();
        }}
        members={members}
        currentUser={currentUser}
        editEvent={editingEvent}
      />
    </div>
  );
};
