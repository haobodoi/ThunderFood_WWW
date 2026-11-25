import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLES } from '../utils/roleUtils.js';
import Navbar, { Brand } from '../components/Navbar.jsx';
import ChatWidget from '../components/ChatWidget.jsx';

export default function PublicLayout() {
  const { user } = useAuth();
  const isCustomer = user?.role === ROLES.CUSTOMER;
  const isPartner = user?.role === ROLES.RESTAURANT_PARTNER;
  const isAdmin = user?.role === ROLES.ADMIN || user?.role === ROLES.STAFF;

  return (
    <div className="public-layout">
      <Navbar />
      <main className="public-layout__main">
        <Outlet />
      </main>
      <footer className="tf-footer">
        <div className="container">
          <div className="tf-footer__grid">
            <div className="tf-footer__col">
              <Brand />
              <p className="tf-footer__description">
                Khám phá nhà hàng và thực đơn trên ThunderFood.
              </p>
            </div>

            <div className="tf-footer__col">
              <h4>Khám phá</h4>
              <div className="tf-footer__links">
                <Link to="/">Trang chủ ThunderFood</Link>
                <a href="/#explore-restaurants">Tìm nhà hàng</a>
              </div>
            </div>

            <div className="tf-footer__col">
              {isCustomer ? (
                <>
                  <h4>Tài khoản khách hàng</h4>
                  <div className="tf-footer__links">
                    <Link to="/customer/cart">Giỏ hàng của bạn</Link>
                    <Link to="/customer/orders">Đơn hàng của tôi</Link>
                    <Link to="/customer/reviews">Đánh giá của tôi</Link>
                    <Link to="/customer/assistant">Hỏi về chính sách</Link>
                  </div>
                </>
              ) : isPartner ? (
                <>
                  <h4>Kênh Đối tác</h4>
                  <div className="tf-footer__links">
                    <Link to="/partner">Quản lý quán & thực đơn</Link>
                    <Link to="/partner/orders">Quản lý đơn hàng</Link>
                  </div>
                </>
              ) : isAdmin ? (
                <>
                  <h4>Quản trị hệ thống</h4>
                  <div className="tf-footer__links">
                    <Link to="/admin">Bảng điều khiển quản trị</Link>
                  </div>
                </>
              ) : (
                <>
                  <h4>Dành cho Đối tác</h4>
                  <div className="tf-footer__links">
                    <Link to="/register">Đăng ký đối tác nhà hàng</Link>
                    <Link to="/partner">Kênh quản lý quán & thực đơn</Link>
                    <Link to="/login">Đăng nhập tài khoản</Link>
                  </div>
                </>
              )}
            </div>

            <div className="tf-footer__col">
              <h4>Thông tin</h4>
              <div className="tf-footer__links">
                <span>Dự án học tập của Nhóm 12</span>
              </div>
            </div>
          </div>

          <div className="tf-footer__bottom">
            <span>© {new Date().getFullYear()} ThunderFood · Đồ án WWW Nhóm 12</span>
            <span>ThunderFood</span>
          </div>
        </div>
      </footer>
      <ChatWidget />
    </div>
  );
}
