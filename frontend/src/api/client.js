import axios from 'axios';
import { supabase } from './supabase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let getAuthToken = null;

export const setTokenGetter = (fn) => {
  getAuthToken = fn;
};

// Request interceptor to attach Bearer token
apiClient.interceptors.request.use(
  async (config) => {
    let token = null;
    if (getAuthToken) {
      token = await getAuthToken();
    }
    if (!token) {
      try {
        const { data } = await supabase.auth.getSession();
        token = data?.session?.access_token || null;
      } catch (e) {
        token = null;
      }
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for consistent error extraction
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    let errorMsg =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred';

    if (error.code === 'ERR_NETWORK') {
      errorMsg = 'Cannot reach Pharmacy Backend API. Please verify the backend server is running and accessible.';
    }

    if (Array.isArray(errorMsg)) {
      errorMsg = errorMsg.map((err) => (typeof err === 'object' && err.msg ? err.msg : JSON.stringify(err))).join(', ');
    } else if (typeof errorMsg !== 'string') {
      errorMsg = JSON.stringify(errorMsg);
    }

    return Promise.reject(new Error(errorMsg));
  }
);

// Domain API modules
export const authApi = {
  syncProfile: (data) => apiClient.post('/auth/profile/sync', data),
  getMe: () => apiClient.get('/auth/me'),
  getUsers: () => apiClient.get('/auth/users'),
  updateUser: (id, data) => apiClient.put(`/auth/users/${id}`, data),
};

export const medicinesApi = {
  list: (params) => apiClient.get('/medicines', { params }),
  create: (data) => apiClient.post('/medicines', data),
  get: (id) => apiClient.get(`/medicines/${id}`),
  update: (id, data) => apiClient.put(`/medicines/${id}`, data),
  deactivate: (id) => apiClient.delete(`/medicines/${id}`),
};

export const categoriesApi = {
  list: (params) => apiClient.get('/categories', { params }),
  create: (data) => apiClient.post('/categories', data),
  update: (id, data) => apiClient.put(`/categories/${id}`, data),
  deactivate: (id) => apiClient.delete(`/categories/${id}`),
};

export const suppliersApi = {
  list: (params) => apiClient.get('/suppliers', { params }),
  create: (data) => apiClient.post('/suppliers', data),
  update: (id, data) => apiClient.put(`/suppliers/${id}`, data),
  deactivate: (id) => apiClient.delete(`/suppliers/${id}`),
};

export const customersApi = {
  list: (params) => apiClient.get('/customers', { params }),
  create: (data) => apiClient.post('/customers', data),
  getSales: (id) => apiClient.get(`/customers/${id}/sales`),
};

export const inventoryApi = {
  purchase: (data) => apiClient.post('/inventory/purchase', data),
  batches: (params) => apiClient.get('/inventory/batches', { params }),
  stock: () => apiClient.get('/inventory/stock'),
  history: () => apiClient.get('/inventory/history'),
};

export const salesApi = {
  create: (data) => apiClient.post('/sales', data),
  list: (params) => apiClient.get('/sales', { params }),
  get: (id) => apiClient.get(`/sales/${id}`),
  receipt: (id) => apiClient.get(`/sales/${id}/receipt`),
};

export const creditApi = {
  pending: () => apiClient.get('/credit/pending'),
  settle: (id) => apiClient.post(`/credit/${id}/settle`),
};

export const alertsApi = {
  lowStock: () => apiClient.get('/alerts/low-stock'),
  expiring: () => apiClient.get('/alerts/expiring'),
  expired: () => apiClient.get('/alerts/expired'),
};

export const dashboardsApi = {
  manager: () => apiClient.get('/dashboard/manager'),
  cashier: () => apiClient.get('/dashboard/cashier'),
  stock: () => apiClient.get('/dashboard/stock'),
};

export const reportsApi = {
  sales: (params) => apiClient.get('/reports/sales', { params }),
  inventory: () => apiClient.get('/reports/inventory'),
  credit: () => apiClient.get('/reports/credit'),
};

export const attachmentsApi = {
  upload: (formData) =>
    apiClient.post('/attachments/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getForEntity: (entityType, entityId) => apiClient.get(`/attachments/${entityType}/${entityId}`),
};
