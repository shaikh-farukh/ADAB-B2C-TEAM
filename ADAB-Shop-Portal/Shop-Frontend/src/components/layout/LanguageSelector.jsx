import React, { useState, useRef, useEffect } from 'react';
import { useTranslation, LANGUAGES } from '../../context/LanguageContext';

export default function LanguageSelector({ className = '' }) {
  const { language, setLanguage, t, currentLanguageMeta } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close when clicked outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectLanguage = (code) => {
    setLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        id="btnLanguageToggle"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-xs sm:text-sm font-bold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-2xs transition-all cursor-pointer select-none"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={t('selectLanguage', 'Select Language')}
        title={`${t('language', 'Language')}: ${currentLanguageMeta.nativeLabel}`}
      >
        <i className="fa-solid fa-globe text-green-700 text-xs sm:text-sm"></i>
        <span className="font-extrabold uppercase tracking-wide">{currentLanguageMeta.short}</span>
        <i
          className={`fa-solid fa-chevron-down text-[9px] text-gray-400 transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
        ></i>
      </button>

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div
          id="langMenu"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="btnLanguageToggle"
          className="absolute right-0 top-full mt-1.5 w-48 rounded-xl bg-white border border-gray-200 shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100 divide-y divide-gray-100"
        >
          <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            {t('selectLanguage', 'Select Language')}
          </div>
          <div className="py-1">
            {LANGUAGES.map((langItem) => {
              const isSelected = language === langItem.code;
              return (
                <button
                  key={langItem.code}
                  type="button"
                  id={`lang-${langItem.code}`}
                  role="menuitem"
                  onClick={() => handleSelectLanguage(langItem.code)}
                  className={`w-full text-left px-3.5 py-2.5 text-xs sm:text-sm font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50 text-emerald-800 font-bold'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 font-mono text-gray-600 font-bold">
                      {langItem.short}
                    </span>
                    <span className="text-gray-900 font-medium">{langItem.nativeLabel}</span>
                  </div>
                  {isSelected && (
                    <i className="fa-solid fa-check text-emerald-600 text-xs"></i>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
