import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { adminApi } from '../../api/adminApi.js';
import { getErrorMessage } from '../../api/baseApi.js';
import { ORDER_STATUS, PAYMENT_STATUS, PAYMENT_METHOD, NEXT_ACTION, awaitingTransfer, needsRefund } from '../../utils/orderUtils.js';
import { OrderStatus, PaymentStatus, OrderLines, OrderTotals, OrderProgress } from '../../components/OrderParts.jsx';
import Modal from '../../components/Modal.jsx';
import Alert from '../../components/Alert.jsx';
import { Head, Field, Search, Pager, DataState, OrderTable, Toast, WaitingTime, useAdminData, formatDateTime } from './AdminShared.jsx';

// Lọc nhanh theo từng bước xử lý của đơn giao đồ ăn; `count` là khóa trong /admin/orders/counts.
const ORDER_VIEWS = [
  { label: 'Tất cả', status: '', payment: '', count: 'total' },
  { label: 'Chờ xác nhận', status: 'PENDING', payment: '', count: 'PENDING', urgent: true },
  { label: 'Chờ đối soát VietQR', status: '', payment: '', awaiting: 'true', count: 'awaitingTransfer', urgent: true },
  { label: 'Đã xác nhận', status: 'CONFIRMED', payment: '', count: 'CONFIRMED' },
  { label: 'Đang chế biến', status: 'PREPARING', payment: '', count: 'PREPARING' },
  { label: 'Đang giao', status: 'DELIVERING', payment: '', count: 'DELIVERING' },
  { label: 'Cần hoàn tiền', status: '', payment: '', refunds: 'true', count: 'refunds', urgent: true },
];
const countFormat = new Intl.NumberFormat('vi-VN');

