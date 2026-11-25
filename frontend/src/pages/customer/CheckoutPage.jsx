import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { orderApi } from '../../api/orderApi.js';
import { getErrorMessage, getFieldErrors } from '../../api/baseApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { PAYMENT_METHOD } from '../../utils/orderUtils.js';
import Alert from '../../components/Alert.jsx';
import TextField from '../../components/TextField.jsx';
import { OrderLines, OrderTotals } from '../../components/OrderParts.jsx';

export default function CheckoutPage() {
  const { cartId } = useParams();
  return <Checkout key={cartId} cartId={cartId} />;
}

function Checkout({ cartId }) {
  const { user } = useAuth();
  const { refreshAfterCheckout } = useCart();
  const navigate = useNavigate();
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState({
    recipientName: user?.fullName || '',
    recipientPhone: user?.phone || '',
    deliveryAddress: user?.address || '',
    note: ''
  });
  const [method, setMethod] = useState('ONLINE');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const active = useRef(false);
  const submittingRef = useRef(false);
  const loadSequence = useRef(0);

  const load = useCallback(async () => {
    const request = ++loadSequence.current;
    try {
      const result = await orderApi.preview(cartId);
      if (request === loadSequence.current) {
        setPreview(result);
        setLoadError('');
      }
    } catch (e) {
      if (request === loadSequence.current) setLoadError(getErrorMessage(e));
    } finally {
      if (request === loadSequence.current) setLoading(false);
    }
  }, [cartId]);
  useEffect(() => {
    active.current = true;
    load();
    return () => { active.current = false; ++loadSequence.current; };
  }, [load]);

  if (loading) return <div className="container commerce-page">
    <p role="status">Đang tải đơn hàng…</p>
  </div>;
  if (loadError) return <div className="container commerce-page">
    <Alert type="error">{loadError}</Alert>
    <Link className="btn btn--outline" to="/customer/cart">Về giỏ hàng</Link>
  </div>;

  const available = preview.items.filter(line => line.available);
  const skipped = preview.items.filter(line => !line.available);
  const chosen = preview.onlineAvailable ? method : 'COD';
  const update = event => setForm(previous => ({ ...previous, [event.target.name]: event.target.value }));
  const submit = async event => {
    event.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError('');
    setFieldErrors({});
    try {
      const order = await orderApi.checkout(preview, { ...form, paymentMethod: chosen });
      await refreshAfterCheckout();
      if (active.current) navigate(`/customer/orders/${order.orderId}`, { replace: true });
    } catch (e) {
      if (!active.current) return;
      setError(getErrorMessage(e));
      setFieldErrors(getFieldErrors(e));
      // Tổng tiền hoặc giỏ có thể vừa đổi: hiện số mới để khách xem lại, không tự gửi lại.
      await load();
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  if (!available.length) return <div className="container commerce-page">
    <h1>Đặt hàng</h1>
    <Alert type="warning">Giỏ của {preview.restaurantName} chưa có món nào đặt được lúc này.</Alert>
    <Link className="btn btn--outline" to="/customer/cart">Về giỏ hàng</Link>
  </div>;

  return <div className="container commerce-page">
    <h1>Đặt hàng</h1>
    <form className="tf-checkout" onSubmit={submit} noValidate>
      <div className="commerce-cart tf-checkout__form">
        <h2>Thông tin giao hàng</h2>
        <TextField
          label="Người nhận"
          name="recipientName"
          value={form.recipientName}
          onChange={update}
          error={fieldErrors.recipientName}
          autoComplete="name"
          disabled={submitting}
        />
        <TextField
          label="Số điện thoại"
          name="recipientPhone"
          type="tel"
          value={form.recipientPhone}
          onChange={update}
          error={fieldErrors.recipientPhone}
          autoComplete="tel"
          disabled={submitting}
        />
        <TextField
          label="Địa chỉ giao hàng"
          name="deliveryAddress"
          value={form.deliveryAddress}
          onChange={update}
          error={fieldErrors.deliveryAddress}
          autoComplete="street-address"
          disabled={submitting}
        />
        <label className="commerce-field">Ghi chú cho quán (không bắt buộc)
          <textarea name="note" maxLength={1000} rows={2} value={form.note} onChange={update} disabled={submitting} />
        </label>
        <fieldset className="tf-pay-methods" disabled={submitting}>
          <legend>Phương thức thanh toán</legend>
          {['ONLINE', 'COD'].map(value => <label key={value} className="tf-pay-method">
            <input
              type="radio"
              name="paymentMethod"
              value={value}
              checked={chosen === value}
              disabled={value === 'ONLINE' && !preview.onlineAvailable}
              onChange={() => setMethod(value)}
            />
            <span>{PAYMENT_METHOD[value]}</span>
          </label>)}
          {!preview.onlineAvailable && <small>Quán chưa hỗ trợ VietQR cho đơn này.</small>}
        </fieldset>
      </div>
      <aside className="tf-checkout__summary">
        <h2>{preview.restaurantName}</h2>
        <OrderLines items={available} />
        {skipped.length > 0 && <Alert type="warning">
          {skipped.length} dòng món không đặt được lúc này sẽ được giữ lại trong giỏ.
        </Alert>}
        <OrderTotals subtotal={preview.subtotal} fee={preview.deliveryFee} total={preview.totalAmount} />
        {error && <Alert type="error">{error}</Alert>}
        <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
          {submitting ? 'Đang đặt hàng…' : chosen === 'ONLINE' ? 'Đặt hàng và thanh toán' : 'Đặt hàng'}
        </button>
        <Link className="btn btn--ghost btn--block" to="/customer/cart">Quay lại giỏ hàng</Link>
      </aside>
    </form>
  </div>;
}
