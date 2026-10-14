import axios from 'axios';

// Create an Axios instance pointing to the API baseline
export const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to automatically attach live authentication credentials
api.interceptors.request.use((config) => {
  // 1. Bearer Token (from signup/login)
  const token = localStorage.getItem('token') || 
                localStorage.getItem('access_token') || 
                localStorage.getItem('adab_token') || 
                localStorage.getItem('jwt');

  // 2. User ID (from localStorage user profile or direct id)
  let userId = localStorage.getItem('userId') || 
               localStorage.getItem('user_id') || 
               localStorage.getItem('adab_user_id');

  if (!userId) {
    try {
      const rawUser = localStorage.getItem('user') || localStorage.getItem('adab_user');
      if (rawUser) {
        const parsed = JSON.parse(rawUser);
        userId = parsed.id || parsed.userId || parsed._id;
      }
    } catch (e) {
      // Ignore JSON parse errors
    }
  }

  // 3. Fallback: decode JWT payload if present
  if (!userId && token && token.includes('.')) {
    try {
      const payloadBase64 = token.split('.')[1];
      const decoded = JSON.parse(atob(payloadBase64));
      userId = decoded.id || decoded.userId || decoded.customerId || decoded.sub;
    } catch (e) {
      // Ignore JWT decode errors
    }
  }

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (userId && !UUID_REGEX.test(userId)) {
    if (userId === '1' || userId === 'user-1') {
      localStorage.removeItem('userId');
      localStorage.removeItem('user_id');
      localStorage.removeItem('adab_user_id');
    }
    userId = null;
  }

  if (!userId) {
    userId = '11111111-1111-1111-1111-111111111111';
  }

  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  if (userId) {
    config.headers['x-user-id'] = userId;
    config.headers['x-customer-id'] = userId;
  }

  // 4. Session Token for guest cart coordination
  const sessionToken = localStorage.getItem('adab_session_token');
  if (sessionToken) {
    config.headers['x-session-token'] = sessionToken;
  }

  return config;
});

export default api;
