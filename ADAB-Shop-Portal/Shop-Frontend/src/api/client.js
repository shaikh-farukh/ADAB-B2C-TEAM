import axios from 'axios';

// The base URL comes from Vite's environment variables.
// In development, it defaults to localhost if not set.
// In production, it will be the Render URL.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5003/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Optionally add interceptors here for auth tokens, etc.
apiClient.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error.response || error.message);
    return Promise.reject(error);
  }
);

export default apiClient;
