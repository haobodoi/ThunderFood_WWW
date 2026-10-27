import { RESTAURANT_STATUS } from '../utils/restaurantUtils.js';

export default function StatusBadge({ status }) {
  const meta = RESTAURANT_STATUS[status] ?? { label: status, tone: 'gray' };
  return <span className={`status-badge status-badge--${meta.tone}`}>{meta.label}</span>;
}
