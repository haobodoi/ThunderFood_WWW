import api from './baseApi.js';

export const publicRestaurantApi = {
  search: (params = {}) =>
    api.get('/restaurants', { params }).then((res) => res.data),

  getDetail: (id) =>
    api.get(`/restaurants/${id}`).then((res) => res.data),

  getMenu: (id) =>
    api.get(`/restaurants/${id}/menu`).then((res) => res.data),
};
