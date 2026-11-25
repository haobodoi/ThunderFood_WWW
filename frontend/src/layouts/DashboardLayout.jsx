import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingBag, Store, UtensilsCrossed, UsersRound, ShieldCheck, MessageSquareWarning, ScrollText, ChartNoAxesCombined, Plus, Menu, X, PanelLeftClose, PanelLeftOpen, ChevronRight, ChevronDown, LogOut, House } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLE_LABEL } from '../utils/roleUtils.js';
import Logo from '../components/Logo.jsx';
import Alert from '../components/Alert.jsx';
import UserAvatar from '../components/UserAvatar.jsx';
import { EnterpriseIcons } from '../components/Icon.jsx';
import { getErrorMessage } from '../api/baseApi.js';
import { useAdminAttention } from '../pages/admin/AdminShared.jsx';

const MENUS = {
  admin: [
    { title: 'Tổng quan', items: [{ label: 'Tổng quan', icon: LayoutDashboard, to: '/admin', end: true }] },
    { title: 'Vận hành', items: [{ label: 'Đơn hàng', icon: ShoppingBag, to: '/admin/orders', badge: 'pending', badgeLabel: 'đơn chờ xác nhận' }, { label: 'Nhà hàng', icon: Store, to: '/admin/stores', adminOnly: true }, { label: 'Thực đơn & danh mục', icon: UtensilsCrossed, to: '/admin/catalog', end: true }] },
    { title: 'Người dùng', items: [{ label: 'Tài khoản & phân quyền', icon: UsersRound, to: '/admin/users', adminOnly: true }] },
    { title: 'Kiểm duyệt', items: [{ label: 'Duyệt nhà hàng', icon: Store, to: '/admin/restaurants', adminOnly: true, badge: 'restaurants', badgeLabel: 'hồ sơ chờ duyệt' }, { label: 'Cập nhật hồ sơ quán', icon: Store, to: '/admin/restaurant-profile-updates', adminOnly: true }, { label: 'Báo cáo đánh giá', icon: ShieldCheck, to: '/admin/review-reports', adminOnly: true, badge: 'reports', badgeLabel: 'báo cáo chưa xử lý' }, { label: 'Khiếu nại', icon: MessageSquareWarning, to: '/admin/complaints', adminOnly: true, badge: 'complaints', badgeLabel: 'khiếu nại chưa xử lý' }] },
    { title: 'Phân tích', items: [{ label: 'Thống kê & báo cáo', icon: ChartNoAxesCombined, to: '/admin/analytics', end: true }] },
    { title: 'Hệ thống', items: [{ label: 'Nhật ký hoạt động', icon: ScrollText, to: '/admin/activity', adminOnly: true }] },
  ],
  partner: [
    { title: 'Phân tích', items: [{ label: 'Thống kê kinh doanh', icon: ChartNoAxesCombined, to: '/partner/statistics', end: true }] },
    { title: 'Vận hành', items: [{ label: 'Đơn hàng', icon: ShoppingBag, to: '/partner/orders', end: true }, { label: 'Đánh giá về quán', icon: MessageSquareWarning, to: '/partner/reviews', end: true }, { label: 'Quán của tôi', icon: Store, to: '/partner', end: true }, { label: 'Đăng ký quán mới', icon: Plus, to: '/partner/register', end: true }] },
  ],
};

