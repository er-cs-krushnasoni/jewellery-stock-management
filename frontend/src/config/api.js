// frontend/src/config/api.js
import axios from 'axios';

const isInIframe = () => {
  try { return window.self !== window.top; } catch (e) { return true; }
};

const getInitialBaseURL = () => {
  if (isInIframe()) {
    // Always relative — works in all proxy contexts
    // browser dev, Electron dev, Electron prod (via localhost:8080/hidden-app)
    // Capacitor, Vercel — all use /hidden-api relative path
    return '/hidden-api';
  }
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
};

const inIframe = isInIframe();

export const api = axios.create({
  baseURL: getInitialBaseURL(),
  withCredentials: false,
  headers: { 'Content-Type': 'application/json' },
});

if (inIframe) {
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'PROXY_CONFIG') {
      const backendProxy = event.data.backendProxy || '/hidden-api';
      let cleanBase;
      try {
        cleanBase = new URL(backendProxy).pathname;
      } catch {
        cleanBase = backendProxy.startsWith('/') ? backendProxy : '/' + backendProxy;
      }
      api.defaults.baseURL = cleanBase;
    }
  });
}

api.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.replace('/login');
    }
    return Promise.reject(error);
  }
);

export const apiEndpoints = {
  login: (credentials) => api.post('/api/auth/login', credentials),
  logout: () => api.post('/api/auth/logout'),
};

export default api;