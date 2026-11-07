import api from './baseApi.js';

export const aiApi = {
  policyChat: question => api.post('/customer/ai/policy-chat', { question }).then(r => r.data),
  assistantChat: message => api.post('/customer/ai/assistant', { message }).then(r => r.data),
  resetAssistant: () => api.delete('/customer/ai/assistant/history'),
};
