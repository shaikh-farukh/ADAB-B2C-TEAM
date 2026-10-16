import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations } from '../i18n/translations';

export const LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English', short: 'EN' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', short: 'HI' },
  { code: 'gu', label: 'Gujarati', nativeLabel: 'ગુજરાતી', short: 'GU' }
];

const DEFAULT_LANG = 'en';

const fallbackTranslate = (key, fallbackOrParams, params) => {
  let fallback = typeof fallbackOrParams === 'string' ? fallbackOrParams : key;
  let interpolations = typeof fallbackOrParams === 'object' ? fallbackOrParams : params || {};
  let text = translations[DEFAULT_LANG]?.[key] !== undefined ? translations[DEFAULT_LANG][key] : fallback;
  if (interpolations && typeof text === 'string') {
    Object.keys(interpolations).forEach((param) => {
      text = text.replace(new RegExp(`\\{${param}\\}`, 'g'), interpolations[param]);
    });
  }
  return text;
};

const LanguageContext = createContext({
  language: DEFAULT_LANG,
  setLanguage: () => {},
  t: fallbackTranslate,
  languages: LANGUAGES,
  currentLanguageMeta: LANGUAGES[0]
});

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      const stored = localStorage.getItem('adabLang');
      if (stored && ['en', 'hi', 'gu'].includes(stored)) {
        return stored;
      }
    } catch (e) {
      // localStorage may fail in restricted/private contexts
    }
    return DEFAULT_LANG;
  });

  const setLanguage = useCallback((newLang) => {
    const validLang = ['en', 'hi', 'gu'].includes(newLang) ? newLang : DEFAULT_LANG;
    setLanguageState(validLang);
    try {
      localStorage.setItem('adabLang', validLang);
      if (typeof document !== 'undefined') {
        document.documentElement.lang = validLang;
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('adab-language-changed', { detail: validLang }));
      }
    } catch (e) {
      console.warn('Failed to persist language preference:', e);
    }
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }

    const handleStorage = (e) => {
      if (e.key === 'adabLang' && e.newValue && ['en', 'hi', 'gu'].includes(e.newValue)) {
        setLanguageState(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [language]);

  const t = useCallback((key, fallbackOrParams, params) => {
    let fallback = typeof fallbackOrParams === 'string' ? fallbackOrParams : key;
    let interpolations = typeof fallbackOrParams === 'object' && fallbackOrParams !== null ? fallbackOrParams : params || {};

    const langDict = translations[language] || translations[DEFAULT_LANG];
    let val = langDict?.[key];
    if (val === undefined) {
      val = translations[DEFAULT_LANG]?.[key] !== undefined ? translations[DEFAULT_LANG][key] : fallback;
    }

    if (interpolations && typeof val === 'string') {
      Object.keys(interpolations).forEach((param) => {
        val = val.replace(new RegExp(`\\{${param}\\}`, 'g'), interpolations[param]);
      });
    }

    return val !== undefined ? val : key;
  }, [language]);

  const currentLanguageMeta = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  const value = {
    language,
    setLanguage,
    t,
    languages: LANGUAGES,
    currentLanguageMeta
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

// Alias commonly preferred in React i18n
export function useTranslation() {
  return useContext(LanguageContext);
}

export default LanguageContext;
