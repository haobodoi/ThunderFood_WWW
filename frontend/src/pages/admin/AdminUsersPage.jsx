import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { adminApi } from '../../api/adminApi.js';
import { getErrorMessage } from '../../api/baseApi.js';
import { ROLE_LABEL } from '../../utils/roleUtils.js';
import Modal from '../../components/Modal.jsx';
import Alert from '../../components/Alert.jsx';
import { Head, Field, Search, Pager, Table, DataState, OrderTable, useAdminData, formatDateTime } from './AdminShared.jsx';

export default function AdminUsersPage() {
  const [q, setQ] = useState(''), [page, setPage] = useState(0), [role, setRole] = useState(''), [status, setStatus] = useState('');
  const [creating, setCreating] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [success, setSuccess] = useState('');
  const resource = useAdminData('/users', { q, page, role, status });
  async function create(e) {
    e.preventDefault(); const body = Object.fromEntries(new FormData(e.currentTarget)); setBusy(true); setError('');
    try { await adminApi.save('post', '/users/staff', body); setCreating(false); setSuccess('Đã tạo tài khoản. Hãy bàn giao mật khẩu qua kênh riêng.'); resource.refresh(); }
    catch (err) { setError(getErrorMessage(err)); }
    finally { setBusy(false); }
  }
  return <div className="admin-page"><Head title="Người dùng & phân quyền" description="Quản lý khách hàng, đối tác và tài khoản vận hành."><button className="btn btn--primary" onClick={() => { setError(''); setCreating(true); }}>+ Tạo tài khoản nội bộ</button></Head>{success && <Alert type="success">{success}</Alert>}<section className="admin-panel admin-filters"><Search value={q} label="Tên / email / điện thoại" onChange={v => { setQ(v); setPage(0); }} /><Field label="Vai trò"><select value={role} onChange={e => { setRole(e.target.value); setPage(0); }}><option value="">Tất cả</option>{Object.entries(ROLE_LABEL).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></Field><Field label="Tình trạng"><select value={status} onChange={e => { setStatus(e.target.value); setPage(0); }}><option value="">Tất cả</option><option value="ACTIVE">Đang hoạt động</option><option value="LOCKED">Đã khóa</option></select></Field></section><DataState resource={resource} empty={resource.data?.items.length === 0}><Table headers={['Họ tên', 'Liên hệ', 'Vai trò', 'Tình trạng', 'Chi tiết']} caption="Người dùng">{resource.data?.items.map(u => <tr key={u.id}><td><strong>{u.fullName}</strong><small>{formatDateTime(u.createdAt)}</small></td><td>{u.email}<small>{u.phone}</small></td><td>{ROLE_LABEL[u.role]}</td><td>{u.status === 'ACTIVE' ? 'Đang hoạt động' : 'Đã khóa'}</td><td><Link className="btn btn--outline btn--sm" to={`/admin/users/${u.id}`}>Xem tài khoản</Link></td></tr>)}</Table></DataState>{resource.data && <Pager page={page} total={resource.data.total} onChange={setPage} />}
    {creating && <Modal title="Tạo tài khoản nội bộ" onClose={busy ? undefined : () => setCreating(false)}><form className="admin-form" onSubmit={create}>{error && <Alert type="error">{error}</Alert>}<Field label="Họ tên"><input name="fullName" autoComplete="name" required minLength={2} maxLength={120} /></Field><Field label="Email"><input name="email" type="email" autoComplete="off" required maxLength={190} /></Field><Field label="Số điện thoại (10 chữ số)"><input name="phone" type="tel" required pattern="0[0-9]{9}" maxLength={10} /></Field><Field label="Vai trò"><select name="role"><option value="STAFF">Nhân viên vận hành</option><option value="ADMIN">Quản trị viên</option></select></Field><Field label="Mật khẩu khởi tạo (12–72 ký tự, tối đa 72 byte)"><input name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={72} /></Field><p className="muted">Nhân viên xử lý đơn và thực đơn. Quản trị viên quản lý quyền và xác nhận đối soát ngân hàng. Mật khẩu được băm BCrypt.</p><button className="btn btn--primary" disabled={busy}>{busy ? 'Đang tạo…' : 'Tạo tài khoản'}</button></form></Modal>}
  </div>;
}
export function AdminUserDetailPage() {
  const { id } = useParams(), { user } = useAuth(), resource = useAdminData(`/users/${id}`), u = resource.data;
  const [page, setPage] = useState(0), orders = useAdminData('/orders', { customer: id, page }), [editing, setEditing] = useState(false), [error, setError] = useState(''), [success, setSuccess] = useState(''), [busy, setBusy] = useState(false);
  async function update(e) {
    e.preventDefault(); setBusy(true); setError(''); const body = Object.fromEntries(new FormData(e.currentTarget));
    try { await adminApi.save('patch', `/users/${id}/access`, body); setEditing(false); setSuccess('Đã lưu. Phiên của tài khoản sẽ bị thu hồi khi trạng thái hoặc quyền thay đổi.'); resource.refresh(); }
    catch (err) { setError(getErrorMessage(err)); }
    finally { setBusy(false); }
  }
  return <div className="admin-page"><Head title={u?.fullName || 'Chi tiết người dùng'} description="Thông tin tài khoản và lịch sử mua hàng."><Link className="btn btn--outline" to="/admin/users">← Người dùng</Link>{u && u.id !== user.id && <button className="btn btn--primary" onClick={() => { setError(''); setEditing(true); }}>Quản lý quyền / khóa</button>}</Head>{success && <Alert type="success">{success}</Alert>}<DataState resource={resource}>{u && <section className="admin-panel"><dl className="admin-definition"><dt>Email</dt><dd>{u.email}</dd><dt>Điện thoại</dt><dd>{u.phone}</dd><dt>Địa chỉ</dt><dd>{u.address || 'Chưa cập nhật'}</dd><dt>Vai trò</dt><dd>{ROLE_LABEL[u.role]}</dd><dt>Tình trạng</dt><dd>{u.status === 'ACTIVE' ? 'Đang hoạt động' : 'Đã khóa'}{u.lockReason && <p>{u.lockReason}</p>}</dd><dt>Đăng nhập gần nhất</dt><dd>{formatDateTime(u.lastLoginAt)}</dd><dt>Tổng số đơn đã đặt</dt><dd>{u.orderCount}</dd></dl></section>}</DataState><section className="admin-panel"><h2>Lịch sử đơn hàng</h2><DataState resource={orders} empty={orders.data?.items.length === 0}><OrderTable items={orders.data?.items} /></DataState>{orders.data && <Pager page={page} total={orders.data.total} onChange={setPage} />}</section>
    {editing && <Modal title="Cập nhật quyền truy cập" onClose={busy ? undefined : () => setEditing(false)}><form className="admin-form" onSubmit={update}>{error && <Alert type="error">{error}</Alert>}<Field label="Vai trò"><select name="role" defaultValue={u.role}>{(u.role === 'ADMIN' || u.role === 'STAFF' ? ['STAFF','ADMIN'] : [u.role]).map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select></Field><Field label="Tình trạng"><select name="status" defaultValue={u.status}><option value="ACTIVE">Đang hoạt động / Mở khóa</option><option value="LOCKED">Khóa tài khoản</option></select></Field><Field label="Lý do (bắt buộc để ghi nhật ký)"><textarea name="reason" required minLength={5} maxLength={500} rows={3} /></Field><p className="muted">Xác nhận thay đổi quyền hoặc tình trạng tài khoản {u.email}.</p><button className="btn btn--primary" disabled={busy}>{busy ? 'Đang lưu…' : 'Xác nhận thay đổi'}</button></form></Modal>}
  </div>;
}
