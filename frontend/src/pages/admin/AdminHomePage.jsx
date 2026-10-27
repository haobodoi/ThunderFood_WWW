import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { adminRestaurantApi } from '../../api/adminRestaurantApi.js';
import AccountInfoCard from '../../components/AccountInfoCard.jsx';
import Icon from '../../components/Icon.jsx';

export default function AdminHomePage() {
  const { user } = useAuth();
  const [pending, setPending] = useState(null);

  useEffect(() => {
    let active = true;
    adminRestaurantApi
      .list('PENDING')
      .then((items) => active && setPending(items.length))
      .catch(() => active && setPending(null));
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="page">
      <div className="page__head">
        <h1>Trang quản trị</h1>
        <p className="muted">Xin chào {user.fullName}, bạn đã đăng nhập với vai trò quản trị viên.</p>
      </div>

      {pending !== null && (
        <Link to="/admin/restaurants" className="callout">
          <span className="callout__icon">
            <Icon name="shield" size={20} />
          </span>
          <span className="callout__text">
            <strong>{pending} hồ sơ quán đang chờ duyệt</strong>
            <small>Xem và duyệt hồ sơ đăng ký quán của đối tác</small>
          </span>
          <Icon name="arrowRight" size={18} />
        </Link>
      )}

      <AccountInfoCard user={user} />
    </div>
  );
}
