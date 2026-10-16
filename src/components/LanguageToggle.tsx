'use client';

import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { Globe } from 'lucide-react';

interface LanguageToggleProps {
  className?: string;
}

export const LanguageToggle: React.FC<LanguageToggleProps> = ({ className = '' }) => {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      className={`inline-flex items-center bg-slate-900/90 border border-slate-700/80 rounded-xl p-0.5 shadow-sm text-xs font-semibold ${className}`}
      role="group"
      aria-label="Language selector"
    >
      <div className="pl-1.5 pr-0.5 text-slate-400">
        <Globe className="w-3.5 h-3.5" />
      </div>
      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
          language === 'en'
            ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30'
            : 'text-slate-400 hover:text-slate-200'
        }`}
        title="Switch to English"
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLanguage('bn')}
        className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
          language === 'bn'
            ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30'
            : 'text-slate-400 hover:text-slate-200'
        }`}
        title="বাংলা ভাষায় পরিবর্তন করুন"
      >
        BN
      </button>
    </div>
  );
};
