import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { orderApi } from '../../api/orderApi.js';
import { getErrorMessage } from '../../api/baseApi.js';
import { PAYMENT_METHOD, awaitingTransfer } from '../../utils/orderUtils.js';
import { useOrderEvents } from '../../hooks/useOrderEvents.js';
import { reviewTime } from '../../components/CustomerReviews.jsx';
import Alert from '../../components/Alert.jsx';
import VietQrPayment from '../../components/VietQrPayment.jsx';
import { LiveStatus, OrderLines, OrderProgress, OrderStatus, OrderTotals, PaymentStatus } from '../../components/OrderParts.jsx';

function CancelOrder({ order, onDone }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async event => {
    event.preventDefault();
    setBusy(true); setError('');
    try { onDone(await orderApi.cancel(order.order_id, reason)); }
    catch (e) { setError(getErrorMessage(e)); setBusy(false); }
  };
  return <details className="tf-order-cancel">
    <summary>Hủy đơn hàng</summary>
    {order.payment_method === 'ONLINE' && <Alert type="warning">Nếu bạn đã chuyển khoản, đừng hủy đơn. Hãy liên hệ quán để được xác nhận.</Alert>}
    <form onSubmit={submit}>
      <label className="commerce-field">Lý do hủy (ít nhất 5 ký tự)
        <textarea required minLength={5} maxLength={500} rows={2} value={reason} onChange={e => setReason(e.target.value)} disabled={busy} />
      </label>
      {error && <Alert type="error">{error}</Alert>}
      <button className="btn btn--danger btn--sm" disabled={busy || reason.trim().length < 5}>{busy ? 'Đang hủy…' : 'Xác nhận hủy đơn'}</button>
    </form>
  </details>;
}

export default function OrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const sequence = useRef(0);
  const load = useCallback(async () => {
    const request = ++sequence.current;
    try {
      const result = await orderApi.get(id);
      if (request === sequence.current) { setOrder(result); setError(''); }
    } catch (e) { if (request === sequence.current) setError(getErrorMessage(e)); }
  }, [id]);
  useEffect(() => { load(); }, [load]);
  const live = useOrderEvents('customer', event => { if (!event || String(event.orderId) === String(id)) load(); });

  const waiting = Boolean(order) && awaitingTransfer(order);

  if (error && !order) return <main className="container commerce-page"><Alert type="error">{error}</Alert><Link className="btn btn--outline" to="/customer/orders">Về danh sách đơn</Link></main>;
  if (!order) return <main className="container commerce-page"><p role="status">Đang tải đơn hàng…</p></main>;

  return <main className="container commerce-page">
    <div className="commerce-row commerce-wrap"><Link to="/customer/orders">← Đơn hàng của tôi</Link><LiveStatus live={live} /></div>
    <div className="commerce-row commerce-wrap"><h1>Đơn {order.order_code}</h1><OrderStatus status={order.order_status} /></div>
    <OrderProgress status={order.order_status} />
    {error && <Alert type="error">{error}</Alert>}
    {order.cancel_reason && <Alert type="warning" title={order.order_status === 'REJECTED' ? 'Lý do quán từ chối' : 'Lý do hủy'}><span className="commerce-text">{order.cancel_reason}</span></Alert>}
    {order.qr && <VietQrPayment qr={order.qr} />}
    {waiting && !order.qr && <Alert type="warning">Quán hiện chưa nhận được thanh toán VietQR. Vui lòng gọi {order.restaurant_phone} hoặc hủy đơn rồi đặt lại với thanh toán khi nhận hàng.</Alert>}
    {order.order_status === 'REJECTED' && order.payment_status === 'PAID' && <Alert type="warning">Đơn đã thanh toán nên quán cần hoàn tiền cho bạn. Liên hệ quán qua {order.restaurant_phone}.</Alert>}
    <div className="tf-checkout">
      <section className="commerce-cart tf-checkout__form">
        <h2>Giao đến</h2>
        <p><strong>{order.recipient_name}</strong> · {order.recipient_phone}</p>
        <p className="commerce-text">{order.delivery_address}</p>
        {order.note && <p className="commerce-text">Ghi chú: {order.note}</p>}
        <p className="muted">Đặt lúc {reviewTime(order.created_at)}</p>
        {order.order_status === 'PENDING' && order.payment_status === 'UNPAID' && <CancelOrder order={order} onDone={setOrder} />}
      </section>
      <aside className="tf-checkout__summary">
        <h2>{order.restaurant_name}</h2>
        <OrderLines items={order.items} />
        <OrderTotals subtotal={order.subtotal} fee={order.delivery_fee} total={order.total_amount} />
        <p>{PAYMENT_METHOD[order.payment_method]}</p>
        <PaymentStatus status={order.payment_status} />
        {order.order_status === 'COMPLETED' && <Link className="btn btn--outline btn--block tf-order-review" to={`/restaurants/${order.restaurant_id}`}>Đánh giá quán</Link>}
      </aside>
    </div>
  </main>;
}
