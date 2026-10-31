import { useCallback, useEffect, useRef, useState } from 'react';
import { partnerOrderApi } from '../../api/orderApi.js';
import { getErrorMessage } from '../../api/baseApi.js';
import { NEXT_ACTION, ORDER_STATUS, PAYMENT_METHOD, awaitingTransfer } from '../../utils/orderUtils.js';
import { useOrderEvents } from '../../hooks/useOrderEvents.js';
import { Pagination, reviewTime } from '../../components/CustomerReviews.jsx';
import { formatVND } from '../../components/FoodCard.jsx';
import Alert from '../../components/Alert.jsx';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import { LiveStatus, OrderLines, OrderStatus, OrderTotals, PaymentStatus } from '../../components/OrderParts.jsx';

function OrderActions({ order, reload }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reason, setReason] = useState('');
  const [modal, setModal] = useState(null);
  const run = async operation => {
    setBusy(true); setError('');
    try { await operation(); setModal(null); reload(); }
    catch (e) { setError(getErrorMessage(e)); setModal(null); setBusy(false); }
  };
  const id = order.order_id;
  const transfer = awaitingTransfer(order);
  const next = NEXT_ACTION[order.order_status];
  const refundable = order.order_status === 'REJECTED' && order.payment_status === 'PAID';
  const rejectable = ['PENDING', 'CONFIRMED'].includes(order.order_status);
  return <>
    {transfer && <Alert type="warning" title="Chờ khách chuyển khoản">Kiểm tra tài khoản ngân hàng của quán: số tiền <strong>{formatVND(order.total_amount)}</strong>, nội dung <strong>{order.transfer_content}</strong>.</Alert>}
    {refundable && <Alert type="warning" title="Cần hoàn tiền cho khách">Đơn đã thanh toán {formatVND(order.total_amount)} nhưng bị từ chối. Liên hệ khách qua {order.recipient_phone} để hoàn tiền.</Alert>}
    <div className="tf-order-actions">
      {transfer && <button type="button" className="btn btn--primary btn--sm" disabled={busy} onClick={() => setModal('payment')}>Đã nhận tiền</button>}
      {order.order_status === 'PENDING' && order.payment_method === 'COD' && <button type="button" className="btn btn--primary btn--sm" disabled={busy} onClick={() => run(() => partnerOrderApi.updateStatus(id, 'CONFIRMED'))}>Nhận đơn</button>}
      {next && <button type="button" className="btn btn--primary btn--sm" disabled={busy} onClick={() => run(() => partnerOrderApi.updateStatus(id, next.status))}>{next.label}</button>}
      {refundable && <button type="button" className="btn btn--primary btn--sm" disabled={busy} onClick={() => setModal('refund')}>Đã hoàn tiền</button>}
    </div>
    {rejectable && <details className="tf-order-cancel">
      <summary>Từ chối đơn</summary>
      <form onSubmit={event => { event.preventDefault(); run(() => partnerOrderApi.updateStatus(id, 'REJECTED', reason)); }}>
        <label className="commerce-field">Lý do từ chối (ít nhất 5 ký tự)
          <textarea required minLength={5} maxLength={500} rows={2} value={reason} onChange={e => setReason(e.target.value)} disabled={busy} />
        </label>
        <button className="btn btn--danger btn--sm" disabled={busy || reason.trim().length < 5}>Xác nhận từ chối</button>
      </form>
    </details>}
    {error && <Alert type="error">{error}</Alert>}
    <ConfirmModal open={modal === 'payment'} title="Xác nhận đã nhận tiền" isDanger={false} loading={busy} confirmText="Đã nhận tiền" cancelText="Chưa nhận"
      message={`Bạn đã thấy ${formatVND(order.total_amount)} với nội dung ${order.transfer_content} trong tài khoản của quán? Đơn ${order.order_code} sẽ chuyển sang đã thanh toán và không thể hoàn tác.`}
      onConfirm={() => run(() => partnerOrderApi.confirmPayment(id))} onCancel={() => setModal(null)} />
    <ConfirmModal open={modal === 'refund'} title="Xác nhận đã hoàn tiền" isDanger={false} loading={busy} confirmText="Đã hoàn tiền" cancelText="Chưa hoàn"
      message={`Bạn đã chuyển trả ${formatVND(order.total_amount)} cho khách của đơn ${order.order_code}? Thao tác này không thể hoàn tác.`}
      onConfirm={() => run(() => partnerOrderApi.refund(id))} onCancel={() => setModal(null)} />
  </>;
}

export default function PartnerOrdersPage() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [fresh, setFresh] = useState(null);
  const [newOrder, setNewOrder] = useState(false);
  const sequence = useRef(0);
  // Tải lại không ẩn danh sách, để lý do từ chối đang gõ hoặc hộp xác nhận đang mở không bị mất.
  const load = useCallback(async () => {
    const request = ++sequence.current;
    try {
      const result = await partnerOrderApi.list(status, page);
      if (request === sequence.current) { setData(result); setError(''); }
    } catch (e) { if (request === sequence.current) setError(getErrorMessage(e)); }
    finally { if (request === sequence.current) setLoading(false); }
  }, [status, page]);
  useEffect(() => { setLoading(true); load(); }, [load]);
  const live = useOrderEvents('partner', event => {
    load();
    if (!event) return;
    setFresh(event.orderId);
    if (event.created && (page > 0 || !['', 'PENDING'].includes(status))) setNewOrder(true);
  });
  const showNewest = () => { setNewOrder(false); setStatus(''); setPage(0); };

  return <div className="commerce-page">
    <div className="commerce-row commerce-wrap"><h1>Đơn hàng của quán</h1><LiveStatus live={live} /></div>
    {newOrder && <Alert type="info" title="Có đơn hàng mới"><button type="button" className="btn btn--outline btn--sm" onClick={showNewest}>Xem đơn mới</button></Alert>}
    <div className="commerce-filters">
      <label>Trạng thái
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(0); }}>
          <option value="">Tất cả</option>
          {Object.entries(ORDER_STATUS).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}
        </select>
      </label>
    </div>
    {error && <Alert type="error">{error}</Alert>}
    {loading && <p role="status">Đang tải…</p>}
    {!loading && !error && !data?.items.length && <p>Chưa có đơn hàng nào.</p>}
    {!loading && data?.items.map(order => <article key={`${order.order_id}:${order.order_status}:${order.payment_status}`} className={`tf-order-card ${fresh === order.order_id ? 'tf-order-card--fresh' : ''}`}>
      <div className="commerce-row commerce-wrap">
        <h2>{order.order_code}</h2>
        <OrderStatus status={order.order_status} />
      </div>
      <p className="muted">{order.restaurant_name} · {reviewTime(order.created_at)}</p>
      <p><strong>{order.recipient_name}</strong> · {order.recipient_phone}</p>
      <p className="commerce-text">{order.delivery_address}</p>
      {order.note && <p className="commerce-text">Ghi chú: {order.note}</p>}
      {order.cancel_reason && <p className="commerce-text">Lý do: {order.cancel_reason}</p>}
      <OrderLines items={order.items} />
      <OrderTotals subtotal={order.subtotal} fee={order.delivery_fee} total={order.total_amount} />
      <div className="commerce-row commerce-wrap"><span>{PAYMENT_METHOD[order.payment_method]}</span><PaymentStatus status={order.payment_status} /></div>
      <OrderActions order={order} reload={load} />
    </article>)}
    {!loading && <Pagination page={page} total={data?.total || 0} setPage={setPage} />}
  </div>;
}
