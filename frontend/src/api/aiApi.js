import axios from 'axios';
import api, { getErrorMessage } from './baseApi.js';

/** Thời gian chờ tối đa cho một câu trả lời của trợ lý (BUG-014). */
export const AI_TIMEOUT_MS = 60000;

const aiConfig = signal => ({ signal, timeout: AI_TIMEOUT_MS });

export const aiApi = {
  policyChat: (question, signal) => api.post('/customer/ai/policy-chat', { question }, aiConfig(signal)).then(r => r.data),
  assistantChat: (message, signal) => api.post('/customer/ai/assistant', { message }, aiConfig(signal)).then(r => r.data),
  resetAssistant: () => api.delete('/customer/ai/assistant/history', { timeout: 10000 }),
};

export const isAiCanceled = error => axios.isCancel(error) || error?.code === 'ERR_CANCELED';

/** Thông báo lỗi dễ hiểu cho trợ lý; trả về null khi người dùng tự dừng yêu cầu. */
export function getAiErrorMessage(error, fallback) {
  if (isAiCanceled(error)) return null;
  if (error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT') {
    return `Trợ lý phản hồi quá ${AI_TIMEOUT_MS / 1000} giây nên đã dừng chờ. Bạn có thể thử lại.`;
  }
  return getErrorMessage(error, fallback);
}
