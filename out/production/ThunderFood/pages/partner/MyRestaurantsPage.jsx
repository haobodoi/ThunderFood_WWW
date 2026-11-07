import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { partnerRestaurantApi } from '../../api/partnerRestaurantApi.js';
import { getErrorMessage } from '../../api/baseApi.js';
import { LAST_DATA_STEP, formatDate } from '../../utils/restaurantUtils.js';
import { getSmartRestaurantCover } from '../../utils/mediaUtils.js';
import Alert from '../../components/Alert.jsx';
import FullPageLoader from '../../components/FullPageLoader.jsx';
import StatusLabel from '../../components/StatusLabel.jsx';
import Modal from '../../components/Modal.jsx';
import Icon from '../../components/Icon.jsx';

const MINE = ['APPROVED', 'LOCKED'];

function RestaurantCard({ restaurant, onDelete }) {
  const { status } = restaurant;
  const progressValue = status === 'DRAFT'
    ? Math.max(0, Math.min(LAST_DATA_STEP, Number(restaurant.registrationStep) || 0))
    : LAST_DATA_STEP;
  const date = restaurant.updatedAt || restaurant.submittedAt;
  const imageUrl = restaurant.avatarImage || getSmartRestaurantCover(restaurant);
  let message = '';
  let action = 'Xem thông tin';
  if (status === 'DRAFT') {
    message = 'Đã hoàn thành ' + progressValue + '/' + LAST_DATA_STEP + ' bước. Hoàn tất hồ sơ để gửi duyệt.';
    action = 'Tiếp tục đăng ký';
  } else if (status === 'PENDING') {
    message = 'Hồ sơ của bạn đang được xem xét.';
    action = 'Xem hồ sơ';
  } else if (status === 'REJECTED') {
    message = 'Hồ sơ bị từ chối. ' + (restaurant.statusReason || 'Vui lòng kiểm tra và gửi lại.');
    action = 'Chỉnh sửa & gửi lại';
  } else if (status === 'APPROVED') {
    action = 'Hồ sơ quán';
  } else if (status === 'LOCKED') {
    message = restaurant.statusReason || 'Quán đã bị khóa.';
  }

  return (
    <article className={'restaurant-card restaurant-card--' + String(status || '').toLowerCase()}>
      <div className="restaurant-card__image">
        {imageUrl ? <img src={imageUrl} alt="" /> :
          <span className="restaurant-card__image-fallback"><Icon name="store" size={28} /></span>}
      </div>
      <div className="restaurant-card__body">
        <div className="restaurant-card__heading">
          <h3>{restaurant.restaurantName || 'Nhà hàng'}</h3>
          <StatusLabel status={status} />
        </div>
        {restaurant.address && <p className="restaurant-card__address">
          <Icon name="mapPin" size={14} /><span>{restaurant.address}</span>
        </p>}
        <div className="restaurant-card__meta">
          {status === 'DRAFT' && (
            <progress className="restaurant-card__progress" max={LAST_DATA_STEP} value={progressValue}
              aria-label={'Tiến độ hồ sơ ' + (restaurant.restaurantName || '')} />
          )}
          {status === 'APPROVED' && (
            <span className={'restaurant-card__open-inline' + (restaurant.open ? ' is-open' : '')}>
              <Icon name={restaurant.open ? 'checkCircle' : 'pauseCircle'} size={15} />
              <span>{restaurant.open ? 'Đang mở cửa nhận đơn' : 'Tạm ngưng nhận đơn'}</span>
            </span>
          )}
          {date && <span className="muted">Cập nhật {formatDate(date)}</span>}
        </div>
        {status !== 'APPROVED' && (
          <div className={'restaurant-card__note restaurant-card__note--' + String(status || '').toLowerCase()}>
            <Icon name={status === 'REJECTED' || status === 'LOCKED' ? 'alert' : 'clock'} size={16} />
            <span>{message}</span>
          </div>
        )}
        <div className="restaurant-card__actions">
          {status === 'APPROVED' && <>
            <Link to={'/partner/restaurants/' + restaurant.id + '/menu'} className="btn btn--primary btn--sm">
              <Icon name="utensils" size={15} />Quản lý thực đơn
            </Link>
            <Link to={'/restaurants/' + restaurant.id} className="btn btn--outline btn--sm">
              <Icon name="externalLink" size={14} />Xem trang quán
            </Link>
          </>}
          <Link to={'/partner/register/' + restaurant.id}
            className={status === 'APPROVED' ? 'btn btn--ghost btn--sm' : 'btn btn--primary btn--sm'}>
            {action}
          </Link>
          {status === 'DRAFT' && <button type="button" className="btn btn--ghost btn--sm btn--danger-text"
            onClick={() => onDelete(restaurant)}>
            <Icon name="trash" size={14} />Xóa nháp
          </button>}
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
  const [deleteBusy, setDeleteBusy] = useState(false);
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
    if (!deleting || deleteBusy) return;
    setDeleteError('');
    setDeleteBusy(true);
    try {
      await partnerRestaurantApi.remove(deleting.id);
      setFlash(`Đã xóa hồ sơ nháp "${deleting.restaurantName}".`);
      setDeleting(null);
      load();
    } catch (err) {
      setDeleteError(getErrorMessage(err, 'Không xóa được hồ sơ.'));
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="page page--wide">
      <div className="page__head page__head--row">
        <div>
          <h1>Quản lý quán & Hồ sơ đối tác</h1>
          <p className="muted">Quản lý thực đơn các quán đang hoạt động và theo dõi hồ sơ đăng ký trên ThunderFood.</p>
        </div>
        <Link to="/partner/register" className="btn btn--primary">
          <Icon name="plus" size={16} />
          <span>Đăng ký quán mới</span>
        </Link>
      </div>

      {flash && <Alert type="success">{flash}</Alert>}
      {error && <Alert type="error">{error}</Alert>}

      <div className="tabs" aria-label="Lọc quán của đối tác">
        <button
          type="button"
          aria-pressed={activeTab === 'mine'}
          className={`tabs__item ${activeTab === 'mine' ? 'is-active' : ''}`}
          onClick={() => setTab('mine')}
        >
          Quán của tôi ({mine.length})
        </button>
        <button
          type="button"
          aria-pressed={activeTab === 'registrations'}
          className={`tabs__item ${activeTab === 'registrations' ? 'is-active' : ''}`}
          onClick={() => setTab('registrations')}
        >
          Hồ sơ đăng ký ({registrations.length})
        </button>
      </div>

      {shown.length === 0 ? (
        <div className="empty-state">
          <Icon name="store" size={34} />
          <strong>
            {activeTab === 'mine' ? 'Bạn chưa có quán nào đang hoạt động' : 'Chưa có hồ sơ đăng ký nào'}
          </strong>
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
          onClose={deleteBusy ? undefined : () => setDeleting(null)}
          footer={
            <>
              <button type="button" className="btn btn--outline" onClick={() => setDeleting(null)} disabled={deleteBusy}>
                Hủy
              </button>
              <button type="button" className="btn btn--danger" onClick={confirmDelete} disabled={deleteBusy}>
                {deleteBusy ? 'Đang xóa...' : 'Xóa hồ sơ'}
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
