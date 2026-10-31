import { formatVND } from './FoodCard.jsx';
import Icon from './Icon.jsx';
import { ORDER_PROGRESS, ORDER_STATUS, PAYMENT_STATUS } from '../utils/orderUtils.js';

function StatusText({ meta, value }) {
  const shown = meta ?? { label: value, tone: 'neutral', icon: 'alert' };
  return <span className={`tf-order-status tf-order-status--${shown.tone}`}><Icon name={shown.icon} size={15} strokeWidth={2.25} /><span>{shown.label}</span></span>;
}
export const OrderStatus = ({ status }) => <StatusText meta={ORDER_STATUS[status]} value={status} />;
export const PaymentStatus = ({ status }) => <StatusText meta={PAYMENT_STATUS[status]} value={status} />;

export function LiveStatus({ live }) {
  if (live === null) return null;
  return <span className={`tf-order-status tf-order-status--${live ? 'neutral' : 'warning'}`} role="status">
    <Icon name={live ? 'checkCircle' : 'alert'} size={15} strokeWidth={2.25} />
    <span>{live ? 'Đang cập nhật trực tiếp' : 'Mất kết nối, đang thử lại…'}</span>
  </span>;
}

export function OrderProgress({ status }) {
  const current = ORDER_PROGRESS.indexOf(status);
  if (current < 0) return null;
  return <ol className="tf-order-stepper">
    {ORDER_PROGRESS.map((step, index) => <li key={step} className={index < current ? 'is-done' : undefined} aria-current={index === current ? 'step' : undefined}>{ORDER_STATUS[step].label}</li>)}
  </ol>;
}

export function OrderLines({ items }) {
  return <ul className="tf-order-lines">
    {items.map(line => <li key={line.id}>
      <div className="commerce-row"><span className="commerce-text">{line.quantity} × {line.itemName}</span><strong>{formatVND(line.lineTotal)}</strong></div>
      {line.note && <small className="commerce-text">Ghi chú: {line.note}</small>}
    </li>)}
  </ul>;
}

export function OrderTotals({ subtotal, fee, total }) {
  return <dl className="tf-order-totals">
    <div><dt>Tạm tính</dt><dd>{formatVND(subtotal)}</dd></div>
    <div><dt>Phí giao hàng</dt><dd>{formatVND(fee)}</dd></div>
    <div className="tf-order-totals__grand"><dt>Tổng cộng</dt><dd>{formatVND(total)}</dd></div>
  </dl>;
}
