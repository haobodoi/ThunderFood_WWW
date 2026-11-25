import api from './baseApi.js';

export function isCheckoutResultUnknown(error) {
  const status = error.response?.status;
  return status == null || status === 408 || status >= 500;
}

const CHECKOUT_TIMEOUT_MS = 15000;

function checkoutRequestId() {
  if (globalThis.crypto.randomUUID) return globalThis.crypto.randomUUID();

  // randomUUID requires a secure origin. Keep checkout usable when testing over a LAN address.
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
}

export function prepareCheckout(preview, form) {
  const requestId = checkoutRequestId();
  const body = {
    ...form,
    cartId: preview.cartId,
    version: preview.version,
    expectedTotal: preview.totalAmount,
    expectedLines: preview.items.filter(line => line.available).map(({ id, lineTotal }) => ({ id, lineTotal })),
  };
  const request = () => api.post('/customer/orders', body, {
    headers: { 'Idempotency-Key': requestId },
    timeout: CHECKOUT_TIMEOUT_MS,
  }).then(response => response.data);

  return async () => {
    try {
      return await request();
    } catch (error) {
      if (!isCheckoutResultUnknown(error)) throw error;
      return request();
    }
  };
}

export const orderApi = {
  preview: cartId => api.get('/customer/orders/checkout', { params: { cartId } }).then(r => r.data),
  mine: (page, group) => api.get('/customer/orders', { params: { page, group: group || undefined } }).then(r => r.data),
  get: id => api.get(`/customer/orders/${id}`).then(r => r.data),
  cancel: (id, reason) => api.post(`/customer/orders/${id}/cancel`, { reason }).then(r => r.data),
};
export const partnerOrderApi = {
  list: (status, page, refunds) => api
    .get('/partner/orders', { params: { status: status || undefined, page, refunds: refunds || undefined } })
    .then(r => r.data),
  updateStatus: (id, status, reason) => api.patch(`/partner/orders/${id}/status`, { status, reason }),
  confirmPayment: id => api.post(`/partner/orders/${id}/confirm-payment`),
  refund: id => api.post(`/partner/orders/${id}/refund`),
};
