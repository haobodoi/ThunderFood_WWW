import api from './baseApi.js';

export const fileApi = {
  upload: (kind, file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/partner/uploads', form, { params: { kind } }).then((res) => res.data);
  },
};
