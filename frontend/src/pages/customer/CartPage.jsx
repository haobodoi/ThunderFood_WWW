import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext.jsx';
import CartContents from '../../components/CartContents.jsx';
import Alert from '../../components/Alert.jsx';

export default function CartPage() {
  const { carts, loading, busy, error, refresh } = useCart();
  const nonempty = carts.filter(c => c.items.length);
  return <main className="container commerce-page">
    <div className="commerce-row"><h1>Giỏ hàng của bạn</h1><button className="btn btn--outline" disabled={loading || busy} onClick={refresh}>Tải lại</button></div>
    <p>Món được lưu riêng theo từng quán.</p>
    {error && <Alert type="error">{error}</Alert>}
    {loading && <p role="status">Đang đồng bộ giỏ hàng…</p>}
    {!loading && !error && !nonempty.length && <div className="empty-state"><h2>Giỏ hàng đang trống</h2><Link className="btn btn--primary" to="/customer">Khám phá món ngon</Link></div>}
    {nonempty.map(cart => <CartContents key={cart.cartId} cart={cart} />)}
    {nonempty.some(cart => cart.items.some(line => line.available)) && <section className="commerce-cart tf-cart-all-order">
      <div>
        <h2>Đặt tất cả món</h2>
        <p>Kiểm tra toàn bộ món trong giỏ, được phân theo từng nhà hàng trước khi xác nhận.</p>
      </div>
      <Link className="btn btn--primary" to={`/customer/checkout/all?cartIds=${nonempty.map(cart => cart.cartId).join(',')}`}>
        Đặt tất cả
      </Link>
    </section>}
  </main>;
}
