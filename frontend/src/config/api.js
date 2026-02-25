// frontend/src/config/api.js
import axios from 'axios';

/**
 * Smart API Configuration
 * - Standalone: Uses VITE_API_BASE_URL (http://localhost:5000)
 * - Inside iframe via KaratCalc proxy: Uses /hidden-api routed through port 8080
 */

const isInIframe = () => {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
};

// If inside iframe, default immediately to relative /hidden-api path.
// This avoids the race condition where initial API calls fire before
// the PROXY_CONFIG postMessage arrives from the parent.
const getInitialBaseURL = () => {
  if (isInIframe()) {
    // Use the parent window's origin + proxy path so requests go to
    // localhost:8080/hidden-api/... which Vite then forwards to localhost:5000
    try {
      return window.parent.location.origin + '/hidden-api';
    } catch (e) {
      // Cross-origin parent — fall back to relative path
      return '/hidden-api';
    }
  }
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
};

let API_BASE_URL = getInitialBaseURL();
let isProxied = isInIframe(); // treat iframe as proxied immediately

// Create axios instance with the correct base URL from the start
export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Listen for PROXY_CONFIG from parent to confirm/override proxy URL
if (isInIframe()) {
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'PROXY_CONFIG') {
      isProxied = true;
      const confirmedURL = event.origin + event.data.backendProxy;
      API_BASE_URL = confirmedURL;
      api.defaults.baseURL = confirmedURL;
    }
  });
}

// Request interceptor
api.interceptors.request.use(
  (config) => {
    if (import.meta.env.DEV && !isProxied) {
      console.log('API Request:', config.method?.toUpperCase(), config.url);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (import.meta.env.DEV && !isProxied) {
      console.error('API Error:', error.response?.status, error.message);
    }

    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // IMPORTANT: When inside iframe, navigate the iframe itself to /login,
      // not the parent window. Without this fix, redirect goes to 8080/login.
      if (isInIframe()) {
        window.location.replace('/login');
      } else {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export const apiEndpoints = {
  login: (credentials) => api.post('/api/auth/login', credentials),
  logout: () => api.post('/api/auth/logout'),
};

export default api;