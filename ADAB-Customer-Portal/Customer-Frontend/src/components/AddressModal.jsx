import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CustomerAPI } from '../services/api';
import { lookupPincode, getOfflinePincodeHint } from '../utils/pincode';

const COUNTRY_CODES = [
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+971', country: 'UAE', flag: '🇦🇪' },
  { code: '+966', country: 'Saudi Arabia', flag: '🇸🇦' },
  { code: '+1', country: 'USA / Canada', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+65', country: 'Singapore', flag: '🇸🇬' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' }
];

const parsePhone = (rawPhone = '') => {
  if (!rawPhone) return { countryCode: '+91', phoneDigits: '' };
  const cleaned = String(rawPhone).trim();
  const prefixes = ['+971', '+966', '+91', '+65', '+61', '+44', '+1'];
  for (const p of prefixes) {
    if (cleaned.startsWith(p)) {
      return {
        countryCode: p,
        phoneDigits: cleaned.slice(p.length).replace(/\D/g, '').slice(0, 10)
      };
    }
  }
  const digits = cleaned.replace(/\D/g, '');
  if (digits.length > 10 && digits.startsWith('91')) {
    return { countryCode: '+91', phoneDigits: digits.slice(2, 12) };
  }
  return { countryCode: '+91', phoneDigits: digits.slice(-10) };
};

/**
 * Universal Delivery Address Selector & Management Modal
 * Rendered directly onto document.body via createPortal to guarantee 100% full-screen blur coverage with zero edge leaks.
 */
