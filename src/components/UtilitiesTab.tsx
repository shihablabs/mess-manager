'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  Trash2,
  Search,
  Filter,
  Zap,
  Flame,
  Droplets,
  Wifi,
  Utensils,
  Receipt,
  Users,
  Info,
} from '@/components/icons';
import { formatTaka } from '@/lib/money';
import { AppUser } from '@/lib/session';
import { calculateUtilityBillPerPerson } from '@/billing-engine';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { confirmAction, promptRentPaymentModal, showRentSuccessModal } from '@/lib/alerts';
import { useLanguage } from '@/context/LanguageContext';

interface UtilitiesTabProps {
  currentUser: AppUser;
  bills: any[];
  deposits: any[];
  members?: any[];
  cycle: any;
  onRefresh: () => void;
  onOpenDepositModal: () => void;
}

type BillsSubTab = 'overview' | 'rent' | 'utilities' | 'bigBazar' | 'deposits' | 'backup';

export const UtilitiesTab: React.FC<UtilitiesTabProps> = ({
  currentUser,
  bills,
  deposits,
  members = [],
  cycle,
  onRefresh,
  onOpenDepositModal,
}) => {
  const { language, t } = useLanguage();
  const isBangla = language === 'bn';

  // Sub-tabs navigation
  const [subTab, setSubTab] = useState<BillsSubTab>('overview');

  // Utility Bill Addition State
  const [newBillType, setNewBillType] = useState('');
  const [newBillAmount, setNewBillAmount] = useState('');
  const [newBillApplicableCount, setNewBillApplicableCount] = useState<string>('');
  const [newBillApplicableUserIds, setNewBillApplicableUserIds] = useState<string[]>([]);
  const [newBillPayer, setNewBillPayer] = useState<string>('mess_fund');
  const [isAddingBill, setIsAddingBill] = useState(false);
  const [isSubmittingBill, setIsSubmittingBill] = useState(false);
  const [billPayerFilter, setBillPayerFilter] = useState<'all' | 'mess_fund' | 'pocket'>('all');

  // Deposits State & Filters
  const [depositSearch, setDepositSearch] = useState('');
  const [depositTypeFilter, setDepositTypeFilter] = useState<'all' | 'general' | 'utility' | 'big_bazar' | 'rent'>('all');
  const [depositStatusFilter, setDepositStatusFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [processingDepositId, setProcessingDepositId] = useState<string | null>(null);

  // Big Bazar State
  const [isTogglingBigBazar, setIsTogglingBigBazar] = useState(false);
  const [isEditingContribution, setIsEditingContribution] = useState(false);
  const [contributionInput, setContributionInput] = useState(
    String(cycle?.bigBazarContributionPerMember ?? 1400)
  );

  const totalUtility = useMemo(() => bills.reduce((sum, b) => sum + (Number(b.amount) || 0), 0), [bills]);
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
  const [rentFilter, setRentFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [rentSearch, setRentSearch] = useState('');

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

  // Mark Rent Paid (Interactive modal)
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
        await showRentSuccessModal({
          memberName: member.name,
          amount: paymentInput.amount,
          paymentMethodLabel: paymentInput.paymentMethodLabel,
          paidAt: paymentInput.paidAt,
          notes: paymentInput.notes,
        });
      } else {
        toast.error(data.error || (isBangla ? 'ভাড়া পরিশোধ রেকর্ড করতে ব্যর্থ হয়েছে' : 'Failed to record rent payment'));
      }
    } catch (err: any) {
      toast.error(err.message || (isBangla ? 'নেটওয়ার্ক ত্রুটি ঘটেছে' : 'Network error occurred'));
    } finally {
      setRentProcessingUserId(null);
    }
  };

  // Revert Rent Paid to Unpaid
  const handleRevertRentPaid = async (member: any) => {
    const isConfirmed = await confirmAction({
      title: isBangla ? 'ভাড়া বকেয়া করতে চান?' : 'Revert Rent to Due?',
      text: isBangla
        ? `${member.name} এর পেইড মার্কিং তুলে নিয়ে বকেয়া হিসেবে সেট করা হবে এবং সংশ্লিষ্ট জমা এন্ট্রি বাতিল হবে।`
        : `Mark rent for ${member.name} as due and revert the payment record.`,
      icon: 'warning',
      confirmText: isBangla ? 'হ্যাঁ, বকেয়া করুন' : 'Yes, Revert to Due',
      cancelText: isBangla ? 'বাতিল' : 'Cancel',
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
        toast.success(data.message || (isBangla ? 'বাসা ভাড়া বকেয়া হিসেবে রিভার্স করা হয়েছে' : 'Rent reverted to due successfully'));
        await Promise.all([fetchRentData(), onRefresh()]);
      } else {
        toast.error(data.error || (isBangla ? 'ব্যর্থ হয়েছে' : 'Operation failed'));
      }
    } catch (err: any) {
      toast.error(err.message || (isBangla ? 'নেটওয়ার্ক ত্রুটি ঘটেছে' : 'Network error occurred'));
    } finally {
      setRentProcessingUserId(null);
    }
  };

  // Update Member Room Rent
  const handleSaveRoomRent = async (userId: string) => {
    const amountNum = Number(editingRentAmount);
    if (isNaN(amountNum) || amountNum < 0) {
      toast.warning(isBangla ? 'সঠিক টাকার অঙ্ক লিখুন' : 'Enter valid rent amount');
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
        toast.success(isBangla ? 'বাসা ভাড়া সফলভাবে আপডেট হয়েছে' : 'Room rent updated successfully');
        setEditingRentUserId(null);
        await Promise.all([fetchRentData(), onRefresh()]);
      } else {
        toast.error(data.error || (isBangla ? 'আপডেট ব্যর্থ' : 'Update failed'));
      }
    } catch (err: any) {
      toast.error(err.message || (isBangla ? 'নেটওয়ার্ক ত্রুটি' : 'Network error'));
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
      toast.success(isBangla ? 'সম্পূর্ণ ৬ মাসের মেস ব্যাকআপ ডাউনলোড হচ্ছে!' : 'Downloading 6-month full mess backup!');
    } catch (err: any) {
      toast.error(isBangla ? 'ব্যাকআপ এক্সপোর্ট ব্যর্থ হয়েছে' : 'Backup export failed');
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
          toast.error(isBangla ? 'অবৈধ ব্যাকআপ ফাইল। সঠিক JSON ব্যাকআপ ফাইল নির্বাচন করুন।' : 'Invalid backup JSON file.');
          return;
        }
        setPendingImportData(parsed);
      } catch (err) {
        toast.error(isBangla ? 'JSON ফাইল পড়তে সমস্যা হয়েছে' : 'Error reading JSON file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmImport = async () => {
    if (!pendingImportData) return;

    const confirmed = await confirmAction({
      title: isBangla ? 'ডাটাবেজ রিস্টোর নিশ্চিতকরণ' : 'Confirm Database Restore',
      text: isBangla
        ? 'নির্বাচিত JSON ব্যাকআপ ফাইল থেকে সম্পূর্ণ ডাটা রিস্টোর করা হবে। আপনি কি নিশ্চিত?'
        : 'All records will be updated and merged from the selected JSON backup file. Proceed?',
      icon: 'warning',
      confirmText: isBangla ? 'হ্যাঁ, রিস্টোর সম্পন্ন করুন' : 'Yes, Restore Now',
      cancelText: isBangla ? 'বাতিল' : 'Cancel',
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
        toast.success(data.message || (isBangla ? 'ব্যাকআপ ডাটা সফলভাবে রিস্টোর হয়েছে!' : 'Backup restored successfully!'));
        setPendingImportData(null);
        onRefresh();
      } else {
        toast.error(data.error || (isBangla ? 'রিস্টোর ব্যর্থ হয়েছে' : 'Restore failed'));
      }
    } catch (err: any) {
      toast.error(err.message || (isBangla ? 'নেটওয়ার্ক ত্রুটি' : 'Network error'));
    } finally {
      setIsImporting(false);
    }
  };

  // Add utility bill
  const handleAddBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBillType || !newBillAmount || Number(newBillAmount) <= 0) {
      toast.warning(isBangla ? 'বিলের নাম ও সঠিক টাকার পরিমাণ দিন' : 'Please provide bill name and valid amount');
      return;
    }

    try {
      setIsSubmittingBill(true);
      const res = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cycleId: cycle?._id,
          type: newBillType,
          amount: Number(newBillAmount),
          paidByUserId: newBillPayer,
          applicableCount: newBillApplicableCount ? Number(newBillApplicableCount) : null,
          applicableUserIds: newBillApplicableUserIds.length > 0 ? newBillApplicableUserIds : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsAddingBill(false);
        setNewBillType('');
        setNewBillAmount('');
        setNewBillApplicableCount('');
        setNewBillApplicableUserIds([]);
        setNewBillPayer('mess_fund');
        if (newBillPayer !== 'mess_fund') {
          toast.success(
            isBangla
              ? 'বিল যুক্ত হয়েছে এবং পরিশোধকারী সদস্যের অ্যাকাউন্টে জমা হিসেবে ক্রেডিট করা হয়েছে!'
              : 'Bill recorded and credited as deposit to the paying member!'
          );
        } else {
          toast.success(isBangla ? 'ইউটিলিটি বিল সফলভাবে যুক্ত হয়েছে!' : 'Utility bill added successfully!');
        }
        onRefresh();
      } else {
        toast.error(data.error || (isBangla ? 'বিল যুক্ত করতে ব্যর্থ হয়েছে' : 'Failed to add bill'));
      }
    } catch (e: any) {
      toast.error(e.message || (isBangla ? 'ত্রুটি ঘটেছে' : 'An error occurred'));
    } finally {
      setIsSubmittingBill(false);
    }
  };

  // Delete utility bill (Manager)
  const handleDeleteBill = async (billId: string, billType: string, amount: number) => {
    const isConfirmed = await confirmAction({
      title: isBangla ? 'বিল মুছে ফেলতে চান?' : 'Delete Utility Bill?',
      text: isBangla
        ? `আপনি কি নিশ্চিত যে "${billType}" বিল (৳${amount}) মুছে ফেলতে চান?`
        : `Are you sure you want to delete "${billType}" bill (৳${amount})?`,
      icon: 'warning',
      confirmText: isBangla ? 'হ্যাঁ, মুছুন' : 'Yes, Delete',
      cancelText: isBangla ? 'না' : 'Cancel',
      confirmColor: '#e11d48',
    });
    if (!isConfirmed) return;

    try {
      const res = await fetch(`/api/bills?id=${billId}&cycleId=${cycle?._id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        toast.success(isBangla ? 'বিল সফলভাবে মুছে ফেলা হয়েছে' : 'Bill deleted successfully');
        onRefresh();
      } else {
        toast.error(data.error || (isBangla ? 'মুছতে ব্যর্থ হয়েছে' : 'Failed to delete bill'));
      }
    } catch (e: any) {
      toast.error(isBangla ? 'নেটওয়ার্ক ত্রুটি' : 'Network error');
    }
  };

  // Deposit Approval, Rejection & Deletion Handlers
  const handleApproveDeposit = async (depositId: string, depositorName: string, amount: number) => {
    try {
      setProcessingDepositId(depositId);
      const res = await fetch('/api/deposits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve_deposit',
          depositId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          isBangla
            ? `${depositorName}-এর ৳${amount.toLocaleString('bn-BD')} জমা অনুমোদিত হয়েছে!`
            : `Deposit of ৳${amount} for ${depositorName} approved!`
        );
        onRefresh();
      } else {
        toast.error(data.error || (isBangla ? 'অনুমোদন ব্যর্থ হয়েছে' : 'Approval failed'));
      }
    } catch (e: any) {
      toast.error(e.message || (isBangla ? 'ত্রুটি ঘটেছে' : 'Error occurred'));
    } finally {
      setProcessingDepositId(null);
    }
  };

  const handleRejectDeposit = async (depositId: string, depositorName: string) => {
    const isConfirmed = await confirmAction({
      title: isBangla ? 'জমা বাতিল করতে চান?' : 'Reject Deposit?',
      text: isBangla
        ? `${depositorName}-এর এই জমার রিকোয়েস্ট বাতিল করা হবে।`
        : `Deposit request for ${depositorName} will be rejected.`,
      icon: 'warning',
      confirmText: isBangla ? 'হ্যাঁ, বাতিল করুন' : 'Yes, Reject',
      cancelText: isBangla ? 'না' : 'Cancel',
      confirmColor: '#e11d48',
    });
    if (!isConfirmed) return;

    try {
      setProcessingDepositId(depositId);
      const res = await fetch('/api/deposits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject_deposit',
          depositId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(isBangla ? 'জমার রিকোয়েস্ট বাতিল করা হয়েছে' : 'Deposit request rejected');
        onRefresh();
      } else {
        toast.error(data.error || (isBangla ? 'বাতিল করতে ব্যর্থ হয়েছে' : 'Failed to reject'));
      }
    } catch (e: any) {
      toast.error(e.message || (isBangla ? 'ত্রুটি ঘটেছে' : 'Error occurred'));
    } finally {
      setProcessingDepositId(null);
    }
  };

  const handleDeleteDeposit = async (depositId: string, depositorName: string, amount: number) => {
    const isConfirmed = await confirmAction({
      title: isBangla ? 'জমা স্থায়ীভাবে মুছতে চান?' : 'Delete Deposit Record?',
      text: isBangla
        ? `${depositorName}-এর ৳${amount.toLocaleString('bn-BD')} জমার রেকর্ড মুছে ফেলা হবে।`
        : `Permanently delete deposit record of ৳${amount} for ${depositorName}?`,
      icon: 'warning',
      confirmText: isBangla ? 'হ্যাঁ, মুছে ফেলুন' : 'Yes, Delete',
      cancelText: isBangla ? 'না' : 'Cancel',
      confirmColor: '#e11d48',
    });
    if (!isConfirmed) return;

    try {
      setProcessingDepositId(depositId);
      const res = await fetch('/api/deposits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_deposit',
          depositId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(isBangla ? 'জমার রেকর্ড সফলভাবে মুছে ফেলা হয়েছে' : 'Deposit record deleted successfully');
        onRefresh();
      } else {
        toast.error(data.error || (isBangla ? 'মুছতে ব্যর্থ হয়েছে' : 'Failed to delete'));
      }
    } catch (e: any) {
      toast.error(e.message || (isBangla ? 'ত্রুটি ঘটেছে' : 'Error occurred'));
    } finally {
      setProcessingDepositId(null);
    }
  };

  // Toggle Big Bazar On / Off for the cycle (Super Admin ONLY)
  const handleToggleBigBazar = async () => {
    if (!isSuperAdmin) {
      toast.error(isBangla ? 'বড় বাজার চালু বা বন্ধ করার ক্ষমতা কেবল সুপার অ্যাডমিনের হাতে সংরক্ষিত!' : 'Only Super Admin can toggle Big Bazar!');
      return;
    }
    try {
      setIsTogglingBigBazar(true);
      const newStatus = !cycle?.isBigBazarEnabled;
      const res = await fetch('/api/cycles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cycleId: cycle?._id,
          isBigBazarEnabled: newStatus,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          isBangla
            ? `বড় বাজার ফিচার ${newStatus ? 'চালু (সক্রিয়)' : 'বন্ধ (নিষ্ক্রিয়)'} করা হয়েছে`
            : `Big Bazar feature ${newStatus ? 'Enabled' : 'Disabled'}`
        );
        onRefresh();
      } else {
        toast.error(data.error || (isBangla ? 'ব্যর্থ হয়েছে' : 'Failed to toggle'));
      }
    } catch (err: any) {
      toast.error(err.message || (isBangla ? 'নেটওয়ার্ক ত্রুটি' : 'Network error'));
    } finally {
      setIsTogglingBigBazar(false);
    }
  };

  // Save Big Bazar Contribution
  const handleSaveContribution = async () => {
    const val = Number(contributionInput);
    if (isNaN(val) || val < 0) {
      toast.warning(isBangla ? 'সঠিক টাকার অঙ্ক লিখুন' : 'Enter valid contribution amount');
      return;
    }
    try {
      const res = await fetch('/api/cycles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cycleId: cycle?._id,
          bigBazarContributionPerMember: val,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(isBangla ? 'বড় বাজার বাজেট সফলভাবে হালনাগাদ হয়েছে' : 'Big Bazar contribution updated');
        setIsEditingContribution(false);
        onRefresh();
      } else {
        toast.error(data.error || (isBangla ? 'আপডেট ব্যর্থ' : 'Update failed'));
      }
    } catch (err: any) {
      toast.error(err.message || (isBangla ? 'নেটওয়ার্ক ত্রুটি' : 'Network error'));
    }
  };

  // Filtered House Rent Data
  const filteredRentData = useMemo(() => {
    let list = rentData;
    if (rentFilter === 'paid') list = list.filter((m) => m.rentPaid);
    if (rentFilter === 'pending') list = list.filter((m) => !m.rentPaid);
    if (rentSearch.trim()) {
      const q = rentSearch.toLowerCase().trim();
      list = list.filter((m) => m.name?.toLowerCase().includes(q) || m.phone?.includes(q) || m.email?.toLowerCase().includes(q));
    }
    return list;
  }, [rentData, rentFilter, rentSearch]);

  // Filtered Utility Bills
  const filteredBills = useMemo(() => {
    let list = bills;
    if (billPayerFilter === 'pocket') {
      list = list.filter((b) => Boolean(b.paidByUserId));
    } else if (billPayerFilter === 'mess_fund') {
      list = list.filter((b) => !b.paidByUserId);
    }
    return list;
  }, [bills, billPayerFilter]);

  // Filtered Deposits
  const filteredDeposits = useMemo(() => {
    let list = deposits;
    if (depositTypeFilter !== 'all') {
      list = list.filter((d) => d.type === depositTypeFilter);
    }
    if (depositStatusFilter === 'approved') {
      list = list.filter((d) => d.isPaid || d.status === 'approved');
    } else if (depositStatusFilter === 'pending') {
      list = list.filter((d) => !d.isPaid && d.status === 'pending');
    } else if (depositStatusFilter === 'rejected') {
      list = list.filter((d) => d.status === 'rejected');
    }
    if (depositSearch.trim()) {
      const q = depositSearch.toLowerCase().trim();
      list = list.filter(
        (d) =>
          d.userName?.toLowerCase().includes(q) ||
          d.notes?.toLowerCase().includes(q) ||
          d.paymentMethod?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [deposits, depositTypeFilter, depositStatusFilter, depositSearch]);

  // Total Approved Deposits
  const totalApprovedDeposits = useMemo(() => {
    return deposits
      .filter((d) => d.isPaid || d.status === 'approved')
      .reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  }, [deposits]);

  const pendingDeposits = useMemo(() => deposits.filter((d) => !d.isPaid && d.status === 'pending'), [deposits]);

  // Utility Bill Icon Category Picker
  const getBillIcon = (type: string) => {
    const tLower = type.toLowerCase();
    if (tLower.includes('বিদ্যুৎ') || tLower.includes('current') || tLower.includes('electric')) {
      return <Zap className="w-4 h-4 text-amber-400" />;
    }
    if (tLower.includes('গ্যাস') || tLower.includes('gas')) {
      return <Flame className="w-4 h-4 text-orange-400" />;
    }
    if (tLower.includes('পানি') || tLower.includes('water')) {
      return <Droplets className="w-4 h-4 text-cyan-400" />;
    }
    if (tLower.includes('নেট') || tLower.includes('wifi') || tLower.includes('internet')) {
      return <Wifi className="w-4 h-4 text-blue-400" />;
    }
    if (tLower.includes('খালা') || tLower.includes('বুয়া') || tLower.includes('maid') || tLower.includes('cook')) {
      return <Utensils className="w-4 h-4 text-emerald-400" />;
    }
    if (tLower.includes('ময়লা') || tLower.includes('waste') || tLower.includes('clean')) {
      return <Trash2 className="w-4 h-4 text-slate-400" />;
    }
    return <Receipt className="w-4 h-4 text-indigo-400" />;
  };

  const rentPercent = rentSummary.totalRentDue > 0
    ? Math.min(100, Math.round(((rentSummary.totalRentCollected || 0) / rentSummary.totalRentDue) * 100))
    : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header Banner & Quick Action */}
      <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-slate-800 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-indigo-950/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-2 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 shadow-sm">
              <Building2 className="w-5 h-5" />
            </span>
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
              {t('bills.title')}
            </h2>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {cycle?.name || (isBangla ? 'চলতি মাস' : 'Active Cycle')}
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl">
            {t('bills.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={() => {
              fetchRentData();
              onRefresh();
            }}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/60 transition cursor-pointer"
            title={isBangla ? 'ডাটা রিফ্রেশ করুন' : 'Refresh Data'}
          >
            <RotateCw className={`w-4 h-4 ${isLoadingRent ? 'animate-spin text-indigo-400' : ''}`} />
          </button>

          {isManager && (
            <button
              onClick={onOpenDepositModal}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('bills.newDeposit')}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Top-level 4 Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Total Utility */}
        <div
          onClick={() => setSubTab('utilities')}
          className="glass-panel p-4 rounded-2xl border border-amber-500/25 bg-amber-950/10 hover:border-amber-500/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="group-hover:text-amber-300 transition-colors font-medium">
              {t('bills.totalUtility')}
            </span>
            <Lightbulb className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-amber-300 font-mono mt-1">
            {formatTaka(totalUtility)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
            <span>{bills.length} {isBangla ? 'টি বিল যুক্ত' : 'bills added'}</span>
            <span className="text-amber-400/80 group-hover:underline">{isBangla ? 'দেখুন →' : 'View →'}</span>
          </div>
        </div>

        {/* KPI 2: Rent Collection Progress */}
        <div
          onClick={() => setSubTab('rent')}
          className="glass-panel p-4 rounded-2xl border border-emerald-500/25 bg-emerald-950/10 hover:border-emerald-500/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="group-hover:text-emerald-300 transition-colors font-medium">
              {t('bills.rentCollection')}
            </span>
            <Building2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-emerald-400 font-mono mt-1">
            {formatTaka(rentSummary.totalRentCollected || 0)}
          </div>
          <div className="mt-1.5 space-y-1">
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${rentPercent}%` }}
              />
            </div>
            <div className="text-[10px] text-emerald-300/80 flex items-center justify-between">
              <span>{rentPercent}% {isBangla ? 'আদায়কৃত' : 'Collected'}</span>
              <span>{rentSummary.paidCount}/{rentSummary.totalMembers || rentData.length} {isBangla ? 'জন' : 'paid'}</span>
            </div>
          </div>
        </div>

        {/* KPI 3: Total Verified Deposits */}
        <div
          onClick={() => setSubTab('deposits')}
          className="glass-panel p-4 rounded-2xl border border-cyan-500/25 bg-cyan-950/10 hover:border-cyan-500/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="group-hover:text-cyan-300 transition-colors font-medium">
              {isBangla ? 'মোট অনুমোদিত জমা' : 'Verified Deposits'}
            </span>
            <Wallet className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-cyan-300 font-mono mt-1">
            {formatTaka(totalApprovedDeposits)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
            <span>{deposits.length} {isBangla ? 'টি এন্ট্রি' : 'entries'}</span>
            <span className="text-cyan-400/80 group-hover:underline">{isBangla ? 'হিস্ট্রি →' : 'History →'}</span>
          </div>
        </div>

        {/* KPI 4: Pending Action / Due items */}
        <div
          onClick={() => setSubTab(rentSummary.pendingCount > 0 ? 'rent' : 'deposits')}
          className="glass-panel p-4 rounded-2xl border border-rose-500/25 bg-rose-950/10 hover:border-rose-500/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="group-hover:text-rose-300 transition-colors font-medium">
              {isBangla ? 'বকেয়া ও অপেক্ষমাণ' : 'Pending & Due'}
            </span>
            <Clock className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-lg sm:text-2xl font-black text-rose-300 font-mono mt-1">
            {rentSummary.pendingCount} <span className="text-xs font-normal text-rose-300/80">{isBangla ? 'জন ভাড়া বাকি' : 'rent due'}</span>
          </div>
          <div className="text-[10px] text-rose-300/80 mt-1 flex items-center justify-between">
            <span>{pendingDeposits.length} {isBangla ? 'টি জমা অপেক্ষমাণ' : 'deposits pending'}</span>
            <span className="text-rose-400 font-bold group-hover:underline">{isBangla ? 'অ্যাকশন →' : 'Act →'}</span>
          </div>
        </div>
      </div>

      {/* 3. Pro Sub-Tabs Segmented Navigation */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-950/80 rounded-2xl border border-slate-800">
        <button
          onClick={() => setSubTab('overview')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            subTab === 'overview'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>{isBangla ? 'সারাংশ ও ওভারভিউ' : 'Overview Hub'}</span>
        </button>

        <button
          onClick={() => setSubTab('rent')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            subTab === 'rent'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>{t('bills.tabRent')}</span>
          {rentSummary.pendingCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono font-bold">
              {rentSummary.pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setSubTab('utilities')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            subTab === 'utilities'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Lightbulb className="w-3.5 h-3.5" />
          <span>{t('bills.tabUtilities')}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-950 text-amber-300 border border-amber-500/30 font-mono">
            {bills.length}
          </span>
        </button>

        <button
          onClick={() => setSubTab('bigBazar')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            subTab === 'bigBazar'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>{t('bills.tabBigBazar')}</span>
        </button>

        <button
          onClick={() => setSubTab('deposits')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            subTab === 'deposits'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Wallet className="w-3.5 h-3.5" />
          <span>{t('bills.tabDeposits')}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-500/30 font-mono">
            {deposits.length}
          </span>
        </button>

        {isSuperAdmin && (
          <button
            onClick={() => setSubTab('backup')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              subTab === 'backup'
                ? 'bg-slate-700 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>{t('bills.tabBackup')}</span>
          </button>
        )}
      </div>

      {/* =========================================================================
          SUB-TAB 1: OVERVIEW HUB (Summary of Rent, Utilities & Deposits)
         ========================================================================= */}
      {subTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Rent Progress Showcase Card */}
          <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-slate-800 space-y-4 bg-slate-900/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-400" />
                  <span>{isBangla ? 'চলতি মাসের বাসা ভাড়া আদায় অগ্রগতি' : 'Monthly Rent Collection Progress'}</span>
                </h4>
                <p className="text-xs text-slate-400">
                  {isBangla
                    ? 'মোট ধার্যকৃত বাসা ভাড়ার কত শতাংশ আদায় হয়েছে তার লাইভ ট্র্যাকার'
                    : 'Real-time overview of collected vs pending room rent across dining members'}
                </p>
              </div>
              <button
                onClick={() => setSubTab('rent')}
                className="text-xs px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-bold transition-all cursor-pointer self-start sm:self-auto"
              >
                {isBangla ? 'ভাড়া আদায় হাবে যান →' : 'Go to Rent Hub →'}
              </button>
            </div>

            {/* Visual Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-bold">
                  {isBangla ? 'আদায়কৃত ভাড়া:' : 'Collected:'} <strong className="text-emerald-400 font-mono">{formatTaka(rentSummary.totalRentCollected || 0)}</strong>
                </span>
                <span className="text-slate-400">
                  {isBangla ? 'মোট ধার্যকৃত:' : 'Total Due:'} <strong className="text-white font-mono">{formatTaka(rentSummary.totalRentDue || 0)}</strong>
                </span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-3 p-0.5 border border-slate-800">
                <div
                  className="bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-400 h-2 rounded-full transition-all duration-700 shadow-sm shadow-emerald-500/30"
                  style={{ width: `${rentPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="text-emerald-400 font-bold">{rentPercent}% {isBangla ? 'সম্পন্ন' : 'Completed'}</span>
                <span>
                  {rentSummary.paidCount} {isBangla ? 'জন পরিশোধ করেছেন' : 'members paid'} • {rentSummary.pendingCount} {isBangla ? 'জনের বকেয়া' : 'pending'}
                </span>
              </div>
            </div>
          </div>

          {/* 2-Column Split: Utility Highlights & Big Bazar Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Utility Quick Summary */}
            <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-400" />
                    <span>{isBangla ? 'ইউটিলিটি বিল সারসংক্ষেপ' : 'Utility Bills Summary'}</span>
                  </h4>
                  <p className="text-xs text-slate-400">
                    {isBangla ? 'চলতি চক্রের বিদ্যুৎ, গ্যাস ও অন্যান্য বিল' : 'Current cycle shared utilities'}
                  </p>
                </div>
                <button
                  onClick={() => setSubTab('utilities')}
                  className="text-xs text-amber-400 hover:text-amber-300 font-bold"
                >
                  {isBangla ? 'বিস্তারিত →' : 'View all →'}
                </button>
              </div>

              <div className="divide-y divide-slate-800/60">
                {bills.length === 0 ? (
                  <p className="py-4 text-xs text-slate-500 text-center">
                    {t('bills.noBills')}
                  </p>
                ) : (
                  bills.slice(0, 4).map((bill) => {
                    const perPerson = calculateUtilityBillPerPerson(bill, members);
                    return (
                      <div key={bill._id} className="py-2.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 rounded-lg bg-slate-800 text-slate-300">
                            {getBillIcon(bill.type)}
                          </span>
                          <div>
                            <span className="font-semibold text-white block">{bill.type}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {isBangla ? 'জনপ্রতি' : 'Per head'}: {formatTaka(perPerson)}
                            </span>
                          </div>
                        </div>
                        <span className="font-mono font-bold text-slate-200">{formatTaka(bill.amount)}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Big Bazar Quick Summary */}
            <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Package className="w-4 h-4 text-purple-400" />
                    <span>{isBangla ? 'বড় বাজার বাজেট অবস্থা' : 'Big Bazar Status'}</span>
                  </h4>
                  <p className="text-xs text-slate-400">
                    {isBangla ? 'চাল, ডাল, তেল অগ্রিম ফান্ডের সারসংক্ষেপ' : 'Advance grocery budget summary'}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    cycle?.isBigBazarEnabled
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {cycle?.isBigBazarEnabled ? (isBangla ? 'সক্রিয়' : 'Active') : (isBangla ? 'বন্ধ' : 'Disabled')}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/20 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300">{isBangla ? 'সদস্য প্রতি জমা নির্ধারিত:' : 'Target per member:'}</span>
                  <strong className="text-purple-300 font-mono text-sm font-black">
                    {formatTaka(cycle?.bigBazarContributionPerMember || 1400)}
                  </strong>
                </div>
                <div className="flex justify-between items-center text-xs pt-2 border-t border-purple-500/20">
                  <span className="text-slate-300">{isBangla ? 'অবশিষ্ট ক্যারি (L_carry):' : 'Stock Carry-over:'}</span>
                  <strong className="text-emerald-400 font-mono text-sm font-black">
                    {formatTaka(cycle?.bigBazarCarryToNext || 0)}
                  </strong>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                💡 {isBangla
                  ? 'বড় বাজার ফান্ড চক্রের ১০-১৫ তারিখের মধ্যে কেনাকাটার হিসাবের জন্য আলাদাভাবে ট্র্যাক করা হয়।'
                  : 'Big Bazar is tracked independently for mid-month bulk pantry shopping.'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 2: HOUSE RENT HUB (1-Click Collection, WhatsApp Reminder, Inline Edit)
         ========================================================================= */}
      {subTab === 'rent' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-indigo-500/30 bg-gradient-to-b from-indigo-950/25 via-slate-900/60 to-slate-950/90 shadow-2xl space-y-5">
            {/* Header Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
              <div>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-400" />
                  <span>{t('bills.rentHubTitle')}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {cycle?.name || (isBangla ? 'চলতি মাস' : 'Current Month')}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {t('bills.rentHubDesc')}
                </p>
              </div>

              {/* Search & Filter Toolbar */}
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                {/* Search */}
                <div className="relative flex-1 md:w-56">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={rentSearch}
                    onChange={(e) => setRentSearch(e.target.value)}
                    placeholder={t('bills.searchMember')}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
                  />
                  {rentSearch && (
                    <button
                      onClick={() => setRentSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Filter Status */}
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setRentFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      rentFilter === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {t('bills.allStatus')} ({rentData.length})
                  </button>
                  <button
                    onClick={() => setRentFilter('paid')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      rentFilter === 'paid' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {t('bills.paidOnly')} ({rentSummary.paidCount || 0})
                  </button>
                  <button
                    onClick={() => setRentFilter('pending')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      rentFilter === 'pending' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {t('bills.pendingOnly')} ({rentSummary.pendingCount || 0})
                  </button>
                </div>
              </div>
            </div>

            {/* Member Rent List Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/50">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">{t('bills.member')}</th>
                    <th className="px-4 py-3">{t('bills.assignedRent')}</th>
                    <th className="px-4 py-3">{t('bills.paymentStatus')}</th>
                    <th className="px-4 py-3 text-right">{t('bills.oneClickAction')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredRentData.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-500 text-xs">
                        {isLoadingRent
                          ? (isBangla ? 'ভাড়ার তথ্য লোড হচ্ছে...' : 'Loading rent records...')
                          : (isBangla ? 'কোনো সদস্য পাওয়া যায়নি' : 'No members found')}
                      </td>
                    </tr>
                  ) : (
                    filteredRentData.map((member) => {
                      const isProcessing = rentProcessingUserId === member.userId;
                      const isEditingThisRent = editingRentUserId === member.userId;
                      const isThisUserSelf = member.userId === currentUser.id;

                      // Pre-formatted WhatsApp reminder text
                      const reminderMsg = encodeURIComponent(
                        isBangla
                          ? `আসসালামু আলাইকুম ${member.name} ভাই, মেস ম্যানেজারে ${cycle?.name || 'চলতি মাস'}-এর বাসা ভাড়া ৳${member.roomRent} বকেয়া রয়েছে। অনুগ্রহ করে দ্রুত পরিশোধের অনুরোধ রইল। ধন্যবাদ!`
                          : `Hello ${member.name}, reminder: room rent ৳${member.roomRent} for ${cycle?.name || 'this month'} is pending in Mess Manager. Please settle at your earliest. Thanks!`
                      );

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
                                  className="w-9 h-9 rounded-full object-cover border border-slate-700 shadow shrink-0"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold flex items-center justify-center text-xs shadow shrink-0">
                                  {member.name?.charAt(0) || 'M'}
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="font-bold text-white text-xs sm:text-sm flex items-center gap-1.5 truncate">
                                  <span className="truncate">{member.name}</span>
                                  {isThisUserSelf && (
                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold shrink-0">
                                      {isBangla ? 'আপনি' : 'You'}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                                  <span>{member.phone || member.email}</span>
                                  {member.whatsapp && (
                                    <a
                                      href={`https://wa.me/${member.whatsapp.replace(/[^0-9]/g, '')}?text=${reminderMsg}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-0.5"
                                      title={isBangla ? 'হোয়াটসঅ্যাপে তাগাদা দিন' : 'Send WhatsApp Reminder'}
                                    >
                                      <WhatsApp className="w-3 h-3" />
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
                                  title={isBangla ? 'সংরক্ষণ' : 'Save'}
                                >
                                  <Save className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => setEditingRentUserId(null)}
                                  className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                                  title={isBangla ? 'বাতিল' : 'Cancel'}
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
                                    title={isBangla ? 'ভাড়া পরিবর্তন করুন' : 'Edit rent'}
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
                                <span>{t('bills.paid')}</span>
                                {member.rentPaidAt && (
                                  <span className="text-[10px] text-emerald-300/70 font-mono hidden sm:inline">
                                    ({new Date(member.rentPaidAt).toLocaleDateString(isBangla ? 'bn-BD' : 'en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                    })})
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div
                                onClick={() => isManager && !isProcessing && handleMarkRentPaid(member)}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-bold ${
                                  isManager ? 'cursor-pointer hover:bg-rose-500/25 active:scale-95 transition' : ''
                                }`}
                                title={isManager ? (isBangla ? 'ক্লিক করে বাসা ভাড়া আদায় ও রেকর্ড করুন' : 'Click to collect rent') : undefined}
                              >
                                <Clock className="w-3.5 h-3.5 text-rose-400" />
                                <span>{t('bills.pending')}</span>
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
                                  title={isBangla ? 'ভুলবশত ক্লিক হয়ে থাকলে বকেয়া হিসেবে রিভার্স করুন' : 'Revert payment to due'}
                                >
                                  {isProcessing ? (
                                    <>
                                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                                      <span>{isBangla ? 'প্রসেসিং...' : 'Processing...'}</span>
                                    </>
                                  ) : (
                                    <>
                                      <RotateCcw className="w-3.5 h-3.5" />
                                      <span>{t('bills.revertRent')}</span>
                                    </>
                                  )}
                                </button>
                              ) : (
                                <div className="flex items-center justify-end gap-1.5">
                                  {member.phone && (
                                    <a
                                      href={`https://wa.me/${(member.whatsapp || member.phone).replace(/[^0-9]/g, '')}?text=${reminderMsg}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 transition cursor-pointer"
                                      title={isBangla ? 'হোয়াটসঅ্যাপে তাগাদা মেসেজ পাঠান' : 'WhatsApp Payment Reminder'}
                                    >
                                      <WhatsApp className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                  <button
                                    onClick={() => handleMarkRentPaid(member)}
                                    disabled={isProcessing}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition cursor-pointer disabled:opacity-50"
                                  >
                                    {isProcessing ? (
                                      <>
                                        <RotateCw className="w-3.5 h-3.5 animate-spin" />
                                        <span>{isBangla ? 'আদায় হচ্ছে...' : 'Saving...'}</span>
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle className="w-3.5 h-3.5" />
                                        <span>{t('bills.collectRent')}</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              )
                            ) : (
                              <span className="text-[11px] text-slate-500 font-medium">
                                {member.rentPaid ? t('bills.completed') : (isBangla ? 'ম্যানেজার কর্তৃক আদায়যোগ্য' : 'Awaiting Manager')}
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
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 3: UTILITY BILLS (Categorized, Per Person Split, Add Bill Form)
         ========================================================================= */}
      {subTab === 'utilities' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-slate-800 space-y-4">
            {/* Header Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
              <div>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-amber-400" />
                  <span>{t('bills.utilityListTitle')}</span>
                </h3>
                <p className="text-xs text-slate-400">
                  {t('bills.utilityListDesc')}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Payer Filter */}
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setBillPayerFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      billPayerFilter === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {isBangla ? 'সকল বিল' : 'All Bills'}
                  </button>
                  <button
                    onClick={() => setBillPayerFilter('mess_fund')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      billPayerFilter === 'mess_fund' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {isBangla ? 'মেস ফান্ড' : 'Mess Fund'}
                  </button>
                  <button
                    onClick={() => setBillPayerFilter('pocket')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      billPayerFilter === 'pocket' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {isBangla ? 'পকেট থেকে' : 'Out-of-Pocket'}
                  </button>
                </div>

                {/* Add Bill Button */}
                {!isAddingBill && (
                  <button
                    onClick={() => {
                      setIsAddingBill(true);
                      if (!isManager) setNewBillPayer(currentUser.id);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isManager ? t('bills.addBill') : t('bills.recordPocketBillTitle')}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Add Bill Collapsible Form */}
            {isAddingBill && (
              <form onSubmit={handleAddBill} className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-indigo-500/30 space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="font-bold text-white text-sm flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-400" />
                    {isManager ? t('bills.addBill') : t('bills.recordPocketBillTitle')}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAddingBill(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Category Quick Pickers */}
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1.5">
                    {isBangla ? 'বিলের বিভাগ দ্রুত নির্বাচন করুন:' : 'Quick Category Selector:'}
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: isBangla ? 'বিদ্যুৎ বিল' : 'Electricity', icon: Zap },
                      { label: isBangla ? 'গ্যাস বিল' : 'Gas', icon: Flame },
                      { label: isBangla ? 'পানি বিল' : 'Water', icon: Droplets },
                      { label: isBangla ? 'ইন্টারনেট / ওয়াইফাই' : 'WiFi / Internet', icon: Wifi },
                      { label: isBangla ? 'বুয়া / খালা বিল' : 'Cook / Maid', icon: Utensils },
                      { label: isBangla ? 'ময়লা বিল' : 'Waste / Trash', icon: Trash2 },
                      { label: isBangla ? 'সার্ভিস চার্জ' : 'Service Charge', icon: Building2 },
                    ].map((cat) => {
                      const IconComp = cat.icon;
                      const isSelected = newBillType === cat.label;
                      return (
                        <button
                          key={cat.label}
                          type="button"
                          onClick={() => setNewBillType(cat.label)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                          }`}
                        >
                          <IconComp className="w-3.5 h-3.5" />
                          <span>{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">{t('bills.billType')}</label>
                    <input
                      type="text"
                      placeholder={isBangla ? 'যেমন: বিদ্যুৎ বিল / খালা বিল' : 'e.g., Electricity / Cook'}
                      value={newBillType}
                      onChange={(e) => setNewBillType(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-indigo-500 text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">{t('bills.billAmount')}</label>
                    <input
                      type="number"
                      placeholder="যেমন: ১৫০০"
                      value={newBillAmount}
                      onChange={(e) => setNewBillAmount(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-mono outline-none focus:border-indigo-500 text-xs"
                      required
                    />
                  </div>
                </div>

                {/* Member Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs text-slate-300 font-medium">
                      {t('bills.memberSelect')} ({isBangla ? 'চিহ্নিত না করলে সবাই অন্তর্ভুক্ত' : 'defaults to all active'})
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setNewBillApplicableUserIds(members.map((m: any) => String(m.userId || m._id || m.id)))}
                        className="text-xs text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                      >
                        {t('bills.all')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewBillApplicableUserIds([])}
                        className="text-xs text-slate-400 hover:text-slate-300 underline cursor-pointer"
                      >
                        {t('bills.resetAll')}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    {members.map((m: any) => {
                      const mId = String(m.userId || m._id || m.id);
                      const isSelected = newBillApplicableUserIds.includes(mId);
                      return (
                        <label
                          key={mId}
                          className={`flex items-center gap-1.5 p-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-indigo-950/40 border-indigo-500/50 text-indigo-200'
                              : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewBillApplicableUserIds((prev) => [...prev, mId]);
                              } else {
                                setNewBillApplicableUserIds((prev) => prev.filter((id) => id !== mId));
                              }
                            }}
                            className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="truncate">{m.name}</span>
                          {m.isUtilityExempt && (
                            <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-300 shrink-0">
                              {isBangla ? 'মওকুফ' : 'Exempt'}
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {newBillApplicableUserIds.length > 0
                      ? (isBangla
                          ? `নির্বাচিত ${newBillApplicableUserIds.length} জনের মধ্যে খরচ বণ্টিত হবে`
                          : `Bill will be split among ${newBillApplicableUserIds.length} selected members`)
                      : (isBangla
                          ? 'সকল সক্রিয় সদস্যের মধ্যে সমানভাবে বণ্টিত হবে'
                          : 'Bill will be split equally among all active members')}
                  </p>
                </div>

                {/* Who paid the bill */}
                <div>
                  <label className="text-xs text-slate-400 block mb-1">{t('bills.whoPaid')}</label>
                  {isManager ? (
                    <select
                      value={newBillPayer}
                      onChange={(e) => setNewBillPayer(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 text-xs cursor-pointer"
                    >
                      <option value="mess_fund">{isBangla ? 'মেস ক্যাশ / সাধারণ ফান্ড থেকে পরিশোধ' : 'Paid from Mess General Fund'}</option>
                      {members.map((m) => (
                        <option key={m.userId || m._id} value={m.userId || m._id}>
                          {m.name} ({isBangla ? 'নিজ পকেট থেকে দিয়েছেন — জমার সাথে ক্রেডিট হবে' : 'Paid from pocket — credit to deposit'})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center justify-between">
                      <span>{isBangla ? 'পরিশোধকারী:' : 'Paid by:'} <strong>{currentUser.name}</strong></span>
                      <span className="text-[11px] bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-200 font-medium">
                        {isBangla ? 'নিজ পকেট থেকে' : 'Personal Pocket'}
                      </span>
                    </div>
                  )}
                  {newBillPayer !== 'mess_fund' && (
                    <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 shrink-0" />
                      {isBangla
                        ? 'এই বিলের পুরো টাকা আপনার অ্যাকাউন্টে অগ্রিম ক্রেডিট (জমা) হিসেবে যোগ হবে।'
                        : 'The full amount of this bill will be automatically credited to your deposit balance.'}
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsAddingBill(false)}
                    className="px-4 py-2 rounded-xl text-slate-400 hover:text-white cursor-pointer"
                  >
                    {isBangla ? 'বাতিল' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingBill}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/25 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingBill ? (isBangla ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (isBangla ? 'সংরক্ষণ করুন' : 'Save Bill')}
                  </button>
                </div>
              </form>
            )}

            {/* Utility Bills List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredBills.length === 0 ? (
                <div className="col-span-full py-8 text-center text-xs text-slate-500">
                  {t('bills.noBills')}
                </div>
              ) : (
                filteredBills.map((bill) => {
                  const perPerson = calculateUtilityBillPerPerson(bill, members);
                  const isCustomSelection = Array.isArray(bill.applicableUserIds) && bill.applicableUserIds.length > 0;
                  const isHeadcountSelection = !isCustomSelection && Boolean(bill.applicableCount && bill.applicableCount > 0);
                  const activeNonExempt = members.filter((m) => !m.isUtilityExempt);
                  const payerUser = members.find((m) => (m.userId || m._id) === bill.paidByUserId);

                  return (
                    <div
                      key={bill._id}
                      className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 hover:border-slate-700 transition-all space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="p-2 rounded-xl bg-slate-800 text-amber-400 border border-slate-700/80">
                              {getBillIcon(bill.type)}
                            </span>
                            <div>
                              <h4 className="font-bold text-white text-sm">{bill.type}</h4>
                              <span className="text-[11px] text-slate-400 font-mono">
                                {t('bills.perPersonShare')}{' '}
                                <strong className="text-amber-300 font-mono">{formatTaka(perPerson)}</strong>
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="font-mono font-black text-white text-base block">
                              {formatTaka(bill.amount)}
                            </span>
                            {isManager && (
                              <button
                                onClick={() => handleDeleteBill(bill._id, bill.type, bill.amount)}
                                className="text-[11px] text-slate-500 hover:text-rose-400 transition cursor-pointer mt-1"
                                title={isBangla ? 'বিলটি মুছুন' : 'Delete bill'}
                              >
                                <Trash2 className="w-3.5 h-3.5 inline mr-0.5" />
                                {isBangla ? 'মুছুন' : 'Delete'}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Split Scope Badge */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                            {isCustomSelection
                              ? (isBangla ? `নির্বাচিত ${bill.applicableUserIds!.length} জনের মাঝে ভাগ` : `Shared by ${bill.applicableUserIds!.length} members`)
                              : isHeadcountSelection
                              ? (isBangla ? `নির্দিষ্ট ${bill.applicableCount} জনের মাঝে ভাগ` : `Shared by ${bill.applicableCount} members`)
                              : (isBangla ? `সকল সদস্য (${activeNonExempt.length} জন)` : `All members (${activeNonExempt.length})`)}
                          </span>

                          {bill.paidByUserId ? (
                            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold">
                              {isBangla ? `পকেট থেকে: ${payerUser?.name || 'সদস্য'}` : `Paid by: ${payerUser?.name || 'Member'}`}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-700/60 font-medium">
                              {t('bills.paidByMessFund')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 4: BIG BAZAR BUDGET & CONTROLS
         ========================================================================= */}
      {subTab === 'bigBazar' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-purple-500/30 bg-purple-950/10 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-purple-500/20 pb-4">
              <div>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <Package className="w-5 h-5 text-purple-400" />
                  <span>{t('bills.bigBazarTitle')}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {t('bills.bigBazarDesc')}
                </p>
              </div>

              {/* Super Admin Toggle */}
              {isSuperAdmin ? (
                <button
                  onClick={handleToggleBigBazar}
                  disabled={isTogglingBigBazar}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    cycle?.isBigBazarEnabled
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/25'
                      : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'
                  }`}
                >
                  {cycle?.isBigBazarEnabled ? (
                    <>
                      <ToggleRight className="w-4 h-4 text-white" />
                      <span>{t('bills.bigBazarActive')}</span>
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="w-4 h-4 text-slate-400" />
                      <span>{t('bills.bigBazarInactive')}</span>
                    </>
                  )}
                </button>
              ) : (
                <span
                  className={`text-xs px-3 py-1 rounded-full font-bold border ${
                    cycle?.isBigBazarEnabled
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {cycle?.isBigBazarEnabled ? t('bills.bigBazarActive') : t('bills.bigBazarInactive')}
                </span>
              )}
            </div>

            {!cycle?.isBigBazarEnabled && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{t('bills.bigBazarDisabledNote')}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Member Contribution Card */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex justify-between items-center">
                <div>
                  <div className="text-slate-300 font-bold flex items-center gap-1.5">
                    <span>{t('bills.contributionPerMember')}</span>
                    {isManager && !isEditingContribution && (
                      <button
                        onClick={() => setIsEditingContribution(true)}
                        className="text-purple-400 hover:text-purple-300 p-0.5 cursor-pointer"
                        title={isBangla ? 'বাজেট পরিবর্তন' : 'Edit contribution'}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {isBangla ? 'মাসের শুরুতে প্রত্যেক সদস্যের এই টাকা জমার লক্ষ্যমাত্রা' : 'Target deposit per member early in the cycle'}
                  </div>
                </div>

                {isEditingContribution ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={contributionInput}
                      onChange={(e) => setContributionInput(e.target.value)}
                      className="w-20 bg-slate-950 border border-purple-500 rounded-lg px-2 py-1 text-right text-xs text-purple-200 font-mono"
                    />
                    <button
                      onClick={handleSaveContribution}
                      className="p-1 bg-purple-600 rounded text-white hover:bg-purple-500 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setIsEditingContribution(false)}
                      className="p-1 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="text-lg font-black text-purple-300 font-mono">
                    {formatTaka(cycle?.bigBazarContributionPerMember || 1400)}
                  </div>
                )}
              </div>

              {/* Carry Over Stock Card */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex justify-between items-center">
                <div>
                  <div className="text-slate-300 font-bold">{t('bills.carryToNext')}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {isBangla ? 'চক্র শেষে অবশিষ্ট পণ্য থাকলে পরবর্তী চক্রে জমা' : 'Leftover stock carry-forward value'}
                  </div>
                </div>
                <div className="text-lg font-black text-emerald-400 font-mono">
                  {formatTaka(cycle?.bigBazarCarryToNext || 0)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 5: DEPOSITS LEDGER (Filters, Manager Approve/Reject/Delete)
         ========================================================================= */}
      {subTab === 'deposits' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-slate-800 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
              <div>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-cyan-400" />
                  <span>{t('bills.depositHistoryTitle')} ({filteredDeposits.length})</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {t('bills.depositHistoryDesc')}
                </p>
              </div>

              <button
                onClick={onOpenDepositModal}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-bold text-xs shadow-lg shadow-cyan-600/25 transition cursor-pointer self-start md:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('bills.newDeposit')}</span>
              </button>
            </div>

            {/* Filter Toolbar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={depositSearch}
                  onChange={(e) => setDepositSearch(e.target.value)}
                  placeholder={isBangla ? 'সদস্যের নাম বা নোট দিয়ে খুঁজুন...' : 'Search by name or note...'}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
                />
                {depositSearch && (
                  <button
                    onClick={() => setDepositSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Fund Type Filter */}
              <div className="flex items-center gap-1 overflow-x-auto">
                {(['all', 'general', 'utility', 'big_bazar', 'rent'] as const).map((ft) => (
                  <button
                    key={ft}
                    onClick={() => setDepositTypeFilter(ft)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition-all ${
                      depositTypeFilter === ft
                        ? 'bg-slate-800 text-white border border-slate-700'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {ft === 'all'
                      ? (isBangla ? 'সব খাত' : 'All Funds')
                      : ft === 'general'
                      ? (isBangla ? 'সাধারণ' : 'General')
                      : ft === 'utility'
                      ? (isBangla ? 'ইউটিলিটি' : 'Utility')
                      : ft === 'big_bazar'
                      ? (isBangla ? 'বড় বাজার' : 'Big Bazar')
                      : (isBangla ? 'ভাড়া' : 'Rent')}
                  </button>
                ))}
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1 justify-end overflow-x-auto">
                {(['all', 'approved', 'pending', 'rejected'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setDepositStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition-all ${
                      depositStatusFilter === st
                        ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {st === 'all'
                      ? (isBangla ? 'সব স্ট্যাটাস' : 'All Status')
                      : st === 'approved'
                      ? (isBangla ? 'অনুমোদিত' : 'Approved')
                      : st === 'pending'
                      ? (isBangla ? 'অপেক্ষমাণ' : 'Pending')
                      : (isBangla ? 'বাতিলকৃত' : 'Rejected')}
                  </button>
                ))}
              </div>
            </div>

            {/* Deposits Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/50">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">{t('bills.member')}</th>
                    <th className="py-3 px-4">{t('bills.dateMethod')}</th>
                    <th className="py-3 px-4">{t('bills.fundType')}</th>
                    <th className="py-3 px-4">{t('bills.status')}</th>
                    <th className="py-3 px-4">{t('bills.notes')}</th>
                    <th className="py-3 px-4 text-right">{t('bills.amount')}</th>
                    {isManager && <th className="py-3 px-4 text-right">{t('bills.actions')}</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredDeposits.length === 0 ? (
                    <tr>
                      <td colSpan={isManager ? 7 : 6} className="py-8 text-center text-slate-500 text-xs">
                        {t('bills.noDeposits')}
                      </td>
                    </tr>
                  ) : (
                    filteredDeposits.map((d) => {
                      const isPending = d.status === 'pending' || !d.isPaid;
                      const isRejected = d.status === 'rejected';
                      const isApproved = d.isPaid || d.status === 'approved';
                      const isProcessing = processingDepositId === d._id;

                      const typeLabelMap: Record<string, { label: string; color: string }> = {
                        general: { label: isBangla ? 'সাধারণ জমা' : 'General Fund', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
                        utility: { label: isBangla ? '💡 ইউটিলিটি ফান্ড' : '💡 Utility Fund', color: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' },
                        big_bazar: { label: isBangla ? '🛒 বড় বাজার' : '🛒 Big Bazar', color: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
                        rent: { label: isBangla ? '🏠 বাসা ভাড়া' : '🏠 House Rent', color: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' },
                      };
                      const typeInfo = typeLabelMap[d.type] || typeLabelMap.general;

                      return (
                        <tr key={d._id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 font-semibold text-white">
                            {d.userName}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-mono text-slate-300 text-xs">{d.date}</div>
                            <div className="text-[10px] text-slate-500 capitalize">{d.paymentMethod || 'cash'}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${typeInfo.color}`}>
                              {typeInfo.label}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {isApproved ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                <CheckCircle className="w-3 h-3 text-emerald-400" />
                                {t('bills.approve')}
                              </span>
                            ) : isRejected ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                <X className="w-3 h-3 text-rose-400" />
                                {t('bills.reject')}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                <Clock className="w-3 h-3 text-amber-400" />
                                {isBangla ? 'অপেক্ষমাণ' : 'Pending'}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-400 max-w-xs truncate" title={d.notes}>
                            {d.notes || '—'}
                          </td>
                          <td className="py-3 px-4 text-right font-bold font-mono text-emerald-400 text-sm">
                            {formatTaka(d.amount)}
                          </td>
                          {isManager && (
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {isPending && (
                                  <>
                                    <button
                                      onClick={() => handleApproveDeposit(d._id, d.userName, d.amount)}
                                      disabled={isProcessing}
                                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                      title={isBangla ? 'জমা অনুমোদন করুন' : 'Approve deposit'}
                                    >
                                      <Check className="w-3 h-3" />
                                      <span>{t('bills.approve')}</span>
                                    </button>
                                    <button
                                      onClick={() => handleRejectDeposit(d._id, d.userName)}
                                      disabled={isProcessing}
                                      className="px-2 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-500/30 text-rose-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                      title={isBangla ? 'জমা বাতিল করুন' : 'Reject deposit'}
                                    >
                                      <X className="w-3 h-3" />
                                      <span>{t('bills.reject')}</span>
                                    </button>
                                  </>
                                )}
                                <button
                                  onClick={() => handleDeleteDeposit(d._id, d.userName, d.amount)}
                                  disabled={isProcessing}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-700/60 hover:border-rose-500/30 transition cursor-pointer disabled:opacity-50"
                                  title={isBangla ? 'জমা রেকর্ড স্থায়ীভাবে মুছে ফেলুন' : 'Delete deposit record'}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 6: DATA BACKUP & RESTORE (Super Admin Only)
         ========================================================================= */}
      {subTab === 'backup' && isSuperAdmin && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-cyan-500/30 bg-cyan-950/15 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-cyan-500/20 pb-4">
              <div>
                <h4 className="text-base font-bold text-cyan-300 flex items-center gap-2">
                  <Database className="w-5 h-5 text-cyan-400" />
                  <span>{isBangla ? '৬ মাসের ডাটা ব্যাকআপ ও হিস্ট্রি হাব (JSON Backup & Restore)' : '6-Month Database Backup & Archive (JSON)'}</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isBangla
                    ? 'মেস ডাটাবেজের সম্পূর্ণ ৬ মাসের ডাটা অফলাইনে এক্সপোর্ট বা পূর্ববর্তী ব্যাকআপ ফাইল রিস্টোর করুন (সুপার অ্যাডমিন)'
                    : 'Download complete offline snapshots of all mess cycles or restore from existing JSON archives (Super Admin)'}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".json"
                  className="hidden"
                />

                <button
                  onClick={handleExportBackup}
                  disabled={isExporting}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isExporting ? (isBangla ? 'প্রসেসিং...' : 'Exporting...') : t('bills.exportBackup')}</span>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-bold transition-all cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{t('bills.importBackup')}</span>
                </button>
              </div>
            </div>

            {/* Confirmation Modal when JSON is loaded */}
            {pendingImportData && (
              <div className="p-4 rounded-2xl bg-slate-900 border border-cyan-500/50 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <FileJson className="w-4 h-4 text-cyan-400" />
                    {isBangla ? 'ব্যাকআপ ফাইল প্রিভিউ ও নিশ্চিতকরণ' : 'Backup File Preview & Confirmation'}
                  </span>
                  <button
                    onClick={() => setPendingImportData(null)}
                    className="text-slate-400 hover:text-white text-xs cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">{isBangla ? 'মোট চক্র' : 'Cycles'}</span>
                    <strong className="text-slate-200">
                      {pendingImportData.summary?.totalCycles || pendingImportData.data?.cycles?.length || 1}
                    </strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">{isBangla ? 'মিল রেকর্ড' : 'Meal Records'}</span>
                    <strong className="text-emerald-400">
                      {pendingImportData.summary?.totalMeals || pendingImportData.data?.meals?.length || 0}
                    </strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">{isBangla ? 'বাজার খরচ' : 'Bazar Records'}</span>
                    <strong className="text-purple-400">
                      {pendingImportData.summary?.totalBazars || pendingImportData.data?.bazars?.length || 0}
                    </strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">{isBangla ? 'মোট জমা' : 'Deposits'}</span>
                    <strong className="text-cyan-400">
                      {pendingImportData.summary?.totalDeposits || pendingImportData.data?.deposits?.length || 0}
                    </strong>
                  </div>
                </div>

                <p className="text-[11px] text-amber-300/90 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                  ⚠️ <strong>{isBangla ? 'সতর্কতা:' : 'Notice:'}</strong>{' '}
                  {isBangla
                    ? 'ব্যাকআপ রিস্টোর করলে বর্তমান ডাটাবেজের রেকর্ডগুলোর সাথে ব্যাকআপের রেকর্ডগুলো মার্জ/আপডেট হবে।'
                    : 'Restoring backup will merge records into the current active database.'}
                </p>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setPendingImportData(null)}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                  >
                    {isBangla ? 'বাতিল' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    disabled={isImporting}
                    className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md shadow-cyan-600/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isImporting ? (isBangla ? 'রিস্টোর হচ্ছে...' : 'Restoring...') : (isBangla ? 'হ্যাঁ, রিস্টোর নিশ্চিত করুন' : 'Yes, Confirm Restore')}</span>
                  </button>
                </div>
              </div>
            )}

            <div className="text-[11px] text-slate-400 leading-relaxed bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
              💡 <strong>{isBangla ? 'সুপার অ্যাডমিন ব্যাকআপ পলিসি:' : 'Super Admin Policy:'}</strong>{' '}
              {isBangla
                ? 'মেস ম্যানেজারে দীর্ঘমেয়াদে অফলাইন সংরক্ষণের জন্য প্রতি মাসান্তে JSON ব্যাকআপ ফাইলটি ডাউনলোড করে রাখা যাবে। কোনো সমস্যা হলে পূর্ববর্তী ব্যাকআপ ফাইল রিস্টোর করা যাবে।'
                : 'Download monthly JSON backups for permanent offline preservation. In case of unexpected changes, historical JSON archives can be restored instantly.'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
