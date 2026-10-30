import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { formatVND } from './FoodCard.jsx';
import Alert from './Alert.jsx';
import Icon from './Icon.jsx';

function CartItemImage({ line }) {
  const [failed, setFailed] = useState(false);
  const imageUrl = typeof line.image_url === 'string' ? line.image_url.trim() : '';

  return (
    <div className="commerce-cart-line__image">
      {imageUrl && !failed ? (
        <img src={imageUrl} alt={line.item_name || 'Món ăn'} loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <span className="commerce-cart-line__image-placeholder" aria-label="Món chưa có ảnh">
          <Icon name="utensils" size={24} />
        </span>
      )}
    </div>
  );
}

function CartLine({ cart, line }) {
  const state = useCart();
  const [note, setNote] = useState(line.note);
  const [error, setError] = useState('');
  const run = async action => { setError(''); try { await action(); } catch (e) { setError(e.response?.data?.message || e.message); } };
  const disabled = state.busy || state.loading;
  return <article className="commerce-cart-line">
    <div className="commerce-cart-line__layout">
      <CartItemImage line={line} />
      <div className="commerce-cart-line__content">
        <div className="commerce-row"><strong>{line.item_name}</strong><strong>{formatVND(line.line_total)}</strong></div>
        <p>{formatVND(line.unit_price)} / phần</p>
        {line.price_changed && <Alert type="warning">Giá đổi từ {formatVND(line.last_seen_unit_price)} thành {formatVND(line.unit_price)}. Giá mới được ghi nhận khi bạn cập nhật món.</Alert>}
        {!line.available && <Alert type="warning">{line.unavailable_reason} · không tính vào tạm tính món khả dụng</Alert>}
        <div className="commerce-row commerce-wrap">
          <div className="tf-quantity">
            <button className="icon-btn" disabled={disabled} aria-label={`Giảm ${line.item_name}`} onClick={() => run(() => line.quantity === 1 ? state.remove(cart, line) : state.change(cart, line, line.quantity - 1, line.note))}>−</button>
            <strong>{line.quantity}</strong>
            <button className="icon-btn" disabled={disabled || !line.available || line.quantity >= 99} aria-label={`Tăng ${line.item_name}`} onClick={() => run(() => state.change(cart, line, line.quantity + 1, line.note))}>+</button>
          </div>
          <button className="btn btn--ghost btn--sm" disabled={disabled} onClick={() => run(() => state.remove(cart, line))}>Xóa món</button>
        </div>
        <label className="commerce-field">Ghi chú cho món
          <textarea maxLength={300} value={note} onChange={e => setNote(e.target.value)} disabled={disabled} rows={2} />
        </label>
        {(note !== line.note || line.price_changed) && <button className="btn btn--outline btn--sm" disabled={disabled} onClick={() => run(() => state.change(cart, line, line.quantity, note))}>Lưu ghi chú / giá hiện tại</button>}
        {error && <Alert type="error">{error}</Alert>}
      </div>
    </div>
  </article>;
}
export default function CartContents({ cart }) {
  const state = useCart();
  const [error, setError] = useState('');
  if (!cart?.items.length) return <p>Giỏ quán này chưa có món.</p>;
  const clear = async () => {
    if (!window.confirm(`Xóa tất cả món của ${cart.restaurant_name}?`)) return;
    try { await state.clear(cart); } catch (e) { setError(e.response?.data?.message || e.message); }
  };
  return <section className="commerce-cart">
    <h2><Link to={`/restaurants/${cart.restaurant_id}`}>{cart.restaurant_name}</Link></h2>
    {cart.items.map(line => <CartLine key={`${line.cart_item_id}:${line.note}`} cart={cart} line={line} />)}
    <div className="commerce-row commerce-total"><strong>Tạm tính món khả dụng</strong><strong>{formatVND(cart.subtotal)}</strong></div>
    <p>Chưa gồm phí giao hàng. Giỏ hàng không giữ món; giá và tình trạng phục vụ có thể thay đổi.</p>
    <button className="btn btn--outline" disabled={state.busy || state.loading} onClick={clear}>Xóa giỏ quán này</button>
    {error && <Alert type="error">{error}</Alert>}
  </section>;
}
