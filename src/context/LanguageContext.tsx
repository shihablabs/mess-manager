'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import enTranslations from '@/locales/en.json';
import bnTranslations from '@/locales/bn.json';

export type Language = 'en' | 'bn';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (path: string, params?: Record<string, string | number>) => string;
  isBangla: boolean;
}

const translations: Record<Language, any> = {
  en: enTranslations,
  bn: bnTranslations,
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Default language is STRICTLY 'en' (English) as specified
  const [language, setLanguageState] = useState<Language>('en');

  // Load persisted language from localStorage on initial client mount
  useEffect(() => {
    try {
      const savedLang = localStorage.getItem('mess_manager_lang');
      if (savedLang === 'bn' || savedLang === 'en') {
        setLanguageState(savedLang);
        document.documentElement.lang = savedLang;
      } else {
        document.documentElement.lang = 'en';
      }
    } catch {
      // localStorage may not be available in private mode or SSR
    }
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('mess_manager_lang', lang);
      document.documentElement.lang = lang;
    } catch {
      // ignore
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === 'en' ? 'bn' : 'en');
  }, [language, setLanguage]);

  // Nested translation helper: t('kpi.liveMealRate') or t('dashboard.welcome')
  const t = useCallback(
    (path: string, params?: Record<string, string | number>): string => {
      const keys = path.split('.');

      // 1. Look in active language dictionary
      let current: any = translations[language];
      for (const key of keys) {
        if (current && typeof current === 'object' && key in current) {
          current = current[key];
        } else {
          current = undefined;
          break;
        }
      }

      // 2. Fallback to English dictionary if not found in current language
      if (current === undefined && language !== 'en') {
        let fallback: any = translations['en'];
        for (const key of keys) {
          if (fallback && typeof fallback === 'object' && key in fallback) {
            fallback = fallback[key];
          } else {
            fallback = undefined;
            break;
          }
        }
        current = fallback;
      }

      // 3. Fallback to the path itself
      if (current === undefined || typeof current !== 'string') {
        return path;
      }

      // 4. Parameter substitution: {name} -> value
      let result = current;
      if (params) {
        Object.entries(params).forEach(([paramKey, paramVal]) => {
          result = result.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal));
        });
      }

      return result;
    },
    [language]
  );

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        t,
        isBangla: language === 'bn',
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
