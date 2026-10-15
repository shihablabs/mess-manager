'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useDashboard } from '@/context/DashboardContext';
import { GlobalLoader } from '@/components/GlobalLoader';
import { MasterErrorBoundary } from '@/components/MasterErrorBoundary';
import { getMemberBillingResultSafe } from '@/lib/safe-utils';
import { formatTaka, formatMealUnits } from '@/lib/money';
import {
  User,
  Shield,
  Crown,
  Wallet,
  Utensils,
  ShoppingBag,
  Sparkles,
  Calendar,
  Clock,
  ArrowLeft,
  CheckCircle,
  XCircle,
  FileText,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Info,
  ChevronDown,
  Plus,
  Printer,
  Search,
  Filter,
  ArrowUpDown,
  Tag,
  Moon,
  Sun,
  Coffee,
  ArrowRightLeft,
  AlertCircle,
  ExternalLink,
  Check,
  X,
  Phone,
  MessageCircle,
  MapPin,
  Edit3,
  Heart,
  Briefcase,
  Copy,
  Save,
} from '@/components/icons';
import Link from 'next/link';
import { toast } from 'sonner';
import Swal from 'sweetalert2';

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedUserId = searchParams.get('userId');

  const {
    currentUser,
    summaryData,
    members,
    bazars,
    fixedEvents,
    deposits,
    refreshData,
    openDeposit,
    openStatement,
    isLoading,
  } = useDashboard();

  // Determine active profile user
  const effectiveUserId = requestedUserId || currentUser?.id || '';

  // Active sub-tab
  const [activeHistoryTab, setActiveHistoryTab] = useState<'overview' | 'meals' | 'fixed' | 'bazar' | 'deposits'>('overview');
  
  // Specific meal records state
  const [userMeals, setUserMeals] = useState<any[]>([]);
  const [isLoadingMeals, setIsLoadingMeals] = useState(false);

  // DataTable filter states for meals
  const [mealSearchQuery, setMealSearchQuery] = useState('');
  const [mealStatusFilter, setMealStatusFilter] = useState<'all' | 'active' | 'off'>('all');
  const [mealSortAsc, setMealSortAsc] = useState(false); // default desc (newest first)

  // DataTable filter states for bazars
  const [bazarSearchQuery, setBazarSearchQuery] = useState('');
  const [bazarTypeFilter, setBazarTypeFilter] = useState<'all' | 'regular' | 'big' | 'extra'>('all');

  // DataTable filter states for deposits
  const [depSearchQuery, setDepSearchQuery] = useState('');
  const [depTypeFilter, setDepTypeFilter] = useState<'all' | 'general' | 'utility' | 'big_bazar'>('all');

  // Slots & Duty Roster states
  const [slots, setSlots] = useState<any[]>([]);
  const [slotRequests, setSlotRequests] = useState<any[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isPeerSwapModalOpen, setIsPeerSwapModalOpen] = useState(false);
  const [selectedToSlotIndex, setSelectedToSlotIndex] = useState<number | null>(null);
  const [swapReason, setSwapReason] = useState('');
  const [isSubmittingSwap, setIsSubmittingSwap] = useState(false);
  const [respondingRequestId, setRespondingRequestId] = useState<string | null>(null);

  const fetchSlots = async () => {
    try {
      setIsLoadingSlots(true);
      const res = await fetch('/api/slots');
      const data = await res.json();
      if (data.success) {
        setSlots(data.slots || []);
        setSlotRequests(data.requests || []);
      }
    } catch (e) {
      console.error('Error fetching slots:', e);
    } finally {
      setIsLoadingSlots(false);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, []);

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isManager = currentUser?.role === 'admin';
  const isViewingSelf = currentUser?.id === effectiveUserId;

  // Selected member doc
  const targetMember = useMemo(() => {
    return (
      members.find((m) => (m.userId || m._id) === effectiveUserId) ||
      (isViewingSelf
        ? {
            userId: currentUser?.id,
            name: currentUser?.name,
            email: currentUser?.email,
            image: currentUser?.image,
            role: currentUser?.role,
            roomRent: 0,
            isUtilityExempt: false,
          }
        : null)
    );
  }, [members, effectiveUserId, currentUser, isViewingSelf]);

  // Billing calculation for this member
  const calculationResult = useMemo(() => {
    return getMemberBillingResultSafe(summaryData?.calculation, effectiveUserId);
  }, [summaryData?.calculation, effectiveUserId]);

  // User-specific deposits
  const memberDeposits = useMemo(() => {
    return deposits.filter((d) => d.userId === effectiveUserId);
  }, [deposits, effectiveUserId]);

  // User-specific bazars
  const memberBazars = useMemo(() => {
    return bazars.filter((b) => b.userId === effectiveUserId);
  }, [bazars, effectiveUserId]);

  // User-attended fixed events
  const memberFixedEvents = useMemo(() => {
    return fixedEvents.filter((e) => e.attendeeUserIds?.includes(effectiveUserId));
  }, [fixedEvents, effectiveUserId]);

  // Current user duty slot
  const userSlot = useMemo(() => {
    return slots.find(
      (s) =>
        s.assignedUsers?.some((u: any) => u.id === effectiveUserId) ||
        s.assignedUserIds?.includes(effectiveUserId)
    );
  }, [slots, effectiveUserId]);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const isDutyActiveToday = useMemo(() => {
    if (!userSlot) return false;
    return todayStr >= userSlot.startDate && todayStr <= userSlot.endDate;
  }, [userSlot, todayStr]);

  const isDutyPast = useMemo(() => {
    if (!userSlot) return false;
    return todayStr > userSlot.endDate;
  }, [userSlot, todayStr]);

  const incomingSwapRequests = useMemo(() => {
    return slotRequests.filter(
      (r) => r.toUserId === effectiveUserId && r.status === 'pending'
    );
  }, [slotRequests, effectiveUserId]);

  // Helper: Calculate age from DOB
  const calculateAge = (dobString?: string) => {
    if (!dobString) return null;
    const birthDate = new Date(dobString);
    if (isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age > 0 ? `${age} বছর` : null;
  };

  // Profile Edit States
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [editDob, setEditDob] = useState('');
  const [editBloodGroup, setEditBloodGroup] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editEmergencyContact, setEditEmergencyContact] = useState('');
  const [editOccupation, setEditOccupation] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const openEditProfile = () => {
    setEditName(targetMember?.name || currentUser?.name || '');
    setEditPhone(targetMember?.phone || '');
    setEditWhatsapp(targetMember?.whatsapp || '');
    setEditDob(targetMember?.dob || '');
    setEditBloodGroup(targetMember?.bloodGroup || '');
    setEditAddress(targetMember?.address || '');
    setEditBio(targetMember?.bio || '');
    setEditEmergencyContact(targetMember?.emergencyContact || '');
    setEditOccupation(targetMember?.occupation || '');
    setIsEditProfileOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      toast.warning('সদস্যের নাম বা ডিসপ্লে নাম আবশ্যক');
      return;
    }

    try {
      setIsSavingProfile(true);
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: effectiveUserId,
          name: editName.trim(),
          phone: editPhone.trim(),
          whatsapp: editWhatsapp.trim(),
          dob: editDob,
          bloodGroup: editBloodGroup.trim(),
          address: editAddress.trim(),
          bio: editBio.trim(),
          emergencyContact: editEmergencyContact.trim(),
          occupation: editOccupation.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsEditProfileOpen(false);
        await refreshData();
        Swal.fire({
          title: 'প্রোফাইল তথ্য সংরক্ষিত হয়েছে!',
          text: 'আপনার ডিসপ্লে নাম ও ব্যক্তিগত তথ্য সফলভাবে আপডেট করা হয়েছে।',
          icon: 'success',
          confirmButtonColor: '#4f46e5',
          background: '#0f172a',
          color: '#f8fafc',
        });
      } else {
        toast.error(data.error || 'আপডেট করতে ব্যর্থ হয়েছে');
      }
    } catch (err: any) {
      toast.error(err.message || 'ত্রুটি ঘটেছে');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Send peer-to-peer swap request
  const handleSendPeerSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userSlot) {
      toast.error('আপনার কোনো সক্রিয় বাজার স্লট নেই');
      return;
    }
    if (!selectedToSlotIndex) {
      toast.error('যে সদস্যের স্লটের সাথে অদলবদল করতে চান তা নির্বাচন করুন');
      return;
    }

    const targetSlot = slots.find((s) => s.slotIndex === selectedToSlotIndex);
    const targetUserId = targetSlot?.assignedUsers?.[0]?.id;

    if (!targetUserId) {
      toast.error('টার্গেট সদস্য পাওয়া যায়নি');
      return;
    }

    try {
      setIsSubmittingSwap(true);
      const res = await fetch('/api/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request_peer_swap',
          userId: effectiveUserId,
          toUserId: targetUserId,
          fromSlotIndex: userSlot.slotIndex,
          toSlotIndex: selectedToSlotIndex,
          reason: swapReason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsPeerSwapModalOpen(false);
        setSwapReason('');
        setSelectedToSlotIndex(null);
        fetchSlots();
        Swal.fire({
          title: 'সোয়াপ অনুরোধ পাঠানো হয়েছে!',
          text: 'উক্ত সদস্য সম্মতি (Accept) দিলে স্বয়ংক্রিয়ভাবে স্লট অদলবদল হবে। সুপার অ্যাডমিনের অনুমোদনের প্রয়োজন নেই।',
          icon: 'success',
          confirmButtonColor: '#4f46e5',
          background: '#0f172a',
          color: '#f8fafc',
        });
      } else {
        toast.error(data.error || 'অনুরোধ পাঠাতে ব্যর্থ হয়েছে');
      }
    } catch (e: any) {
      toast.error(e.message || 'ত্রুটি ঘটেছে');
    } finally {
      setIsSubmittingSwap(false);
    }
  };

  // Respond to swap request (Accept / Reject) - Direct P2P!
  const handleRespondPeerSwap = async (requestId: string, decision: 'accept' | 'reject') => {
    try {
      setRespondingRequestId(requestId);
      const res = await fetch('/api/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'respond_peer_swap',
          requestId,
          decision,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchSlots();
        refreshData();
        Swal.fire({
          title: decision === 'accept' ? 'বাজার ডিউটি সোয়াপ সফল!' : 'অনুরোধ বাতিল হয়েছে',
          text: data.message,
          icon: decision === 'accept' ? 'success' : 'info',
          confirmButtonColor: '#4f46e5',
          background: '#0f172a',
          color: '#f8fafc',
        });
      } else {
        toast.error(data.error || 'ব্যর্থ হয়েছে');
      }
    } catch (e: any) {
      toast.error(e.message || 'ত্রুটি ঘটেছে');
    } finally {
      setRespondingRequestId(null);
    }
  };

  // Fetch daily meal history for this user
  useEffect(() => {
    if (!effectiveUserId) return;
    let isMounted = true;
    const fetchMeals = async () => {
      try {
        setIsLoadingMeals(true);
        const res = await fetch(`/api/meals?userId=${effectiveUserId}`);
        const data = await res.json();
        if (isMounted && data.success) {
          setUserMeals(data.meals || []);
        }
      } catch (e) {
        console.error('Error fetching user meals:', e);
      } finally {
        if (isMounted) setIsLoadingMeals(false);
      }
    };
    fetchMeals();
    return () => {
      isMounted = false;
    };
  }, [effectiveUserId]);

  // 1-LINE PER DATE: Aggregate daily meals by date
  const aggregatedDailyMeals = useMemo(() => {
    const dateMap = new Map<string, {
      date: string;
      morning: number;
      lunch: number;
      night: number;
      totalUnits: number;
      totalCount: number;
    }>();

    userMeals.forEach((m) => {
      if (!dateMap.has(m.date)) {
        dateMap.set(m.date, {
          date: m.date,
          morning: 0,
          lunch: 0,
          night: 0,
          totalUnits: 0,
          totalCount: 0,
        });
      }
      const entry = dateMap.get(m.date)!;
      const count = typeof m.consumed === 'number' ? m.consumed : (m.consumed ? 1 : 0);
      const weight = m.weight || (m.slotId === 'morning' ? 0.5 : 1.0);

      if (m.slotId === 'morning') {
        entry.morning += count;
      } else if (m.slotId === 'lunch') {
        entry.lunch += count;
      } else if (m.slotId === 'night') {
        entry.night += count;
      }
      entry.totalCount += count;
      entry.totalUnits += count;
    });

    let list = Array.from(dateMap.values());

    // Search filter
    if (mealSearchQuery.trim()) {
      const q = mealSearchQuery.trim().toLowerCase();
      list = list.filter((r) => r.date.toLowerCase().includes(q));
    }

    // Status filter
    if (mealStatusFilter === 'active') {
      list = list.filter((r) => r.totalCount > 0);
    } else if (mealStatusFilter === 'off') {
      list = list.filter((r) => r.totalCount === 0);
    }

    // Sort by date
    list.sort((a, b) => {
      const cmp = a.date.localeCompare(b.date);
      return mealSortAsc ? cmp : -cmp;
    });

    return list;
  }, [userMeals, mealSearchQuery, mealStatusFilter, mealSortAsc]);

  // Filtered bazars DataTable
  const filteredBazars = useMemo(() => {
    let list = [...memberBazars];
    if (bazarTypeFilter !== 'all') {
      list = list.filter((b) => b.type === bazarTypeFilter);
    }
    if (bazarSearchQuery.trim()) {
      const q = bazarSearchQuery.toLowerCase().trim();
      list = list.filter(
        (b) =>
          (b.description || '').toLowerCase().includes(q) ||
          String(b.amount || '').includes(q) ||
          b.date.includes(q)
      );
    }
    return list;
  }, [memberBazars, bazarTypeFilter, bazarSearchQuery]);

  // Filtered deposits DataTable
  const filteredDeposits = useMemo(() => {
    let list = [...memberDeposits];
    if (depTypeFilter !== 'all') {
      list = list.filter((d) => {
        if (depTypeFilter === 'utility') return d.type === 'utility' || (d.notes && d.notes.includes('বিল'));
        return d.type === depTypeFilter;
      });
    }
    if (depSearchQuery.trim()) {
      const q = depSearchQuery.toLowerCase().trim();
      list = list.filter(
        (d) =>
          (d.notes || '').toLowerCase().includes(q) ||
          String(d.amount || '').includes(q) ||
          (d.date || '').includes(q)
      );
    }
    return list;
  }, [memberDeposits, depTypeFilter, depSearchQuery]);

  // If Super Admin with no target selected and no self billing result
  if (isSuperAdmin && !requestedUserId) {
    const diningMembers = members.filter((m) => m.role !== 'super_admin');
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-purple-500/30 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Crown className="w-8 h-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">সুপার অ্যাডমিন ওভারভিউ</h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
            সুপার অ্যাডমিন হিসেবে আপনার ব্যক্তিগত কোনো মেস মিল বা বাজার হিসাব নেই। যে কোনো মেস সদস্যের পূর্ণাঙ্গ প্রোফাইল, মিলের ইতিহাস ও প্লাস/মাইনাস হিসাব দেখতে নিচের তালিকা থেকে সদস্য বাছাই করুন:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-4 text-left">
            {diningMembers.map((m) => {
              const res = getMemberBillingResultSafe(summaryData?.calculation, m.userId || m._id);
              const balance = res ? res.netBalance : 0;
              return (
                <button
                  key={m.userId || m._id}
                  onClick={() => router.push(`/dashboard/profile?userId=${m.userId || m._id}`)}
                  className="p-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-purple-500/40 transition-all text-left flex items-center justify-between gap-3 group cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={m.image}
                      alt={m.name}
                      className="w-10 h-10 rounded-xl object-cover border border-slate-700"
                    />
                    <div className="truncate">
                      <div className="text-xs font-bold text-white group-hover:text-purple-300 truncate">
                        {m.name}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">{m.email}</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div
                      className={`text-xs font-bold font-mono ${
                        balance >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {balance >= 0 ? `+${formatTaka(balance)}` : formatTaka(balance)}
                    </div>
                    <span className="text-[9px] text-slate-500">
                      {balance >= 0 ? 'পাওনা' : 'দেনা'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const netBalance = calculationResult ? calculationResult.netBalance : 0;
  const isPlus = netBalance >= 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Breadcrumb & User Switcher for Admin */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="text-[11px] text-slate-400">সদস্য প্রোফাইল ও ব্যক্তিগত হিসাব খাতা</div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span>{targetMember?.name || 'সদস্য প্রোফাইল'}</span>
              {!isViewingSelf && (
                <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full">
                  অ্যাডমিন পরিদর্শন মোড
                </span>
              )}
            </h2>
          </div>
        </div>

        {/* Member Dropdown Switcher if Admin */}
        {(isSuperAdmin || isManager) && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 hidden sm:inline">অন্যান্য সদস্য:</span>
            <select
              value={effectiveUserId}
              onChange={(e) => router.push(`/dashboard/profile?userId=${e.target.value}`)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500 cursor-pointer"
            >
              {members
                .filter((m) => m.role !== 'super_admin')
                .map((m) => (
                  <option key={m.userId || m._id} value={m.userId || m._id}>
                    {m.name} {m.userId === currentUser?.id ? '(আপনি)' : ''}
                  </option>
                ))}
            </select>
          </div>
        )}
      </div>

      {/* Member Profile Overview Card */}
      <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-slate-800 relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <img
              src={targetMember?.image || '/default-avatar.png'}
              alt={targetMember?.name || 'সদস্য'}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-indigo-500/40 shadow-xl shrink-0"
            />
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-black text-white">{targetMember?.name}</h3>
                {targetMember?.role === 'super_admin' ? (
                  <span className="text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                    <Crown className="w-3 h-3 text-purple-400" /> সুপার অ্যাডমিন
                  </span>
                ) : targetMember?.role === 'admin' ? (
                  <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                    <Shield className="w-3 h-3 text-amber-400" /> মেস ম্যানেজার
                  </span>
                ) : (
                  <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                    <User className="w-3 h-3 text-emerald-400" /> মেস সদস্য
                  </span>
                )}
                {targetMember?.isUtilityExempt && (
                  <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    🎁 ইউটিলিটি মওকুফ (Free)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">{targetMember?.email}</p>
              <div className="text-[11px] text-slate-500 flex items-center gap-3 pt-1">
                <span>রুম ভাড়া: <strong className="text-slate-300 font-mono">{formatTaka(targetMember?.roomRent || 0)}</strong></span>
                <span>•</span>
                <span>চক্র: <strong className="text-slate-300">{summaryData?.cycle?.name || 'অক্টোবর ২০২৬'}</strong></span>
              </div>
            </div>
          </div>

          {/* Action Buttons: Print Statement & Deposit */}
          <div className="flex items-center gap-2.5 self-stretch sm:self-auto justify-end flex-wrap">
            {(isViewingSelf || isSuperAdmin) && (
              <button
                onClick={openEditProfile}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-white text-xs font-semibold border border-indigo-500/30 transition-all cursor-pointer shadow-sm"
                title="ইউজার নাম ও ব্যক্তিগত তথ্য পরিবর্তন করুন"
              >
                <Edit3 className="w-4 h-4 text-indigo-400" />
                প্রোফাইল এডিট
              </button>
            )}

            {calculationResult && (
              <button
                onClick={() => openStatement(calculationResult)}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer shadow-sm"
                title="এক পাতার স্টেটমেন্ট প্রিন্ট বা PDF সেভ করুন"
              >
                <Printer className="w-4 h-4 text-indigo-400" />
                প্রিন্ট / PDF স্টেটমেন্ট
              </button>
            )}

            <button
              onClick={openDeposit}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              টাকা জমা দিন
            </button>
          </div>
        </div>
      </div>

      {/* PERSONAL PROFILE & CREDENTIALS CARD */}
      <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">ব্যক্তিগত প্রোফাইল ও যোগাযোগের তথ্য</h4>
              <p className="text-[11px] text-slate-400">মেস সদস্যদের জরুরি যোগাযোগ ও পরিচিতি রেকর্ড</p>
            </div>
          </div>
          {(isViewingSelf || isSuperAdmin) && (
            <button
              onClick={openEditProfile}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              তথ্য পরিবর্তন করুন
            </button>
          )}
        </div>

        {/* Credentials Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Display Name */}
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-1">
            <span className="text-[10px] text-slate-400 block font-medium">ডিসপ্লে / ইউজার নাম</span>
            <div className="text-sm font-bold text-white truncate flex items-center gap-1.5">
              <span>{targetMember?.name}</span>
            </div>
          </div>

          {/* Email with Google Verified */}
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-1">
            <span className="text-[10px] text-slate-400 block font-medium">গুগল ইমেইল</span>
            <div className="text-xs font-semibold text-slate-200 truncate flex items-center gap-1">
              <span className="truncate">{targetMember?.email}</span>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1 rounded shrink-0">
                Google ✓
              </span>
            </div>
          </div>

          {/* Phone */}
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-1">
            <span className="text-[10px] text-slate-400 block font-medium">মোবাইল নম্বর</span>
            {targetMember?.phone ? (
              <a
                href={`tel:${targetMember.phone}`}
                className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 transition-colors"
                title="কল করতে ক্লিক করুন"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>{targetMember.phone}</span>
              </a>
            ) : (
              <span className="text-xs text-slate-500 italic">যোগ করা হয়নি</span>
            )}
          </div>

          {/* WhatsApp */}
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-1">
            <span className="text-[10px] text-slate-400 block font-medium">হোয়াটসঅ্যাপ (WhatsApp)</span>
            {targetMember?.whatsapp ? (
              <a
                href={`https://wa.me/${targetMember.whatsapp.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 transition-colors"
                title="হোয়াটসঅ্যাপে মেসেজ পাঠান"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>{targetMember.whatsapp}</span>
              </a>
            ) : (
              <span className="text-xs text-slate-500 italic">যোগ করা হয়নি</span>
            )}
          </div>

          {/* Date of Birth & Age */}
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-1">
            <span className="text-[10px] text-slate-400 block font-medium">জন্ম তারিখ ও বয়স</span>
            {targetMember?.dob ? (
              <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <span>{targetMember.dob}</span>
                {calculateAge(targetMember.dob) && (
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.2 rounded font-semibold">
                    {calculateAge(targetMember.dob)}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-xs text-slate-500 italic">যোগ করা হয়নি</span>
            )}
          </div>

          {/* Blood Group */}
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-1">
            <span className="text-[10px] text-slate-400 block font-medium">রক্তের গ্রুপ</span>
            {targetMember?.bloodGroup ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-black">
                <Heart className="w-3 h-3 text-rose-400 fill-rose-400/30" />
                {targetMember.bloodGroup}
              </span>
            ) : (
              <span className="text-xs text-slate-500 italic">অজ্ঞাত</span>
            )}
          </div>

          {/* Occupation */}
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-1">
            <span className="text-[10px] text-slate-400 block font-medium">পেশা / প্রতিষ্ঠান</span>
            {targetMember?.occupation ? (
              <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5 truncate">
                <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{targetMember.occupation}</span>
              </div>
            ) : (
              <span className="text-xs text-slate-500 italic">যোগ করা হয়নি</span>
            )}
          </div>

          {/* Emergency Contact */}
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-1">
            <span className="text-[10px] text-slate-400 block font-medium">জরুরি যোগাযোগ নম্বর</span>
            {targetMember?.emergencyContact ? (
              <a
                href={`tel:${targetMember.emergencyContact}`}
                className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>{targetMember.emergencyContact}</span>
              </a>
            ) : (
              <span className="text-xs text-slate-500 italic">যোগ করা হয়নি</span>
            )}
          </div>
        </div>

        {/* Address & Bio Rows */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
          {/* Address */}
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-1">
            <span className="text-[10px] text-slate-400 block font-medium flex items-center gap-1">
              <MapPin className="w-3 h-3 text-indigo-400" />
              বর্তমান / স্থায়ী ঠিকানা
            </span>
            <p className="text-xs text-slate-200 leading-relaxed">
              {targetMember?.address || (
                <span className="text-slate-500 italic">ঠিকানা যুক্ত করা হয়নি</span>
              )}
            </p>
          </div>

          {/* Bio / Description */}
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-1">
            <span className="text-[10px] text-slate-400 block font-medium flex items-center gap-1">
              <FileText className="w-3 h-3 text-indigo-400" />
              সংক্ষিপ্ত পরিচিতি / বিবরণ
            </span>
            <p className="text-xs text-slate-300 leading-relaxed italic">
              {targetMember?.bio ? `“${targetMember.bio}”` : (
                <span className="text-slate-500 not-italic">কোনো পরিচিতি বিবরণ যোগ করা হয়নি</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Incoming Peer Swap Requests Alert (if viewing self and any pending requests) */}
      {isViewingSelf && incomingSwapRequests.length > 0 && (
        <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-amber-500/40 bg-amber-950/20 space-y-3 animate-in fade-in">
          <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>আপনার জন্য বাজার ডিউটি অদলবদল (Swap) এর অনুরোধ এসেছে ({incomingSwapRequests.length}টি)</span>
          </div>
          <div className="space-y-2">
            {incomingSwapRequests.map((req) => (
              <div
                key={req._id}
                className="p-3.5 rounded-xl bg-slate-900/90 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={req.fromUser?.image || `https://api.dicebear.com/7.x/bottts/svg?seed=${req.fromUserId}`}
                    alt={req.fromUser?.name || 'সদস্য'}
                    className="w-10 h-10 rounded-xl object-cover border border-amber-500/40 shrink-0"
                  />
                  <div>
                    <span className="font-bold text-white text-sm block">
                      {req.fromUser?.name || req.userName}
                    </span>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      তাঁর নির্ধারিত স্লট: <strong className="text-amber-300">{req.fromSlotDates}</strong> ⮂ আপনার স্লট:{' '}
                      <strong className="text-emerald-300">{req.toSlotDates}</strong>
                    </p>
                    {req.reason && (
                      <p className="text-[10px] text-slate-400 italic mt-0.5">
                        কারণ: &ldquo;{req.reason}&rdquo;
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    onClick={() => handleRespondPeerSwap(req._id, 'reject')}
                    disabled={respondingRequestId === req._id}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                  >
                    প্রত্যাখ্যান
                  </button>
                  <button
                    onClick={() => handleRespondPeerSwap(req._id, 'accept')}
                    disabled={respondingRequestId === req._id}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>সম্মত (Accept)</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monthly Bazar Duty & 5-Day Slot Schedule Card */}
      <div
        className={`glass-panel rounded-3xl p-5 border relative overflow-hidden transition-all ${
          isDutyActiveToday
            ? 'border-emerald-500/50 bg-gradient-to-b from-emerald-950/30 to-slate-950/80 shadow-lg shadow-emerald-500/10'
            : 'border-slate-800 bg-slate-900/60'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5 uppercase tracking-wider">
                <Calendar className="w-4 h-4 text-indigo-400" />
                চলতি মাসের বাজার ডিউটি (৫ দিনের স্লট)
              </span>

              {userSlot ? (
                isDutyActiveToday ? (
                  <span className="text-[10px] bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1.5 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    আজ আপনার বাজার ডিউটি সক্রিয়
                  </span>
                ) : isDutyPast ? (
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2.5 py-0.5 rounded-full font-medium">
                    ডিউটি সম্পন্ন হয়েছে
                  </span>
                ) : (
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-full font-medium">
                    আসন্ন বাজার ডিউটি
                  </span>
                )
              ) : (
                <span className="text-[10px] bg-slate-800 text-slate-400 px-2.5 py-0.5 rounded-full">
                  স্লট নির্ধারিত নেই
                </span>
              )}
            </div>

            {userSlot ? (
              <div>
                <h4 className="text-base sm:text-lg font-black text-white flex items-center gap-2 flex-wrap">
                  <span>স্লট #{userSlot.slotIndex}:</span>
                  <span className="text-indigo-300 font-mono font-semibold">
                    {userSlot.startDate} হতে {userSlot.endDate}
                  </span>
                  <span className="text-xs font-normal text-slate-400 hidden sm:inline">(৫ দিন মেয়াদী)</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  এই নির্ধারিত ৫ দিন সময়ের মধ্যে মেসের দৈনিক রেগুলার বাজার সরাসরি ক্রয় ও তোলার দায়িত্ব আপনার।
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                চলতি মাসের রোস্টারে আপনার নামে কোনো সক্রিয় ৫-দিনের বাজার স্লট নির্ধারিত নেই।
              </p>
            )}
          </div>

          <div className="flex items-center gap-2.5 self-stretch sm:self-auto justify-end flex-wrap">
            {isViewingSelf && userSlot && (
              <button
                onClick={() => {
                  setIsPeerSwapModalOpen(true);
                  const other = slots.find((s) => s.slotIndex !== userSlot.slotIndex);
                  if (other) setSelectedToSlotIndex(other.slotIndex);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 text-xs font-semibold transition-all cursor-pointer shadow-sm"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>বাজার ডিউটি সোয়াপ করুন</span>
              </button>
            )}

            <Link
              href="/dashboard/schedule"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>সম্পূর্ণ রোস্টার দেখুন</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Hero Financial Summary & Net Balance Cards (Plus / Minus) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Total Deposits / Credits */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-2 bg-gradient-to-b from-slate-900/80 to-slate-950/80">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-emerald-400" />
              মোট জমা ও ক্রেডিট
            </span>
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              জমা
            </span>
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {formatTaka(calculationResult?.totalCredits || 0)}
          </div>
          <div className="space-y-1 text-[11px] text-slate-400 border-t border-slate-800/80 pt-2 font-mono">
            <div className="flex justify-between">
              <span>সাধারণ মেস জমা:</span>
              <span className="text-slate-200">{formatTaka(calculationResult?.generalDeposits || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>বড় বাজার ফান্ড জমা:</span>
              <span className="text-slate-200">{formatTaka(calculationResult?.bigBazarDeposits || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>নিজ পকেট থেকে বাজার:</span>
              <span className="text-slate-200">{formatTaka(calculationResult?.approvedBazarSpentOwnMoney || 0)}</span>
            </div>
          </div>
        </div>

        {/* 2. Total Dues / Expenses */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-2 bg-gradient-to-b from-slate-900/80 to-slate-950/80">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-1.5">
              <Utensils className="w-4 h-4 text-amber-400" />
              মোট মেস খরচ ও দাবি
            </span>
            <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              খরচ
            </span>
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {formatTaka(calculationResult?.totalDues || 0)}
          </div>
          <div className="space-y-1 text-[11px] text-slate-400 border-t border-slate-800/80 pt-2 font-mono">
            <div className="flex justify-between">
              <span>মিল খরচ ({calculationResult?.mealUnits || 0} টি):</span>
              <span className="text-slate-200">{formatTaka(calculationResult?.regularMealCost || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>ফিক্সড ভোজ / স্পেশাল মিল:</span>
              <span className="text-slate-200">{formatTaka(calculationResult?.fixedShare || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>ইউটিলিটি ও খালা বিল:</span>
              <span className="text-slate-200">{formatTaka(calculationResult?.utilityShare || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>রুম ভাড়া:</span>
              <span className="text-slate-200">{formatTaka(calculationResult?.roomRent || 0)}</span>
            </div>
          </div>
        </div>

        {/* 3. Net Balance (Plus or Minus) */}
        <div
          className={`glass-panel rounded-2xl p-5 border space-y-2 relative overflow-hidden ${
            isPlus
              ? 'border-emerald-500/50 bg-gradient-to-b from-emerald-950/40 to-slate-950/90 shadow-lg shadow-emerald-500/10'
              : 'border-rose-500/50 bg-gradient-to-b from-rose-950/40 to-slate-950/90 shadow-lg shadow-rose-500/10'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className={`flex items-center gap-1.5 ${isPlus ? 'text-emerald-300' : 'text-rose-300'}`}>
              {isPlus ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              বর্তমান নিট ব্যালেন্স ({isPlus ? 'পাওনা / প্লাস' : 'দেনা / মাইনাস'})
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                isPlus
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              }`}
            >
              {isPlus ? 'প্লাস ব্যালেন্স' : 'মাইনাস ব্যালেন্স'}
            </span>
          </div>

          <div
            className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${
              isPlus ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isPlus ? `+${formatTaka(netBalance)}` : `-${formatTaka(Math.abs(netBalance))}`}
          </div>

          <div className="text-[11px] leading-relaxed border-t border-slate-800/80 pt-2 text-slate-300">
            {isPlus ? (
              <span className="text-emerald-300/90 flex items-start gap-1">
                <CheckCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-400" />
                মেসের কাছে আপনার এই টাকা জমা রয়েছে। চলতি মাস শেষে বা হিসাব নিষ্পত্তিতে এই টাকা আপনি ফেরত পাবেন।
              </span>
            ) : (
              <span className="text-rose-300/90 flex items-start gap-1">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-400" />
                মেসের কাছে আপনার এই টাকা বকেয়া রয়েছে। মেস পরিচালনার সুবিধার্থে অনুগ্রহ করে দ্রুত পরিশোধ করুন।
              </span>
            )}
          </div>
        </div>
      </div>

      {/* History Tabs Navigation */}
      <div className="glass-panel rounded-2xl p-2 border border-slate-800 flex items-center gap-1.5 overflow-x-auto text-xs">
        {[
          { id: 'overview', label: 'আর্থিক বিবরণী ও লেজার', icon: FileText, count: null },
          { id: 'meals', label: 'মিলের ইতিহাস (তারিখ অনুযায়ী)', icon: Utensils, count: aggregatedDailyMeals.length },
          { id: 'fixed', label: 'ফিক্সড মিল / ভোজ', icon: Sparkles, count: memberFixedEvents.length },
          { id: 'bazar', label: 'বাজার ভাউচার', icon: ShoppingBag, count: memberBazars.length },
          { id: 'deposits', label: 'জমা ও পেমেন্ট ইতিহাস', icon: Wallet, count: memberDeposits.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeHistoryTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveHistoryTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-indigo-700 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Financial Overview & Ledger Breakdown */}
      {activeHistoryTab === 'overview' && (
        <div className="space-y-4">
          <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                ব্যক্তিগত হিসাব খাতার পূর্ণাঙ্গ লেজার (SRS সেকশন ৫ অনুয়ায়ী)
              </h4>
              {calculationResult && (
                <button
                  onClick={() => openStatement(calculationResult)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  স্টেটমেন্ট প্রিন্ট / PDF
                </button>
              )}
            </div>

            <div className="divide-y divide-slate-800/80 text-xs">
              {/* Row 1 */}
              <div className="py-2.5 flex justify-between items-center">
                <div>
                  <span className="font-semibold text-slate-200">১. মোট কনজিউমড মিল</span>
                  <div className="text-[11px] text-slate-400">
                    রেগুলার মিল সংখ্যা: {calculationResult?.mealUnits || 0} টি × বর্তমান রেট{' '}
                    {formatTaka(summaryData?.calculation?.mealRate || 0)}
                  </div>
                </div>
                <span className="font-mono font-bold text-slate-200">
                  {formatTaka(calculationResult?.regularMealCost || 0)}
                </span>
              </div>

              {/* Row 2 */}
              <div className="py-2.5 flex justify-between items-center">
                <div>
                  <span className="font-semibold text-slate-200">২. ফিক্সড মিল / বিশেষ ভোজের অংশ</span>
                  <div className="text-[11px] text-slate-400">
                    উপস্থিত স্পেশাল ভোজের ইভেন্ট সংখ্যা: {memberFixedEvents.length} টি
                  </div>
                </div>
                <span className="font-mono font-bold text-slate-200">
                  {formatTaka(calculationResult?.fixedShare || 0)}
                </span>
              </div>

              {/* Row 3 */}
              <div className="py-2.5 flex justify-between items-center">
                <div>
                  <span className="font-semibold text-slate-200">৩. মেস ইউটিলিটি ও খালা বিল</span>
                  <div className="text-[11px] text-slate-400">
                    {targetMember?.isUtilityExempt
                      ? 'অ্যাডমিন কর্তৃক এই মাসে ইউটিলিটি চার্জ মওকুফ করা হয়েছে (৳০)'
                      : 'বিদ্যুৎ, পানি, গ্যাস, ইন্টারনেট ও খালা বিলের সমবণ্টন'}
                  </div>
                </div>
                <span className="font-mono font-bold text-slate-200">
                  {formatTaka(calculationResult?.utilityShare || 0)}
                </span>
              </div>

              {/* Row 4 */}
              <div className="py-2.5 flex justify-between items-center">
                <div>
                  <span className="font-semibold text-slate-200">৪. অতিরিক্ত বাজার (নন-মিল শেয়ার)</span>
                  <div className="text-[11px] text-slate-400">মেসের বিশেষ আইটেমের সমবণ্টন</div>
                </div>
                <span className="font-mono font-bold text-slate-200">
                  {formatTaka(calculationResult?.extraShareNonPool || 0)}
                </span>
              </div>

              {/* Row 5 */}
              <div className="py-2.5 flex justify-between items-center">
                <div>
                  <span className="font-semibold text-slate-200">৫. নির্ধারিত রুম ভাড়া</span>
                  <div className="text-[11px] text-slate-400">চলমান চক্রের মাসিক সিট / রুম ভাড়া</div>
                </div>
                <span className="font-mono font-bold text-slate-200">
                  {formatTaka(calculationResult?.roomRent || 0)}
                </span>
              </div>

              {/* Total Dues Subtotal */}
              <div className="py-3 flex justify-between items-center bg-slate-900/50 px-3 rounded-xl font-bold">
                <span className="text-amber-300">মোট খরচ ও চার্জ (দাবি)</span>
                <span className="font-mono text-amber-300 text-sm">
                  {formatTaka(calculationResult?.totalDues || 0)}
                </span>
              </div>

              {/* Credits Section */}
              <div className="py-2.5 flex justify-between items-center pt-4">
                <div>
                  <span className="font-semibold text-emerald-300">৬. সাধারণ মেস জমা (Deposits)</span>
                  <div className="text-[11px] text-slate-400">বিকাশ, নগদ বা ব্যাংক মারফত মেস ফান্ডে জমাকৃত টাকা</div>
                </div>
                <span className="font-mono font-bold text-emerald-400">
                  {formatTaka(calculationResult?.generalDeposits || 0)}
                </span>
              </div>

              <div className="py-2.5 flex justify-between items-center">
                <div>
                  <span className="font-semibold text-emerald-300">৭. বড় বাজার ফান্ড জমা</span>
                  <div className="text-[11px] text-slate-400">বড় বাজারের জন্য নির্ধারিত অগ্রিম ফান্ড</div>
                </div>
                <span className="font-mono font-bold text-emerald-400">
                  {formatTaka(calculationResult?.bigBazarDeposits || 0)}
                </span>
              </div>

              <div className="py-2.5 flex justify-between items-center">
                <div>
                  <span className="font-semibold text-emerald-300">৮. নিজ পকেট থেকে বাজার খরচ (অনুমোদিত)</span>
                  <div className="text-[11px] text-slate-400">মেসের বাজার করে নিজের পকেট থেকে দেওয়া টাকা</div>
                </div>
                <span className="font-mono font-bold text-emerald-400">
                  {formatTaka(calculationResult?.approvedBazarSpentOwnMoney || 0)}
                </span>
              </div>

              {/* Total Credits Subtotal */}
              <div className="py-3 flex justify-between items-center bg-emerald-950/30 px-3 rounded-xl font-bold">
                <span className="text-emerald-300">মোট পরিশোধ ও ক্রেডিট (জমা)</span>
                <span className="font-mono text-emerald-300 text-sm">
                  {formatTaka(calculationResult?.totalCredits || 0)}
                </span>
              </div>

              {/* Final Net Result */}
              <div
                className={`py-4 flex justify-between items-center px-4 rounded-xl font-extrabold text-base mt-2 ${
                  isPlus
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}
              >
                <span>নিট ব্যালেন্স ({isPlus ? 'মেস থেকে পাওনা (+)' : 'মেসের কাছে দেনা (-)'})</span>
                <span className="font-mono text-lg">
                  {isPlus ? `+${formatTaka(netBalance)}` : `-${formatTaka(Math.abs(netBalance))}`}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Daily Meal History (1 ROW PER DATE DataTable) */}
      {activeHistoryTab === 'meals' && (
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden space-y-3 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Utensils className="w-4 h-4 text-amber-400" />
                দৈনিক মিল খাতা (তারিখ প্রতি একক সারি)
              </h4>
              <p className="text-[11px] text-slate-400">
                একই তারিখের সকাল, দুপুর ও রাতের মিল এক লাইনে প্রদর্শিত হচ্ছে।
              </p>
            </div>
            <div className="text-xs text-slate-400 font-mono bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
              মোট মিল ইউনিট: <strong className="text-amber-400">{calculationResult?.mealUnits || 0}</strong>
            </div>
          </div>

          {/* DataTable Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={mealSearchQuery}
                onChange={(e) => setMealSearchQuery(e.target.value)}
                placeholder="তারিখ দিয়ে খুঁজুন (YYYY-MM-DD)..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              {mealSearchQuery && (
                <button
                  onClick={() => setMealSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  ×
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs flex-wrap">
              <button
                onClick={() => setMealStatusFilter('all')}
                className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                  mealStatusFilter === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                সব দিন ({aggregatedDailyMeals.length})
              </button>
              <button
                onClick={() => setMealStatusFilter('active')}
                className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                  mealStatusFilter === 'active'
                    ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                চালু দিন
              </button>
              <button
                onClick={() => setMealStatusFilter('off')}
                className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                  mealStatusFilter === 'off'
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                বন্ধ দিন
              </button>
              <button
                onClick={() => setMealSortAsc(!mealSortAsc)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700 cursor-pointer"
                title="তারিখ অনুসারে সাজান"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>{mealSortAsc ? 'পুরাতন আগে' : 'নতুন আগে'}</span>
              </button>
            </div>
          </div>

          {/* Table Container */}
          {isLoadingMeals ? (
            <div className="p-8 text-center text-xs text-slate-400">মিল রেকর্ড লোড হচ্ছে...</div>
          ) : aggregatedDailyMeals.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              কোনো মিলের রেকর্ড পাওয়া যায়নি।
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[10px] uppercase">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">তারিখ</th>
                    <th className="py-2.5 px-3 font-semibold text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Sun className="w-3.5 h-3.5 text-amber-400" />
                        <span>সকাল (0.5)</span>
                      </div>
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Coffee className="w-3.5 h-3.5 text-orange-400" />
                        <span>দুপুর</span>
                      </div>
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Moon className="w-3.5 h-3.5 text-indigo-400" />
                        <span>রাত / সন্ধ্যা (1.0)</span>
                      </div>
                    </th>
                    <th className="py-2.5 px-4 font-semibold text-right">মোট মিল ইউনিট</th>
                    <th className="py-2.5 px-4 font-semibold text-center">স্ট্যাটাস</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {aggregatedDailyMeals.map((row) => {
                    const isAnyConsumed = row.totalCount > 0;
                    return (
                      <tr key={row.date} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 text-white font-bold whitespace-nowrap">
                          {row.date}
                        </td>

                        {/* Morning */}
                        <td className="py-3 px-3 text-center">
                          {row.morning > 0 ? (
                            <span className="inline-block px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                              {row.morning} টি
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[11px]">বন্ধ</span>
                          )}
                        </td>

                        {/* Lunch */}
                        <td className="py-3 px-3 text-center">
                          {row.lunch > 0 ? (
                            <span className="inline-block px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30 font-bold">
                              {row.lunch} টি
                            </span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>

                        {/* Night */}
                        <td className="py-3 px-3 text-center">
                          {row.night > 0 ? (
                            <span className="inline-block px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
                              {row.night} টি
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[11px]">বন্ধ</span>
                          )}
                        </td>

                        {/* Total Units */}
                        <td className="py-3 px-4 text-right">
                          <span className="font-extrabold text-amber-400">
                            {formatMealUnits(row.totalUnits)} ইউনিট
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            ({row.totalCount} টি মিল)
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block text-[10px] font-sans px-2 py-0.5 rounded font-bold ${
                              isAnyConsumed
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-500'
                            }`}
                          >
                            {isAnyConsumed ? 'মিল চালু' : 'বন্ধ ছিল'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Fixed Feasts & Events */}
      {activeHistoryTab === 'fixed' && (
        <div className="glass-panel rounded-2xl border border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              উপস্থিত ফিক্সড বাজার ও বিশেষ ভোজ ({memberFixedEvents.length} টি)
            </h4>
            <span className="text-xs text-slate-400">
              মোট ফিক্সড খরচ: <strong className="text-amber-400 font-mono">{formatTaka(calculationResult?.fixedShare || 0)}</strong>
            </span>
          </div>

          {memberFixedEvents.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">
              এই চক্রে আপনি কোনো ফিক্সড মিল বা বিশেষ ভোজে অংশ নেননি।
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {memberFixedEvents.map((evt) => (
                <div
                  key={evt._id}
                  className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 relative"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-amber-300">{evt.title}</span>
                    <span className="text-[10px] font-mono text-slate-400">{evt.date}</span>
                  </div>
                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-xs text-slate-400">
                      ইভেন্টের মোট খরচ: <strong className="text-slate-200">{formatTaka(evt.cost)}</strong>
                    </span>
                    <span className="text-xs font-bold text-emerald-400">
                      আপনার অংশ: {formatTaka(evt.perPersonCost)}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 border-t border-slate-800 pt-1.5">
                    উপস্থিত সদস্য সংখ্যা: {evt.attendees?.length || evt.attendeeUserIds?.length || 0} জন
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Bazar History (DataTable) */}
      {activeHistoryTab === 'bazar' && (
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden space-y-3 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-blue-400" />
                ব্যক্তিগত বাজার ভাউচারের ইতিহাস
              </h4>
              <p className="text-[11px] text-slate-400">
                অনুমোদিত বাজার সরাসরি আপনার অ্যাকাউন্টে ক্রেডিট (পাওনা) হিসেবে যোগ হয়।
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
              অনুমোদিত মোট ক্রেডিট: <strong className="text-emerald-400">{formatTaka(calculationResult?.approvedBazarSpentOwnMoney || 0)}</strong>
            </span>
          </div>

          {/* DataTable Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={bazarSearchQuery}
                onChange={(e) => setBazarSearchQuery(e.target.value)}
                placeholder="পণ্যের বিবরণ বা টাকা দিয়ে খুঁজুন..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs overflow-x-auto">
              {[
                { id: 'all', label: 'সব বাজার' },
                { id: 'regular', label: 'রেগুলার' },
                { id: 'big', label: 'বড় বাজার' },
                { id: 'extra', label: 'এক্সট্রা' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setBazarTypeFilter(tab.id as any)}
                  className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                    bazarTypeFilter === tab.id
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {filteredBazars.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              কোনো বাজার রেকর্ড খুঁজে পাওয়া যায়নি।
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[10px] uppercase">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">তারিখ</th>
                    <th className="py-2.5 px-4 font-semibold">বিবরণ ও ফর্দ</th>
                    <th className="py-2.5 px-4 font-semibold">ধরণ</th>
                    <th className="py-2.5 px-4 font-semibold text-right">পরিমাণ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredBazars.map((b) => (
                    <tr key={b._id} className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-4 font-mono text-slate-400">{b.date}</td>
                      <td className="py-2.5 px-4">
                        <span className="font-semibold text-white block">{b.description}</span>
                        {b.items && b.items.length > 0 && (
                          <span className="text-[10px] text-amber-300/80 font-mono">
                            📋 {b.items.length}টি জিনিসের তালিকা
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            b.type === 'regular'
                              ? 'bg-blue-500/20 text-blue-300'
                              : b.type === 'big'
                              ? 'bg-purple-500/20 text-purple-300'
                              : 'bg-emerald-500/20 text-emerald-300'
                          }`}
                        >
                          {b.type === 'regular' ? 'রেগুলার' : b.type === 'big' ? 'বড় বাজার' : 'এক্সট্রা'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-amber-400">
                        {formatTaka(b.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Deposit History (DataTable) */}
      {activeHistoryTab === 'deposits' && (
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden space-y-3 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-400" />
                জমা ও বিল পরিশোধের ইতিহাস
              </h4>
              <p className="text-[11px] text-slate-400">
                সাধারণ জমা, খালা বিল পরিশোধ বা বড় বাজারের সকল নগদ লেনদেনের খাতা।
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
              মোট জমা: <strong className="text-emerald-400">{formatTaka((calculationResult?.generalDeposits || 0) + (calculationResult?.bigBazarDeposits || 0))}</strong>
            </span>
          </div>

          {/* DataTable Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={depSearchQuery}
                onChange={(e) => setDepSearchQuery(e.target.value)}
                placeholder="নোট বা বিবরণ দিয়ে খুঁজুন (যেমন: Buwa)..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs overflow-x-auto">
              {[
                { id: 'all', label: 'সব জমা' },
                { id: 'general', label: 'সাধারণ জমা' },
                { id: 'utility', label: 'ইউটিলিটি ও খালা বিল' },
                { id: 'big_bazar', label: 'বড় বাজার ফান্ড' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setDepTypeFilter(tab.id as any)}
                  className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                    depTypeFilter === tab.id
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {filteredDeposits.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              কোনো জমার রেকর্ড খুঁজে পাওয়া যায়নি।
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[10px] uppercase">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">তারিখ</th>
                    <th className="py-2.5 px-4 font-semibold">বিবরণ / নোট</th>
                    <th className="py-2.5 px-4 font-semibold">জমার ধরণ</th>
                    <th className="py-2.5 px-4 font-semibold text-right">টাকার পরিমাণ</th>
                    <th className="py-2.5 px-4 font-semibold text-center">স্ট্যাটাস</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredDeposits.map((dep) => (
                    <tr key={dep._id} className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-4 font-mono text-slate-400">{dep.date || '২০২৬-১০-১৫'}</td>
                      <td className="py-2.5 px-4 font-medium text-white">{dep.notes || 'সাধারণ জমা'}</td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            dep.type === 'big_bazar'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : dep.type === 'utility' || (dep.notes && dep.notes.includes('বিল'))
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {dep.type === 'big_bazar'
                            ? 'বড় বাজার ফান্ড'
                            : dep.type === 'utility' || (dep.notes && dep.notes.includes('বিল'))
                            ? 'ইউটিলিটি ও বিল পরিশোধ'
                            : 'সাধারণ মেস জমা'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-400">
                        {formatTaka(dep.amount)}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          পরিশোধিত
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL: MEMBER TO MEMBER PEER SWAP MODAL */}
      {isPeerSwapModalOpen && userSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-white text-sm">বাজার ডিউটি সোয়াপের আবেদন</h3>
              </div>
              <button
                onClick={() => setIsPeerSwapModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendPeerSwap} className="p-5 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">
                  আপনার বর্তমান দায়িত্ব
                </span>
                <p className="text-slate-200 font-bold text-xs">
                  স্লট #{userSlot.slotIndex}: {userSlot.startDate} হতে {userSlot.endDate} (৫ দিন)
                </p>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">
                  কার স্লটের সাথে অদলবদল (Swap) করতে চান?
                </label>
                <select
                  value={selectedToSlotIndex || ''}
                  onChange={(e) => setSelectedToSlotIndex(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-indigo-500 cursor-pointer"
                  required
                >
                  <option value="">সদস্য ও স্লট নির্বাচন করুন...</option>
                  {slots
                    .filter((s) => s.slotIndex !== userSlot.slotIndex)
                    .map((s) => {
                      const user = s.assignedUsers?.[0];
                      return (
                        <option key={s.slotIndex} value={s.slotIndex}>
                          {user ? user.name : 'সদস্য'} — স্লট #{s.slotIndex} ({s.startDate} হতে {s.endDate})
                        </option>
                      );
                    })}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">সোয়াপের কারণ (ঐচ্ছিক)</label>
                <input
                  type="text"
                  placeholder="যেমন: ঐ সময়ে পরীক্ষা / জরুরি ব্যক্তিগত কাজ আছে"
                  value={swapReason}
                  onChange={(e) => setSwapReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[11px] leading-relaxed">
                💡 <strong>নীতিমালা:</strong> এই আবেদন পাঠানোর পর উক্ত সদস্য যদি সম্মতি (Accept) দেন, তবে স্বয়ংক্রিয়ভাবে স্লট দুটি পরস্পর বদল হয়ে যাবে। এর জন্য সুপার অ্যাডমিনের হস্তক্ষেপের প্রয়োজন নেই।
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPeerSwapModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSwap}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
                >
                  {isSubmittingSwap ? 'পাঠানো হচ্ছে...' : 'সোয়াপ অনুরোধ পাঠান'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PROFILE MODAL */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="glass-panel w-full max-w-2xl rounded-3xl border border-indigo-500/40 bg-slate-900/95 p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">প্রোফাইল তথ্য ও ডিসপ্লে নাম পরিবর্তন</h3>
                  <p className="text-xs text-slate-400">আপনার ডিসপ্লে নাম ও যোগাযোগের ক্রেডেনশিয়াল আপডেট করুন</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditProfileOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Display Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    ডিসপ্লে / ইউজার নাম <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="আপনার নাম লিখুন"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none transition-all font-semibold"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    মেসের মিল খাতা, বাজার তালিকা ও ড্যাশবোর্ডে এই নামটি প্রদর্শিত হবে।
                  </p>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">মোবাইল নম্বর</label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="017xxxxxxxx"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none transition-all"
                  />
                </div>

                {/* WhatsApp */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">হোয়াটসঅ্যাপ নম্বর</label>
                  <input
                    type="tel"
                    value={editWhatsapp}
                    onChange={(e) => setEditWhatsapp(e.target.value)}
                    placeholder="017xxxxxxxx"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none transition-all"
                  />
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">জন্ম তারিখ</label>
                  <input
                    type="date"
                    value={editDob}
                    onChange={(e) => setEditDob(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none transition-all cursor-pointer"
                  />
                </div>

                {/* Blood Group */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">রক্তের গ্রুপ</label>
                  <select
                    value={editBloodGroup}
                    onChange={(e) => setEditBloodGroup(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none transition-all cursor-pointer"
                  >
                    <option value="">বাছাই করুন</option>
                    <option value="A+">A+ (A Positive)</option>
                    <option value="A-">A- (A Negative)</option>
                    <option value="B+">B+ (B Positive)</option>
                    <option value="B-">B- (B Negative)</option>
                    <option value="O+">O+ (O Positive)</option>
                    <option value="O-">O- (O Negative)</option>
                    <option value="AB+">AB+ (AB Positive)</option>
                    <option value="AB-">AB- (AB Negative)</option>
                  </select>
                </div>

                {/* Occupation */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">পেশা / প্রতিষ্ঠান</label>
                  <input
                    type="text"
                    value={editOccupation}
                    onChange={(e) => setEditOccupation(e.target.value)}
                    placeholder="যেমন: সফটওয়্যার ইঞ্জিনিয়ার / শিক্ষার্থী"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none transition-all"
                  />
                </div>

                {/* Emergency Contact */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">জরুরি যোগাযোগ নম্বর</label>
                  <input
                    type="tel"
                    value={editEmergencyContact}
                    onChange={(e) => setEditEmergencyContact(e.target.value)}
                    placeholder="অভিভাবক বা জরুরি নম্বর"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none transition-all"
                  />
                </div>

                {/* Address */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">বর্তমান / স্থায়ী ঠিকানা</label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    placeholder="গ্রাম/বাড়ি, থানা/উপজেলা, জেলা"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none transition-all"
                  />
                </div>

                {/* Bio */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">সংক্ষিপ্ত পরিচিতি (Bio / বিবরণ)</label>
                  <textarea
                    rows={2}
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    placeholder="নিজের সম্পর্কে সংক্ষিপ্ত পরিচিতি..."
                    className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  disabled={isSavingProfile}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingProfile ? 'সংরক্ষণ হচ্ছে...' : 'তথ্য সংরক্ষণ করুন'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <GlobalLoader
          message="প্রোফাইল ও হিসাব খাতা লোড হচ্ছে..."
          subMessage="ব্যক্তিগত মিল, বাজার ও ব্যালেন্স প্রস্তুত করা হচ্ছে"
        />
      }
    >
      <MasterErrorBoundary fallbackTitle="সদস্য প্রোফাইল লোড করতে সমস্যা হয়েছে">
        <ProfileContent />
      </MasterErrorBoundary>
    </Suspense>
  );
}
