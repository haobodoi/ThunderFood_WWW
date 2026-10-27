import api from './axiosClient.js';

export const authApi = {
  csrf: () => api.get('/auth/csrf'),
  me: () => api.get('/auth/me').then((res) => res.data),
  login: (username, password) =>
    api.post('/auth/login', new URLSearchParams({ username, password })).then((res) => res.data),
  register: (payload) => api.post('/auth/register', payload).then((res) => res.data),
  logout: () => api.post('/auth/logout'),
};
