import api from './baseApi.js';

export const cartApi = {
  list: () => api.get('/customer/carts').then(r => r.data),
  add: body => api.post('/customer/carts/items', body).then(r => r.data),
  change: (id, line, body) => api.put(`/customer/carts/${id}/items/${line}`, body).then(r => r.data),
  remove: (id, line, version) => api.delete(`/customer/carts/${id}/items/${line}`, { params: { version } }).then(r => r.data),
  clear: (id, version) => api.delete(`/customer/carts/${id}`, { params: { version } }).then(r => r.data),
};
export const reviewApi = {
  list: (id, params) => api.get(`/restaurants/${id}/reviews`, { params }).then(r => r.data),
  eligibility: id => api.get('/customer/reviews/eligibility', { params: { restaurantId: id } }).then(r => r.data),
  create: body => api.post('/customer/reviews', body).then(r => r.data),
  edit: (id, body) => api.put(`/customer/reviews/${id}`, body),
  remove: (id, version) => api.delete(`/customer/reviews/${id}`, { params: { version } }),
  mine: page => api.get('/customer/reviews', { params: { page } }).then(r => r.data),
  partner: page => api.get('/partner/reviews', { params: { page } }).then(r => r.data),
  reply: (id, body) => api.put(`/partner/reviews/${id}/reply`, body),
  deleteReply: (id, version) => api.delete(`/partner/reviews/${id}/reply`, { params: { version } }),
  report: (id, body, partner = false) => api.post(`/${partner ? 'partner' : 'customer'}/reviews/${id}/reports`, body),
  reports: page => api.get('/admin/review-reports', { params: { page } }).then(r => r.data),
  moderate: (id, body) => api.patch(`/admin/reviews/${id}/visibility`, body),
  resolve: (id, body) => api.patch(`/admin/review-reports/${id}`, body),
  upload: (id, version, file) => { const form = new FormData(); form.append('file', file); return api.post(`/customer/reviews/${id}/images`, form, { params: { version } }); },
  deleteImage: (id, image, version) => api.delete(`/customer/reviews/${id}/images/${image}`, { params: { version } }),
};
