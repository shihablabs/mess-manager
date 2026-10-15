'use client';

import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  Plus,
  CheckCircle,
  XCircle,
  Sparkles,
  Search,
  Calendar,
  User,
  Filter,
  RotateCcw,
  Tag,
  DollarSign,
  ChevronDown,
  Trash2,
  Edit2,
  X,
} from 'lucide-react';
import { formatTaka } from '@/lib/money';
import { AppUser } from '@/lib/session';
import { toast } from 'sonner';

interface BazarTabProps {
  currentUser: AppUser;
  bazars: any[];
  fixedEvents: any[];
  members?: any[];
  onRefresh: () => void;
  onOpenNewBazarModal: () => void;
  onOpenFixedEventModal?: () => void;
}

export const BazarTab: React.FC<BazarTabProps> = ({
  currentUser,
  bazars,
  fixedEvents,
  members = [],
  onRefresh,
  onOpenNewBazarModal,
  onOpenFixedEventModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [activeTypeFilter, setActiveTypeFilter] = useState<'all' | 'regular' | 'big' | 'extra'>('all');
  const [activeStatusFilter, setActiveStatusFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const isAdminOrSuper = currentUser.role === 'admin' || currentUser.role === 'super_admin';

  // Build unique member list from members prop and bazars
  const memberOptions = useMemo(() => {
    const map = new Map<string, string>();
    members.forEach((m: any) => {
      if (m.userId && m.name) {
        map.set(m.userId, m.name);
      } else if (m._id && m.name) {
        map.set(m._id, m.name);
      }
    });
    bazars.forEach((b: any) => {
      if (b.userId && b.userName && !map.has(b.userId)) {
        map.set(b.userId, b.userName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [members, bazars]);

  const handleReview = async (id: string, status: 'approved' | 'rejected') => {
    try {
      setProcessingId(id);
      const res = await fetch('/api/bazars', {
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
        toast.success(status === 'approved' ? 'বাজার অনুমোদন করা হয়েছে' : 'বাজার প্রত্যাখ্যান করা হয়েছে');
        onRefresh();
      } else {
        toast.error(data.error || 'ব্যর্থ হয়েছে');
      }
    } catch (e: any) {
      toast.error(e.message || 'ত্রুটি ঘটেছে');
    } finally {
      setProcessingId(null);
    }
  };

  // Editing state for Super Admin / Manager
  const [editingBazar, setEditingBazar] = useState<any | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDate, setEditDate] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const startEdit = (b: any) => {
    setEditingBazar(b);
    setEditAmount(String(b.amount));
    setEditDescription(b.description);
    setEditDate(b.date);
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
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('বাজারের তথ্য সফলভাবে সংশোধন করা হয়েছে!');
        setEditingBazar(null);
        onRefresh();
      } else {
        toast.error(data.error || 'আপডেট ব্যর্থ হয়েছে');
      }
    } catch (err: any) {
      toast.error('নেটওয়ার্ক ত্রুটি');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteBazar = async (id: string, desc: string) => {
    if (!confirm(`আপনি কি নিশ্চিতভাবে "${desc}" এর বাজার এন্ট্রিটি ডাটাবেজ থেকে মুছে ফেলতে চান?`)) return;
    try {
      const res = await fetch(`/api/bazars?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('বাজারের এন্ট্রি সফলভাবে মুছে ফেলা হয়েছে!');
        onRefresh();
      } else {
        toast.error(data.error || 'মুছে ফেলতে ব্যর্থ হয়েছে');
      }
    } catch (err: any) {
      toast.error('নেটওয়ার্ক ত্রুটি');
    }
  };

  // Filter bazars
  const filteredBazars = useMemo(() => {
    return bazars.filter((b) => {
      // Type filter
      if (activeTypeFilter !== 'all' && b.type !== activeTypeFilter) return false;

      // Status filter
      if (activeStatusFilter !== 'all' && b.status !== activeStatusFilter) return false;

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
        if (!descMatch && !userMatch && !amountMatch) return false;
      }

      return true;
    });
  }, [bazars, activeTypeFilter, activeStatusFilter, selectedMemberId, selectedDate, searchQuery]);

  // Aggregate stats
  const totalFilteredAmount = useMemo(() => {
    return filteredBazars.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  }, [filteredBazars]);

  const approvedAmount = useMemo(() => {
    return filteredBazars
      .filter((b) => b.status === 'approved')
      .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  }, [filteredBazars]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedMemberId !== 'all' ||
    selectedDate !== '' ||
    activeTypeFilter !== 'all' ||
    activeStatusFilter !== 'all';

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedMemberId('all');
    setSelectedDate('');
    setActiveTypeFilter('all');
    setActiveStatusFilter('all');
  };

  return (
    <div className="space-y-5">
      {/* Top Banner & Actions */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-amber-400" />
            বাজার ভাউচার ও খরচ ব্যবস্থাপনা
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            রেগুলার, ফিক্সড, এক্সট্রা ও বড় বাজারের হিসাব ফিল্টার ও অনুসন্ধান করুন।
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {isAdminOrSuper && onOpenFixedEventModal && (
            <button
              onClick={onOpenFixedEventModal}
              className="flex items-center gap-1.5 bg-slate-800/90 hover:bg-slate-750 text-amber-300 text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-amber-500/30 transition-all cursor-pointer shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              বিশেষ ভোজ শিডিউল
            </button>
          )}

          <button
            onClick={onOpenNewBazarModal}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-amber-500/25 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            নতুন বাজার এন্ট্রি করুন
          </button>
        </div>
      </div>

      {/* Friday Special Feasts (Fixed Bazar Events) */}
      {fixedEvents && fixedEvents.length > 0 && (
        <div className="glass-panel rounded-2xl p-4 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              ফিক্সড বাজার / বিশেষ ভোজ ইভেন্ট
            </h4>
            <span className="text-[11px] text-slate-400">
              শুধুমাত্র উপস্থিত সদস্যদের মাঝে খরচ ভাগ হয়
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {fixedEvents.map((evt) => (
              <div
                key={evt._id}
                className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5 relative overflow-hidden"
              >
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-amber-300">{evt.title}</span>
                  <span className="text-[10px] font-mono text-slate-400">{evt.date}</span>
                </div>
                <div className="flex items-baseline justify-between pt-0.5">
                  <span className="text-xs font-extrabold text-white">{formatTaka(evt.cost)}</span>
                  <span className="text-[11px] text-slate-400">
                    জনপ্রতি: <strong className="text-emerald-400">{formatTaka(evt.perPersonCost)}</strong>
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-1.5 truncate">
                  উপস্থিত ({evt.attendees?.length || 0} জন):{' '}
                  <span className="text-slate-300">
                    {evt.attendees?.map((a: any) => a.name).join(', ') || 'কেউ নেই'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Compact Bazar Filter Toolbar */}
      <div className="glass-panel rounded-2xl p-4 border border-slate-800 space-y-3">
        {/* Row 1: Search, Member, Date, Reset */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="পণ্যের নাম বা বিবরণ খুঁজুন..."
              className="w-full pl-9 pr-3 py-2 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
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
              aria-label="সদস্য দ্বারা ফিল্টার"
              className="w-full pl-9 pr-8 py-2 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-white appearance-none focus:outline-none focus:border-amber-500 transition-colors cursor-pointer"
            >
              <option value="all">সকল সদস্য (ক্রেতা)</option>
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
              aria-label="তারিখ দ্বারা ফিল্টার"
              className="w-full pl-9 pr-3 py-2 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 transition-colors cursor-pointer"
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
                রিসেট ফিল্টার
              </button>
            )}
            <div className={`text-xs text-slate-400 px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800/80 ${hasActiveFilters ? '' : 'w-full text-center'}`}>
              মোট: <span className="font-bold text-amber-400">{filteredBazars.length}</span> টি
            </div>
          </div>
        </div>

        {/* Row 2: Type Chips & Status Chips */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
          {/* Type filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs py-0.5">
            <span className="text-[11px] text-slate-500 font-medium mr-1 flex items-center gap-1">
              <Tag className="w-3 h-3" /> ধরণ:
            </span>
            {[
              { id: 'all', label: 'সব' },
              { id: 'regular', label: 'রেগুলার' },
              { id: 'big', label: 'বড় বাজার' },
              { id: 'extra', label: 'এক্সট্রা' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTypeFilter(tab.id as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  activeTypeFilter === tab.id
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Status filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs py-0.5">
            <span className="text-[11px] text-slate-500 font-medium mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> স্ট্যাটাস:
            </span>
            {[
              { id: 'all', label: 'সব' },
              { id: 'approved', label: 'অনুমোদিত' },
              { id: 'pending', label: 'অপেক্ষমান' },
              { id: 'rejected', label: 'বাতিল' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveStatusFilter(tab.id as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  activeStatusFilter === tab.id
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Aggregate Mini Bar */}
        <div className="flex items-center justify-between text-xs bg-slate-900/40 px-3 py-2 rounded-xl border border-slate-800/60 text-slate-400">
          <div>
            ফিল্টারকৃত মোট খরচ:{' '}
            <strong className="text-white font-mono">{formatTaka(totalFilteredAmount)}</strong>
          </div>
          <div>
            অনুমোদিত:{' '}
            <strong className="text-emerald-400 font-mono">{formatTaka(approvedAmount)}</strong>
          </div>
        </div>
      </div>

      {/* Compact Bazar Table / List */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        {filteredBazars.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <ShoppingBag className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400">কোনো বাজার এন্ট্রি খুঁজে পাওয়া যায়নি</p>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="text-xs text-amber-400 hover:underline cursor-pointer"
              >
                ফিল্টার রিসেট করে আবার দেখুন
              </button>
            )}
          </div>
        ) : (
          <div>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">তারিখ</th>
                    <th className="py-2.5 px-4 font-semibold">বিবরণ ও ধরণ</th>
                    <th className="py-2.5 px-4 font-semibold">ক্রেতা</th>
                    <th className="py-2.5 px-4 font-semibold text-right">পরিমাণ</th>
                    <th className="py-2.5 px-4 font-semibold text-center">স্ট্যাটাস</th>
                    {isAdminOrSuper && (
                      <th className="py-2.5 px-4 font-semibold text-center">অ্যাকশন</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredBazars.map((b) => (
                    <tr
                      key={b._id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Date */}
                      <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                        {b.date}
                      </td>

                      {/* Description & Type */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-white">{b.description}</span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                              b.type === 'regular'
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                : b.type === 'big'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {b.type === 'regular'
                              ? 'রেগুলার'
                              : b.type === 'big'
                              ? 'বড় বাজার'
                              : 'এক্সট্রা'}
                          </span>
                          {b.paidFromBigBazarFund && (
                            <span className="text-[10px] text-purple-400 font-medium bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-800/40">
                              ফান্ড থেকে
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Buyer */}
                      <td className="py-3 px-4 text-slate-200 whitespace-nowrap">
                        <span className="font-medium">{b.userName || 'অজানা'}</span>
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-amber-400 whitespace-nowrap">
                        {formatTaka(b.amount)}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded ${
                            b.status === 'approved'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : b.status === 'rejected'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                          }`}
                        >
                          {b.status === 'approved'
                            ? 'অনুমোদিত'
                            : b.status === 'rejected'
                            ? 'বাতিল'
                            : 'অপেক্ষমান'}
                        </span>
                      </td>

                      {/* Admin Actions: Review, Edit & Delete */}
                      {isAdminOrSuper && (
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {b.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleReview(b._id, 'approved')}
                                  disabled={processingId === b._id}
                                  className="p-1 rounded-lg bg-emerald-600/80 hover:bg-emerald-500 text-white transition-colors cursor-pointer"
                                  title="অনুমোদন করুন"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleReview(b._id, 'rejected')}
                                  disabled={processingId === b._id}
                                  className="p-1 rounded-lg bg-rose-600/80 hover:bg-rose-500 text-white transition-colors cursor-pointer"
                                  title="বাতিল করুন"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}

                            <button
                              onClick={() => startEdit(b)}
                              className="p-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 transition-colors cursor-pointer"
                              title="বাজার এডিট বা সংশোধন করুন"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDeleteBazar(b._id, b.description)}
                              className="p-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 transition-colors cursor-pointer"
                              title="বাজার এন্ট্রি মুছে ফেলুন"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Compact List View */}
            <div className="md:hidden divide-y divide-slate-800/60">
              {filteredBazars.map((b) => (
                <div key={b._id} className="p-3.5 space-y-2 hover:bg-slate-800/30 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="font-semibold text-white text-xs flex items-center gap-1.5 flex-wrap">
                        <span>{b.description}</span>
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
                            ? 'রেগুলার'
                            : b.type === 'big'
                            ? 'বড় বাজার'
                            : 'এক্সট্রা'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span>{b.userName}</span>
                        <span>•</span>
                        <span className="font-mono">{b.date}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono font-bold text-amber-400 text-xs">
                        {formatTaka(b.amount)}
                      </div>
                      <span
                        className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded mt-0.5 ${
                          b.status === 'approved'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : b.status === 'rejected'
                            ? 'bg-rose-500/20 text-rose-400'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {b.status === 'approved'
                          ? 'অনুমোদিত'
                          : b.status === 'rejected'
                          ? 'বাতিল'
                          : 'অপেক্ষমান'}
                      </span>
                    </div>
                  </div>

                  {/* Admin action button on mobile */}
                  {isAdminOrSuper && (
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800/50">
                      {b.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleReview(b._id, 'approved')}
                            disabled={processingId === b._id}
                            className="flex items-center gap-1 text-[11px] font-medium bg-emerald-600/80 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> অনুমোদন
                          </button>
                          <button
                            onClick={() => handleReview(b._id, 'rejected')}
                            disabled={processingId === b._id}
                            className="flex items-center gap-1 text-[11px] font-medium bg-rose-600/80 hover:bg-rose-500 text-white px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" /> বাতিল
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => startEdit(b)}
                        className="p-1 rounded-lg bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 text-xs cursor-pointer"
                        title="এডিট"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteBazar(b._id, b.description)}
                        className="p-1 rounded-lg bg-rose-600/20 text-rose-300 border border-rose-500/30 text-xs cursor-pointer"
                        title="মুছুন"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Edit Bazar Modal for Super Admin / Manager */}
      {editingBazar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-indigo-400" />
                বাজারের এন্ট্রি সংশোধন করুন
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
