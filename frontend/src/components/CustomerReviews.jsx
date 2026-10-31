import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { reviewApi } from '../api/customerApi.js';
import { getErrorMessage } from '../api/baseApi.js';
import Alert from './Alert.jsx';
import Modal from './Modal.jsx';

export function reviewTime(value) {
  // Giờ từ server là LocalDateTime theo giờ nghiệp vụ, không kèm múi giờ; gắn +07:00 để không đọc nhầm theo giờ máy người xem.
  const date = new Date(typeof value === 'string' && /T[\d:.]+$/.test(value) ? `${value}+07:00` : value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}

export function ReviewCard({ review, children }) {
  return <article className="commerce-review">
    <div className="commerce-row commerce-wrap"><strong>{review.authorName || 'Đánh giá của bạn'}</strong><span className="commerce-stars" aria-label={`${review.rating} trên 5 sao`}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span></div>
    <small>Đã mua hàng · {reviewTime(review.createdAt)}{review.editedAt ? ' · Đã chỉnh sửa' : ''}</small>
    <p className="commerce-text">{review.content}</p>
    <div className="commerce-images">{review.images?.map(i => <a key={i.imageId} href={i.url} target="_blank" rel="noreferrer"><img src={i.url} alt="Ảnh khách hàng đính kèm đánh giá" loading="lazy" /></a>)}</div>
    {review.replies?.map(reply => <blockquote key={reply.replyId}><strong>Phản hồi từ quán</strong><p className="commerce-text">{reply.content}</p></blockquote>)}
    {children}
  </article>;
}
export function Pagination({ page, total, setPage, disabled = false }) {
  return <nav className="commerce-pagination" aria-label="Phân trang">
    <button className="btn btn--outline btn--sm" disabled={disabled || page === 0} onClick={() => setPage(page - 1)}>Trang trước</button>
    <span>Trang {page + 1} · {total} kết quả</span>
    <button className="btn btn--outline btn--sm" disabled={disabled || (page + 1) * 10 >= total} onClick={() => setPage(page + 1)}>Trang sau</button>
  </nav>;
}
export function ReportButton({ reviewId, partner = false, onSuccess }) {
  const [open, setOpen] = useState(false);
  const [reasonCode, setCode] = useState('SPAM');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const submit = async e => {
    e.preventDefault(); setBusy(true); setError('');
    try { await reviewApi.report(reviewId, { reasonCode, reason }, partner); setOpen(false); setSent(true); onSuccess?.(); }
    catch (err) { setError(getErrorMessage(err)); }
    finally { setBusy(false); }
  };
  return <><button className="btn btn--ghost btn--sm" disabled={sent} onClick={() => setOpen(true)}>{sent ? 'Đã gửi báo cáo' : 'Báo cáo vi phạm'}</button>
    {open && <Modal title="Báo cáo đánh giá" onClose={() => !busy && setOpen(false)}><form className="form" onSubmit={submit}>
      <label className="commerce-field">Lý do<select value={reasonCode} onChange={e => setCode(e.target.value)}><option value="SPAM">Spam</option><option value="ABUSE">Xúc phạm</option><option value="PERSONAL_DATA">Lộ thông tin cá nhân</option><option value="IRRELEVANT">Không liên quan</option><option value="OTHER">Khác</option></select></label>
      <label className="commerce-field">Mô tả<textarea required minLength={5} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} /></label>
      {error && <Alert type="error">{error}</Alert>}<p>Báo cáo sẽ được admin xem xét, không tự động ẩn đánh giá.</p>
      <button className="btn btn--primary" disabled={busy}>Gửi báo cáo</button>
    </form></Modal>}
  </>;
}
export function RatingFields({ rating, setRating, content, setContent }) {
  return <>
    <label className="commerce-field">Số sao<select value={rating} onChange={e => setRating(Number(e.target.value))}>{[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} sao</option>)}</select></label>
    <label className="commerce-field">Trải nghiệm của bạn<textarea required minLength={10} maxLength={1000} rows={4} value={content} onChange={e => setContent(e.target.value)} placeholder="Chia sẻ về món ăn và trải nghiệm với quán…" /></label>
  </>;
}
export default function CustomerReviews({ restaurantId }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const [page, setPage] = useState(0);
  const [stars, setStars] = useState('');
  const [photos, setPhotos] = useState(false);
  const [sort, setSort] = useState('newest');
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [order, setOrder] = useState('');
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState('');
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    let active = true; setLoading(true); setError('');
    reviewApi.list(restaurantId, { page, stars: stars || undefined, photos, sort })
      .then(result => { if (active) setData(result); }).catch(err => { if (active) setError(getErrorMessage(err)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [restaurantId, page, stars, photos, sort, reload]);
  useEffect(() => {
    let active = true; setEligibility(null); setOrder('');
    if (user?.role === 'CUSTOMER') reviewApi.eligibility(restaurantId).then(result => { if (active) { setEligibility(result); setOrder(String(result.orders[0]?.orderId || '')); } }).catch(err => { if (active) setEligibility({ orders: [], reason: getErrorMessage(err, 'Không kiểm tra được quyền đánh giá.') }); });
    return () => { active = false; };
  }, [restaurantId, user?.id, user?.role, reload]);
  const submit = async e => {
    e.preventDefault(); setBusy(true); setFormError(''); setSuccess('');
    try {
      await reviewApi.create({ orderId: Number(order), rating, content });
      if (alive.current) { setContent(''); setPage(0); setReload(n => n + 1); setSuccess('Đã gửi đánh giá. Bạn có thể bổ sung ảnh và chỉnh sửa tại Đánh giá của tôi.'); }
    } catch (err) { if (alive.current) setFormError(getErrorMessage(err)); }
    finally { if (alive.current) setBusy(false); }
  };
  const summary = data?.summary;
  return <section className="container commerce-page" aria-label="Đánh giá nhà hàng">
    <h2>Đánh giá từ khách hàng</h2>
    {summary && <div className="commerce-summary"><strong>{Number(summary.reviewCount) ? `${Number(summary.averageRating).toFixed(1)} / 5` : 'Chưa có đánh giá'}</strong><span>{summary.reviewCount} lượt đánh giá đã mua hàng</span><div>{[5, 4, 3, 2, 1].map(n => <span key={n}>{n}★: {summary[`stars${n}`]}　</span>)}</div></div>}
    <div className="commerce-filters">
      <label>Số sao <select value={stars} onChange={e => { setStars(e.target.value); setPage(0); }}><option value="">Tất cả</option>{[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} sao</option>)}</select></label>
      <label>Sắp xếp <select value={sort} onChange={e => { setSort(e.target.value); setPage(0); }}><option value="newest">Mới nhất</option><option value="highest">Điểm cao</option><option value="lowest">Điểm thấp</option></select></label>
      <label><input type="checkbox" checked={photos} onChange={e => { setPhotos(e.target.checked); setPage(0); }} /> Có ảnh</label>
      <button className="btn btn--outline btn--sm" disabled={loading} onClick={() => setReload(n => n + 1)}>Tải lại</button>
    </div>
    {error && <Alert type="error">{error}</Alert>}
    {loading ? <p role="status">Đang tải đánh giá…</p> : !error && <>
      {!data?.items.length && <p>Chưa có đánh giá phù hợp.</p>}
      {data?.items.map(review => <ReviewCard key={review.reviewId} review={review}>{user?.role === 'CUSTOMER' && !review.own && <ReportButton reviewId={review.reviewId} />}</ReviewCard>)}
      <Pagination page={page} total={data?.total || 0} setPage={setPage} />
    </>}
    {user?.role === 'CUSTOMER' ? <div className="commerce-compose"><h3>Chia sẻ trải nghiệm sau khi mua</h3>
      <p>Mỗi đơn hoàn tất được đánh giá một lần trong 30 ngày. Bạn có 7 ngày để chỉnh sửa.</p>
      <Link to="/customer/reviews">Đánh giá của tôi · sửa, xóa và thêm ảnh</Link>
      {eligibility ? eligibility.orders.length ? <form className="form" onSubmit={submit}>
        <label className="commerce-field">Đơn đã hoàn tất<select required value={order} onChange={e => setOrder(e.target.value)}>{eligibility.orders.map(o => <option key={o.orderId} value={o.orderId}>{o.orderCode}</option>)}</select></label>
        <RatingFields {...{ rating, setRating, content, setContent }} />
        <button className="btn btn--primary" disabled={busy || !order}>Gửi đánh giá</button>
      </form> : <p>{eligibility.reason}</p> : <p>Đang kiểm tra điều kiện đánh giá…</p>}
      {formError && <Alert type="error">{formError}</Alert>}{success && <Alert type="success">{success}</Alert>}
    </div> : !user && <p><Link to="/login" state={{ from: `/restaurants/${restaurantId}` }}>Đăng nhập</Link> để xem quyền đánh giá sau khi mua hàng.</p>}
  </section>;
}
