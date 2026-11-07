import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { initialsOf } from '../utils/roleUtils.js';
import { Brand } from '../components/Navbar.jsx';
import Icon from '../components/Icon.jsx';
import Alert from '../components/Alert.jsx';
import { getErrorMessage } from '../api/baseApi.js';

const MENUS = {
  partner: {
    title: 'Kênh đối tác',
    items: [
      { label: 'Thống kê kinh doanh', icon: 'home', to: '/partner/statistics', end: true },
      { label: 'Đơn hàng', icon: 'shoppingBag', to: '/partner/orders', end: true },
      { label: 'Đánh giá về quán', icon: 'store', to: '/partner/reviews', end: true },
      { label: 'Quán của tôi', icon: 'store', to: '/partner', end: true },
      { label: 'Đăng ký quán mới', icon: 'plus', to: '/partner/register', end: true },
    ],
  },
  admin: {
    title: 'Trang quản trị',
    items: [
      { label: 'Tổng quan', icon: 'home', to: '/admin', end: true },
      { label: 'Đơn hàng', icon: 'shoppingBag', to: '/admin/orders', end: false },
      { label: 'Món ăn & danh mục', icon: 'utensils', to: '/admin/catalog', end: true },
      { label: 'Người dùng & quyền', icon: 'user', to: '/admin/users', end: false, adminOnly: true },
      { label: 'Báo cáo đánh giá', icon: 'shield', to: '/admin/review-reports', end: true, adminOnly: true },
      { label: 'Duyệt quán', icon: 'store', to: '/admin/restaurants', end: false, adminOnly: true },
      { label: 'Phản hồi & khiếu nại', icon: 'alert', to: '/admin/complaints', end: true, adminOnly: true },
      { label: 'Cấu hình quán', icon: 'store', to: '/admin/stores', end: true, adminOnly: true },
      { label: 'Nhật ký hoạt động', icon: 'clock', to: '/admin/activity', end: true, adminOnly: true },
    ],
  },
};

export default function DashboardLayout({ area }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 960px)').matches);
  const menu = { ...MENUS[area], items: MENUS[area].items.filter(item => !item.adminOnly || user.role === 'ADMIN') };
  const currentPage = location.pathname.includes('/menu')
    ? 'Quản lý thực đơn'
    : location.pathname.includes('/register')
      ? 'Đăng ký quán'
      : menu.items.find((item) => item.end ? location.pathname === item.to : location.pathname.startsWith(item.to))?.label || menu.title;

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 960px)');
    const change = e => { setMobile(e.matches); if (!e.matches) setSidebarOpen(false); };
    query.addEventListener('change', change);
    return () => query.removeEventListener('change', change);
  }, []);

  useEffect(() => {
    if (!sidebarOpen || !mobile) return;
    const previous = document.activeElement;
    const sidebar = document.getElementById('dashboard-sidebar');
    const focusable = () => [...sidebar.querySelectorAll('a[href],button:not(:disabled)')].filter(el => el.getClientRects().length);
    focusable()[0]?.focus();
    const close = e => {
      if (e.key === 'Escape') { e.preventDefault(); setSidebarOpen(false); }
      if (e.key === 'Tab') {
        const elements = focusable(), first = elements[0], last = elements[elements.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('keydown', close); previous?.focus?.(); };
  }, [sidebarOpen, mobile]);

  const handleLogout = async () => {
    setLoggingOut(true); setLogoutError('');
    try { await logout({ strict: area === 'admin' }); navigate('/', { replace: true }); }
    catch (error) { setSidebarOpen(false); setLogoutError(getErrorMessage(error, 'Chưa đăng xuất được. Vui lòng thử lại.')); }
    finally { setLoggingOut(false); }
  };

  return (
    <div className={`dash dash--${area}`}>
      <aside id="dashboard-sidebar" inert={mobile && !sidebarOpen ? '' : undefined} className={`dash__sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        {mobile && <button type="button" className="dash__logout" onClick={() => setSidebarOpen(false)} aria-label="Đóng menu"><Icon name="x" size={20} /></button>}
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
          <button type="button" className="dash__logout" disabled={loggingOut} onClick={handleLogout} title="Đăng xuất" aria-label="Đăng xuất">
            <Icon name="logout" size={18} />
          </button>
        </div>
      </aside>

      {sidebarOpen && <div className="dash__backdrop" onClick={() => setSidebarOpen(false)} />}

      <div className="dash__main" inert={mobile && sidebarOpen ? '' : undefined}>
        <header className="dash__topbar">
          <button
            type="button"
            className="icon-btn dash__menu-btn"
            id="dashboard-menu"
            onClick={() => setSidebarOpen(v => !v)}
            aria-controls="dashboard-sidebar"
            aria-expanded={sidebarOpen}
            aria-label="Mở menu"
          >
            <Icon name="menu" size={20} />
          </button>
          <div className="dash__context" aria-label={`Vị trí hiện tại: ${menu.title}, ${currentPage}`}>
            <Icon name={area === 'partner' ? 'store' : 'shield'} size={16} />
            <span>{menu.title}</span>
            <Icon name="chevronRight" size={14} />
            <strong>{currentPage}</strong>
          </div>
          <div className="dash__topbar-actions">
            <Link to="/" className="btn btn--ghost btn--sm">
              Về trang chủ
            </Link>
            <button type="button" className="btn btn--outline btn--sm" disabled={loggingOut} onClick={handleLogout}>
              <Icon name="logout" size={16} />
              Đăng xuất
            </button>
          </div>
        </header>

        <main className="dash__content">
          {logoutError && <Alert type="error">{logoutError}</Alert>}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
