import { useAuth } from '../../context/AuthContext.jsx';
import { dashboardApi } from '../../api/dashboardApi.js';
import useApi from '../../hooks/useApi.js';
import FeatureCard from '../../components/FeatureCard.jsx';
import Alert from '../../components/Alert.jsx';
import Icon from '../../components/Icon.jsx';

const FEATURES = [
  { icon: 'search', title: 'Tìm món & nhà hàng', description: 'Tra cứu theo tên món, loại món, mức giá.' },
  { icon: 'cart', title: 'Giỏ hàng', description: 'Thêm, sửa số lượng hoặc xóa món trước khi đặt.' },
  { icon: 'receipt', title: 'Đặt hàng & thanh toán', description: 'Thanh toán khi nhận hàng hoặc trực tuyến.' },
  { icon: 'clock', title: 'Lịch sử đơn hàng', description: 'Theo dõi trạng thái và xem lại các đơn đã đặt.' },
  { icon: 'star', title: 'Đánh giá & khiếu nại', description: 'Chấm điểm nhà hàng, gửi phản hồi khi có vấn đề.' },
  { icon: 'user', title: 'Thông tin cá nhân', description: 'Cập nhật họ tên, số điện thoại, địa chỉ giao hàng.' },
];

const formatDate = (value) => (value ? new Date(value).toLocaleDateString('vi-VN') : '');

export default function CustomerHome() {
  const { user } = useAuth();
  const { data, error, loading } = useApi(dashboardApi.customer);

  return (
    <div className="container section">
      <div className="welcome-card">
        <div>
          <span className="welcome-card__eyebrow">Khách hàng</span>
          <h1>Xin chào, {user.fullName}!</h1>
          {loading ? (
            <p className="muted">Đang tải thông tin...</p>
          ) : data ? (
            <p className="muted">
              Thành viên từ {formatDate(data.memberSince)}
              {' · '}
              {data.address ? `Giao đến: ${data.address}` : 'Chưa có địa chỉ giao hàng'}
            </p>
          ) : null}
        </div>
        <div className="welcome-card__icon">
          <Icon name="utensils" size={34} />
        </div>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <h2 className="section__title">Chức năng của bạn</h2>
      <div className="feature-grid">
        {FEATURES.map((feature) => (
          <FeatureCard key={feature.title} {...feature} />
        ))}
      </div>
    </div>
  );
}
