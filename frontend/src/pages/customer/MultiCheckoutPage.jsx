import { useCallback, useEffect, useMemo, useState } from 'react';
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
  const cartIds = useMemo(() => [...new Set((searchParams.get('cartIds') || '')
    .split(',').filter(Boolean).map(Number).filter(Number.isSafeInteger))], [searchParams]);
  const { user } = useAuth();
  const { refresh } = useCart();
  const navigate = useNavigate();
  const [previews, setPreviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState({
    recipientName: user?.fullName || '', recipientPhone: user?.phone || '', deliveryAddress: user?.address || '', note: ''
  });
  const [method, setMethod] = useState('COD');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const load = useCallback(async () => {
    if (!cartIds.length) { setLoadError('Không tìm thấy giỏ hàng để đặt.'); setLoading(false); return; }
    setLoading(true);
    try {
      const results = await Promise.all(cartIds.map(id => orderApi.preview(id)));
      setPreviews(results);
      setLoadError('');
    } catch (e) { setLoadError(getErrorMessage(e)); }
    finally { setLoading(false); }
  }, [cartIds]);
  useEffect(() => { load(); }, [load]);

  const orderable = previews.filter(preview => preview.items.some(line => line.available));
  const onlineAvailable = orderable.length > 0 && orderable.every(preview => preview.onlineAvailable);
  const total = orderable.reduce((sum, preview) => sum + Number(preview.totalAmount || 0), 0);
  const update = event => setForm(previous => ({ ...previous, [event.target.name]: event.target.value }));
  const submit = async event => {
    event.preventDefault();
    setSubmitting(true); setError(''); setFieldErrors({});
    const created = [];
    try {
      for (const preview of orderable) {
        created.push(await orderApi.checkout({
          ...form, cartId: preview.cartId, version: preview.version, expectedTotal: preview.totalAmount, paymentMethod: method
        }));
      }
      await refresh();
      navigate(created.length === 1 ? `/customer/orders/${created[0].orderId}` : '/customer/orders', { replace: true });
    } catch (e) {
      setError(created.length
        ? `Đã tạo ${created.length}/${orderable.length} đơn. ${getErrorMessage(e)}`
        : getErrorMessage(e));
      setFieldErrors(getFieldErrors(e));
      await refresh();
      await load();
      setSubmitting(false);
    }
  };

  if (loading) return <main className="container commerce-page"><p role="status">Đang kiểm tra các giỏ hàng…</p></main>;
  if (loadError) return <main className="container commerce-page"><Alert type="error">{loadError}</Alert><Link className="btn btn--outline" to="/customer/cart">Về giỏ hàng</Link></main>;
  if (!orderable.length) return <main className="container commerce-page"><h1>Đặt tất cả</h1><Alert type="warning">Không có món nào có thể đặt lúc này.</Alert><Link className="btn btn--outline" to="/customer/cart">Về giỏ hàng</Link></main>;

  return <main className="container commerce-page">
    <h1>Đặt tất cả món</h1>
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
            <input type="radio" name="paymentMethod" value={value} checked={method === value} disabled={value === 'ONLINE' && !onlineAvailable} onChange={() => setMethod(value)} />
            <span>{PAYMENT_METHOD[value]}</span>
          </label>)}
          {!onlineAvailable && <small>Chỉ dùng thanh toán khi nhận hàng vì có quán chưa hỗ trợ VietQR.</small>}
          {method === 'ONLINE' && <small>Sau khi đặt, vào “Đơn hàng” để thanh toán QR cho từng đơn.</small>}
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
        <div className="tf-multi-checkout__grand"><span>Tổng {orderable.length} đơn</span><strong>{formatVND(total)}</strong></div>
        {error && <Alert type="error">{error}</Alert>}
        <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>{submitting ? 'Đang tạo đơn…' : `Đặt ${orderable.length} đơn`}</button>
        <Link className="btn btn--ghost btn--block" to="/customer/cart">Quay lại giỏ hàng</Link>
      </aside>
    </form>
  </main>;
}
