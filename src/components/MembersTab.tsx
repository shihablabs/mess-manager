'use client';

import React, { useState } from 'react';
import { Users, UserPlus, Lock, Shield, UserMinus, AlertTriangle, Crown } from 'lucide-react';
import { formatTaka } from '@/lib/money';
import { AppUser } from '@/lib/session';

interface MembersTabProps {
  currentUser: AppUser;
  members: any[];
  cycle: any;
  onRefresh: () => void;
}

export const MembersTab: React.FC<MembersTabProps> = ({
  currentUser,
  members,
  cycle,
  onRefresh,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [rent, setRent] = useState('3000');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Individual Settlement
  const [settleMemberId, setSettleMemberId] = useState<string | null>(null);

  // Cycle Close
  const [isClosingCycle, setIsClosingCycle] = useState(false);
  const [carryAmount, setCarryAmount] = useState('0');

  const isManagerOrSuperAdmin =
    currentUser.role === 'super_admin' || currentUser.role === 'admin';

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
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsAdding(false);
        setName('');
        setEmail('');
        setPhone('');
        onRefresh();
        alert('নতুন সদস্য সফলভাবে যুক্ত হয়েছে!');
      } else {
        alert(data.error || 'ব্যর্থ হয়েছে');
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

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
        onRefresh();
      } else {
        alert(data.error || 'ভূমিকা পরিবর্তন ব্যর্থ হয়েছে');
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleSettleMember = async (memberId: string) => {
    const confirmSettle = confirm('আপনি কি এই সদস্যের মেস ছাড়ার চূড়ান্ত হিসাব নিষ্পত্তি করতে চান?');
    if (!confirmSettle) return;

    try {
      const res = await fetch('/api/cycles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'settle_member',
          memberId,
          adminUserId: currentUser.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onRefresh();
        alert('সদস্যের হিসাব নিষ্পত্তি সম্পন্ন হয়েছে!');
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

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
        alert('হিসাব চক্র সফলভাবে বন্ধ করা হয়েছে এবং স্ন্যাপশট সংরক্ষণ করা হয়েছে!');
      }
    } catch (e: any) {
      alert(e.message);
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
            সুপার এডমিন যেকোনো সদস্যকে মেস ম্যানেজার নিযুক্ত করতে পারেন। রুম ভাড়া আলাদাভাবে নির্ধারণযোগ্য।
          </p>
        </div>

        {isManagerOrSuperAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsClosingCycle(!isClosingCycle)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600/80 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-500/20 transition-all cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              চক্র বন্ধ করুন (Close Cycle)
            </button>

            <button
              onClick={() => setIsAdding(!isAdding)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              নতুন সদস্য যোগ
            </button>
          </div>
        )}
      </div>

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
          <h4 className="text-sm font-bold text-indigo-300">নতুন সদস্যের তথ্য</h4>
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
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200"
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
        {members.map((mem) => {
          const isSuperAdminUser = mem.role === 'super_admin';
          const isManagerUser = mem.role === 'admin';

          return (
            <div
              key={mem.userId}
              className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-3 relative hover:border-slate-700 transition-all"
            >
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

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">নির্ধারিত রুম ভাড়া:</span>
                <span className="font-mono text-slate-200 font-bold">{formatTaka(mem.roomRent)}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
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

              {/* Actions for Super Admin / Manager */}
              <div className="border-t border-slate-800 pt-3 flex flex-wrap items-center justify-between gap-2">
                {/* Super Admin can promote/demote Managers */}
                {currentUser.role === 'super_admin' && !isSuperAdminUser && (
                  <div>
                    {isManagerUser ? (
                      <button
                        onClick={() => handleRoleChange(mem.userId, 'member')}
                        className="text-[11px] text-amber-300 hover:text-amber-200 font-medium px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition-all cursor-pointer"
                      >
                        ম্যানেজার থেকে সাধারণ সদস্য করুন
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRoleChange(mem.userId, 'admin')}
                        className="text-[11px] text-indigo-300 hover:text-indigo-200 font-medium px-2 py-1 rounded bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition-all cursor-pointer"
                      >
                        🛡️ মেস ম্যানেজার বানান
                      </button>
                    )}
                  </div>
                )}

                {/* Settle Member */}
                {isManagerOrSuperAdmin && mem.isActiveInCycle && !isSuperAdminUser && (
                  <button
                    onClick={() => handleSettleMember(mem.userId)}
                    className="flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 font-medium px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all cursor-pointer ml-auto"
                  >
                    <UserMinus className="w-3 h-3" />
                    হিসাব নিষ্পত্তি
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
