import api from './baseApi.js';

export const partnerMenuApi = {
  updateStatus: (restaurantId, open) =>
    api.put(`/partner/restaurants/${restaurantId}/status`, { open }).then((res) => res.data),

  listCategories: (restaurantId) =>
    api.get(`/partner/restaurants/${restaurantId}/categories`).then((res) => res.data),

  createCategory: (restaurantId, payload) =>
    api.post(`/partner/restaurants/${restaurantId}/categories`, payload).then((res) => res.data),

  updateCategory: (restaurantId, categoryId, payload) =>
    api.put(`/partner/restaurants/${restaurantId}/categories/${categoryId}`, payload).then((res) => res.data),

  deleteCategory: (restaurantId, categoryId) =>
    api.delete(`/partner/restaurants/${restaurantId}/categories/${categoryId}`),

  listItems: (restaurantId) =>
    api.get(`/partner/restaurants/${restaurantId}/items`).then((res) => res.data),

  getItem: (restaurantId, itemId) =>
    api.get(`/partner/restaurants/${restaurantId}/items/${itemId}`).then((res) => res.data),

  createItem: (restaurantId, payload) =>
    api.post(`/partner/restaurants/${restaurantId}/items`, payload).then((res) => res.data),

  updateItem: (restaurantId, itemId, payload) =>
    api.put(`/partner/restaurants/${restaurantId}/items/${itemId}`, payload).then((res) => res.data),

  toggleAvailability: (restaurantId, itemId, available) =>
    api.patch(`/partner/restaurants/${restaurantId}/items/${itemId}/availability`, null, {
      params: available !== undefined ? { available } : {},
    }).then((res) => res.data),

  deleteItem: (restaurantId, itemId) =>
    api.delete(`/partner/restaurants/${restaurantId}/items/${itemId}`),
};
