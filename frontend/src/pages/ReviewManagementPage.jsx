import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { reviewApi } from '../api/customerApi.js';
import { getErrorMessage } from '../api/baseApi.js';
import { Pagination, RatingFields, ReportButton, ReviewCard } from '../components/CustomerReviews.jsx';
import Alert from '../components/Alert.jsx';

function ReviewActions({ review, partner, reload }) {
  const [rating, setRating] = useState(review.rating);
  const [content, setContent] = useState(review.content);
  const [reply, setReply] = useState(review.replies?.[0]?.content || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const action = async fn => { setBusy(true); setError(''); try { await fn(); reload(); } catch (e) { setError(getErrorMessage(e)); if (e.response?.status === 409) reload(); } finally { setBusy(false); } };
  const replyVersion = review.replyVersion ?? review.replies?.[0]?.version ?? 0;
  return <div className={`commerce-compose managed-review__actions${partner ? ' managed-review__actions--partner' : ''}`}>
    {partner ? <>
      <form className="form" onSubmit={e => {
        e.preventDefault();
        action(() => reviewApi.reply(review.reviewId, { content: reply, version: replyVersion }));
      }}>
        <label className="commerce-field">{review.replies?.length ? 'Cập nhật phản hồi của quán' : 'Phản hồi của quán'}<textarea required maxLength={1000} value={reply} onChange={e => setReply(e.target.value)} placeholder="Cảm ơn khách hàng và nêu rõ cách quán sẽ hỗ trợ." /></label>
        <button className="btn btn--primary" disabled={busy}>{busy ? 'Đang lưu…' : review.replies?.length ? 'Cập nhật phản hồi' : 'Gửi phản hồi'}</button>
      </form>
      {review.replies?.length > 0 && <button
        className="btn btn--outline"
        disabled={busy}
        onClick={() => window.confirm('Xóa phản hồi của quán?')
          && action(() => reviewApi.deleteReply(review.reviewId, replyVersion))}
      >
        Xóa phản hồi
      </button>}
      <div className="managed-review__tools"><ReportButton reviewId={review.reviewId} partner /></div>
    </> : <>
      {review.status === 'HIDDEN' && <Alert type="warning">Đánh giá đang bị ẩn bởi quản trị viên. Chỉnh sửa không tự công khai lại.</Alert>}
      {review.editable ? <>
        <form className="form" onSubmit={e => {
          e.preventDefault();
          action(() => reviewApi.edit(review.reviewId, { rating, content, version: review.version }));
        }}>
          <RatingFields {...{ rating, setRating, content, setContent }} /><button className="btn btn--primary" disabled={busy}>Lưu chỉnh sửa</button>
        </form>
        <label className="commerce-field">Thêm ảnh JPG/PNG · tối đa 1MB/ảnh, 5 ảnh
          <input
            type="file"
            accept="image/jpeg,image/png"
            disabled={busy || review.images.length >= 5}
            onChange={e => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              if (file.size > 1024 * 1024) {
                setError('Ảnh tối đa 1MB');
                return;
              }
              action(() => reviewApi.upload(review.reviewId, review.version, file));
            }}
          />
        </label>
        {review.images.map(image => <button
          key={image.imageId}
          className="btn btn--ghost btn--sm"
          disabled={busy}
          onClick={() => window.confirm('Xóa ảnh này?')
            && action(() => reviewApi.deleteImage(review.reviewId, image.imageId, review.version))}
        >
          Xóa ảnh {image.displayOrder}
        </button>)}
      </> : <p>Đã hết hạn chỉnh sửa 7 ngày.</p>}
      <button
        className="btn btn--outline"
        disabled={busy}
        onClick={() => window.confirm('Xóa đánh giá này? Bạn sẽ không thể đánh giá lại cùng đơn.')
          && action(() => reviewApi.remove(review.reviewId, review.version))}
      >
        Xóa đánh giá
      </button>
    </>}
    {error && <Alert type="error">{error}</Alert>}
  </div>;
}
export default function ReviewManagementPage({ area = 'customer' }) {
  const location = useLocation();
  const [page, setPage] = useState(0);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [replyStatus, setReplyStatus] = useState('ALL');
  const reload = () => setRevision(n => n + 1);
  useEffect(() => {
    let active = true; setLoading(true); setError('');
    const load = area === 'partner' ? reviewApi.partner : reviewApi.mine;
    load(page, area === 'partner' ? replyStatus : undefined).then(result => { if (active) setData(result); }).catch(e => { if (active) setError(getErrorMessage(e)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [area, page, replyStatus, revision]);
  return <div className={area === 'customer' ? 'container commerce-page' : 'commerce-page'}>
    <div className="commerce-row"><h1>{area === 'partner' ? 'Đánh giá về quán' : 'Đánh giá của tôi'}</h1><button className="btn btn--outline" disabled={loading} onClick={reload}>Tải lại</button></div>
    {area === 'partner' && <div className="tf-tab-list" role="tablist" aria-label="Lọc phản hồi"><button type="button" role="tab" aria-selected={replyStatus === 'ALL'} className={replyStatus === 'ALL' ? 'is-active' : ''} onClick={() => { setReplyStatus('ALL'); setPage(0); }}>Tất cả</button><button type="button" role="tab" aria-selected={replyStatus === 'UNREPLIED'} className={replyStatus === 'UNREPLIED' ? 'is-active' : ''} onClick={() => { setReplyStatus('UNREPLIED'); setPage(0); }}>Chưa phản hồi</button><button type="button" role="tab" aria-selected={replyStatus === 'REPLIED'} className={replyStatus === 'REPLIED' ? 'is-active' : ''} onClick={() => { setReplyStatus('REPLIED'); setPage(0); }}>Đã phản hồi</button></div>}
    {area === 'customer' && location.state?.notice && <Alert type="success">{location.state.notice}</Alert>}
    {error && <Alert type="error">{error}</Alert>}
    {loading ? <p role="status">Đang tải…</p> : !error && <>
      {!data?.items.length && <p>Chưa có dữ liệu.</p>}
      {data?.items.map(row => <section className={`managed-review${area === 'partner' ? ' managed-review--partner' : ''}`} key={`${row.reviewId}:${row.version}:${revision}`}>
          <div className="managed-review__heading">
            <div><span>{area === 'partner' ? 'Đánh giá dành cho quán' : 'Đánh giá của bạn tại'}</span><h2><Link to={`/restaurants/${row.restaurantId}`}>{row.restaurantName}</Link></h2></div>
            {area === 'partner' && <span className="managed-review__status">{row.replies?.length ? 'Đã phản hồi' : 'Chưa phản hồi'}</span>}
          </div>
          <ReviewCard review={row} className={area === 'partner' ? 'commerce-review--partner' : ''}>
            <ReviewActions review={row} partner={area === 'partner'} reload={reload} />
          </ReviewCard>
        </section>)}
      <Pagination page={page} total={data?.total || 0} setPage={setPage} />
    </>}
  </div>;
}
