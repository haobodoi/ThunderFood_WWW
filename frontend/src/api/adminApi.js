import api from './baseApi.js';

export const adminApi = {
  get: (path, params, signal) => api.get(`/admin${path}`, { params, signal }).then(r => r.data),
  save: (method, path, body) => api[method](`/admin${path}`, body).then(r => r.data),
  upload: (_kind, file) => {
    const form = new FormData(); form.append('file', file);
    return api.post('/admin/uploads', form).then(r => r.data);
  },
  export: params => api.get('/admin/dashboard/export', { params, responseType: 'blob' }).then(r => r.data),
};
