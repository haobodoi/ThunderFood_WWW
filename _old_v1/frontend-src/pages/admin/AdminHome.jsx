import { useAuth } from '../../context/AuthContext.jsx';
import { dashboardApi } from '../../api/dashboardApi.js';
import useApi from '../../hooks/useApi.js';
import FeatureCard from '../../components/FeatureCard.jsx';
import Alert from '../../components/Alert.jsx';
import Icon from '../../components/Icon.jsx';

const STATS = [
  { key: 'totalCustomers', label: 'Khách hàng', icon: 'users', tone: 'blue' },
  { key: 'totalPartners', label: 'Đối tác nhà hàng', icon: 'store', tone: 'orange' },
  { key: 'pendingRestaurants', label: 'Nhà hàng chờ duyệt', icon: 'clock', tone: 'amber' },
  { key: 'lockedAccounts', label: 'Tài khoản bị khóa', icon: 'lock', tone: 'red' },
];

const FEATURES = [
  { icon: 'users', title: 'Quản lý người dùng', description: 'Xem danh sách, tìm kiếm, khóa / mở khóa tài khoản.' },
  { icon: 'shield', title: 'Kiểm duyệt', description: 'Duyệt hồ sơ nhà hàng và món ăn mới.' },
  { icon: 'chart', title: 'Thống kê & báo cáo', description: 'Đơn hàng, doanh thu, món bán chạy toàn hệ thống.' },
  { icon: 'message', title: 'Khiếu nại', description: 'Tiếp nhận và phản hồi khiếu nại của khách hàng.' },
];

export default function AdminHome() {
  const { user } = useAuth();
  const { data, error, loading } = useApi(dashboardApi.admin);

  return (
    <div className="page">
      <div className="page__head">
        <h1>Tổng quan hệ thống</h1>
        <p className="muted">Xin chào {user.fullName}, chúc bạn một ngày làm việc hiệu quả.</p>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <div className="stat-grid">
        {STATS.map((stat) => (
          <div key={stat.key} className={`stat-card stat-card--${stat.tone}`}>
            <span className="stat-card__icon">
              <Icon name={stat.icon} size={20} />
            </span>
            <span className="stat-card__label">{stat.label}</span>
            <strong className="stat-card__value">{loading ? '…' : (data?.[stat.key] ?? '–')}</strong>
          </div>
        ))}
      </div>

      <h2 className="section__title">Chức năng quản trị</h2>
      <div className="feature-grid feature-grid--2">
        {FEATURES.map((feature) => (
          <FeatureCard key={feature.title} {...feature} />
        ))}
      </div>
    </div>
  );
}
