import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
  headers: { Accept: 'application/json' },
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { response, config } = error;

    if (response?.status === 403 && response.data?.code === 'CSRF_INVALID' && config && !config._csrfRetried) {
      config._csrfRetried = true;
      await api.get('/auth/csrf');
      return api(config);
    }

    if (response?.status === 401 && config && !String(config.url).startsWith('/auth/')) {
      window.dispatchEvent(new Event('auth:unauthorized'));
    }

    return Promise.reject(error);
  },
);

export function getErrorMessage(error, fallback = 'Đã có lỗi xảy ra, vui lòng thử lại.') {
  if (!error?.response) {
    return 'Không kết nối được máy chủ. Hãy kiểm tra backend (cổng 8080) đã chạy chưa.';
  }
  return error.response.data?.message || fallback;
}

export function getFieldErrors(error) {
  return error?.response?.data?.errors ?? {};
}

export default api;
