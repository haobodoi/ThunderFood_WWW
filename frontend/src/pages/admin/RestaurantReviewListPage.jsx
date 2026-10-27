import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminRestaurantApi } from '../../api/adminRestaurantApi.js';
import { getErrorMessage } from '../../api/baseApi.js';
import { formatDateTime } from '../../utils/restaurantUtils.js';
import Alert from '../../components/Alert.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import Icon from '../../components/Icon.jsx';

const TABS = [
  { status: 'PENDING', label: 'Chờ duyệt' },
  { status: 'APPROVED', label: 'Đã duyệt' },
  { status: 'REJECTED', label: 'Bị từ chối' },
];

export default function RestaurantReviewListPage() {
  const [status, setStatus] = useState('PENDING');
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setItems(null);
    setError('');
    adminRestaurantApi
      .list(status)
      .then((data) => active && setItems(data))
      .catch((err) => active && setError(getErrorMessage(err, 'Không tải được danh sách hồ sơ.')));
    return () => {
      active = false;
    };
  }, [status]);

  return (
    <div className="page page--wide">
      <div className="page__head">
        <h1>Duyệt quán</h1>
        <p className="muted">Kiểm tra hồ sơ đăng ký của đối tác trước khi cho quán hoạt động.</p>
      </div>

      <div className="tabs" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.status}
            type="button"
            role="tab"
            aria-selected={status === tab.status}
            className={`tabs__item ${status === tab.status ? 'is-active' : ''}`}
            onClick={() => setStatus(tab.status)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && <Alert type="error">{error}</Alert>}
      {!items && !error && <p className="muted">Đang tải...</p>}

      {items && items.length === 0 && (
        <div className="empty-state">
          <Icon name="shield" size={34} />
          <strong>Không có hồ sơ nào</strong>
          <p>Danh sách sẽ hiện ở đây khi có đối tác gửi đăng ký quán.</p>
        </div>
      )}

      {items && items.length > 0 && (
        <div className="review-table">
          <div className="review-table__row review-table__row--head">
            <span>Quán</span>
            <span>Chủ quán</span>
            <span>Gửi lúc</span>
            <span>Trạng thái</span>
            <span />
          </div>
          {items.map((item) => (
            <div key={item.id} className="review-table__row">
              <span className="review-table__name">
                <strong>{item.restaurantName}</strong>
                <small>{item.address}</small>
              </span>
              <span>
                {item.ownerName}
                <small>{item.ownerEmail}</small>
              </span>
              <span>{formatDateTime(item.submittedAt)}</span>
              <span>
                <StatusBadge status={item.status} />
              </span>
              <span>
                <Link to={`/admin/restaurants/${item.id}`} className="btn btn--outline btn--sm">
                  {item.status === 'PENDING' ? 'Xem & duyệt' : 'Xem'}
                </Link>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
