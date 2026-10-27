export const ROLES = {
  CUSTOMER: 'CUSTOMER',
  RESTAURANT_PARTNER: 'RESTAURANT_PARTNER',
  ADMIN: 'ADMIN',
};

export const ROLE_HOME = {
  [ROLES.CUSTOMER]: '/customer',
  [ROLES.RESTAURANT_PARTNER]: '/partner',
  [ROLES.ADMIN]: '/admin',
};

export const ROLE_LABEL = {
  [ROLES.CUSTOMER]: 'Khách hàng',
  [ROLES.RESTAURANT_PARTNER]: 'Đối tác nhà hàng',
  [ROLES.ADMIN]: 'Quản trị viên',
};

export function homePathFor(user) {
  return ROLE_HOME[user?.role] ?? '/';
}

export function canAccessPath(user, path) {
  if (!user || !path) return false;
  const base = ROLE_HOME[user.role];
  return Boolean(base) && (path === base || path.startsWith(`${base}/`));
}

export function initialsOf(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts[parts.length - 1].charAt(0).toUpperCase();
}
