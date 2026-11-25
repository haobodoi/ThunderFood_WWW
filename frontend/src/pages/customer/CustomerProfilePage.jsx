import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import AccountInfoCard from '../../components/AccountInfoCard.jsx';

export default function CustomerProfilePage() {
  const { user } = useAuth();

  return (
    <div className="container commerce-page">
      <div className="commerce-row commerce-wrap">
        <div>
          <h1>Thông tin tài khoản</h1>
          <p className="muted">Quản lý thông tin cá nhân và theo dõi hoạt động đặt món của bạn.</p>
        </div>
        <Link className="btn btn--outline btn--sm" to="/customer">Khám phá quán ngon</Link>
      </div>

      <AccountInfoCard user={user} />

      <div className="customer-home__actions">
        <Link className="btn btn--primary btn--sm" to="/customer/orders">Đơn hàng của tôi</Link>
        <Link className="btn btn--outline btn--sm" to="/customer/cart">Giỏ hàng của bạn</Link>
        <Link className="btn btn--outline btn--sm" to="/customer/reviews">Đánh giá của tôi</Link>
      </div>
    </div>
  );
}
