import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { orderApi } from '../../api/orderApi.js';
import { getErrorMessage } from '../../api/baseApi.js';
import { awaitingTransfer } from '../../utils/orderUtils.js';
import { useOrderEvents } from '../../hooks/useOrderEvents.js';
import { Pagination, reviewTime } from '../../components/CustomerReviews.jsx';
import { formatVND } from '../../components/FoodCard.jsx';
import Alert from '../../components/Alert.jsx';
import { LiveStatus, OrderStatus, PaymentStatus } from '../../components/OrderParts.jsx';

export default function OrdersPage() {
  const [params, setParams] = useSearchParams();
  const group = ['ALL', 'PROCESSING', 'COMPLETED', 'CLOSED'].includes(params.get('group')) ? params.get('group') : 'ALL';
  const queryPage = Number(params.get('page'));
  const page = Number.isInteger(queryPage) && queryPage >= 0 ? queryPage : 0;
  const setPage = next => setParams({ ...(group !== 'ALL' ? { group } : {}), ...(next > 0 ? { page: next } : {}) });
  const selectGroup = next => setParams(next === 'ALL' ? {} : { group: next });
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const sequence = useRef(0);
  const load = useCallback(async () => {
    const request = ++sequence.current;
    try {
      const result = await orderApi.mine(page, group);
      if (request === sequence.current) {
        setData(result);
        setError('');
      }
    } catch (e) {
      if (request === sequence.current) setError(getErrorMessage(e));
    } finally {
      if (request === sequence.current) setLoading(false);
    }
  }, [page, group]);
  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);
  const live = useOrderEvents('customer', load);

  return <div className="container commerce-page">
    <div className="commerce-row commerce-wrap">
      <h1>Đơn hàng của tôi</h1>
      <LiveStatus live={live} />
    </div>
    <div className="tf-tab-list" role="tablist" aria-label="Nhóm đơn hàng">{[{ key: 'ALL', label: 'Tất cả' }, { key: 'PROCESSING', label: 'Đang xử lý' }, { key: 'COMPLETED', label: 'Hoàn thành' }, { key: 'CLOSED', label: 'Đã hủy hoặc từ chối' }].map(tab => <button key={tab.key} type="button" role="tab" aria-selected={group === tab.key} className={group === tab.key ? 'is-active' : ''} onClick={() => selectGroup(tab.key)}>{tab.label}</button>)}</div>
    {error && <Alert type="error">{error}</Alert>}
    {loading && <p role="status">Đang tải…</p>}
    {!loading && !error && !data?.items.length && <div className="empty-state">
      <h2>Bạn chưa có đơn hàng nào</h2>
      <Link className="btn btn--primary" to="/">Khám phá món ngon</Link>
    </div>}
    {!loading && data?.items.map(order => <article key={order.orderId} className="tf-order-card">
      <div className="commerce-row commerce-wrap">
        <h2><Link to={`/customer/orders/${order.orderId}`}>{order.restaurantName}</Link></h2>
        <OrderStatus status={order.orderStatus} />
      </div>
      <p className="muted">{order.orderCode} · {reviewTime(order.createdAt)}</p>
      <p className="commerce-text">{order.items.map(line => `${line.quantity} × ${line.itemName}`).join(', ')}</p>
      <div className="commerce-row commerce-wrap">
        <strong>{formatVND(order.totalAmount)}</strong>
        <PaymentStatus status={order.paymentStatus} />
      </div>
      <Link
        className={`btn btn--sm ${awaitingTransfer(order) ? 'btn--primary' : 'btn--outline'}`}
        to={`/customer/orders/${order.orderId}`}
      >
        {awaitingTransfer(order) ? 'Thanh toán' : 'Xem chi tiết'}
      </Link>
    </article>)}
    {!loading && <Pagination page={page} total={data?.total || 0} setPage={setPage} />}
  </div>;
}
