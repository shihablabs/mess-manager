'use client';

import React, { useState } from 'react';
import { Utensils, CheckCircle, XCircle, Clock, AlertTriangle, Plus, Shield } from 'lucide-react';
import { AppUser } from '@/lib/session';

interface MealsTabProps {
  currentUser: AppUser;
  requests: any[];
  onRefresh: () => void;
  onOpenRequestModal: () => void;
}

export const MealsTab: React.FC<MealsTabProps> = ({
  currentUser,
  requests,
  onRefresh,
  onOpenRequestModal,
}) => {
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleReview = async (id: string, status: 'approved' | 'rejected') => {
    try {
      setProcessingId(id);
      const res = await fetch('/api/meal-requests', {
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

  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const pastRequests = requests.filter((r) => r.status !== 'pending');

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Action */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Utensils className="w-5 h-5 text-indigo-400" />
            মিল ব্যবস্থাপনা ও অফ/অন অনুরোধ
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            সকালের মিল ডেডলাইন: আগের রাত ১০:০০ টা | রাতের মিল ডেডলাইন: বিকাল ৪:০০ টা
          </p>
        </div>

        <button
          onClick={onOpenRequestModal}
          className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-500/25 transition-all"
        >
          <Plus className="w-4 h-4" />
          মিল অফ/অন রিকোয়েস্ট পাঠান
        </button>
      </div>

      {/* Pending Requests for Admin Approval */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            অপেক্ষমান মিল অনুরোধ ({pendingRequests.length})
          </h4>
          {(currentUser.role === 'admin' || currentUser.role === 'super_admin') && (
            <span className="text-[11px] bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Shield className="w-3 h-3" /> এডমিন / ম্যানেজার সিদ্ধান্ত দিন
            </span>
          )}
        </div>

        {pendingRequests.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            বর্তমানে কোনো অপেক্ষমান মিল অনুরোধ নেই।
          </div>
        ) : (
          <div className="space-y-3">
            {pendingRequests.map((req) => (
              <div
                key={req._id}
                className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200 text-sm">
                      {req.userName}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        req.action === 'off'
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'bg-emerald-500/20 text-emerald-300'
                      }`}
                    >
                      {req.action === 'off' ? 'মিল অফ (Off)' : 'মিল চালু (On)'}
                    </span>
                    {req.isLate && (
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Late রিকোয়েস্ট
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">
                    তারিখ: <strong className="text-slate-300">{req.date}</strong> | স্লট:{' '}
                    <strong className="text-slate-300">{req.slotName}</strong>
                    {req.reason && <span> — &quot;{req.reason}&quot;</span>}
                  </p>
                </div>

                {(currentUser.role === 'admin' || currentUser.role === 'super_admin') ? (
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => handleReview(req._id, 'approved')}
                      disabled={processingId === req._id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition-all"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      অনুমোদন
                    </button>
                    <button
                      onClick={() => handleReview(req._id, 'rejected')}
                      disabled={processingId === req._id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-500 text-white text-xs font-semibold shadow transition-all"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      বাতিল
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                    Admin অনুমোদনের অপেক্ষায়
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past Requests History */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-3">
        <h4 className="text-sm font-bold text-white">অনুরোধের ইতিহাস ({pastRequests.length})</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                <th className="py-2">সদস্য</th>
                <th className="py-2">তারিখ</th>
                <th className="py-2">স্লট</th>
                <th className="py-2">অনুরোধ</th>
                <th className="py-2 text-right">অবস্থা</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {pastRequests.map((r) => (
                <tr key={r._id} className="text-slate-300">
                  <td className="py-2.5">{r.userName}</td>
                  <td className="py-2.5 font-mono">{r.date}</td>
                  <td className="py-2.5">{r.slotName}</td>
                  <td className="py-2.5">{r.action === 'off' ? 'অফ' : 'অন'}</td>
                  <td className="py-2.5 text-right">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        r.status === 'approved'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {r.status === 'approved' ? 'অনুমোদিত' : 'বাতিল'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
