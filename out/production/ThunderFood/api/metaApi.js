import api from './baseApi.js';

export const metaApi = {
  registrationOptions: () => api.get('/meta/registration-options').then((res) => res.data),
};
