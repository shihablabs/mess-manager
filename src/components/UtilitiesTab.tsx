'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Lightbulb,
  Package,
  Plus,
  DollarSign,
  Wallet,
  Shield,
  ToggleLeft,
  ToggleRight,
  Edit2,
  Check,
  X,
  AlertCircle,
  UserCheck,
  Download,
  Upload,
  Building2,
  Database,
  Archive,
  FileJson,
  CheckCircle,
  Clock,
  RotateCw,
  RotateCcw,
  Sparkles,
  Save,
  Phone,
  WhatsApp,
} from '@/components/icons';
import { formatTaka } from '@/lib/money';
import { AppUser } from '@/lib/session';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { confirmAction, promptRentPaymentModal, showRentSuccessModal } from '@/lib/alerts';

interface UtilitiesTabProps {
  currentUser: AppUser;
  bills: any[];
  deposits: any[];
  members?: any[];
  cycle: any;
  onRefresh: () => void;
  onOpenDepositModal: () => void;
}

export const UtilitiesTab: React.FC<UtilitiesTabProps> = ({
  currentUser,
  bills,
  deposits,
  members = [],
  cycle,
  onRefresh,
  onOpenDepositModal,
}) => {
  const [newBillType, setNewBillType] = useState('');
  const [newBillAmount, setNewBillAmount] = useState('');
  const [newBillPayer, setNewBillPayer] = useState<string>('mess_fund');
  const [isAddingBill, setIsAddingBill] = useState(false);

  // Big Bazar management state
  const [isTogglingBigBazar, setIsTogglingBigBazar] = useState(false);
  const [isEditingContribution, setIsEditingContribution] = useState(false);
  const [contributionInput, setContributionInput] = useState(
    String(cycle?.bigBazarContributionPerMember ?? 1400)
  );

  const totalUtility = bills.reduce((sum, b) => sum + b.amount, 0);
  const isSuperAdmin = currentUser.role === 'super_admin';
  const isManager = currentUser.role === 'admin' || isSuperAdmin;

  // House Rent State & Handlers
  const [rentData, setRentData] = useState<any[]>([]);
  const [rentSummary, setRentSummary] = useState<any>({
    totalRentDue: 0,
    totalRentCollected: 0,
    totalRentPending: 0,
    paidCount: 0,
    pendingCount: 0,
    totalMembers: 0,
  });
  const [isLoadingRent, setIsLoadingRent] = useState(false);
  const [rentProcessingUserId, setRentProcessingUserId] = useState<string | null>(null);
  const [editingRentUserId, setEditingRentUserId] = useState<string | null>(null);
  const [editingRentAmount, setEditingRentAmount] = useState<string>('');

  const fetchRentData = async () => {
    try {
      setIsLoadingRent(true);
      const cycleIdParam = cycle?._id ? `?cycleId=${cycle._id}` : '';
      const res = await fetch(`/api/rent${cycleIdParam}`);
      const data = await res.json();
      if (data.success) {
        setRentData(data.members || []);
        if (data.summary) setRentSummary(data.summary);
      }
    } catch (e) {
      console.error('Error fetching rent data:', e);
    } finally {
      setIsLoadingRent(false);
    }
  };

  useEffect(() => {
    fetchRentData();
  }, [cycle?._id]);

  // Double Popup Mark Rent Paid (Interactive SweetAlert with time, note & receipt)
  const handleMarkRentPaid = async (member: any) => {
    const paymentInput = await promptRentPaymentModal({
      memberName: member.name,
      roomRent: member.roomRent,
      cycleName: cycle?.name,
    });

    if (!paymentInput) return; // User cancelled

    try {
      setRentProcessingUserId(member.userId);
      const res = await fetch('/api/rent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark_rent_paid',
          userId: member.userId,
          cycleId: cycle?._id,
          amount: paymentInput.amount,
          paymentMethod: paymentInput.paymentMethod,
          paidAt: paymentInput.paidAt,
          notes: paymentInput.notes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await Promise.all([fetchRentData(), onRefresh()]);
        // Step 2: Show Success Receipt Modal
        await showRentSuccessModal({
          memberName: member.name,
          amount: paymentInput.amount,
          paymentMethodLabel: paymentInput.paymentMethodLabel,
          paidAt: paymentInput.paidAt,
          notes: paymentInput.notes,
        });
      } else {
        toast.error(data.error || 'ভাড়া পরিশোধ রেকর্ড করতে ব্যর্থ হয়েছে');
      }
    } catch (err: any) {
      toast.error(err.message || 'নেটওয়ার্ক ত্রুটি ঘটেছে');
    } finally {
      setRentProcessingUserId(null);
    }
  };

  // Revert Rent Paid to Unpaid
  const handleRevertRentPaid = async (member: any) => {
    const isConfirmed = await confirmAction({
      title: 'ভাড়া বকেয়া করতে চান?',
      text: `${member.name} এর পেইড মার্কিং তুলে নিয়ে বকেয়া হিসেবে সেট করা হবে এবং সংশ্লিষ্ট জমা এন্ট্রি বাতিল হবে।`,
      icon: 'warning',
      confirmText: 'হ্যাঁ, বকেয়া করুন',
      cancelText: 'বাতিল',
      confirmColor: '#e11d48',
    });
    if (!isConfirmed) return;

    try {
      setRentProcessingUserId(member.userId);
      const res = await fetch('/api/rent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'revert_rent_paid',
          userId: member.userId,
          cycleId: cycle?._id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'বাসা ভাড়া বকেয়া হিসেবে রিভার্স করা হয়েছে');
        await Promise.all([fetchRentData(), onRefresh()]);
      } else {
        toast.error(data.error || 'ব্যর্থ হয়েছে');
      }
    } catch (err: any) {
      toast.error(err.message || 'নেটওয়ার্ক ত্রুটি ঘটেছে');
    } finally {
      setRentProcessingUserId(null);
    }
  };

  // Update Member Room Rent
  const handleSaveRoomRent = async (userId: string) => {
    const amountNum = Number(editingRentAmount);
    if (isNaN(amountNum) || amountNum < 0) {
      toast.warning('সঠিক টাকার অঙ্ক লিখুন');
      return;
    }

    try {
      setRentProcessingUserId(userId);
      const res = await fetch('/api/rent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_room_rent',
          userId,
          cycleId: cycle?._id,
          roomRent: amountNum,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('বাসা ভাড়া সফলভাবে আপডেট হয়েছে');
        setEditingRentUserId(null);
        await Promise.all([fetchRentData(), onRefresh()]);
      } else {
        toast.error(data.error || 'আপডেট ব্যর্থ');
      }
    } catch (err: any) {
      toast.error(err.message || 'নেটওয়ার্ক ত্রুটি');
    } finally {
      setRentProcessingUserId(null);
    }
  };

  // 6-Month Backup & Restore State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [pendingImportData, setPendingImportData] = useState<any | null>(null);

  const handleExportBackup = async () => {
    try {
      setIsExporting(true);
      window.location.href = '/api/backup?download=true';
      toast.success('সম্পূর্ণ ৬ মাসের মেস ব্যাকআপ ডাউনলোড হচ্ছে!');
    } catch (err: any) {
      toast.error('ব্যাকআপ এক্সপোর্ট ব্যর্থ হয়েছে');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (!parsed.data && !parsed.cycles && !parsed.users) {
          toast.error('অবৈধ ব্যাকআপ ফাইল। সঠিক JSON ব্যাকআপ ফাইল নির্বাচন করুন।');
          return;
        }
        setPendingImportData(parsed);
      } catch (err) {
        toast.error('JSON ফাইল পড়তে সমস্যা হয়েছে');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmImport = async () => {
    if (!pendingImportData) return;

    const confirmed = await confirmAction({
      title: 'ডাটাবেজ রিস্টোর নিশ্চিতকরণ',
      text: 'নির্বাচিত JSON ব্যাকআপ ফাইল থেকে সম্পূর্ণ ডাটা রিস্টোর করা হবে। আপনি কি নিশ্চিত?',
      icon: 'warning',
      confirmText: 'হ্যাঁ, রিস্টোর সম্পন্ন করুন',
      confirmColor: '#e11d48',
    });
    if (!confirmed) return;

    try {
      setIsImporting(true);
      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pendingImportData),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'ব্যাকআপ ডাটা সফলভাবে রিস্টোর হয়েছে!');
        setPendingImportData(null);
        onRefresh();
      } else {
        toast.error(data.error || 'রিস্টোর ব্যর্থ হয়েছে');
      }
    } catch (err: any) {
      toast.error(err.message || 'নেটওয়ার্ক ত্রুটি');
    } finally {
      setIsImporting(false);
    }
  };

  // Add utility bill (support specific member paying Khala/Electricity bill from own pocket)
  const handleAddBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBillType || !newBillAmount || Number(newBillAmount) <= 0) {
      toast.warning('বিলের নাম ও সঠিক টাকার পরিমাণ দিন');
      return;
    }

    try {
      const res = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cycleId: cycle?._id,
          type: newBillType,
          amount: Number(newBillAmount),
          paidByUserId: newBillPayer,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsAddingBill(false);
        setNewBillType('');
        setNewBillAmount('');
        setNewBillPayer('mess_fund');
        if (newBillPayer !== 'mess_fund') {
          toast.success('বিল যুক্ত হয়েছে এবং পরিশোধকারী সদস্যের অ্যাকাউন্টে জমা হিসেবে ক্রেডিট করা হয়েছে!');
        } else {
          toast.success('ইউটিলিটি বিল সফলভাবে যুক্ত হয়েছে!');
        }
        onRefresh();
      } else {
        toast.error(data.error || 'বিল যুক্ত করতে ব্যর্থ হয়েছে');
      }
    } catch (e: any) {
      toast.error(e.message || 'ত্রুটি ঘটেছে');
    }
  };

  // Toggle Big Bazar On / Off for the cycle (Super Admin ONLY)
  const handleToggleBigBazar = async () => {
    if (!isSuperAdmin) {
      toast.error('বড় বাজার চালু বা বন্ধ করার ক্ষমতা কেবল সুপার অ্যাডমিনের হাতে সংরক্ষিত!');
      return;
    }
    try {
      setIsTogglingBigBazar(true);
      const newStatus = !cycle?.isBigBazarEnabled;
      const res = await fetch('/api/cycles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_cycle_config',
          cycleId: cycle?._id,
          isBigBazarEnabled: newStatus,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          newStatus
            ? 'বড় বাজার ফিচার সফলভাবে চালু করা হয়েছে!'
            : 'বড় বাজার ফিচার বন্ধ করা হয়েছে (সকল বাজার রেগুলার হিসেবে গণ্য হবে)'
        );
        onRefresh();
      } else {
        toast.error(data.error || 'আপডেট ব্যর্থ হয়েছে');
      }
    } catch (err: any) {
      toast.error(err.message || 'নেটওয়ার্ক ত্রুটি');
    } finally {
      setIsTogglingBigBazar(false);
    }
  };

  // Save member contribution for Big Bazar
  const handleSaveContribution = async () => {
    try {
      const val = Number(contributionInput);
      if (isNaN(val) || val < 0) {
        toast.warning('সঠিক টাকার অঙ্ক লিখুন');
        return;
      }
      const res = await fetch('/api/cycles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_cycle_config',
          cycleId: cycle?._id,
          bigBazarContributionPerMember: val,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsEditingContribution(false);
        toast.success('বড় বাজার সদস্য প্রতি বরাদ্দ আপডেট হয়েছে!');
        onRefresh();
      } else {
        toast.error(data.error || 'আপডেট ব্যর্থ');
      }
    } catch (err: any) {
      toast.error(err.message || 'নেটওয়ার্ক ত্রুটি');
    }
  };

  const generalDeposits = deposits.filter((d) => d.type === 'general');
  const bigBazarDeposits = deposits.filter((d) => d.type === 'big_bazar');

  return (
    <div className="space-y-6">
      {/* Top Banner & Add Deposit action */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-400" />
            ইউটিলিটি বিল, বড় বাজার ও জমা ব্যবস্থাপনা
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            বাড়ি ভাড়া, গ্যাস, বিদ্যুৎ, পানি ও বুয়া বিলের সমান বণ্টন এবং বড় বাজার বাজেট ট্র্যাকিং।
          </p>
        </div>

        {isManager && (
          <button
            onClick={onOpenDepositModal}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            নতুন জমা (Deposit) এন্ট্রি করুন
          </button>
        )}
      </div>

      {/* 0. HOUSE RENT & ROOM RENT COLLECTION HUB (1-CLICK COLLECTION) */}
      <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-indigo-500/30 bg-gradient-to-b from-indigo-950/25 via-slate-900/60 to-slate-950/90 shadow-2xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/10">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>বাসা ভাড়া ও রুম রেন্ট আদায় হাব</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {cycle?.name || 'চলতি মাস'}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                সুপার অ্যাডমিন ও মেস ম্যানেজার মাত্র ১-ক্লিকে সদস্যদের বাসা ভাড়া পরিশোধ ও জমা হিসেবে রেকর্ড করতে পারবেন।
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => {
                fetchRentData();
                onRefresh();
              }}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/60 transition cursor-pointer"
              title="রিফ্রেশ করুন"
            >
              <RotateCw className={`w-4 h-4 ${isLoadingRent ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* 4 Summary Stat Mini-Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="glass-panel p-3.5 sm:p-4 rounded-2xl border border-slate-800 bg-slate-900/40">
            <span className="text-[11px] font-medium text-slate-400 block">মোট ধার্যকৃত ভাড়া</span>
            <div className="text-base sm:text-lg font-black text-white font-mono mt-1">
              {formatTaka(rentSummary.totalRentDue || 0)}
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              {rentSummary.totalMembers || rentData.length} জন সক্রিয় সদস্য
            </span>
          </div>

          <div className="glass-panel p-3.5 sm:p-4 rounded-2xl border border-emerald-500/30 bg-emerald-950/20">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-emerald-300 block">আদায়কৃত ভাড়া</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                {rentSummary.totalRentDue > 0
                  ? `${Math.round(((rentSummary.totalRentCollected || 0) / rentSummary.totalRentDue) * 100)}%`
                  : '০%'}
              </span>
            </div>
            <div className="text-base sm:text-lg font-black text-emerald-400 font-mono mt-1">
              {formatTaka(rentSummary.totalRentCollected || 0)}
            </div>
            <span className="text-[10px] text-emerald-300/70 mt-0.5 block">
              {rentSummary.paidCount || 0} জন পরিশোধ করেছেন
            </span>
          </div>

          <div className="glass-panel p-3.5 sm:p-4 rounded-2xl border border-rose-500/30 bg-rose-950/20">
            <span className="text-[11px] font-medium text-rose-300 block">বকেয়া ভাড়া</span>
            <div className="text-base sm:text-lg font-black text-rose-400 font-mono mt-1">
              {formatTaka(rentSummary.totalRentPending || 0)}
            </div>
            <span className="text-[10px] text-rose-300/70 mt-0.5 block">
              {rentSummary.pendingCount || 0} জনের বকেয়া রয়েছে
            </span>
          </div>

          <div className="glass-panel p-3.5 sm:p-4 rounded-2xl border border-indigo-500/30 bg-indigo-950/20">
            <span className="text-[11px] font-medium text-indigo-300 block">আদায় অবস্থা</span>
            <div className="text-base sm:text-lg font-black text-indigo-300 font-mono mt-1">
              {rentSummary.paidCount}/{rentSummary.totalMembers || rentData.length}
            </div>
            <span className="text-[10px] text-indigo-300/70 mt-0.5 block">
              {rentSummary.pendingCount === 0 && (rentSummary.totalMembers || rentData.length) > 0
                ? '🎉 ১০০% আদায় সম্পন্ন!'
                : 'চলতি মাসে আদায় চলমান'}
            </span>
          </div>
        </div>

        {/* Member Rent List Table / Grid */}
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/50">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">সদস্য</th>
                <th className="px-4 py-3">ধার্যকৃত ভাড়া</th>
                <th className="px-4 py-3">পরিশোধ স্ট্যাটাস</th>
                <th className="px-4 py-3 text-right">১-ক্লিক অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {rentData.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500 text-xs">
                    {isLoadingRent ? 'ভাড়ার তথ্য লোড হচ্ছে...' : 'কোনো সক্রিয় সদস্য পাওয়া যায়নি'}
                  </td>
                </tr>
              ) : (
                rentData.map((member) => {
                  const isProcessing = rentProcessingUserId === member.userId;
                  const isEditingThisRent = editingRentUserId === member.userId;
                  const isThisUserSelf = member.userId === currentUser.id;

                  return (
                    <tr
                      key={member.userId}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isThisUserSelf ? 'bg-indigo-950/15' : ''
                      }`}
                    >
                      {/* Member Info */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          {member.image ? (
                            <img
                              src={member.image}
                              alt={member.name}
                              className="w-9 h-9 rounded-full object-cover border border-slate-700 shadow"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold flex items-center justify-center text-xs shadow">
                              {member.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-white text-xs sm:text-sm flex items-center gap-1.5">
                              <span>{member.name}</span>
                              {isThisUserSelf && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                  আপনি
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                              <span>{member.phone || member.email}</span>
                              {member.whatsapp && (
                                <a
                                  href={`https://wa.me/${member.whatsapp.replace(/[^0-9]/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-emerald-400 hover:text-emerald-300"
                                  title="হোয়াটসঅ্যাপে চ্যাট করুন"
                                >
                                  <WhatsApp className="w-3 h-3 inline" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Room Rent Amount */}
                      <td className="px-4 py-3.5">
                        {isEditingThisRent ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              value={editingRentAmount}
                              onChange={(e) => setEditingRentAmount(e.target.value)}
                              className="w-20 px-2 py-1 rounded bg-slate-950 border border-indigo-500 text-xs text-white font-mono"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveRoomRent(member.userId)}
                              disabled={isProcessing}
                              className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer"
                              title="সংরক্ষণ"
                            >
                              <Save className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setEditingRentUserId(null)}
                              className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                              title="বাতিল"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-slate-100 text-xs sm:text-sm">
                              {formatTaka(member.roomRent)}
                            </span>
                            {isManager && (
                              <button
                                onClick={() => {
                                  setEditingRentUserId(member.userId);
                                  setEditingRentAmount(String(member.roomRent));
                                }}
                                className="text-slate-500 hover:text-indigo-400 p-0.5 transition cursor-pointer"
                                title="ভাড়া পরিবর্তন করুন"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Payment Status */}
                      <td className="px-4 py-3.5">
                        {member.rentPaid ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                            <span>পরিশোধিত</span>
                            {member.rentPaidAt && (
                              <span className="text-[10px] text-emerald-300/70 font-mono hidden sm:inline">
                                ({new Date(member.rentPaidAt).toLocaleDateString('bn-BD', { month: 'short', day: 'numeric' })})
                              </span>
                            )}
                          </div>
                        ) : (
                          <div
                            onClick={() => isManager && !isProcessing && handleMarkRentPaid(member)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-bold ${
                              isManager ? 'cursor-pointer hover:bg-rose-500/25 active:scale-95 transition' : ''
                            }`}
                            title={isManager ? 'ক্লিক করে বাসা ভাড়া আদায় ও রেকর্ড করুন' : undefined}
                          >
                            <Clock className="w-3.5 h-3.5 text-rose-400" />
                            <span>বকেয়া রয়েছে</span>
                          </div>
                        )}
                      </td>

                      {/* 1-Click Action */}
                      <td className="px-4 py-3.5 text-right">
                        {isManager ? (
                          member.rentPaid ? (
                            <button
                              onClick={() => handleRevertRentPaid(member)}
                              disabled={isProcessing}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-700/60 hover:border-rose-500/30 text-xs transition cursor-pointer disabled:opacity-50"
                              title="ভুলবশত ক্লিক হয়ে থাকলে বকেয়া হিসেবে রিভার্স করুন"
                            >
                              {isProcessing ? (
                                <>
                                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                                  <span>প্রসেসিং...</span>
                                </>
                              ) : (
                                <>
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>আনপেইড করুন</span>
                                </>
                              )}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleMarkRentPaid(member)}
                              disabled={isProcessing}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition cursor-pointer disabled:opacity-50"
                            >
                              {isProcessing ? (
                                <>
                                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                                  <span>আদায় হচ্ছে...</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span>ভাড়া আদায় করুন</span>
                                </>
                              )}
                            </button>
                          )
                        ) : (
                          <span className="text-[11px] text-slate-500 font-medium">
                            {member.rentPaid ? 'পরিশোধ সম্পন্ন' : 'ম্যানেজার কর্তৃক আদায়যোগ্য'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Utilities Breakdown & Big Bazar Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Utility Bills Card */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                ইউটিলিটি বিলের তালিকা
              </h4>
              <p className="text-xs text-slate-400">সক্রিয় ও অনাবাসিক নয় এমন সদস্যদের মধ্যে সমান ভাগ</p>
            </div>
            <span className="text-sm font-extrabold text-amber-400 font-mono">
              মোট: {formatTaka(totalUtility)}
            </span>
          </div>

          <div className="divide-y divide-slate-800/80">
            {bills.length === 0 ? (
              <p className="py-4 text-xs text-slate-500 text-center">কোনো ইউটিলিটি বিল যুক্ত করা হয়নি</p>
            ) : (
              bills.map((bill) => (
                <div key={bill._id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-200 font-medium">{bill.type} বিল</span>
                    {bill.paidByUserId && (
                      <span className="ml-2 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-semibold">
                        সদস্যের পকেট থেকে পরিশোধিত
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-slate-200 font-bold">{formatTaka(bill.amount)}</span>
                </div>
              ))
            )}
          </div>

          {/* Add Bill Form (Accessible to Manager for all, and to Members for out-of-pocket bills) */}
          <div className="border-t border-slate-800 pt-3">
            {!isAddingBill ? (
              <button
                onClick={() => {
                  setIsAddingBill(true);
                  if (!isManager) setNewBillPayer(currentUser.id);
                }}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                {isManager
                  ? 'নতুন বিল যুক্ত করুন (বুয়া, কারেন্ট, গ্যাস, ইন্টারনেট)'
                  : 'পকেট থেকে বিল পরিশোধ এন্ট্রি করুন (খালা, বিদ্যুৎ, গ্যাস, ওয়াইফাই)'}
              </button>
            ) : (
              <form onSubmit={handleAddBill} className="space-y-3 p-3 rounded-xl bg-slate-900/60 border border-slate-700 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">
                    {isManager ? 'নতুন বিল এন্ট্রি' : 'পকেট থেকে বিল পরিশোধ রেকর্ড'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAddingBill(false)}
                    className="text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">বিলের নাম / ধরণ</label>
                    <input
                      type="text"
                      placeholder="যেমন: খালা বিল / বিদ্যুৎ বিল / ইন্টারনেট"
                      value={newBillType}
                      onChange={(e) => setNewBillType(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">টাকার পরিমাণ (৳)</label>
                    <input
                      type="number"
                      placeholder="টাকা"
                      value={newBillAmount}
                      onChange={(e) => setNewBillAmount(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono"
                      required
                    />
                  </div>
                </div>

                {/* Who paid the bill */}
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">কে বিলটি পরিশোধ করেছেন?</label>
                  {isManager ? (
                    <select
                      value={newBillPayer}
                      onChange={(e) => setNewBillPayer(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 cursor-pointer"
                    >
                      <option value="mess_fund">মেস ক্যাশ / সাধারণ ফান্ড থেকে পরিশোধ</option>
                      {members.map((m) => (
                        <option key={m.userId} value={m.userId}>
                          {m.name} (নিজ পকেট থেকে দিয়েছেন — তার জমার সাথে ক্রেডিট হবে)
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center justify-between">
                      <span>পরিশোধকারী: <strong>{currentUser.name}</strong></span>
                      <span className="text-[11px] bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-200 font-medium">
                        নিজ পকেট থেকে
                      </span>
                    </div>
                  )}
                  {newBillPayer !== 'mess_fund' && (
                    <p className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                      <Check className="w-3 h-3 shrink-0" />
                      এই বিলের পুরো টাকা আপনার অ্যাকাউন্টে অগ্রিম ক্রেডিট (জমা) হিসেবে যোগ হবে এবং মেসের সকল সদস্যের মাঝে সমানভাবে ভাগ হবে।
                    </p>
                  )}
                </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingBill(false)}
                      className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 cursor-pointer"
                    >
                      বাতিল
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white font-semibold shadow-md shadow-indigo-600/20 cursor-pointer"
                    >
                      সংরক্ষণ করুন
                    </button>
                  </div>
                </form>
              )}
            </div>
        </div>

        {/* 2. Big Bazar Card with Enable/Disable Toggle */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Package className="w-4 h-4 text-purple-400" />
                বড় বাজার ফান্ড ও কন্ট্রোল (১০-১৫ তারিখ)
              </h4>
              <p className="text-xs text-slate-400">চাল, তেল, ডাল, পেঁয়াজ ইত্যাদি অগ্রিম কেনাকাটার ফান্ড</p>
            </div>

            {/* Enable/Disable Toggle Button (STRICTLY for Super Admin) */}
            {isSuperAdmin ? (
              <button
                onClick={handleToggleBigBazar}
                disabled={isTogglingBigBazar}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  cycle?.isBigBazarEnabled
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-rose-500/20 hover:text-rose-300'
                    : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-emerald-500/20 hover:text-emerald-300'
                }`}
                title="বড় বাজার সক্রিয় বা নিষ্ক্রিয় করুন (সুপার অ্যাডমিন)"
              >
                {cycle?.isBigBazarEnabled ? (
                  <>
                    <ToggleRight className="w-4 h-4 text-purple-400" />
                    <span>চালু (সক্রিয়)</span>
                  </>
                ) : (
                  <>
                    <ToggleLeft className="w-4 h-4 text-slate-500" />
                    <span>বন্ধ (নিষ্ক্রিয়)</span>
                  </>
                )}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span
                  className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${
                    cycle?.isBigBazarEnabled
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {cycle?.isBigBazarEnabled ? 'চালু' : 'বন্ধ'}
                </span>
                <span className="text-[10px] text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800 hidden sm:inline" title="বড় বাজার নিয়ন্ত্রণ কেবল সুপার অ্যাডমিনের হাতে">
                  🔒 কেবল সুপার অ্যাডমিন নিয়ন্ত্রণ করতে পারেন
                </span>
              </div>
            )}
          </div>

          {!cycle?.isBigBazarEnabled && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>এই চক্রে বড় বাজার ফিচার বন্ধ রাখা হয়েছে। সকল বাজার সাধারণ রেগুলার বাজার হিসেবে গণ্য হবে।</span>
            </div>
          )}

          <div className="space-y-3 text-xs">
            {/* Member contribution per member */}
            <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/20 flex justify-between items-center">
              <div>
                <div className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <span>সদস্য প্রতি জমা নির্ধারিত:</span>
                  {isManager && !isEditingContribution && (
                    <button
                      onClick={() => setIsEditingContribution(true)}
                      className="text-purple-400 hover:text-purple-300 p-0.5 rounded cursor-pointer"
                      title="টাকা পরিবর্তন করুন"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <div className="text-[11px] text-slate-400">মাসের শুরুতে প্রত্যেক সদস্য এই টাকা জমা দেয়</div>
              </div>

              {isEditingContribution ? (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={contributionInput}
                    onChange={(e) => setContributionInput(e.target.value)}
                    className="w-20 bg-slate-900 border border-purple-500 rounded px-2 py-1 text-right text-xs text-purple-200"
                  />
                  <button
                    onClick={handleSaveContribution}
                    className="p-1 bg-purple-600 rounded text-white hover:bg-purple-500 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setIsEditingContribution(false)}
                    className="p-1 text-slate-400 hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="text-base font-extrabold text-purple-300 font-mono">
                  {formatTaka(cycle?.bigBazarContributionPerMember || 1400)}
                </div>
              )}
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex justify-between items-center">
              <div>
                <div className="text-slate-300 font-semibold">অবশিষ্ট মাল ক্যারি (L_carry):</div>
                <div className="text-[11px] text-slate-400">চক্র শেষে অবশিষ্ট পণ্য থাকলে পরবর্তী চক্রে জমা</div>
              </div>
              <div className="text-base font-extrabold text-emerald-400 font-mono">
                {formatTaka(cycle?.bigBazarCarryToNext || 0)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Deposits History List */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-400" />
            সদস্যদের জমার ইতিহাস ({deposits.length})
          </h4>
          <span className="text-xs text-slate-400">
            সাধারণ জমা ও বিলের অগ্রিম পেমেন্ট রেকর্ড
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                <th className="py-2.5 px-3">সদস্য</th>
                <th className="py-2.5 px-3">তারিখ</th>
                <th className="py-2.5 px-3">ধরণ</th>
                <th className="py-2.5 px-3">বিবরণ / নোট</th>
                <th className="py-2.5 px-3 text-right">পরিমাণ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {deposits.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500">
                    কোনো জমার রেকর্ড নেই
                  </td>
                </tr>
              ) : (
                deposits.map((d) => (
                  <tr key={d._id} className="hover:bg-slate-900/40">
                    <td className="py-2.5 px-3 font-medium text-slate-200">{d.userName}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-400">{d.date}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          d.type === 'big_bazar'
                            ? 'bg-purple-500/20 text-purple-300'
                            : 'bg-emerald-500/20 text-emerald-300'
                        }`}
                      >
                        {d.type === 'big_bazar' ? 'বড় বাজার' : 'সাধারণ জমা'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 max-w-xs truncate">{d.notes || '—'}</td>
                    <td className="py-2.5 px-3 text-right font-bold font-mono text-emerald-400">
                      {formatTaka(d.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. 6-Month Data Archive & JSON Backup Hub (STRICTLY SUPER ADMIN ONLY) */}
      {isSuperAdmin ? (
        <div className="glass-panel rounded-2xl p-5 border border-cyan-500/30 bg-cyan-950/15 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
                <Database className="w-4 h-4 text-cyan-400" />
                ৬ মাসের ডাটা ব্যাকআপ ও হিস্ট্রি হাব (JSON Backup & Restore)
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                মেস ডাটাবেজের সম্পূর্ণ ৬ মাসের ডাটা অফলাইনে এক্সপোর্ট বা পূর্ববর্তী ব্যাকআপ ফাইল রিস্টোর করুন (সুপার অ্যাডমিন)
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Hidden JSON file input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json"
                className="hidden"
              />

              {/* Export JSON Button */}
              <button
                onClick={handleExportBackup}
                disabled={isExporting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition-all cursor-pointer"
                title="সম্পূর্ণ ডাটাবেজ ব্যাকআপ JSON ফাইলে ডাউনলোড করুন"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isExporting ? 'প্রসেসিং...' : 'ব্যাকআপ ডাউনলোড (JSON)'}</span>
              </button>

              {/* Import JSON Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-bold transition-all cursor-pointer"
                title="পূর্ববর্তী ব্যাকআপ ফাইল থেকে ডাটা রিস্টোর করুন"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>রিস্টোর (JSON Import)</span>
              </button>
            </div>
          </div>

          {/* Confirmation Modal when JSON is loaded */}
          {pendingImportData && (
            <div className="p-4 rounded-xl bg-slate-900 border border-cyan-500/50 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <FileJson className="w-4 h-4 text-cyan-400" />
                  ব্যাকআপ ফাইল প্রিভিউ ও নিশ্চিতকরণ
                </span>
                <button
                  onClick={() => setPendingImportData(null)}
                  className="text-slate-400 hover:text-white text-xs"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">মোট চক্র</span>
                  <strong className="text-slate-200">
                    {pendingImportData.summary?.totalCycles || pendingImportData.data?.cycles?.length || 1} টি
                  </strong>
                </div>
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">মিল রেকর্ড</span>
                  <strong className="text-emerald-400">
                    {pendingImportData.summary?.totalMeals || pendingImportData.data?.meals?.length || 0} টি
                  </strong>
                </div>
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">বাজার খরচ</span>
                  <strong className="text-purple-400">
                    {pendingImportData.summary?.totalBazars || pendingImportData.data?.bazars?.length || 0} টি
                  </strong>
                </div>
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">মোট জমা</span>
                  <strong className="text-cyan-400">
                    {pendingImportData.summary?.totalDeposits || pendingImportData.data?.deposits?.length || 0} টি
                  </strong>
                </div>
              </div>

              <p className="text-[11px] text-amber-300/90 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                ⚠️ <strong>সতর্কতা:</strong> ব্যাকআপ রিস্টোর করলে বর্তমান ডাটাবেজের রেকর্ডগুলোর সাথে ব্যাকআপের রেকর্ডগুলো মার্জ/আপডেট হবে।
              </p>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPendingImportData(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={isImporting}
                  className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md shadow-cyan-600/30 flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isImporting ? 'রিস্টোর হচ্ছে...' : 'হ্যাঁ, রিস্টোর নিশ্চিত করুন'}</span>
                </button>
              </div>
            </div>
          )}

          <div className="text-[11px] text-slate-400 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            💡 <strong>সুপার অ্যাডমিন ব্যাকআপ পলিসি:</strong> মেস ম্যানেজারে দীর্ঘমেয়াদে অফলাইন সংরক্ষণের জন্য প্রতি মাসান্তে JSON ব্যাকআপ ফাইলটি ডাউনলোড করে রাখা যাবে। কোনো সমস্যা হলে পূর্ববর্তী ব্যাকআপ ফাইল রিস্টোর করা যাবে। সাধারণ সদস্যরা শুধুমাত্র চলতি ও পূর্ববর্তী মাসের হিসাব দেখতে পাবেন।
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>বিগত মাসের বিস্তারিত হিসাব ও রিপোর্টের প্রয়োজনে মেসের সুপার অ্যাডমিনের নিকট অনুরোধ করুন।</span>
          </div>
          <span className="text-[10px] text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg shrink-0">
            চলতি ও বিগত মাস সক্রিয়
          </span>
        </div>
      )}
    </div>
  );
};
