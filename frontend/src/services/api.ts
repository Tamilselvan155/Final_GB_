import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle auth errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login on unauthorized access
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// API endpoints
export const apiEndpoints = {
  // Authentication
  auth: {
    login: (username: string, password: string) => 
      api.post('/auth/login', { username, password }),
    logout: () => api.post('/auth/logout'),
    getCurrentUser: () => api.get('/auth/me'),
    getUsers: () => api.get('/auth/users'),
  },
  
  // Products
  products: {
    getAll: () => api.get('/products'),
    getById: (id: string) => api.get(`/products/${id}`),
    create: (data: any) => api.post('/products', data),
    update: (id: string, data: any) => api.put(`/products/${id}`, data),
    delete: (id: string, params?: any) => api.delete(`/products/${id}`, { params }),
  },
  
  // Customers
  customers: {
    getAll: () => api.get('/customers'),
    getById: (id: string) => api.get(`/customers/${id}`),
    create: (data: any) => api.post('/customers', data),
    update: (id: string, data: any) => api.put(`/customers/${id}`, data),
    delete: (id: string) => api.delete(`/customers/${id}`),
  },
  
  // Bills
  bills: {
    getAll: () => api.get('/bills'),
    getById: (id: string) => api.get(`/bills/${id}`),
    create: (data: any) => api.post('/bills', data),
    updatePayment: (id: string, data: any) => api.patch(`/bills/${id}/payment`, data),
  },
  
  // Invoices
  invoices: {
    getAll: () => api.get('/invoices'),
    getById: (id: string) => api.get(`/invoices/${id}`),
    create: (data: any) => api.post('/invoices', data),
    updatePayment: (id: string, data: any) => api.patch(`/invoices/${id}/payment`, data),
  },
  
  // Inventory
  inventory: {
    getOverview: () => api.get('/inventory/overview'),
    getLowStock: () => api.get('/inventory/low-stock'),
    getTransactions: (params?: any) => api.get('/inventory/transactions', { params }),
    adjustStock: (data: any) => api.post('/inventory/adjust', data),
  },
  
  // Dashboard
  dashboard: {
    getStats: (period?: string) => api.get('/dashboard/stats', { params: { period } }),
    getSalesChart: (period?: string) => api.get('/dashboard/sales-chart', { params: { period } }),
    getPaymentMethods: (period?: string) => api.get('/dashboard/payment-methods', { params: { period } }),
  },
  
  // Settings
  settings: {
    getAll: () => api.get('/settings'),
    getByKey: (key: string) => api.get(`/settings/${key}`),
    update: (data: Record<string, string>) => api.put('/settings', data),
  },
};

export default api;
