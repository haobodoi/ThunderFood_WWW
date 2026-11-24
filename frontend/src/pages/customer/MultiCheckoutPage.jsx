import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { orderApi } from '../../api/orderApi.js';
import { getErrorMessage, getFieldErrors } from '../../api/baseApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { PAYMENT_METHOD } from '../../utils/orderUtils.js';
import Alert from '../../components/Alert.jsx';
import TextField from '../../components/TextField.jsx';
import { OrderLines, OrderTotals } from '../../components/OrderParts.jsx';
import { formatVND } from '../../components/FoodCard.jsx';

export default function MultiCheckoutPage() {
  const [searchParams] = useSearchParams();
  const selection = searchParams.get('cartIds') || '';
  return <MultiCheckout key={selection} selection={selection} />;
}

function MultiCheckout({ selection }) {
  const cartIds = useMemo(() => [...new Set(selection.split(',').map(Number)
    .filter(id => Number.isSafeInteger(id) && id > 0))], [selection]);
  const { user } = useAuth();
  const { refreshAfterCheckout } = useCart();
  const navigate = useNavigate();
  const [previews, setPreviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState({
    recipientName: user?.fullName || '', recipientPhone: user?.phone || '', deliveryAddress: user?.address || '', note: ''
  });
  const [method, setMethod] = useState('COD');
  const [created, setCreated] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const active = useRef(false);
  const submittingRef = useRef(false);
  const loadSequence = useRef(0);

  const load = useCallback(async ids => {
    const request = ++loadSequence.current;
    setLoading(true);
    try {
      const results = await Promise.all(ids.map(id => orderApi.preview(id)));
      if (request !== loadSequence.current) return;
      setPreviews(results);
      setLoadError('');
    } catch (e) {
      if (request === loadSequence.current) setLoadError(getErrorMessage(e));
    } finally {
      if (request === loadSequence.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    active.current = true;
    load(cartIds);
    return () => { active.current = false; ++loadSequence.current; };
  }, [cartIds, load]);

  const orderable = previews.filter(preview => preview.items.some(line => line.available));
  const unavailable = previews.filter(preview => !preview.items.some(line => line.available));
  const onlineAvailable = orderable.length > 0 && orderable.every(preview => preview.onlineAvailable);
  const chosen = method === 'ONLINE' && !onlineAvailable ? null : method;
  const total = orderable.reduce((sum, preview) => sum + Number(preview.totalAmount || 0), 0);
  const update = event => setForm(previous => ({ ...previous, [event.target.name]: event.target.value }));
  const submit = async event => {
    event.preventDefault();
    if (submittingRef.current || !chosen || !orderable.length) return;
    submittingRef.current = true;
    setSubmitting(true); setError(''); setFieldErrors({});
    const placed = [...created];
    try {
      for (const preview of orderable) {
        if (!active.current) break;
        const order = await orderApi.checkout(preview, { ...form, paymentMethod: chosen });
        placed.push({ cartId: preview.cartId, orderId: order.orderId, restaurantName: preview.restaurantName });
      }
      await refreshAfterCheckout();
      if (active.current) navigate(placed.length === 1 ? `/customer/orders/${placed[0].orderId}` : '/customer/orders', { replace: true });
    } catch (e) {
      await refreshAfterCheckout();
      if (!active.current) return;
      setCreated(placed);
      setError(getErrorMessage(e));
      setFieldErrors(getFieldErrors(e));
      const completedCarts = new Set(placed.map(order => order.cartId));
      await load(cartIds.filter(id => !completedCarts.has(id)));
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const placedOrders = created.length > 0 && <Alert type="success" title={`Đã tạo ${created.length} đơn`}>
    <ul>{created.map(order => <li key={order.orderId}><Link to={`/customer/orders/${order.orderId}`}>{order.restaurantName}</Link></li>)}</ul>
  </Alert>;
  if (loading) return <main className="container commerce-page"><p role="status">Đang kiểm tra các giỏ hàng…</p></main>;
  if (loadError || !orderable.length) return <main className="container commerce-page">
    <h1>Đặt tất cả</h1>
    {placedOrders}
    {error && <Alert type="error">{error}</Alert>}
    {loadError ? <Alert type="error">{loadError}</Alert> : <Alert type="warning">
      {cartIds.length ? 'Không có món nào có thể đặt lúc này.' : 'Không tìm thấy giỏ hàng để đặt.'}
    </Alert>}
    <Link className="btn btn--outline" to="/customer/cart">Về giỏ hàng</Link>
  </main>;

  return <main className="container commerce-page">
    <h1>Đặt tất cả món</h1>
    {placedOrders}
    <p>Mỗi nhà hàng sẽ nhận một đơn riêng, với cùng thông tin giao hàng bên dưới.</p>
    <form className="tf-checkout" onSubmit={submit} noValidate>
      <section className="commerce-cart tf-checkout__form">
        <h2>Thông tin giao hàng</h2>
        <TextField label="Người nhận" name="recipientName" value={form.recipientName} onChange={update} error={fieldErrors.recipientName} autoComplete="name" disabled={submitting} />
        <TextField label="Số điện thoại" name="recipientPhone" type="tel" value={form.recipientPhone} onChange={update} error={fieldErrors.recipientPhone} autoComplete="tel" disabled={submitting} />
        <TextField label="Địa chỉ giao hàng" name="deliveryAddress" value={form.deliveryAddress} onChange={update} error={fieldErrors.deliveryAddress} autoComplete="street-address" disabled={submitting} />
        <label className="commerce-field">Ghi chú cho các quán (không bắt buộc)<textarea name="note" maxLength={1000} rows={2} value={form.note} onChange={update} disabled={submitting} /></label>
        <fieldset className="tf-pay-methods" disabled={submitting}>
          <legend>Phương thức thanh toán</legend>
          {['ONLINE', 'COD'].map(value => <label key={value} className="tf-pay-method">
            <input type="radio" name="paymentMethod" value={value} checked={chosen === value} disabled={value === 'ONLINE' && !onlineAvailable} onChange={() => setMethod(value)} />
            <span>{PAYMENT_METHOD[value]}</span>
          </label>)}
          {!onlineAvailable && <small>Chỉ dùng thanh toán khi nhận hàng vì có quán chưa hỗ trợ VietQR.</small>}
          {chosen === 'ONLINE' && <small>Sau khi đặt, vào “Đơn hàng” để thanh toán từng đơn.</small>}
        </fieldset>
      </section>
      <aside className="tf-checkout__summary tf-multi-checkout__summary">
        <h2>Đơn theo nhà hàng</h2>
        {orderable.map(preview => {
          const available = preview.items.filter(line => line.available);
          const skipped = preview.items.length - available.length;
          return <section className="tf-multi-checkout__restaurant" key={preview.cartId}>
            <h3>{preview.restaurantName}</h3>
            <OrderLines items={available} />
            {skipped > 0 && <Alert type="warning">{skipped} món không đặt được sẽ giữ lại trong giỏ.</Alert>}
            <OrderTotals subtotal={preview.subtotal} fee={preview.deliveryFee} total={preview.totalAmount} />
          </section>;
        })}
        {unavailable.length > 0 && <Alert type="warning">
          Các quán chưa có món đặt được sẽ được giữ trong giỏ: {unavailable.map(preview => preview.restaurantName).join(', ')}.
        </Alert>}
        <div className="tf-multi-checkout__grand"><span>Tổng {orderable.length} đơn</span><strong>{formatVND(total)}</strong></div>
        {error && <Alert type="error">{error}</Alert>}
        <button type="submit" className="btn btn--primary btn--block" disabled={submitting || !chosen}>{submitting ? 'Đang tạo đơn…' : `Đặt ${orderable.length} đơn`}</button>
        <Link className="btn btn--ghost btn--block" to="/customer/cart">Quay lại giỏ hàng</Link>
      </aside>
    </form>
  </main>;
}
