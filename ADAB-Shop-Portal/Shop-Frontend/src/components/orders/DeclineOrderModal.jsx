import React, { useState } from 'react';
import { useTranslation } from '../../context/LanguageContext';

export default function DeclineOrderModal({ order, onClose, onConfirm }) {
  if (!order) return null;
  const { t } = useTranslation();
  const reasons = [
    { id: 'stock', label: t('reasonOutOfStock', 'Item(s) Out of Stock'), icon: 'fa-box-open' },
    { id: 'busy', label: t('reasonStoreBusy', 'Store is Closing / Too Busy'), icon: 'fa-clock' },
    { id: 'distance', label: t('reasonOutsideReach', 'Delivery Address Outside Reach'), icon: 'fa-route' },
    { id: 'customer', label: t('reasonCustomerRequested', 'Customer Requested Cancellation'), icon: 'fa-user-xmark' },
    { id: 'pricing', label: t('reasonPriceMismatch', 'Price / Catalog Mismatch'), icon: 'fa-tag' }
  ];

  const [selectedReason, setSelectedReason] = useState(reasons[0].label);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const displayId = order.id ? (order.id.toString().startsWith('#') ? order.id : `#${order.id}`) : '—';
  const displayCustomer = order.customer || order.customer_name || t('colCustomer', 'Customer');

  const handleDecline = async () => {
    setSubmitting(true);
    await onConfirm(order.id, selectedReason, note);
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-rose-50 to-orange-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center text-sm font-bold shadow-2xs">
              <i className="fa-solid fa-ban"></i>
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-gray-900">{t('declineModalTitle', 'Decline Order • {id}', { id: displayId })}</h3>
              <p className="text-[11px] text-gray-500">{t('orderModalCustomer', 'Customer: ')}<span className="font-semibold text-gray-700">{displayCustomer}</span></p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white hover:bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center text-sm font-bold shadow-2xs cursor-pointer"
            title={t('orderModalClose', 'Close')}
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3.5">
          <p className="text-xs font-semibold text-gray-700">{t('declineModalPrompt', 'Please choose a reason for declining this order:')}</p>
          <div className="space-y-2">
            {reasons.map((r) => (
              <label 
                key={r.id} 
                onClick={() => setSelectedReason(r.label)}
                className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${selectedReason === r.label ? 'border-rose-300 bg-rose-50/60 text-rose-900 font-bold' : 'border-gray-200 hover:bg-gray-50 text-gray-700'}`}
              >
                <span className="flex items-center gap-2">
                  <i className={`fa-solid ${r.icon} text-gray-400 w-4 text-center ${selectedReason === r.label ? 'text-rose-600' : ''}`}></i>
                  <span>{r.label}</span>
                </span>
                <input 
                  type="radio" 
                  name="decline_reason" 
                  checked={selectedReason === r.label} 
                  onChange={() => setSelectedReason(r.label)}
                  className="accent-rose-600 cursor-pointer"
                />
              </label>
            ))}
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-600 mb-1">{t('declineInternalNote', 'Internal Note (Optional):')}</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('declineNotePlaceholder', 'e.g., ran out of inventory')}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-rose-400 outline-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="btn-soft !py-1.5 !px-3 !text-xs font-bold cursor-pointer"
          >
            {t('declineBtnKeepOrder', 'Keep Order')}
          </button>
          <button
            type="button"
            onClick={handleDecline}
            disabled={submitting}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            <i className="fa-solid fa-ban text-xs"></i>
            {submitting ? t('declineBtnDeclining', 'Declining...') : t('declineBtnConfirm', 'Confirm Decline')}
          </button>
        </div>
      </div>
    </div>
  );
}
