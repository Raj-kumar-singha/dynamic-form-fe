import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
if (typeof window !== 'undefined') {
  api.interceptors.request.use((config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
}

// Forms API
export const formsAPI = {
  getAll: (activeOnly = false, includeDeleted = false) => api.get(`/forms?activeOnly=${activeOnly}&includeDeleted=${includeDeleted}`),
  getById: (id) => api.get(`/forms/${id}`),
  create: (data) => api.post('/forms', data),
  update: (id, data) => api.put(`/forms/${id}`, data),
  delete: (id) => api.delete(`/forms/${id}`),
  restore: (id) => api.post(`/forms/${id}/restore`),
};

// Submissions API
export const submissionsAPI = {
  submit: (data, config = {}) => {
    // If config has multipart/form-data header, create a new axios instance without JSON header
    if (config.headers && config.headers['Content-Type'] === 'multipart/form-data') {
      const multipartApi = axios.create({
        baseURL: API_URL,
      });
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('adminToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      return multipartApi.post('/submissions', data, config);
    }
    return api.post('/submissions', data, config);
  },
  getAll: (params) => api.get('/submissions', { params }),
  getById: (id) => api.get(`/submissions/${id}`),
  exportCSV: (formId) => api.get('/submissions/export', { 
    params: { formId },
    responseType: 'blob'
  }),
};

// Admin API
export const adminAPI = {
  login: (credentials) => api.post('/admin/login', credentials),
  createAdmin: (data) => api.post('/admin/create', data),
};

export default api;

