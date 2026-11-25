import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MoreHorizontal, Inbox, X, CheckCircle2, Info } from 'lucide-react';
import { adminApi } from '../../api/adminApi.js';
import { getErrorMessage } from '../../api/baseApi.js';
import Alert from '../../components/Alert.jsx';
import { OrderStatus, PaymentStatus } from '../../components/OrderParts.jsx';
import { formatVND } from '../../components/FoodCard.jsx';
import { formatDateTime } from '../../utils/restaurantUtils.js';

export { formatVND, formatDateTime };
export function useAdminData(path, params = {}, client = adminApi) {
  const key = JSON.stringify(params);
  const identity = `${path}:${key}`;
  const [result, setResult] = useState({ identity: null, data: null, error: '', loading: true });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setResult({ identity, data: null, error: '', loading: true });
    client.get(path, JSON.parse(key), controller.signal).then(data => {
      if (!controller.signal.aborted) setResult({ identity, data, error: '', loading: false });
    }).catch(err => {
      if (!controller.signal.aborted) setResult({ identity, data: null, error: getErrorMessage(err), loading: false });
    });
    return () => controller.abort();
  }, [path, key, identity, revision, client]);
  const visible = result.identity === identity ? result : { data: null, error: '', loading: true };
  return { ...visible, refresh: () => setRevision(v => v + 1) };
}
export function Field({ label, children }) { return <label className="admin-field"><span>{label}</span>{children}</label>; }
export function Head({ title, description, children }) {
  return <header className="admin-head">
    <div><h1>{title}</h1>{description && <p className="muted">{description}</p>}</div>
    {children && <div className="admin-actions">{children}</div>}
  </header>;
}
export function DataState({ resource, children, empty = false }) {
  if (resource.loading) return <div className="admin-state admin-skeleton" role="status"><span className="tf-visually-hidden">Đang tải dữ liệu…</span><span /><span /><span /><span /></div>;
  if (resource.error) return <div className="admin-state"><Alert type="error">{resource.error}</Alert><button className="btn btn--outline" onClick={resource.refresh}>Thử lại</button></div>;
  if (empty) return <div className="admin-state admin-empty"><Inbox size={27} aria-hidden="true" /><strong>Không có kết quả phù hợp</strong><span>Hãy thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.</span></div>;
  return children;
}
export function Badge({ tone = 'neutral', children }) {
  return <span className={`enterprise-badge enterprise-badge--${tone}`}>{children}</span>;
}
export function Toast({ message, onClose }) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const timeout = window.setTimeout(() => closeRef.current(), 6000);
    return () => window.clearTimeout(timeout);
  }, [message]);
  return <div className="enterprise-toast" role="status"><CheckCircle2 size={19} /><span>{message}</span><button type="button" onClick={onClose} aria-label="Đóng thông báo"><X size={16} /></button></div>;
}
function useAnchoredPopover() {
  const id = useId();
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const trigger = triggerRef.current;
    const menu = menuRef.current;
    function closeOnMove(event) {
      if (menu.matches(':popover-open') && !(event.target instanceof Node && menu.contains(event.target))) {
        menu.hidePopover();
      }
    }

    function placeMenu(event) {
      if (event.newState === 'closed') {
        menu.removeAttribute('data-positioned');
        window.removeEventListener('scroll', closeOnMove, true);
        window.removeEventListener('resize', closeOnMove);
        return;
      }

      const margin = 8;
      const gap = 6;
      const viewport = document.documentElement;
      const anchor = trigger.getBoundingClientRect();
      const below = viewport.clientHeight - anchor.bottom - gap - margin;
      const above = anchor.top - gap - margin;
      const openAbove = menu.scrollHeight > below && above > below;
      menu.style.maxHeight = Math.max(0, openAbove ? above : below) + 'px';

      const { width, height } = menu.getBoundingClientRect();
      const left = Math.max(margin, Math.min(anchor.right - width, viewport.clientWidth - width - margin));
      const top = openAbove ? anchor.top - height - gap : anchor.bottom + gap;
      menu.style.left = left + 'px';
      menu.style.top = top + 'px';
      menu.setAttribute('data-positioned', '');
      window.addEventListener('scroll', closeOnMove, true);
      window.addEventListener('resize', closeOnMove);
    }

    menu.addEventListener('toggle', placeMenu);
    return () => {
      menu.removeEventListener('toggle', placeMenu);
      window.removeEventListener('scroll', closeOnMove, true);
      window.removeEventListener('resize', closeOnMove);
    };
  }, []);

  return { id, triggerRef, menuRef };
}

export function MetricHelp({ label, description }) {
  const { id, triggerRef, menuRef } = useAnchoredPopover();
  return <span className="enterprise-help">
    <button type="button" ref={triggerRef} popovertarget={id} aria-label={'Giải thích ' + label}>
      <Info size={17} aria-hidden="true" />
    </button>
    <p id={id} ref={menuRef} popover="auto" className="enterprise-help__content">{description}</p>
  </span>;
}

