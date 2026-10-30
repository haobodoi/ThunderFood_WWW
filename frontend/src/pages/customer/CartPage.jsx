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
    {!loading && !error && !nonempty.length && <div className="empty-state"><h2>Giỏ hàng đang trống</h2><Link className="btn btn--primary" to="/">Khám phá món ngon</Link></div>}
    {nonempty.map(cart => <CartContents key={cart.cart_id} cart={cart} />)}
  </main>;
}
