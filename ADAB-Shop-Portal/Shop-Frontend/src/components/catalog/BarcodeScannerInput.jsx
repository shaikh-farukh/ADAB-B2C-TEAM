import React, { useState } from 'react';
import listingService from '../../services/listingService';

export default function BarcodeScannerInput({ value, onChange, onBarcodeMatch }) {
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  const handleLookup = async (codeToLookup) => {
    const code = (codeToLookup || value || '').trim();
    if (!code) return;

    setLoading(true);
    setStatusMessage(null);

    try {
      const res = await listingService.lookupBarcode(code);
      if (res?.found && res?.data) {
        setStatusMessage({
          type: 'success',
          text: `Found in ${res.source === 'MASTER_CATALOG' ? 'Master Catalog' : 'B2B Partner'}: "${res.data.title}" auto-populated!`
        });
        if (onBarcodeMatch) {
          onBarcodeMatch(res.data);
        }
      } else {
        setStatusMessage({
          type: 'info',
          text: 'Barcode not found in catalog. You can enter product details manually.'
        });
      }
    } catch (err) {
      console.error('Barcode lookup error:', err);
      setStatusMessage({
        type: 'error',
        text: 'Error scanning barcode. Please check network or enter manually.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleLookup();
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-gray-700">
        Barcode / EAN Scanning
      </label>
      
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={value || ''}
            onChange={(e) => {
              onChange(e.target.value);
              setStatusMessage(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Scan barcode or type 8-14 digit EAN/UPC..."
            className="w-full px-3 py-2 pl-8 rounded-xl border border-gray-200 bg-white text-xs font-mono font-semibold text-gray-800 outline-none focus:border-brand-dark transition"
          />
          <i className="fa-solid fa-barcode absolute left-2.5 top-2.5 text-gray-400 text-xs"></i>
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                setStatusMessage(null);
              }}
              className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600 text-xs"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => handleLookup()}
          disabled={loading || !value}
          className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0"
        >
          {loading ? (
            <i className="fa-solid fa-spinner fa-spin text-xs"></i>
          ) : (
            <i className="fa-solid fa-magnifying-glass text-xs"></i>
          )}
          <span>Lookup</span>
        </button>
      </div>

      {statusMessage && (
        <div className={`p-2 rounded-xl text-[11px] font-semibold flex items-center gap-2 ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
            : statusMessage.type === 'error'
            ? 'bg-red-50 text-red-800 border border-red-200'
            : 'bg-amber-50 text-amber-800 border border-amber-200'
        }`}>
          <i className={`fa-solid ${
            statusMessage.type === 'success' ? 'fa-circle-check text-emerald-600' :
            statusMessage.type === 'error' ? 'fa-triangle-exclamation text-red-600' :
            'fa-circle-info text-amber-600'
          }`}></i>
          <span>{statusMessage.text}</span>
        </div>
      )}
    </div>
  );
}

