import React, { useState, useEffect } from 'react';
import { api } from '../api/api';
import { RewardAPI } from '../services/api';
import { lookupPincode, getOfflinePincodeHint } from '../utils/pincode';

let accountDataCache = null;

export function clearAccountCache() {
  accountDataCache = null;
}

export default function AccountPage({ 
  onNavigate, 
  currentUser, 
  onLogout, 
  onOpenLogin,
  ordersCount = 0,
  points = 0,
  walletBalance = 0,
  unreadNotifications = 0
}) {
  const [profile, setProfile] = useState(accountDataCache?.profile || null);
  const [addresses, setAddresses] = useState(accountDataCache?.addresses || []);
  const [loading, setLoading] = useState(!accountDataCache);
  const [notificationPrefs, setNotificationPrefs] = useState(accountDataCache?.notifications || {
    order_updates_sms: true,
    order_updates_email: true,
    promotional_sms: false,
    soundbox_alerts: true
  });
  
  const displayOrders = ordersCount ?? 0;
  const displayPoints = (typeof points === 'number' && points > 0)
    ? points
    : (profile?.points ?? points ?? 0);
  const displayWallet = profile?.wallet_balance ?? walletBalance ?? 0;
  const displayUnreadNotifications = unreadNotifications ?? 0;

  // Keep profile points synchronized with latest points prop from App
  useEffect(() => {
    if (typeof points === 'number' && points > 0) {
      setProfile(prev => prev ? ({ ...prev, points }) : prev);
      if (accountDataCache?.profile) {
        accountDataCache.profile.points = points;
      }
    }
  }, [points]);

  // Views: 'dashboard' | 'addresses' | 'profile' | 'placeholder'
  const [activeView, setActiveView] = useState('dashboard');
  const [placeholderText, setPlaceholderText] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Edit forms
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: accountDataCache?.profile?.name || '', phone: accountDataCache?.profile?.phone || '', email: accountDataCache?.profile?.email || '' });

  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [isDetectingPin, setIsDetectingPin] = useState(false);
  const [pinHint, setPinHint] = useState('');
  const [addressForm, setAddressForm] = useState({
    type: 'Home', recipientName: '', phone: '', address: '', city: 'Surat', state: 'Gujarat', zip: '', isDefault: false
  });
  const [serviceabilityResults, setServiceabilityResults] = useState({});
  const [mapPreviews, setMapPreviews] = useState({});

  const handleAddressPincodeChange = async (rawVal) => {
    const val = rawVal.replace(/\D/g, '').slice(0, 6);
    setAddressForm(prev => ({ ...prev, zip: val }));

    if (val.length === 6) {
      const offline = getOfflinePincodeHint(val);
      if (offline) {
        setAddressForm(prev => ({
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
          setAddressForm(prev => ({
            ...prev,
            city: detected.city || prev.city,
            state: detected.state || prev.state
          }));
          setPinHint(`✓ Auto-detected: ${detected.city}, ${detected.state}`);
        } else if (!offline) {
          setPinHint('Pincode set. Confirm city & state below.');
        }
      } catch (e) {
        console.debug('Pin lookup error:', e);
      } finally {
        setIsDetectingPin(false);
      }
    } else {
      setPinHint('');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateAvatar = async (avatarUrl) => {
    try {
      const res = await api.post('/customers/me/profile/avatar', { avatarUrl });
      if (res.data?.success) {
        setProfile(prev => ({ ...prev, profile_picture_url: avatarUrl }));
        if (accountDataCache?.profile) {
          accountDataCache.profile.profile_picture_url = avatarUrl;
        }
        showToast('Profile avatar updated successfully!');
      }
    } catch (e) {
      showToast('Failed to update avatar', 'error');
    }
  };

  const checkMapPreview = async (addressId) => {
    try {
      const res = await api.get(`/customers/me/addresses/${addressId}/map-preview`);
      if (res.data?.success && res.data.data) {
        setMapPreviews(prev => ({ ...prev, [addressId]: res.data.data }));
      }
    } catch (err) {
      console.warn('Map preview check error:', err);
    }
  };

  const fetchData = async (force = false) => {
    const isUserStored = Boolean(currentUser || localStorage.getItem('adab_user'));
    if (!isUserStored) {
      setProfile(null);
      setAddresses([]);
      setLoading(false);
      return;
    }
    if (accountDataCache && !force) {
      setProfile(accountDataCache.profile);
      setAddresses(accountDataCache.addresses);
      setNotificationPrefs(accountDataCache.notifications);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [profRes, addrRes, notifRes, rewardsRes] = await Promise.all([
        api.get('/customers/me').catch(err => ({ data: { success: false, error: err.message } })),
        api.get('/customers/me/addresses').catch(err => ({ data: { success: false, error: err.message } })),
        api.get('/customers/me/notification-preferences').catch(() => api.get('/customers/me/notifications').catch(err => ({ data: { success: false, error: err.message } }))),
        RewardAPI.getRewardsSummary().catch(() => null)
      ]);
      
      const guestFallbackProfile = {
        name: 'Guest Customer',
        phone: '+91 98250 12345',
        email: 'customer@adab.shop',
        profile_picture_url: null
      };

      const newCache = { 
        profile: profRes.data?.success && profRes.data?.data ? profRes.data.data : guestFallbackProfile, 
        addresses: addrRes.data?.success && Array.isArray(addrRes.data?.data) ? addrRes.data.data : [], 
        notifications: notifRes.data?.success && notifRes.data?.data ? notifRes.data.data : notificationPrefs 
      };

      if (profRes.data?.success && profRes.data?.data) {
        const rewardsData = rewardsRes?.data;
        const resolvedPoints = typeof rewardsData?.points_balance === 'number'
          ? rewardsData.points_balance
          : (typeof profRes.data.data.points === 'number' ? profRes.data.data.points : points || 0);
        const resolvedTier = rewardsData?.tier || profRes.data.data.loyalty_tier || 'BRONZE';

        const mergedProfile = {
          ...profRes.data.data,
          points: resolvedPoints,
          loyalty_tier: resolvedTier
        };

        newCache.profile = mergedProfile;
      }

      setProfile(newCache.profile);
      setProfileForm({ 
        name: newCache.profile.name || '', 
        phone: newCache.profile.phone || '', 
        email: newCache.profile.email || '' 
      });
      setAddresses(newCache.addresses);
      setNotificationPrefs(newCache.notifications);
      
      accountDataCache = newCache;
    } catch (error) {
      console.warn("Notice: Fetching account data used guest profile fallback", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const res = await api.patch('/customers/me', profileForm);
      const notifRes = await api.patch('/customers/me/notification-preferences', notificationPrefs);
      if (res.data?.success && notifRes.data?.success) {
        setProfile(res.data.data);
        try {
          const raw = localStorage.getItem('adab_user');
          const existing = raw ? JSON.parse(raw) : {};
          localStorage.setItem('adab_user', JSON.stringify({
            ...existing,
            name: res.data.data.name || res.data.data.full_name || existing.name,
            phone: res.data.data.phone || existing.phone,
            email: res.data.data.email || existing.email
          }));
        } catch {}
        if (accountDataCache) {
          accountDataCache.profile = res.data.data;
          accountDataCache.notifications = notificationPrefs;
        }
        setIsEditingProfile(false);
        showToast('Profile and preferences updated successfully!', 'success');
      } else {
        showToast('Failed to update profile or preferences', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'An error occurred while updating profile', 'error');
    }
  };

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    try {
      let res;
      if (editingAddressId) {
        res = await api.patch(`/customers/me/addresses/${editingAddressId}`, addressForm);
      } else {
        res = await api.post('/customers/me/addresses', addressForm);
      }
      
      if (res.data?.success || res.status === 200 || res.status === 201) {
        setIsAddingAddress(false);
        setEditingAddressId(null);
        setPinHint('');
        setAddressForm({ type: 'Home', recipientName: '', phone: '', address: '', city: 'Surat', state: 'Gujarat', zip: '', isDefault: false });
        fetchData(true);
        showToast('Address saved successfully!', 'success');
      } else {
        showToast(res.data?.message || 'Failed to save address', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'An error occurred while saving address', 'error');
    }
  };

  const handleDeleteAddress = async (id) => {
    if (!window.confirm('Are you sure you want to delete this address?')) return;
    try {
      await api.delete(`/customers/me/addresses/${id}`);
      fetchData(true);
      showToast('Address deleted successfully!', 'success');
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to delete address', 'error');
    }
  };

  const showPlaceholder = (text) => {
    setPlaceholderText(text);
    setActiveView('placeholder');
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading Account...</div>;

  const isLoggedIn = Boolean(currentUser || localStorage.getItem('adab_user'));
  const effectiveUser = profile || currentUser || (() => {
    try {
      const saved = localStorage.getItem('adab_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  })();

  const displayName = effectiveUser?.name || effectiveUser?.full_name || 'Customer';
  const displayEmail = effectiveUser?.email || '';
  const displayPhone = effectiveUser?.phone || '';
  const displayInitial = displayName ? displayName.charAt(0).toUpperCase() : 'C';

  const renderDashboard = () => (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
      {/* Guest Sign In Callout if not authenticated */}
      {!isLoggedIn && (
        <div className="bg-gradient-to-r from-emerald-50 to-green-100 border border-emerald-200 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#18753C] text-white flex items-center justify-center text-xl shrink-0 shadow-sm">
              <i className="fa-solid fa-user-lock"></i>
            </div>
            <div>
              <h3 className="font-extrabold text-gray-900 text-sm">Log in to your ADAB account</h3>
              <p className="text-xs text-gray-600 mt-0.5">Access your saved addresses, track live orders, earn points and customize alerts.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenLogin ? onOpenLogin() : (onNavigate && onNavigate('login'))}
            className="w-full sm:w-auto px-5 py-2.5 bg-[#18753C] hover:bg-[#156030] text-white font-bold text-xs rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Login / Register</span>
            <i className="fa-solid fa-arrow-right text-[10px]"></i>
          </button>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-[#18753C] rounded-2xl p-6 text-white shadow-sm flex flex-col gap-6 relative overflow-hidden">
        <div className="flex justify-between items-start z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-[#519468] rounded-xl flex items-center justify-center text-3xl font-extrabold text-white overflow-hidden shadow-sm shrink-0">
              {profile?.profile_picture_url ? (
                <img src={profile.profile_picture_url} alt="" className="w-full h-full object-cover" />
              ) : (
                displayInitial
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">{displayName}</h2>
                {effectiveUser?.loyalty_tier && (
                  <span className="bg-[#2D804D] border border-white/20 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {effectiveUser.loyalty_tier} MEMBER
                  </span>
                )}
              </div>
              <p className="text-xs text-green-100 mt-1">
                {displayPhone ? `${displayPhone} • ` : ''}{displayEmail || 'ADAB Customer Account'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={() => { setIsEditingProfile(true); setActiveView('profile'); }} 
              className="bg-[#3D8856] hover:bg-[#4E9765] transition-colors text-white text-xs font-bold py-2 px-4 rounded-full border border-[#5CA072] cursor-pointer"
            >
              Edit Profile
            </button>
            {isLoggedIn && onLogout && (
              <button 
                type="button"
                onClick={onLogout}
                className="bg-white/20 hover:bg-white/30 transition-colors text-white text-xs font-bold py-2 px-3.5 rounded-full border border-white/30 cursor-pointer flex items-center gap-1.5"
                title="Sign Out"
              >
                <i className="fa-solid fa-arrow-right-from-bracket text-[11px]"></i>
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 z-10">
          <div className="bg-[#2D804D] rounded-xl p-4 text-center">
            <div className="text-xl font-extrabold">{displayOrders}</div>
            <div className="text-[10px] text-green-100 font-semibold uppercase tracking-wider mt-1">Orders</div>
          </div>
          <div 
            onClick={() => onNavigate && onNavigate('points')} 
            className="bg-[#2D804D] rounded-xl p-4 text-center cursor-pointer hover:bg-[#256f42] transition"
          >
            <div className="text-xl font-extrabold">{Number(displayPoints).toLocaleString('en-IN')}</div>
            <div className="text-[10px] text-green-100 font-semibold uppercase tracking-wider mt-1">Points</div>
          </div>
          <div className="bg-[#2D804D] rounded-xl p-4 text-center">
            <div className="text-xl font-extrabold">₹{Number(displayWallet).toLocaleString('en-IN')}</div>
            <div className="text-[10px] text-green-100 font-semibold uppercase tracking-wider mt-1">Wallet</div>
          </div>
        </div>
      </div>

      {/* Grid of Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. My Orders (with active badge) */}
        <div onClick={() => onNavigate('orders')} className="bg-white border border-gray-100 p-4 rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex items-center gap-4 cursor-pointer hover:border-brand-green/30 transition-colors">
          <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center text-xl shrink-0">
            <i className="fa-solid fa-box"></i>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900 text-sm">My Orders</span>
              {displayOrders > 0 && (
                <span className="bg-red-100 text-red-600 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">{displayOrders}</span>
              )}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">Track, return, or buy again</div>
          </div>
          <i className="fa-solid fa-chevron-right text-gray-300 text-xs"></i>
        </div>
        
        {/* 2. Wishlist */}
        <div onClick={() => onNavigate('wishlist')} className="bg-white border border-gray-100 p-4 rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex items-center gap-4 cursor-pointer hover:border-brand-green/30 transition-colors">
          <div className="w-12 h-12 bg-pink-50 text-pink-500 rounded-xl flex items-center justify-center text-xl shrink-0">
            <i className="fa-solid fa-heart"></i>
          </div>
          <div className="flex-1">
            <div className="font-bold text-gray-900 text-sm">Wishlist</div>
            <div className="text-xs text-gray-500 mt-0.5">Your saved items</div>
          </div>
          <i className="fa-solid fa-chevron-right text-gray-300 text-xs"></i>
        </div>

        {/* 3. Addresses */}
        <div onClick={() => setActiveView('addresses')} className="bg-white border border-gray-100 p-4 rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex items-center gap-4 cursor-pointer hover:border-brand-green/30 transition-colors">
          <div className="w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center text-xl shrink-0">
            <i className="fa-solid fa-location-dot"></i>
          </div>
          <div className="flex-1">
            <div className="font-bold text-gray-900 text-sm">Addresses</div>
            <div className="text-xs text-gray-500 mt-0.5">Manage delivery addresses ({addresses.length})</div>
          </div>
          <i className="fa-solid fa-chevron-right text-gray-300 text-xs"></i>
        </div>

        {/* 4. Payment Methods */}
        <div onClick={() => showPlaceholder('Payment Methods: Saved cards & UPI management coming soon.')} className="bg-white border border-gray-100 p-4 rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex items-center gap-4 cursor-pointer hover:border-brand-green/30 transition-colors">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center text-xl shrink-0">
            <i className="fa-solid fa-credit-card"></i>
          </div>
          <div className="flex-1">
            <div className="font-bold text-gray-900 text-sm">Payment Methods</div>
            <div className="text-xs text-gray-500 mt-0.5">Saved cards & UPI</div>
          </div>
          <i className="fa-solid fa-chevron-right text-gray-300 text-xs"></i>
        </div>

        {/* 5. Pay Later & Credit Line */}
        <div onClick={() => showPlaceholder('Pay Later & Credit Line coming soon.')} className="bg-white border border-gray-100 p-4 rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex items-center gap-4 cursor-pointer hover:border-brand-green/30 transition-colors">
          <div className="w-12 h-12 bg-[#E8F5E9] text-[#18753C] rounded-xl flex items-center justify-center text-xl shrink-0">
            <i className="fa-solid fa-hand-holding-dollar"></i>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-bold text-gray-900 text-sm">Pay Later & Credit Line</span>
              <span className="bg-[#E8F5E9] border border-[#23B65D] text-[#18753C] text-[8px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">0% Interest</span>
            </div>
            <div className="text-xs text-gray-500">Apply via HDFC, ICICI, SBI Mudra</div>
          </div>
          <i className="fa-solid fa-chevron-right text-gray-300 text-xs"></i>
        </div>

        {/* 6. Coupons */}
        <div onClick={() => showPlaceholder('Coupons: View available offers and discounts coming soon.')} className="bg-white border border-gray-100 p-4 rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex items-center gap-4 cursor-pointer hover:border-brand-green/30 transition-colors">
          <div className="w-12 h-12 bg-green-50 text-green-500 rounded-xl flex items-center justify-center text-xl shrink-0">
            <i className="fa-solid fa-tag"></i>
          </div>
          <div className="flex-1">
            <div className="font-bold text-gray-900 text-sm">Coupons</div>
            <div className="text-xs text-gray-500 mt-0.5">Available offers & promo codes</div>
          </div>
          <i className="fa-solid fa-chevron-right text-gray-300 text-xs"></i>
        </div>

        {/* 7. ADAB Rewards (Day 5 Task 4: sec-points) */}
        <div onClick={() => (onNavigate ? onNavigate('points') : null)} className="bg-white border border-gray-100 p-4 rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex items-center gap-4 cursor-pointer hover:border-brand-green/30 transition-colors">
          <div className="w-12 h-12 bg-yellow-50 text-yellow-500 rounded-xl flex items-center justify-center text-xl shrink-0">
            <i className="fa-solid fa-star"></i>
          </div>
          <div className="flex-1">
            <div className="font-bold text-gray-900 text-sm">ADAB Rewards</div>
            <div className="text-xs text-gray-500 mt-0.5">{Number(displayPoints).toLocaleString('en-IN')} points available</div>
          </div>
          <i className="fa-solid fa-chevron-right text-gray-300 text-xs"></i>
        </div>

        {/* 8. My Reviews (Day 5 Task 2: sec-reviews) */}
        <div onClick={() => (onNavigate ? onNavigate('reviews') : null)} className="bg-white border border-gray-100 p-4 rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex items-center gap-4 cursor-pointer hover:border-brand-green/30 transition-colors">
          <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center text-xl shrink-0">
            <i className="fa-regular fa-star-half-stroke"></i>
          </div>
          <div className="flex-1">
            <div className="font-bold text-gray-900 text-sm">My Reviews</div>
            <div className="text-xs text-gray-500 mt-0.5">Rate past purchases &amp; stores</div>
          </div>
          <i className="fa-solid fa-chevron-right text-gray-300 text-xs"></i>
        </div>

        {/* 9. Notifications */}
        <div onClick={() => (onNavigate ? onNavigate('notifications') : setActiveView('profile'))} className="bg-white border border-gray-100 p-4 rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex items-center gap-4 cursor-pointer hover:border-brand-green/30 transition-colors">
          <div className="w-12 h-12 bg-purple-50 text-purple-500 rounded-xl flex items-center justify-center text-xl shrink-0">
            <i className="fa-solid fa-bell"></i>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900 text-sm">Notifications</span>
              {displayUnreadNotifications > 0 && (
                <span className="bg-red-100 text-red-600 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
                  {displayUnreadNotifications}
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">Order & promo alerts</div>
          </div>
          <i className="fa-solid fa-chevron-right text-gray-300 text-xs"></i>
        </div>

        {/* 10. Help & Support (Day 5 Task 3: sec-help, sec-messages) */}
        <div onClick={() => (onNavigate ? onNavigate('help') : null)} className="bg-white border border-gray-100 p-4 rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex items-center gap-4 cursor-pointer hover:border-brand-green/30 transition-colors">
          <div className="w-12 h-12 bg-teal-50 text-teal-500 rounded-xl flex items-center justify-center text-xl shrink-0">
            <i className="fa-solid fa-headset"></i>
          </div>
          <div className="flex-1">
            <div className="font-bold text-gray-900 text-sm">Help &amp; Support</div>
            <div className="text-xs text-gray-500 mt-0.5">Tickets, live chat &amp; order disputes</div>
          </div>
          <i className="fa-solid fa-chevron-right text-gray-300 text-xs"></i>
        </div>

        {/* Returns & Refunds (Day 5) */}
        <div onClick={() => (onNavigate ? onNavigate('returns') : null)} className="bg-white border border-gray-100 p-4 rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex items-center gap-4 cursor-pointer hover:border-brand-green/30 transition-colors">
          <div className="w-12 h-12 bg-gray-100 text-gray-700 rounded-xl flex items-center justify-center text-xl shrink-0">
            <i className="fa-solid fa-rotate-left"></i>
          </div>
          <div className="flex-1">
            <div className="font-bold text-gray-900 text-sm">Returns &amp; Refunds</div>
            <div className="text-xs text-gray-500 mt-0.5">Track return requests &amp; pickup slots</div>
          </div>
          <i className="fa-solid fa-chevron-right text-gray-300 text-xs"></i>
        </div>

        {/* 11. Settings (Added from sidebar) */}
        <div onClick={() => setActiveView('profile')} className="bg-white border border-gray-100 p-4 rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex items-center gap-4 cursor-pointer hover:border-brand-green/30 transition-colors">
          <div className="w-12 h-12 bg-gray-100 text-gray-600 rounded-xl flex items-center justify-center text-xl shrink-0">
            <i className="fa-solid fa-gear"></i>
          </div>
          <div className="flex-1">
            <div className="font-bold text-gray-900 text-sm">Settings</div>
            <div className="text-xs text-gray-500 mt-0.5">Profile, security & preferences</div>
          </div>
          <i className="fa-solid fa-chevron-right text-gray-300 text-xs"></i>
        </div>

        {/* 12. Sign Out / Sign In */}
        {isLoggedIn ? (
          <div 
            onClick={onLogout} 
            className="bg-white border border-red-100 p-4 rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex items-center gap-4 cursor-pointer hover:border-red-300 hover:bg-red-50/20 transition-colors"
          >
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center text-xl shrink-0">
              <i className="fa-solid fa-arrow-right-from-bracket"></i>
            </div>
            <div className="flex-1">
              <div className="font-bold text-red-600 text-sm">Sign Out</div>
              <div className="text-xs text-gray-500 mt-0.5">Log out of your customer account</div>
            </div>
            <i className="fa-solid fa-chevron-right text-gray-300 text-xs"></i>
          </div>
        ) : (
          <div 
            onClick={() => onOpenLogin ? onOpenLogin() : (onNavigate && onNavigate('login'))} 
            className="bg-white border border-emerald-100 p-4 rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex items-center gap-4 cursor-pointer hover:border-[#18753C] hover:bg-emerald-50/20 transition-colors"
          >
            <div className="w-12 h-12 bg-emerald-50 text-[#18753C] rounded-xl flex items-center justify-center text-xl shrink-0">
              <i className="fa-solid fa-user-plus"></i>
            </div>
            <div className="flex-1">
              <div className="font-bold text-[#18753C] text-sm">Login / Register</div>
              <div className="text-xs text-gray-500 mt-0.5">Log into your existing account or join</div>
            </div>
            <i className="fa-solid fa-chevron-right text-gray-300 text-xs"></i>
          </div>
        )}
      </div>

      {/* 12. Sell on ADAB Section (Added from sidebar) */}
      <div 
        onClick={() => showToast('Redirecting to ADAB Seller Portal...')}
        className="bg-gradient-to-r from-emerald-50 via-green-50 to-emerald-50/70 border border-emerald-200 p-5 rounded-2xl shadow-xs flex items-center justify-between cursor-pointer hover:border-emerald-400 transition-all group pb-4 mb-8"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#18753C] text-white rounded-xl flex items-center justify-center text-xl shrink-0 shadow-sm group-hover:scale-105 transition-transform">
            <i className="fa-solid fa-store"></i>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-gray-900 text-base">Sell on ADAB</span>
              <span className="bg-[#18753C] text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                Partner With Us
              </span>
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Register your neighbourhood shop and start selling to customers across Surat.
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#18753C] shrink-0 pl-2">
          <span>Learn More</span>
          <i className="fa-solid fa-arrow-right text-[11px] group-hover:translate-x-1 transition-transform"></i>
        </div>
      </div>
    </div>
  );

  const checkServiceability = async (addressId) => {
    try {
      const res = await api.get(`/customers/me/addresses/${addressId}/serviceability`);
      if (res.data?.success) {
        setServiceabilityResults(prev => ({ ...prev, [addressId]: res.data.data }));
      }
    } catch (err) {
      console.warn('Serviceability check error:', err);
    }
  };

  const renderAddresses = () => {
    if (!isLoggedIn) {
      return (
        <div className="max-w-4xl mx-auto w-full text-center py-12 px-4">
          <button 
            type="button"
            onClick={() => setActiveView('dashboard')} 
            className="mb-4 text-sm font-bold text-gray-600 hover:text-black flex items-center gap-2 cursor-pointer transition-colors"
          >
            <i className="fa-solid fa-arrow-left"></i> Back to Account
          </button>
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-[#18753C] flex items-center justify-center text-2xl mx-auto mb-4">
            <i className="fa-solid fa-location-dot"></i>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Saved Addresses</h2>
          <p className="text-xs text-gray-500 mb-6 max-w-sm mx-auto">
            Please log in or register to view and manage your delivery addresses.
          </p>
          <button
            type="button"
            onClick={() => onOpenLogin ? onOpenLogin() : (onNavigate && onNavigate('login'))}
            className="px-6 py-3 bg-[#18753C] hover:bg-[#156030] text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Login / Register
          </button>
        </div>
      );
    }

    return (
      <div className="max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black text-[#111827]">Delivery Addresses</h2>
            <p className="text-xs text-gray-500 mt-0.5">Manage your saved shipping addresses for fast 1-click checkout</p>
          </div>
          <button
            onClick={() => { setActiveView('dashboard'); setIsAddingAddress(false); setEditingAddressId(null); }}
            className="text-xs font-bold text-gray-500 hover:text-gray-900 bg-white border border-gray-200 px-3 py-1.5 rounded-xl transition cursor-pointer"
          >
            ← Back to Account
          </button>
        </div>

        <div className="flex flex-col gap-4 mb-12">
          {addresses.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-500">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#18753C] flex items-center justify-center text-xl mx-auto mb-3">
                <i className="fa-solid fa-location-dot"></i>
              </div>
              <div className="font-bold text-sm text-gray-800">No addresses saved yet</div>
              <p className="text-xs text-gray-500 mt-1">Add your delivery address for 14–45 min local delivery.</p>
            </div>
          ) : (
            addresses.map(addr => {
              const serviceInfo = serviceabilityResults[addr.id];
              return (
                <div key={addr.id} className={`border rounded-2xl p-5 flex flex-col sm:flex-row justify-between sm:items-start gap-4 transition-all ${addr.isDefault ? 'border-[#18753C] bg-[#F5FBF7] shadow-sm' : 'border-gray-200 bg-white shadow-sm'}`}>
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-gray-900 text-base">{addr.type}</span>
                      {addr.isDefault ? (
                        <span className="bg-[#E8F5E9] text-[#18753C] text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-green-200">
                          DEFAULT ADDRESS
                        </span>
                      ) : (
                        <button
                          onClick={async () => {
                            await api.patch(`/customers/me/addresses/${addr.id}`, { ...addr, isDefault: true });
                            fetchData(true);
                            showToast('Set as default address!');
                          }}
                          className="text-[10px] text-gray-500 hover:text-brand-green font-bold underline cursor-pointer"
                        >
                          Set as Default
                        </button>
                      )}
                    </div>
                    <p className="text-gray-700 text-sm">{addr.address}, {addr.city}, {addr.state} - <span className="font-bold text-gray-900">{addr.zip}</span></p>
                    <p className="text-gray-500 text-xs">{addr.recipientName || profile?.name || 'Customer'} &bull; {addr.phone || profile?.phone || '+91 98765 12340'}</p>

                    {/* Serviceability Check Result / Button */}
                    <div className="pt-2">
                      {serviceInfo ? (
                        <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-emerald-200">
                          <i className="fa-solid fa-bolt text-emerald-600"></i>
                          <span>{serviceInfo.deliverySpeed} (Pincode {serviceInfo.pincode})</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => checkServiceability(addr.id)}
                          className="text-[11px] font-bold text-brand-green hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <i className="fa-solid fa-location-crosshairs"></i> Check Delivery Serviceability
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-start">
                    <button 
                      onClick={() => { 
                        setEditingAddressId(addr.id); 
                        setAddressForm({ type: addr.type, recipientName: addr.recipientName || '', phone: addr.phone || '', address: addr.address, city: addr.city, state: addr.state, zip: addr.zip, isDefault: addr.isDefault }); 
                        setIsAddingAddress(true); 
                      }} 
                      className="text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-xl transition cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteAddress(addr.id)}
                      className="text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-xl transition cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ADD NEW ADDRESS BUTTON */}
        {!isAddingAddress && (
          <button 
            onClick={() => { 
              setIsAddingAddress(true); 
              setEditingAddressId(null); 
              setPinHint('');
              setAddressForm({ type: 'Home', recipientName: '', phone: '', address: '', city: 'Surat', state: 'Gujarat', zip: '', isDefault: false }); 
            }} 
            className="w-full border-2 border-dashed border-[#18753C]/40 bg-white text-[#18753C] font-extrabold py-5 rounded-2xl flex items-center justify-center gap-2 hover:bg-green-50 transition text-base cursor-pointer"
          >
            <i className="fa-solid fa-plus"></i> Add New Delivery Address
          </button>
        )}

        {isAddingAddress && (
          <form onSubmit={handleSaveAddress} className="flex flex-col gap-4 bg-white p-6 rounded-3xl border border-[#18753C] shadow-lg mt-2 animate-fade-in">
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-black text-lg text-gray-900">{editingAddressId ? 'Edit Address' : 'Add New Address'}</h3>
              <button 
                type="button" 
                onClick={() => { setIsAddingAddress(false); setEditingAddressId(null); }}
                className="text-gray-400 hover:text-gray-700 text-sm font-bold"
              >
                ✕ Cancel
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Address Type</label>
                <select value={addressForm.type} onChange={e => setAddressForm({...addressForm, type: e.target.value})} className="w-full border border-gray-200 p-3 rounded-xl text-sm focus:border-brand-green outline-none bg-white font-medium">
                  <option value="Home">Home (Personal)</option>
                  <option value="Office">Office / Business</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Recipient Name</label>
                <input type="text" value={addressForm.recipientName} onChange={e => setAddressForm({...addressForm, recipientName: e.target.value})} className="w-full border border-gray-200 p-3 rounded-xl text-sm focus:border-brand-green outline-none font-medium" placeholder="Full Name" required />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Mobile Number</label>
                <input type="tel" value={addressForm.phone} onChange={e => setAddressForm({...addressForm, phone: e.target.value})} className="w-full border border-gray-200 p-3 rounded-xl text-sm focus:border-brand-green outline-none font-medium" placeholder="10-digit Phone Number" required />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Pincode</label>
                <input type="text" maxLength={6} value={addressForm.zip} onChange={e => handleAddressPincodeChange(e.target.value)} className="w-full border border-gray-200 p-3 rounded-xl text-sm focus:border-brand-green outline-none font-mono" placeholder="6-digit Pincode (e.g. 395007)" required />
                {pinHint && (
                  <p className="text-xs text-[#18753C] font-semibold mt-1 flex items-center gap-1">
                    <i className="fa-solid fa-location-dot"></i> {pinHint}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Flat, House no., Building, Street</label>
              <textarea value={addressForm.address} onChange={e => setAddressForm({...addressForm, address: e.target.value})} className="w-full border border-gray-200 p-3 rounded-xl text-sm focus:border-brand-green outline-none font-medium" placeholder="House / Flat / Street address" required rows="2" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">City</label>
                <input type="text" value={addressForm.city} onChange={e => setAddressForm({...addressForm, city: e.target.value})} className="w-full border border-gray-200 p-3 rounded-xl text-sm focus:border-brand-green outline-none font-medium" placeholder="City (e.g. Surat)" required />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">State</label>
                <input type="text" value={addressForm.state} onChange={e => setAddressForm({...addressForm, state: e.target.value})} className="w-full border border-gray-200 p-3 rounded-xl text-sm focus:border-brand-green outline-none font-medium" placeholder="State (e.g. Gujarat)" required />
              </div>
            </div>

            <label className="flex items-center gap-2.5 text-xs mt-2 cursor-pointer font-bold text-gray-700 select-none">
              <input type="checkbox" checked={addressForm.isDefault} onChange={e => setAddressForm({...addressForm, isDefault: e.target.checked})} className="w-4 h-4 accent-[#18753C] rounded" />
              Make this my default shipping address
            </label>

            <div className="flex gap-3 justify-end mt-4 pt-3 border-t border-gray-100">
              <button type="button" onClick={() => { setIsAddingAddress(false); setEditingAddressId(null); }} className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold text-xs text-gray-700 transition cursor-pointer">Cancel</button>
              <button type="submit" className="px-6 py-2.5 bg-[#18753C] hover:bg-[#156030] text-white rounded-xl font-extrabold text-xs shadow-md transition cursor-pointer">Save Address</button>
            </div>
          </form>
        )}
      </div>
    );
  };

  const renderProfile = () => (
    <div className="max-w-4xl mx-auto w-full">
      <button 
        type="button"
        onClick={() => setActiveView('dashboard')} 
        className="mb-4 text-sm font-bold text-gray-600 hover:text-black flex items-center gap-2 cursor-pointer transition-colors"
      >
        <i className="fa-solid fa-arrow-left"></i> Back to Account
      </button>

      <div className="flex items-center gap-2 mb-6">
        <h2 className="text-2xl font-black text-[#111827]">Settings & Profile</h2>
      </div>

      {/* Profile Avatar Selector */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
        <h3 className="text-lg font-bold text-gray-900 mb-2">Profile Avatar</h3>
        <p className="text-xs text-gray-500 mb-4">Select an avatar or paste a custom URL to customize your customer profile.</p>
        <div className="flex flex-wrap items-center gap-4">
          <img
            src={profile?.profile_picture_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
            alt="Current Avatar"
            className="w-16 h-16 rounded-full object-cover border-2 border-brand-green shadow-sm"
          />
          <div className="flex flex-wrap items-center gap-2">
            {[
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
              'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
              'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
              'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
              'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150'
            ].map((url, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleUpdateAvatar(url)}
                className={`w-10 h-10 rounded-full overflow-hidden border-2 transition hover:scale-105 cursor-pointer ${
                  profile?.profile_picture_url === url ? 'border-brand-green ring-2 ring-brand-green/30' : 'border-gray-200'
                }`}
                title={`Select Avatar ${idx + 1}`}
              >
                <img src={url} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Personal Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-gray-500">Full Name</label>
            <input type="text" value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} className="border border-gray-200 p-3 rounded-xl focus:border-brand-green outline-none text-gray-700" placeholder="Full Name" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-gray-500">Phone</label>
            <input type="text" value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} className="border border-gray-200 p-3 rounded-xl focus:border-brand-green outline-none text-gray-700" placeholder="Phone Number" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-gray-500">Email</label>
            <input type="email" value={profileForm.email} onChange={e => setProfileForm({...profileForm, email: e.target.value})} className="border border-gray-200 p-3 rounded-xl focus:border-brand-green outline-none text-gray-700" placeholder="Email Address" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-gray-500">Language</label>
            <select className="border border-gray-200 p-3 rounded-xl bg-gray-100 text-gray-700 outline-none">
              <option>English</option>
              <option>Gujarati</option>
              <option>Hindi</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Notification Preferences</h3>
        <div className="flex flex-col gap-4">
          <label className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer">
            <div onClick={() => setNotificationPrefs(p => ({ ...p, order_updates_sms: !p.order_updates_sms }))} className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${notificationPrefs.order_updates_sms ? 'bg-[#F26E21] text-white' : 'border border-gray-300'}`}>
              {notificationPrefs.order_updates_sms && <i className="fa-solid fa-check"></i>}
            </div> Order status updates (SMS & Push)
          </label>
          <label className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer">
            <div onClick={() => setNotificationPrefs(p => ({ ...p, promotional_sms: !p.promotional_sms }))} className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${notificationPrefs.promotional_sms ? 'bg-[#F26E21] text-white' : 'border border-gray-300'}`}>
              {notificationPrefs.promotional_sms && <i className="fa-solid fa-check"></i>}
            </div> Promotional offers
          </label>
          <label className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer">
            <div onClick={() => setNotificationPrefs(p => ({ ...p, soundbox_alerts: !p.soundbox_alerts }))} className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${notificationPrefs.soundbox_alerts ? 'bg-[#F26E21] text-white' : 'border border-gray-300'}`}>
              {notificationPrefs.soundbox_alerts && <i className="fa-solid fa-check"></i>}
            </div> Soundbox / In-app alerts
          </label>
          <label className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer">
            <div onClick={() => setNotificationPrefs(p => ({ ...p, order_updates_email: !p.order_updates_email }))} className={`w-5 h-5 rounded flex items-center justify-center text-[10px] ${notificationPrefs.order_updates_email ? 'bg-[#F26E21] text-white' : 'border border-gray-300'}`}>
              {notificationPrefs.order_updates_email && <i className="fa-solid fa-check"></i>}
            </div> Email Newsletter
          </label>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Security</h3>
        <div className="flex flex-col gap-3">
          <button type="button" onClick={() => showToast('Password reset link sent to your registered email')} className="flex items-center gap-3 text-sm text-gray-700 bg-gray-50 p-3 rounded-xl hover:bg-gray-100 transition-colors text-left font-bold border-none w-full cursor-pointer">
            <i className="fa-solid fa-key w-4 text-center"></i> Change Password
          </button>
          <button type="button" onClick={() => showToast('Two-factor authentication is currently enabled via SMS')} className="flex items-center gap-3 text-sm text-gray-700 bg-gray-50 p-3 rounded-xl hover:bg-gray-100 transition-colors text-left font-bold border-none w-full cursor-pointer">
            <i className="fa-solid fa-shield-halved w-4 text-center"></i> Two-Factor Authentication
          </button>
          <button type="button" onClick={() => showToast('All active sessions are verified on this device')} className="flex items-center gap-3 text-sm text-gray-700 bg-gray-50 p-3 rounded-xl hover:bg-gray-100 transition-colors text-left font-bold border-none w-full cursor-pointer">
            <i className="fa-solid fa-arrow-right-from-bracket w-4 text-center"></i> Manage Sessions
          </button>
        </div>
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={() => setActiveView('dashboard')} className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold text-sm text-gray-700 transition-colors cursor-pointer">
          Cancel
        </button>
        <button onClick={(e) => { handleUpdateProfile(e); setActiveView('dashboard'); }} className="bg-[#18753C] hover:bg-[#156030] text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-colors cursor-pointer">
          Save Changes
        </button>
      </div>
    </div>
  );

  const renderPlaceholder = () => (
    <div className="max-w-2xl mx-auto w-full">
      <button onClick={() => setActiveView('dashboard')} className="mb-4 text-sm font-bold text-gray-600 hover:text-black flex items-center gap-2 cursor-pointer transition-colors">
        <i className="fa-solid fa-arrow-left"></i> Back to Account
      </button>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center mb-12">
        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 mx-auto mb-4 text-2xl">
          <i className="fa-solid fa-screwdriver-wrench"></i>
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">Under Construction</h2>
        <p className="text-gray-500 text-sm">{placeholderText}</p>
        <button 
          onClick={() => setActiveView('dashboard')}
          className="mt-6 px-6 py-2.5 bg-[#18753C] text-white text-xs font-bold rounded-xl hover:bg-[#156030] transition-colors cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );

  const SidebarItem = ({ icon, label, badge, active, onClick }) => (
    <div 
      onClick={() => { onClick(); setIsSidebarOpen(false); }}
      className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
        active 
          ? 'bg-[#E8F5E9] text-brand-green font-bold rounded-xl relative' 
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-xl font-medium'
      }`}
    >
      {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-brand-green rounded-r-md"></div>}
      <i className={`fa-solid ${icon} w-5 text-center`}></i>
      <span className="text-sm flex-1">{label}</span>
      {badge && (
        <span className="bg-red-100 text-red-600 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </div>
  );

  return (
    <div className="p-4 bg-[#F8F9FA] min-h-screen relative">
      {/* Account Page Title & Drawer Menu Toggle */}
      {activeView === 'dashboard' && (
        <div className="max-w-4xl mx-auto w-full mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900">My Account</h1>
            <p className="text-xs text-gray-500">Manage your profile, orders, addresses & preferences</p>
          </div>
          <button 
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-gray-700 shadow-sm hover:bg-gray-50 transition-colors cursor-pointer"
            title="Menu"
            aria-label="Account Menu"
          >
            <i className="fa-solid fa-bars"></i>
          </button>
        </div>
      )}

      {/* SIDEBAR OVERLAY */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>
          
          {/* Drawer */}
          <div className="relative w-64 h-full bg-white shadow-2xl flex flex-col pt-4 pb-6 overflow-y-auto transform transition-transform duration-300">
            <div className="flex items-center justify-between px-4 mb-4">
              <div className="text-xs font-bold text-gray-400 tracking-wider uppercase">My Account</div>
              <button onClick={() => setIsSidebarOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">
                <i className="fa-solid fa-times"></i>
              </button>
            </div>
            
            <div className="px-2 flex flex-col gap-1">
              <SidebarItem icon="fa-user" label="Profile" active={activeView === 'dashboard' || activeView === 'profile'} onClick={() => setActiveView('dashboard')} />
              <SidebarItem icon="fa-box" label="Orders" badge="2" active={false} onClick={() => { if (onNavigate) onNavigate('orders'); }} />
              <SidebarItem icon="fa-heart" label="Wishlist" active={false} onClick={() => { if (onNavigate) onNavigate('wishlist'); }} />
              <SidebarItem icon="fa-location-dot" label="Addresses" active={activeView === 'addresses'} onClick={() => setActiveView('addresses')} />
              <SidebarItem icon="fa-credit-card" label="Payments" active={placeholderText.includes('Payment')} onClick={() => showPlaceholder('Payment Methods: Saved cards & UPI management coming soon.')} />
              <SidebarItem icon="fa-tag" label="Coupons" active={placeholderText.includes('Coupons')} onClick={() => showPlaceholder('Coupons: View available offers and discounts coming soon.')} />
              <SidebarItem icon="fa-star" label="Rewards" active={placeholderText.includes('Rewards')} onClick={() => showPlaceholder('ADAB Rewards: Loyalty program details coming soon.')} />
              <SidebarItem icon="fa-star-half-stroke" label="Reviews" active={placeholderText.includes('Reviews')} onClick={() => showPlaceholder('My Reviews: Rate past purchases coming soon.')} />
              <SidebarItem icon="fa-bell" label="Notifications" active={activeView === 'profile'} onClick={() => { if (onNavigate) onNavigate('notifications'); else setActiveView('profile'); }} />
              <SidebarItem icon="fa-headset" label="Help" active={placeholderText.includes('Help')} onClick={() => showPlaceholder('Help & Support: Customer service portal coming soon.')} />
              <SidebarItem icon="fa-gear" label="Settings" active={activeView === 'profile'} onClick={() => setActiveView('profile')} />
              
              <div className="h-px bg-gray-100 my-2 mx-2"></div>
              
              <div 
                onClick={() => {
                  showToast('Redirecting to ADAB Seller Portal...');
                  setIsSidebarOpen(false);
                }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-colors text-brand-green hover:bg-green-50 font-bold mx-2"
              >
                <i className="fa-solid fa-store w-5 text-center"></i>
                <span className="text-sm">Sell on ADAB</span>
              </div>

              {isLoggedIn ? (
                <div 
                  onClick={() => {
                    setIsSidebarOpen(false);
                    if (onLogout) onLogout();
                  }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-colors text-red-600 hover:bg-red-50 font-bold mx-2 mt-1"
                >
                  <i className="fa-solid fa-arrow-right-from-bracket w-5 text-center"></i>
                  <span className="text-sm">Sign Out</span>
                </div>
              ) : (
                <div 
                  onClick={() => {
                    setIsSidebarOpen(false);
                    if (onOpenLogin) onOpenLogin();
                    else if (onNavigate) onNavigate('login');
                  }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-colors text-[#18753C] hover:bg-emerald-50 font-bold mx-2 mt-1"
                >
                  <i className="fa-solid fa-arrow-right-to-bracket w-5 text-center"></i>
                  <span className="text-sm">Login / Register</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Render Active View */}
      {activeView === 'dashboard' && renderDashboard()}
      {activeView === 'addresses' && renderAddresses()}
      {activeView === 'profile' && renderProfile()}
      {activeView === 'placeholder' && renderPlaceholder()}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full text-white font-medium shadow-xl transition-all duration-300 ${toast.type === 'error' ? 'bg-red-500' : 'bg-[#18753C]'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
