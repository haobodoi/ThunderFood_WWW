import api from './baseApi.js';

export const restaurantProfileUpdateApi = {
  mine: restaurantId => api.get(`/partner/restaurants/${restaurantId}/profile-update`).then(r => r.data),
  save: (restaurantId, payload) => api.put(`/partner/restaurants/${restaurantId}/profile-update`, payload).then(r => r.data),
  submit: (restaurantId, version) => api.post(`/partner/restaurants/${restaurantId}/profile-update/submit`, null, { params: { version } }).then(r => r.data),
  pending: () => api.get('/admin/restaurant-profile-updates').then(r => r.data),
  get: id => api.get(`/admin/restaurant-profile-updates/${id}`).then(r => r.data),
  approve: id => api.post(`/admin/restaurant-profile-updates/${id}/approve`).then(r => r.data),
  reject: (id, reason) => api.post(`/admin/restaurant-profile-updates/${id}/reject`, { reason }).then(r => r.data),
};
