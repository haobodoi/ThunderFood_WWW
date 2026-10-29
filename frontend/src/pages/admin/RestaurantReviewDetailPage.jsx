import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { adminRestaurantApi } from '../../api/adminRestaurantApi.js';
import { getErrorMessage, getFieldErrors } from '../../api/baseApi.js';
import useRegistrationOptions from '../../hooks/useRegistrationOptions.js';
import { formatDateTime } from '../../utils/restaurantUtils.js';
import Alert from '../../components/Alert.jsx';
import FullPageLoader from '../../components/FullPageLoader.jsx';
import StatusLabel from '../../components/StatusLabel.jsx';
import RestaurantSummary from '../../components/RestaurantSummary.jsx';
import Modal from '../../components/Modal.jsx';
import Icon from '../../components/Icon.jsx';

export default function RestaurantReviewDetailPage() {
  const { id } = useParams();
  const { options } = useRegistrationOptions();
  const [registration, setRegistration] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');

  useEffect(() => {
    let active = true;
    adminRestaurantApi
      .get(id)
      .then((data) => active && setRegistration(data))
      .catch((err) => active && setError(getErrorMessage(err, 'Không tải được hồ sơ.')));
    return () => {
      active = false;
    };
  }, [id]);

  const approve = async () => {
    setBusy(true);
    setError('');
    try {
      setRegistration(await adminRestaurantApi.approve(id));
      setNotice('Đã duyệt quán. Quán sẽ xuất hiện trong mục "Quán của tôi" của đối tác.');
    } catch (err) {
      setError(getErrorMessage(err, 'Duyệt thất bại.'));
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    setReasonError('');
    if (!reason.trim()) {
      setReasonError('Vui lòng nhập lý do từ chối');
      return;
    }
    setBusy(true);
    try {
      setRegistration(await adminRestaurantApi.reject(id, reason.trim()));
      setNotice('Đã từ chối hồ sơ. Đối tác sẽ thấy lý do và có thể chỉnh sửa để gửi lại.');
      setRejecting(false);
      setReason('');
    } catch (err) {
      setReasonError(getFieldErrors(err).reason || getErrorMessage(err, 'Từ chối thất bại.'));
    } finally {
      setBusy(false);
    }
  };

  if (!registration && !error) return <FullPageLoader text="Đang tải hồ sơ..." />;

  return (
    <div className="page page--wide">
      <Link to="/admin/restaurants" className="back-link">
        <Icon name="arrowLeft" size={16} />
        Danh sách hồ sơ
      </Link>

      {error && <Alert type="error">{error}</Alert>}

      {registration && (
        <>
          <div className="page__head page__head--row">
            <div>
              <h1>{registration.restaurantName}</h1>
              <p className="muted">
                Chủ quán: <strong>{registration.ownerName}</strong> · {registration.ownerEmail} · {registration.ownerPhone}
              </p>
              <p className="muted">Gửi duyệt lúc {formatDateTime(registration.submittedAt)}</p>
            </div>
            <StatusLabel status={registration.status} />
          </div>

          {notice && <Alert type="success">{notice}</Alert>}
          {registration.status === 'REJECTED' && registration.statusReason && (
            <Alert type="error" title="Lý do từ chối">
              {registration.statusReason}
            </Alert>
          )}

          {registration.status === 'PENDING' && (
            <div className="review-actions">
              <span>Kiểm tra kỹ giấy tờ, tài khoản ngân hàng và hình ảnh trước khi quyết định.</span>
              <div>
                <button type="button" className="btn btn--outline btn--danger-text" onClick={() => setRejecting(true)} disabled={busy}>
                  <Icon name="x" size={16} />
                  Từ chối
                </button>
                <button type="button" className="btn btn--primary" onClick={approve} disabled={busy}>
                  <Icon name="check" size={16} />
                  Duyệt quán
                </button>
              </div>
            </div>
          )}

          <div className="step-card">
            <RestaurantSummary registration={registration} options={options} />
          </div>
        </>
      )}

      {rejecting && (
        <Modal
          title="Từ chối hồ sơ"
          onClose={busy ? undefined : () => setRejecting(false)}
          footer={
            <>
              <button type="button" className="btn btn--outline" onClick={() => setRejecting(false)} disabled={busy}>
                Hủy
              </button>
              <button type="button" className="btn btn--danger" onClick={reject} disabled={busy}>
                {busy ? 'Đang xử lý...' : 'Xác nhận từ chối'}
              </button>
            </>
          }
        >
          <label className="field__label" htmlFor="rejectReason">
            Lý do từ chối (đối tác sẽ nhìn thấy)
          </label>
          <textarea
            id="rejectReason"
            className="field__input field__textarea"
            rows={4}
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ví dụ: Ảnh CCCD bị mờ, vui lòng chụp lại rõ nét"
          />
          {reasonError && <p className="field__error">{reasonError}</p>}
        </Modal>
      )}
    </div>
  );
}
