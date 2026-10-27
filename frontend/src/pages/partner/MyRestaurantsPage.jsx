import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { partnerRestaurantApi } from '../../api/partnerRestaurantApi.js';
import { getErrorMessage } from '../../api/baseApi.js';
import { LAST_DATA_STEP, formatDate } from '../../utils/restaurantUtils.js';
import Alert from '../../components/Alert.jsx';
import FullPageLoader from '../../components/FullPageLoader.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import Modal from '../../components/Modal.jsx';
import Icon from '../../components/Icon.jsx';

const MINE = ['APPROVED', 'LOCKED'];

function RestaurantCard({ restaurant, onDelete }) {
  const { status } = restaurant;
  const progress = status === 'DRAFT' ? Math.round((restaurant.registrationStep / LAST_DATA_STEP) * 100) : 100;
  const date = restaurant.updatedAt || restaurant.submittedAt;

  let message;
  let action;
  if (status === 'DRAFT') {
    message = `Bạn đã hoàn thành ${restaurant.registrationStep}/${LAST_DATA_STEP} bước. Hoàn tất và gửi duyệt để bắt đầu bán hàng.`;
    action = 'Tiếp tục đăng ký';
  } else if (status === 'PENDING') {
    message = 'Đăng ký của bạn đang trong quá trình duyệt.';
    action = 'Xem hồ sơ';
  } else if (status === 'REJECTED') {
    message = `Hồ sơ bị từ chối${restaurant.statusReason ? `: ${restaurant.statusReason}` : ''}. Vui lòng chỉnh sửa và gửi lại.`;
    action = 'Chỉnh sửa & gửi lại';
  } else if (status === 'APPROVED') {
    message = `Quán đang ${restaurant.open ? 'mở cửa nhận đơn' : 'tạm đóng cửa'} trên ThunderFood.`;
    action = 'Xem thông tin';
  } else {
    message = restaurant.statusReason ? `Quán đã bị khóa: ${restaurant.statusReason}` : 'Quán đã bị khóa.';
    action = 'Xem thông tin';
  }

  return (
    <article className={`restaurant-card restaurant-card--${status.toLowerCase()}`}>
      <div className="restaurant-card__image">
        {restaurant.avatarImage ? <img src={restaurant.avatarImage} alt="" /> : <Icon name="store" size={30} />}
      </div>
      <div className="restaurant-card__body">
        <h3>{restaurant.restaurantName}</h3>
        <p className="restaurant-card__address">
          <Icon name="mapPin" size={14} />
          {restaurant.address}
        </p>
        <div className="restaurant-card__meta">
          <span className="progress">
            <span className="progress__bar" style={{ width: `${progress}%` }} />
          </span>
          <StatusBadge status={status} />
          {date && <span className="muted">{formatDate(date)} đã cập nhật</span>}
        </div>
        <div className={`restaurant-card__note restaurant-card__note--${status.toLowerCase()}`}>
          <Icon name={status === 'REJECTED' || status === 'LOCKED' ? 'alert' : status === 'APPROVED' ? 'check' : 'clock'} size={16} />
          <span>{message}</span>
        </div>
        <div className="restaurant-card__actions">
          <Link to={`/partner/register/${restaurant.id}`} className="btn btn--primary btn--sm">
            {action}
          </Link>
          {status === 'DRAFT' && (
            <button type="button" className="btn btn--ghost btn--sm btn--danger-text" onClick={() => onDelete(restaurant)}>
              <Icon name="trash" size={14} />
              Xóa nháp
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export default function MyRestaurantsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState(location.state?.tab ?? null);
  const [flash, setFlash] = useState(location.state?.flash ?? '');
  const [deleting, setDeleting] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  const load = useCallback(async () => {
    try {
      setRestaurants(await partnerRestaurantApi.list());
      setError('');
    } catch (err) {
      setError(getErrorMessage(err, 'Không tải được danh sách quán.'));
    }
  }, []);

  useEffect(() => {
    load();
    if (location.state) navigate(location.pathname, { replace: true, state: null });
  }, []);

  if (!restaurants && !error) return <FullPageLoader text="Đang tải danh sách quán..." />;

  const list = restaurants ?? [];
  const mine = list.filter((r) => MINE.includes(r.status));
  const registrations = list.filter((r) => !MINE.includes(r.status));
  const activeTab = tab ?? (mine.length === 0 && registrations.length > 0 ? 'registrations' : 'mine');
  const shown = activeTab === 'mine' ? mine : registrations;

  const confirmDelete = async () => {
    setDeleteError('');
    try {
      await partnerRestaurantApi.remove(deleting.id);
      setFlash(`Đã xóa hồ sơ nháp "${deleting.restaurantName}".`);
      setDeleting(null);
      load();
    } catch (err) {
      setDeleteError(getErrorMessage(err, 'Không xóa được hồ sơ.'));
    }
  };

  return (
    <div className="page page--wide">
      <div className="page__head page__head--row">
        <div>
          <h1>Đăng ký quán</h1>
          <p className="muted">Quản lý các quán của bạn và hồ sơ đăng ký trên ThunderFood.</p>
        </div>
        <Link to="/partner/register" className="btn btn--primary">
          <Icon name="plus" size={16} />
          Đăng ký quán mới
        </Link>
      </div>

      {flash && <Alert type="success">{flash}</Alert>}
      {error && <Alert type="error">{error}</Alert>}

      <div className="tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'mine'}
          className={`tabs__item ${activeTab === 'mine' ? 'is-active' : ''}`}
          onClick={() => setTab('mine')}
        >
          Quán của tôi ({mine.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'registrations'}
          className={`tabs__item ${activeTab === 'registrations' ? 'is-active' : ''}`}
          onClick={() => setTab('registrations')}
        >
          Đăng ký quán ({registrations.length})
        </button>
      </div>

      {shown.length === 0 ? (
        <div className="empty-state">
          <Icon name="store" size={34} />
          <strong>{activeTab === 'mine' ? 'Bạn chưa có quán nào đang hoạt động' : 'Chưa có hồ sơ đăng ký nào'}</strong>
          <p>Đăng ký quán qua 5 bước đơn giản, ThunderFood sẽ duyệt và đưa quán của bạn lên ứng dụng.</p>
          <Link to="/partner/register" className="btn btn--primary">
            Đăng ký quán ngay
          </Link>
        </div>
      ) : (
        <div className="restaurant-list">
          {shown.map((restaurant) => (
            <RestaurantCard key={restaurant.id} restaurant={restaurant} onDelete={setDeleting} />
          ))}
        </div>
      )}

      {deleting && (
        <Modal
          title="Xóa hồ sơ nháp?"
          onClose={() => setDeleting(null)}
          footer={
            <>
              <button type="button" className="btn btn--outline" onClick={() => setDeleting(null)}>
                Hủy
              </button>
              <button type="button" className="btn btn--danger" onClick={confirmDelete}>
                Xóa hồ sơ
              </button>
            </>
          }
        >
          {deleteError && <Alert type="error">{deleteError}</Alert>}
          <p>
            Hồ sơ <strong>{deleting.restaurantName}</strong> và các thông tin đã nhập sẽ bị xóa vĩnh viễn.
          </p>
        </Modal>
      )}
    </div>
  );
}
