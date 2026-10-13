import axios from 'axios';

// The backend API base URL. Defaults to localhost for development.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5003/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request Interceptor: Attach JWT token strictly (never inject spoofable identity headers)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('seller_token') || localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle global errors and auto-logout on 401
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      const isAuthPath = window.location.pathname.includes('/login') ||
                         window.location.pathname.includes('/register') ||
                         window.location.pathname.includes('/auth');
      if (!isAuthPath) {
        localStorage.removeItem('seller_token');
        localStorage.removeItem('token');
        localStorage.removeItem('seller_user');
        localStorage.removeItem('seller_user_id');
        localStorage.removeItem('seller_store_id');
        window.location.href = '/login';
      }
    }
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default api;
