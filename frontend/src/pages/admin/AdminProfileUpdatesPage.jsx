import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { restaurantProfileUpdateApi } from '../../api/restaurantProfileUpdateApi.js';
import { getErrorMessage } from '../../api/baseApi.js';
import Alert from '../../components/Alert.jsx';
import FullPageLoader from '../../components/FullPageLoader.jsx';
import RestaurantSummary from '../../components/RestaurantSummary.jsx';

const proposedRegistration = row => ({ ...row.current, ...row.proposed, id: row.restaurantId, restaurantName: row.restaurantName, address: [row.proposed?.basic?.streetAddress, row.proposed?.basic?.ward, row.proposed?.basic?.province].filter(Boolean).join(', ') });

export default function AdminProfileUpdatesPage() {
  const [items, setItems] = useState(null); const [error, setError] = useState('');
  const load = () => restaurantProfileUpdateApi.pending().then(setItems).catch(err => setError(getErrorMessage(err)));
  useEffect(() => { load(); }, []);
  if (!items && !error) return <FullPageLoader text="Đang tải đề nghị cập nhật..." />;
  return <div className="admin-page"><div className="page__head page__head--row"><div><h1>Đề nghị cập nhật hồ sơ</h1><p className="muted">So sánh bản đang công khai với nội dung đối tác đề nghị thay đổi.</p></div><button className="btn btn--outline" onClick={load}>Tải lại</button></div>{error && <Alert type="error">{error}</Alert>}{items?.length === 0 && <div className="empty-state"><strong>Không có đề nghị đang chờ duyệt</strong></div>}{items?.length > 0 && <div className="tf-admin-table-wrap"><table className="tf-admin-table"><thead><tr><th>Quán</th><th>Gửi lúc</th><th>Thao tác</th></tr></thead><tbody>{items.map(row => <tr key={row.requestId}><td><strong>{row.restaurantName}</strong><small>Phiên bản {row.version}</small></td><td>{row.submittedAt ? new Date(`${row.submittedAt}+07:00`).toLocaleString('vi-VN') : '—'}</td><td><Link className="btn btn--outline btn--sm" to={`/admin/restaurant-profile-updates/${row.requestId}`}>So sánh & duyệt</Link></td></tr>)}</tbody></table></div>}</div>;
}

export function AdminProfileUpdateDetailPage() {
  const { id } = useParams(); const navigate = useNavigate(); const [row, setRow] = useState(null); const [error, setError] = useState(''); const [reason, setReason] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { restaurantProfileUpdateApi.get(id).then(setRow).catch(err => setError(getErrorMessage(err))); }, [id]);
  const run = async action => { setBusy(true); setError(''); try { await action(); navigate('/admin/restaurant-profile-updates', { replace: true }); } catch (err) { setError(getErrorMessage(err)); setBusy(false); } };
  if (!row && !error) return <FullPageLoader text="Đang tải so sánh hồ sơ..." />;
  if (error && !row) return <div className="admin-page"><Alert type="error">{error}</Alert></div>;
  return <div className="admin-page"><div className="page__head"><Link className="back-link" to="/admin/restaurant-profile-updates">← Danh sách đề nghị</Link><h1>Duyệt cập nhật: {row.restaurantName}</h1><p className="muted">Chỉ khi duyệt, bản đề nghị mới được áp dụng vào hồ sơ công khai.</p></div>{error && <Alert type="error">{error}</Alert>}<div className="profile-compare"><section className="step-card"><h2>Hiện tại</h2><RestaurantSummary registration={row.current} options={{}} /></section><section className="step-card"><h2>Đề nghị cập nhật</h2><RestaurantSummary registration={proposedRegistration(row)} options={{}} /></section></div>{row.status === 'PENDING' && <section className="step-card"><h2>Quyết định</h2><label className="field"><span className="field__label">Lý do từ chối (nếu từ chối)</span><textarea name="reason" className="field__input field__textarea" value={reason} minLength="5" maxLength="500" onChange={e => setReason(e.target.value)} /></label><div className="step-card__footer"><button className="btn btn--danger" disabled={busy || reason.trim().length < 5} onClick={() => run(() => restaurantProfileUpdateApi.reject(row.requestId, reason.trim()))}>Từ chối</button><button className="btn btn--primary" disabled={busy} onClick={() => run(() => restaurantProfileUpdateApi.approve(row.requestId))}>Duyệt & áp dụng</button></div></section>}</div>;
}
