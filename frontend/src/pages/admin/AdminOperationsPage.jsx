import { useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { adminApi } from '../../api/adminApi.js';
import { getErrorMessage } from '../../api/baseApi.js';
import Modal from '../../components/Modal.jsx';
import Alert from '../../components/Alert.jsx';
import { Head, Field, Search, Pager, Table, DataState, Toast, Badge, RowActions, useAdminData, formatDateTime, formatVND } from './AdminShared.jsx';

const STORE_STATUS = {
  APPROVED: ['Đã duyệt', 'success'],
  PENDING: ['Chờ duyệt', 'warning'],
  REJECTED: ['Đã từ chối', 'danger'],
  LOCKED: ['Đã khóa', 'danger'],
};
const COMPLAINT_STATUS = {
  OPEN: ['Mới tiếp nhận', 'warning'],
  PROCESSING: ['Đang xử lý', 'warning'],
  RESOLVED: ['Đã giải quyết', 'success'],
  REJECTED: ['Đã từ chối', 'danger'],
};
const OUTCOMES = ['PROCESSING', 'RESOLVED', 'REJECTED'];

function Refresh({ resource }) {
  return <button type="button" className="btn btn--outline" disabled={resource.loading} onClick={resource.refresh}><RefreshCw size={16} /> Làm mới</button>;
}

export function AdminActivityPage() {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(null);
  const resource = useAdminData('/activity', { q: query, page });

  return <div className="admin-page">
    <Head title="Nhật ký hoạt động" description="Tra cứu các thay đổi theo thời gian, người thực hiện và đối tượng."><Refresh resource={resource} /></Head>
    <section className="admin-panel admin-filters">
      <Search value={query} label="Người thực hiện / hành động / đối tượng" onChange={value => { setQuery(value); setPage(0); }} />
    </section>
    <DataState resource={resource} empty={resource.data?.items.length === 0}>
      <Table headers={['Thời gian', 'Người thực hiện', 'Hành động', 'Đối tượng', 'Chi tiết']} caption="Nhật ký hoạt động">
        {resource.data?.items.map(entry => <tr key={entry.id}>
          <td>{formatDateTime(entry.createdAt)}</td><td>{entry.actor || 'Tài khoản không còn tồn tại'}</td>
          <td><Badge>{entry.action}</Badge></td><td>{entry.target}</td>
          <td><button type="button" className="btn btn--outline btn--sm" onClick={() => setSelected(entry)} aria-label={'Xem nhật ký #' + entry.id}>Xem</button></td>
        </tr>)}
      </Table>
    </DataState>
    {resource.data && <Pager page={page} total={resource.data.total} onChange={setPage} />}
    {selected && <Modal title={'Nhật ký #' + selected.id} onClose={() => setSelected(null)}>
      <dl className="admin-definition">
        <dt>Thời gian</dt><dd>{formatDateTime(selected.createdAt)}</dd>
        <dt>Người thực hiện</dt><dd>{selected.actor || 'Tài khoản không còn tồn tại'}</dd>
        <dt>Hành động</dt><dd>{selected.action}</dd>
        <dt>Đối tượng</dt><dd>{selected.target}</dd>
        <dt>Nội dung</dt><dd className="commerce-text">{selected.detail || '—'}</dd>
      </dl>
    </Modal>}
  </div>;
}

export function AdminStoresPage() {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const resource = useAdminData('/catalog/restaurants', { q: query, page });

  async function save(event) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      await adminApi.save('put', '/stores/' + editing.id, {
        deliveryFee: Number(values.get('deliveryFee')),
        open: values.get('open') === 'true',
      });
      setEditing(null);
      setSuccess('Đã lưu cấu hình quán. Phí mới áp dụng cho đơn đặt tiếp theo.');
      resource.refresh();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return <div className="admin-page">
    <Head title="Quản lý nhà hàng" description="Tra cứu nhà hàng, cấu hình phí giao và quyền nhận đơn."><Refresh resource={resource} /></Head>
    <section className="admin-panel admin-filters"><Search value={query} label="Tên quán" onChange={value => { setQuery(value); setPage(0); }} /></section>
    <DataState resource={resource} empty={resource.data?.items.length === 0}>
      <Table headers={['Nhà hàng', 'Hồ sơ', 'Nhận đơn thủ công', 'Phí giao', 'Thao tác']} caption="Danh sách nhà hàng">
        {resource.data?.items.map(restaurant => {
          const [label, tone] = STORE_STATUS[restaurant.status] ?? [restaurant.status, 'neutral'];
          return <tr key={restaurant.id}>
            <td><Link className="admin-link" to={'/admin/restaurants/' + restaurant.id}>{restaurant.name}</Link></td>
            <td><Badge tone={tone}>{label}</Badge></td>
            <td><Badge tone={restaurant.open ? 'success' : 'neutral'}>{restaurant.open ? 'Đã bật' : 'Đã tắt'}</Badge></td>
            <td data-numeric>{formatVND(restaurant.deliveryFee)}</td>
            <td><RowActions label={'Thao tác với ' + restaurant.name}>
              <button type="button" onClick={() => { setError(''); setEditing(restaurant); }}>Cấu hình nhận đơn</button>
              <Link to={'/admin/restaurants/' + restaurant.id}>Xem hồ sơ</Link>
              <Link to="/admin/catalog" state={{ restaurant: { id: restaurant.id, name: restaurant.name } }}>Mở thực đơn</Link>
            </RowActions></td>
          </tr>;
        })}
      </Table>
    </DataState>
    {resource.data && <Pager page={page} total={resource.data.total} onChange={setPage} />}
    {success && <Toast message={success} onClose={() => setSuccess('')} />}
    {editing && <Modal title={'Cấu hình ' + editing.name} onClose={busy ? undefined : () => setEditing(null)}>
      <form className="admin-form" onSubmit={save}>
        {error && <Alert type="error">{error}</Alert>}
        <Field label="Phí giao cố định (VND)"><input type="number" name="deliveryFee" required min="0" max="9999999999.99" step="0.01" defaultValue={editing.deliveryFee} disabled={busy} /></Field>
        <Field label="Nhận đơn thủ công"><select name="open" defaultValue={editing.open ? 'true' : 'false'} disabled={busy}>
          <option value="true">Bật · Theo giờ mở cửa</option><option value="false">Tắt nhận đơn</option>
        </select></Field>
        <p className="muted">Quán đã duyệt có thể bật nhận đơn. Các đơn tiếp theo sẽ dùng cấu hình mới.</p>
        <button className="btn btn--primary" disabled={busy}>{busy ? 'Đang lưu…' : 'Xác nhận lưu cấu hình'}</button>
      </form>
    </Modal>}
  </div>;
}

export function AdminComplaintsPage() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const resource = useAdminData('/complaints', { status, page });
  const actionable = ['OPEN', 'PROCESSING'].includes(selected?.status);

  async function save(event) {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true);
    setError('');
    try {
      await adminApi.save('patch', '/complaints/' + selected.id, body);
      setSelected(null);
      setSuccess('Đã lưu kết quả xử lý.');
      resource.refresh();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return <div className="admin-page">
    <Head title="Khiếu nại" description="Theo dõi phản hồi của khách và cập nhật kết quả xử lý."><Refresh resource={resource} /></Head>
    <section className="admin-panel">
      <div className="tabs" role="group" aria-label="Lọc khiếu nại theo trạng thái">
        {[['', ['Tất cả']], ...Object.entries(COMPLAINT_STATUS)].map(([key, [label]]) => <button key={key} type="button"
          className={'tabs__item' + (status === key ? ' is-active' : '')} aria-pressed={status === key} onClick={() => { setStatus(key); setPage(0); }}>{label}</button>)}
      </div>
    </section>
    <DataState resource={resource} empty={resource.data?.items.length === 0}>
      <Table headers={['Khiếu nại', 'Khách hàng', 'Trạng thái', 'Chi tiết']} caption="Danh sách khiếu nại">
        {resource.data?.items.map(complaint => {
          const [label, tone] = COMPLAINT_STATUS[complaint.status] ?? [complaint.status, 'neutral'];
          return <tr key={complaint.id}>
            <td><strong>{complaint.title}</strong><small>{formatDateTime(complaint.createdAt)}</small></td>
            <td>{complaint.customer}{complaint.orderId && <small><Link className="admin-link" to={'/admin/orders/' + complaint.orderId}>Đơn #{complaint.orderId}</Link></small>}</td>
            <td><Badge tone={tone}>{label}</Badge></td>
            <td><button type="button" className="btn btn--outline btn--sm" onClick={() => { setError(''); setSelected(complaint); }}>Xem</button></td>
          </tr>;
        })}
      </Table>
    </DataState>
    {resource.data && <Pager page={page} total={resource.data.total} onChange={setPage} />}
    {success && <Toast message={success} onClose={() => setSuccess('')} />}
    {selected && <Modal title={selected.title} onClose={busy ? undefined : () => setSelected(null)}>
      <dl className="admin-definition">
        <dt>Khách hàng</dt><dd>{selected.customer}</dd>
        <dt>Nội dung</dt><dd className="commerce-text">{selected.content}</dd>
        {selected.response && <><dt>Phản hồi</dt><dd className="commerce-text">{selected.response}</dd></>}
      </dl>
      {actionable && <form className="admin-form" onSubmit={save}>
        {error && <Alert type="error">{error}</Alert>}
        <Field label="Kết quả"><select name="status" defaultValue="PROCESSING" disabled={busy}>
          {OUTCOMES.map(value => <option key={value} value={value}>{COMPLAINT_STATUS[value][0]}</option>)}
        </select></Field>
        <Field label="Nội dung phản hồi"><textarea name="response" required minLength={5} maxLength={2000} rows={5} defaultValue={selected.response || ''} disabled={busy} /></Field>
        <p className="muted">Chọn Đã giải quyết hoặc Đã từ chối để kết thúc xử lý.</p>
        <button className="btn btn--primary" disabled={busy}>{busy ? 'Đang lưu…' : 'Xác nhận kết quả'}</button>
      </form>}
    </Modal>}
  </div>;
}
