import api from './baseApi.js';

export const accountApi = {
  updateProfile: payload => api.put('/account/profile', payload).then(r => r.data),
  uploadAvatar: file => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/account/avatar', form).then(r => r.data);
  },
  clearAvatar: () => api.delete('/account/avatar').then(r => r.data),
  changePassword: payload => api.put('/account/password', payload),
};
