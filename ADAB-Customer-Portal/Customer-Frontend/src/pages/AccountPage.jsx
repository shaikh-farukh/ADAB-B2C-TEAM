import { useCallback, useState, useEffect, useRef } from 'react';
import { api } from '../api/api';
import { RewardAPI } from '../services/api';
import { lookupPincode, getOfflinePincodeHint } from '../utils/pincode';

let accountDataCache = null;

// eslint-disable-next-line react-refresh/only-export-components
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
  const isUserLoggedInInitial = Boolean(
    currentUser ||
    (typeof localStorage !== 'undefined' && localStorage.getItem('adab_user'))
  );

  const [profile, setProfile] = useState(accountDataCache?.profile || null);
  const [addresses, setAddresses] = useState(accountDataCache?.addresses || []);
  const [loading, setLoading] = useState(isUserLoggedInInitial && !accountDataCache);
  const [hasLoaded, setHasLoaded] = useState(!isUserLoggedInInitial || Boolean(accountDataCache));
  const [error, setError] = useState(null);
  const [notificationPrefs, setNotificationPrefs] = useState(accountDataCache?.notifications || {
    order_updates_sms: true,
    order_updates_email: true,
    promotional_sms: false,
    soundbox_alerts: true
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [updatingAvatar, setUpdatingAvatar] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [deletingAddressId, setDeletingAddressId] = useState(null);
  const [settingDefaultId, setSettingDefaultId] = useState(null);
  const [checkingServiceabilityId, setCheckingServiceabilityId] = useState(null);
  const [serviceabilityErrors, setServiceabilityErrors] = useState({});

  const isMountedRef = useRef(true);
  const hasFetchedRef = useRef(Boolean(accountDataCache) || !isUserLoggedInInitial);
  const inFlightRef = useRef(false);
  const actionInFlightRef = useRef({
    profile: false,
    avatar: false,
    saveAddress: false,
    deleteAddress: null,
    setDefault: null,
    serviceability: new Set()
  });

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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
  const [placeholderTitle, setPlaceholderTitle] = useState('Under Construction');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Edit forms
  const [profileForm, setProfileForm] = useState({
    name: accountDataCache?.profile?.name || '',
    phone: accountDataCache?.profile?.phone || '',
    email: accountDataCache?.profile?.email || ''
  });

  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [, setIsDetectingPin] = useState(false);
  const [pinHint, setPinHint] = useState('');
  const [addressForm, setAddressForm] = useState({
    type: 'Home',
    recipientName: '',
    phone: '',
    house_number: '',
    building_name: '',
    area_name: '',
    address: '',
    landmark: '',
    city: 'Surat',
    state: 'Gujarat',
    zip: '',
    isDefault: false
  });
  const [serviceabilityResults, setServiceabilityResults] = useState({});

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
        setPinHint(`✓ Detected: ${offline.city}, ${offline.state}`);
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

  const fetchData = useCallback(async (force = false) => {
    const isUserStored = Boolean(currentUser || localStorage.getItem('adab_user'));
    if (!isUserStored) {
      hasFetchedRef.current = true;
      setProfile(null);
      setAddresses([]);
      setHasLoaded(true);
      setError(null);
      setLoading(false);
      return;
    }
    if (inFlightRef.current) return;
    if (accountDataCache && !force) {
      hasFetchedRef.current = true;
      setProfile(accountDataCache.profile);
      setAddresses(accountDataCache.addresses);
      setNotificationPrefs(accountDataCache.notifications);
      setHasLoaded(true);
      setError(null);
      setLoading(false);
      return;
    }
    if (!force && hasFetchedRef.current) return;

    hasFetchedRef.current = true;
    inFlightRef.current = true;
    if (force) {
      accountDataCache = null;
      setLoading(true);
      setError(null);
    }

    try {
      const [profSettled, addrSettled, notifSettled, rewardsSettled] = await Promise.allSettled([
        api.get('/customers/me'),
        api.get('/customers/me/addresses'),
        api.get('/customers/me/notification-preferences'),
        RewardAPI.getRewardsSummary()
      ]);

      if (profSettled.status === 'rejected') {
        throw profSettled.reason;
      }

      if (!isMountedRef.current) return;

      const profRes = profSettled.value;
      const addrRes = addrSettled.status === 'fulfilled' ? addrSettled.value : { data: { success: false } };
      const notifRes = notifSettled.status === 'fulfilled' ? notifSettled.value : { data: { success: false } };
      const rewardsRes = rewardsSettled.status === 'fulfilled' ? rewardsSettled.value : null;

      if (!profRes.data?.success || !profRes.data?.data) {
        throw new Error(profRes.data?.message || 'Unable to load customer profile.');
      }

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

      const newCache = {
        profile: mergedProfile,
        addresses: addrRes.data?.success && Array.isArray(addrRes.data?.data) ? addrRes.data.data : [],
        notifications: notifRes.data?.success && notifRes.data?.data ? notifRes.data.data : notificationPrefs
      };

      setProfile(newCache.profile);
      setProfileForm({
        name: newCache.profile.name || '',
        phone: newCache.profile.phone || '',
        email: newCache.profile.email || ''
      });
      setAddresses(newCache.addresses);
      setNotificationPrefs(newCache.notifications);
      accountDataCache = newCache;
      setHasLoaded(true);
      setError(null);
    } catch (err) {
      hasFetchedRef.current = false;
      accountDataCache = null;
      if (!isMountedRef.current) return;
      console.error('Error loading account data:', err);
      setError(err.response?.data?.message || 'Unable to load your account details. Please try again.');
    } finally {
      inFlightRef.current = false;
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [currentUser, notificationPrefs, points]);

  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  const handleUpdateAvatar = async (avatarUrl) => {
    if (actionInFlightRef.current.avatar) return;
    actionInFlightRef.current.avatar = true;
    setUpdatingAvatar(true);
    try {
      const res = await api.post('/customers/me/profile/avatar', { avatarUrl });
      if (!isMountedRef.current) return;
      if (res.data?.success) {
        setProfile(prev => ({ ...prev, profile_picture_url: avatarUrl }));
        if (accountDataCache?.profile) {
          accountDataCache.profile.profile_picture_url = avatarUrl;
        }
        showToast('Profile avatar updated successfully!');
      }
    } catch {
      if (isMountedRef.current) showToast('Failed to update avatar', 'error');
    } finally {
      actionInFlightRef.current.avatar = false;
      if (isMountedRef.current) setUpdatingAvatar(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    if (e) e.preventDefault();
    if (actionInFlightRef.current.profile) return false;
    actionInFlightRef.current.profile = true;
    setSavingProfile(true);
    try {
      const res = await api.patch('/customers/me', profileForm);
      const notifRes = await api.patch('/customers/me/notification-preferences', notificationPrefs);
      if (!isMountedRef.current) return false;
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
        } catch {
          // Ignore state sync errors if unmounted
        }
        if (accountDataCache) {
          accountDataCache.profile = res.data.data;
          accountDataCache.notifications = notificationPrefs;
        }
        showToast('Profile and preferences updated successfully!', 'success');
        return true;
      } else {
        showToast('Failed to update profile or preferences', 'error');
        return false;
      }
    } catch (err) {
      console.error(err);
      if (isMountedRef.current) {
        showToast(err.response?.data?.message || 'An error occurred while updating profile', 'error');
      }
      return false;
    } finally {
      actionInFlightRef.current.profile = false;
      if (isMountedRef.current) setSavingProfile(false);
    }
  };

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    if (actionInFlightRef.current.saveAddress) return;
    actionInFlightRef.current.saveAddress = true;
    setSavingAddress(true);
    try {
      const compositeAddress = [
        addressForm.house_number ? `House/Flat ${addressForm.house_number}` : null,
        addressForm.building_name,
        addressForm.area_name
      ].filter(Boolean).join(', ') || addressForm.address || 'Delivery Address';

      const payload = {
        ...addressForm,
        address: compositeAddress,
        address_line: compositeAddress
      };

      let res;
      if (editingAddressId) {
        res = await api.patch(`/customers/me/addresses/${editingAddressId}`, payload);
      } else {
        res = await api.post('/customers/me/addresses', payload);
      }
      if (!isMountedRef.current) return;
      if (res.data?.success || res.status === 200 || res.status === 201) {
        setIsAddingAddress(false);
        setEditingAddressId(null);
        setPinHint('');
        setAddressForm({
          type: 'Home',
          recipientName: '',
          phone: '',
          house_number: '',
          building_name: '',
          area_name: '',
          address: '',
          landmark: '',
          city: 'Surat',
          state: 'Gujarat',
          zip: '',
          isDefault: false
        });
        await fetchData(true);
        showToast('Address saved successfully!', 'success');
      } else {
        showToast(res.data?.message || 'Failed to save address', 'error');
      }
    } catch (err) {
      console.error(err);
      if (isMountedRef.current) {
        showToast(err.response?.data?.message || 'An error occurred while saving address', 'error');
      }
    } finally {
      actionInFlightRef.current.saveAddress = false;
      if (isMountedRef.current) setSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (id) => {
    if (actionInFlightRef.current.deleteAddress === id) return;
    if (!window.confirm('Are you sure you want to delete this address?')) return;
    actionInFlightRef.current.deleteAddress = id;
    setDeletingAddressId(id);
    try {
      await api.delete(`/customers/me/addresses/${id}`);
      if (!isMountedRef.current) return;
      await fetchData(true);
      showToast('Address deleted successfully!', 'success');
    } catch (err) {
      console.error(err);
      if (isMountedRef.current) {
        showToast(err.response?.data?.message || 'Failed to delete address', 'error');
      }
    } finally {
      if (actionInFlightRef.current.deleteAddress === id) {
        actionInFlightRef.current.deleteAddress = null;
      }
      if (isMountedRef.current) setDeletingAddressId(null);
    }
  };

  const handleSetDefaultAddress = async (addr) => {
    if (!addr?.id || actionInFlightRef.current.setDefault === addr.id) return;
    actionInFlightRef.current.setDefault = addr.id;
    setSettingDefaultId(addr.id);
    try {
      await api.patch(`/customers/me/addresses/${addr.id}`, { ...addr, isDefault: true });
      if (!isMountedRef.current) return;
      await fetchData(true);
      showToast('Set as default address!');
    } catch (err) {
      console.error(err);
      if (isMountedRef.current) {
        showToast(err.response?.data?.message || 'Failed to update default address', 'error');
      }
    } finally {
      if (actionInFlightRef.current.setDefault === addr.id) {
        actionInFlightRef.current.setDefault = null;
      }
      if (isMountedRef.current) setSettingDefaultId(null);
    }
  };

  const checkServiceability = async (addressId) => {
    if (actionInFlightRef.current.serviceability.has(addressId)) return;
    actionInFlightRef.current.serviceability.add(addressId);
    setCheckingServiceabilityId(addressId);
    setServiceabilityErrors(prev => {
      const next = { ...prev };
      delete next[addressId];
      return next;
    });
    try {
      const res = await api.get(`/customers/me/addresses/${addressId}/serviceability`);
      if (!isMountedRef.current) return;
      if (res.data?.success) {
        setServiceabilityResults(prev => ({ ...prev, [addressId]: res.data.data }));
      } else {
        setServiceabilityErrors(prev => ({
          ...prev,
          [addressId]: res.data?.message || 'Serviceability check failed.'
        }));
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      console.warn('Serviceability check error:', err);
      setServiceabilityErrors(prev => ({
        ...prev,
        [addressId]: err.response?.data?.message || 'Unable to check serviceability.'
      }));
    } finally {
      actionInFlightRef.current.serviceability.delete(addressId);
      if (isMountedRef.current) {
        setCheckingServiceabilityId(prev => (prev === addressId ? null : prev));
      }
    }
  };

  const showPlaceholder = (text, title = 'Under Construction') => {
    setPlaceholderText(text);
    setPlaceholderTitle(title);
    setActiveView('placeholder');
  };

  const isLoggedIn = Boolean(currentUser || (typeof localStorage !== 'undefined' && localStorage.getItem('adab_user')));
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

  // Loading skeleton - desktop-first responsive
  if (loading) {
    return (
      <div className="w-full max-w-7xl 2xl:max-w-[1520px] mx-auto py-4 animate-pulse">
        <div className="flex flex-col lg:flex-row gap-6 xl:gap-8 items-start">
          {/* Sidebar Skeleton */}
          <div className="hidden lg:flex flex-col w-72 xl:w-80 shrink-0 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 bg-gray-200 rounded-2xl shrink-0"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2.5 shadow-xs">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 rounded-xl"></div>
              ))}
            </div>
          </div>

          {/* Main Content Skeleton */}
          <div className="flex-1 min-w-0 w-full space-y-6">
            <div className="h-48 bg-gray-200 rounded-3xl"></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded-2xl"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-28 bg-gray-200 rounded-2xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !hasLoaded) {
    return (
      <div className="w-full max-w-lg mx-auto my-16 bg-white rounded-3xl border border-red-100 p-8 text-center shadow-sm">
        <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <i className="fa-solid fa-triangle-exclamation text-2xl"></i>
        </div>
        <h3 className="font-extrabold text-gray-900 text-lg mb-1">Failed to Load Account</h3>
        <p className="text-xs text-gray-500 mb-6 leading-relaxed">{error || 'Unable to load account details. Please check your connection and retry.'}</p>
        <button
          type="button"
          disabled={loading}
          onClick={() => fetchData(true)}
          className="px-6 py-3 bg-[#18753C] hover:bg-[#156030] text-white rounded-xl text-xs font-bold transition-all shadow-sm inline-flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <i className={`fa-solid fa-rotate-right ${loading ? 'animate-spin' : ''}`}></i>
          Retry Account Details
        </button>
      </div>
    );
  }

  // Sidebar navigation item
  const SidebarNavItem = ({ icon, label, badge, badgeColor = 'bg-red-100 text-red-600', active, onClick }) => (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none ${
        active
          ? 'bg-[#E8F5E9] text-[#18753C] shadow-xs'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-950'
      }`}
    >
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0 transition-colors ${
        active ? 'bg-[#18753C] text-white shadow-xs' : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'
      }`}>
        <i className={`fa-solid ${icon}`}></i>
      </div>
      <span className="flex-1 truncate">{label}</span>
      {badge && (
        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${badgeColor}`}>
          {badge}
        </span>
      )}
    </button>
  );

  // Render Persistent Desktop Navigation Rail & Drawer Menu
  const renderSidebarContent = () => (
    <>
      {/* 1. Profile Summary Card */}
      <div className="bg-white rounded-2xl border border-gray-100/90 p-5 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <div className="w-13 h-13 rounded-2xl bg-[#18753C] text-white flex items-center justify-center text-xl font-black overflow-hidden shadow-sm shrink-0">
              {profile?.profile_picture_url ? (
                <img src={profile.profile_picture_url} alt="" className="w-full h-full object-cover" />
              ) : (
                displayInitial
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-extrabold text-gray-900 text-sm truncate">{displayName}</span>
            </div>
            <p className="text-[11px] text-gray-500 truncate mt-0.5">
              {displayPhone || displayEmail || 'ADAB Customer'}
            </p>
            {effectiveUser?.loyalty_tier && (
              <span className="inline-block mt-1 bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                <i className="fa-solid fa-crown text-[8px] mr-1 text-amber-500"></i>
                {effectiveUser.loyalty_tier}
              </span>
            )}
          </div>
        </div>

        <div className="mt-3.5 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => { setActiveView('profile'); setIsSidebarOpen(false); }}
            className="text-[#18753C] hover:text-[#156030] font-bold flex items-center gap-1 cursor-pointer transition-colors"
          >
            <i className="fa-solid fa-pen-to-square text-[10px]"></i>
            <span>Edit Profile</span>
          </button>
          <span className="text-[11px] text-gray-400 font-medium">Surat, Gujarat</span>
        </div>
      </div>

      {/* 2. Structured Navigation Menus */}
      <div className="bg-white rounded-2xl border border-gray-100/90 p-3 shadow-xs space-y-4">
        {/* OVERVIEW */}
        <div>
          <div className="px-3 pb-1 text-[10px] font-black uppercase tracking-wider text-gray-400">Overview</div>
          <SidebarNavItem
            icon="fa-gauge-high"
            label="Dashboard Overview"
            active={activeView === 'dashboard'}
            onClick={() => { setActiveView('dashboard'); setIsSidebarOpen(false); }}
          />
        </div>

        {/* ORDERS & PURCHASES */}
        <div>
          <div className="px-3 pb-1 text-[10px] font-black uppercase tracking-wider text-gray-400">Orders &amp; Shopping</div>
          <div className="space-y-0.5">
            <SidebarNavItem
              icon="fa-box"
              label="My Orders"
              badge={displayOrders > 0 ? displayOrders : null}
              badgeColor="bg-blue-100 text-blue-700"
              active={false}
              onClick={() => { if (onNavigate) onNavigate('orders'); setIsSidebarOpen(false); }}
            />
            <SidebarNavItem
              icon="fa-heart"
              label="Wishlist"
              active={false}
              onClick={() => { if (onNavigate) onNavigate('wishlist'); setIsSidebarOpen(false); }}
            />
            <SidebarNavItem
              icon="fa-rotate-left"
              label="Returns &amp; Refunds"
              active={false}
              onClick={() => { if (onNavigate) onNavigate('returns'); setIsSidebarOpen(false); }}
            />
          </div>
        </div>

        {/* WALLET & REWARDS */}
        <div>
          <div className="px-3 pb-1 text-[10px] font-black uppercase tracking-wider text-gray-400">Wallet &amp; Rewards</div>
          <div className="space-y-0.5">
            <SidebarNavItem
              icon="fa-star"
              label="ADAB Rewards"
              badge={`${Number(displayPoints).toLocaleString('en-IN')} pts`}
              badgeColor="bg-amber-100 text-amber-800"
              active={false}
              onClick={() => { if (onNavigate) onNavigate('points'); setIsSidebarOpen(false); }}
            />
            <SidebarNavItem
              icon="fa-wallet"
              label="ADAB Wallet"
              badge={`₹${Number(displayWallet).toLocaleString('en-IN')}`}
              badgeColor="bg-emerald-100 text-emerald-800"
              active={false}
              onClick={() => { showPlaceholder('ADAB Wallet: Instant checkout balance & transaction history.', 'ADAB Wallet'); setIsSidebarOpen(false); }}
            />
            <SidebarNavItem
              icon="fa-tag"
              label="Coupons &amp; Offers"
              active={false}
              onClick={() => { showPlaceholder('Coupons: View available store discount codes and seasonal promos.', 'Coupons & Discounts'); setIsSidebarOpen(false); }}
            />
            <SidebarNavItem
              icon="fa-hand-holding-dollar"
              label="Pay Later (0% EMI)"
              badge="0% Int"
              badgeColor="bg-green-100 text-green-800"
              active={false}
              onClick={() => { showPlaceholder('Pay Later & Credit Line: Instant credit limit via partner banks.', 'Pay Later & Credit'); setIsSidebarOpen(false); }}
            />
            <SidebarNavItem
              icon="fa-credit-card"
              label="Payment Methods"
              active={false}
              onClick={() => { showPlaceholder('Payment Methods: Saved cards & UPI management.', 'Payment Methods'); setIsSidebarOpen(false); }}
            />
          </div>
        </div>

        {/* ACCOUNT SETTINGS */}
        <div>
          <div className="px-3 pb-1 text-[10px] font-black uppercase tracking-wider text-gray-400">Account Settings</div>
          <div className="space-y-0.5">
            <SidebarNavItem
              icon="fa-location-dot"
              label="Delivery Addresses"
              badge={addresses.length > 0 ? addresses.length : null}
              badgeColor="bg-gray-100 text-gray-700"
              active={activeView === 'addresses'}
              onClick={() => { setActiveView('addresses'); setIsSidebarOpen(false); }}
            />
            <SidebarNavItem
              icon="fa-user-gear"
              label="Profile &amp; Security"
              active={activeView === 'profile'}
              onClick={() => { setActiveView('profile'); setIsSidebarOpen(false); }}
            />
            <SidebarNavItem
              icon="fa-bell"
              label="Notifications"
              badge={displayUnreadNotifications > 0 ? displayUnreadNotifications : null}
              badgeColor="bg-red-100 text-red-600"
              active={false}
              onClick={() => { if (onNavigate) onNavigate('notifications'); setIsSidebarOpen(false); }}
            />
          </div>
        </div>

        {/* SUPPORT & ECOSYSTEM */}
        <div>
          <div className="px-3 pb-1 text-[10px] font-black uppercase tracking-wider text-gray-400">Support &amp; Partners</div>
          <div className="space-y-0.5">
            <SidebarNavItem
              icon="fa-headset"
              label="Help &amp; Support"
              active={false}
              onClick={() => { if (onNavigate) onNavigate('help'); setIsSidebarOpen(false); }}
            />
            <SidebarNavItem
              icon="fa-star-half-stroke"
              label="My Reviews"
              active={false}
              onClick={() => { if (onNavigate) onNavigate('reviews'); setIsSidebarOpen(false); }}
            />
            <SidebarNavItem
              icon="fa-store"
              label="Sell on ADAB"
              badge="Partner"
              badgeColor="bg-emerald-100 text-emerald-800"
              active={false}
              onClick={() => { showToast('Redirecting to ADAB Seller Portal...'); setIsSidebarOpen(false); }}
            />
          </div>
        </div>

        {/* SIGN IN / SIGN OUT */}
        <div className="pt-2 border-t border-gray-100">
          {isLoggedIn ? (
            <button
              type="button"
              onClick={() => { setIsSidebarOpen(false); if (onLogout) onLogout(); }}
              className="w-full text-left flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-all cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center text-xs shrink-0">
                <i className="fa-solid fa-arrow-right-from-bracket"></i>
              </div>
              <span>Sign Out</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setIsSidebarOpen(false);
                if (onOpenLogin) onOpenLogin();
                else if (onNavigate) onNavigate('login');
              }}
              className="w-full text-left flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-[#18753C] hover:bg-emerald-50 transition-all cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-[#18753C] flex items-center justify-center text-xs shrink-0">
                <i className="fa-solid fa-arrow-right-to-bracket"></i>
              </div>
              <span>Login / Register</span>
            </button>
          )}
        </div>
      </div>
    </>
  );

  // Render Dashboard Overview
  const renderDashboard = () => (
    <div className="space-y-6 w-full">
      {/* 1. Guest Sign In Callout (if unauthenticated) */}
      {!isLoggedIn && (
        <div className="bg-gradient-to-r from-emerald-50 via-green-50 to-emerald-100/60 border border-emerald-200/80 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#18753C] text-white flex items-center justify-center text-xl shrink-0 shadow-sm">
              <i className="fa-solid fa-user-lock"></i>
            </div>
            <div>
              <h3 className="font-extrabold text-gray-900 text-sm sm:text-base">Log in to your ADAB account</h3>
              <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                Save delivery addresses, track live 14–45 min orders, redeem reward points, and unlock 0% interest credit.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenLogin ? onOpenLogin() : (onNavigate && onNavigate('login'))}
            className="w-full md:w-auto px-6 py-2.5 bg-[#18753C] hover:bg-[#156030] text-white font-extrabold text-xs rounded-xl shadow-xs transition-all shrink-0 cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Login / Register</span>
            <i className="fa-solid fa-arrow-right text-[10px]"></i>
          </button>
        </div>
      )}

      {/* 2. Executive Hero Welcome Banner */}
      <div className="bg-gradient-to-br from-[#064E3B] via-[#0E6C3B] to-[#15803D] rounded-3xl p-6 sm:p-7 text-white shadow-md relative overflow-hidden">
        {/* Subtle decorative background accents */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-2xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 right-1/4 w-40 h-40 bg-emerald-400/10 rounded-full blur-xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5">
          <div className="flex items-center gap-4.5">
            <div
              onClick={() => setActiveView('profile')}
              title="Click to edit avatar"
              className="w-16 h-16 sm:w-18 sm:h-18 bg-white/15 hover:bg-white/25 rounded-2xl flex items-center justify-center text-3xl font-black text-white overflow-hidden shadow-inner shrink-0 cursor-pointer border border-white/20 transition-all hover:scale-105"
            >
              {profile?.profile_picture_url ? (
                <img src={profile.profile_picture_url} alt="" className="w-full h-full object-cover" />
              ) : (
                displayInitial
              )}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">{displayName}</h2>
                {effectiveUser?.loyalty_tier && (
                  <span className="bg-white/20 backdrop-blur-md border border-white/30 text-emerald-100 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-xs">
                    <i className="fa-solid fa-sparkles text-[9px] text-amber-300"></i>
                    {effectiveUser.loyalty_tier} MEMBER
                  </span>
                )}
                <span className="bg-emerald-500/20 text-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-400/20 hidden sm:inline-flex items-center gap-1">
                  <i className="fa-solid fa-circle-check text-[9px] text-emerald-300"></i>
                  Verified Surat Account
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 mt-1 font-medium">
                {displayPhone ? `${displayPhone} • ` : ''}{displayEmail || 'ADAB Customer Account'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-stretch sm:self-auto justify-end">
            <button
              type="button"
              onClick={() => setActiveView('profile')}
              className="bg-white/15 hover:bg-white/25 transition-all text-white text-xs font-extrabold py-2.5 px-4 rounded-xl border border-white/25 cursor-pointer backdrop-blur-md flex items-center gap-2 shadow-xs"
            >
              <i className="fa-solid fa-pen-to-square text-[11px]"></i>
              <span>Edit Profile</span>
            </button>
            {isLoggedIn && onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="bg-black/20 hover:bg-black/30 transition-all text-white text-xs font-bold py-2.5 px-4 rounded-xl border border-white/15 cursor-pointer flex items-center gap-2 shadow-xs"
                title="Sign Out"
              >
                <i className="fa-solid fa-arrow-right-from-bracket text-[11px]"></i>
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            )}
          </div>
        </div>

        {/* Executive Metric Cards Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-5 border-t border-white/15 relative z-10">
          {/* 1. Orders */}
          <div
            onClick={() => onNavigate && onNavigate('orders')}
            className="bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/15 rounded-2xl p-4 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-emerald-100 font-extrabold uppercase tracking-wider">Orders Placed</span>
              <i className="fa-solid fa-arrow-up-right-from-square text-[10px] text-emerald-200/70 group-hover:text-white transition-colors"></i>
            </div>
            <div className="text-2xl sm:text-3xl font-black mt-1.5">{displayOrders}</div>
            <div className="text-[11px] text-emerald-200 mt-1 font-medium truncate">
              {displayOrders > 0 ? 'Track live shipments' : 'Start your first order'}
            </div>
          </div>

          {/* 2. Points */}
          <div
            onClick={() => onNavigate && onNavigate('points')}
            className="bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/15 rounded-2xl p-4 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-emerald-100 font-extrabold uppercase tracking-wider">Reward Points</span>
              <i className="fa-solid fa-sparkles text-[10px] text-amber-300"></i>
            </div>
            <div className="text-2xl sm:text-3xl font-black mt-1.5">{Number(displayPoints).toLocaleString('en-IN')}</div>
            <div className="text-[11px] text-emerald-200 mt-1 font-medium truncate">
              Worth ₹{Math.floor(displayPoints / 10)} • Redeem
            </div>
          </div>

          {/* 3. Wallet */}
          <div
            onClick={() => showPlaceholder('ADAB Wallet: Instant checkout balance & transaction history.', 'ADAB Wallet')}
            className="bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/15 rounded-2xl p-4 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-emerald-100 font-extrabold uppercase tracking-wider">ADAB Wallet</span>
              <i className="fa-solid fa-wallet text-[10px] text-emerald-200/70 group-hover:text-white transition-colors"></i>
            </div>
            <div className="text-2xl sm:text-3xl font-black mt-1.5">₹{Number(displayWallet).toLocaleString('en-IN')}</div>
            <div className="text-[11px] text-emerald-200 mt-1 font-medium truncate">
              Instant 1-click checkout
            </div>
          </div>

          {/* 4. Notifications */}
          <div
            onClick={() => onNavigate && onNavigate('notifications')}
            className="bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/15 rounded-2xl p-4 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-emerald-100 font-extrabold uppercase tracking-wider">Alerts</span>
              <i className="fa-solid fa-bell text-[10px] text-emerald-200/70 group-hover:text-white transition-colors"></i>
            </div>
            <div className="text-2xl sm:text-3xl font-black mt-1.5">{displayUnreadNotifications}</div>
            <div className="text-[11px] text-emerald-200 mt-1 font-medium truncate">
              {displayUnreadNotifications > 0 ? `${displayUnreadNotifications} unread updates` : 'All caught up'}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Thematic Hub 1: Orders & Shopping Activity */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <h3 className="text-base sm:text-lg font-black text-gray-900">Orders &amp; Shopping Activity</h3>
            <p className="text-xs text-gray-500">Track shipments, request returns, and view saved items</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* My Orders Card */}
          <div
            onClick={() => onNavigate('orders')}
            className="bg-white border border-gray-200/80 hover:border-[#18753C]/40 p-5 rounded-2xl shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">
                <i className="fa-solid fa-box"></i>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-extrabold text-gray-900 text-sm">My Orders</h4>
                  {displayOrders > 0 && (
                    <span className="bg-red-100 text-red-600 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                      {displayOrders}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                  Track live shipments, download tax invoices, reorder past essentials.
                </p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-blue-600 group-hover:text-blue-700">
              <span>View Orders</span>
              <i className="fa-solid fa-arrow-right text-[10px] group-hover:translate-x-1 transition-transform"></i>
            </div>
          </div>

          {/* Wishlist Card */}
          <div
            onClick={() => onNavigate('wishlist')}
            className="bg-white border border-gray-200/80 hover:border-[#18753C]/40 p-5 rounded-2xl shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-pink-50 text-pink-500 rounded-xl flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">
                <i className="fa-solid fa-heart"></i>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-extrabold text-gray-900 text-sm">Wishlist</h4>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                  Your curated list of favourite pantry staples, dairy &amp; produce.
                </p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-pink-600 group-hover:text-pink-700">
              <span>Open Wishlist</span>
              <i className="fa-solid fa-arrow-right text-[10px] group-hover:translate-x-1 transition-transform"></i>
            </div>
          </div>

          {/* Returns & Refunds Card */}
          <div
            onClick={() => onNavigate('returns')}
            className="bg-white border border-gray-200/80 hover:border-[#18753C]/40 p-5 rounded-2xl shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">
                <i className="fa-solid fa-rotate-left"></i>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-extrabold text-gray-900 text-sm">Returns &amp; Refunds</h4>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                  Doorstep pickup tracking, replacement status &amp; instant refunds.
                </p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-amber-600 group-hover:text-amber-700">
              <span>Track Returns</span>
              <i className="fa-solid fa-arrow-right text-[10px] group-hover:translate-x-1 transition-transform"></i>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Thematic Hub 2: Wallet, Rewards & Payment Suite */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <h3 className="text-base sm:text-lg font-black text-gray-900">Wallet, Rewards &amp; Credit</h3>
            <p className="text-xs text-gray-500">Manage payment methods, loyalty coins, and credit lines</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* ADAB Rewards */}
          <div
            onClick={() => onNavigate('points')}
            className="bg-white border border-gray-200/80 hover:border-[#18753C]/40 p-4.5 rounded-2xl shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center text-lg shrink-0 group-hover:scale-105 transition-transform">
                <i className="fa-solid fa-star"></i>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-extrabold text-gray-900 text-sm">ADAB Rewards</h4>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                  {Number(displayPoints).toLocaleString('en-IN')} points available to redeem.
                </p>
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-amber-600">
              <span>Redeem Coins</span>
              <i className="fa-solid fa-arrow-right text-[10px]"></i>
            </div>
          </div>

          {/* ADAB Wallet */}
          <div
            onClick={() => showPlaceholder('ADAB Wallet: Instant checkout balance & transaction history.', 'ADAB Wallet')}
            className="bg-white border border-gray-200/80 hover:border-[#18753C]/40 p-4.5 rounded-2xl shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 bg-emerald-50 text-[#18753C] rounded-xl flex items-center justify-center text-lg shrink-0 group-hover:scale-105 transition-transform">
                <i className="fa-solid fa-wallet"></i>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-extrabold text-gray-900 text-sm">ADAB Wallet</h4>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                  ₹{Number(displayWallet).toLocaleString('en-IN')} store balance for 1-click orders.
                </p>
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-[#18753C]">
              <span>Manage Wallet</span>
              <i className="fa-solid fa-arrow-right text-[10px]"></i>
            </div>
          </div>

          {/* Pay Later & Credit Line */}
          <div
            onClick={() => showPlaceholder('Pay Later & Credit Line: Instant credit limit via partner banks.', 'Pay Later & Credit')}
            className="bg-white border border-gray-200/80 hover:border-[#18753C]/40 p-4.5 rounded-2xl shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 bg-green-50 text-green-700 rounded-xl flex items-center justify-center text-lg shrink-0 group-hover:scale-105 transition-transform">
                <i className="fa-solid fa-hand-holding-dollar"></i>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h4 className="font-extrabold text-gray-900 text-sm">Pay Later</h4>
                  <span className="bg-emerald-50 text-[#18753C] border border-emerald-200 text-[8px] font-black px-1.5 py-0.2 rounded-full">
                    0% EMI
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                  Up to ₹50,000 credit via partner banks.
                </p>
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-green-700">
              <span>Check Limit</span>
              <i className="fa-solid fa-arrow-right text-[10px]"></i>
            </div>
          </div>

          {/* Coupons */}
          <div
            onClick={() => showPlaceholder('Coupons: View available offers and promo codes.', 'Coupons & Discounts')}
            className="bg-white border border-gray-200/80 hover:border-[#18753C]/40 p-4.5 rounded-2xl shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center text-lg shrink-0 group-hover:scale-105 transition-transform">
                <i className="fa-solid fa-tag"></i>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-extrabold text-gray-900 text-sm">Coupons</h4>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                  Active promo codes &amp; store discounts.
                </p>
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-orange-600">
              <span>View Offers</span>
              <i className="fa-solid fa-arrow-right text-[10px]"></i>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Thematic Hub 3: Delivery Addresses & Account Preferences */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <h3 className="text-base sm:text-lg font-black text-gray-900">Account Settings &amp; Addresses</h3>
            <p className="text-xs text-gray-500">Manage delivery locations, profile information, and alerts</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Addresses */}
          <div
            onClick={() => setActiveView('addresses')}
            className="bg-white border border-gray-200/80 hover:border-[#18753C]/40 p-4.5 rounded-2xl shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 bg-red-50 text-red-500 rounded-xl flex items-center justify-center text-lg shrink-0 group-hover:scale-105 transition-transform">
                <i className="fa-solid fa-location-dot"></i>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-extrabold text-gray-900 text-sm">Addresses</h4>
                  <span className="bg-gray-100 text-gray-700 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                    {addresses.length}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                  Manage doorstep delivery addresses.
                </p>
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-red-600">
              <span>Manage Addresses</span>
              <i className="fa-solid fa-arrow-right text-[10px]"></i>
            </div>
          </div>

          {/* Profile & Security */}
          <div
            onClick={() => setActiveView('profile')}
            className="bg-white border border-gray-200/80 hover:border-[#18753C]/40 p-4.5 rounded-2xl shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-lg shrink-0 group-hover:scale-105 transition-transform">
                <i className="fa-solid fa-user-shield"></i>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-extrabold text-gray-900 text-sm">Profile &amp; Security</h4>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                  Name, phone, email &amp; session security.
                </p>
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-indigo-600">
              <span>Edit Settings</span>
              <i className="fa-solid fa-arrow-right text-[10px]"></i>
            </div>
          </div>

          {/* Notifications */}
          <div
            onClick={() => (onNavigate ? onNavigate('notifications') : setActiveView('profile'))}
            className="bg-white border border-gray-200/80 hover:border-[#18753C]/40 p-4.5 rounded-2xl shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center text-lg shrink-0 group-hover:scale-105 transition-transform">
                <i className="fa-solid fa-bell"></i>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-extrabold text-gray-900 text-sm">Notifications</h4>
                  {displayUnreadNotifications > 0 && (
                    <span className="bg-red-100 text-red-600 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full">
                      {displayUnreadNotifications}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                  Order SMS, soundbox &amp; promo alerts.
                </p>
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-purple-600">
              <span>Configure Alerts</span>
              <i className="fa-solid fa-arrow-right text-[10px]"></i>
            </div>
          </div>

          {/* Reviews */}
          <div
            onClick={() => (onNavigate ? onNavigate('reviews') : null)}
            className="bg-white border border-gray-200/80 hover:border-[#18753C]/40 p-4.5 rounded-2xl shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center text-lg shrink-0 group-hover:scale-105 transition-transform">
                <i className="fa-solid fa-star-half-stroke"></i>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-extrabold text-gray-900 text-sm">My Reviews</h4>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                  Rate past purchases &amp; neighbourhood stores.
                </p>
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-teal-600">
              <span>View Reviews</span>
              <i className="fa-solid fa-arrow-right text-[10px]"></i>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Thematic Hub 4: Support & Ecosystem (2 wide cards) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-4">
        {/* Help & Support Card */}
        <div
          onClick={() => (onNavigate ? onNavigate('help') : null)}
          className="bg-white border border-gray-200/80 hover:border-teal-400 p-5 rounded-2xl shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">
              <i className="fa-solid fa-headset"></i>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-gray-900 text-sm sm:text-base">24/7 Help &amp; Support</h4>
                <span className="bg-teal-50 text-teal-700 text-[9px] font-bold px-2 py-0.5 rounded-full border border-teal-200">
                  Always Active
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Need help with an ongoing order or payment? Chat live with our Surat-based support team or raise a resolution ticket.
              </p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-extrabold text-teal-700">
            <span>Open Support Center</span>
            <i className="fa-solid fa-arrow-right text-[10px] group-hover:translate-x-1 transition-transform"></i>
          </div>
        </div>

        {/* Sell on ADAB Merchant Banner */}
        <div
          onClick={() => showToast('Redirecting to ADAB Seller Portal...')}
          className="bg-gradient-to-r from-emerald-50 via-green-50 to-emerald-100/60 border border-emerald-200 hover:border-emerald-400 p-5 rounded-2xl shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-[#18753C] text-white rounded-xl flex items-center justify-center text-xl shrink-0 shadow-sm group-hover:scale-105 transition-transform">
              <i className="fa-solid fa-store"></i>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-gray-900 text-sm sm:text-base">Partner With Us · Sell on ADAB</h4>
                <span className="bg-[#18753C] text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Sellers
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                Register your neighbourhood grocery, dairy, or bakery. Connect with 10,000+ local customers across Surat with 15-min delivery.
              </p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-emerald-200/50 flex items-center justify-between text-xs font-extrabold text-[#18753C]">
            <span>Become an ADAB Merchant</span>
            <i className="fa-solid fa-arrow-right text-[10px] group-hover:translate-x-1 transition-transform"></i>
          </div>
        </div>
      </div>
    </div>
  );

  // Render Addresses View (Full-width responsive grid)
  const renderAddresses = () => {
    if (!isLoggedIn) {
      return (
        <div className="w-full bg-white rounded-3xl border border-gray-100 p-12 text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-[#18753C] flex items-center justify-center text-2xl mx-auto mb-4">
            <i className="fa-solid fa-location-dot"></i>
          </div>
          <h2 className="text-xl font-black text-gray-900 mb-2">Login Required for Saved Addresses</h2>
          <p className="text-xs text-gray-500 mb-6 max-w-sm mx-auto leading-relaxed">
            Please log in or create an account to view, save and manage your delivery addresses across Surat.
          </p>
          <button
            type="button"
            onClick={() => onOpenLogin ? onOpenLogin() : (onNavigate && onNavigate('login'))}
            className="px-6 py-2.5 bg-[#18753C] hover:bg-[#156030] text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Login / Register
          </button>
        </div>
      );
    }

    return (
      <div className="w-full space-y-6">
        {/* Addresses View Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200/60">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-gray-400 mb-1">
              <button
                type="button"
                onClick={() => setActiveView('dashboard')}
                className="hover:text-gray-700 cursor-pointer"
              >
                Dashboard
              </button>
              <span>/</span>
              <span className="text-gray-700">Delivery Addresses</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-gray-900">Delivery Addresses</h2>
            <p className="text-xs text-gray-500 mt-0.5">Manage your saved shipping addresses for 14–45 min local delivery in Surat</p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => { setActiveView('dashboard'); setIsAddingAddress(false); setEditingAddressId(null); }}
              className="text-xs font-bold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 px-3.5 py-2 rounded-xl transition cursor-pointer"
            >
              ← Back to Dashboard
            </button>
            {!isAddingAddress && (
              <button
                type="button"
                onClick={() => {
                  setIsAddingAddress(true);
                  setEditingAddressId(null);
                  setPinHint('');
                  setAddressForm({
                    type: 'Home',
                    recipientName: '',
                    phone: '',
                    house_number: '',
                    building_name: '',
                    area_name: '',
                    address: '',
                    landmark: '',
                    city: 'Surat',
                    state: 'Gujarat',
                    zip: '',
                    isDefault: false
                  });
                }}
                className="px-4 py-2 bg-[#18753C] hover:bg-[#156030] text-white font-extrabold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <i className="fa-solid fa-plus text-[10px]"></i>
                <span>Add Address</span>
              </button>
            )}
          </div>
        </div>

        {/* Add / Edit Address Form Modal/Card */}
        {isAddingAddress && (
          <form onSubmit={handleSaveAddress} className="bg-white p-6 sm:p-7 rounded-3xl border-2 border-[#18753C] shadow-lg space-y-4 animate-fade-in">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-black text-lg text-gray-900">{editingAddressId ? 'Edit Delivery Address' : 'Add New Delivery Address'}</h3>
                <p className="text-xs text-gray-500 mt-0.5">Enter accurate recipient and landmark details for fast delivery</p>
              </div>
              <button
                type="button"
                onClick={() => { setIsAddingAddress(false); setEditingAddressId(null); }}
                className="text-gray-400 hover:text-gray-700 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-gray-100 transition"
              >
                ✕ Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider block mb-1.5">Address Type</label>
                <select
                  value={addressForm.type}
                  onChange={e => setAddressForm({ ...addressForm, type: e.target.value })}
                  className="w-full border border-gray-200 p-3 rounded-xl text-xs sm:text-sm focus:border-[#18753C] outline-none bg-white font-semibold"
                >
                  <option value="Home">Home (Personal)</option>
                  <option value="Office">Office / Business</option>
                  <option value="Other">Other / Relative</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider block mb-1.5">Recipient Name</label>
                <input
                  type="text"
                  value={addressForm.recipientName}
                  onChange={e => setAddressForm({ ...addressForm, recipientName: e.target.value })}
                  className="w-full border border-gray-200 p-3 rounded-xl text-xs sm:text-sm focus:border-[#18753C] outline-none font-medium"
                  placeholder="Full Name"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider block mb-1.5">Mobile Number</label>
                <input
                  type="tel"
                  value={addressForm.phone}
                  onChange={e => setAddressForm({ ...addressForm, phone: e.target.value })}
                  className="w-full border border-gray-200 p-3 rounded-xl text-xs sm:text-sm focus:border-[#18753C] outline-none font-medium"
                  placeholder="10-digit Phone Number"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider block mb-1.5">Pincode</label>
                <input
                  type="text"
                  maxLength={6}
                  value={addressForm.zip}
                  onChange={e => handleAddressPincodeChange(e.target.value)}
                  className="w-full border border-gray-200 p-3 rounded-xl text-xs sm:text-sm focus:border-[#18753C] outline-none font-mono font-bold"
                  placeholder="6-digit Pincode (e.g. 395007)"
                  required
                />
                {pinHint && (
                  <p className="text-xs text-[#18753C] font-semibold mt-1.5 flex items-center gap-1">
                    <i className="fa-solid fa-location-dot"></i> {pinHint}
                  </p>
                )}
              </div>
            </div>

            {/* House / Flat / Block No */}
            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                House / Flat / Block No <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <i className="fa-solid fa-house-chimney text-xs"></i>
                </span>
                <input
                  type="text"
                  required
                  value={addressForm.house_number || ''}
                  onChange={e => setAddressForm({...addressForm, house_number: e.target.value})}
                  className="w-full border border-gray-200 pl-9 p-3 rounded-xl text-sm focus:border-brand-green outline-none font-medium"
                  placeholder="e.g. Flat 502, 5th Floor / House 12"
                />
              </div>
            </div>

            {/* Building / Society / Apartment Name */}
            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                Building / Society / Apartment Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <i className="fa-solid fa-building text-xs"></i>
                </span>
                <input
                  type="text"
                  required
                  value={addressForm.building_name || ''}
                  onChange={e => setAddressForm({...addressForm, building_name: e.target.value})}
                  className="w-full border border-gray-200 pl-9 p-3 rounded-xl text-sm focus:border-brand-green outline-none font-medium"
                  placeholder="e.g. Orchid Heights / Shivalik Residency"
                />
              </div>
            </div>

            {/* Area / Street / Locality Name */}
            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                Area / Street / Locality Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <i className="fa-solid fa-road text-xs"></i>
                </span>
                <input
                  type="text"
                  required
                  value={addressForm.area_name || ''}
                  onChange={e => setAddressForm({...addressForm, area_name: e.target.value})}
                  className="w-full border border-gray-200 pl-9 p-3 rounded-xl text-sm focus:border-brand-green outline-none font-medium"
                  placeholder="e.g. VIP Road, Vesu / Adajan Gam"
                />
              </div>
            </div>

            {/* Landmark (Optional) */}
            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                Landmark <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <i className="fa-solid fa-location-crosshairs text-xs"></i>
                </span>
                <input
                  type="text"
                  value={addressForm.landmark || ''}
                  onChange={e => setAddressForm({...addressForm, landmark: e.target.value})}
                  className="w-full border border-gray-200 pl-9 p-3 rounded-xl text-sm focus:border-brand-green outline-none font-medium"
                  placeholder="e.g. Near Textile Market / Opposite Central Mall"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider block mb-1.5">City</label>
                <input
                  type="text"
                  value={addressForm.city}
                  onChange={e => setAddressForm({ ...addressForm, city: e.target.value })}
                  className="w-full border border-gray-200 p-3 rounded-xl text-xs sm:text-sm focus:border-[#18753C] outline-none font-medium"
                  placeholder="City (e.g. Surat)"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider block mb-1.5">State</label>
                <input
                  type="text"
                  value={addressForm.state}
                  onChange={e => setAddressForm({ ...addressForm, state: e.target.value })}
                  className="w-full border border-gray-200 p-3 rounded-xl text-xs sm:text-sm focus:border-[#18753C] outline-none font-medium"
                  placeholder="State (e.g. Gujarat)"
                  required
                />
              </div>
            </div>

            <label className="flex items-center gap-2.5 text-xs pt-1 cursor-pointer font-bold text-gray-700 select-none">
              <input
                type="checkbox"
                checked={addressForm.isDefault}
                onChange={e => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                className="w-4 h-4 accent-[#18753C] rounded"
              />
              <span>Set as my default shipping address</span>
            </label>

            <div className="flex gap-3 justify-end pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => { setIsAddingAddress(false); setEditingAddressId(null); }}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold text-xs text-gray-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingAddress}
                className="px-6 py-2.5 bg-[#18753C] hover:bg-[#156030] text-white rounded-xl font-extrabold text-xs shadow-md transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingAddress ? 'Saving...' : 'Save Address'}
              </button>
            </div>
          </form>
        )}

        {/* Addresses Grid (2-column on desktop for optimal reading width) */}
        {addresses.length === 0 ? (
          <div className="bg-white rounded-3xl border border-gray-200/80 p-12 text-center text-gray-500 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-[#18753C] flex items-center justify-center text-2xl mx-auto mb-3">
              <i className="fa-solid fa-location-dot"></i>
            </div>
            <h3 className="font-extrabold text-base text-gray-900">No addresses saved yet</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto leading-relaxed">
              Add your delivery address in Surat for 14–45 min doorstep delivery.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {addresses.map(addr => {
              const serviceInfo = serviceabilityResults[addr.id];
              return (
                <div
                  key={addr.id}
                  className={`border rounded-2xl p-5 flex flex-col justify-between transition-all ${
                    addr.isDefault
                      ? 'border-[#18753C] bg-[#F5FBF7] shadow-xs'
                      : 'border-gray-200 bg-white shadow-xs hover:border-gray-300'
                  }`}
                >
                  <div className="space-y-2.5">
                    {/* Header Row: Type and Default Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-gray-900 text-sm sm:text-base">{addr.type}</span>
                        {addr.isDefault && (
                          <span className="bg-[#E8F5E9] text-[#18753C] text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-green-200">
                            DEFAULT
                          </span>
                        )}
                      </div>
                      {!addr.isDefault && (
                        <button
                          type="button"
                          disabled={settingDefaultId === addr.id || deletingAddressId === addr.id}
                          onClick={() => handleSetDefaultAddress(addr)}
                          className="text-[11px] text-gray-500 hover:text-[#18753C] font-bold underline cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {settingDefaultId === addr.id ? 'Updating...' : 'Set as Default'}
                        </button>
                      )}
                    </div>

                    {/* Address String */}
                    <p className="text-gray-700 text-xs sm:text-sm leading-relaxed">
                      {addr.address}, {addr.city}, {addr.state} - <span className="font-bold text-gray-900">{addr.zip}</span>
                    </p>

                    {/* Contact Person */}
                    <p className="text-gray-500 text-xs font-medium">
                      <i className="fa-solid fa-user text-[10px] mr-1.5 text-gray-400"></i>
                      {addr.recipientName || profile?.name || 'Customer'} &bull; {addr.phone || profile?.phone || '+91 98765 12340'}
                    </p>

                    {/* Serviceability Check Result / Button */}
                    <div className="pt-1">
                      {serviceInfo ? (
                        <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-emerald-200">
                          <i className="fa-solid fa-bolt text-emerald-600"></i>
                          <span>{serviceInfo.deliverySpeed} (Pincode {serviceInfo.pincode})</span>
                        </div>
                      ) : serviceabilityErrors[addr.id] ? (
                        <div className="inline-flex items-center gap-2 text-[11px] text-red-600 font-semibold">
                          <span>{serviceabilityErrors[addr.id]}</span>
                          <button
                            type="button"
                            disabled={checkingServiceabilityId === addr.id}
                            onClick={() => checkServiceability(addr.id)}
                            className="font-bold underline text-[#18753C] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {checkingServiceabilityId === addr.id ? 'Checking...' : 'Retry'}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={checkingServiceabilityId === addr.id}
                          onClick={() => checkServiceability(addr.id)}
                          className="text-[11px] font-bold text-[#18753C] hover:underline flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <i className="fa-solid fa-location-crosshairs text-[10px]"></i>
                          <span>{checkingServiceabilityId === addr.id ? 'Checking...' : 'Check Delivery Serviceability'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      disabled={deletingAddressId === addr.id}
                      onClick={() => {
                        setEditingAddressId(addr.id);
                        setAddressForm({
                          type: addr.type || 'Home',
                          recipientName: addr.recipientName || addr.recipient_name || '',
                          phone: addr.phone || '',
                          house_number: addr.house_number || '',
                          building_name: addr.building_name || '',
                          area_name: addr.area_name || '',
                          address: addr.address || addr.address_line || '',
                          landmark: addr.landmark || '',
                          city: addr.city || 'Surat',
                          state: addr.state || 'Gujarat',
                          zip: addr.zip || addr.pincode || '',
                          isDefault: Boolean(addr.isDefault || addr.is_default)
                        });
                        setIsAddingAddress(true);
                      }}
                      className="text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 px-3.5 py-1.5 rounded-xl transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={deletingAddressId === addr.id}
                      onClick={() => handleDeleteAddress(addr.id)}
                      className="text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 px-3.5 py-1.5 rounded-xl transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deletingAddressId === addr.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Render Settings & Profile View (Full-width structured layout)
  const renderProfile = () => (
    <div className="w-full space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200/60">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-gray-400 mb-1">
            <button
              type="button"
              onClick={() => setActiveView('dashboard')}
              className="hover:text-gray-700 cursor-pointer"
            >
              Dashboard
            </button>
            <span>/</span>
            <span className="text-gray-700">Settings &amp; Profile</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900">Settings &amp; Profile</h2>
          <p className="text-xs text-gray-500 mt-0.5">Manage your personal credentials, communication alerts and security</p>
        </div>
        <button
          type="button"
          onClick={() => setActiveView('dashboard')}
          className="text-xs font-bold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 px-3.5 py-2 rounded-xl transition cursor-pointer self-start sm:self-auto"
        >
          ← Back to Dashboard
        </button>
      </div>

      {/* Profile Avatar Selector Card */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-200/80 p-6">
        <h3 className="text-base font-extrabold text-gray-900 mb-1">Profile Avatar</h3>
        <p className="text-xs text-gray-500 mb-4">Select an avatar preset to customize your customer profile.</p>
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative">
            <img
              src={profile?.profile_picture_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
              alt="Current Avatar"
              className="w-16 h-16 rounded-full object-cover border-2 border-[#18753C] shadow-sm"
            />
            {updatingAvatar && (
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                <i className="fa-solid fa-spinner animate-spin text-white text-xs"></i>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
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
                disabled={updatingAvatar}
                onClick={() => handleUpdateAvatar(url)}
                className={`w-11 h-11 rounded-full overflow-hidden border-2 transition-all hover:scale-105 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  profile?.profile_picture_url === url ? 'border-[#18753C] ring-2 ring-[#18753C]/30 scale-105' : 'border-gray-200'
                }`}
                title={`Select Avatar ${idx + 1}`}
              >
                <img src={url} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Personal Information Form Card */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-200/80 p-6">
        <h3 className="text-base font-extrabold text-gray-900 mb-1">Personal Information</h3>
        <p className="text-xs text-gray-500 mb-5">Primary customer identity used for invoices and SMS tracking</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-600">Full Name</label>
            <input
              type="text"
              value={profileForm.name}
              onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
              className="border border-gray-200 p-3 rounded-xl focus:border-[#18753C] outline-none text-xs sm:text-sm text-gray-800 font-medium"
              placeholder="Full Name"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-600">Mobile Phone</label>
            <input
              type="text"
              value={profileForm.phone}
              onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
              className="border border-gray-200 p-3 rounded-xl focus:border-[#18753C] outline-none text-xs sm:text-sm text-gray-800 font-medium"
              placeholder="Phone Number"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-600">Email Address</label>
            <input
              type="email"
              value={profileForm.email}
              onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
              className="border border-gray-200 p-3 rounded-xl focus:border-[#18753C] outline-none text-xs sm:text-sm text-gray-800 font-medium"
              placeholder="Email Address"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-600">Preferred Language</label>
            <select className="border border-gray-200 p-3 rounded-xl bg-gray-50 text-xs sm:text-sm text-gray-800 outline-none font-medium">
              <option>English</option>
              <option>Gujarati</option>
              <option>Hindi</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notification Preferences Card */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-200/80 p-6">
        <h3 className="text-base font-extrabold text-gray-900 mb-1">Notification Preferences</h3>
        <p className="text-xs text-gray-500 mb-4">Configure channels for dispatch updates, soundbox and deals</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50/70 transition cursor-pointer select-none">
            <input
              type="checkbox"
              checked={notificationPrefs.order_updates_sms}
              onChange={() => setNotificationPrefs(p => ({ ...p, order_updates_sms: !p.order_updates_sms }))}
              className="w-4 h-4 mt-0.5 accent-[#18753C] rounded"
            />
            <div>
              <div className="text-xs font-bold text-gray-800">Order Updates (SMS &amp; Push)</div>
              <div className="text-[11px] text-gray-500 mt-0.5">Live rider tracking &amp; doorstep delivery notices</div>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50/70 transition cursor-pointer select-none">
            <input
              type="checkbox"
              checked={notificationPrefs.promotional_sms}
              onChange={() => setNotificationPrefs(p => ({ ...p, promotional_sms: !p.promotional_sms }))}
              className="w-4 h-4 mt-0.5 accent-[#18753C] rounded"
            />
            <div>
              <div className="text-xs font-bold text-gray-800">Promotional Offers</div>
              <div className="text-[11px] text-gray-500 mt-0.5">Flash deals &amp; weekend coupons from Surat stores</div>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50/70 transition cursor-pointer select-none">
            <input
              type="checkbox"
              checked={notificationPrefs.soundbox_alerts}
              onChange={() => setNotificationPrefs(p => ({ ...p, soundbox_alerts: !p.soundbox_alerts }))}
              className="w-4 h-4 mt-0.5 accent-[#18753C] rounded"
            />
            <div>
              <div className="text-xs font-bold text-gray-800">Soundbox &amp; In-app Alerts</div>
              <div className="text-[11px] text-gray-500 mt-0.5">Audio and popup chime upon payment and delivery</div>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50/70 transition cursor-pointer select-none">
            <input
              type="checkbox"
              checked={notificationPrefs.order_updates_email}
              onChange={() => setNotificationPrefs(p => ({ ...p, order_updates_email: !p.order_updates_email }))}
              className="w-4 h-4 mt-0.5 accent-[#18753C] rounded"
            />
            <div>
              <div className="text-xs font-bold text-gray-800">Email Tax Invoices</div>
              <div className="text-[11px] text-gray-500 mt-0.5">Monthly itemized receipts and order bills</div>
            </div>
          </label>
        </div>
      </div>

      {/* Security Actions Card */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-200/80 p-6">
        <h3 className="text-base font-extrabold text-gray-900 mb-1">Security &amp; Device Sessions</h3>
        <p className="text-xs text-gray-500 mb-4">Protect your account access and saved payment instruments</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => showToast('Password reset link sent to your registered email')}
            className="flex items-center gap-3 text-xs text-gray-700 bg-gray-50 hover:bg-gray-100 p-3.5 rounded-xl transition text-left font-bold cursor-pointer border border-gray-200/60"
          >
            <i className="fa-solid fa-key text-[#18753C] text-sm"></i>
            <div>
              <div>Change Password</div>
              <div className="text-[10px] text-gray-400 font-normal">Sent to registered email</div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => showToast('Two-factor authentication is currently enabled via SMS')}
            className="flex items-center gap-3 text-xs text-gray-700 bg-gray-50 hover:bg-gray-100 p-3.5 rounded-xl transition text-left font-bold cursor-pointer border border-gray-200/60"
          >
            <i className="fa-solid fa-shield-halved text-emerald-600 text-sm"></i>
            <div>
              <div>Two-Factor Auth</div>
              <div className="text-[10px] text-emerald-600 font-normal">Enabled via SMS OTP</div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => showToast('All active sessions are verified on this device')}
            className="flex items-center gap-3 text-xs text-gray-700 bg-gray-50 hover:bg-gray-100 p-3.5 rounded-xl transition text-left font-bold cursor-pointer border border-gray-200/60"
          >
            <i className="fa-solid fa-laptop text-blue-600 text-sm"></i>
            <div>
              <div>Active Sessions</div>
              <div className="text-[10px] text-gray-400 font-normal">This desktop browser</div>
            </div>
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => setActiveView('dashboard')}
          className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold text-xs text-gray-700 transition cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={savingProfile}
          onClick={async (e) => {
            const ok = await handleUpdateProfile(e);
            if (ok) setActiveView('dashboard');
          }}
          className="bg-[#18753C] hover:bg-[#156030] text-white px-7 py-2.5 rounded-xl font-extrabold text-xs shadow-sm transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {savingProfile ? (
            <>
              <i className="fa-solid fa-spinner animate-spin text-xs"></i>
              <span>Saving...</span>
            </>
          ) : (
            <span>Save Changes</span>
          )}
        </button>
      </div>
    </div>
  );

  // Render Placeholder / Coming Soon View
  const renderPlaceholder = () => (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between pb-2 border-b border-gray-200/60">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-gray-400 mb-1">
            <button
              type="button"
              onClick={() => setActiveView('dashboard')}
              className="hover:text-gray-700 cursor-pointer"
            >
              Dashboard
            </button>
            <span>/</span>
            <span className="text-gray-700">{placeholderTitle}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900">{placeholderTitle}</h2>
        </div>
        <button
          type="button"
          onClick={() => setActiveView('dashboard')}
          className="text-xs font-bold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 px-3.5 py-2 rounded-xl transition cursor-pointer"
        >
          ← Return to Dashboard
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-xs border border-gray-200/80 p-12 text-center">
        <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-[#18753C] mx-auto mb-4 text-2xl">
          <i className="fa-solid fa-clock-rotate-left"></i>
        </div>
        <h3 className="text-lg font-black text-gray-900 mb-2">{placeholderTitle}</h3>
        <p className="text-gray-500 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">{placeholderText}</p>
        <button
          type="button"
          onClick={() => setActiveView('dashboard')}
          className="mt-6 px-6 py-2.5 bg-[#18753C] hover:bg-[#156030] text-white text-xs font-extrabold rounded-xl transition cursor-pointer"
        >
          Back to Overview
        </button>
      </div>
    </div>
  );

  return (
    <div className="w-full relative pb-12">
      {/* Top Breadcrumb & Mobile Drawer Header Bar */}
      <div className="w-full max-w-7xl 2xl:max-w-[1520px] mx-auto mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Customer Dashboard</h1>
        </div>

        {/* Mobile / Tablet Drawer Toggle Button */}
        <button
          type="button"
          onClick={() => setIsSidebarOpen(true)}
          className="lg:hidden px-3 py-2 bg-white border border-gray-200 rounded-xl flex items-center gap-2 text-xs font-bold text-gray-700 shadow-xs hover:bg-gray-50 transition cursor-pointer"
          title="Account Menu"
          aria-label="Account Menu"
        >
          <i className="fa-solid fa-bars text-sm"></i>
          <span>Menu</span>
        </button>
      </div>

      {/* Main Full-Width Dashboard Composition */}
      <div className="w-full max-w-7xl 2xl:max-w-[1520px] mx-auto flex flex-col lg:flex-row gap-6 xl:gap-8 items-start">
        {/* Left Column: Persistent Desktop Navigation Rail */}
        <aside className="hidden lg:flex flex-col w-72 xl:w-80 shrink-0 sticky top-24 space-y-4">
          {renderSidebarContent()}
        </aside>

        {/* Right Column: Main Dashboard Workspace */}
        <main className="flex-1 min-w-0 w-full">
          {activeView === 'dashboard' && renderDashboard()}
          {activeView === 'addresses' && renderAddresses()}
          {activeView === 'profile' && renderProfile()}
          {activeView === 'placeholder' && renderPlaceholder()}
        </main>
      </div>

      {/* Mobile Drawer Menu (Visible only when triggered on mobile/tablet) */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsSidebarOpen(false)}
          ></div>

          {/* Drawer Container */}
          <div className="relative w-80 max-w-[85vw] h-full bg-[#F8FAFC] shadow-2xl flex flex-col p-4 overflow-y-auto space-y-4 transform transition-transform duration-300">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <div className="text-xs font-black uppercase tracking-wider text-gray-400">Account Menu</div>
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-600 hover:text-black transition"
              >
                <i className="fa-solid fa-times"></i>
              </button>
            </div>
            {renderSidebarContent()}
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full text-white text-xs font-extrabold shadow-xl transition-all duration-300 flex items-center gap-2 ${
          toast.type === 'error' ? 'bg-red-600' : 'bg-[#18753C]'
        }`}>
          <i className={`fa-solid ${toast.type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check'}`}></i>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
