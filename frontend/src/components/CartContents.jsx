import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { formatVND } from './FoodCard.jsx';
import Alert from './Alert.jsx';
import ConfirmModal from './ConfirmModal.jsx';
import Icon from './Icon.jsx';

function CartItemImage({ line }) {
  const [failed, setFailed] = useState(false);
  const imageUrl = typeof line.imageUrl === 'string' ? line.imageUrl.trim() : '';

  return (
    <div className="commerce-cart-line__image">
      {imageUrl && !failed ? (
        <img src={imageUrl} alt={line.itemName || 'Món ăn'} loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <span className="commerce-cart-line__image-placeholder" aria-label="Món chưa có ảnh">
          <Icon name="utensils" size={24} />
        </span>
      )}
    </div>
  );
}

function CartLine({ cart, line, requestRemoval }) {
  const state = useCart();
  const [note, setNote] = useState(line.note);
  const [editingNote, setEditingNote] = useState(Boolean(line.note));
  const [error, setError] = useState('');
  const run = async action => { setError(''); try { await action(); } catch (e) { setError(e.response?.data?.message || e.message); } };
  const disabled = state.busy || state.loading;
  return <article className="commerce-cart-line">
    <div className="commerce-cart-line__layout">
      <CartItemImage line={line} />
      <div className="commerce-cart-line__content">
        <div className="commerce-row commerce-cart-line__head">
          <strong className="commerce-cart-line__name">{line.itemName}</strong>
          <strong className="commerce-cart-line__total">{formatVND(line.lineTotal)}</strong>
        </div>
        <p className="commerce-cart-line__unit">{formatVND(line.unitPrice)} / phần</p>
        {line.priceChanged && <Alert type="warning">
          Giá đổi từ {formatVND(line.lastSeenUnitPrice)} thành {formatVND(line.unitPrice)}.
          Giá mới được ghi nhận khi bạn cập nhật món.
        </Alert>}
        {!line.available && <Alert type="warning">
          {line.unavailableReason} · không tính vào tạm tính món khả dụng
        </Alert>}
        <div className="commerce-row commerce-wrap commerce-cart-line__controls">
          <div className="tf-quantity">
            <button
              className="icon-btn"
              disabled={disabled}
              aria-label={`Giảm ${line.itemName}`}
              onClick={() => line.quantity === 1
                ? requestRemoval(line)
                : run(() => state.change(cart, line, line.quantity - 1, line.note))}
            >
              −
            </button>
            <strong>{line.quantity}</strong>
            <button
              className="icon-btn"
              disabled={disabled || !line.available || line.quantity >= 99}
              aria-label={`Tăng ${line.itemName}`}
              onClick={() => run(() => state.change(cart, line, line.quantity + 1, line.note))}
            >
              +
            </button>
          </div>
          <div className="commerce-cart-line__actions">
            {!editingNote && <button type="button" className="btn btn--ghost btn--sm" disabled={disabled} onClick={() => setEditingNote(true)}>
              + Ghi chú
            </button>}
            <button type="button" className="btn btn--ghost btn--sm commerce-danger-btn" disabled={disabled} onClick={() => requestRemoval(line)}>
              <Icon name="trash" size={14} /> Xóa
            </button>
          </div>
        </div>
        {editingNote && <label className="commerce-field commerce-field--compact">Ghi chú cho món
          <textarea id={`cart-note-${line.cartItemId}`} name={`cartNote-${line.cartItemId}`} maxLength={300} value={note} onChange={e => setNote(e.target.value)} disabled={disabled} rows={1} placeholder="Ví dụ: ít cay, không hành…" />
        </label>}
        {(note !== line.note || line.priceChanged) && <button
          type="button"
          className="btn btn--outline btn--sm"
          disabled={disabled}
          onClick={() => run(() => state.change(cart, line, line.quantity, note))}
        >
          Lưu ghi chú / giá hiện tại
        </button>}
        {error && <Alert type="error">{error}</Alert>}
      </div>
    </div>
  </article>;
}
export default function CartContents({ cart, inModal = false, extraAction = null }) {
  const state = useCart();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState(null);
  const [confirming, setConfirming] = useState(false);
  if (!cart?.items.length) return <p>Giỏ quán này chưa có món.</p>;
  const confirmRemoval = async () => {
    if (!pending) return;
    setConfirming(true);
    setError('');
    try {
      if (pending.type === 'cart') {
        await state.clear(cart);
        setNotice(`Đã xóa các món của ${cart.restaurantName}.`);
      } else {
        await state.remove(cart, pending.line);
        setNotice(`Đã xóa ${pending.line.itemName} khỏi giỏ.`);
      }
      setPending(null);
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setConfirming(false);
    }
  };
  const lineToRemove = pending?.line;
  return <section className={`commerce-cart${inModal ? ' commerce-cart--modal' : ''}`}>
    <h2>
      <Link to={`/restaurants/${cart.restaurantId}`}>{cart.restaurantName}</Link>
    </h2>
    {notice && <Alert type="success">{notice}</Alert>}
    <div className="commerce-cart__items">
      {cart.items.map(line => <CartLine key={`${line.cartItemId}:${line.note}`} cart={cart} line={line}
        requestRemoval={lineToRemove => setPending({ type: 'line', line: lineToRemove })} />)}
    </div>
    <div className={`commerce-cart__footer${inModal ? ' commerce-cart__footer--sticky' : ''}`}>
      <div className="commerce-row commerce-total">
        <strong>Tạm tính món khả dụng</strong>
        <strong className="commerce-cart-line__total">{formatVND(cart.subtotal)}</strong>
      </div>
      <p className="commerce-cart__disclaimer">Chưa gồm phí giao hàng. Giỏ hàng không giữ món; giá và tình trạng phục vụ có thể thay đổi.</p>
      <div className="tf-order-actions tf-order-actions--split">
        <div className="tf-order-actions__primary">
          {cart.items.some(line => line.available) && <Link
            className="btn btn--primary"
            to={`/customer/checkout/${cart.cartId}`}
          >
            Đặt hàng
          </Link>}
          {extraAction}
        </div>
        <button type="button" className="btn btn--ghost btn--sm commerce-danger-btn" disabled={state.busy || state.loading} onClick={() => setPending({ type: 'cart' })}>
          <Icon name="trash" size={14} /> Xóa giỏ quán này
        </button>
      </div>
      {error && <Alert type="error">{error}</Alert>}
    </div>
    <ConfirmModal
      open={Boolean(pending)}
      title={pending?.type === 'cart' ? 'Xóa giỏ hàng của quán?' : 'Xóa món khỏi giỏ?'}
      message={pending?.type === 'cart'
        ? `Tất cả món của ${cart.restaurantName} sẽ bị xóa khỏi giỏ.`
        : `${lineToRemove?.itemName || 'Món này'} sẽ bị xóa khỏi giỏ.`}
      confirmText={pending?.type === 'cart' ? 'Xóa giỏ hàng' : 'Xóa món'}
      loading={confirming}
      onConfirm={confirmRemoval}
      onCancel={() => setPending(null)}
    />
  </section>;
}
