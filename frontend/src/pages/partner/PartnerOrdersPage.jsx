import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { partnerOrderApi } from '../../api/orderApi.js';
import { getErrorMessage } from '../../api/baseApi.js';
import { NEXT_ACTION, ORDER_STATUS, PAYMENT_METHOD, awaitingTransfer, needsRefund } from '../../utils/orderUtils.js';
import { useOrderEvents } from '../../hooks/useOrderEvents.js';
import { Pagination, reviewTime } from '../../components/CustomerReviews.jsx';
import { formatVND } from '../../components/FoodCard.jsx';
import Alert from '../../components/Alert.jsx';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import {
  LiveStatus,
  OrderLines,
  OrderStatus,
  OrderTotals,
  PaymentStatus
} from '../../components/OrderParts.jsx';

function OrderActions({ order, reload }) {
  const [busy, setBusy] = useState(false);
  const [updated, setUpdated] = useState(false);
  const [error, setError] = useState('');
  const [reason, setReason] = useState('');
  const [modal, setModal] = useState(null);
  const locked = busy || updated;
  const run = async operation => {
    if (locked) return;
    setBusy(true);
    setError('');
    try {
      await operation();
      setUpdated(true);
      setModal(null);
      await reload();
    } catch (e) {
      setError(getErrorMessage(e));
      setModal(null);
    } finally {
      setBusy(false);
    }
  };
  const id = order.orderId;
  const transfer = awaitingTransfer(order);
  const next = NEXT_ACTION[order.orderStatus];
  const refundable = needsRefund(order);
  const rejectable = ['PENDING', 'CONFIRMED'].includes(order.orderStatus);
  return <>
    {transfer && <Alert type="warning" title="Chờ khách chuyển khoản">
      Kiểm tra tài khoản ngân hàng của quán:
      số tiền <strong>{formatVND(order.totalAmount)}</strong>, nội dung <strong>{order.transferContent}</strong>.
    </Alert>}
    {refundable && <Alert type="warning" title="Cần hoàn tiền cho khách">
      Quán đã nhận {formatVND(order.totalAmount)} cho đơn đã hủy hoặc bị từ chối.
      Liên hệ khách qua {order.recipientPhone} để hoàn tiền.
    </Alert>}
    <div className="tf-order-actions">
      {transfer && <button
        type="button"
        className="btn btn--primary btn--sm"
        disabled={locked}
        onClick={() => setModal('payment')}
      >
        Đã nhận tiền
      </button>}
      {order.orderStatus === 'PENDING' && order.paymentMethod === 'COD' && <button
        type="button"
        className="btn btn--primary btn--sm"
        disabled={locked}
        onClick={() => run(() => partnerOrderApi.updateStatus(id, 'CONFIRMED'))}
      >
        Nhận đơn
      </button>}
      {next && <button
        type="button"
        className="btn btn--primary btn--sm"
        disabled={locked}
        onClick={() => run(() => partnerOrderApi.updateStatus(id, next.status))}
      >
        {next.label}
      </button>}
      {refundable && <button
        type="button"
        className="btn btn--primary btn--sm"
        disabled={locked}
        onClick={() => setModal('refund')}
      >
        Đã hoàn tiền
      </button>}
    </div>
    {rejectable && <details className="tf-order-cancel">
      <summary>Từ chối đơn</summary>
      <form onSubmit={event => {
        event.preventDefault();
        run(() => partnerOrderApi.updateStatus(id, 'REJECTED', reason));
      }}>
        <label className="commerce-field">Lý do từ chối (ít nhất 5 ký tự)
          <textarea
            required
            minLength={5}
            maxLength={500}
            rows={2}
            value={reason}
            onChange={e => setReason(e.target.value)}
            disabled={locked}
          />
        </label>
        <button className="btn btn--danger btn--sm" disabled={locked || reason.trim().length < 5}>
          Xác nhận từ chối
        </button>
      </form>
    </details>}
    {error && <Alert type="error">{error}</Alert>}
    {updated && <p className="muted" role="status">Đã lưu thay đổi. Đang chờ tải lại trạng thái đơn.</p>}
    <ConfirmModal
      open={modal === 'payment'}
      title="Xác nhận đã nhận tiền"
      isDanger={false}
      loading={busy}
      confirmText="Đã nhận tiền"
      cancelText="Chưa nhận"
      message={`Bạn đã thấy ${formatVND(order.totalAmount)} với nội dung ${order.transferContent} trong tài khoản của quán? Đơn ${order.orderCode} sẽ chuyển sang đã thanh toán và không thể hoàn tác.`}
      onConfirm={() => run(() => partnerOrderApi.confirmPayment(id))}
      onCancel={() => setModal(null)}
    />
    <ConfirmModal
      open={modal === 'refund'}
      title="Xác nhận đã hoàn tiền"
      isDanger={false}
      loading={busy}
      confirmText="Đã hoàn tiền"
      cancelText="Chưa hoàn"
      message={`Bạn đã chuyển trả ${formatVND(order.totalAmount)} cho khách của đơn ${order.orderCode}? Thao tác này không thể hoàn tác.`}
      onConfirm={() => run(() => partnerOrderApi.refund(id))}
      onCancel={() => setModal(null)}
    />
  </>;
}

