import { useEffect, useState } from 'react';
import { adminApi } from '../../api/adminApi.js';
import { getErrorMessage } from '../../api/baseApi.js';
import MenuItemModal from '../../components/MenuItemModal.jsx';
import CategoryModal from '../../components/CategoryModal.jsx';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import Alert from '../../components/Alert.jsx';
import { Head, Field, Search, Pager, Table, DataState, RestaurantPicker, useAdminData, formatVND } from './AdminShared.jsx';

function Catalog({ restaurant }) {
  const [kind, setKind] = useState('items'), [q, setQ] = useState(''), [page, setPage] = useState(0), [status, setStatus] = useState(''), [sort, setSort] = useState('newest'), [category, setCategory] = useState('');
  const [modal, setModal] = useState(null), [confirm, setConfirm] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [success, setSuccess] = useState('');
  const [categoryPage, setCategoryPage] = useState(0), [categoryQuery, setCategoryQuery] = useState('');
  const prefix = `/catalog/${restaurant.id}`, resource = useAdminData(`${prefix}/${kind}`, { q, page, status, sort, category: category || undefined }), cats = useAdminData(`${prefix}/categories`, { page: categoryPage, q: categoryQuery });
  const [categoryCache, setCategoryCache] = useState([]);
  const categories = cats.data?.items || [];
  useEffect(() => {
    if (cats.data) setCategoryCache(previous => [...new Map([...previous, ...cats.data.items].map(c => [c.id, c])).values()]);
  }, [cats.data]);
  const knownCategories = [...new Map([...categoryCache, ...categories].map(c => [c.id, c])).values()];
  const item = modal?.value;
  const options = item?.categoryId && !knownCategories.some(c => c.id === item.categoryId) ? [{ id: item.categoryId, categoryName: item.categoryName || 'Danh mục hiện tại' }, ...knownCategories] : knownCategories;
  async function save(body) {
    setBusy(true); setError('');
    try { await adminApi.save(modal.value ? 'put' : 'post', `${prefix}/${kind}${modal.value ? '/' + modal.value.id : ''}`, body); setModal(null); resource.refresh(); cats.refresh(); setSuccess('Đã lưu dữ liệu thực đơn.'); }
    catch (err) { setError(getErrorMessage(err)); }
    finally { setBusy(false); }
  }
  async function execute() {
    setBusy(true); setError('');
    try { await adminApi.save(confirm.method, confirm.path, confirm.body); setConfirm(null); resource.refresh(); cats.refresh(); setSuccess('Đã cập nhật thực đơn.'); }
    catch (err) { setError(getErrorMessage(err)); }
    finally { setBusy(false); }
  }
  function visibility(row) {
    const visible = kind === 'items' ? row.approvalStatus !== 'HIDDEN' : Boolean(row.visible);
    setError(''); setConfirm({ method: 'patch', path: `${prefix}/${kind}/${row.id}/visibility`, body: { visible: !visible }, title: visible ? 'Ẩn khỏi thực đơn?' : 'Hiển thị trên thực đơn?', message: kind === 'categories' ? 'Ẩn danh mục sẽ ngăn đặt tất cả món trong danh mục. Hiển thị lại giữ nguyên trạng thái còn/hết của từng món.' : 'Khách hàng sẽ thấy trạng thái mới khi tải lại thực đơn hoặc giỏ hàng.' });
  }
  return <><div className="admin-section-head"><div className="tabs"><button className={`tabs__item ${kind === 'items' ? 'is-active' : ''}`} aria-pressed={kind === 'items'} onClick={() => { setKind('items'); setPage(0); setQ(''); }}>Món ăn</button><button className={`tabs__item ${kind === 'categories' ? 'is-active' : ''}`} aria-pressed={kind === 'categories'} onClick={() => { setKind('categories'); setPage(0); setQ(''); }}>Danh mục</button></div><button className="btn btn--primary" onClick={() => { setError(''); setModal({ value: null }); }}>{kind === 'items' ? '+ Thêm món ăn' : '+ Thêm danh mục'}</button></div>
    {success && <Alert type="success">{success}</Alert>}{error && !modal && <Alert type="error">{error}</Alert>}
    <section className="admin-panel"><div className="admin-filters"><Search value={q} onChange={v => { setQ(v); setPage(0); }} placeholder={kind === 'items' ? 'Tên món ăn' : 'Tên danh mục'} />{kind === 'items' && <><Field label="Trạng thái"><select value={status} onChange={e => { setStatus(e.target.value); setPage(0); }}><option value="">Tất cả</option><option value="available">Còn bán</option><option value="unavailable">Tạm hết</option><option value="hidden">Đã ẩn</option></select></Field><Field label="Danh mục (trang đang chọn)"><select value={category} onChange={e => { setCategory(e.target.value); setPage(0); }}><option value="">Tất cả danh mục</option>{categories.map(c => <option key={c.id} value={c.id}>{c.categoryName}</option>)}</select></Field><Field label="Sắp xếp"><select value={sort} onChange={e => { setSort(e.target.value); setPage(0); }}><option value="newest">Mới nhất</option><option value="name">Tên A–Z</option><option value="price">Giá tăng dần</option></select></Field></>}</div>
      <DataState resource={resource} empty={resource.data?.items.length === 0}><Table caption="Quản lý thực đơn" headers={kind === 'items' ? ['Món ăn', 'Danh mục', 'Giá bán', 'Trạng thái', 'Thao tác'] : ['Danh mục', 'Thứ tự', 'Số món', 'Hiển thị', 'Thao tác']}>{resource.data?.items.map(row => <tr key={row.id}>{kind === 'items' ? <><td><div className="admin-food">{row.imageUrl && <img src={row.imageUrl} alt="" loading="lazy" onError={e => { e.currentTarget.hidden = true; }} />}<strong>{row.itemName}</strong></div></td><td>{row.categoryName || 'Chưa phân nhóm'}</td><td data-numeric>{formatVND(row.price)}</td><td>{row.approvalStatus === 'HIDDEN' ? 'Đã ẩn' : row.available ? 'Còn bán' : 'Tạm hết'}</td></> : <><td><strong>{row.categoryName}</strong></td><td data-numeric>{row.displayOrder}</td><td data-numeric>{row.itemCount}</td><td>{row.visible ? 'Đang hiện' : 'Đã ẩn'}</td></>}<td><div className="admin-actions"><button className="btn btn--outline btn--sm" onClick={() => { setError(''); setModal({ value: row }); }}>Sửa</button><button className="btn btn--outline btn--sm" onClick={() => visibility(row)}>{(kind === 'items' ? row.approvalStatus !== 'HIDDEN' : row.visible) ? 'Ẩn' : 'Hiện'}</button><button className="btn btn--ghost btn--sm btn--danger-text" onClick={() => { setError(''); setConfirm({ method: 'delete', path: `${prefix}/${kind}/${row.id}`, title: 'Xác nhận xóa', message: kind === 'items' ? 'Món được xóa mềm. Tên và giá trong đơn cũ được giữ nguyên.' : 'Chỉ xóa danh mục không còn món đang sử dụng.' }); }}>Xóa</button></div></td></tr>)}</Table></DataState>{resource.data && <Pager page={page} total={resource.data.total} onChange={setPage} />}
    </section>
    {kind === 'items' && <details className="admin-panel"><summary>Tìm và phân trang danh mục để lọc</summary><Field label="Tìm tên danh mục"><input type="search" maxLength={150} value={categoryQuery} onChange={e => { setCategoryQuery(e.target.value); setCategoryPage(0); setCategory(''); setPage(0); }} /></Field><DataState resource={cats}><Pager page={categoryPage} total={cats.data?.total} onChange={p => { setCategoryPage(p); setCategory(''); setPage(0); }} /></DataState><p className="muted">Các danh mục tìm được xuất hiện trong bộ lọc phía trên.</p></details>}
    {modal && kind === 'items' && <MenuItemModal open item={modal.value} categories={options} loading={busy} error={error} onSave={save} onClose={() => setModal(null)} uploadImage={adminApi.upload} categoryOptionsSlot={<div><Field label="Tìm danh mục để chọn"><input type="search" maxLength={150} value={categoryQuery} onChange={e => { setCategoryQuery(e.target.value); setCategoryPage(0); }} /></Field><DataState resource={cats}><Pager page={categoryPage} total={cats.data?.total} onChange={setCategoryPage} /></DataState></div>} />}
    {modal && kind === 'categories' && <CategoryModal open category={modal.value} loading={busy} error={error} onSave={save} onClose={() => setModal(null)} />}
    {confirm && <ConfirmModal open title={confirm.title} message={<>{confirm.message}{error && <Alert type="error">{error}</Alert>}</>} confirmText="Xác nhận" loading={busy} onConfirm={execute} onCancel={() => setConfirm(null)} />}
  </>;
}
export default function AdminCatalogPage() {
  const [restaurant, setRestaurant] = useState(null);
  return <div className="admin-page"><Head title="Món ăn & danh mục" description="Quản lý thực đơn từng quán. Đơn hàng cũ luôn giữ tên và giá đã đặt." /><RestaurantPicker value={restaurant} onChange={setRestaurant} />{restaurant ? <Catalog key={restaurant.id} restaurant={restaurant} /> : <div className="admin-state">Chọn một quán để quản lý thực đơn.</div>}</div>;
}
