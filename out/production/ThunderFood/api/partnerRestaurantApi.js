import api from './baseApi.js';

const base = '/partner/restaurants';

export const partnerRestaurantApi = {
  list: () => api.get(base).then((res) => res.data),
  get: (id) => api.get(`${base}/${id}`).then((res) => res.data),
  create: (payload) => api.post(base, payload).then((res) => res.data),
  updateBasic: (id, payload) => api.put(`${base}/${id}/basic`, payload).then((res) => res.data),
  updateRepresentative: (id, payload) => api.put(`${base}/${id}/representative`, payload).then((res) => res.data),
  updateBank: (id, payload) => api.put(`${base}/${id}/bank`, payload).then((res) => res.data),
  updateDetails: (id, payload) => api.put(`${base}/${id}/details`, payload).then((res) => res.data),
  submit: (id) => api.post(`${base}/${id}/submit`).then((res) => res.data),
  remove: (id) => api.delete(`${base}/${id}`),
};