export default function DashboardLayout({ area }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 960px)').matches);
  // Số việc đang chờ hiển thị cạnh menu; làm mới khi chuyển trang và mỗi 60 giây.
  const attention = useAdminAttention(area === 'admin', location.pathname);
  const accountRef = useRef(null);
  const accountTrigger = useRef(null);
  const groups = MENUS[area].map(group => ({ ...group, items: group.items.filter(item => !item.adminOnly || user.role === 'ADMIN') })).filter(group => group.items.length);
  const items = groups.flatMap(group => group.items);
  const currentPage = location.pathname.includes('/menu') ? 'Quản lý thực đơn' : items.find(item => (item.end ? location.pathname === item.to : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)))?.label || (area === 'admin' ? 'Quản trị' : 'Đối tác');

  useEffect(() => { setSidebarOpen(false); setAccountOpen(false); }, [location.pathname]);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 960px)');
    const change = event => { setMobile(event.matches); if (!event.matches) setSidebarOpen(false); };
    query.addEventListener('change', change);
    return () => query.removeEventListener('change', change);
  }, []);
  useEffect(() => {
    if (!sidebarOpen || !mobile) return undefined;
    const previous = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const sidebar = document.getElementById('dashboard-sidebar');
    const focusable = () => [...sidebar.querySelectorAll('a[href],button:not(:disabled)')].filter(element => element.getClientRects().length);
    focusable()[0]?.focus();
    const close = event => {
      if (event.key === 'Escape') { event.preventDefault(); setSidebarOpen(false); }
      if (event.key === 'Tab') {
        const elements = focusable(), first = elements[0], last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('keydown', close);
      document.body.style.overflow = previousOverflow;
      previous?.focus?.();
    };
  }, [sidebarOpen, mobile]);
  useEffect(() => {
    if (!accountOpen) return undefined;
    const close = event => {
      if (event.key === 'Escape') {
        setAccountOpen(false);
        accountTrigger.current?.focus();
      } else if (event.type === 'pointerdown' && !accountRef.current?.contains(event.target)) {
        setAccountOpen(false);
      }
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', close); };
  }, [accountOpen]);
  const handleLogout = async () => {
    setLoggingOut(true); setLogoutError('');
    try { await logout({ strict: area === 'admin' }); navigate('/', { replace: true }); }
    catch (error) { setAccountOpen(false); setLogoutError(getErrorMessage(error, 'Chưa đăng xuất được. Vui lòng thử lại.')); }
    finally { setLoggingOut(false); }
  };

  return <EnterpriseIcons.Provider value><div className={`dash dash--${area} ${collapsed && !mobile ? 'dash--collapsed' : ''}`}>
    <aside aria-label="Điều hướng" role={mobile && sidebarOpen ? "dialog" : undefined} aria-modal={mobile && sidebarOpen ? true : undefined} id="dashboard-sidebar" inert={mobile && !sidebarOpen ? '' : undefined} className={`dash__sidebar ${sidebarOpen ? 'is-open' : ''}`}>
      <div className="enterprise-brand"><Link to="/" aria-label="ThunderFood - Trang chủ"><Logo size={27} light showText={!collapsed || mobile} /></Link>{mobile && <button type="button" className="enterprise-icon-button enterprise-icon-button--dark" onClick={() => setSidebarOpen(false)} aria-label="Đóng menu"><X size={19} /></button>}</div>
      <div className="enterprise-workspace"><Store size={18} /><span>{area === 'partner' ? 'Kênh đối tác' : 'Không gian quản trị'}<small>{ROLE_LABEL[user.role]}</small></span></div>
      <nav className="dash__nav" aria-label={area === 'partner' ? 'Kênh đối tác' : 'Trang quản trị'}>
        {groups.map(group => <div className="dash__group" key={group.title}><p className="dash__group-label">{group.title}</p>{group.items.map(item => {
          const ItemIcon = item.icon;
          const count = item.badge ? Number(attention?.[item.badge] ?? 0) : 0;
          const badge = count > 0 ? (count > 99 ? '99+' : String(count)) : null;
          return <NavLink key={item.label} to={item.to} end={item.end} className="dash__link" title={collapsed && !mobile ? item.label + (badge ? ` (${count} ${item.badgeLabel})` : '') : undefined}><ItemIcon size={18} /><span>{item.label}</span>{badge && <span className="dash__badge" aria-label={`${count} ${item.badgeLabel}`}>{badge}</span>}</NavLink>;
        })}</div>)}
      </nav>
      {!mobile && <button type="button" className="dash__collapse" onClick={() => setCollapsed(value => !value)} aria-label={collapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}>{collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}<span>Thu gọn</span></button>}
    </aside>
    {sidebarOpen && <div className="dash__backdrop" onClick={() => setSidebarOpen(false)} />}
    <div className="dash__main" inert={mobile && sidebarOpen ? '' : undefined}>
      <header className="dash__topbar">
        <a className="dash__skip" href="#admin-main">Đến nội dung chính</a>
        <button type="button" className="enterprise-icon-button dash__menu-btn" onClick={() => setSidebarOpen(true)} aria-controls="dashboard-sidebar" aria-expanded={sidebarOpen} aria-label="Mở menu"><Menu size={20} /></button>
        <div className="dash__context" aria-label={`Vị trí hiện tại: ${area === 'admin' ? 'Quản trị' : 'Đối tác'}, ${currentPage}`}><span>{area === 'admin' ? 'Quản trị' : 'Đối tác'}</span><ChevronRight size={15} /><strong>{currentPage}</strong></div>
        <div className="dash__topbar-actions"><div className="enterprise-account" ref={accountRef}><button type="button" className="enterprise-account__trigger" ref={accountTrigger} aria-label="Menu tài khoản" aria-expanded={accountOpen} onClick={() => setAccountOpen(value => !value)}><UserAvatar name={user.fullName} url={user.avatarUrl} className="enterprise-avatar" /><span className="enterprise-account__name">{user.fullName}<small>{ROLE_LABEL[user.role]}</small></span><ChevronDown size={16} /></button>{accountOpen && <div className="enterprise-account__menu"><div className="enterprise-account__info"><strong>{user.fullName}</strong><small>{user.email}</small></div><Link to="/"><House size={16} /> Về trang chủ</Link><button type="button" disabled={loggingOut} onClick={handleLogout}><LogOut size={16} /> {loggingOut ? 'Đang đăng xuất…' : 'Đăng xuất'}</button></div>}</div></div>
      </header>
      <main className="dash__content" id="admin-main" tabIndex={-1}>{logoutError && <Alert type="error">{logoutError}</Alert>}<Outlet /></main>
    </div>
  </div></EnterpriseIcons.Provider>;
}