export default function AdminOrdersPage() {
  const [params, setParams] = useSearchParams();
  const filters = Object.fromEntries(params);
  const requestedPage = Number(filters.page);
  const page = Number.isInteger(requestedPage) && requestedPage >= 0 ? requestedPage : 0;
  const resource = useAdminData('/orders', { ...filters, page });
  const counts = useAdminData('/orders/counts');
  function refresh() { resource.refresh(); counts.refresh(); }

  function change(changes) {
    const next = { ...filters, ...changes, page: 0 };
    setParams(Object.fromEntries(Object.entries(next).filter(([, value]) => value)));
  }

  return <div className="admin-page">
    <Head title="Quản lý đơn hàng" description="Tra cứu đơn, theo dõi thanh toán và xử lý theo trạng thái.">
      <button type="button" className="btn btn--outline" disabled={resource.loading} onClick={refresh}><RefreshCw size={16} /> Làm mới</button>
    </Head>
    <section className="admin-panel order-filters">
      <div className="tabs order-quick-tabs" role="group" aria-label="Lọc nhanh đơn hàng">
        {ORDER_VIEWS.map(view => {
          const active = (filters.status || '') === view.status && (filters.payment || '') === view.payment
            && (filters.refunds || '') === (view.refunds || '') && (filters.awaiting || '') === (view.awaiting || '');
          const count = counts.data?.[view.count];
          return <button key={view.label} type="button" className={'tabs__item' + (active ? ' is-active' : '')}
            aria-pressed={active} onClick={() => change({ status: view.status, payment: view.payment, refunds: view.refunds, awaiting: view.awaiting })}>
            {view.label}
            {count != null && <span className="tab-count" data-urgent={(view.urgent && Number(count) > 0) || undefined}>{countFormat.format(Number(count))}</span>}
          </button>;
        })}
      </div>
      <div className="admin-filters">
        <Search value={filters.q || ''} label="Mã đơn / khách hàng" onChange={q => change({ q })} />
        <Field label="Trạng thái đơn"><select name="status" value={filters.status || ''} onChange={event => change({ status: event.target.value, refunds: '', awaiting: '' })}>
          <option value="">Tất cả</option>{Object.entries(ORDER_STATUS).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}
        </select></Field>
        <Field label="Thanh toán"><select name="payment" value={filters.payment || ''} onChange={event => change({ payment: event.target.value, refunds: '', awaiting: '' })}>
          <option value="">Tất cả</option>{Object.entries(PAYMENT_STATUS).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}
        </select></Field>
        <Field label="Từ ngày"><input type="date" name="from" max={filters.to || undefined} value={filters.from || ''} onChange={event => change({ from: event.target.value })} /></Field>
        <Field label="Đến ngày"><input type="date" name="to" min={filters.from || undefined} value={filters.to || ''} onChange={event => change({ to: event.target.value })} /></Field>
        <Field label="Sắp xếp"><select name="sort" value={filters.sort || 'newest'} onChange={event => change({ sort: event.target.value })}>
          <option value="newest">Mới nhất</option><option value="oldest">Cũ nhất</option><option value="total">Tổng tiền giảm dần</option>
        </select></Field>
        {filters.customer && <button type="button" className="btn btn--outline" onClick={() => change({ customer: '' })}>Bỏ lọc khách #{filters.customer}</button>}
        {!!params.size && <button type="button" className="btn btn--ghost" onClick={() => setParams({})}>Xóa bộ lọc</button>}
      </div>
    </section>
    <DataState resource={resource} empty={resource.data?.items.length === 0}><OrderTable items={resource.data?.items} /></DataState>
    {resource.data && <Pager page={page} total={resource.data.total} onChange={next => setParams({ ...filters, page: next })} />}
  </div>;
}

export function AdminOrderDetailPage() {
  const { id } = useParams(), { user } = useAuth(), resource = useAdminData(`/orders/${id}`), o = resource.data;
  const [action, setAction] = useState(null), [reason, setReason] = useState(''), [error, setError] = useState(''), [success, setSuccess] = useState(''), [busy, setBusy] = useState(false);
  function begin(a) { setReason(''); setError(''); setAction(a); }
  async function submit(e) {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      await adminApi.save('post', `/orders/${id}/${action.path}`, action.path === 'notes' ? { reason: reason.trim() } : { expectedStatus: o.orderStatus, expectedPayment: o.paymentStatus, status: action.status, reason: reason.trim() });
      setAction(null); setSuccess('Đã cập nhật đơn hàng.'); resource.refresh();
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setBusy(false); }
  }
  return <div className="admin-page"><Head title={o?.orderCode || 'Chi tiết đơn hàng'} description="Thông tin món và số tiền được lưu tại lúc đặt đơn."><Link className="btn btn--outline" to="/admin/orders">← Danh sách đơn</Link><button type="button" className="btn btn--outline" onClick={resource.refresh}><RefreshCw size={16} /> Làm mới</button></Head>{success && <Toast message={success} onClose={() => setSuccess('')} />}<DataState resource={resource}>{o && <>
    <section className="admin-panel admin-order-summary"><div className="admin-section-head"><h2>Trạng thái đơn</h2></div><div className="admin-actions"><OrderStatus status={o.orderStatus} />{o.orderStatus === 'PENDING' && <WaitingTime createdAt={o.createdAt} />}<PaymentStatus status={o.paymentStatus} /><span>{PAYMENT_METHOD[o.paymentMethod]}</span></div><OrderProgress status={o.orderStatus} /><div className="admin-actions">
      {o.orderStatus === 'PENDING' && !awaitingTransfer(o) && <button className="btn btn--primary" onClick={() => begin({ path: 'status', status: 'CONFIRMED', label: 'Xác nhận đơn' })}>Xác nhận đơn</button>}
      {awaitingTransfer(o) && user.role === 'ADMIN' && <button className="btn btn--primary" onClick={() => begin({ path: 'confirm-payment', label: 'Xác nhận đã nhận tiền', financial: true })}>Đã nhận tiền VietQR</button>}
      {NEXT_ACTION[o.orderStatus] && <button className="btn btn--primary" onClick={() => begin({ path: 'status', ...NEXT_ACTION[o.orderStatus] })}>{NEXT_ACTION[o.orderStatus].label}</button>}
      {['PENDING', 'CONFIRMED'].includes(o.orderStatus) && <button className="btn btn--outline" onClick={() => begin({ path: 'status', status: 'REJECTED', label: 'Từ chối / hủy đơn', requiredReason: true })}>Từ chối / hủy đơn</button>}
      {needsRefund(o) && user.role === 'ADMIN' && <button className="btn btn--primary" onClick={() => begin({ path: 'refund', label: 'Xác nhận đã hoàn tiền', financial: true })}>Đã hoàn tiền</button>}
      <button className="btn btn--outline" onClick={() => begin({ path: 'notes', label: 'Thêm ghi chú nội bộ', requiredReason: true })}>Thêm ghi chú</button></div>{awaitingTransfer(o) && <p className="muted">Chuyển khoản trực tiếp tới quán. Quản trị viên hoặc chủ quán xác nhận sau khi đối soát.</p>}{o.cancelReason && <p>Lý do kết thúc: {o.cancelReason}</p>}</section>
    <div className="admin-grid"><section className="admin-panel"><h2>Khách hàng & giao hàng</h2><dl className="admin-definition"><dt>Người nhận</dt><dd>{o.recipientName}</dd><dt>Điện thoại</dt><dd>{o.recipientPhone}</dd><dt>Địa chỉ</dt><dd>{o.deliveryAddress}</dd><dt>Quán</dt><dd>{o.restaurantName}</dd><dt>Thời gian đặt</dt><dd>{formatDateTime(o.createdAt)}</dd><dt>Ghi chú khách</dt><dd>{o.note || 'Không có'}</dd></dl>{user.role === 'ADMIN' && <Link className="admin-link" to={`/admin/users/${o.customerId}`}>Xem tài khoản và lịch sử đơn →</Link>}</section><section className="admin-panel"><h2>Món trong đơn</h2><OrderLines items={o.items} /><OrderTotals subtotal={o.subtotal} fee={o.deliveryFee} total={o.totalAmount} /><p className="muted">Giảm giá: chưa áp dụng trong hệ thống hiện tại.</p>{o.payments.map((payment, i) => <p key={i}>
      Đối soát {payment.provider === 'SEPAY_MOCK' ? 'SePay mô phỏng' : payment.provider}: <strong>{payment.transactionCode || '—'}</strong>
      {payment.sepayTransactionId > 0 && <> · Giao dịch SePay #{payment.sepayTransactionId}</>}
      {payment.bankReference && <> · Tham chiếu ngân hàng {payment.bankReference}</>}
    </p>)}</section></div>
    <div className="admin-grid"><section className="admin-panel"><h2>Lịch sử trạng thái</h2>{o.history.length ? <ol className="admin-timeline">{o.history.map((h,i) => <li key={i}><strong>{ORDER_STATUS[h.toStatus]?.label} · {PAYMENT_STATUS[h.toPayment]?.label}</strong><small>{formatDateTime(h.createdAt)}</small>{h.reason && <p>{h.reason}</p>}</li>)}</ol> : <p>Đơn cũ chưa có lịch sử trước migration V5.</p>}</section><section className="admin-panel"><h2>Hoạt động & ghi chú nội bộ</h2>{o.notes.length ? <ol className="admin-timeline">{o.notes.map(n => <li key={n.id}><strong>{n.actor || 'Tài khoản không còn tồn tại'}</strong><small>{formatDateTime(n.createdAt)}</small><p>{n.detail}</p></li>)}</ol> : <p>Chưa có ghi chú.</p>}</section></div>
  </>}</DataState>{action && <Modal title={action.label} onClose={busy ? undefined : () => setAction(null)}><form onSubmit={submit} className="admin-form">{error && <Alert type="error">{error}</Alert>}<p>{action.financial ? 'Chỉ xác nhận khi đã kiểm tra tiền thực tế trong tài khoản ngân hàng của quán. Hệ thống ghi nhận kết quả đối soát, không thực hiện chuyển tiền.' : 'Xác nhận thao tác trên đơn ' + o.orderCode + '. Trạng thái sẽ được lưu vào lịch sử.'}</p><Field label={action.requiredReason ? 'Nội dung / lý do (5–500 ký tự)' : 'Ghi chú đối soát / lý do (tùy chọn)'}><textarea name="reason" required={action.requiredReason} minLength={action.requiredReason ? 5 : undefined} maxLength={500} rows={3} value={reason} onChange={e => setReason(e.target.value)} /></Field><div className="admin-actions"><button className="btn btn--outline" type="button" disabled={busy} onClick={() => setAction(null)}>Quay lại</button><button className="btn btn--primary" disabled={busy}>{busy ? 'Đang lưu…' : 'Xác nhận'}</button></div></form></Modal>}</div>;
}
