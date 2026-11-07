import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api/adminApi.js';
import { getErrorMessage } from '../../api/baseApi.js';
import Alert from '../../components/Alert.jsx';
import { OrderStatus, PaymentStatus } from '../../components/OrderParts.jsx';
import { formatVND } from '../../components/FoodCard.jsx';
import { formatDateTime } from '../../utils/restaurantUtils.js';

export { formatVND, formatDateTime };
export function useAdminData(path, params = {}, client = adminApi) {
  const key = JSON.stringify(params);
  const [data, setData] = useState(null), [error, setError] = useState(''), [loading, setLoading] = useState(true), [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setData(null);
    client.get(path, JSON.parse(key), controller.signal).then(result => {
      if (!controller.signal.aborted) setData(result);
    }).catch(err => {
      if (!controller.signal.aborted) setError(getErrorMessage(err));
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [path, key, revision, client]);
  return { data, error, loading, refresh: () => setRevision(v => v + 1) };
}
export function Field({ label, children }) { return <label className="admin-field"><span>{label}</span>{children}</label>; }
export function Head({ title, description, children }) {
  return <div className="admin-head"><div><p className="admin-eyebrow">THUNDERFOOD / ĐIỀU HÀNH</p><h1>{title}</h1><p className="muted">{description}</p></div><div className="admin-actions">{children}</div></div>;
}
export function DataState({ resource, children, empty = false }) {
  if (resource.loading) return <div className="admin-state" role="status">Đang tải dữ liệu…</div>;
  if (resource.error) return <div className="admin-state"><Alert type="error">{resource.error}</Alert><button className="btn btn--outline" onClick={resource.refresh}>Thử lại</button></div>;
  if (empty) return <div className="admin-state">Không có dữ liệu phù hợp. Hãy thử thay đổi bộ lọc.</div>;
  return children;
}
export function Pager({ page, total = 0, onChange }) {
  const pages = Math.max(1, Math.ceil(total / 20));
  return <nav className="admin-pager" aria-label="Phân trang"><span>{total.toLocaleString('vi-VN')} kết quả · Trang {page + 1}/{pages}</span><div className="admin-actions"><button type="button" className="btn btn--outline btn--sm" disabled={page === 0} onClick={() => onChange(page - 1)}>Trước</button><button type="button" className="btn btn--outline btn--sm" disabled={page + 1 >= pages} onClick={() => onChange(page + 1)}>Sau</button></div></nav>;
}
export function Table({ headers, children, caption }) {
  return <div className="tf-admin-table-wrap"><table className="tf-admin-table"><caption className="tf-visually-hidden">{caption}</caption><thead><tr>{headers.map(h => <th scope="col" key={h}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}
export function OrderTable({ items = [], area = 'admin' }) {
  return <Table headers={['Mã đơn / Thời gian', 'Khách hàng / Quán', 'Trạng thái', 'Thanh toán', 'Tổng tiền']} caption="Đơn hàng"><>{items.map(o => <tr key={o.orderId}><td>{area === 'partner' ? <strong>{o.orderCode}</strong> : <Link className="admin-link" to={`/admin/orders/${o.orderId}`}>{o.orderCode}</Link>}<small>{formatDateTime(o.createdAt)}</small></td><td>{o.recipientName}<small>{o.restaurantName}</small></td><td><OrderStatus status={o.orderStatus} /></td><td><PaymentStatus status={o.paymentStatus} /><small>{o.paymentMethod === 'COD' ? 'COD' : 'VietQR'}</small></td><td data-numeric>{formatVND(o.totalAmount)}</td></tr>)}</></Table>;
}
export function Search({ value, onChange, placeholder = 'Nhập để tìm kiếm', label = 'Tìm kiếm' }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return <form className="admin-search" onSubmit={e => { e.preventDefault(); onChange(draft.trim()); }}><Field label={label}><input type="search" maxLength={150} value={draft} onChange={e => setDraft(e.target.value)} placeholder={placeholder} /></Field><button className="btn btn--outline" type="submit">Tìm</button></form>;
}
export function RestaurantPicker({ value, onChange, client = adminApi, path = '/catalog/restaurants' }) {
  const [q, setQ] = useState(''), [page, setPage] = useState(0);
  const resource = useAdminData(path, { q, page }, client);
  return <section className="admin-panel"><div className="admin-filters"><Search value={q} label="Tìm quán" onChange={v => { setQ(v); setPage(0); }} /><Field label="Quán đang quản lý"><select value={value?.id || ''} onChange={e => onChange(resource.data?.items.find(r => String(r.id) === e.target.value) || null)}><option value="">Chọn quán…</option>{value && !resource.data?.items.some(r => r.id === value.id) && <option value={value.id}>{value.name}</option>}{resource.data?.items.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></Field></div><DataState resource={resource} empty={resource.data?.items.length === 0}><Pager page={page} total={resource.data?.total} onChange={setPage} /></DataState></section>;
}
