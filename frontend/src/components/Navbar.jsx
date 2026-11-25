import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLE_LABEL, homePathFor } from '../utils/roleUtils.js';
import Icon from './Icon.jsx';
import UserMenu from './UserMenu.jsx';
import Logo from './Logo.jsx';
import { useCart } from '../context/CartContext.jsx';

export function Brand({ light = false }) {
  return (
    <Link to="/" className={`brand ${light ? 'brand--light' : ''}`} onClick={() => window.scrollTo(0, 0)}>
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
          <NavLink to="/" end className="navbar__link" onClick={() => window.scrollTo(0, 0)}>
            Trang chủ
          </NavLink>
          <Link to="/#explore-restaurants" className="navbar__link">
            Khám phá quán ngon
          </Link>
          {user && user.role !== 'CUSTOMER' && (
            <NavLink to={homePathFor(user)} end className="navbar__link">
              {ROLE_LABEL[user.role]}
            </NavLink>
          )}
        </nav>

        <div className="navbar__actions">
          {user?.role === 'CUSTOMER' && <>
            <NavLink className={({ isActive }) => `btn btn--ghost btn--sm navbar__cart-link${isActive ? ' is-active' : ''}`} to="/customer/cart" aria-label={`Giỏ hàng, ${count} món`}>
              <span>Giỏ hàng</span>
              <span className="navbar__cart-count" aria-hidden="true">{count > 99 ? '99+' : count}</span>
            </NavLink>
            <NavLink className={({ isActive }) => `btn btn--ghost btn--sm navbar__customer-link${isActive ? ' is-active' : ''}`} to="/customer/orders">Đơn hàng</NavLink>
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
