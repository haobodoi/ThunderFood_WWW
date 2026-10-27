import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLE_LABEL, initialsOf } from '../utils/roles.js';
import { Brand } from './Navbar.jsx';
import Icon from './Icon.jsx';

const MENUS = {
  partner: {
    title: 'Kênh đối tác',
    items: [
      { label: 'Tổng quan', icon: 'home', to: '/partner' },
      { label: 'Nhà hàng', icon: 'store' },
      { label: 'Thực đơn', icon: 'book' },
      { label: 'Đơn hàng', icon: 'receipt' },
      { label: 'Thống kê', icon: 'chart' },
    ],
  },
  admin: {
    title: 'Trang quản trị',
    items: [
      { label: 'Tổng quan', icon: 'home', to: '/admin' },
      { label: 'Người dùng', icon: 'users' },
      { label: 'Duyệt nhà hàng', icon: 'store' },
      { label: 'Duyệt món ăn', icon: 'shield' },
      { label: 'Khiếu nại', icon: 'message' },
      { label: 'Báo cáo', icon: 'chart' },
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
          {menu.items.map((item) =>
            item.to ? (
              <NavLink key={item.label} to={item.to} end className="dash__link">
                <Icon name={item.icon} size={18} />
                <span>{item.label}</span>
              </NavLink>
            ) : (
              <span key={item.label} className="dash__link is-disabled" title="Sắp có">
                <Icon name={item.icon} size={18} />
                <span>{item.label}</span>
                <span className="tag tag--dark">Sắp có</span>
              </span>
            ),
          )}
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
