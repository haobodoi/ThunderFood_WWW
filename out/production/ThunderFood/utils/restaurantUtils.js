export const RESTAURANT_STATUS = {
  DRAFT: { label: 'Đang soạn', tone: 'neutral', icon: 'file' },
  PENDING: { label: 'Chờ duyệt', tone: 'warning', icon: 'clock' },
  APPROVED: { label: 'Đã duyệt', tone: 'success', icon: 'checkCircle' },
  REJECTED: { label: 'Bị từ chối', tone: 'danger', icon: 'xCircle' },
  LOCKED: { label: 'Đã khóa', tone: 'danger', icon: 'lock' },
};

export const EDITABLE_STATUSES = ['DRAFT', 'REJECTED'];

export const BUSINESS_TYPES = [
  { value: 'INDIVIDUAL', label: 'Cá nhân' },
  { value: 'HOUSEHOLD', label: 'Hộ kinh doanh' },
  { value: 'COMPANY', label: 'Doanh nghiệp' },
];

export const DAYS = [
  { value: 1, label: 'Thứ 2' },
  { value: 2, label: 'Thứ 3' },
  { value: 3, label: 'Thứ 4' },
  { value: 4, label: 'Thứ 5' },
  { value: 5, label: 'Thứ 6' },
  { value: 6, label: 'Thứ 7' },
  { value: 7, label: 'Chủ nhật' },
];

export const REGISTRATION_STEPS = [
  { number: 1, title: 'Thông tin quán', subtitle: 'Cơ bản' },
  { number: 2, title: 'Người đại diện', subtitle: 'Pháp lý' },
  { number: 3, title: 'Tài khoản', subtitle: 'Ngân hàng' },
  { number: 4, title: 'Thông tin quán', subtitle: 'Chi tiết' },
  { number: 5, title: 'Xác nhận', subtitle: 'Gửi duyệt' },
];

export const LAST_DATA_STEP = 4;

export const MAX_SERVICE_TYPES = 2;
export const MAX_CUISINES = 3;
export const MAX_IMAGE_SIZE = 1024 * 1024;

export const PHONE_REGEX = /^0\d{9}$/;
export const CONTACT_PHONE_REGEX = /^0\d{9,10}$/;
export const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const ID_NUMBER_REGEX = /^(\d{9}|\d{12}|[A-Za-z]\d{7})$/;
export const TAX_CODE_REGEX = /^\d{10}(-\d{3})?$/;
export const BANK_ACCOUNT_REGEX = /^\d{6,20}$/;

export const normalizePhone = (value = '') => value.replace(/[\s.\-()]/g, '');

export function isEditable(registration) {
  return !registration || EDITABLE_STATUSES.includes(registration.status);
}

export function buildRestaurantName(...parts) {
  return parts.map((part) => (part || '').trim()).filter(Boolean).join(' - ');
}

export function timeLabel(value) {
  return value ? String(value).slice(0, 5) : '';
}

export function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('vi-VN') : '';
}

export function formatDateTime(value) {
  return value
    ? new Date(value).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })
    : '';
}

export function foldName(value = '') {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

export function fieldErrorsFor(serverErrors, prefixes) {
  const result = {};
  Object.entries(serverErrors || {}).forEach(([key, message]) => {
    const match = prefixes.find((prefix) => key === prefix || key.startsWith(`${prefix}[`) || key.startsWith(`${prefix}.`));
    const target = match ?? key;
    if (!result[target]) result[target] = message;
  });
  return result;
}
