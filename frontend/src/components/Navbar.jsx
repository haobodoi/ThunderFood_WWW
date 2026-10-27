import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Icon from './Icon.jsx';
import UserMenu from './UserMenu.jsx';

export function Brand({ light = false }) {
  return (
    <Link to="/" className={`brand ${light ? 'brand--light' : ''}`}>
      <span className="brand__logo">
        <Icon name="bolt" size={18} strokeWidth={2.4} />
      </span>
      ThunderFood
    </Link>
  );
}

export default function Navbar() {
  const { user, initializing } = useAuth();

  return (
    <header className="navbar">
      <div className="container navbar__inner">
        <Brand />

        <nav className="navbar__links" aria-label="Điều hướng chính">
          <NavLink to="/" end className="navbar__link">
            Trang chủ
          </NavLink>
        </nav>

        <div className="navbar__actions">
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
