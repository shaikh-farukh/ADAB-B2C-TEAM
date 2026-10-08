import axios from 'axios';

// The backend API base URL. Defaults to localhost for development.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5003/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request Interceptor: Attach token if we had auth (mocking for Day 1)
api.interceptors.request.use(
  (config) => {
    config.headers['x-user-id'] = localStorage.getItem('seller_user_id') || '00000000-0000-0000-0000-000000000001';
    config.headers['x-store-id'] = localStorage.getItem('seller_store_id') || '00000000-0000-0000-0000-000000000001';
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle global errors
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    // For Day 1, we just log it.
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default api;
