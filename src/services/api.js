// service/api.js
import axios from 'axios';
import { store } from '../store/store';

// -------------------- Axios instance --------------------
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'https://doc-verify-server.onrender.com/api',
  timeout: 15000,
});

// Attach JWT token to every request if available
api.interceptors.request.use(
  (config) => {
    const token = store.getState().auth.token;
    if (token) {
      config.headers['x-auth-token'] = token;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// -------------------- Auth APIs --------------------
export const login = (credentials) => api.post('/auth/login', credentials);
export const loginAdmin = (credentials) => api.post('/auth/admin/login', credentials);
export const createUser = (payload) => api.post('/auth/create-user', payload);
export const getMe = () => api.get('/auth/me');

// -------------------- Case APIs --------------------
export const createCase = (payload) => api.post('/cases', payload);
export const updateCase = (id, payload) => api.patch(`/cases/${id}`, payload);
export const getCase = (id) => api.get(`/cases/${id}`);
export const listCases = () => api.get('/cases');

// File uploads for subsections
export const uploadCaseFiles = (id, fieldKey, files) => {
  const fd = new FormData();
  [...files].forEach((f) => fd.append('files', f));
  return api.post(`/cases/${id}/upload?fieldKey=${encodeURIComponent(fieldKey)}`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// -------------------- Client APIs --------------------
export const listClients = () => api.get('/clients');
export const createClient = (payload) => api.post('/clients', payload);

// -------------------- Report APIs --------------------
export const getReport = (id) => api.get(`/reports/${id}`);
export const listReports = () => api.get('/reports');

// -------------------- Profile APIs --------------------
export const getProfile = () => api.get('/profile');
export const updateProfile = (payload) => api.put('/profile', payload);

// -------------------- Export default instance --------------------
export default api;
