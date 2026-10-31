import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { reviewApi } from '../api/customerApi.js';
import { getErrorMessage } from '../api/baseApi.js';
import { Pagination, RatingFields, ReportButton, ReviewCard, reviewTime } from '../components/CustomerReviews.jsx';
import Alert from '../components/Alert.jsx';

function ReviewActions({ review, partner, reload }) {
  const [rating, setRating] = useState(review.rating);
  const [content, setContent] = useState(review.content);
  const [reply, setReply] = useState(review.replies?.[0]?.content || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const action = async fn => { setBusy(true); setError(''); try { await fn(); reload(); } catch (e) { setError(getErrorMessage(e)); if (e.response?.status === 409) reload(); } finally { setBusy(false); } };
  const replyVersion = review.replyVersion ?? review.replies?.[0]?.version ?? 0;
  return <div className="commerce-compose">
    {partner ? <>
      <form className="form" onSubmit={e => { e.preventDefault(); action(() => reviewApi.reply(review.reviewId, { content: reply, version: replyVersion })); }}>
        <label className="commerce-field">Phản hồi của quán<textarea required maxLength={1000} value={reply} onChange={e => setReply(e.target.value)} /></label>
        <button className="btn btn--primary" disabled={busy}>Lưu phản hồi</button>
      </form>
      {review.replies?.length > 0 && <button className="btn btn--outline" disabled={busy} onClick={() => window.confirm('Xóa phản hồi của quán?') && action(() => reviewApi.deleteReply(review.reviewId, replyVersion))}>Xóa phản hồi</button>}
      <ReportButton reviewId={review.reviewId} partner />
    </> : <>
      {review.status === 'HIDDEN' && <Alert type="warning">Đánh giá đang bị ẩn bởi quản trị viên. Chỉnh sửa không tự công khai lại.</Alert>}
      {review.editable ? <>
        <form className="form" onSubmit={e => { e.preventDefault(); action(() => reviewApi.edit(review.reviewId, { rating, content, version: review.version })); }}>
          <RatingFields {...{ rating, setRating, content, setContent }} /><button className="btn btn--primary" disabled={busy}>Lưu chỉnh sửa</button>
        </form>
        <label className="commerce-field">Thêm ảnh JPG/PNG · tối đa 1MB/ảnh, 5 ảnh
          <input type="file" accept="image/jpeg,image/png" disabled={busy || review.images.length >= 5} onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (!file) return; if (file.size > 1024 * 1024) { setError('Ảnh tối đa 1MB'); return; } action(() => reviewApi.upload(review.reviewId, review.version, file)); }} />
        </label>
        {review.images.map(image => <button key={image.imageId} className="btn btn--ghost btn--sm" disabled={busy} onClick={() => window.confirm('Xóa ảnh này?') && action(() => reviewApi.deleteImage(review.reviewId, image.imageId, review.version))}>Xóa ảnh {image.displayOrder}</button>)}
      </> : <p>Đã hết hạn chỉnh sửa 7 ngày.</p>}
      <button className="btn btn--outline" disabled={busy} onClick={() => window.confirm('Xóa đánh giá này? Bạn sẽ không thể đánh giá lại cùng đơn.') && action(() => reviewApi.remove(review.reviewId, review.version))}>Xóa đánh giá</button>
    </>}
    {error && <Alert type="error">{error}</Alert>}
  </div>;
}
function ReportActions({ report, reload }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const action = async fn => { setBusy(true); setError(''); try { await fn(); reload(); } catch (e) { setError(getErrorMessage(e)); if (e.response?.status === 409) reload(); } finally { setBusy(false); } };
  const closed = ['RESOLVED', 'REJECTED'].includes(report.status);
  return <article className="commerce-review">
    <h3>{report.restaurantName} · {report.rating}★</h3><p className="commerce-text">{report.reviewContent}</p>
    <p>Báo cáo #{report.reportId} · {report.status} · {report.reasonCode}</p><p className="commerce-text">{report.reason}</p>
    <p>Đánh giá: {report.reviewStatus}{report.deletedAt ? ' · Khách đã xóa' : ''}</p>
    {report.resolutionNote && <p>Kết quả: {report.resolutionNote}</p>}
    <label className="commerce-field">Lý do xử lý<textarea minLength={5} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} /></label>
    {!report.deletedAt && <button className="btn btn--outline" disabled={busy || reason.trim().length < 5} onClick={() => action(() => reviewApi.moderate(report.reviewId, { status: report.reviewStatus === 'PUBLISHED' ? 'HIDDEN' : 'PUBLISHED', reason, version: report.reviewVersion }))}>{report.reviewStatus === 'PUBLISHED' ? 'Ẩn đánh giá' : 'Khôi phục công khai'}</button>}
    {!closed && <div className="commerce-filters">
      <button className="btn btn--primary" disabled={busy || reason.trim().length < 5} onClick={() => action(() => reviewApi.resolve(report.reportId, { status: 'RESOLVED', note: reason }))}>Đã xử lý báo cáo</button>
      <button className="btn btn--outline" disabled={busy || reason.trim().length < 5} onClick={() => action(() => reviewApi.resolve(report.reportId, { status: 'REJECTED', note: reason }))}>Từ chối báo cáo</button>
    </div>}
    <details><summary>Lịch sử kiểm duyệt</summary>{report.history.map((h, i) => <p key={i}>{reviewTime(h.createdAt)}: {h.fromStatus} → {h.toStatus} · {h.reason}</p>)}</details>
    {error && <Alert type="error">{error}</Alert>}
  </article>;
}
export default function ReviewManagementPage({ area = 'customer' }) {
  const [page, setPage] = useState(0);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const reload = () => setRevision(n => n + 1);
  useEffect(() => {
    let active = true; setLoading(true); setError('');
    const load = area === 'admin' ? reviewApi.reports : area === 'partner' ? reviewApi.partner : reviewApi.mine;
    load(page).then(result => { if (active) setData(result); }).catch(e => { if (active) setError(getErrorMessage(e)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [area, page, revision]);
  return <main className={area === 'customer' ? 'container commerce-page' : 'commerce-page'}>
    <div className="commerce-row"><h1>{area === 'admin' ? 'Báo cáo đánh giá' : area === 'partner' ? 'Đánh giá về quán' : 'Đánh giá của tôi'}</h1><button className="btn btn--outline" disabled={loading} onClick={reload}>Tải lại</button></div>
    {error && <Alert type="error">{error}</Alert>}
    {loading ? <p role="status">Đang tải…</p> : !error && <>
      {!data?.items.length && <p>Chưa có dữ liệu.</p>}
      {data?.items.map(row => area === 'admin' ? <ReportActions key={`${row.reportId}:${revision}`} report={row} reload={reload} /> : <div key={`${row.reviewId}:${row.version}:${revision}`}><h2><Link to={`/restaurants/${row.restaurantId}`}>{row.restaurantName}</Link></h2><ReviewCard review={row}><ReviewActions review={row} partner={area === 'partner'} reload={reload} /></ReviewCard></div>)}
      <Pagination page={page} total={data?.total || 0} setPage={setPage} />
    </>}
  </main>;
}
