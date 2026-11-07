import api from './baseApi.js';

export const aiApi = {
  policyChat: question => api.post('/customer/ai/policy-chat', { question }).then(r => r.data),
};
