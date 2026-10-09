import api from './api';

export const userId = '00000000-0000-0000-0000-000000000001'; // Mock user UUID to pass in header

const sellerService = {
  getProfile: () => {
    return api.get('/seller/profile', {
      headers: { 'x-user-id': userId }
    });
  },
  
  updateProfile: (data) => {
    return api.patch('/seller/profile', data, {
      headers: { 'x-user-id': userId }
    });
  },
  
  getStore: () => {
    return api.get('/seller/store', {
      headers: { 'x-user-id': userId }
    });
  },

  updateStore: (data) => {
    return api.patch('/seller/store', data, {
      headers: { 'x-user-id': userId }
    });
  },

  getSettings: () => {
    return api.get('/seller/settings', {
      headers: { 'x-user-id': userId }
    });
  },

  updateSettings: (data) => {
    return api.patch('/seller/settings', data, {
      headers: { 'x-user-id': userId }
    });
  },

  getDashboardMetrics: () => {
    return api.get('/seller/dashboard', {
      headers: { 'x-user-id': userId }
    });
  },

  getUnreadNotificationsCount: () => {
    return api.get('/seller/notifications/unread-count', {
      headers: { 'x-user-id': userId }
    });
  },

  getNotifications: () => {
    return api.get('/seller/notifications', {
      headers: { 'x-user-id': userId }
    });
  },

  markNotificationRead: (id) => {
    return api.post(`/seller/notifications/${id}/read`, {}, {
      headers: { 'x-user-id': userId }
    });
  }
};

export default sellerService;
