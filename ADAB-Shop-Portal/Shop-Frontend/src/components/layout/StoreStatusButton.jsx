import React, { useState } from 'react';
import { useSeller } from '../../context/SellerContext';
import { useTranslation } from '../../context/LanguageContext';

export default function StoreStatusButton({ className = '' }) {
  const { storeTiming, toggleStoreOnline } = useSeller();
  const { t } = useTranslation();
  const [toggling, setToggling] = useState(false);

  const handleToggle = async () => {
    try {
      setToggling(true);
      await toggleStoreOnline();
    } catch (e) {
      console.error('Failed to toggle store online status:', e);
    } finally {
      setToggling(false);
    }
  };

  const isOpen = Boolean(storeTiming?.isOpen);
  const statusLabel = isOpen ? t('storeOpen', 'Store: Open') : t('storeClosed', 'Store: Closed');
  const tooltipPrefix = isOpen 
    ? t('storeOpenTooltip', 'Store is open for orders • Operating hours:') 
    : t('storeClosedTooltip', 'Store is closed • Operating hours:');
  const tooltip = `${tooltipPrefix} ${storeTiming?.hoursLabel || ''} • ${t('toggleStatusPrompt', 'Click to change store open/closed status')}`;

  return (
    <button
      type="button"
      disabled={toggling}
      onClick={handleToggle}
      className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs sm:text-sm font-bold border transition-all cursor-pointer shadow-2xs select-none disabled:opacity-60 disabled:cursor-not-allowed ${storeTiming?.badgeClass || 'bg-green-50 text-green-800 border-green-200'} ${className}`}
      title={tooltip}
      aria-label={t('toggleStatusPrompt', 'Toggle store status')}
    >
      {toggling ? (
        <i className="fa-solid fa-spinner fa-spin text-xs"></i>
      ) : (
        <span className={`w-2 h-2 rounded-full ${storeTiming?.dotClass || 'bg-green-500 animate-pulse'}`}></span>
      )}
      <span>{statusLabel}</span>
    </button>
  );
}
