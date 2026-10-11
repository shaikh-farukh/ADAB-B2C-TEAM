import api from './api';

export const userId = '00000000-0000-0000-0000-000000000001';
const getActiveUserId = () => localStorage.getItem('seller_user_id') || userId;

const sellerService = {
  login: (phone, pin) => {
    return api.post('/seller/auth/login', { phone, pin });
  },

  signup: (phone, pin, extra = {}) => {
    return api.post('/seller/auth/signup', { phone, pin, ...extra });
  },

  getOnboarding: () => {
    return api.get('/seller/onboarding', {
      headers: { 'x-user-id': getActiveUserId() }
    });
  },

  saveOnboardingStep: (stepNum, data) => {
    return api.post(`/seller/onboarding/step/${stepNum}`, data, {
      headers: { 'x-user-id': getActiveUserId() }
    });
  },

  getProfile: () => {
    return api.get('/seller/profile', {
      headers: { 'x-user-id': getActiveUserId() }
    });
  },
  
  updateProfile: (data) => {
    return api.patch('/seller/profile', data, {
      headers: { 'x-user-id': getActiveUserId() }
    });
  },
  
  getStore: () => {
    return api.get('/seller/store', {
      headers: { 'x-user-id': getActiveUserId() }
    });
  },

  updateStore: (data) => {
    return api.patch('/seller/store', data, {
      headers: { 'x-user-id': getActiveUserId() }
    });
  },

  getSettings: () => {
    return api.get('/seller/settings', {
      headers: { 'x-user-id': getActiveUserId() }
    });
  },

  updateSettings: (data) => {
    return api.patch('/seller/settings', data, {
      headers: { 'x-user-id': getActiveUserId() }
    });
  },

  getDashboardMetrics: () => {
    return api.get('/seller/dashboard', {
      headers: { 'x-user-id': getActiveUserId() }
    });
  },

  getUnreadNotificationsCount: () => {
    return api.get('/seller/notifications/unread-count', {
      headers: { 'x-user-id': getActiveUserId() }
    });
  },

  getNotifications: () => {
    return api.get('/seller/notifications', {
      headers: { 'x-user-id': getActiveUserId() }
    });
  },

  getNotificationsSince: (timestamp) => {
    return api.get(`/seller/notifications/since?since=${encodeURIComponent(timestamp)}`, {
      headers: { 'x-user-id': getActiveUserId() }
    });
  },

  markNotificationRead: (id) => {
    return api.post(`/seller/notifications/${id}/read`, {}, {
      headers: { 'x-user-id': getActiveUserId() }
    });
  },

  markAllNotificationsRead: () => {
    return api.post('/seller/notifications/read-all', {}, {
      headers: { 'x-user-id': getActiveUserId() }
    });
  }
};

export default sellerService;