export default function PartnerOrdersPage() {
  const [params, setParams] = useSearchParams();
  const requested = params.get('status');
  const status = Object.hasOwn(ORDER_STATUS, requested) ? requested : '';
  const refunds = params.get('refunds') === 'true';
  const requestedPage = Number(params.get('page'));
  const page = Number.isInteger(requestedPage) && requestedPage >= 0 && requestedPage <= 10000 ? requestedPage : 0;
  const identity = `${refunds}:${status}:${page}`;
  const currentIdentity = useRef(identity);
  currentIdentity.current = identity;
  const [result, setResult] = useState({ identity: null, data: null, error: '', loading: true });
  const { data, error, loading } = result.identity === identity ? result : { data: null, error: '', loading: true };
  const setPage = next => setParams({
    ...(refunds ? { refunds: 'true' } : status ? { status } : {}), ...(next ? { page: next } : {}),
  });
  const [fresh, setFresh] = useState(null);
  const [newOrder, setNewOrder] = useState(false);
  const sequence = useRef(0);
  // Tải lại không ẩn danh sách, để lý do từ chối đang gõ hoặc hộp xác nhận đang mở không bị mất.
  const load = useCallback(async () => {
    const request = ++sequence.current;
    setResult(previous => previous.identity === identity
      ? { ...previous, loading: !previous.data, error: '' }
      : { identity, data: null, error: '', loading: true });
    try {
      const result = await partnerOrderApi.list(status, page, refunds);
      if (request === sequence.current && currentIdentity.current === identity) {
        setResult({ identity, data: result, error: '', loading: false });
      }
    } catch (e) {
      if (request === sequence.current && currentIdentity.current === identity) {
        setResult(previous => ({ ...previous, error: getErrorMessage(e), loading: false }));
      }
    }
  }, [status, page, refunds, identity]);
  useEffect(() => {
    load();
    return () => { ++sequence.current; };
  }, [load]);
  const live = useOrderEvents('partner', event => {
    load();
    if (!event) return;
    setFresh(event.orderId);
    if (event.created && (refunds || page > 0 || !['', 'PENDING'].includes(status))) setNewOrder(true);
  });
  const showNewest = () => {
    setNewOrder(false);
    setParams({});
  };

  return <div className="commerce-page">
    <div className="commerce-row commerce-wrap">
      <h1>Đơn hàng của quán</h1>
      <LiveStatus live={live} />
      <button type="button" className="btn btn--outline" disabled={loading} onClick={load}><RefreshCw size={16} /> Làm mới</button>
    </div>
    {newOrder && <Alert type="info" title="Có đơn hàng mới">
      <button type="button" className="btn btn--outline btn--sm" onClick={showNewest}>Xem đơn mới</button>
    </Alert>}
    <div className="tf-tab-list" role="tablist" aria-label="Trạng thái đơn hàng"><button type="button" role="tab" aria-selected={!status && !refunds} className={!status && !refunds ? 'is-active' : ''} onClick={() => setParams({})}>Tất cả</button>{Object.entries(ORDER_STATUS).map(([value, meta]) => <button key={value} type="button" role="tab" aria-selected={status === value && !refunds} className={status === value && !refunds ? 'is-active' : ''} onClick={() => setParams({ status: value })}>{meta.label}</button>)}<button type="button" role="tab" aria-selected={refunds} className={refunds ? 'is-active' : ''} onClick={() => setParams({ refunds: 'true' })}>Cần hoàn tiền</button></div>
    {error && <Alert type="error">{error} <button type="button" className="btn btn--outline btn--sm" onClick={load}>Thử lại</button></Alert>}
    {loading && <p role="status">Đang tải…</p>}
    {!loading && !error && !data?.items.length && <p>Chưa có đơn hàng nào.</p>}
    {!loading && data?.items.map(order => <article
      key={`${order.orderId}:${order.orderStatus}:${order.paymentStatus}`}
      className={`tf-order-card ${fresh === order.orderId ? 'tf-order-card--fresh' : ''}`}
    >
      <div className="commerce-row commerce-wrap">
        <h2>{order.orderCode}</h2>
        <OrderStatus status={order.orderStatus} />
      </div>
      <p className="muted">{order.restaurantName} · {reviewTime(order.createdAt)}</p>
      <p><strong>{order.recipientName}</strong> · {order.recipientPhone}</p>
      <p className="commerce-text">{order.deliveryAddress}</p>
      {order.note && <p className="commerce-text">Ghi chú: {order.note}</p>}
      {order.cancelReason && <p className="commerce-text">Lý do: {order.cancelReason}</p>}
      <OrderLines items={order.items} />
      <OrderTotals subtotal={order.subtotal} fee={order.deliveryFee} total={order.totalAmount} />
      <div className="commerce-row commerce-wrap">
        <span>{PAYMENT_METHOD[order.paymentMethod]}</span>
        <PaymentStatus status={order.paymentStatus} />
      </div>
      <OrderActions order={order} reload={load} />
    </article>)}
    {!loading && <Pagination page={page} total={data?.total || 0} setPage={setPage} />}
  </div>;
}
