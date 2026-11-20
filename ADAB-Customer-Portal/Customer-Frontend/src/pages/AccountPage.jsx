import { useCallback, useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../api/api';
import { RewardAPI, AuthAPI, CustomerAPI } from '../services/api';
import { lookupPincode, getOfflinePincodeHint } from '../utils/pincode';
import AccountSidebar from '../components/AccountSidebar';

let accountDataCache = null;

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150'
];

// eslint-disable-next-line react-refresh/only-export-components
export function clearAccountCache() {
  accountDataCache = null;
}

export default function AccountPage({
  onNavigate,
  currentUser,
  onUpdateCurrentUser,
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
  const [pendingAvatar, setPendingAvatar] = useState(null); // { type: 'file' | 'preset' | 'remove', file, previewUrl, url }
  const fileInputRef = useRef(null);
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
  const location = useLocation();
  const [activeView, setActiveView] = useState(() => location.state?.view || 'dashboard');
  const [placeholderText, setPlaceholderText] = useState(() => location.state?.placeholderText || '');
  const [placeholderTitle, setPlaceholderTitle] = useState(() => location.state?.placeholderTitle || 'Under Construction');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showSidebarOnDashboard, setShowSidebarOnDashboard] = useState(false);
  const [toast, setToast] = useState(null);

  // Synchronize incoming navigation state (e.g. from AccountSidebar on a shared page)
  useEffect(() => {
    if (location.state?.view) {
      setActiveView(location.state.view);
      if (location.state.placeholderText) {
        setPlaceholderText(location.state.placeholderText);
      }
      if (location.state.placeholderTitle) {
        setPlaceholderTitle(location.state.placeholderTitle);
      }
    }
  }, [location.state]);

  // Automatically scroll window to top whenever active view/tab changes inside Account
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [activeView]);

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
    city: '',
    state: '',
    zip: '',
    isDefault: false
  });
  const [serviceabilityResults, setServiceabilityResults] = useState({});

  // Password Reset Modal State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordStep, setPasswordStep] = useState('confirm'); // 'confirm' | 'otp_form' | 'success'
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [sendingResetOtp, setSendingResetOtp] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [demoOtpHint, setDemoOtpHint] = useState('');

  const handleOpenPasswordModal = () => {
    let defaultEmail = profile?.email || profileForm.email || currentUser?.email || '';
    if (!defaultEmail && typeof localStorage !== 'undefined') {
      try {
        const u = JSON.parse(localStorage.getItem('adab_user') || '{}');
        defaultEmail = u.email || '';
      } catch {
        // ignore
      }
    }
    setResetEmail(defaultEmail);
    setResetOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setPasswordSuccess('');
    setDemoOtpHint('');
    setPasswordStep('confirm');
    setIsPasswordModalOpen(true);
  };

  const handleSendPasswordResetOtp = async (targetEmail) => {
    const emailToSend = (targetEmail || resetEmail || '').trim();
    if (!emailToSend) {
      setPasswordError('Please enter your registered email address.');
      return;
    }
    setSendingResetOtp(true);
    setPasswordError('');
    setPasswordSuccess('');
    try {
      const res = await AuthAPI.forgotPassword(emailToSend);
      if (res && res.success) {
        setPasswordSuccess(res.message || `Password reset code sent to ${emailToSend}!`);
        if (res.otp) {
          setDemoOtpHint(`Your OTP is: ${res.otp}`);
        }
        setPasswordStep('otp_form');
        showToast(`Verification code sent to ${emailToSend}!`);
      } else {
        setPasswordError(res?.message || 'Failed to send password reset code. Please check your email.');
      }
    } catch (err) {
      console.error('Password reset request error:', err);
      setPasswordError(err.message || 'Unable to send password reset code. Please verify your email.');
    } finally {
      setSendingResetOtp(false);
    }
  };

  const handleConfirmPasswordReset = async (e) => {
    if (e) e.preventDefault();
    setPasswordError('');
    if (!resetOtp.trim()) {
      setPasswordError('Please enter the 6-digit verification code.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match. Please re-enter.');
      return;
    }

    setResettingPassword(true);
    try {
      const res = await AuthAPI.resetPassword(resetEmail.trim(), resetOtp.trim(), newPassword);
      if (res && res.success) {
        setPasswordStep('success');
        setPasswordSuccess('✓ Password updated successfully! Your new password is now active.');
        showToast('✓ Password updated successfully!');
        setTimeout(() => {
          setIsPasswordModalOpen(false);
        }, 2200);
      } else {
        setPasswordError(res?.message || 'Password update failed. Invalid or expired verification code.');
      }
    } catch (err) {
      console.error('Password update error:', err);
      setPasswordError(err.message || 'Failed to update password. Please check your verification code.');
    } finally {
      setResettingPassword(false);
    }
  };

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

  // Clean up blob preview URLs on unmount or when pending avatar changes
  useEffect(() => {
    return () => {
      if (pendingAvatar?.previewUrl && pendingAvatar.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(pendingAvatar.previewUrl);
      }
    };
  }, [pendingAvatar]);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type: JPG, JPEG, PNG, WebP
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const lowerName = file.name.toLowerCase();
    const hasValidExt = lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg') || lowerName.endsWith('.png') || lowerName.endsWith('.webp');
    if (!allowedTypes.includes(file.type) && !hasValidExt) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      showToast('Please select a JPG, JPEG, PNG, or WebP image.', 'error');
      return;
    }

    // Validate size: max 2 MB
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      showToast('Image size exceeds 2 MB limit. Please select a smaller photo.', 'error');
      return;
    }

    // Revoke previous blob preview if any
    if (pendingAvatar?.previewUrl && pendingAvatar.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(pendingAvatar.previewUrl);
    }

    const previewUrl = URL.createObjectURL(file);
    setPendingAvatar({
      type: 'file',
      file,
      previewUrl
    });
    showToast('Photo selected! Click "Save Changes" below to update your profile.', 'success');
  };

  const handleSelectPreset = (url) => {
    if (pendingAvatar?.previewUrl && pendingAvatar.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(pendingAvatar.previewUrl);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
    setPendingAvatar({
      type: 'preset',
      url
    });
  };

  const handleRemovePhoto = () => {
    if (pendingAvatar?.previewUrl && pendingAvatar.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(pendingAvatar.previewUrl);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
    setPendingAvatar({
      type: 'remove'
    });
    showToast('Photo removed in preview. Click "Save Changes" to confirm.', 'info');
  };

  const handleResetAvatar = () => {
    if (pendingAvatar?.previewUrl && pendingAvatar.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(pendingAvatar.previewUrl);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
    setPendingAvatar(null);
  };

  const handleUpdateProfile = async (e) => {
    if (e) e.preventDefault();
    if (actionInFlightRef.current.profile) return false;
    actionInFlightRef.current.profile = true;
    setSavingProfile(true);

    try {
      const payload = { ...profileForm };

      // Deferred avatar upload / persistence on profile save
      if (pendingAvatar) {
        if (pendingAvatar.type === 'file') {
          showToast('Uploading photo to secure Cloudinary storage...', 'info');
          const uploadRes = await CustomerAPI.uploadImageToCloudinary(pendingAvatar.file);
          payload.avatarUrl = uploadRes.avatarUrl;
          payload.publicId = uploadRes.publicId;
        } else if (pendingAvatar.type === 'preset') {
          payload.avatarUrl = pendingAvatar.url;
          payload.publicId = null;
        } else if (pendingAvatar.type === 'remove') {
          payload.removeAvatar = true;
        }
      }

      const res = await api.patch('/customers/me', payload);
      const notifRes = await api.patch('/customers/me/notification-preferences', notificationPrefs);

      if (!isMountedRef.current) return false;

      if (res.data?.success && notifRes.data?.success) {
        const updatedProfile = res.data.data;
        setProfile(updatedProfile);

        if (pendingAvatar?.previewUrl && pendingAvatar.previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(pendingAvatar.previewUrl);
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
        setPendingAvatar(null);

        try {
          const raw = localStorage.getItem('adab_user');
          const existing = raw ? JSON.parse(raw) : {};
          const syncedUser = {
            ...existing,
            name: updatedProfile.name || updatedProfile.full_name || existing.name,
            phone: updatedProfile.phone || existing.phone,
            email: updatedProfile.email || existing.email,
            profile_picture_url: updatedProfile.profile_picture_url || updatedProfile.avatarUrl || null,
            avatar_url: updatedProfile.avatar_url || updatedProfile.profile_picture_url || null
          };
          localStorage.setItem('adab_user', JSON.stringify(syncedUser));
          if (onUpdateCurrentUser) {
            onUpdateCurrentUser(syncedUser);
          }
        } catch {
          // Ignore state sync errors if unmounted
        }

        if (accountDataCache) {
          accountDataCache.profile = updatedProfile;
          accountDataCache.notifications = notificationPrefs;
        }

        showToast('Profile and preferences updated successfully!', 'success');
        return true;
      } else {
        showToast('Failed to update profile or preferences', 'error');
        return false;
      }
    } catch (err) {
      console.error('Update profile error:', err);
      if (isMountedRef.current) {
        showToast(err.response?.data?.message || err.message || 'An error occurred while updating profile', 'error');
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
          city: activeAddress?.city || '',
          state: activeAddress?.state || '',
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
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
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

  // Derive customer's active region dynamically from database addresses, selected address, or profile
  const savedSelectedAddress = (() => {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('adab_selected_address') : null;
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  })();

  const activeAddress = addresses.find(a => a.isDefault || a.is_default) || addresses[0] || savedSelectedAddress;

  const displayRegion = (() => {
    if (activeAddress?.city && activeAddress?.state) {
      return `${activeAddress.city}, ${activeAddress.state}`;
    }
    if (activeAddress?.city) {
      return activeAddress.city;
    }
    if (profile?.city && profile?.state) {
      return `${profile.city}, ${profile.state}`;
    }
    if (profile?.city) {
      return profile.city;
    }
    if (effectiveUser?.city && effectiveUser?.state) {
      return `${effectiveUser.city}, ${effectiveUser.state}`;
    }
    if (effectiveUser?.city) {
      return effectiveUser.city;
    }
    if (activeAddress?.pincode || activeAddress?.zip) {
      return `PIN ${activeAddress.pincode || activeAddress.zip}`;
    }
    return '';
  })();

  const activeAvatarUrl = pendingAvatar
    ? (pendingAvatar.type === 'file'
        ? pendingAvatar.previewUrl
        : (pendingAvatar.type === 'preset' ? pendingAvatar.url : null))
    : (profile?.profile_picture_url || null);

  // Loading skeleton - desktop-first responsive
  if (loading) {
    return (
      <div className="w-full max-w-7xl 2xl:max-w-[1520px] mx-auto py-2 animate-pulse">
        <div className="flex flex-col lg:flex-row gap-4 xl:gap-6 items-start">
          {/* Sidebar Skeleton */}
          <div className="hidden lg:flex flex-col w-64 xl:w-72 shrink-0 space-y-3">
            <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-gray-200 rounded-xl shrink-0"></div>
                <div className="space-y-1.5 flex-1">
                  <div className="h-3.5 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-2.5 bg-gray-100 rounded w-1/2"></div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-3 space-y-2 shadow-2xs">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-8 bg-gray-100 rounded-lg"></div>
              ))}
            </div>
          </div>

          {/* Main Content Skeleton */}
          <div className="flex-1 min-w-0 w-full space-y-4">
            <div className="h-36 bg-gray-200 rounded-2xl"></div>
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-xl"></div>
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

  // Render Account Sidebar using unified AccountSidebar component
  const renderSidebar = () => (
    <AccountSidebar
      currentUser={currentUser}
      profile={profile}
      avatarUrl={activeAvatarUrl}
      addresses={addresses}
      ordersCount={displayOrders}
      points={displayPoints}
      walletBalance={displayWallet}
      unreadNotifications={displayUnreadNotifications}
      activeTab="account"
      activeView={activeView}
      placeholderTitle={placeholderTitle}
      onNavigate={onNavigate}
      onSelectView={(v) => {
        setActiveView(v);
        setIsSidebarOpen(false);
      }}
      showPlaceholder={(text, title) => {
        showPlaceholder(text, title);
        setIsSidebarOpen(false);
      }}
      onLogout={onLogout}
      onOpenLogin={onOpenLogin}
      onCloseSidebar={() => setIsSidebarOpen(false)}
      showToast={showToast}
    />
  );

  // Render Dashboard Overview
  const renderDashboard = () => {
    const allFeatures = [
      {
        id: 'addresses',
        title: 'Delivery Addresses',
        subtitle: 'Saved doorstep locations with PIN geocoding',
        badge: `${addresses.length} Saved`,
        badgeColor: 'bg-red-50 text-red-600 border border-red-200',
        icon: 'fa-location-dot',
        iconColor: 'text-red-500',
        iconBg: 'bg-red-50',
        onClick: () => setActiveView('addresses')
      },
      {
        id: 'profile',
        title: 'Profile & Security',
        subtitle: 'Personal details, avatar & account password',
        badge: 'Photo & PW',
        badgeColor: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
        icon: 'fa-user-shield',
        iconColor: 'text-indigo-600',
        iconBg: 'bg-indigo-50',
        onClick: () => setActiveView('profile')
      },
      {
        id: 'orders',
        title: 'My Orders',
        subtitle: 'Live 14–45 min orders & digital tax invoices',
        badge: displayOrders > 0 ? `${displayOrders} Placed` : null,
        badgeColor: 'bg-blue-50 text-blue-700 border border-blue-200',
        icon: 'fa-box',
        iconColor: 'text-blue-600',
        iconBg: 'bg-blue-50',
        onClick: () => onNavigate && onNavigate('orders', { state: { fromAccount: true } })
      },
      {
        id: 'rewards',
        title: 'ADAB Rewards',
        subtitle: 'Earn coins & redeem for direct rupee discounts',
        badge: `${Number(displayPoints).toLocaleString('en-IN')} Coins`,
        badgeColor: 'bg-amber-50 text-amber-800 border border-amber-200',
        icon: 'fa-star',
        iconColor: 'text-amber-500',
        iconBg: 'bg-amber-50',
        onClick: () => onNavigate && onNavigate('points', { state: { fromAccount: true } })
      },
      {
        id: 'wallet',
        title: 'ADAB Wallet',
        subtitle: 'Pre-funded balance for 1-click checkout & refunds',
        badge: `₹${Number(displayWallet).toLocaleString('en-IN')}`,
        badgeColor: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
        icon: 'fa-wallet',
        iconColor: 'text-[#18753C]',
        iconBg: 'bg-emerald-50',
        onClick: () => showPlaceholder('ADAB Wallet: Instant checkout balance & transaction history.', 'ADAB Wallet')
      },
      {
        id: 'payments',
        title: 'Payment Methods',
        subtitle: 'Manage saved credit/debit cards & UPI IDs',
        badge: 'Cards & UPI',
        badgeColor: 'bg-blue-50 text-blue-700 border border-blue-200',
        icon: 'fa-credit-card',
        iconColor: 'text-blue-600',
        iconBg: 'bg-blue-50',
        onClick: () => showPlaceholder('Payment Methods: Manage your saved credit/debit cards, UPI IDs, and preferred payment gateways.', 'Payment Methods')
      },
      {
        id: 'coupons',
        title: 'Coupons & Pay Later',
        subtitle: 'Store promo codes & 0% EMI partner credit',
        badge: '0% EMI Deals',
        badgeColor: 'bg-orange-50 text-orange-700 border border-orange-200',
        icon: 'fa-tag',
        iconColor: 'text-orange-500',
        iconBg: 'bg-orange-50',
        onClick: () => showPlaceholder('Coupons & Credit Line: View available store discount codes and instant credit limit.', 'Coupons & Credit')
      },
      {
        id: 'wishlist',
        title: 'Saved Wishlist',
        subtitle: 'Curated favourite groceries, dairy & bakery staples',
        badge: null,
        badgeColor: '',
        icon: 'fa-heart',
        iconColor: 'text-pink-500',
        iconBg: 'bg-pink-50',
        onClick: () => onNavigate && onNavigate('wishlist', { state: { fromAccount: true } })
      },
      {
        id: 'returns',
        title: 'Returns & Refunds',
        subtitle: 'Instant replacements & doorstep refund tracking',
        badge: null,
        badgeColor: '',
        icon: 'fa-rotate-left',
        iconColor: 'text-purple-600',
        iconBg: 'bg-purple-50',
        onClick: () => onNavigate && onNavigate('returns', { state: { fromAccount: true } })
      },
      {
        id: 'reviews',
        title: 'My Reviews',
        subtitle: 'Rate purchases, review stores & share feedback',
        badge: 'Ratings & Photos',
        badgeColor: 'bg-amber-50 text-amber-700 border border-amber-200',
        icon: 'fa-star-half-stroke',
        iconColor: 'text-amber-600',
        iconBg: 'bg-amber-50',
        onClick: () => onNavigate && onNavigate('reviews', { state: { fromAccount: true } })
      },
      {
        id: 'support',
        title: 'Help & Support',
        subtitle: '24/7 dedicated support team, chat & FAQs',
        badge: '24/7 Active',
        badgeColor: 'bg-teal-50 text-teal-700 border border-teal-200',
        icon: 'fa-headset',
        iconColor: 'text-teal-600',
        iconBg: 'bg-teal-50',
        onClick: () => onNavigate && onNavigate('help', { state: { fromAccount: true } })
      },
      {
        id: 'merchant',
        title: 'Sell on ADAB',
        subtitle: 'Connect your neighbourhood store with 10k+ shoppers',
        badge: 'Merchant Portal',
        badgeColor: 'bg-[#18753C] text-white',
        icon: 'fa-store',
        iconColor: 'text-[#18753C]',
        iconBg: 'bg-emerald-50',
        onClick: () => showToast('Redirecting to ADAB Seller Portal...')
      }
    ];

    return (
      <div className="space-y-5 w-full">
        {/* 1. Guest Sign In Callout (if unauthenticated) */}
        {!isLoggedIn && (
          <div className="bg-gradient-to-r from-emerald-50 via-green-50 to-emerald-100/60 border border-emerald-200/80 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-3.5 shadow-2xs">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[#18753C] text-white flex items-center justify-center text-xl shrink-0 shadow-2xs">
                <i className="fa-solid fa-user-lock"></i>
              </div>
              <div>
                <h3 className="font-extrabold text-gray-900 text-sm sm:text-base">Log in to your ADAB account</h3>
                <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                  Save delivery addresses, track live orders, redeem reward points & unlock 0% credit.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenLogin ? onOpenLogin() : (onNavigate && onNavigate('login'))}
              className="w-full md:w-auto px-5 py-2.5 bg-[#18753C] hover:bg-[#156030] text-white font-extrabold text-xs rounded-xl shadow-2xs transition-all shrink-0 cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Login / Register</span>
              <i className="fa-solid fa-arrow-right text-[10px]"></i>
            </button>
          </div>
        )}

        {/* 2. Executive Hero Welcome Banner */}
        <div className="bg-gradient-to-br from-[#064E3B] via-[#0E6C3B] to-[#15803D] rounded-2xl sm:rounded-3xl p-5 sm:p-6 text-white shadow-md relative overflow-hidden">
          {/* Decorative background accents */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full blur-2xl pointer-events-none -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 right-1/4 w-36 h-36 bg-emerald-400/10 rounded-full blur-xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-5">
            <div className="flex items-center gap-3.5 sm:gap-4.5">
              <div
                onClick={() => setActiveView('profile')}
                title="Click to edit avatar"
                className="w-15 h-15 sm:w-18 sm:h-18 bg-white/15 hover:bg-white/25 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl font-black text-white overflow-hidden shadow-inner shrink-0 cursor-pointer border border-white/20 transition-all hover:scale-105"
              >
                {activeAvatarUrl ? (
                  <img
                    src={activeAvatarUrl}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  displayInitial
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight truncate">{displayName}</h2>
                  {effectiveUser?.loyalty_tier && (
                    <span className="bg-white/20 backdrop-blur-md border border-white/30 text-emerald-100 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-2xs">
                      <i className="fa-solid fa-sparkles text-[8px] text-amber-300"></i>
                      {effectiveUser.loyalty_tier} MEMBER
                    </span>
                  )}
                  <span className="bg-emerald-500/20 text-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-400/20 hidden sm:inline-flex items-center gap-1">
                    <i className="fa-solid fa-circle-check text-[9px] text-emerald-300"></i>
                    {activeAddress?.city ? `${activeAddress.city} Account` : 'Verified Account'}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-emerald-100/90 mt-0.5 font-medium truncate">
                  {displayPhone ? `${displayPhone} • ` : ''}{displayEmail || 'ADAB Customer Account'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-stretch sm:self-auto justify-end shrink-0">
              <button
                type="button"
                onClick={() => setActiveView('profile')}
                className="bg-white/15 hover:bg-white/25 transition-all text-white text-xs sm:text-sm font-extrabold py-2 px-3.5 rounded-xl border border-white/25 cursor-pointer backdrop-blur-md flex items-center gap-2 shadow-2xs"
              >
                <i className="fa-solid fa-pen-to-square text-xs"></i>
                <span>Edit Profile</span>
              </button>
              {isLoggedIn && onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="bg-black/20 hover:bg-black/30 transition-all text-white text-xs sm:text-sm font-bold py-2 px-3.5 rounded-xl border border-white/15 cursor-pointer flex items-center gap-2 shadow-2xs"
                  title="Sign Out"
                >
                  <i className="fa-solid fa-arrow-right-from-bracket text-xs"></i>
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              )}
            </div>
          </div>

          {/* Metric Cards Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-4 pt-4 border-t border-white/20 relative z-10">
            {/* 1. Orders */}
            <div
              onClick={() => onNavigate && onNavigate('orders', { state: { fromAccount: true } })}
              className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-2xl p-3.5 sm:p-4 transition-all cursor-pointer group hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] sm:text-xs text-emerald-100 font-extrabold uppercase tracking-wider">Orders</span>
                <i className="fa-solid fa-arrow-up-right-from-square text-xs text-emerald-200/80 group-hover:text-white transition-colors"></i>
              </div>
              <div className="text-2xl sm:text-3xl font-black mt-1">{displayOrders}</div>
              <div className="text-xs text-emerald-200 mt-1 font-medium truncate">
                {displayOrders > 0 ? 'Track live shipments' : 'Start your first order'}
              </div>
            </div>

            {/* 2. Points */}
            <div
              onClick={() => onNavigate && onNavigate('points', { state: { fromAccount: true } })}
              className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-2xl p-3.5 sm:p-4 transition-all cursor-pointer group hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] sm:text-xs text-emerald-100 font-extrabold uppercase tracking-wider">Reward Points</span>
                <i className="fa-solid fa-sparkles text-xs text-amber-300"></i>
              </div>
              <div className="text-2xl sm:text-3xl font-black mt-1">{Number(displayPoints).toLocaleString('en-IN')}</div>
              <div className="text-xs text-emerald-200 mt-1 font-medium truncate">
                Worth ₹{Math.floor(displayPoints / 10)} • Redeem
              </div>
            </div>

            {/* 3. Wallet */}
            <div
              onClick={() => showPlaceholder('ADAB Wallet: Instant checkout balance & transaction history.', 'ADAB Wallet')}
              className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-2xl p-3.5 sm:p-4 transition-all cursor-pointer group hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] sm:text-xs text-emerald-100 font-extrabold uppercase tracking-wider">ADAB Wallet</span>
                <i className="fa-solid fa-wallet text-xs text-emerald-200/80 group-hover:text-white transition-colors"></i>
              </div>
              <div className="text-2xl sm:text-3xl font-black mt-1">₹{Number(displayWallet).toLocaleString('en-IN')}</div>
              <div className="text-xs text-emerald-200 mt-1 font-medium truncate">
                Instant 1-click checkout
              </div>
            </div>

            {/* 4. Notifications */}
            <div
              onClick={() => onNavigate && onNavigate('notifications', { state: { fromAccount: true } })}
              className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-2xl p-3.5 sm:p-4 transition-all cursor-pointer group hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] sm:text-xs text-emerald-100 font-extrabold uppercase tracking-wider">Alerts</span>
                <i className="fa-solid fa-bell text-xs text-emerald-200/80 group-hover:text-white transition-colors"></i>
              </div>
              <div className="text-2xl sm:text-3xl font-black mt-1">{displayUnreadNotifications}</div>
              <div className="text-xs text-emerald-200 mt-1 font-medium truncate">
                {displayUnreadNotifications > 0 ? `${displayUnreadNotifications} unread updates` : 'All caught up'}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Clean, Spacious 12-Service Grid (3 Columns on Desktop, Comfortable & Readable) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4.5 pt-1">
          {allFeatures.map(item => (
            <div
              key={item.id}
              onClick={item.onClick}
              className="bg-white border border-gray-200/90 hover:border-[#18753C] hover:shadow-md p-4.5 sm:p-5 rounded-2xl transition-all cursor-pointer flex items-center justify-between gap-3.5 group hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <div className={`w-12 h-12 sm:w-13 sm:h-13 rounded-2xl flex items-center justify-center text-xl sm:text-2xl shrink-0 group-hover:scale-105 transition-transform ${item.iconBg} ${item.iconColor}`}>
                  <i className={`fa-solid ${item.icon}`}></i>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-black text-gray-900 text-sm sm:text-base group-hover:text-[#18753C] transition-colors truncate">
                      {item.title}
                    </span>
                    {item.badge && (
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-1 leading-snug">
                    {item.subtitle}
                  </p>
                </div>
              </div>
              <i className="fa-solid fa-arrow-right text-gray-300 text-xs group-hover:text-[#18753C] group-hover:translate-x-1 transition-transform shrink-0"></i>
            </div>
          ))}
        </div>
      </div>
    );
  };

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
            Please log in or create an account to view, save and manage your delivery addresses.
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
      <div className="w-full space-y-4">
        {/* Addresses View Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-gray-200/60">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 mb-0.5">
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
            <h2 className="text-lg sm:text-xl font-black text-gray-900">
              Delivery Addresses <span className="text-xs text-gray-500 font-semibold">({addresses.length} saved)</span>
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setActiveView('dashboard'); setIsAddingAddress(false); setEditingAddressId(null); }}
              className="text-xs sm:text-sm font-bold text-gray-700 hover:text-gray-950 bg-white border border-gray-200 px-3.5 py-2 rounded-xl transition cursor-pointer"
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
                    city: activeAddress?.city || '',
                    state: activeAddress?.state || '',
                    zip: '',
                    isDefault: false
                  });
                }}
                className="px-4 py-2 bg-[#18753C] hover:bg-[#156030] text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-xs transition cursor-pointer flex items-center gap-2"
              >
                <i className="fa-solid fa-plus text-xs"></i>
                <span>Add Address</span>
              </button>
            )}
          </div>
        </div>

        {/* Add / Edit Address Form Modal/Card */}
        {isAddingAddress && (
          <form onSubmit={handleSaveAddress} className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border-2 border-[#18753C] shadow-sm space-y-4 animate-fade-in">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-black text-base sm:text-lg text-gray-900">{editingAddressId ? 'Edit Delivery Address' : 'Add New Delivery Address'}</h3>
                <p className="text-xs text-gray-500 mt-0.5">Enter accurate recipient and landmark details for fast delivery</p>
              </div>
              <button
                type="button"
                onClick={() => { setIsAddingAddress(false); setEditingAddressId(null); }}
                className="text-gray-400 hover:text-gray-700 text-xs sm:text-sm font-bold px-3 py-1.5 rounded-xl hover:bg-gray-100 transition cursor-pointer"
              >
                ✕ Cancel
              </button>
            </div>

            {/* 2-Column Responsive Form Layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1.5">Address Type</label>
                <select
                  value={addressForm.type}
                  onChange={e => setAddressForm({ ...addressForm, type: e.target.value })}
                  className="w-full border border-gray-200 p-2.5 sm:p-3 rounded-xl text-xs sm:text-sm focus:border-[#18753C] outline-none bg-white font-semibold"
                >
                  <option value="Home">Home (Personal)</option>
                  <option value="Office">Office / Business</option>
                  <option value="Other">Other / Relative</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1.5">Recipient Name</label>
                <input
                  type="text"
                  value={addressForm.recipientName}
                  onChange={e => setAddressForm({ ...addressForm, recipientName: e.target.value })}
                  className="w-full border border-gray-200 p-2.5 sm:p-3 rounded-xl text-xs sm:text-sm focus:border-[#18753C] outline-none font-medium"
                  placeholder="Full Name"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1.5">Mobile Number</label>
                <input
                  type="tel"
                  value={addressForm.phone}
                  onChange={e => setAddressForm({ ...addressForm, phone: e.target.value })}
                  className="w-full border border-gray-200 p-2.5 sm:p-3 rounded-xl text-xs sm:text-sm focus:border-[#18753C] outline-none font-medium"
                  placeholder="10-digit Phone Number"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1.5">Pincode</label>
                <input
                  type="text"
                  maxLength={6}
                  value={addressForm.zip}
                  onChange={e => handleAddressPincodeChange(e.target.value)}
                  className="w-full border border-gray-200 p-2.5 sm:p-3 rounded-xl text-xs sm:text-sm focus:border-[#18753C] outline-none font-mono font-bold"
                  placeholder="6-digit PIN"
                  required
                />
                {pinHint && (
                  <p className="text-xs text-[#18753C] font-semibold mt-1.5 flex items-center gap-1.5 truncate">
                    <i className="fa-solid fa-location-dot"></i> {pinHint}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1.5">City</label>
                <input
                  type="text"
                  value={addressForm.city}
                  onChange={e => setAddressForm({ ...addressForm, city: e.target.value })}
                  className="w-full border border-gray-200 p-2.5 sm:p-3 rounded-xl text-xs sm:text-sm focus:border-[#18753C] outline-none font-medium"
                  placeholder="City"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1.5">State</label>
                <input
                  type="text"
                  value={addressForm.state}
                  onChange={e => setAddressForm({ ...addressForm, state: e.target.value })}
                  className="w-full border border-gray-200 p-2.5 sm:p-3 rounded-xl text-xs sm:text-sm focus:border-[#18753C] outline-none font-medium"
                  placeholder="State"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1.5">
                  House / Flat / Block No <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={addressForm.house_number || ''}
                  onChange={e => setAddressForm({...addressForm, house_number: e.target.value})}
                  className="w-full border border-gray-200 p-2.5 sm:p-3 rounded-xl text-xs sm:text-sm focus:border-[#18753C] outline-none font-medium"
                  placeholder="e.g. Flat 502, 5th Floor / House 12"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1.5">
                  Building / Society / Apartment Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={addressForm.building_name || ''}
                  onChange={e => setAddressForm({...addressForm, building_name: e.target.value})}
                  className="w-full border border-gray-200 p-2.5 sm:p-3 rounded-xl text-xs sm:text-sm focus:border-[#18753C] outline-none font-medium"
                  placeholder="e.g. Orchid Heights / Shivalik Residency"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1.5">
                  Area / Locality / Street <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={addressForm.area_name || ''}
                  onChange={e => setAddressForm({...addressForm, area_name: e.target.value})}
                  className="w-full border border-gray-200 p-2.5 sm:p-3 rounded-xl text-xs sm:text-sm focus:border-[#18753C] outline-none font-medium"
                  placeholder="e.g. VIP Road, Vesu / Adajan Gam"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1.5">
                  Landmark <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={addressForm.landmark || ''}
                  onChange={e => setAddressForm({...addressForm, landmark: e.target.value})}
                  className="w-full border border-gray-200 p-2.5 sm:p-3 rounded-xl text-xs sm:text-sm focus:border-[#18753C] outline-none font-medium"
                  placeholder="e.g. Near Market / Opp. Mall"
                />
              </div>
            </div>

            {/* Actions & Default Checkbox */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-gray-100">
              <label className="flex items-center gap-2.5 text-xs sm:text-sm cursor-pointer font-bold text-gray-700 select-none">
                <input
                  type="checkbox"
                  checked={addressForm.isDefault}
                  onChange={e => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                  className="w-4 h-4 accent-[#18753C] rounded"
                />
                <span>Set as default delivery address</span>
              </label>

              <div className="flex gap-2.5 justify-end">
                <button
                  type="button"
                  onClick={() => { setIsAddingAddress(false); setEditingAddressId(null); }}
                  className="px-4 py-2 sm:px-5 sm:py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold text-xs sm:text-sm text-gray-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAddress}
                  className="px-6 py-2.5 bg-[#18753C] hover:bg-[#156030] text-white rounded-xl font-extrabold text-xs sm:text-sm shadow-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingAddress ? 'Saving...' : 'Save Address'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Addresses Grid (2-column on desktop for optimal reading width) */}
        {addresses.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200/80 p-8 sm:p-10 text-center text-gray-500 shadow-2xs">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-[#18753C] flex items-center justify-center text-2xl mx-auto mb-3">
              <i className="fa-solid fa-location-dot"></i>
            </div>
            <h3 className="font-extrabold text-base text-gray-900">No addresses saved yet</h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-sm mx-auto leading-relaxed">
              Add your delivery address for 14–45 min doorstep delivery.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {addresses.map(addr => {
              const serviceInfo = serviceabilityResults[addr.id];
              return (
                <div
                  key={addr.id}
                  className={`border rounded-2xl p-4.5 sm:p-5 flex flex-col justify-between transition-all ${
                    addr.isDefault
                      ? 'border-[#18753C] bg-[#F5FBF7] shadow-xs ring-1 ring-[#18753C]/20'
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
                          className="text-xs text-gray-500 hover:text-[#18753C] font-bold underline cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
                      <i className="fa-solid fa-user text-[10px] mr-1 text-gray-400"></i>
                      {addr.recipientName || profile?.name || 'Customer'} &bull; {addr.phone || profile?.phone || '+91 98765 12340'}
                    </p>

                    {/* Serviceability Check Result / Button */}
                    <div className="pt-0.5">
                      {serviceInfo ? (
                        <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 text-xs font-semibold px-2.5 py-1 rounded-lg border border-emerald-200">
                          <i className="fa-solid fa-bolt text-emerald-600"></i>
                          <span>{serviceInfo.deliverySpeed} (PIN {serviceInfo.pincode})</span>
                        </div>
                      ) : serviceabilityErrors[addr.id] ? (
                        <div className="inline-flex items-center gap-1.5 text-xs text-red-600 font-semibold">
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
                          className="text-xs font-bold text-[#18753C] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
                          city: addr.city || '',
                          state: addr.state || '',
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

  // Render Settings & Profile View (Desktop 2-column layout to fit user screen)
  const renderProfile = () => (
    <div className="w-full space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-gray-200/60">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 mb-0.5">
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
          <h2 className="text-lg sm:text-xl font-black text-gray-900">Settings &amp; Profile</h2>
        </div>
        <button
          type="button"
          onClick={() => setActiveView('dashboard')}
          className="text-xs sm:text-sm font-bold text-gray-700 hover:text-gray-950 bg-white border border-gray-200 px-3.5 py-2 rounded-xl transition cursor-pointer self-start sm:self-auto"
        >
          ← Back to Dashboard
        </button>
      </div>

      {/* Hidden File Input for Image Upload */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
        data-testid="profile-photo-input"
      />

      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {/* Left Column: Photo & Personal Info */}
        <div className="space-y-4">
          {/* Profile Photo & Avatar Card */}
          <div className="bg-white rounded-2xl shadow-xs border border-gray-200/90 p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-gray-100">
              <div>
                <h3 className="text-base font-extrabold text-gray-900">Profile Photo</h3>
                <p className="text-xs text-gray-500">Upload photo or select avatar</p>
              </div>
              {pendingAvatar && (
                <span className="bg-amber-50 text-amber-800 border border-amber-200 text-xs font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 animate-pulse">
                  <i className="fa-solid fa-clock-rotate-left text-[10px]"></i>
                  <span>Unsaved preview</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-4">
              {/* Avatar Preview */}
              <div className="relative group shrink-0">
                <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-[#18753C] text-white flex items-center justify-center text-2xl font-black overflow-hidden border-2 border-[#18753C] shadow-xs">
                  {activeAvatarUrl ? (
                    <img
                      src={activeAvatarUrl}
                      alt="Active Avatar Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    displayInitial
                  )}
                </div>
                {savingProfile && (
                  <div className="absolute inset-0 bg-black/50 rounded-2xl flex flex-col items-center justify-center text-white text-xs font-bold gap-1">
                    <i className="fa-solid fa-spinner animate-spin text-base"></i>
                  </div>
                )}
              </div>

              {/* Upload & Preset Avatar Controls */}
              <div className="flex-1 min-w-0 space-y-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={savingProfile}
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2 bg-[#18753C] hover:bg-[#156030] text-white rounded-xl text-xs sm:text-sm font-extrabold transition flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <i className="fa-solid fa-camera text-xs"></i>
                    <span>{activeAvatarUrl ? 'Change Photo' : 'Upload Photo'}</span>
                  </button>

                  {activeAvatarUrl && (
                    <button
                      type="button"
                      disabled={savingProfile}
                      onClick={handleRemovePhoto}
                      className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <i className="fa-solid fa-trash-can text-xs"></i>
                      <span>Remove</span>
                    </button>
                  )}

                  {pendingAvatar && (
                    <button
                      type="button"
                      disabled={savingProfile}
                      onClick={handleResetAvatar}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title="Revert preview to current saved photo"
                    >
                      <i className="fa-solid fa-rotate-left text-xs"></i>
                      <span>Reset</span>
                    </button>
                  )}
                </div>

                {/* Preset Avatars */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs text-gray-500 font-bold shrink-0">Presets:</span>
                  <div className="flex items-center gap-1.5">
                    {PRESET_AVATARS.map((url, idx) => {
                      const isSelected = activeAvatarUrl === url;
                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={savingProfile}
                          onClick={() => handleSelectPreset(url)}
                          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl overflow-hidden border transition-all hover:scale-105 cursor-pointer disabled:opacity-50 ${
                            isSelected
                              ? 'border-[#18753C] ring-2 ring-[#18753C]/30 scale-105'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          title={`Select avatar preset ${idx + 1}`}
                        >
                          <img src={url} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Personal Information Form Card */}
          <div className="bg-white rounded-2xl shadow-xs border border-gray-200/90 p-5 sm:p-6 space-y-4">
            <div className="pb-2 border-b border-gray-100">
              <h3 className="text-base font-extrabold text-gray-900">Personal Information</h3>
              <p className="text-xs text-gray-500 mt-0.5">Identity used for invoices and order tracking</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Full Name</label>
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="border border-gray-200 p-2.5 sm:p-3 rounded-xl focus:border-[#18753C] outline-none text-xs sm:text-sm text-gray-800 font-medium"
                  placeholder="Full Name"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Mobile Phone</label>
                <input
                  type="text"
                  value={profileForm.phone}
                  onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                  className="border border-gray-200 p-2.5 sm:p-3 rounded-xl focus:border-[#18753C] outline-none text-xs sm:text-sm text-gray-800 font-medium"
                  placeholder="Phone Number"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
                  className="border border-gray-200 p-2.5 sm:p-3 rounded-xl focus:border-[#18753C] outline-none text-xs sm:text-sm text-gray-800 font-medium"
                  placeholder="Email Address"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Preferred Language</label>
                <select className="border border-gray-200 p-2.5 sm:p-3 rounded-xl bg-gray-50 text-xs sm:text-sm text-gray-800 outline-none font-medium">
                  <option>English</option>
                  <option>Gujarati</option>
                  <option>Hindi</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Preferences & Security */}
        <div className="space-y-4">
          {/* Notification Preferences Card */}
          <div className="bg-white rounded-2xl shadow-xs border border-gray-200/90 p-5 sm:p-6 space-y-3.5">
            <div className="pb-2 border-b border-gray-100">
              <h3 className="text-base font-extrabold text-gray-900">Notification Preferences</h3>
              <p className="text-xs text-gray-500 mt-0.5">Dispatch alerts, soundbox and deals</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50/70 transition cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={notificationPrefs.order_updates_sms}
                  onChange={() => setNotificationPrefs(p => ({ ...p, order_updates_sms: !p.order_updates_sms }))}
                  className="w-4 h-4 mt-0.5 accent-[#18753C] rounded"
                />
                <div>
                  <div className="text-xs sm:text-sm font-bold text-gray-800">Order Updates</div>
                  <div className="text-xs text-gray-500 mt-0.5">Live rider &amp; dispatch notices</div>
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
                  <div className="text-xs sm:text-sm font-bold text-gray-800">Promo Offers</div>
                  <div className="text-xs text-gray-500 mt-0.5">Deals &amp; store coupons</div>
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
                  <div className="text-xs sm:text-sm font-bold text-gray-800">Soundbox Alerts</div>
                  <div className="text-xs text-gray-500 mt-0.5">Chime upon order arrival</div>
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
                  <div className="text-xs sm:text-sm font-bold text-gray-800">Email Invoices</div>
                  <div className="text-xs text-gray-500 mt-0.5">Itemized bills and receipts</div>
                </div>
              </label>
            </div>
          </div>

          {/* Security Actions Card */}
          <div className="bg-white rounded-2xl shadow-xs border border-gray-200/90 p-5 sm:p-6 space-y-3.5">
            <div className="pb-2 border-b border-gray-100">
              <h3 className="text-base font-extrabold text-gray-900">Security &amp; Sessions</h3>
              <p className="text-xs text-gray-500 mt-0.5">Password and authentication settings</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={handleOpenPasswordModal}
                className="flex items-center gap-3 text-xs sm:text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 p-3 rounded-xl transition text-left font-bold cursor-pointer border border-gray-200/70"
              >
                <i className="fa-solid fa-key text-[#18753C] text-sm shrink-0"></i>
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm truncate">Password</div>
                  <div className="text-xs text-gray-400 font-normal">Change PIN/PW</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => showToast('Two-factor authentication is currently enabled via SMS')}
                className="flex items-center gap-3 text-xs sm:text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 p-3 rounded-xl transition text-left font-bold cursor-pointer border border-gray-200/70"
              >
                <i className="fa-solid fa-shield-halved text-emerald-600 text-sm shrink-0"></i>
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm truncate">2-Factor Auth</div>
                  <div className="text-xs text-emerald-600 font-normal">Active (SMS)</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => showToast('All active sessions are verified on this device')}
                className="flex items-center gap-3 text-xs sm:text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 p-3 rounded-xl transition text-left font-bold cursor-pointer border border-gray-200/70"
              >
                <i className="fa-solid fa-laptop text-blue-600 text-sm shrink-0"></i>
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm truncate">Sessions</div>
                  <div className="text-xs text-gray-400 font-normal">Verified Device</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => {
            handleResetAvatar();
            setProfileForm({
              name: profile?.name || '',
              phone: profile?.phone || '',
              email: profile?.email || ''
            });
            setActiveView('dashboard');
          }}
          className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold text-xs sm:text-sm text-gray-700 transition cursor-pointer"
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
          className="bg-[#18753C] hover:bg-[#156030] text-white px-6 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm shadow-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {savingProfile ? (
            <>
              <i className="fa-solid fa-spinner animate-spin text-sm"></i>
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
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-gray-200/60">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 mb-0.5">
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
          <h2 className="text-lg sm:text-xl font-black text-gray-900">{placeholderTitle}</h2>
        </div>
        <button
          type="button"
          onClick={() => setActiveView('dashboard')}
          className="text-xs sm:text-sm font-bold text-gray-700 hover:text-gray-950 bg-white border border-gray-200 px-3.5 py-2 rounded-xl transition cursor-pointer"
        >
          ← Return to Dashboard
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-xs border border-gray-200/80 p-8 sm:p-12 text-center">
        <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-[#18753C] mx-auto mb-3.5 text-2xl">
          <i className="fa-solid fa-clock-rotate-left"></i>
        </div>
        <h3 className="text-base sm:text-lg font-black text-gray-900 mb-1.5">{placeholderTitle}</h3>
        <p className="text-gray-500 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">{placeholderText}</p>
        <button
          type="button"
          onClick={() => setActiveView('dashboard')}
          className="mt-5 px-6 py-2.5 bg-[#18753C] hover:bg-[#156030] text-white text-xs sm:text-sm font-extrabold rounded-xl transition cursor-pointer shadow-xs"
        >
          Back to Overview
        </button>
      </div>
    </div>
  );

  return (
    <div className="w-full relative pb-2 sm:pb-3">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="w-full max-w-7xl 2xl:max-w-[1520px] mx-auto mb-3 sm:mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 mb-0.5">
            <span className="text-[#18753C]">Account</span>
            {activeView !== 'dashboard' && (
              <>
                <span>/</span>
                <span className="text-gray-700 capitalize">
                  {activeView === 'addresses' ? 'Delivery Addresses' : (activeView === 'profile' ? 'Profile & Security' : placeholderTitle)}
                </span>
              </>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
            {activeView === 'dashboard' ? 'Customer Account' : (activeView === 'addresses' ? 'Delivery Addresses' : (activeView === 'profile' ? 'Profile & Security' : placeholderTitle))}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {activeView !== 'dashboard' && (
            <button
              type="button"
              onClick={() => {
                window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                setActiveView('dashboard');
              }}
              className="px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-bold text-gray-700 hover:text-gray-950 hover:bg-gray-50 shadow-2xs transition cursor-pointer flex items-center gap-2"
            >
              <i className="fa-solid fa-arrow-left text-xs"></i>
              <span>Back to Overview</span>
            </button>
          )}

          {/* Desktop Sidebar Toggle when on Dashboard */}
          {activeView === 'dashboard' && (
            <button
              type="button"
              onClick={() => setShowSidebarOnDashboard(prev => !prev)}
              className="hidden lg:flex px-3.5 py-2 bg-white border border-gray-200 rounded-xl items-center gap-2 text-xs sm:text-sm font-bold text-gray-700 shadow-2xs hover:bg-gray-50 transition cursor-pointer"
              title={showSidebarOnDashboard ? "Hide Navigation Sidebar" : "Show Navigation Sidebar"}
            >
              <i className={`fa-solid ${showSidebarOnDashboard ? 'fa-xmark' : 'fa-bars'} text-[#18753C]`}></i>
              <span>{showSidebarOnDashboard ? 'Hide Sidebar' : 'Show Sidebar'}</span>
            </button>
          )}

          {/* Mobile / Tablet Drawer Toggle Button */}
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden px-3.5 py-2 bg-white border border-gray-200 rounded-xl flex items-center gap-2 text-xs sm:text-sm font-bold text-gray-700 shadow-2xs hover:bg-gray-50 transition cursor-pointer"
            title="Account Menu"
            aria-label="Account Menu"
          >
            <i className="fa-solid fa-bars text-xs text-[#18753C]"></i>
            <span>Menu</span>
          </button>
        </div>
      </div>

      {/* Main Full-Width Dashboard Composition */}
      <div className="w-full max-w-7xl 2xl:max-w-[1520px] mx-auto flex flex-col lg:flex-row gap-4 xl:gap-6 items-start">
        {/* Left Column: Navigation Sidebar - Hidden on Dashboard unless toggled, automatically visible on any active tab */}
        {(activeView !== 'dashboard' || showSidebarOnDashboard) && (
          <aside className="hidden lg:flex flex-col w-64 xl:w-72 shrink-0 sticky top-20 animate-in fade-in duration-200">
            {renderSidebar()}
          </aside>
        )}

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
            {renderSidebar()}
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 relative overflow-hidden">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#18753C] flex items-center justify-center text-lg shadow-xs">
                  <i className="fa-solid fa-key"></i>
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-gray-900 leading-tight">Change Password</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Secure your ADAB account</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900 flex items-center justify-center transition cursor-pointer"
              >
                <i className="fa-solid fa-times text-sm"></i>
              </button>
            </div>

            {/* Error / Success Alerts */}
            {passwordError && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-start gap-2">
                <i className="fa-solid fa-circle-exclamation mt-0.5 shrink-0 text-red-500"></i>
                <div className="flex-1">{passwordError}</div>
              </div>
            )}

            {passwordSuccess && passwordStep !== 'success' && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-start gap-2">
                <i className="fa-solid fa-circle-check mt-0.5 shrink-0 text-emerald-600"></i>
                <div className="flex-1">{passwordSuccess}</div>
              </div>
            )}

            {demoOtpHint && (
              <div className="mt-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-center gap-2">
                <i className="fa-solid fa-lightbulb text-amber-600"></i>
                <span>{demoOtpHint}</span>
              </div>
            )}

            {/* Step 1: Confirm / Enter Email to Send Reset OTP */}
            {passwordStep === 'confirm' && (
              <div className="mt-5 space-y-4">
                <p className="text-xs text-gray-600 leading-relaxed">
                  We will send a 6-digit security code to your registered email address to verify your identity.
                </p>

                <div>
                  <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block mb-1.5">
                    Registered Email
                  </label>
                  <div className="relative">
                    <i className="fa-solid fa-envelope absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-semibold text-gray-900 focus:bg-white focus:border-[#18753C] outline-none transition"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsPasswordModalOpen(false)}
                    className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={sendingResetOtp || !resetEmail.trim()}
                    onClick={() => handleSendPasswordResetOtp(resetEmail)}
                    className="px-5 py-2.5 bg-[#18753C] hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendingResetOtp ? (
                      <>
                        <i className="fa-solid fa-circle-notch fa-spin"></i>
                        <span>Sending Code...</span>
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-paper-plane"></i>
                        <span>Send Security Code</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Enter Verification OTP and Set New Password */}
            {passwordStep === 'otp_form' && (
              <form onSubmit={handleConfirmPasswordReset} className="mt-5 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                      6-Digit Security Code
                    </label>
                    <button
                      type="button"
                      disabled={sendingResetOtp}
                      onClick={() => handleSendPasswordResetOtp(resetEmail)}
                      className="text-[11px] font-extrabold text-[#18753C] hover:underline cursor-pointer disabled:opacity-50"
                    >
                      {sendingResetOtp ? 'Resending...' : 'Resend Code'}
                    </button>
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    value={resetOtp}
                    onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit code"
                    className="w-full text-center tracking-[0.3em] font-mono text-base font-extrabold py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-[#18753C] outline-none transition"
                    autoFocus
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block mb-1.5">
                    New Password (min. 6 characters)
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-3 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-semibold text-gray-900 focus:bg-white focus:border-[#18753C] outline-none transition"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 text-xs cursor-pointer"
                    >
                      <i className={`fa-solid ${showNewPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-3 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-semibold text-gray-900 focus:bg-white focus:border-[#18753C] outline-none transition"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 text-xs cursor-pointer"
                    >
                      <i className={`fa-solid ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPasswordStep('confirm')}
                    className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={resettingPassword || resetOtp.length < 6 || !newPassword}
                    className="px-5 py-2.5 bg-[#18753C] hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resettingPassword ? (
                      <>
                        <i className="fa-solid fa-circle-notch fa-spin"></i>
                        <span>Updating Password...</span>
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-check"></i>
                        <span>Update Password</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Step 3: Success Screen */}
            {passwordStep === 'success' && (
              <div className="mt-6 py-4 flex flex-col items-center text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-[#18753C] flex items-center justify-center text-2xl shadow-sm animate-bounce">
                  <i className="fa-solid fa-check"></i>
                </div>
                <h4 className="text-base font-extrabold text-gray-900">Password Updated Successfully!</h4>
                <p className="text-xs text-gray-600 max-w-xs leading-relaxed">
                  Your new password is now active. A security confirmation email has also been sent to your inbox.
                </p>
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="mt-2 px-6 py-2 bg-[#18753C] text-white rounded-xl text-xs font-bold hover:bg-emerald-800 transition cursor-pointer"
                >
                  Done
                </button>
              </div>
            )}
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
