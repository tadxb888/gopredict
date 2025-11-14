import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth data and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  requestMagicLink: (email) => api.post('/auth/magic-link', { email }),
  verifyMagicLink: (token) => api.post('/auth/verify', { token }),
  getCurrentUser: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout')
};

// Data API
export const dataAPI = {
  getDailyPredictions: () => api.get('/data/daily-predictions'),
  getIntradayPredictions: () => api.get('/data/intraday-predictions'),
  getTradebook: () => api.get('/data/tradebook'),
  clearNotifications: (type) => api.post('/data/clear-notifications', { type }),
  getPollingStatus: () => api.get('/data/status'),
  refreshData: (type) => api.post('/data/refresh', { type })
};

// User API
export const userAPI = {
  getAllUsers: (params) => api.get('/users', { params }),
  getUserById: (id) => api.get(`/users/${id}`),
  createUser: (userData) => api.post('/users', userData),
  updateUser: (id, userData) => api.put(`/users/${id}`, userData),
  deleteUser: (id) => api.delete(`/users/${id}`),
  bulkCreateUsers: (users) => api.post('/users/bulk', { users })
};

export default api;
