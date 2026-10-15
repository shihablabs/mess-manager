'use client';

import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Lock,
  Shield,
  AlertTriangle,
  Crown,
  CheckCircle,
  XCircle,
  Clock,
  Settings,
  Edit2,
  Save,
  FileText,
  DollarSign,
  UserCheck,
  User,
} from 'lucide-react';
import { formatTaka } from '@/lib/money';
import { AppUser } from '@/lib/session';
import { toast } from 'sonner';
import Link from 'next/link';

interface MembersTabProps {
  currentUser: AppUser;
  members: any[];
  cycle: any;
  onRefresh: () => void;
  onOpenStatement?: (member: any) => void;
}

export const MembersTab: React.FC<MembersTabProps> = ({
  currentUser,
  members = [],
  cycle,
  onRefresh,
  onOpenStatement,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [rent, setRent] = useState('3000');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cycle Settings state
  const [isCycleSettingsOpen, setIsCycleSettingsOpen] = useState(false);
  const [cycleName, setCycleName] = useState(cycle?.name || 'অক্টোবর ২০২৬');
  const [isBigBazarEnabled, setIsBigBazarEnabled] = useState<boolean>(cycle?.isBigBazarEnabled ?? true);
  const [bigBazarContribution, setBigBazarContribution] = useState<string>(
    String(cycle?.bigBazarContributionPerMember ?? 1400)
  );

  // Inline Room Rent Editing
  const [editingRentUserId, setEditingRentUserId] = useState<string | null>(null);
  const [tempRentValue, setTempRentValue] = useState<string>('');

  // Pending approval rent inputs
  const [pendingRentMap, setPendingRentMap] = useState<Record<string, string>>({});

  // Cycle Close
  const [isClosingCycle, setIsClosingCycle] = useState(false);
  const [carryAmount, setCarryAmount] = useState('0');

  const isSuperAdmin = currentUser.role === 'super_admin';
  const isManagerOrSuperAdmin = isSuperAdmin || currentUser.role === 'admin';

  const pendingMembers = members.filter((m) => m.status === 'pending');
  const activeMembers = members.filter((m) => m.status !== 'pending');

  // 1. Approve pending member
  const handleApprove = async (userId: string) => {
    const customRent = Number(pendingRentMap[userId] || 3000);
    try {
      setIsSubmitting(true);
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve_member',
          userId,
          roomRent: customRent,
          cycleId: cycle?._id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onRefresh();
        toast.success('সদস্য সফলভাবে অনুমোদিত হয়েছে এবং মেসে সক্রিয় করা হয়েছে!');
      } else {
        toast.error(data.error || 'অনুমোদন ব্যর্থ হয়েছে');
      }
    } catch (e: any) {
      toast.error(e.message || 'ত্রুটি ঘটেছে');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Reject pending member
  const handleReject = async (userId: string) => {
    const confirmReject = confirm('আপনি কি নিশ্চিত যে এই সদস্যের রেজিস্ট্রেশন বাতিল করতে চান?');
    if (!confirmReject) return;
    try {
      setIsSubmitting(true);
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject_member',
          userId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('সদস্যের রেজিস্ট্রেশন সফলভাবে বাতিল করা হয়েছে');
        onRefresh();
      } else {
        toast.error(data.error || 'বাতিল ব্যর্থ হয়েছে');
      }
    } catch (e: any) {
      toast.error(e.message || 'ত্রুটি ঘটেছে');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Save Room Rent
  const handleSaveRent = async (userId: string) => {
    const newRent = Number(tempRentValue);
    if (isNaN(newRent) || newRent < 0) {
      toast.warning('সঠিক ভাড়ার পরিমাণ দিন');
      return;
    }
    try {
      setIsSubmitting(true);
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_rent',
          userId,
          roomRent: newRent,
          cycleId: cycle?._id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingRentUserId(null);
        toast.success('রুম ভাড়া সফলভাবে আপডেট হয়েছে!');
        onRefresh();
      } else {
        toast.error(data.error || 'ভাড়া আপডেট ব্যর্থ হয়েছে');
      }
    } catch (e: any) {
      toast.error(e.message || 'ত্রুটি ঘটেছে');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Utility Bill Exemption (সদস্য পুরো মাস অনুপস্থিত থাকলে ইউটিলিটি মওকুফ করা)
  const handleToggleUtilityExempt = async (userId: string, isUtilityExempt: boolean) => {
    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_utility_exempt',
          userId,
          isUtilityExempt,
          cycleId: cycle?._id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'ইউটিলিটি ছাড় স্ট্যাটাস আপডেট হয়েছে!');
        onRefresh();
      } else {
        toast.error(data.error || 'আপডেট ব্যর্থ হয়েছে');
      }
    } catch (e: any) {
      toast.error(e.message || 'ত্রুটি ঘটেছে');
    }
  };

  // 4. Save Cycle & Big Bazar Settings
  const handleSaveCycleSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const res = await fetch('/api/cycles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_cycle_config',
          cycleId: cycle?._id,
          name: cycleName,
          isBigBazarEnabled,
          bigBazarContributionPerMember: Number(bigBazarContribution),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsCycleSettingsOpen(false);
        onRefresh();
        toast.success('চক্র ও বড় বাজার কনফিগারেশন সফলভাবে আপডেট হয়েছে!');
      } else {
        toast.error(data.error || 'আপডেট ব্যর্থ হয়েছে');
      }
    } catch (e: any) {
      toast.error(e.message || 'ত্রুটি ঘটেছে');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. Add Member Manually
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;
    try {
      setIsSubmitting(true);
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_member',
          name,
          email,
          phone,
          roomRent: Number(rent),
          cycleId: cycle?._id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsAdding(false);
        setName('');
        setEmail('');
        setPhone('');
        onRefresh();
        toast.success('নতুন সদস্য সফলভাবে যুক্ত হয়েছে!');
      } else {
        toast.error(data.error || 'ব্যর্থ হয়েছে');
      }
    } catch (e: any) {
      toast.error(e.message || 'ত্রুটি ঘটেছে');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 6. Role Delegation (Super Admin only)
  const handleRoleChange = async (userId: string, newRole: 'admin' | 'member') => {
    const actionText = newRole === 'admin' ? 'মেস ম্যানেজার' : 'সাধারণ সদস্য';
    const confirmChange = confirm(`আপনি কি এই সদস্যকে ${actionText} করতে চান?`);
    if (!confirmChange) return;

    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change_role',
          userId,
          role: newRole,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${actionText} হিসেবে দায়িত্ব নির্ধারণ সফল হয়েছে!`);
        onRefresh();
      } else {
        toast.error(data.error || 'ভূমিকা পরিবর্তন ব্যর্থ হয়েছে');
      }
    } catch (e: any) {
      toast.error(e.message || 'ত্রুটি ঘটেছে');
    }
  };

  // 7. Cycle Close
  const handleCloseCycle = async () => {
    const confirmClose = confirm(
      'আপনি কি নিশ্চিত যে বর্তমান হিসাব চক্রটি বন্ধ করে স্ন্যাপশট সংরক্ষণ করতে চান?'
    );
    if (!confirmClose) return;

    try {
      const res = await fetch('/api/cycles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'close_cycle',
          carryAmount: Number(carryAmount),
          adminUserId: currentUser.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsClosingCycle(false);
        onRefresh();
        toast.success('হিসাব চক্র সফলভাবে বন্ধ করা হয়েছে এবং স্ন্যাপশট সংরক্ষণ করা হয়েছে!');
      }
    } catch (e: any) {
      toast.error(e.message || 'ত্রুটি ঘটেছে');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            মেসের সদস্য ও দায়িত্ব ব্যবস্থাপনা
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            সুপার এডমিন যেকোনো সদস্যকে মেস ম্যানেজার নিযুক্ত করতে পারেন। রুম ভাড়া ও বড় বাজার সেটিংস আলাদাভাবে নিয়ন্ত্রণযোগ্য।
          </p>
        </div>

        {isManagerOrSuperAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsCycleSettingsOpen(!isCycleSettingsOpen)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-indigo-400" />
              বড় বাজার ও চক্র সেটিংস
            </button>

            <button
              onClick={() => setIsAdding(!isAdding)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              সদস্য যোগ
            </button>

            <button
              onClick={() => setIsClosingCycle(!isClosingCycle)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600/80 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-500/20 transition-all cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              চক্র বন্ধ
            </button>
          </div>
        )}
      </div>

      {/* PENDING MEMBERS APPROVAL SECTION (Alert Box) */}
      {isManagerOrSuperAdmin && pendingMembers.length > 0 && (
        <div className="glass-panel rounded-2xl p-5 border border-amber-500/40 bg-amber-950/20 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-amber-300 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
              অপেক্ষমান নতুন গুগল সাইন-ইন সদস্য ({pendingMembers.length} জন)
            </h4>
            <span className="text-[11px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-semibold">
              অনুমোদন আবশ্যক
            </span>
          </div>
          <p className="text-xs text-slate-300">
            নিচের ব্যবহারকারীরা গুগল দিয়ে লগইন করেছেন। মেসের ড্যাশবোর্ড ও মিল খাতায় যুক্ত করার জন্য রুম ভাড়া নির্ধারণ করে অনুমোদন দিন।
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {pendingMembers.map((pm) => {
              const currentRentVal = pendingRentMap[pm.userId] ?? '3000';
              return (
                <div
                  key={pm.userId}
                  className="p-4 rounded-xl bg-slate-900/90 border border-amber-500/30 flex flex-col justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={pm.image}
                      alt={pm.name}
                      className="w-10 h-10 rounded-full bg-slate-800 border border-amber-400 object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-white truncate">{pm.name}</div>
                      <div className="text-xs text-slate-400 truncate">{pm.email}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                    <div className="flex-1">
                      <label className="block text-[10px] text-slate-400 mb-0.5">নির্ধারিত রুম ভাড়া (৳)</label>
                      <input
                        type="number"
                        value={currentRentVal}
                        onChange={(e) =>
                          setPendingRentMap({ ...pendingRentMap, [pm.userId]: e.target.value })
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                        placeholder="3000"
                      />
                    </div>
                    <div className="flex items-end gap-1.5 pt-3">
                      <button
                        onClick={() => handleApprove(pm.userId)}
                        disabled={isSubmitting}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow transition-all cursor-pointer"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        অনুমোদন
                      </button>
                      <button
                        onClick={() => handleReject(pm.userId)}
                        disabled={isSubmitting}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-500 text-white text-xs font-medium transition-all cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        বাতিল
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CYCLE & BIG BAZAR CONFIGURATION PANEL */}
      {isCycleSettingsOpen && isManagerOrSuperAdmin && (
        <form
          onSubmit={handleSaveCycleSettings}
          className="glass-panel rounded-2xl p-5 border border-indigo-500/40 bg-indigo-950/20 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-indigo-300 flex items-center gap-2">
              <Settings className="w-4 h-4 text-indigo-400" />
              চলমান চক্র ও বড় বাজার কনফিগারেশন
            </h4>
            <span className="text-[11px] text-slate-400">ম্যানেজার ও সুপার এডমিন সেটিংস</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">হিসাব চক্রের নাম</label>
              <input
                type="text"
                required
                value={cycleName}
                onChange={(e) => setCycleName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-semibold"
              />
            </div>

            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="bigBazarCheckbox"
                disabled={!isSuperAdmin}
                checked={isBigBazarEnabled}
                onChange={(e) => setIsBigBazarEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              />
              <label htmlFor="bigBazarCheckbox" className="text-xs text-slate-200 font-medium cursor-pointer">
                চলমান চক্রে বড় বাজার ফান্ড সক্রিয় থাকবে {!isSuperAdmin && '(🔒 কেবল সুপার অ্যাডমিন)'}
              </label>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                জনপ্রতি বড় বাজার কন্ট্রিবিউশন (টাকা)
              </label>
              <input
                type="number"
                disabled={!isBigBazarEnabled}
                value={bigBazarContribution}
                onChange={(e) => setBigBazarContribution(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 disabled:opacity-50 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono font-bold"
                placeholder="1400"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsCycleSettingsOpen(false)}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 cursor-pointer"
            >
              সেটিংস সংরক্ষণ করুন
            </button>
          </div>
        </form>
      )}

      {/* Cycle Close Dialog */}
      {isClosingCycle && (
        <div className="glass-panel rounded-2xl p-5 border border-rose-500/30 bg-rose-950/20 space-y-4">
          <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            মাসিক চক্র বন্ধ ও হিসাবের স্ন্যাপশট তৈরি (SRS ৪.৯ ও ৭.৬)
          </div>
          <p className="text-xs text-slate-300">
            চক্র বন্ধ করলে সমস্ত ডেটা অপরিবর্তনীয় (Immutable) হয়ে যাবে এবং প্রতিটি সদস্যের চূড়ান্ত
            ব্যালেন্স ও মেসের সারসংক্ষেপ স্ন্যাপশটে সংরক্ষিত হবে।
          </p>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-xs text-slate-400 mb-1">
                পরের চক্রে অবশিষ্ট মালের মূল্য ক্যারি (L_carry)
              </label>
              <input
                type="number"
                value={carryAmount}
                onChange={(e) => setCarryAmount(e.target.value)}
                placeholder="যেমন: 500"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200"
              />
            </div>
            <button
              onClick={handleCloseCycle}
              className="mt-5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg shadow-lg cursor-pointer"
            >
              চূড়ান্তভাবে চক্র বন্ধ করুন
            </button>
          </div>
        </div>
      )}

      {/* Add Member Form */}
      {isAdding && (
        <form
          onSubmit={handleAddMember}
          className="glass-panel rounded-2xl p-5 border border-indigo-500/30 bg-indigo-950/20 space-y-4"
        >
          <h4 className="text-sm font-bold text-indigo-300">ম্যানুয়ালি নতুন সদস্যের তথ্য এন্ট্রি</h4>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">সদস্যের নাম</label>
              <input
                type="text"
                required
                placeholder="নাম"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">ইমেইল (Gmail)</label>
              <input
                type="email"
                required
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">মোবাইল নম্বর</label>
              <input
                type="text"
                placeholder="017xxxxxxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">নির্ধারিত রুম ভাড়া</label>
              <input
                type="number"
                placeholder="3000"
                value={rent}
                onChange={(e) => setRent(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
            >
              সদস্য যুক্ত করুন
            </button>
          </div>
        </form>
      )}

      {/* Member Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeMembers.map((mem) => {
          const isSuperAdminUser = mem.role === 'super_admin';
          const isManagerUser = mem.role === 'admin';
          const isEditingRent = editingRentUserId === mem.userId;

          return (
            <div
              key={mem.userId}
              className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-3 relative hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <img
                    src={mem.image}
                    alt={mem.name}
                    className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 object-cover"
                  />
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5 truncate">
                      {mem.name}
                      {isSuperAdminUser && (
                        <Crown className="w-4 h-4 text-purple-400 shrink-0" />
                      )}
                      {isManagerUser && (
                        <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                      )}
                    </h4>
                    <p className="text-xs text-slate-400 truncate">{mem.email}</p>
                  </div>
                </div>

                <div className="border-t border-slate-800/80 pt-2.5 flex items-center justify-between text-xs">
                  <span className="text-slate-400">ভূমিকা:</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isSuperAdminUser
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        : isManagerUser
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {isSuperAdminUser
                      ? '👑 সুপার এডমিন (মালিক)'
                      : isManagerUser
                      ? '🛡️ মেস ম্যানেজার'
                      : '👤 সদস্য'}
                  </span>
                </div>

                {/* Room Rent Row with Inline Edit */}
                <div className="flex items-center justify-between text-xs py-1 border-t border-slate-800/60">
                  <span className="text-slate-400">রুম ভাড়া:</span>
                  {isEditingRent ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={tempRentValue}
                        onChange={(e) => setTempRentValue(e.target.value)}
                        className="w-20 bg-slate-950 border border-indigo-500 rounded px-2 py-1 text-xs text-white font-mono"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveRent(mem.userId)}
                        className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white"
                        title="সংরক্ষণ"
                      >
                        <Save className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingRentUserId(null)}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400"
                        title="বাতিল"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-slate-200 font-bold">{formatTaka(mem.roomRent)}</span>
                      {isManagerOrSuperAdmin && (
                        <button
                          onClick={() => {
                            setEditingRentUserId(mem.userId);
                            setTempRentValue(String(mem.roomRent));
                          }}
                          className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 ml-1 transition-colors cursor-pointer"
                          title="রুম ভাড়া এডিট করুন"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Utility Exemption Row (সদস্য পুরো মাস বাইরে থাকলে ইউটিলিটি মওকুফ) */}
                <div className="flex items-center justify-between text-xs py-1 border-t border-slate-800/60">
                  <span className="text-slate-400">ইউটিলিটি বিল:</span>
                  <div className="flex items-center gap-1.5">
                    {mem.isUtilityExempt ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        🎁 মওকুফ (Free)
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-300">
                        সাধারণ
                      </span>
                    )}

                    {isManagerOrSuperAdmin && (
                      <button
                        onClick={() => handleToggleUtilityExempt(mem.userId, !mem.isUtilityExempt)}
                        className={`text-[10px] px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer ${
                          mem.isUtilityExempt
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                            : 'bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30'
                        }`}
                        title={mem.isUtilityExempt ? 'ইউটিলিটি বিল পুনরায় চালু করুন' : 'সদস্য পুরো মাস অনুপস্থিত থাকলে ইউটিলিটি মওকুফ করুন'}
                      >
                        {mem.isUtilityExempt ? 'চালু করুন' : 'মওকুফ'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs border-t border-slate-800/60 pt-1">
                  <span className="text-slate-400">স্ট্যাটাস:</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      mem.isActiveInCycle
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-rose-500/20 text-rose-400'
                    }`}
                  >
                    {mem.isActiveInCycle ? 'সক্রিয় সদস্য' : 'মেস ছেড়েছেন (Settled)'}
                  </span>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="border-t border-slate-800 pt-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* View Full Profile Page */}
                  <Link
                    href={`/dashboard/profile?userId=${mem.userId}`}
                    className="flex items-center gap-1 text-[11px] text-amber-300 hover:text-amber-200 font-medium px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition-all cursor-pointer"
                  >
                    <User className="w-3 h-3 text-amber-400" />
                    প্রোফাইল
                  </Link>

                  {/* View Statement & Profile Modal */}
                  {onOpenStatement && (
                    <button
                      onClick={() => onOpenStatement(mem)}
                      className="flex items-center gap-1 text-[11px] text-indigo-300 hover:text-indigo-200 font-medium px-2.5 py-1 rounded bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition-all cursor-pointer"
                    >
                      <FileText className="w-3 h-3" />
                      স্টেটমেন্ট
                    </button>
                  )}
                </div>

                {/* Super Admin can promote/demote Managers */}
                {currentUser.role === 'super_admin' && !isSuperAdminUser && (
                  <div>
                    {isManagerUser ? (
                      <button
                        onClick={() => handleRoleChange(mem.userId, 'member')}
                        className="text-[11px] text-amber-300 hover:text-amber-200 font-medium px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition-all cursor-pointer"
                      >
                        ম্যানেজার বাতিল
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRoleChange(mem.userId, 'admin')}
                        className="text-[11px] text-amber-400 hover:text-amber-300 font-medium px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition-all cursor-pointer"
                      >
                        🛡️ ম্যানেজার বানান
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