export default function AddressModal({
  isOpen,
  onClose,
  selectedAddressId,
  onSelectAddress,
  initialView = 'list'
}) {
  const [modalView, setModalView] = useState(initialView); // 'list' | 'add' | 'edit'
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressModalError, setAddressModalError] = useState(null);

  // Pincode auto-detection state
  const [isDetectingPin, setIsDetectingPin] = useState(false);
  const [pinHint, setPinHint] = useState('');

  // Phone number state with country code and 10-digit constraint
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneDigits, setPhoneDigits] = useState('9876512340');

  const [addressForm, setAddressForm] = useState({
    id: null,
    label: 'Home',
    recipient_name: 'Pooja Sharma',
    address_line: '',
    landmark: '',
    city: 'Surat',
    state: 'Gujarat',
    pincode: '395002',
    is_default: false
  });

  // Load addresses whenever modal is opened
  useEffect(() => {
    if (isOpen) {
      loadAddresses();
      setModalView(initialView || 'list');
      setAddressModalError(null);
      setPinHint('');
    }
  }, [isOpen, initialView]);

  const loadAddresses = async () => {
    try {
      setLoadingAddresses(true);
      const res = await CustomerAPI.getAddresses();
      if (res && res.status === 'success' && Array.isArray(res.data)) {
        setSavedAddresses(res.data);
      } else {
        setSavedAddresses([]);
      }
    } catch (err) {
      console.warn('Error loading addresses:', err.message);
      setSavedAddresses([]);
    } finally {
      setLoadingAddresses(false);
    }
  };

  const handlePincodeChange = async (rawVal) => {
    const val = rawVal.replace(/\D/g, '').slice(0, 6);
    setAddressForm((prev) => ({ ...prev, pincode: val }));
    setAddressModalError(null);

    if (val.length === 6) {
      // Instant offline hint for immediate UI responsiveness
      const offline = getOfflinePincodeHint(val);
      if (offline) {
        setAddressForm((prev) => ({
          ...prev,
          city: offline.city,
          state: offline.state
        }));
        setPinHint(`✓ Detected ${offline.city}, ${offline.state}`);
      }

      setIsDetectingPin(true);
      try {
        const detected = await lookupPincode(val);
        if (detected) {
          setAddressForm((prev) => ({
            ...prev,
            city: detected.city || prev.city,
            state: detected.state || prev.state
          }));
          setPinHint(`✓ Auto-detected: ${detected.city}, ${detected.state}`);
        } else if (!offline) {
          setPinHint('Pincode saved. Please confirm city & state below.');
        }
      } catch (err) {
        console.debug('Pincode detection error:', err);
      } finally {
        setIsDetectingPin(false);
      }
    } else {
      setPinHint('');
    }
  };

  if (!isOpen) return null;

  const handleOpenAdd = () => {
    setCountryCode('+91');
    setPhoneDigits('');
    setAddressForm({
      id: null,
      label: 'Home',
      recipient_name: 'Pooja Sharma',
      address_line: '',
      landmark: '',
      city: '',
      state: 'Gujarat',
      pincode: '',
      is_default: savedAddresses.length === 0
    });
    setPinHint('');
    setAddressModalError(null);
    setModalView('add');
  };

  const handleOpenEdit = (addrToEdit) => {
    const parsed = parsePhone(addrToEdit.phone || '');
    setCountryCode(parsed.countryCode);
    setPhoneDigits(parsed.phoneDigits);
    setAddressForm({
      id: addrToEdit.id,
      label: addrToEdit.label || addrToEdit.type || 'Home',
      recipient_name: addrToEdit.recipient_name || addrToEdit.full_name || '',
      address_line: addrToEdit.address_line || addrToEdit.address || '',
      landmark: addrToEdit.landmark || '',
      city: addrToEdit.city || 'Surat',
      state: addrToEdit.state || 'Gujarat',
      pincode: addrToEdit.pincode || addrToEdit.zip || '395002',
      is_default: !!addrToEdit.is_default
    });
    setPinHint('');
    setAddressModalError(null);
    setModalView('edit');
  };

  const handleSaveSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!addressForm.recipient_name.trim() || !phoneDigits.trim() || !addressForm.address_line.trim()) {
      setAddressModalError('Please provide contact name, mobile number, and street address.');
      return;
    }

    if (phoneDigits.length !== 10) {
      setAddressModalError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setSavingAddress(true);
    setAddressModalError(null);
    const fullPhone = `${countryCode} ${phoneDigits}`;
    const payload = {
      ...addressForm,
      phone: fullPhone
    };

    try {
      let savedRecord = null;
      if (modalView === 'edit' && addressForm.id) {
        const res = await CustomerAPI.updateAddress(addressForm.id, payload);
        savedRecord = res.data;
      } else {
        const res = await CustomerAPI.addAddress(payload);
        savedRecord = res.data;
      }

      const freshRes = await CustomerAPI.getAddresses();
      if (freshRes && freshRes.status === 'success' && Array.isArray(freshRes.data)) {
        setSavedAddresses(freshRes.data);
        const newlySelected = savedRecord
          ? freshRes.data.find((a) => a.id === savedRecord.id)
          : freshRes.data[0];
        if (newlySelected && onSelectAddress) {
          onSelectAddress(newlySelected);
        }
      }

      setModalView('list');
      onClose();
    } catch (err) {
      setAddressModalError(err.message || 'Failed to save address.');
    } finally {
      setSavingAddress(false);
    }
  };

  const renderBadge = (label = 'Home') => {
    const l = (label || '').toLowerCase();
    if (l === 'work' || l === 'office') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-700 border border-blue-200 inline-flex items-center gap-1">
          <i className="fa-solid fa-briefcase text-[9px]"></i>
          <span>Work</span>
        </span>
      );
    }
    if (l === 'other') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-700 border border-purple-200 inline-flex items-center gap-1">
          <i className="fa-solid fa-location-dot text-[9px]"></i>
          <span>Other</span>
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
        <i className="fa-solid fa-house text-[9px]"></i>
        <span>Home</span>
      </span>
    );
  };

  const modalContent = (
    <div
      id="addressSelectorModal"
      className="fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-screen z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 99999,
        backgroundColor: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)'
      }}
      onClick={onClose}
    >
      {/* Modal Card */}
      <div
        className="relative bg-white w-full max-w-lg rounded-t-[32px] sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col z-10 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className="px-5 pt-2 sm:pt-4 pb-3 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            {modalView !== 'list' && savedAddresses.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setAddressModalError(null);
                  setModalView('list');
                }}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-600 hover:text-black -ml-1.5 cursor-pointer"
              >
                <i className="fa-solid fa-arrow-left text-sm"></i>
              </button>
            )}
            <div>
              <h3 className="font-extrabold text-base text-gray-900 leading-tight">
                {modalView === 'list'
                  ? 'Select Delivery Address'
                  : modalView === 'edit'
                  ? 'Edit Delivery Address'
                  : 'Add New Delivery Address'}
              </h3>
              <p className="text-[11px] text-gray-500 font-medium">
                {modalView === 'list'
                  ? 'Choose an address for your order & fast delivery'
                  : 'Enter accurate destination details for fast delivery'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 transition cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-3.5 hide-scroll flex-1">
          {addressModalError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
              <i className="fa-solid fa-circle-exclamation shrink-0"></i>
              <span>{addressModalError}</span>
            </div>
          )}

          {/* View 1: Saved Addresses List */}
          {modalView === 'list' && (
            <div className="space-y-3">
              {loadingAddresses ? (
                <div className="p-8 text-center text-gray-400 space-y-2">
                  <i className="fa-solid fa-spinner fa-spin text-2xl text-emerald-600"></i>
                  <div className="text-xs font-bold text-gray-600">Loading saved addresses...</div>
                </div>
              ) : savedAddresses.length === 0 ? (
                <div className="p-6 text-center text-gray-500 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center text-xl mx-auto">
                    <i className="fa-solid fa-location-dot"></i>
                  </div>
                  <div className="text-xs font-bold text-gray-700">No saved addresses found.</div>
                  <p className="text-[11px] text-gray-500">
                    Add a delivery address to get 14–45 min delivery from local stores.
                  </p>
                </div>
              ) : (
                savedAddresses.map((sa) => {
                  const isSelected = selectedAddressId === sa.id;
                  return (
                    <div
                      key={sa.id}
                      onClick={() => {
                        if (onSelectAddress) onSelectAddress(sa);
                        onClose();
                      }}
                      className={`p-4 rounded-2xl border-2 transition cursor-pointer relative group ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/50 shadow-xs'
                          : 'border-gray-200 bg-white hover:border-emerald-300 hover:bg-gray-50/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          {renderBadge(sa.label)}
                          {sa.is_default && (
                            <span className="text-[9px] font-extrabold bg-gray-900 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                              Default
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEdit(sa);
                            }}
                            className="text-[11px] font-bold text-gray-500 hover:text-black cursor-pointer px-2 py-0.5 rounded hover:bg-gray-100"
                          >
                            <i className="fa-solid fa-pen-to-square mr-1"></i>Edit
                          </button>
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center transition ${
                              isSelected
                                ? 'bg-emerald-600 text-white'
                                : 'border-2 border-gray-300'
                            }`}
                          >
                            {isSelected && <i className="fa-solid fa-check text-[10px]"></i>}
                          </div>
                        </div>
                      </div>

                      <div className="text-xs font-extrabold text-gray-900 mb-0.5">
                        {sa.recipient_name || sa.full_name || 'Customer'}
                        <span className="ml-2 font-normal text-gray-500 text-[11px]">
                          {sa.phone}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 leading-snug">
                        {sa.address_line || sa.address}
                        {sa.landmark && `, near ${sa.landmark}`}
                      </div>
                      <div className="text-[11px] font-bold text-gray-700 mt-1">
                        {sa.city || 'Surat'}, {sa.state || 'Gujarat'} — {sa.pincode || sa.zip || '395002'}
                      </div>
                    </div>
                  );
                })
              )}

              {/* Add New Address Button */}
              <button
                type="button"
                onClick={handleOpenAdd}
                className="w-full py-3.5 border-2 border-dashed border-emerald-400 bg-emerald-50/40 hover:bg-emerald-50 rounded-2xl text-emerald-800 text-xs font-extrabold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <i className="fa-solid fa-plus text-sm"></i>
                <span>Add New Delivery Address</span>
              </button>
            </div>
          )}

          {/* View 2: Add or Edit Address Form */}
          {(modalView === 'add' || modalView === 'edit') && (
            <form onSubmit={handleSaveSubmit} className="space-y-3.5">
              {/* Address Label Selector */}
              <div>
                <label className="block text-[11px] font-extrabold text-gray-700 uppercase tracking-wider mb-1.5">
                  Save Address As
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['Home', 'Work', 'Other'].map((lbl) => {
                    const isPicked = addressForm.label === lbl;
                    const icon =
                      lbl === 'Home'
                        ? 'fa-house'
                        : lbl === 'Work'
                        ? 'fa-briefcase'
                        : 'fa-location-dot';
                    return (
                      <button
                        type="button"
                        key={lbl}
                        onClick={() => setAddressForm({ ...addressForm, label: lbl })}
                        className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition cursor-pointer ${
                          isPicked
                            ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <i className={`fa-solid ${icon} text-[10px]`}></i>
                        <span>{lbl}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Recipient Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    Contact Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={addressForm.recipient_name}
                    onChange={(e) =>
                      setAddressForm({ ...addressForm, recipient_name: e.target.value })
                    }
                    placeholder="e.g. Pooja Sharma"
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    Phone Number *
                  </label>
                  <div className="flex items-center rounded-xl border border-gray-200 focus-within:border-emerald-600 focus-within:ring-1 focus-within:ring-emerald-600 overflow-hidden bg-white shadow-2xs">
                    {/* Country Code Dropdown */}
                    <div className="relative border-r border-gray-200 bg-gray-50 flex items-center shrink-0">
                      <select
                        id="countryCodeSelect"
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="appearance-none bg-transparent pl-2.5 pr-6 py-2 text-xs font-extrabold text-gray-800 outline-none cursor-pointer"
                        aria-label="Country Code"
                      >
                        {COUNTRY_CODES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.flag} {c.code}
                          </option>
                        ))}
                      </select>
                      <i className="fa-solid fa-chevron-down absolute right-2 text-[9px] text-gray-400 pointer-events-none"></i>
                    </div>

                    {/* 10-Digit Mobile Number Input */}
                    <input
                      type="tel"
                      id="phoneNumberInput"
                      inputMode="numeric"
                      required
                      maxLength={10}
                      value={phoneDigits}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setPhoneDigits(val);
                        setAddressModalError(null);
                      }}
                      placeholder="9876512340"
                      className="flex-1 px-3 py-2 text-xs text-gray-900 font-medium outline-none border-none tracking-wide"
                    />
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5 flex justify-between">
                    <span>10-digit mobile number</span>
                    <span className={phoneDigits.length === 10 ? 'text-emerald-700 font-bold' : ''}>
                      {phoneDigits.length}/10
                    </span>
                  </div>
                </div>
              </div>

              {/* Complete Street Address */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Flat / House No. / Building / Street *
                </label>
                <textarea
                  required
                  rows={2}
                  value={addressForm.address_line}
                  onChange={(e) =>
                    setAddressForm({ ...addressForm, address_line: e.target.value })
                  }
                  placeholder="e.g. Flat 402, Green Valley Apt, Ring Road"
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-emerald-600 focus:outline-none resize-none"
                />
              </div>

              {/* Landmark */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Landmark (Optional)
                </label>
                <input
                  type="text"
                  value={addressForm.landmark}
                  onChange={(e) =>
                    setAddressForm({ ...addressForm, landmark: e.target.value })
                  }
                  placeholder="e.g. Near Textile Market / Opp. Central Bank"
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-emerald-600 focus:outline-none"
                />
              </div>

              {/* Pincode with Auto-detection */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1 flex items-center justify-between">
                  <span>Pincode *</span>
                  {isDetectingPin && (
                    <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                      <i className="fa-solid fa-spinner fa-spin text-[9px]"></i> Detecting City & State...
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={addressForm.pincode}
                    onChange={(e) => handlePincodeChange(e.target.value)}
                    placeholder="e.g. 380051 or 395002"
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-emerald-600 focus:outline-none font-mono"
                  />
                  {addressForm.pincode.length === 6 && !isDetectingPin && (
                    <i className="fa-solid fa-circle-check text-emerald-600 absolute right-3 top-2.5 text-xs"></i>
                  )}
                </div>
                {pinHint && (
                  <p className="text-[10px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                    <i className="fa-solid fa-location-dot text-[9px]"></i> {pinHint}
                  </p>
                )}
              </div>

              {/* City & State (Auto-populated from Pincode) */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={addressForm.city}
                    onChange={(e) =>
                      setAddressForm({ ...addressForm, city: e.target.value })
                    }
                    placeholder="e.g. Ahmedabad / Surat"
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    State *
                  </label>
                  <input
                    type="text"
                    required
                    value={addressForm.state}
                    onChange={(e) =>
                      setAddressForm({ ...addressForm, state: e.target.value })
                    }
                    placeholder="e.g. Gujarat"
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Set as Default Toggle */}
              <label className="flex items-center gap-2.5 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addressForm.is_default}
                  onChange={(e) =>
                    setAddressForm({ ...addressForm, is_default: e.target.checked })
                  }
                  className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                />
                <span className="text-xs font-semibold text-gray-700">
                  Set as default delivery address
                </span>
              </label>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={savingAddress}
                  className="flex-1 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:bg-gray-400"
                >
                  {savingAddress ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i>
                      <span>Saving Address...</span>
                    </>
                  ) : (
                    <span>
                      {modalView === 'edit' ? 'Update & Deliver Here' : 'Save & Deliver Here'}
                    </span>
                  )}
                </button>
                {savedAddresses.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setAddressModalError(null);
                      setModalView('list');
                    }}
                    className="px-4 py-3 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
}
