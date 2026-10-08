import api from './api';
import { mockDashboardMetrics, mockUnreadCount, mockNotifications, mockSettings } from './day4Mocks';

const userId = '00000000-0000-0000-0000-000000000001'; // Mock user UUID to pass in header

// Helper to simulate API delay for mocks
const simulateApi = (mockData) => new Promise(resolve => setTimeout(() => resolve(mockData), 500));

const sellerService = {
  getProfile: () => {
    return api.get('/seller/profile', {
      headers: { 'x-user-id': userId }
    });
  },
  
  updateProfile: (data) => {
    // Fallback to mock if API fails/doesn't exist
    return api.patch('/seller/profile', data, {
      headers: { 'x-user-id': userId }
    }).catch(() => simulateApi({ success: true, data }));
  },
  
  getStore: () => {
    return api.get('/seller/store', {
      headers: { 'x-user-id': userId }
    });
  },

  updateStore: (data) => {
    return api.patch('/seller/store', data, {
      headers: { 'x-user-id': userId }
    }).catch(() => simulateApi({ success: true, data }));
  },

  getSettings: () => {
    return api.get('/seller/settings', {
      headers: { 'x-user-id': userId }
    }).catch(() => simulateApi(mockSettings));
  },

  updateSettings: (data) => {
    return api.patch('/seller/settings', data, {
      headers: { 'x-user-id': userId }
    }).catch(() => simulateApi({ success: true, data }));
  },

  getDashboardMetrics: () => {
    return api.get('/seller/dashboard', {
      headers: { 'x-user-id': userId }
    }).catch(() => simulateApi(mockDashboardMetrics));
  },

  getUnreadNotificationsCount: () => {
    return api.get('/seller/notifications/unread-count', {
      headers: { 'x-user-id': userId }
    }).catch(() => simulateApi(mockUnreadCount));
  },

  getNotifications: () => {
    // Only if a list is needed by UI
    return api.get('/seller/notifications', {
      headers: { 'x-user-id': userId }
    }).catch(() => simulateApi(mockNotifications));
  },

  markNotificationRead: (id) => {
    return api.post(`/seller/notifications/${id}/read`, {}, {
      headers: { 'x-user-id': userId }
    }).catch(() => simulateApi({ success: true }));
  }
};

export default sellerService;
