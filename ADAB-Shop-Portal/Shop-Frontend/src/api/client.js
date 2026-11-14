import axios from 'axios';

// The backend API base URL for seller domain
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5003/api/v1/seller';

const isTestEnv = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.MODE === 'test';

const client = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request Interceptor: Attach JWT token strictly (never inject spoofable identity headers)
client.interceptors.request.use(
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
client.interceptors.response.use(
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

// In-memory cache and in-flight request deduplication map
const responseCache = new Map();
const inFlightRequests = new Map();

export const clearApiClientCache = (pattern) => {
  if (!pattern) {
    responseCache.clear();
    return;
  }
  const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
  for (const key of responseCache.keys()) {
    if (regex.test(key)) {
      responseCache.delete(key);
    }
  }
};

const resolveDefaultTtl = (url) => {
  if (isTestEnv) return 0; // Ensure test isolation
  if (url.includes('/categories') || url.includes('/bank-partners')) return 300000; // 5 mins
  if (url.includes('/nearby-stores')) return 120000; // 2 mins
  if (url.includes('/credit-balance') || url.includes('/credit-terms')) return 60000; // 1 min
  if (url.includes('/finance') || url.includes('/points') || url.includes('/settings') || url.includes('/profile') || url.includes('/store')) return 30000; // 30s
  // Operational endpoints: 15s cache allows instant cross-page sidebar navigation without duplicate queries
  if (
    url.includes('/orders') ||
    url.includes('/b2b-orders') ||
    url.includes('/returns') ||
    url.includes('/listings') ||
    url.includes('/catalog') ||
    url.includes('/nearby-catalog') ||
    url.includes('/other-store-brands') ||
    url.includes('/pricing') ||
    url.includes('/promotions') ||
    url.includes('/coupons') ||
    url.includes('/recommendations')
  ) {
    return 15000;
  }
  return 0;
};

const invalidateMatchingCache = (url) => {
  if (!url) return;
  if (url.includes('/orders')) clearApiClientCache(/orders/);
  if (url.includes('/b2b-orders') || url.includes('/purchase-orders') || url.includes('/resale')) {
    clearApiClientCache(/(b2b-orders|purchase-orders|credit-balance|nearby-catalog|other-store-brands)/);
  }
  if (url.includes('/returns')) clearApiClientCache(/returns/);
  if (url.includes('/listings') || url.includes('/catalog') || url.includes('/pos')) {
    clearApiClientCache(/(listings|catalog)/);
  }
  if (url.includes('/pricing')) clearApiClientCache(/(pricing|listings)/);
  if (url.includes('/promotions') || url.includes('/coupons')) clearApiClientCache(/(promotions|coupons)/);
  if (url.includes('/credit-terms')) clearApiClientCache(/credit-terms/);
  if (url.includes('/credit-apply')) clearApiClientCache(/(credit-balance|credit-applications)/);
  if (url.includes('/finance') || url.includes('/withdraw') || url.includes('/khata')) {
    clearApiClientCache(/(finance|credit-balance)/);
  }
  if (url.includes('/profile') || url.includes('/store') || url.includes('/settings')) {
    clearApiClientCache(/(profile|store|settings|onboarding)/);
  }
};

// Override GET with deduplication and in-memory TTL caching
const originalGet = client.get.bind(client);
client.get = (url, config = {}) => {
  const paramsKey = config.params ? JSON.stringify(config.params) : '';
  const key = `get:${url}:${paramsKey}`;

  const bypassCache =
    isTestEnv ||
    config.skipCache === true ||
    config.headers?.['Cache-Control'] === 'no-cache' ||
    (config.params && config.params._t);

  const ttl = config.cacheTTL !== undefined ? config.cacheTTL : resolveDefaultTtl(url);

  if (!bypassCache && ttl > 0 && responseCache.has(key)) {
    const entry = responseCache.get(key);
    if (Date.now() < entry.expiresAt) {
      return Promise.resolve(JSON.parse(JSON.stringify(entry.data)));
    }
    responseCache.delete(key);
  }

  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key);
  }

  const promise = originalGet(url, config)
    .then((result) => {
      if (!bypassCache && ttl > 0 && result !== undefined) {
        responseCache.set(key, {
          data: result,
          expiresAt: Date.now() + ttl,
        });
      }
      return result;
    })
    .finally(() => {
      inFlightRequests.delete(key);
    });

  inFlightRequests.set(key, promise);
  return promise;
};

// Wrap mutation methods to automatically bust relevant cache on write
['post', 'patch', 'put', 'delete'].forEach((method) => {
  const originalMethod = client[method].bind(client);
  client[method] = (url, ...args) => {
    invalidateMatchingCache(url);
    return originalMethod(url, ...args);
  };
});

export default client;
