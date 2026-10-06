import api from './api';

const userId = '00000000-0000-0000-0000-000000000001'; // Mock user UUID to pass in header

const sellerService = {
  getProfile: () => {
    return api.get('/seller/profile', {
      headers: { 'x-user-id': userId }
    });
  },
  
  getStore: () => {
    return api.get('/seller/store', {
      headers: { 'x-user-id': userId }
    });
  }
};

export default sellerService;
