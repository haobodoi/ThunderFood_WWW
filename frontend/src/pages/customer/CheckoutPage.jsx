import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { isCheckoutResultUnknown, orderApi, prepareCheckout } from '../../api/orderApi.js';
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
  const [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const active = useRef(false);
  const submittingRef = useRef(false);
  const attempt = useRef(null);
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
      attempt.current ??= prepareCheckout(preview, { ...form, paymentMethod: chosen });
      const order = await attempt.current();
      if (active.current) navigate(`/customer/orders/${order.orderId}`, { replace: true });
      void refreshAfterCheckout();
    } catch (error) {
      if (!active.current) return;
      if (attempt.current && isCheckoutResultUnknown(error)) {
        setUncertain(true);
        return;
      }
      attempt.current = null;
      setUncertain(false);
      setError(getErrorMessage(error));
      setFieldErrors(getFieldErrors(error));
      // Reload the quote after a definitive rejection so the customer can review changes before resubmitting.
      await load();
    } finally {
      submittingRef.current = false;
      if (active.current) setSubmitting(false);
    }
  };

  if (!available.length) return <div className="container commerce-page">
    <h1>Đặt hàng</h1>
    <Alert type="warning">Giỏ của {preview.restaurantName} chưa có món nào đặt được lúc này.</Alert>
    <Link className="btn btn--outline" to="/customer/cart">Về giỏ hàng</Link>
  </div>;

  const editingDisabled = submitting || uncertain;
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
          disabled={editingDisabled}
        />
        <TextField
          label="Số điện thoại"
          name="recipientPhone"
          type="tel"
          value={form.recipientPhone}
          onChange={update}
          error={fieldErrors.recipientPhone}
          autoComplete="tel"
          disabled={editingDisabled}
        />
        <TextField
          label="Địa chỉ giao hàng"
          name="deliveryAddress"
          value={form.deliveryAddress}
          onChange={update}
          error={fieldErrors.deliveryAddress}
          autoComplete="street-address"
          disabled={editingDisabled}
        />
        <label className="commerce-field">Ghi chú cho quán (không bắt buộc)
          <textarea name="note" maxLength={1000} rows={2} value={form.note} onChange={update} disabled={editingDisabled} />
        </label>
        <fieldset className="tf-pay-methods" disabled={editingDisabled}>
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
        {uncertain && <Alert type="warning">
          Chưa nhận được kết quả đặt hàng. Bấm thử lại để kiểm tra đơn vừa gửi hoặc <Link to="/customer/orders">xem đơn hàng</Link>.
        </Alert>}
        <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
          {submitting ? 'Đang xử lý…' : uncertain ? 'Thử lại đơn vừa gửi' : chosen === 'ONLINE' ? 'Đặt hàng và thanh toán' : 'Đặt hàng'}
        </button>
        <button type="button" className="btn btn--ghost btn--block" disabled={submitting} onClick={() => navigate('/customer/cart')}>
          Quay lại giỏ hàng
        </button>
      </aside>
    </form>
  </div>;
}
