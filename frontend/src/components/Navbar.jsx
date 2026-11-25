import { Link, NavLink, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLE_LABEL, homePathFor } from '../utils/roleUtils.js';
import Icon from './Icon.jsx';
import UserMenu from './UserMenu.jsx';
import Logo from './Logo.jsx';
import { useCart } from '../context/CartContext.jsx';

export function Brand({ light = false }) {
  return (
    <Link to="/" className={`brand ${light ? 'brand--light' : ''}`} aria-label="Trang chủ ThunderFood" onClick={() => window.scrollTo(0, 0)}>
      <Logo size={30} light={light} />
    </Link>
  );
}

export default function Navbar() {
  const { user, initializing } = useAuth();
  const { count } = useCart();
  const location = useLocation();
  const [homeSection, setHomeSection] = useState('home');

  useEffect(() => {
    if (location.pathname !== '/') return undefined;
    if (location.hash === '#explore-restaurants') setHomeSection('explore');
    else setHomeSection('home');
    const target = document.getElementById('explore-restaurants');
    if (!target) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setHomeSection('explore');
      else if (entry.boundingClientRect.top > 0) setHomeSection('home');
    }, { rootMargin: '-24% 0px -58% 0px', threshold: 0 });
    observer.observe(target);
    return () => observer.disconnect();
  }, [location.pathname, location.hash]);
  const onHome = () => setHomeSection('home');
  const onExplore = () => setHomeSection('explore');

  return (
    <header className="navbar">
      <div className="container navbar__inner">
        <Brand />

        <nav className="navbar__links" aria-label="Điều hướng chính">
          <Link to="/" className={`navbar__link${location.pathname === '/' && homeSection === 'home' ? ' active' : ''}`} aria-current={location.pathname === '/' && homeSection === 'home' ? 'page' : undefined} onClick={() => { onHome(); window.scrollTo(0, 0); }}>
            Trang chủ
          </Link>
          <Link to="/#explore-restaurants" className={`navbar__link${location.pathname === '/' && homeSection === 'explore' ? ' active' : ''}`} aria-current={location.pathname === '/' && homeSection === 'explore' ? 'page' : undefined} onClick={onExplore}>
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
