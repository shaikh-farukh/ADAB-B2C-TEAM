import api from './api';

const getUserHeaders = () => {
  const activeUserId = localStorage.getItem('seller_user_id');
  return activeUserId ? { 'x-user-id': activeUserId } : {};
};

const sellerService = {
  login: (phone, password, extra = {}) => {
    return api.post('/seller/auth/login', { phone, password, ...extra });
  },

  loginWithOtp: (phone, otp, extra = {}) => {
    return api.post('/seller/auth/login-otp', { phone, otp, ...extra });
  },

  signup: (phone, password, extra = {}) => {
    return api.post('/seller/auth/signup', { phone, password, ...extra });
  },

  sendOtp: (payload) => {
    return api.post('/seller/auth/send-otp', payload);
  },

  verifyOtp: (payload) => {
    return api.post('/seller/auth/verify-otp', payload);
  },

  resetPassword: (payload) => {
    return api.post('/seller/auth/reset-password', payload);
  },

  loginWithGoogle: (payload) => {
    return api.post('/seller/auth/google', payload);
  },

  getOnboarding: () => {
    return api.get('/seller/onboarding', {
      headers: getUserHeaders()
    });
  },

  saveOnboardingStep: (stepNum, data) => {
    return api.post(`/seller/onboarding/step/${stepNum}`, data, {
      headers: getUserHeaders()
    });
  },

  getProfile: () => {
    return api.get('/seller/profile', {
      headers: getUserHeaders()
    });
  },
  
  updateProfile: (data) => {
    return api.patch('/seller/profile', data, {
      headers: getUserHeaders()
    });
  },
  
  getStore: () => {
    return api.get('/seller/store', {
      headers: getUserHeaders()
    });
  },

  updateStore: (data) => {
    return api.patch('/seller/store', data, {
      headers: getUserHeaders()
    });
  },

  getSettings: () => {
    return api.get('/seller/settings', {
      headers: getUserHeaders()
    });
  },

  updateSettings: (data) => {
    return api.patch('/seller/settings', data, {
      headers: getUserHeaders()
    });
  },

  getDashboardMetrics: () => {
    return api.get('/seller/dashboard', {
      headers: getUserHeaders()
    });
  },

  getUnreadNotificationsCount: () => {
    return api.get('/seller/notifications/unread-count', {
      headers: getUserHeaders()
    });
  },

  getNotifications: () => {
    return api.get('/seller/notifications', {
      headers: getUserHeaders()
    });
  },

  getNotificationsSince: (timestamp) => {
    return api.get(`/seller/notifications/since?since=${encodeURIComponent(timestamp)}`, {
      headers: getUserHeaders()
    });
  },

  markNotificationRead: (id) => {
    return api.post(`/seller/notifications/${id}/read`, {}, {
      headers: getUserHeaders()
    });
  },

  markAllNotificationsRead: () => {
    return api.post('/seller/notifications/read-all', {}, {
      headers: getUserHeaders()
    });
  },

  getCreditTerms: () => {
    return api.get('/seller/credit-terms', {
      headers: getUserHeaders()
    });
  },

  updateCreditGiveTerms: (data) => {
    return api.put('/seller/credit-terms/give', data, {
      headers: getUserHeaders()
    });
  },

  updateCreditBuyLimits: (data) => {
    return api.put('/seller/credit-terms/buy', data, {
      headers: getUserHeaders()
    });
  }
};

export default sellerService;
