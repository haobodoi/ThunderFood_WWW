import api from './baseApi.js';

export const partnerStatisticsApi = {
  get: (path, params, signal) => api.get(`/partner/statistics${path}`, { params, signal }).then(r => r.data),
  export: params => api.get('/partner/statistics/dashboard/export', { params, responseType: 'blob' }).then(r => r.data),
};
