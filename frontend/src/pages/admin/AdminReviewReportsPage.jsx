import { useState } from 'react';
import { RefreshCw, Star } from 'lucide-react';
import { reviewApi } from '../../api/customerApi.js';
import { getErrorMessage } from '../../api/baseApi.js';
import Alert from '../../components/Alert.jsx';
import Modal from '../../components/Modal.jsx';
import { Badge, DataState, Field, Head, Pager, Search, Table, Toast, formatDateTime, useAdminData } from './AdminShared.jsx';

const STATUS = {
  OPEN: { label: 'Mới tiếp nhận', tone: 'warning' },
  PROCESSING: { label: 'Đang xử lý', tone: 'warning' },
  RESOLVED: { label: 'Đã giải quyết', tone: 'success' },
  REJECTED: { label: 'Đã từ chối', tone: 'danger' },
};
const REASONS = {
  SPAM: 'Tin rác', ABUSE: 'Nội dung xúc phạm', PERSONAL_DATA: 'Thông tin cá nhân',
  IRRELEVANT: 'Không liên quan', OTHER: 'Lý do khác',
};
const VISIBILITY = { PUBLISHED: 'Công khai', HIDDEN: 'Đang ẩn', DELETED: 'Đã xóa' };

const reportClient = {
  get: (_path, { page }, signal) => reviewApi.reports(page, signal),
};

function ReportStatus({ status }) {
  const meta = STATUS[status];
  return <Badge tone={meta?.tone}>{meta?.label ?? status}</Badge>;
}

