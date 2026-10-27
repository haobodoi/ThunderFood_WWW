import api from './axiosClient.js';

export const dashboardApi = {
  customer: () => api.get('/customer/dashboard').then((res) => res.data),
  partner: () => api.get('/partner/dashboard').then((res) => res.data),
  admin: () => api.get('/admin/dashboard').then((res) => res.data),
};
