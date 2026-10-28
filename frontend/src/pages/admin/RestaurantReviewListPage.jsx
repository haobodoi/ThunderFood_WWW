import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminRestaurantApi } from '../../api/adminRestaurantApi.js';
import { getErrorMessage } from '../../api/baseApi.js';
import { formatDateTime } from '../../utils/restaurantUtils.js';
import Alert from '../../components/Alert.jsx';
import StatusLabel from '../../components/StatusLabel.jsx';
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
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;
    setItems(null);
    setError('');
    adminRestaurantApi.list(status)
      .then((data) => { if (active) setItems(Array.isArray(data) ? data : []); })
      .catch((err) => { if (active) setError(getErrorMessage(err, 'Không tải được danh sách hồ sơ.')); });
    return () => { active = false; };
  }, [status, reloadToken]);

  return (
    <div className="page page--wide">
      <div className="page__head">
        <h1>Duyệt quán</h1>
        <p className="muted">Kiểm tra hồ sơ đăng ký trước khi cho quán hoạt động.</p>
      </div>
      <div className="tabs" aria-label="Lọc trạng thái hồ sơ">
        {TABS.map((tab) => (
          <button key={tab.status} type="button" aria-pressed={status === tab.status}
            className={'tabs__item' + (status === tab.status ? ' is-active' : '')}
            onClick={() => setStatus(tab.status)}>{tab.label}</button>
        ))}
      </div>
      {error && <div><Alert type="error">{error}</Alert>
        <button type="button" className="btn btn--outline btn--sm" onClick={() => setReloadToken((value) => value + 1)}>Thử lại</button>
      </div>}
      {!items && !error && <p className="muted" role="status">Đang tải hồ sơ...</p>}
      {items && items.length === 0 && <div className="empty-state">
        <Icon name="shield" size={34} /><strong>Không có hồ sơ trong mục này</strong>
        <p>Hồ sơ mới sẽ xuất hiện khi đối tác gửi đăng ký.</p>
      </div>}
      {items && items.length > 0 && <div className="tf-admin-table-wrap">
        <table className="tf-admin-table">
          <thead><tr><th scope="col">Quán</th><th scope="col">Chủ quán</th>
            <th scope="col">Gửi lúc</th><th scope="col">Trạng thái</th><th scope="col">Thao tác</th></tr></thead>
          <tbody>{items.map((item) => (
            <tr key={item.id}>
              <td><strong>{item.restaurantName || 'Nhà hàng'}</strong><small>{item.address}</small></td>
              <td>{item.ownerName}<small>{item.ownerEmail}</small></td>
              <td>{formatDateTime(item.submittedAt)}</td>
              <td><StatusLabel status={item.status} /></td>
              <td><Link to={'/admin/restaurants/' + item.id} className="btn btn--outline btn--sm">
                {item.status === 'PENDING' ? 'Xem & duyệt' : 'Xem'}
              </Link></td>
            </tr>
          ))}</tbody>
        </table>
      </div>}
    </div>
  );
}
