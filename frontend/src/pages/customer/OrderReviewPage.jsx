import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { orderApi } from '../../api/orderApi.js';
import { reviewApi } from '../../api/customerApi.js';
import { getErrorMessage } from '../../api/baseApi.js';
import { PAYMENT_METHOD } from '../../utils/orderUtils.js';
import { reviewTime, RatingFields, ReviewCard } from '../../components/CustomerReviews.jsx';
import { OrderLines, OrderStatus, PaymentStatus } from '../../components/OrderParts.jsx';
import Alert from '../../components/Alert.jsx';
import Icon from '../../components/Icon.jsx';

const MAX_REVIEW_IMAGES = 5;
const MAX_IMAGE_BYTES = 1024 * 1024;

function imageError(file) {
  return !['image/jpeg', 'image/png'].includes(file.type) || file.size > MAX_IMAGE_BYTES
    ? 'Chỉ nhận ảnh JPG/PNG tối đa 1MB.' : '';
}

export default function OrderReviewPage() {
  const { id } = useParams();
  return <OrderReview key={id} id={id} />;
}

function OrderReview({ id }) {
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('');
  const [reviewState, setReviewState] = useState(null);
  const review = reviewState?.review;
  const canEdit = review ? review.editable : reviewState?.canCreate;
  const [queuedImages, setQueuedImages] = useState([]);
  const [error, setError] = useState('');
  const [reviewLoadError, setReviewLoadError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);
  const queuedRef = useRef([]);
  const imageSequence = useRef(0);
  const loadSequence = useRef(0);

  const load = useCallback(async () => {
    const request = ++loadSequence.current;
    setError('');
    setReviewLoadError('');
    try {
      const [result, state] = await Promise.all([
        orderApi.get(id),
        reviewApi.orderState(id).catch(reviewError => {
          if (request === loadSequence.current) setReviewLoadError(getErrorMessage(reviewError, 'Không thể tải thông tin đánh giá.'));
          return null;
        }),
      ]);
      if (request !== loadSequence.current) return;
      setOrder(result);
      setReviewState(state);
      if (state?.review) {
        setRating(state.review.rating);
        setContent(state.review.content);
      }
    } catch (requestError) {
      if (request === loadSequence.current) setError(getErrorMessage(requestError, 'Không thể tải đơn hàng để đánh giá.'));
    }
  }, [id]);

  useEffect(() => {
    alive.current = true;
    load();
    return () => {
      alive.current = false;
      ++loadSequence.current;
      queuedRef.current.forEach(image => URL.revokeObjectURL(image.previewUrl));
    };
  }, [load]);

  const removeQueuedImage = imageId => setQueuedImages(previous => {
    const removed = previous.find(image => image.id === imageId);
    if (removed) URL.revokeObjectURL(removed.previewUrl);
    const next = previous.filter(image => image.id !== imageId);
    queuedRef.current = next;
    return next;
  });

  const selectImages = event => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    const remaining = MAX_REVIEW_IMAGES - (review?.images?.length || 0) - queuedImages.length;
    if (remaining <= 0) { setSubmitError(`Mỗi đánh giá chỉ có tối đa ${MAX_REVIEW_IMAGES} ảnh.`); return; }
    const invalid = files.find(imageError);
    if (invalid) { setSubmitError(imageError(invalid)); return; }
    const accepted = files.slice(0, remaining).map(file => ({
      id: `pending-image-${++imageSequence.current}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setSubmitError(files.length > accepted.length ? `Chỉ có thể chọn thêm ${remaining} ảnh.` : '');
    setQueuedImages(previous => {
      const next = [...previous, ...accepted];
      queuedRef.current = next;
      return next;
    });
  };

  const submit = async event => {
    event.preventDefault();
    if (busy || reviewLoadError || !canEdit) return;
    setBusy(true); setSubmitError(''); setSuccess('');
    try {
      if (review) {
        await reviewApi.edit(review.reviewId, { rating, content, version: review.version });
      } else {
        await reviewApi.create({ orderId: order.orderId, rating, content });
      }
      let savedReview = await reviewApi.forOrder(id);
      for (const image of queuedImages) {
        if (!alive.current) return;
        await reviewApi.upload(savedReview.reviewId, savedReview.version, image.file);
        removeQueuedImage(image.id);
        savedReview = await reviewApi.forOrder(id);
      }
      if (alive.current) {
        setReviewState({ review: savedReview, canCreate: false, reason: '' });
        setSuccess('Đã lưu đánh giá. Bạn vẫn có thể chỉnh sửa hoặc thêm ảnh trong 7 ngày.');
      }
    } catch (requestError) {
      if (alive.current) {
        setSubmitError(getErrorMessage(requestError, 'Không thể lưu đánh giá. Ảnh chưa tải vẫn được giữ lại để bạn thử lại.'));
        try {
          const latest = await reviewApi.orderState(id);
          if (alive.current) setReviewState(latest);
        } catch (reloadError) {
          if (alive.current) setReviewLoadError(getErrorMessage(reloadError, 'Không thể đồng bộ lại đánh giá.'));
        }
      }
    } finally {
      if (alive.current) setBusy(false);
    }
  };

  const removeImage = async image => {
    if (!review || !window.confirm(`Xóa ảnh ${image.displayOrder}?`)) return;
    setBusy(true); setSubmitError('');
    try { await reviewApi.deleteImage(review.reviewId, image.imageId, review.version); await load(); }
    catch (requestError) { if (alive.current) setSubmitError(getErrorMessage(requestError, 'Không thể xóa ảnh.')); }
    finally { if (alive.current) setBusy(false); }
  };

  if (error && !order) return <div className="container commerce-page"><Alert type="error">{error}</Alert><Link className="btn btn--outline" to="/customer/orders">Về đơn hàng của tôi</Link></div>;
  if (!order) return <div className="container commerce-page"><p role="status">Đang tải thông tin đơn hàng…</p></div>;

  const imageCount = (review?.images?.length || 0) + queuedImages.length;
  const deleted = Boolean(review?.deletedAt);
  return <div className="container commerce-page order-review-page">
    <Link to={`/customer/orders/${order.orderId}`} className="order-review-page__back">← Quay lại chi tiết đơn hàng</Link>
    <div className="commerce-row commerce-wrap"><div><h1>Đánh giá đồ ăn</h1><p>Đơn {order.orderCode} · hoàn tất lúc {reviewTime(order.completedAt)}</p></div><div className="order-review-page__statuses"><OrderStatus status={order.orderStatus} /><PaymentStatus status={order.paymentStatus} /></div></div>
    <div className="order-review-page__grid">
      <section className="commerce-cart order-review-page__items"><h2>Món bạn đã dùng</h2><p><strong>{order.restaurantName}</strong></p><OrderLines items={order.items} /><p className="muted">{PAYMENT_METHOD[order.paymentMethod]} · Tổng thanh toán: <strong>{Number(order.totalAmount).toLocaleString('vi-VN')} ₫</strong></p></section>
      <section className="commerce-compose order-review-page__form">
        <h2>{review?.editable === false ? 'Đánh giá của bạn' : 'Chia sẻ trải nghiệm'}</h2>
        {reviewLoadError && <Alert type="warning">{reviewLoadError} <button type="button" className="btn btn--outline btn--sm" disabled={busy} onClick={async () => {
          setBusy(true);
          await load();
          if (alive.current) setBusy(false);
        }}>Tải lại đánh giá</button></Alert>}
        {review?.editable === false && <div className="order-review-page__readonly">
          {deleted ? <Alert type="info" title="Đánh giá đã xóa">
            Bạn đã xóa đánh giá này. Mỗi đơn hàng chỉ được đánh giá một lần, kể cả khi đánh giá đã xóa.
          </Alert> : <>
            <Alert type="info" title="Đánh giá đã hết hạn sửa">Đánh giá này chỉ được chỉnh sửa hoặc thêm ảnh trong 7 ngày sau khi gửi.</Alert>
            <ReviewCard review={review} />
          </>}
          <div className="tf-order-actions">
            <Link className="btn btn--outline" to="/customer/reviews">Quản lý đánh giá của tôi</Link>
            <Link className="btn btn--ghost" to={`/customer/orders/${order.orderId}`}>Về chi tiết đơn</Link>
          </div>
        </div>}
        {canEdit && <form className="form" onSubmit={submit}>
          {success && <Alert type="success">{success}</Alert>}
          <p>Hãy chia sẻ cảm nhận tổng quan về đồ ăn và trải nghiệm tại <strong>{order.restaurantName}</strong>.</p>
          <RatingFields {...{ rating, setRating, content, setContent }} />
          <label className="commerce-field">Thêm ảnh JPG/PNG · tối đa 1MB/ảnh, tối đa 5 ảnh
            <span className={`order-review-page__camera-upload${busy || imageCount >= MAX_REVIEW_IMAGES ? ' is-disabled' : ''}`} title="Chọn ảnh để tải lên">
              <input className="order-review-page__file-input" type="file" name="reviewImages" multiple accept="image/jpeg,image/png" aria-label="Chọn ảnh để tải lên" disabled={busy || imageCount >= MAX_REVIEW_IMAGES} onChange={selectImages} />
              <Icon name="camera" size={34} />
            </span>
          </label>
          {imageCount > 0 && <div className="commerce-images order-review-page__images">
            {review?.images?.map(image => <div key={image.imageId} className="order-review-page__image"><img src={image.url} alt={`Ảnh đánh giá ${image.displayOrder}`} /><button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={() => removeImage(image)}>Xóa ảnh</button></div>)}
            {queuedImages.map(image => <div key={image.id} className="order-review-page__image order-review-page__image--pending"><img src={image.previewUrl} alt={`Ảnh sẽ tải lên: ${image.file.name}`} /><button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={() => removeQueuedImage(image.id)}>Bỏ ảnh</button></div>)}
          </div>}
          <p className="muted">{review ? 'Bạn có thể chỉnh sửa đánh giá và ảnh trong 7 ngày sau khi gửi.' : 'Ảnh đã chọn sẽ được tải lên cùng lúc với đánh giá của bạn.'}</p>
          {submitError && <Alert type="error">{submitError}</Alert>}
          <button className="btn btn--primary" disabled={busy || Boolean(reviewLoadError)}>{busy ? 'Đang lưu…' : review ? 'Lưu chỉnh sửa' : 'Gửi đánh giá'}</button>
          <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => navigate('/customer/orders')}>Về đơn hàng</button>
        </form>}
        {submitError && !canEdit && <Alert type="error">{submitError}</Alert>}
        {reviewState && !review && !reviewState.canCreate && <>
          <Alert type="warning" title="Đơn chưa đủ điều kiện đánh giá">{reviewState.reason}</Alert>
          <Link className="btn btn--outline" to={`/customer/orders/${order.orderId}`}>Xem chi tiết đơn</Link>
        </>}
      </section>
    </div>
  </div>;
}
