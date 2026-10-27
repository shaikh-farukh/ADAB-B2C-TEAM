import React, { useState, useEffect } from 'react';
import { useSeller } from '../context/SellerContext';
import { useTranslation } from '../context/LanguageContext';
import sellerService from '../services/sellerService';
import { playNotificationChime } from '../utils/audioAlert';

export default function SettingsPage() {
  const { profile, store, refreshSellerData } = useSeller();
  const { t, language, setLanguage, languages } = useTranslation();

  // 1. Store Profile & Contact
  const [storeName, setStoreName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState('Grocery & General');
  const [savingProfile, setSavingProfile] = useState(false);

  // 2. Operations & Timing
  const [isOnline, setIsOnline] = useState(true);
  const [openTime, setOpenTime] = useState('08:00');
  const [closeTime, setCloseTime] = useState('22:00');
  const [deliveryRadius, setDeliveryRadius] = useState(10);
  const [savingOps, setSavingOps] = useState(false);

  // 3. Hardware & POS Thermal Printer
  const [paperSize, setPaperSize] = useState(() => {
    return localStorage.getItem('adab_pos_paper_size') || '58mm';
  });
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('adab_sound_enabled') !== 'false';
  });
  const [notifOrders, setNotifOrders] = useState(true);
  const [notifStock, setNotifStock] = useState(true);
  const [notifSettlements, setNotifSettlements] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Feedback banner
  const [feedback, setFeedback] = useState(null);

  const showToast = (message, type = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  useEffect(() => {
    if (store || profile) {
      setStoreName(store?.store_name || '');
      setOwnerName(profile?.legal_name || profile?.full_name || '');
      setPhone(store?.phone || profile?.phone || '');
      setAddress(store?.address_line || '');
      setCategory(store?.category || 'Grocery & General');
      setIsOnline(store?.is_online !== false);
      setOpenTime(store?.open_time || '08:00');
      setCloseTime(store?.close_time || '22:00');
      setDeliveryRadius(Number(store?.delivery_radius_km) || 10);
    }
  }, [store, profile]);

  // Load live settings from backend
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await sellerService.getSettings();
        const data = res?.data || res;
        if (data) {
          if (data.soundbox_enabled !== undefined) {
            setSoundEnabled(Boolean(data.soundbox_enabled));
          }
          if (data.open_time) setOpenTime(data.open_time);
          if (data.close_time) setCloseTime(data.close_time);
          if (data.delivery_radius_km) setDeliveryRadius(Number(data.delivery_radius_km));
          if (data.is_online !== undefined) setIsOnline(Boolean(data.is_online));
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    }
    loadSettings();
  }, []);

  // Save Store Profile
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await sellerService.updateStore({
        store_name: storeName,
        phone,
        address_line: address,
        category
      });
      if (ownerName) {
        await sellerService.updateProfile({
          legal_name: ownerName
        });
      }
      if (refreshSellerData) {
        await refreshSellerData(true);
      }
      showToast(t('profileSavedSuccess', 'Store profile updated in database successfully!'));
    } catch (err) {
      console.error('Failed to update profile:', err);
      showToast(err.response?.data?.error || err.message || 'Failed to update profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  // Save Operations & Timings
  const handleSaveOperations = async (e) => {
    e.preventDefault();
    setSavingOps(true);
    try {
      await sellerService.updateSettings({
        is_online: isOnline,
        open_time: openTime,
        close_time: closeTime,
        delivery_radius_km: Number(deliveryRadius)
      });
      if (refreshSellerData) {
        await refreshSellerData(true);
      }
      showToast(t('operationsSavedSuccess', 'Store operational timings updated successfully!'));
    } catch (err) {
      console.error('Failed to update operations:', err);
      showToast(err.response?.data?.error || err.message || 'Failed to update operations', 'error');
    } finally {
      setSavingOps(false);
    }
  };

  // Save Hardware & Notification Preferences
  const handleSavePreferences = async () => {
    setSavingPrefs(true);
    try {
      localStorage.setItem('adab_pos_paper_size', paperSize);
      localStorage.setItem('adab_sound_enabled', String(soundEnabled));
      localStorage.setItem('adab_notif_prefs', JSON.stringify({ notifOrders, notifStock, notifSettlements }));

      await sellerService.updateSettings({
        soundbox_enabled: soundEnabled
      });
      showToast(t('preferencesSavedSuccess', 'Hardware and notification preferences updated!'));
    } catch (err) {
      console.error('Failed to update preferences:', err);
      showToast(err.response?.data?.error || err.message || 'Failed to update preferences', 'error');
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleSelectPaperSize = (size) => {
    setPaperSize(size);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('adab_pos_paper_size', size);
    }
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('adab_sound_enabled', String(next));
    }
  };

  const handleTestSound = () => {
    playNotificationChime(true);
  };

  return (
    <section id="sec-settings" className="space-y-5 pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">
            {t('settingsTitle', 'Store Settings')}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {t('settingsSubtitle', 'Profile, business details, operational preferences, and POS hardware')}
          </p>
        </div>

        {/* Store Active Status Pill */}
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
            isOnline ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-600 border border-gray-200'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></span>
            {isOnline ? 'Store Live & Accepting Orders' : 'Store Paused / Offline'}
          </span>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 border animate-in fade-in duration-200 ${
          feedback.type === 'error'
            ? 'bg-rose-50 border-rose-200 text-rose-800'
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          <i className={`fa-solid ${feedback.type === 'error' ? 'fa-triangle-exclamation text-rose-500' : 'fa-circle-check text-emerald-500'}`}></i>
          <span>{feedback.message}</span>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-5">
        {/* CARD 1: Store Profile & Branding */}
        <form onSubmit={handleSaveProfile} className="card p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm font-bold">
              <i className="fa-solid fa-store"></i>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">{t('storeProfileHeading', 'Store Profile & Branding')}</h3>
              <p className="text-[11px] text-gray-400">Public customer storefront identity</p>
            </div>
          </div>

          <div>
            <label htmlFor="input-store-name" className="text-[11px] font-bold text-gray-500 uppercase block mb-1">
              {t('storeNameLabel', 'Store Name')}
            </label>
            <input 
              id="input-store-name"
              type="text"
              required
              value={storeName} 
              onChange={(e) => setStoreName(e.target.value)} 
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 bg-white" 
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="input-owner-name" className="text-[11px] font-bold text-gray-500 uppercase block mb-1">
                {t('ownerNameLabel', 'Owner / Legal Name')}
              </label>
              <input 
                id="input-owner-name"
                type="text"
                value={ownerName} 
                onChange={(e) => setOwnerName(e.target.value)} 
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 bg-white" 
              />
            </div>
            <div>
              <label htmlFor="input-phone" className="text-[11px] font-bold text-gray-500 uppercase block mb-1">
                {t('phoneLabel', 'Contact Phone')}
              </label>
              <input 
                id="input-phone"
                type="tel"
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 bg-white" 
              />
            </div>
          </div>

          <div>
            <label htmlFor="input-address" className="text-[11px] font-bold text-gray-500 uppercase block mb-1">
              {t('addressLabel', 'Store Address')}
            </label>
            <textarea 
              id="input-address"
              value={address} 
              onChange={(e) => setAddress(e.target.value)} 
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 bg-white" 
              rows="2" 
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">
              {t('storeCategoryLabel', 'Store Category')}
            </label>
            <select 
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold bg-white outline-none focus:border-indigo-600"
            >
              <option value="Grocery & General">Grocery & General</option>
              <option value="Supermarket">Supermarket</option>
              <option value="Dairy & Bakery">Dairy & Bakery</option>
              <option value="Clothing & Fashion">Clothing & Fashion</option>
              <option value="Pharmacy & Health">Pharmacy & Health</option>
              <option value="FMCG Wholesaler">FMCG Wholesaler</option>
            </select>
          </div>

          <button 
            type="submit" 
            disabled={savingProfile}
            className="btn-primary !bg-indigo-600 hover:!bg-indigo-700 !text-xs !py-2 px-4 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <i className="fa-solid fa-check"></i>
            {savingProfile ? t('savingText', 'Saving...') : t('saveProfileBtn', 'Save Store Profile')}
          </button>
        </form>

        {/* CARD 2: Business & Tax Verification (Read-only Compliance) */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm font-bold">
              <i className="fa-solid fa-shield-halved"></i>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">{t('businessTaxHeading', 'Business & Tax Compliance')}</h3>
              <p className="text-[11px] text-gray-400">Government identity & verified KYC records</p>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">
              {t('gstinLabel', 'GSTIN (Tax ID)')}
            </label>
            <div className="flex items-center justify-between px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 font-mono text-xs font-bold text-gray-800">
              <span>{profile?.gstin || store?.gstin || '24AAACH7409R1ZZ'}</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-sans px-2 py-0.5 rounded-full uppercase">Active</span>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">
                {t('panLabel', 'Permanent Account Number (PAN)')}
              </label>
              <div className="px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 font-mono text-xs font-bold text-gray-800">
                {profile?.pan || 'AAACH7409R'}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">
                {t('kycStatusLabel', 'KYC Status')}
              </label>
              <div className="px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 font-bold text-xs text-emerald-700 flex items-center gap-1.5">
                <i className="fa-solid fa-circle-check text-emerald-600"></i>
                <span>{profile?.kyc_status || 'VERIFIED'}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">
              Merchant Store UUID
            </label>
            <div className="px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 font-mono text-[11px] text-gray-500 truncate">
              {store?.id || 'store-uuid-placeholder'}
            </div>
          </div>
        </div>

        {/* CARD 3: Store Operations & Hours */}
        <form onSubmit={handleSaveOperations} className="card p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-sm font-bold">
              <i className="fa-solid fa-clock"></i>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">{t('operationsHeading', 'Store Operations & Hours')}</h3>
              <p className="text-[11px] text-gray-400">Order receiving schedule and status</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-gray-50">
            <div>
              <div className="text-xs font-bold text-gray-900">{t('storeOnlineStatus', 'Store Online Status')}</div>
              <div className="text-[11px] text-gray-500">{t('storeOnlineDesc', 'Toggle store visibility on the customer marketplace')}</div>
            </div>
            <button
              type="button"
              onClick={() => setIsOnline(!isOnline)}
              className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                isOnline ? 'bg-emerald-600 justify-end' : 'bg-gray-300 justify-start'
              }`}
            >
              <div className="w-4 h-4 bg-white rounded-full shadow-md"></div>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">
                {t('openTimeLabel', 'Opening Time')}
              </label>
              <input 
                type="time" 
                value={openTime}
                onChange={(e) => setOpenTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold bg-white outline-none focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">
                {t('closeTimeLabel', 'Closing Time')}
              </label>
              <input 
                type="time" 
                value={closeTime}
                onChange={(e) => setCloseTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold bg-white outline-none focus:border-indigo-600"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] font-bold text-gray-500 uppercase">
                {t('deliveryRadiusLabel', 'Delivery Radius (km)')}
              </label>
              <span className="text-xs font-extrabold text-indigo-700">{deliveryRadius} km</span>
            </div>
            <input 
              type="range"
              min="1"
              max="25"
              value={deliveryRadius}
              onChange={(e) => setDeliveryRadius(e.target.value)}
              className="w-full accent-indigo-600 cursor-pointer"
            />
          </div>

          <button 
            type="submit" 
            disabled={savingOps}
            className="btn-primary !bg-amber-600 hover:!bg-amber-700 !text-xs !py-2 px-4 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <i className="fa-solid fa-business-time"></i>
            {savingOps ? t('savingText', 'Saving...') : t('saveOperationsBtn', 'Save Operations & Hours')}
          </button>
        </form>

        {/* CARD 4: POS Thermal Printer & Hardware Preferences */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center text-sm font-bold">
              <i className="fa-solid fa-print"></i>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">{t('hardwareHeading', 'POS & Hardware Preferences')}</h3>
              <p className="text-[11px] text-gray-400">Thermal receipt printer and audio chime settings</p>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">
              {t('paperRollWidth', 'Thermal Receipt Paper Width')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button 
                type="button"
                onClick={() => handleSelectPaperSize('58mm')}
                className={`p-2.5 rounded-xl border text-xs font-bold text-left transition flex items-center justify-between ${
                  paperSize === '58mm'
                    ? 'bg-purple-50 border-purple-300 text-purple-900 ring-2 ring-purple-100'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div>
                  <div className="font-extrabold">{t('paper58mm', '58mm (2-inch Roll)')}</div>
                  <div className="text-[10px] text-gray-400">Standard portable POS</div>
                </div>
                {paperSize === '58mm' && <i className="fa-solid fa-circle-check text-purple-600"></i>}
              </button>

              <button 
                type="button"
                onClick={() => handleSelectPaperSize('80mm')}
                className={`p-2.5 rounded-xl border text-xs font-bold text-left transition flex items-center justify-between ${
                  paperSize === '80mm'
                    ? 'bg-purple-50 border-purple-300 text-purple-900 ring-2 ring-purple-100'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div>
                  <div className="font-extrabold">{t('paper80mm', '80mm (3-inch Roll)')}</div>
                  <div className="text-[10px] text-gray-400">Wide desktop billing printer</div>
                </div>
                {paperSize === '80mm' && <i className="fa-solid fa-circle-check text-purple-600"></i>}
              </button>
            </div>
          </div>

          {/* Sound Alert Toggle with Test Button */}
          <div className="p-3 rounded-xl border border-gray-200 bg-gray-50 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-gray-900">{t('soundChimeLabel', 'Order Arrival Audio Chime')}</div>
                <div className="text-[11px] text-gray-500">{t('soundChimeDesc', 'Play a synthesized chime whenever a live order arrives')}</div>
              </div>
              <button
                type="button"
                onClick={handleToggleSound}
                className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                  soundEnabled ? 'bg-indigo-600 justify-end' : 'bg-gray-300 justify-start'
                }`}
              >
                <div className="w-4 h-4 bg-white rounded-full shadow-md"></div>
              </button>
            </div>
            
            <button
              type="button"
              onClick={handleTestSound}
              className="text-xs font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1.5 cursor-pointer pt-1"
            >
              <i className="fa-solid fa-volume-high"></i>
              <span>{t('testChimeBtn', 'Test Sound')}</span>
            </button>
          </div>

          {/* Language Selector */}
          <div className="space-y-1.5 pt-1">
            <label className="text-[11px] font-bold text-gray-500 uppercase block">
              {t('appLanguage', 'Language Preference')}
            </label>
            <div className="flex gap-2">
              {languages.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => setLanguage(l.code)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer text-center ${
                    language === l.code
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {l.nativeLabel}
                </button>
              ))}
            </div>
          </div>

          <button 
            type="button"
            onClick={handleSavePreferences}
            disabled={savingPrefs}
            className="w-full btn-primary !bg-purple-600 hover:!bg-purple-700 !text-xs !py-2 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <i className="fa-solid fa-floppy-disk"></i>
            {savingPrefs ? t('savingText', 'Saving...') : t('savePreferencesBtn', 'Save Hardware & Notifications')}
          </button>
        </div>
      </div>
    </section>
  );
}
