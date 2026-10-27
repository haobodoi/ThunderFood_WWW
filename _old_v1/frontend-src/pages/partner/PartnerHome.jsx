import { useAuth } from '../../context/AuthContext.jsx';
import { dashboardApi } from '../../api/dashboardApi.js';
import useApi from '../../hooks/useApi.js';
import FeatureCard from '../../components/FeatureCard.jsx';
import Alert from '../../components/Alert.jsx';

const FEATURES = [
  { icon: 'book', title: 'Quản lý thực đơn', description: 'Thêm, sửa, xóa món và danh mục món ăn.' },
  { icon: 'receipt', title: 'Xử lý đơn hàng', description: 'Xác nhận, từ chối và cập nhật trạng thái đơn.' },
  { icon: 'store', title: 'Trạng thái nhà hàng', description: 'Mở cửa / đóng cửa nhận đơn.' },
  { icon: 'chart', title: 'Thống kê', description: 'Số đơn, doanh thu và món bán chạy.' },
];

function RestaurantStatus({ data }) {
  if (!data.hasRestaurant) {
    return (
      <Alert type="warning" title="Bạn chưa có nhà hàng">
        Tài khoản đối tác này chưa gắn với nhà hàng nào.
      </Alert>
    );
  }
  switch (data.status) {
    case 'APPROVED':
      return (
        <Alert type="success" title={`${data.restaurantName} đang hoạt động`}>
          Hiện nhà hàng đang {data.open ? 'mở cửa nhận đơn' : 'đóng cửa (không nhận đơn)'}.
        </Alert>
      );
    case 'PENDING':
      return (
        <Alert type="warning" title={`${data.restaurantName} đang chờ duyệt`}>
          Quản trị viên sẽ xem xét hồ sơ. Bạn có thể bắt đầu bán hàng sau khi được duyệt.
        </Alert>
      );
    case 'REJECTED':
      return (
        <Alert type="error" title={`${data.restaurantName} bị từ chối`}>
          {data.statusReason ? `Lý do: ${data.statusReason}` : 'Vui lòng cập nhật lại thông tin nhà hàng.'}
        </Alert>
      );
    default:
      return (
        <Alert type="error" title={`${data.restaurantName} đã bị khóa`}>
          {data.statusReason ? `Lý do: ${data.statusReason}` : 'Vui lòng liên hệ quản trị viên.'}
        </Alert>
      );
  }
}

export default function PartnerHome() {
  const { user } = useAuth();
  const { data, error, loading } = useApi(dashboardApi.partner);

  return (
    <div className="page">
      <div className="page__head">
        <h1>Tổng quan nhà hàng</h1>
        <p className="muted">Xin chào {user.fullName}, đây là kênh quản lý dành cho đối tác.</p>
      </div>

      {loading && <div className="skeleton skeleton--banner" />}
      {error && <Alert type="error">{error}</Alert>}
      {data && <RestaurantStatus data={data} />}

      <h2 className="section__title">Chức năng quản lý</h2>
      <div className="feature-grid feature-grid--2">
        {FEATURES.map((feature) => (
          <FeatureCard key={feature.title} {...feature} />
        ))}
      </div>
    </div>
  );
}
