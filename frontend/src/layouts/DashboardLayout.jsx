import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLE_LABEL, initialsOf } from '../utils/roleUtils.js';
import { Brand } from '../components/Navbar.jsx';
import Icon from '../components/Icon.jsx';

const MENUS = {
  partner: {
    title: 'Kênh đối tác',
    items: [
      { label: 'Quán của tôi', icon: 'store', to: '/partner', end: true },
      { label: 'Đăng ký quán mới', icon: 'plus', to: '/partner/register', end: true },
    ],
  },
  admin: {
    title: 'Trang quản trị',
    items: [
      { label: 'Tổng quan', icon: 'home', to: '/admin', end: true },
      { label: 'Duyệt quán', icon: 'shield', to: '/admin/restaurants', end: false },
    ],
  },
};

export default function DashboardLayout({ area }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const menu = MENUS[area];

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <div className={`dash dash--${area}`}>
      <aside className={`dash__sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        <div className="dash__brand">
          <Brand light />
          <span className="dash__area">{menu.title}</span>
        </div>

        <nav className="dash__nav" aria-label={menu.title}>
          {menu.items.map((item) => (
            <NavLink key={item.label} to={item.to} end={item.end} className="dash__link">
              <Icon name={item.icon} size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="dash__user">
          <span className="avatar avatar--lg">{initialsOf(user.fullName)}</span>
          <div className="dash__user-info">
            <strong>{user.fullName}</strong>
            <span>{user.email}</span>
          </div>
          <button type="button" className="dash__logout" onClick={handleLogout} title="Đăng xuất" aria-label="Đăng xuất">
            <Icon name="logout" size={18} />
          </button>
        </div>
      </aside>

      {sidebarOpen && <div className="dash__backdrop" onClick={() => setSidebarOpen(false)} />}

      <div className="dash__main">
        <header className="dash__topbar">
          <button
            type="button"
            className="icon-btn dash__menu-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="Mở menu"
          >
            <Icon name="menu" size={20} />
          </button>
          <span className={`role-chip role-chip--${user.role.toLowerCase()}`}>{ROLE_LABEL[user.role]}</span>
          <div className="dash__topbar-actions">
            <Link to="/" className="btn btn--ghost btn--sm">
              Về trang chủ
            </Link>
            <button type="button" className="btn btn--outline btn--sm" onClick={handleLogout}>
              <Icon name="logout" size={16} />
              Đăng xuất
            </button>
          </div>
        </header>

        <main className="dash__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
