import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { orderApi } from '../../api/orderApi.js';
import { reviewApi } from '../../api/customerApi.js';
import { getErrorMessage } from '../../api/baseApi.js';
import { PAYMENT_METHOD, awaitingTransfer, needsRefund } from '../../utils/orderUtils.js';
import { useOrderEvents } from '../../hooks/useOrderEvents.js';
import { reviewTime } from '../../components/CustomerReviews.jsx';
import Alert from '../../components/Alert.jsx';
import VietQrPayment from '../../components/VietQrPayment.jsx';
import {
  LiveStatus,
  OrderLines,
  OrderProgress,
  OrderStatus,
  OrderTotals,
  PaymentStatus
} from '../../components/OrderParts.jsx';

function CancelOrder({ order, onDone }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async event => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      onDone(await orderApi.cancel(order.orderId, reason));
    } catch (e) {
      setError(getErrorMessage(e));
      setBusy(false);
    }
  };
  return <details className="tf-order-cancel">
    <summary>Hủy đơn hàng</summary>
    {order.paymentMethod === 'ONLINE' && <Alert type="warning">
      Nếu bạn đã chuyển khoản, đừng hủy đơn. Hãy liên hệ quán để được xác nhận.
    </Alert>}
    <form onSubmit={submit}>
      <label className="commerce-field">Lý do hủy (ít nhất 5 ký tự)
        <textarea name="cancelReason"
          required
          minLength={5}
          maxLength={500}
          rows={2}
          value={reason}
          onChange={e => setReason(e.target.value)}
          disabled={busy}
        />
      </label>
      {error && <Alert type="error">{error}</Alert>}
      <button className="btn btn--danger btn--sm" disabled={busy || reason.trim().length < 5}>
        {busy ? 'Đang hủy…' : 'Xác nhận hủy đơn'}
      </button>
    </form>
  </details>;
}

export default function OrderDetailPage() {
  const { id } = useParams();
  return <OrderDetail key={id} id={id} />;
}

function OrderDetail({ id }) {
  const [order, setOrder] = useState(null);
  const [reviewState, setReviewState] = useState(null);
  const [error, setError] = useState('');
  const sequence = useRef(0);
  const load = useCallback(async () => {
    const request = ++sequence.current;
    try {
      const result = await orderApi.get(id);
      if (request === sequence.current) {
        setOrder(result);
        setError('');
        if (result?.orderStatus === 'COMPLETED' && result?.paymentStatus === 'PAID') {
          reviewApi.orderState(id).then(state => {
            if (request === sequence.current) setReviewState(state);
          }).catch(() => {
            if (request === sequence.current) setReviewState(null);
          });
        } else {
          setReviewState(null);
        }
      }
    } catch (e) {
      if (request === sequence.current) setError(getErrorMessage(e));
    }
  }, [id]);
  useEffect(() => {
    load();
    return () => { ++sequence.current; };
  }, [load]);
  const live = useOrderEvents('customer', event => {
    if (!event || String(event.orderId) === String(id)) load();
  });

  const waiting = Boolean(order) && awaitingTransfer(order);

  if (error && !order) return <div className="container commerce-page">
    <Alert type="error">{error}</Alert>
    <Link className="btn btn--outline" to="/customer/orders">Về danh sách đơn</Link>
  </div>;
  if (!order) return <div className="container commerce-page">
    <p role="status">Đang tải đơn hàng…</p>
  </div>;

  const existingReview = reviewState?.review;
  let reviewLabel = 'Đánh giá đồ ăn';
  if (existingReview?.deletedAt) reviewLabel = 'Xem trạng thái đánh giá';
  else if (existingReview) reviewLabel = existingReview.editable ? 'Chỉnh sửa đánh giá' : 'Xem đánh giá đã gửi';

  return <div className="container commerce-page">
    <div className="commerce-row commerce-wrap">
      <Link to="/customer/orders">← Đơn hàng của tôi</Link>
      <LiveStatus live={live} />
    </div>
    <div className="commerce-row commerce-wrap">
      <h1>Đơn {order.orderCode}</h1>
      <OrderStatus status={order.orderStatus} />
    </div>
    <OrderProgress status={order.orderStatus} />
    {error && <Alert type="error">{error}</Alert>}
    {order.cancelReason && <Alert
      type="warning"
      title={order.orderStatus === 'REJECTED' ? 'Lý do quán từ chối' : 'Lý do hủy'}
    >
      <span className="commerce-text">{order.cancelReason}</span>
    </Alert>}
    {order.qr && <VietQrPayment qr={order.qr} />}
    {waiting && !order.qr && <Alert type="warning">
      Quán hiện chưa nhận được thanh toán VietQR. Vui lòng gọi {order.restaurantPhone} hoặc hủy đơn rồi đặt lại
      với thanh toán khi nhận hàng.
    </Alert>}
    {needsRefund(order) && <Alert type="warning">
      Đơn đã thanh toán nên quán cần hoàn tiền cho bạn. Liên hệ quán qua {order.restaurantPhone}.
    </Alert>}
    <div className="tf-checkout">
      <section className="commerce-cart tf-checkout__form">
        <h2>Giao đến</h2>
        <p><strong>{order.recipientName}</strong> · {order.recipientPhone}</p>
        <p className="commerce-text">{order.deliveryAddress}</p>
        {order.note && <p className="commerce-text">Ghi chú: {order.note}</p>}
        <p className="muted">Đặt lúc {reviewTime(order.createdAt)}</p>
        {order.orderStatus === 'PENDING' && order.paymentStatus === 'UNPAID' && <CancelOrder
          order={order}
          onDone={updated => {
            ++sequence.current;
            setOrder(updated);
            setError('');
          }}
        />}
      </section>
      <aside className="tf-checkout__summary">
        <h2>{order.restaurantName}</h2>
        <OrderLines items={order.items} />
        <OrderTotals subtotal={order.subtotal} fee={order.deliveryFee} total={order.totalAmount} />
        <p>{PAYMENT_METHOD[order.paymentMethod]}</p>
        <PaymentStatus status={order.paymentStatus} />
        {(existingReview || reviewState?.canCreate) && <Link
          className="btn btn--outline btn--block tf-order-review"
          to={`/customer/orders/${order.orderId}/review`}
        >
          {reviewLabel}
        </Link>}
      </aside>
    </div>
  </div>;
}
