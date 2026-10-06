import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';

const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
let apiBaseUrl = (import.meta as any).env?.VITE_API_BASE_URL || '';

// If deployed on live link but the build baked in the localhost URL from .env, override it
if (!isLocal && (!apiBaseUrl || apiBaseUrl.includes('localhost'))) {
  apiBaseUrl = 'https://adab-backend-b2b-1705.onrender.com/api';
} else if (isLocal && !apiBaseUrl) {
  apiBaseUrl = 'http://localhost:5000/api';
}

/**
 * Responsibility: Centralized Axios instance for B2B Portal.
 * Configures base URL and handles auth headers/errors.
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Attach token from sessionStorage removed because HttpOnly cookies handle it automatically
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    return config;
  },
  (error: any) => Promise.reject(error)
);

// Response interceptor: Global 401 handler
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: any) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      const requestUrl = originalRequest.url || '';
      const isAuthEndpoint = requestUrl.startsWith('/auth/');

      if (isAuthEndpoint && !requestUrl.includes('/auth/refresh')) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          return apiClient(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(`${apiBaseUrl}/auth/refresh`, {}, { withCredentials: true });
        const newToken = data.token; // Changed to match updated backend
        // Tokens are set via HttpOnly cookies by the backend
        processQueue(null, newToken);
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        sessionStorage.clear();
        localStorage.removeItem('user');
        localStorage.removeItem('user_role');
        window.location.href = '/auth/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export const handleApiError = (error: any, fallbackMessage: string): { success: false; message: string } => {
  if (axios.isCancel(error)) {
    return { success: false, message: 'REQUEST_CANCELLED' };
  }

  if (error.response?.data?.message) {
    return { success: false, message: error.response.data.message };
  }

  if (error.message === 'Network Error') {
    return { success: false, message: 'Network Error: Please check your connection' };
  }

  return { success: false, message: fallbackMessage };
};

export default apiClient;