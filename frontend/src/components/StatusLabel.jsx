import { RESTAURANT_STATUS } from '../utils/restaurantUtils.js';
import Icon from './Icon.jsx';

export default function StatusLabel({ status }) {
  const meta = RESTAURANT_STATUS[status] ?? { label: status, tone: 'neutral', icon: 'alert' };
  return (
    <span className={`status-label status-label--${meta.tone}`}>
      <Icon name={meta.icon} size={15} strokeWidth={2.25} />
      <span>{meta.label}</span>
    </span>
  );
}
