import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

// Create an Axios instance pointing to the API baseline
export const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach authenticated user and session headers dynamically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adab_auth_token');
  const userStr = localStorage.getItem('adab_user');
  const sessionToken = localStorage.getItem('adab_session_token');

  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  if (userStr) {
    try {
      const u = JSON.parse(userStr);
      if (u?.id) {
        config.headers['x-user-id'] = u.id;
        config.headers['x-customer-id'] = u.id;
      }
    } catch {}
  }
  if (sessionToken) {
    config.headers['x-session-token'] = sessionToken;
  }
  return config;
});

const pendingAxiosRequests = new Map();

// Wrap api.get to deduplicate
const originalGet = api.get;
api.get = function (url, config) {
  if (pendingAxiosRequests.has(url)) {
    return pendingAxiosRequests.get(url);
  }
  const promise = originalGet.call(api, url, config).finally(() => {
    pendingAxiosRequests.delete(url);
  });
  pendingAxiosRequests.set(url, promise);
  return promise;
};

// Setup mock adapter
const mock = new MockAdapter(api, { delayResponse: 500, onNoMatch: 'passthrough' });
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'; // Enable via env variable if needed

if (USE_MOCK) {
  // Mock Customer Profile
  mock.onGet('/customers/me').reply(200, {
    success: true,
    data: { id: 'cust-001', name: 'Mahi Customer', email: 'mahi@example.com' }
  });

  // Mock Recommended Catalog
  mock.onGet('/catalog/recommended').reply(200, {
    success: true,
    data: [
      { id: '1', name: 'Mock Product', price: 99, mrp: 150, rating: 4.5, sellerName: 'Mock Seller', image: 'https://via.placeholder.com/150', status: 'PUBLISHED' }
    ]
  });

  // Pass through other requests
  mock.onAny().passThrough();
} else {
  mock.onAny().passThrough();
}

export default api;
