'use client';

import React, { useState } from 'react';
import {
  Calendar,
  RefreshCw,
  ArrowRightLeft,
  Shield,
  CheckCircle,
  Clock,
  User,
  ShoppingBag,
  RotateCw,
  Check,
  X,
  AlertCircle,
  ExternalLink,
  Edit2,
  Sparkles,
  Info,
} from '@/components/icons';
import { AppUser } from '@/lib/session';
import { formatTaka } from '@/lib/money';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import Link from 'next/link';

interface RosterTabProps {
  currentUser: AppUser;
  slots: any[];
  requests: any[];
  onRefresh: () => void;
}

export const RosterTab: React.FC<RosterTabProps> = ({
  currentUser,
  slots = [],
  requests = [],
  onRefresh,
}) => {
  // Modal states
  const [isPeerSwapModalOpen, setIsPeerSwapModalOpen] = useState(false);
  const [selectedToSlotIndex, setSelectedToSlotIndex] = useState<number | null>(null);
  const [swapReason, setReason] = useState('');
  const [isSubmittingSwap, setIsSubmittingSwap] = useState(false);

  // Super Admin Direct Swap Modal
  const [isAdminSwapModalOpen, setIsAdminSwapModalOpen] = useState(false);
  const [adminSlotA, setAdminSlotA] = useState<number>(1);
  const [adminSlotB, setAdminSlotB] = useState<number>(2);
  const [isExecutingAdminSwap, setIsExecutingAdminSwap] = useState(false);

  // Super Admin Edit Slot Modal
  const [editingSlot, setEditingSlot] = useState<any | null>(null);
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editUserId, setEditUserId] = useState('');
  const [isSavingSlotEdit, setIsSavingSlotEdit] = useState(false);

  // Member Detail Preview Modal
  const [previewMember, setPreviewMember] = useState<any | null>(null);

  // Loading states
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [respondingRequestId, setRespondingRequestId] = useState<string | null>(null);

  const isSuperAdmin = currentUser.role === 'super_admin';
  const isManager = currentUser.role === 'admin' || isSuperAdmin;

  // Find current user's slot
  const currentUserSlot = slots.find((s) =>
    s.assignedUsers?.some((u: any) => u.id === currentUser.id)
  );

  // Today string YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];

  // Incoming swap requests targeted to current user
  const incomingRequests = requests.filter(
    (r) => r.toUserId === currentUser.id && r.status === 'pending'
  );

  // 1. Super Admin Auto-Generate 5-day slots
  const handleAutoGenerate = async () => {
    try {
      setIsAutoGenerating(true);
      const res = await fetch('/api/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'auto_generate',
          daysPerSlot: 5,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onRefresh();
        Swal.fire({
          title: 'বণ্টন সম্পন্ন হয়েছে!',
          text: data.message || 'সকল সক্রিয় সদস্যদের মাঝে ৫ দিন মেয়াদী বাজার রোস্টার সফলভাবে তৈরি করা হয়েছে।',
          icon: 'success',
          confirmButtonColor: '#4f46e5',
          background: '#0f172a',
          color: '#f8fafc',
        });
      } else {
        toast.error(data.error || 'বণ্টন ব্যর্থ হয়েছে');
      }
    } catch (e: any) {
      toast.error(e.message || 'ত্রুটি ঘটেছে');
    } finally {
      setIsAutoGenerating(false);
    }
  };

  // 2. Super Admin Rotate / Shift for next month
  const handleRotateSlots = async (isReverse = false) => {
    try {
      setIsRotating(true);
      const res = await fetch('/api/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'rotate_slots',
          shiftOffset: 1,
          isReverse,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onRefresh();
        Swal.fire({
          title: isReverse ? 'বিপরীতক্রমে রোটেট হয়েছে!' : 'পরবর্তী মাসের রোটেশন সফল!',
          text: data.message || 'বাজার রোস্টারে সদস্যদের ক্রম ১ ধাপ শিফট করা হয়েছে।',
          icon: 'success',
          confirmButtonColor: '#4f46e5',
          background: '#0f172a',
          color: '#f8fafc',
        });
      } else {
        toast.error(data.error || 'রোটেশন ব্যর্থ হয়েছে');
      }
    } catch (e: any) {
      toast.error(e.message || 'ত্রুটি ঘটেছে');
    } finally {
      setIsRotating(false);
    }
  };

  // 3. Member to Member Peer Swap Request
  const handleSendPeerSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserSlot) {
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
          userId: currentUser.id,
          toUserId: targetUserId,
          fromSlotIndex: currentUserSlot.slotIndex,
          toSlotIndex: selectedToSlotIndex,
          reason: swapReason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsPeerSwapModalOpen(false);
        setReason('');
        setSelectedToSlotIndex(null);
        onRefresh();
        Swal.fire({
          title: 'সোয়াপ অনুরোধ পাঠানো হয়েছে!',
          text: `উক্ত সদস্যের নিকট সোয়াপ অনুরোধ পাঠানো হয়েছে। তিনি এক্সেপ্ট করলেই স্বয়ংক্রিয়ভাবে স্লট অদলবদল কার্যকর হবে।`,
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

  // 4. Respond to Peer Swap Request (Accept / Reject) - NO admin needed!
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
        onRefresh();
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

  // 5. Super Admin Direct Swap (No user consent needed)
  const handleAdminDirectSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adminSlotA === adminSlotB) {
      toast.warning('দুটি ভিন্ন স্লট নির্বাচন করুন');
      return;
    }

    try {
      setIsExecutingAdminSwap(true);
      const res = await fetch('/api/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'admin_direct_swap',
          slotIndexA: adminSlotA,
          slotIndexB: adminSlotB,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsAdminSwapModalOpen(false);
        onRefresh();
        Swal.fire({
          title: 'সরাসরি সোয়াপ সম্পন্ন!',
          text: data.message || `স্লট #${adminSlotA} এবং স্লট #${adminSlotB} সরাসরি অদলবদল করা হয়েছে।`,
          icon: 'success',
          confirmButtonColor: '#4f46e5',
          background: '#0f172a',
          color: '#f8fafc',
        });
      } else {
        toast.error(data.error || 'সোয়াপ ব্যর্থ হয়েছে');
      }
    } catch (e: any) {
      toast.error(e.message || 'ত্রুটি ঘটেছে');
    } finally {
      setIsExecutingAdminSwap(false);
    }
  };

  // 6. Super Admin Manual Slot Edit
  const handleSaveSlotEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlot) return;

    try {
      setIsSavingSlotEdit(true);
      const res = await fetch('/api/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'admin_update_slot',
          slotIndex: editingSlot.slotIndex,
          assignedUserId: editUserId,
          startDate: editStartDate,
          endDate: editEndDate,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingSlot(null);
        onRefresh();
        toast.success(data.message || 'স্লট সফলভাবে হালনাগাদ করা হয়েছে!');
      } else {
        toast.error(data.error || 'আপডেট ব্যর্থ হয়েছে');
      }
    } catch (e: any) {
      toast.error(e.message || 'ত্রুটি ঘটেছে');
    } finally {
      setIsSavingSlotEdit(false);
    }
  };

  // All unique assigned members across slots
  const allMembersList: any[] = [];
  const seenMemberIds = new Set<string>();
  slots.forEach((s) => {
    s.assignedUsers?.forEach((u: any) => {
      if (!seenMemberIds.has(u.id)) {
        seenMemberIds.add(u.id);
        allMembersList.push(u);
      }
    });
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Controls */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                মাসিক বাজার বণ্টন ও দায়িত্ব রোস্টার (Monthly Duty Roster)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                সদস্যদের মধ্যে ৫ দিন মেয়াদী স্লটে বাজার বণ্টন, স্বয়ংক্রিয় রোটেশন এবং পারস্পরিক সোয়াপ সুবিধা
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Member Swap Request Button */}
          {currentUserSlot && (
            <button
              onClick={() => {
                setIsPeerSwapModalOpen(true);
                const otherSlot = slots.find((s) => s.slotIndex !== currentUserSlot.slotIndex);
                if (otherSlot) setSelectedToSlotIndex(otherSlot.slotIndex);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>ডিউটি সোয়াপ অনুরোধ</span>
            </button>
          )}

          {/* Super Admin Direct Controls */}
          {isSuperAdmin && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setAdminSlotA(1);
                  setAdminSlotB(slots.length > 1 ? 2 : 1);
                  setIsAdminSwapModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 text-xs font-bold transition-all cursor-pointer"
                title="সুপার অ্যাডমিন অনুমতি ছাড়াই যেকোনো দুই স্লট অদলবদল করতে পারবেন"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>সরাসরি সোয়াপ</span>
              </button>

              <button
                onClick={() => handleRotateSlots(false)}
                disabled={isRotating}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
                title="পরবর্তী মাসের জন্য সদস্যদের ক্রম ১ ধাপ সামনে রোটেট করুন"
              >
                <RotateCw className={`w-3.5 h-3.5 text-amber-400 ${isRotating ? 'animate-spin' : ''}`} />
                <span>পরবর্তী মাস রোটেশন</span>
              </button>

              <button
                onClick={handleAutoGenerate}
                disabled={isAutoGenerating}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
                title="চলতি মাসের দিনগুলোকে ৫ দিন করে সমান ভাগে বণ্টন করুন"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isAutoGenerating ? 'animate-spin' : ''}`} />
                <span>৫-দিনের পুনর্বণ্টন</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Incoming Peer Swap Requests Notification Box */}
      {incomingRequests.length > 0 && (
        <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-amber-500/40 bg-amber-950/20 space-y-3 animate-in fade-in">
          <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>আপনার জন্য বাজার ডিউটি অদলবদল (Swap) এর অনুরোধ এসেছে ({incomingRequests.length}টি)</span>
          </div>
          <div className="space-y-2">
            {incomingRequests.map((req) => (
              <div
                key={req._id}
                className="p-3 rounded-xl bg-slate-900/80 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={req.fromUser?.image || `https://api.dicebear.com/7.x/bottts/svg?seed=${req.fromUserId}`}
                    alt={req.fromUser?.name || 'সদস্য'}
                    className="w-9 h-9 rounded-xl object-cover border border-amber-500/40"
                  />
                  <div>
                    <span className="font-bold text-white text-sm block">
                      {req.fromUser?.name || req.userName}
                    </span>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      তাঁর দায়িত্ব: <strong className="text-amber-300">{req.fromSlotDates}</strong> ⮂ আপনার দায়িত্ব:{' '}
                      <strong className="text-emerald-300">{req.toSlotDates}</strong>
                    </p>
                    {req.reason && (
                      <p className="text-[10px] text-slate-400 italic mt-0.5">
                        কারণ: &ldquo;{req.reason}&rdquo;
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
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

      {/* Duty Roster Slots Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {slots.map((slot) => {
          const isCurrentUserSlot = slot.assignedUsers?.some((u: any) => u.id === currentUser.id);
          const isCurrentlyActive = todayStr >= slot.startDate && todayStr <= slot.endDate;
          const isPastSlot = todayStr > slot.endDate;
          const primaryUser = slot.assignedUsers?.[0];

          return (
            <div
              key={slot._id || slot.slotIndex}
              className={`glass-panel rounded-2xl p-5 border transition-all space-y-4 relative ${
                isCurrentlyActive
                  ? 'border-emerald-500/50 bg-emerald-950/20 shadow-lg shadow-emerald-500/10'
                  : isCurrentUserSlot
                  ? 'border-indigo-500/50 bg-indigo-950/20'
                  : 'border-slate-800 bg-slate-900/60'
              }`}
            >
              {/* Header Badges */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                  স্লট #{slot.slotIndex}
                </span>

                <div className="flex items-center gap-1.5">
                  {isCurrentlyActive ? (
                    <span className="text-[10px] bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      বর্তমানে সক্রিয়
                    </span>
                  ) : isPastSlot ? (
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-medium">
                      সম্পন্ন
                    </span>
                  ) : (
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-medium">
                      আসন্ন
                    </span>
                  )}

                  {isCurrentUserSlot && (
                    <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-bold shadow-sm">
                      আপনার দায়িত্ব
                    </span>
                  )}
                </div>
              </div>

              {/* Slot Date Range */}
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{slot.startDate} হতে {slot.endDate}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400 mt-1">
                  <span>মেয়াদ: ৫ দিন</span>
                  {slot.slotBazarTotal > 0 && (
                    <span className="font-mono text-purple-300 font-bold">
                      এই সময়ে বাজার: {formatTaka(slot.slotBazarTotal)}
                    </span>
                  )}
                </div>
              </div>

              {/* Assigned Member Card (Clickable to preview profile) */}
              <div className="border-t border-slate-800/80 pt-3">
                <span className="text-[11px] text-slate-400 block mb-2 font-medium">দায়িত্বপ্রাপ্ত সদস্য:</span>
                {primaryUser ? (
                  <div
                    onClick={() => setPreviewMember(primaryUser)}
                    className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-indigo-500/40 hover:bg-slate-900 transition-all flex items-center justify-between gap-3 cursor-pointer group"
                    title="সদস্যের প্রোফাইল ও বিস্তারিত দেখতে ক্লিক করুন"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={primaryUser.image}
                        alt={primaryUser.name}
                        className="w-9 h-9 rounded-xl object-cover border border-slate-700 group-hover:border-indigo-400 shrink-0 transition-colors"
                      />
                      <div className="truncate">
                        <span className="font-bold text-white text-xs block truncate group-hover:text-indigo-300 transition-colors flex items-center gap-1">
                          {primaryUser.name}
                          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate">
                          {primaryUser.email || 'মেস সদস্য'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-slate-400 block">চলতি মাসে বাজার</span>
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        {formatTaka(primaryUser.spentThisMonth || 0)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-dashed border-slate-700 text-xs text-slate-400 text-center">
                    সদস্য বরাদ্দ নেই
                  </div>
                )}
              </div>

              {/* Slot Actions */}
              <div className="flex items-center justify-between pt-1">
                {isCurrentUserSlot ? (
                  <span className="text-[11px] text-indigo-400 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    আপনার নির্ধারিত শিডিউল
                  </span>
                ) : (
                  currentUserSlot && (
                    <button
                      onClick={() => {
                        setSelectedToSlotIndex(slot.slotIndex);
                        setIsPeerSwapModalOpen(true);
                      }}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <ArrowRightLeft className="w-3 h-3" />
                      এই স্লটে সোয়াপ চান
                    </button>
                  )
                )}

                {/* Super Admin Direct Edit */}
                {isSuperAdmin && (
                  <button
                    onClick={() => {
                      setEditingSlot(slot);
                      setEditStartDate(slot.startDate);
                      setEditEndDate(slot.endDate);
                      setEditUserId(primaryUser?.id || '');
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer ml-auto"
                    title="স্লটের তারিখ বা সদস্য পরিবর্তন করুন"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL 1: MEMBER TO MEMBER PEER SWAP MODAL */}
      {isPeerSwapModalOpen && currentUserSlot && (
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
                className="text-slate-400 hover:text-slate-200 p-1"
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
                  স্লট #{currentUserSlot.slotIndex}: {currentUserSlot.startDate} হতে {currentUserSlot.endDate} (৫ দিন)
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
                    .filter((s) => s.slotIndex !== currentUserSlot.slotIndex)
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
                  onChange={(e) => setReason(e.target.value)}
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

      {/* MODAL 2: SUPER ADMIN DIRECT SWAP MODAL */}
      {isAdminSwapModalOpen && isSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-purple-500/40 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-purple-950/30">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-white text-sm">সরাসরি স্লট সোয়াপ (সুপার অ্যাডমিন)</h3>
              </div>
              <button
                onClick={() => setIsAdminSwapModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdminDirectSwap} className="p-5 space-y-4 text-xs">
              <p className="text-slate-400 text-[11px]">
                সুপার অ্যাডমিন হিসেবে আপনি সদস্যদের অনুমতি ছাড়াই সরাসরি যেকোনো দুটি স্লটের সদস্য পরিবর্তন করতে পারেন:
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">প্রথম স্লট (A)</label>
                  <select
                    value={adminSlotA}
                    onChange={(e) => setAdminSlotA(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200"
                  >
                    {slots.map((s) => (
                      <option key={s.slotIndex} value={s.slotIndex}>
                        স্লট #{s.slotIndex} ({s.assignedUsers?.[0]?.name || 'সদস্য'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">দ্বিতীয় স্লট (B)</label>
                  <select
                    value={adminSlotB}
                    onChange={(e) => setAdminSlotB(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200"
                  >
                    {slots.map((s) => (
                      <option key={s.slotIndex} value={s.slotIndex}>
                        স্লট #{s.slotIndex} ({s.assignedUsers?.[0]?.name || 'সদস্য'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAdminSwapModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isExecutingAdminSwap}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-lg shadow-purple-600/25 transition-all cursor-pointer"
                >
                  {isExecutingAdminSwap ? 'সোয়াপ হচ্ছে...' : 'সরাসরি সোয়াপ সম্পন্ন করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: SUPER ADMIN EDIT SLOT MODAL */}
      {editingSlot && isSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl shadow-2xl p-5 space-y-4 animate-in zoom-in-95 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h4 className="font-bold text-white text-sm">স্লট #{editingSlot.slotIndex} সম্পাদনা</h4>
              <button onClick={() => setEditingSlot(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSlotEdit} className="space-y-3">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">দায়িত্বপ্রাপ্ত সদস্য</label>
                <select
                  value={editUserId}
                  onChange={(e) => setEditUserId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 cursor-pointer"
                >
                  {allMembersList.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">শুরুর তারিখ</label>
                  <input
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-200 font-mono text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">শেষের তারিখ</label>
                  <input
                    type="date"
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-200 font-mono text-xs"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingSlot(null)}
                  className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSavingSlotEdit}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer"
                >
                  {isSavingSlotEdit ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: MEMBER DETAIL PREVIEW MODAL */}
      {previewMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl shadow-2xl p-5 space-y-4 animate-in zoom-in-95 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <User className="w-4 h-4 text-indigo-400" />
                সদস্যের বিবরণ
              </span>
              <button onClick={() => setPreviewMember(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col items-center text-center space-y-2 pt-1">
              <img
                src={previewMember.image}
                alt={previewMember.name}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-500 shadow-lg shadow-indigo-500/20"
              />
              <div>
                <h4 className="text-base font-bold text-white flex items-center justify-center gap-1.5">
                  {previewMember.name}
                  {previewMember.role === 'admin' && (
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-normal">
                      ম্যানেজার
                    </span>
                  )}
                </h4>
                <p className="text-xs text-slate-400">{previewMember.email || 'মেস সদস্য'}</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">চলতি মাসে বাজার খরচ:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {formatTaka(previewMember.spentThisMonth || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">মেসে পদবী:</span>
                <span className="text-slate-200 capitalize">
                  {previewMember.role === 'admin' ? 'মেস ম্যানেজার' : 'বর্ডার / সদস্য'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
              <Link
                href={`/dashboard/users?userId=${previewMember.id}`}
                className="w-full text-center px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-md shadow-indigo-600/20"
              >
                পূর্ণাঙ্গ স্টেটমেন্ট ও প্রোফাইল দেখুন
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
