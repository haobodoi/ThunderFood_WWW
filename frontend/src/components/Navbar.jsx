import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLE_LABEL, homePathFor } from '../utils/roleUtils.js';
import Icon from './Icon.jsx';
import UserMenu from './UserMenu.jsx';
import Logo from './Logo.jsx';
import { useCart } from '../context/CartContext.jsx';

export function Brand({ light = false }) {
  return (
    <Link to="/" className={`brand ${light ? 'brand--light' : ''}`}>
      <Logo size={30} light={light} />
    </Link>
  );
}

export default function Navbar() {
  const { user, initializing } = useAuth();
  const { count } = useCart();

  return (
    <header className="navbar">
      <div className="container navbar__inner">
        <Brand />

        <nav className="navbar__links" aria-label="Điều hướng chính">
          <NavLink to="/" end className="navbar__link">
            Trang chủ
          </NavLink>
          <a href="/#explore-restaurants" className="navbar__link">
            Khám phá quán ngon
          </a>
          {user && (
            <NavLink to={homePathFor(user)} className="navbar__link">
              {ROLE_LABEL[user.role]}
            </NavLink>
          )}
        </nav>

        <div className="navbar__actions">
          {user?.role === 'CUSTOMER' && <>
            <Link className="btn btn--ghost btn--sm navbar__cart-link" to="/customer/cart" aria-label={`Giỏ hàng, ${count} món`}>
              <span>Giỏ hàng</span>
              <span className="navbar__cart-count" aria-hidden="true">{count > 99 ? '99+' : count}</span>
            </Link>
            <Link className="btn btn--ghost btn--sm" to="/customer/reviews">Đánh giá</Link>
          </>}
          {initializing ? (
            <span className="navbar__placeholder" aria-hidden="true" />
          ) : user ? (
            <UserMenu />
          ) : (
            <>
              <Link to="/login" className="btn btn--ghost">
                Đăng nhập
              </Link>
              <Link to="/register" className="btn btn--primary">
                Đăng ký
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
