import api from './baseApi.js';

export const orderApi = {
  preview: cartId => api.get('/customer/orders/checkout', { params: { cartId } }).then(r => r.data),
  checkout: body => api.post('/customer/orders', body).then(r => r.data),
  mine: page => api.get('/customer/orders', { params: { page } }).then(r => r.data),
  get: id => api.get(`/customer/orders/${id}`).then(r => r.data),
  cancel: (id, reason) => api.post(`/customer/orders/${id}/cancel`, { reason }).then(r => r.data),
};
export const partnerOrderApi = {
  list: (status, page) => api.get('/partner/orders', { params: { status: status || undefined, page } }).then(r => r.data),
  updateStatus: (id, status, reason) => api.patch(`/partner/orders/${id}/status`, { status, reason }),
  confirmPayment: id => api.post(`/partner/orders/${id}/confirm-payment`),
  refund: id => api.post(`/partner/orders/${id}/refund`),
};
