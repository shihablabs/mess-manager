'use client';

import React, { useState } from 'react';
import { ShoppingBag, Plus, CheckCircle, XCircle, Clock, Shield, Sparkles } from 'lucide-react';
import { formatTaka } from '@/lib/money';
import { AppUser } from '@/lib/session';

interface BazarTabProps {
  currentUser: AppUser;
  bazars: any[];
  fixedEvents: any[];
  onRefresh: () => void;
  onOpenNewBazarModal: () => void;
  onOpenFixedEventModal?: () => void;
}

export const BazarTab: React.FC<BazarTabProps> = ({
  currentUser,
  bazars,
  fixedEvents,
  onRefresh,
  onOpenNewBazarModal,
  onOpenFixedEventModal,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'regular' | 'fixed' | 'extra' | 'big'>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);

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
        onRefresh();
      } else {
        alert(data.error || 'ব্যর্থ হয়েছে');
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setProcessingId(null);
    }
  };

  const filteredBazars = bazars.filter((b) => (activeFilter === 'all' ? true : b.type === activeFilter));

  return (
    <div className="space-y-6">
      {/* Top Banner & New Bazar button */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-amber-400" />
            বাজার ভাউচার ও খরচ ব্যবস্থাপনা
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            রেগুলার, ফিক্সড, এক্সট্রা ও বড় বাজারের হিসাব আলাদা রাখা হয়।
          </p>
        </div>

        <div className="flex items-center gap-2">
          {currentUser.role === 'admin' && onOpenFixedEventModal && (
            <button
              onClick={onOpenFixedEventModal}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-amber-500/30 transition-all"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              বিশেষ ভোজ শিডিউল
            </button>
          )}

          <button
            onClick={onOpenNewBazarModal}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-amber-500/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            নতুন বাজার এন্ট্রি করুন
          </button>
        </div>
      </div>

      {/* Friday Special Feasts (Fixed Bazar Events) */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          ফিক্সড বাজার / বিশেষ ভোজ ইভেন্ট (SRS সূত্র ৫.১ ও ৫.৩)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {fixedEvents.map((evt) => (
            <div
              key={evt._id}
              className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 relative overflow-hidden"
            >
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-amber-300">{evt.title}</span>
                <span className="text-[11px] font-mono text-slate-400">{evt.date}</span>
              </div>
              <div className="flex items-baseline justify-between pt-1">
                <span className="text-sm font-extrabold text-white">{formatTaka(evt.cost)}</span>
                <span className="text-[11px] text-slate-400">
                  জনপ্রতি: <strong className="text-emerald-400">{formatTaka(evt.perPersonCost)}</strong>
                </span>
              </div>
              <div className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
                উপস্থিত সদস্য ({evt.attendees?.length || 0}):{' '}
                <span className="text-slate-200">
                  {evt.attendees?.map((a: any) => a.name).join(', ') || 'কেউ নেই'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bazar Voucher List */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
        {/* Type Filter tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'all', label: 'সব বাজার' },
            { id: 'regular', label: 'রেগুলার বাজার' },
            { id: 'big', label: 'বড় বাজার' },
            { id: 'extra', label: 'এক্সট্রা বাজার' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeFilter === tab.id
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Voucher Cards */}
        <div className="space-y-3">
          {filteredBazars.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">কোনো বাজার এন্ট্রি পাওয়া যায়নি</p>
          ) : (
            filteredBazars.map((b) => (
              <div
                key={b._id}
                className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{b.description}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                        b.type === 'regular'
                          ? 'bg-blue-500/20 text-blue-300'
                          : b.type === 'big'
                          ? 'bg-purple-500/20 text-purple-300'
                          : 'bg-emerald-500/20 text-emerald-300'
                      }`}
                    >
                      {b.type === 'regular' ? 'রেগুলার' : b.type === 'big' ? 'বড় বাজার' : 'এক্সট্রা'}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        b.status === 'approved'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : b.status === 'rejected'
                          ? 'bg-rose-500/20 text-rose-400'
                          : 'bg-amber-500/20 text-amber-300 animate-pulse'
                      }`}
                    >
                      {b.status === 'approved'
                        ? 'অনুমোদিত'
                        : b.status === 'rejected'
                        ? 'বাতিল'
                        : 'অপেক্ষমান'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    ক্রেতা: <strong className="text-slate-200">{b.userName}</strong> | তারিখ:{' '}
                    <span className="font-mono">{b.date}</span>
                    {b.paidFromBigBazarFund && (
                      <span className="ml-2 text-purple-400 font-medium">
                        (বড় বাজার ফান্ড থেকে পরিশোধিত)
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-center">
                  <span className="text-base font-extrabold font-mono text-amber-400">
                    {formatTaka(b.amount)}
                  </span>

                  {currentUser.role === 'admin' && b.status === 'pending' && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleReview(b._id, 'approved')}
                        disabled={processingId === b._id}
                        className="p-1.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-500 text-white transition-colors"
                        title="অনুমোদন করুন"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleReview(b._id, 'rejected')}
                        disabled={processingId === b._id}
                        className="p-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-500 text-white transition-colors"
                        title="বাতিল করুন"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
