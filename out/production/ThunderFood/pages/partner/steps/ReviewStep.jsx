import { useState } from 'react';
import { partnerRestaurantApi } from '../../../api/partnerRestaurantApi.js';
import { getErrorMessage } from '../../../api/baseApi.js';
import RestaurantSummary from '../../../components/RestaurantSummary.jsx';
import Alert from '../../../components/Alert.jsx';

export default function ReviewStep({ registration, options, onEdit, onBack, onSubmitted }) {
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!agreed) {
      setError('Vui lòng xác nhận cam kết thông tin trước khi gửi.');
      return;
    }
    setSubmitting(true);
    try {
      onSubmitted(await partnerRestaurantApi.submit(registration.id));
    } catch (err) {
      setError(getErrorMessage(err, 'Gửi duyệt thất bại, vui lòng thử lại.'));
      setSubmitting(false);
    }
  };

  return (
    <div className="step-card">
      <h2 className="step-card__title">Xác nhận thông tin</h2>
      <p className="step-card__subtitle">Kiểm tra lại toàn bộ thông tin trước khi gửi cho ThunderFood duyệt.</p>
      {error && <Alert type="error">{error}</Alert>}

      <RestaurantSummary registration={registration} options={options} onEdit={onEdit} />

      <label className="checkbox">
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
        <span>
          Tôi cam kết các thông tin trên là chính xác và đồng ý để ThunderFood xác minh hồ sơ. Sau khi gửi, hồ sơ sẽ
          không thể chỉnh sửa cho tới khi có kết quả duyệt.
        </span>
      </label>

      <div className="step-card__footer">
        <button type="button" className="btn btn--outline btn--lg" onClick={onBack}>
          Quay lại
        </button>
        <button type="button" className="btn btn--primary btn--lg" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Đang gửi...' : 'Gửi đăng ký'}
        </button>
      </div>
    </div>
  );
}
