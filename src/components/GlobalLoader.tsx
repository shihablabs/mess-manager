'use client';

import React from 'react';
import { Building2, Sparkles } from '@/components/icons';

interface GlobalLoaderProps {
  message?: string;
  subMessage?: string;
  fullScreen?: boolean;
}

export const GlobalLoader: React.FC<GlobalLoaderProps> = ({
  message = 'লোড হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...',
  subMessage = 'Developer Zone • স্মার্ট মেস ম্যানেজার',
  fullScreen = true,
}) => {
  const content = (
    <div className="flex flex-col items-center justify-center p-8 text-center space-y-5">
      {/* Animated Glowing Dual Rings with Brand Icon */}
      <div className="relative flex items-center justify-center">
        {/* Outer pulsing ring */}
        <div className="absolute w-20 h-20 rounded-full border-2 border-indigo-500/20 animate-ping opacity-60" />
        
        {/* Spinning gradient ring */}
        <div className="w-16 h-16 rounded-full border-3 border-transparent border-t-indigo-500 border-r-purple-500 border-b-emerald-400 animate-spin" />
        
        {/* Inner brand emblem */}
        <div className="absolute w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-indigo-500/30 animate-pulse">
          <Building2 className="w-5 h-5 text-white" />
        </div>
      </div>

      {/* Text Info */}
      <div className="space-y-1.5 max-w-xs">
        <h3 className="text-sm font-bold text-white flex items-center justify-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
          {message}
        </h3>
        {subMessage && (
          <p className="text-[11px] text-slate-400 tracking-wide font-medium">
            {subMessage}
          </p>
        )}
      </div>

      {/* Micro progress indicator */}
      <div className="w-48 h-1 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
        <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 rounded-full animate-pulse w-full" />
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 z-50">
        {content}
      </div>
    );
  }

  return content;
};
