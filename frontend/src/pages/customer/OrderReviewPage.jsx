import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { orderApi } from '../../api/orderApi.js';
import { reviewApi } from '../../api/customerApi.js';
import { getErrorMessage } from '../../api/baseApi.js';
import { PAYMENT_METHOD } from '../../utils/orderUtils.js';
import { reviewTime, RatingFields } from '../../components/CustomerReviews.jsx';
import { OrderLines, OrderStatus, PaymentStatus } from '../../components/OrderParts.jsx';
import Alert from '../../components/Alert.jsx';
import Modal from '../../components/Modal.jsx';

function isReviewable(order) {
  return order?.orderStatus === 'COMPLETED' && order?.paymentStatus === 'PAID';
}

export default function OrderReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('');
  const [review, setReview] = useState(null);
  const [error, setError] = useState('');
  const [reviewLoadError, setReviewLoadError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);

  const load = useCallback(async () => {
    setError('');
    setReviewLoadError('');
    try {
      const result = await orderApi.get(id);
      let existing = null;
      try {
        existing = await reviewApi.forOrder(id);
      } catch (reviewError) {
        if (alive.current) setReviewLoadError(getErrorMessage(reviewError, 'Không thể tải đánh giá đã có.'));
      }
      if (alive.current) {
        setOrder(result);
        setReview(existing);
        if (existing) { setRating(existing.rating); setContent(existing.content); }
      }
    } catch (requestError) {
      if (alive.current) setError(getErrorMessage(requestError, 'Không thể tải đơn hàng để đánh giá.'));
    }
  }, [id]);

  useEffect(() => {
    alive.current = true;
    load();
    return () => { alive.current = false; };
  }, [load]);

  useEffect(() => {
    if (!success) return undefined;
    const timer = window.setTimeout(() => navigate('/customer/orders', { replace: true }), 1800);
    return () => window.clearTimeout(timer);
  }, [success, navigate]);

  const submit = async (event) => {
    event.preventDefault();
    if (!order || !isReviewable(order)) return;
    setBusy(true);
    setSubmitError('');
    try {
      if (review) await reviewApi.edit(review.reviewId, { rating, content, version: review.version });
      else await reviewApi.create({ orderId: order.orderId, rating, content });
      if (alive.current) setSuccess(review ? `Đã cập nhật đánh giá ${rating} sao cho đơn ${order.orderCode}.` : `Đã gửi đánh giá ${rating} sao cho đơn ${order.orderCode}.`);
    } catch (requestError) {
      if (alive.current) setSubmitError(getErrorMessage(requestError, 'Không thể gửi đánh giá.'));
    } finally {
      if (alive.current) setBusy(false);
    }
  };

  if (error && !order) {
    return <main className="container commerce-page">
      <Alert type="error">{error}</Alert>
      <Link className="btn btn--outline" to="/customer/orders">Về đơn hàng của tôi</Link>
    </main>;
  }
  if (!order) return <main className="container commerce-page"><p role="status">Đang tải thông tin đơn hàng…</p></main>;

  const reviewable = isReviewable(order);
  const finishSuccess = () => navigate('/customer/orders', { replace: true });
  const uploadImage = async (event) => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file || !review) return;
    if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 1024 * 1024) { setSubmitError('Chỉ nhận ảnh JPG/PNG tối đa 1MB.'); return; }
    setBusy(true); setSubmitError('');
    try { await reviewApi.upload(review.reviewId, review.version, file); await load(); }
    catch (requestError) { if (alive.current) setSubmitError(getErrorMessage(requestError, 'Không thể tải ảnh lên.')); }
    finally { if (alive.current) setBusy(false); }
  };
  const removeImage = async image => {
    if (!review || !window.confirm(`Xóa ảnh ${image.displayOrder}?`)) return;
    setBusy(true); setSubmitError('');
    try { await reviewApi.deleteImage(review.reviewId, image.imageId, review.version); await load(); }
    catch (requestError) { if (alive.current) setSubmitError(getErrorMessage(requestError, 'Không thể xóa ảnh.')); }
    finally { if (alive.current) setBusy(false); }
  };
  return <main className="container commerce-page order-review-page">
    <Link to={`/customer/orders/${order.orderId}`} className="order-review-page__back">← Quay lại chi tiết đơn hàng</Link>
    <div className="commerce-row commerce-wrap">
      <div>
        <h1>Đánh giá đồ ăn</h1>
        <p>Đơn {order.orderCode} · hoàn tất lúc {reviewTime(order.completedAt)}</p>
      </div>
      <div className="order-review-page__statuses"><OrderStatus status={order.orderStatus} /><PaymentStatus status={order.paymentStatus} /></div>
    </div>

    <div className="order-review-page__grid">
      <section className="commerce-cart order-review-page__items">
        <h2>Món bạn đã dùng</h2>
        <p><strong>{order.restaurantName}</strong></p>
        <OrderLines items={order.items} />
        <p className="muted">{PAYMENT_METHOD[order.paymentMethod]} · Tổng thanh toán: <strong>{Number(order.totalAmount).toLocaleString('vi-VN')} ₫</strong></p>
      </section>

      <section className="commerce-compose order-review-page__form">
        <h2>Chia sẻ trải nghiệm</h2>
        {reviewable ? review?.editable === false ? <Alert type="warning" title="Đánh giá đã hết hạn sửa">
          Đánh giá này chỉ được chỉnh sửa hoặc thêm ảnh trong 7 ngày sau khi gửi.
        </Alert> : <form className="form" onSubmit={submit}>
          {reviewLoadError && <Alert type="warning">{reviewLoadError} Hãy khởi động lại Spring để tải chế độ chỉnh sửa đánh giá.</Alert>}
          <p>Hãy chia sẻ cảm nhận tổng quan về đồ ăn và trải nghiệm tại <strong>{order.restaurantName}</strong>.</p>
          <RatingFields {...{ rating, setRating, content, setContent }} />
          {review && <label className="commerce-field">Thêm ảnh JPG/PNG · tối đa 1MB/ảnh, tối đa 5 ảnh
            <input type="file" accept="image/jpeg,image/png" disabled={busy || review.images.length >= 5} onChange={uploadImage} />
          </label>}
          {review?.images?.length > 0 && <div className="commerce-images">{review.images.map(image => <div key={image.imageId} className="order-review-page__image">
            <img src={image.url} alt={`Ảnh đánh giá ${image.displayOrder}`} /><button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={() => removeImage(image)}>Xóa ảnh</button>
          </div>)}</div>}
          <p className="muted">{review ? 'Bạn có thể chỉnh sửa đánh giá và ảnh trong 7 ngày sau khi gửi.' : 'Sau khi gửi, bạn có thể bổ sung ảnh và chỉnh sửa đánh giá trong 7 ngày.'}</p>
          {submitError && <Alert type="error">{submitError}</Alert>}
          <button className="btn btn--primary" disabled={busy}>{busy ? 'Đang lưu…' : review ? 'Lưu chỉnh sửa' : 'Gửi đánh giá'}</button>
        </form> : <>
          <Alert type="warning" title="Đơn chưa đủ điều kiện đánh giá">
            Chỉ đơn đã hoàn tất và có trạng thái thanh toán thành công mới có thể gửi đánh giá.
          </Alert>
          <Link className="btn btn--outline" to={`/customer/orders/${order.orderId}`}>Xem chi tiết đơn</Link>
        </>}
      </section>
    </div>
    {success && <Modal title="Đánh giá thành công" onClose={finishSuccess} footer={<button type="button" className="btn btn--primary" onClick={finishSuccess}>Về đơn hàng</button>}>
      <Alert type="success">{success}</Alert>
      <p className="muted">Bạn sẽ được chuyển về danh sách đơn hàng trong giây lát.</p>
    </Modal>}
  </main>;
}
