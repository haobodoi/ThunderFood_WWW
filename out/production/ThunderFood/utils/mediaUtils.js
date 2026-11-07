/* Decorative photography for the public hero. These are editorial images, not menu data. */
export const HERO_MARQUEE_ROW_1 = [
  { image: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=600&q=80' },
  { image: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=600&q=80' },
  { image: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=600&q=80' },
  { image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=600&q=80' },
];

export const HERO_MARQUEE_ROW_2 = [
  { image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=600&q=80' },
  { image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80' },
  { image: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=600&q=80' },
  { image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=600&q=80' },
];

/* Menu and storefront photos must come from the API. Missing media stays visibly missing. */
export function getSmartRestaurantCover(restaurant) {
  return typeof restaurant?.coverImage === 'string' && restaurant.coverImage.trim()
    ? restaurant.coverImage.trim()
    : null;
}
