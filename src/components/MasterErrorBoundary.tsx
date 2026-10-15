'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from '@/components/icons';
import Link from 'next/link';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class MasterErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('MasterErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full my-4 p-6 sm:p-8 rounded-2xl bg-slate-900/90 border border-rose-500/30 text-slate-100 shadow-2xl shadow-rose-950/40">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0 shadow-lg shadow-rose-500/10">
              <ShieldAlert className="w-7 h-7" />
            </div>

            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                <AlertTriangle className="w-3 h-3 text-rose-400" />
                <span>মডিউল রিকভারি সক্রিয়</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white">
                {this.props.fallbackTitle || 'এই মডিউলে একটি অপ্রত্যাশিত সমস্যা হয়েছে'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                {this.props.fallbackMessage ||
                  'সিস্টেমটি ক্র্যাশ হওয়া রোধ করা হয়েছে। আপনি নিচের বাটনে ক্লিক করে এটি পুনরায় লোড করতে পারেন।'}
              </p>
              {this.state.error?.message && (
                <div className="mt-2 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-rose-300 break-all select-all">
                  ত্রুটি কোড: {this.state.error.message}
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-2.5">
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>পুনরায় চেষ্টা করুন</span>
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>পুরো পেজ রিলোড</span>
            </button>
            <Link
              href="/"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-900 text-slate-300 border border-slate-800 font-semibold text-xs transition-all"
            >
              <Home className="w-3.5 h-3.5" />
              <span>হোম পেজ</span>
            </Link>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