function ReportDialog({ report, close, refresh, notify }) {
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const closed = ['RESOLVED', 'REJECTED'].includes(report.status);
  const canModerate = !report.deletedAt;
  const canAct = canModerate || !closed;
  const hide = report.reviewStatus === 'PUBLISHED';
  const moderate = hide ? 'Ẩn đánh giá' : 'Khôi phục công khai';
  const valid = reason.trim().length >= 5;

  async function confirm() {
    setBusy(true);
    setError('');
    try {
      if (pending.action === 'moderate') {
        await reviewApi.moderate(report.reviewId, {
          status: hide ? 'HIDDEN' : 'PUBLISHED', reason: reason.trim(), version: report.reviewVersion,
        });
      } else {
        await reviewApi.resolve(report.reportId, { status: pending.action, note: reason.trim() });
      }
      close();
      notify('Đã cập nhật báo cáo đánh giá.');
      refresh();
    } catch (err) {
      setError(err.response?.status === 409
        ? 'Báo cáo đã thay đổi. Hãy đóng hộp thoại và làm mới danh sách trước khi thử lại.'
        : getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return <Modal title={'Báo cáo #' + report.reportId} onClose={busy ? undefined : close} footer={pending ? <>
    <button type="button" className="btn btn--outline" disabled={busy} onClick={() => { setPending(null); setError(''); }}>Quay lại</button>
    <button type="button" className="btn btn--primary" onClick={confirm} disabled={busy}>{busy ? 'Đang xử lý…' : 'Xác nhận'}</button>
  </> : <button type="button" className="btn btn--outline" onClick={close}>Đóng</button>}>
    <div className="review-report-detail">
      <div className="admin-section-head"><h3>{report.restaurantName}</h3><ReportStatus status={report.status} /></div>
      <dl className="admin-definition">
        <dt>Thời gian báo cáo</dt><dd>{formatDateTime(report.createdAt)}</dd>
        <dt>Đánh giá</dt><dd>{report.rating}/5 · {report.deletedAt ? 'Khách đã xóa' : VISIBILITY[report.reviewStatus] ?? report.reviewStatus}</dd>
        <dt>Nội dung</dt><dd className="commerce-text">{report.reviewContent || '—'}</dd>
        <dt>Lý do báo cáo</dt><dd><strong>{REASONS[report.reasonCode] ?? report.reasonCode}</strong><p className="commerce-text">{report.reason}</p></dd>
        {report.resolutionNote && <><dt>Kết quả xử lý</dt><dd className="commerce-text">{report.resolutionNote}</dd></>}
      </dl>
      {!!report.history?.length && <details><summary>Lịch sử kiểm duyệt</summary>
        <ol className="admin-timeline">{report.history.map((entry, index) => <li key={index}>
          <strong>{VISIBILITY[entry.fromStatus] ?? entry.fromStatus} → {VISIBILITY[entry.toStatus] ?? entry.toStatus}</strong>
          <small>{formatDateTime(entry.createdAt)}</small><p className="commerce-text">{entry.reason}</p>
        </li>)}</ol>
      </details>}
      {error && <Alert type="error">{error}</Alert>}
      {pending ? <section className="admin-notice"><strong>{pending.label}?</strong><p className="commerce-text">{reason.trim()}</p></section>
        : canAct && <section className="review-report-detail__actions">
          <Field label="Lý do xử lý (5–500 ký tự)"><textarea value={reason} minLength={5} maxLength={500} rows={3} onChange={event => setReason(event.target.value)} /></Field>
          <div className="admin-actions">
            {canModerate && <button type="button" className="btn btn--outline" disabled={!valid} onClick={() => setPending({ label: moderate, action: 'moderate' })}>{moderate}</button>}
            {!closed && <>
              <button type="button" className="btn btn--primary" disabled={!valid} onClick={() => setPending({ label: 'Đánh dấu đã xử lý', action: 'RESOLVED' })}>Đánh dấu đã xử lý</button>
              <button type="button" className="btn btn--outline" disabled={!valid} onClick={() => setPending({ label: 'Từ chối báo cáo', action: 'REJECTED' })}>Từ chối báo cáo</button>
            </>}
          </div>
        </section>}
    </div>
  </Modal>;
}

export default function AdminReviewReportsPage() {
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState('');
  const resource = useAdminData('/review-reports', { page }, reportClient);
  const term = query.toLocaleLowerCase('vi');
  const items = resource.data?.items.filter(report => (
    (!status || report.status === status) && [report.reportId, report.restaurantName, report.reviewContent]
      .some(value => String(value ?? '').toLocaleLowerCase('vi').includes(term))
  )) ?? [];

  return <div className="admin-page">
    <Head title="Báo cáo đánh giá" description="Kiểm tra nội dung bị báo cáo và ghi nhận quyết định kiểm duyệt.">
      <button type="button" className="btn btn--outline" disabled={resource.loading} onClick={resource.refresh}><RefreshCw size={16} /> Làm mới</button>
    </Head>
    <section className="admin-panel admin-filters">
      <Search value={query} onChange={setQuery} label="Tìm trong trang hiện tại" placeholder="Mã báo cáo, tên quán, nội dung" />
      <Field label="Trạng thái trên trang"><select value={status} onChange={event => setStatus(event.target.value)}>
        <option value="">Tất cả trạng thái</option>
        {Object.entries(STATUS).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
      </select></Field>
    </section>
    <DataState resource={resource} empty={items.length === 0}>
      <Table headers={['Báo cáo', 'Nhà hàng / Đánh giá', 'Lý do', 'Trạng thái', 'Chi tiết']} caption="Danh sách báo cáo đánh giá">
        {items.map(report => <tr key={report.reportId}>
          <td><strong>#{report.reportId}</strong><small>{formatDateTime(report.createdAt)}</small></td>
          <td><strong>{report.restaurantName}</strong><small className="review-report-rating"><Star size={13} aria-hidden="true" />{report.rating}/5</small></td>
          <td>{REASONS[report.reasonCode] ?? report.reasonCode}</td>
          <td><ReportStatus status={report.status} /></td>
          <td><button type="button" className="btn btn--outline btn--sm" onClick={() => setSelected(report)} aria-label={'Xem báo cáo #' + report.reportId}>Xem</button></td>
        </tr>)}
      </Table>
    </DataState>
    {resource.data && <Pager page={page} pageSize={10} total={resource.data.total} onChange={setPage} />}
    {selected && <ReportDialog report={selected} close={() => setSelected(null)} refresh={resource.refresh} notify={setNotice} />}
    {notice && <Toast message={notice} onClose={() => setNotice('')} />}
  </div>;
}