export function RowActions({ label, children }) {
  const { id, triggerRef, menuRef } = useAnchoredPopover();

  function dismissAfterAction(event) {
    if (!event.target.closest('a[href], button:not(:disabled)')) return;
    menuRef.current?.hidePopover();
    triggerRef.current?.focus({ preventScroll: true });
  }

  return <div className="enterprise-row-actions">
    <button type="button" className="enterprise-row-actions__trigger" ref={triggerRef} aria-label={label} popovertarget={id}>
      <MoreHorizontal size={21} aria-hidden="true" />
    </button>
    <div id={id} popover="auto" className="enterprise-row-actions__menu" ref={menuRef} onClick={dismissAfterAction}>
      {children}
    </div>
  </div>;
}
export function Pager({ page, total = 0, pageSize = 20, onChange }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  useEffect(() => {
    if (page >= pages) onChange(pages - 1);
  }, [page, pages, onChange]);
  return <nav className="admin-pager" aria-label="Phân trang"><span>{total.toLocaleString('vi-VN')} kết quả · Trang {page + 1}/{pages}</span><div className="admin-actions"><button type="button" className="btn btn--outline btn--sm" disabled={page === 0} onClick={() => onChange(page - 1)}>Trước</button><button type="button" className="btn btn--outline btn--sm" disabled={page + 1 >= pages} onClick={() => onChange(page + 1)}>Sau</button></div></nav>;
}
/**
 * Bảng quản trị. `numeric` liệt kê tên các cột số liệu (tiền, số lượng): cả tiêu đề và ô
 * của cột đó được căn phải để số và nhãn cột thẳng hàng với nhau.
 */
export function Table({ headers, children, caption, numeric = [] }) {
  return <div className="tf-admin-table-wrap" role="region" aria-label={caption} tabIndex={0}><table className="tf-admin-table"><caption className="tf-visually-hidden">{caption}</caption><thead><tr>{headers.map(h => <th scope="col" key={h} data-numeric={numeric.includes(h) || undefined}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}

/** Thời gian chờ của đơn chưa được quán xác nhận; tính theo giờ Việt Nam như dữ liệu backend trả về. */
function parseVietnamTime(value) {
  if (!value) return NaN;
  const text = String(value);
  return Date.parse(/[zZ]|[+-]\d{2}:?\d{2}$/.test(text) ? text : text.slice(0, 19) + '+07:00');
}
export function WaitingTime({ createdAt }) {
  const minutes = Math.floor((Date.now() - parseVietnamTime(createdAt)) / 60000);
  if (!Number.isFinite(minutes) || minutes < 0) return null;
  const label = minutes < 1 ? 'Vừa đặt' : minutes < 60 ? `Chờ ${minutes} phút` : minutes < 1440 ? `Chờ ${Math.floor(minutes / 60)} giờ ${minutes % 60} phút` : `Chờ ${Math.floor(minutes / 1440)} ngày`;
  const level = minutes >= 15 ? 'late' : minutes >= 5 ? 'soon' : 'ok';
  return <span className={`admin-wait admin-wait--${level}`} title="Thời gian từ lúc khách đặt, đơn chưa được xác nhận">{label}</span>;
}

export function OrderTable({ items = [], area = 'admin' }) {
  return <Table headers={['Mã đơn / Thời gian', 'Khách hàng / Quán', 'Trạng thái', 'Thanh toán', 'Tổng tiền']} numeric={['Tổng tiền']} caption="Đơn hàng"><>{items.map(o => <tr key={o.orderId}><td>{area === 'partner' ? <strong>{o.orderCode}</strong> : <Link className="admin-link" to={`/admin/orders/${o.orderId}`}>{o.orderCode}</Link>}<small>{formatDateTime(o.createdAt)}</small></td><td>{o.recipientName}<small>{o.restaurantName}</small></td><td><OrderStatus status={o.orderStatus} />{o.orderStatus === 'PENDING' && <WaitingTime createdAt={o.createdAt} />}</td><td><PaymentStatus status={o.paymentStatus} /><small>{o.paymentMethod === 'COD' ? 'Tiền mặt (COD)' : 'Chuyển khoản VietQR'}</small></td><td data-numeric><strong className="admin-money">{formatVND(o.totalAmount)}</strong></td></tr>)}</></Table>;
}

/** Số việc đang chờ xử lý trên toàn hệ thống (đơn chờ, hoàn tiền, hồ sơ, báo cáo, khiếu nại). Tự làm mới mỗi 60 giây. */
export function useAdminAttention(enabled = true, refreshKey = '') {
  const [counts, setCounts] = useState(null);
  useEffect(() => {
    if (!enabled) return undefined;
    let active = true;
    const load = () => adminApi.get('/attention').then(data => { if (active) setCounts(data); }).catch(() => { /* badge chỉ là phụ trợ */ });
    load();
    const timer = window.setInterval(load, 60000);
    return () => { active = false; window.clearInterval(timer); };
  }, [enabled, refreshKey]);
  return counts;
}
export function Search({ value, onChange, placeholder = 'Nhập để tìm kiếm', label = 'Tìm kiếm' }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return <form className="admin-search" onSubmit={e => { e.preventDefault(); onChange(draft.trim()); }}><Field label={label}><input type="search" maxLength={150} value={draft} onChange={e => setDraft(e.target.value)} placeholder={placeholder} /></Field><button className="btn btn--outline" type="submit">Tìm</button></form>;
}
export function RestaurantPicker({ value, onChange, client = adminApi, path = '/catalog/restaurants', allLabel = 'Chọn quán…' }) {
  const [q, setQ] = useState(''), [page, setPage] = useState(0);
  const resource = useAdminData(path, { q, page }, client);
  return <section className="admin-panel"><div className="admin-filters"><Search value={q} label="Tìm quán" onChange={v => { setQ(v); setPage(0); }} /><Field label="Quán đang quản lý"><select value={value?.id || ''} onChange={e => onChange(resource.data?.items.find(r => String(r.id) === e.target.value) || null)}><option value="">{allLabel}</option>{value && !resource.data?.items.some(r => r.id === value.id) && <option value={value.id}>{value.name}</option>}{resource.data?.items.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></Field></div><DataState resource={resource} empty={resource.data?.items.length === 0} />{resource.data && <Pager page={page} total={resource.data.total} onChange={setPage} />}</section>;
}
