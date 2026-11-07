import api from './baseApi.js';

const base = '/admin/restaurants';

export const adminRestaurantApi = {
  list: (status) => api.get(base, { params: { status } }).then((res) => res.data),
  get: (id) => api.get(`${base}/${id}`).then((res) => res.data),
  approve: (id) => api.post(`${base}/${id}/approve`).then((res) => res.data),
  reject: (id, reason) => api.post(`${base}/${id}/reject`, { reason }).then((res) => res.data),
};
