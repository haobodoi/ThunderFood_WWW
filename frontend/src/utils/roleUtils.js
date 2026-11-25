export const ROLES = {
  CUSTOMER: 'CUSTOMER',
  RESTAURANT_PARTNER: 'RESTAURANT_PARTNER',
  ADMIN: 'ADMIN',
  STAFF: 'STAFF',
};

export const ROLE_HOME = {
  [ROLES.CUSTOMER]: '/customer',
  [ROLES.RESTAURANT_PARTNER]: '/partner',
  [ROLES.ADMIN]: '/admin',
  [ROLES.STAFF]: '/admin',
};

export const ROLE_LABEL = {
  [ROLES.CUSTOMER]: 'Khách hàng',
  [ROLES.RESTAURANT_PARTNER]: 'Đối tác nhà hàng',
  [ROLES.ADMIN]: 'Quản trị viên',
  [ROLES.STAFF]: 'Nhân viên vận hành',
};

export function homePathFor(user) {
  return ROLE_HOME[user?.role] ?? '/';
}

export function canAccessPath(user, path) {
  if (!user || !path) return false;
  if (user.role === ROLES.CUSTOMER && /^\/restaurants\/\d+$/.test(path)) return true;
  const base = ROLE_HOME[user.role];
  return Boolean(base) && (path === base || path.startsWith(`${base}/`));
}

export function initialsOf(name = '') {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const letterParts = parts.filter((part) => /\p{L}/u.test(part));
  const meaningful = letterParts.filter((part) => part.toLowerCase() !== 'demo');
  const pool = meaningful.length ? meaningful : letterParts.length ? letterParts : parts;
  const target = pool[pool.length - 1];
  const match = target.match(/\p{L}/u);
  return (match ? match[0] : target.charAt(0)).toUpperCase();
}
