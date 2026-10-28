import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { partnerMenuApi } from '../../api/partnerMenuApi.js';
import { partnerRestaurantApi } from '../../api/partnerRestaurantApi.js';
import { getErrorMessage } from '../../api/baseApi.js';
import FoodCard from '../../components/FoodCard.jsx';
import MenuItemModal from '../../components/MenuItemModal.jsx';
import CategoryModal from '../../components/CategoryModal.jsx';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import FullPageLoader from '../../components/FullPageLoader.jsx';
import Alert from '../../components/Alert.jsx';
import Icon from '../../components/Icon.jsx';

export default function RestaurantMenuPage() {
  const { restaurantId } = useParams();

  const [restaurant, setRestaurant] = useState(null);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');

  // Lọc danh mục, trạng thái còn món & tìm kiếm
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [availabilityFilter, setAvailabilityFilter] = useState('ALL'); // ALL | AVAILABLE | UNAVAILABLE
  const [searchQuery, setSearchQuery] = useState('');

  // Toggle trạng thái quán
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [busyItemIds, setBusyItemIds] = useState([]);

  // Modals món ăn
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [savingItem, setSavingItem] = useState(false);
  const [itemModalError, setItemModalError] = useState('');

  // Modals danh mục
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [savingCategory, setSavingCategory] = useState(false);
  const [categoryModalError, setCategoryModalError] = useState('');

  // Modal xác nhận xóa
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError('');
      const [resData, catsData, itemsData] = await Promise.all([
        partnerRestaurantApi.get(restaurantId),
        partnerMenuApi.listCategories(restaurantId),
        partnerMenuApi.listItems(restaurantId),
      ]);
      setRestaurant(resData);
      setCategories(catsData);
      setItems(itemsData);
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể tải dữ liệu thực đơn nhà hàng'));
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Đổi trạng thái mở / đóng cửa quán
  const handleToggleOpen = async () => {
    if (!restaurant) return;
    const targetStatus = !restaurant.open;
    setUpdatingStatus(true);
    setFlash('');
    try {
      const res = await partnerMenuApi.updateStatus(restaurantId, targetStatus);
      setRestaurant((prev) => ({ ...prev, open: res.open }));
      setFlash(
        res.open
          ? 'Quán đã mở cửa đón khách và nhận đơn trên ThunderFood!'
          : 'Quán đã chuyển sang trạng thái tạm ngưng nhận đơn.'
      );
    } catch (err) {
      setError(getErrorMessage(err, 'Không cập nhật được trạng thái đóng/mở cửa'));
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Lưu món ăn (Thêm mới hoặc Sửa)
  const handleSaveItem = async (payload) => {
    setSavingItem(true);
    setItemModalError('');
    try {
      if (editingItem) {
        await partnerMenuApi.updateItem(restaurantId, editingItem.id, payload);
        setFlash(`Đã cập nhật món "${payload.itemName}".`);
      } else {
        await partnerMenuApi.createItem(restaurantId, payload);
        setFlash(`Đã thêm món "${payload.itemName}" vào thực đơn.`);
      }
      setItemModalOpen(false);
      setEditingItem(null);
      await loadData(true);
    } catch (err) {
      setItemModalError(getErrorMessage(err, 'Không lưu được món ăn'));
    } finally {
      setSavingItem(false);
    }
  };

  // Toggle còn món / hết món
  const handleToggleItemAvailability = async (item) => {
    if (busyItemIds.includes(item.id)) return;
    setBusyItemIds((previous) => [...previous, item.id]);
    try {
      const updated = await partnerMenuApi.toggleAvailability(restaurantId, item.id);
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, available: updated.available } : i))
      );
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể đổi trạng thái món'));
    } finally {
      setBusyItemIds((previous) => previous.filter((id) => id !== item.id));
    }
  };

  // Lưu danh mục
  const handleSaveCategory = async (payload) => {
    setSavingCategory(true);
    setCategoryModalError('');
    try {
      if (editingCategory) {
        await partnerMenuApi.updateCategory(restaurantId, editingCategory.id, payload);
        setFlash(`Đã cập nhật nhóm "${payload.categoryName}".`);
      } else {
        await partnerMenuApi.createCategory(restaurantId, payload);
        setFlash(`Đã thêm nhóm thực đơn "${payload.categoryName}".`);
      }
      setCategoryModalOpen(false);
      setEditingCategory(null);
      await loadData(true);
    } catch (err) {
      setCategoryModalError(getErrorMessage(err, 'Không lưu được nhóm thực đơn'));
    } finally {
      setSavingCategory(false);
    }
  };

  // Thực hiện xóa (món hoặc danh mục)
  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      if (deleteConfirm.type === 'item') {
        await partnerMenuApi.deleteItem(restaurantId, deleteConfirm.data.id);
        setFlash(`Đã xóa món "${deleteConfirm.data.itemName}".`);
      } else if (deleteConfirm.type === 'category') {
        await partnerMenuApi.deleteCategory(restaurantId, deleteConfirm.data.id);
        setFlash(`Đã xóa nhóm thực đơn "${deleteConfirm.data.categoryName}".`);
        if (selectedCategory === String(deleteConfirm.data.id)) {
          setSelectedCategory('ALL');
        }
      }
      setDeleteConfirm(null);
      await loadData(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể xóa mục đã chọn'));
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <FullPageLoader text="Đang tải thực đơn quán..." />;

  const uncategorizedCount = items.filter((i) => i.categoryId == null).length;

  // Lọc món ăn hiển thị theo category, availability và search
  const filteredItems = items.filter((item) => {
    if (selectedCategory === 'UNCATEGORIZED') {
      if (item.categoryId != null) return false;
    } else if (selectedCategory !== 'ALL') {
      if (String(item.categoryId) !== String(selectedCategory)) return false;
    }

    if (availabilityFilter === 'AVAILABLE' && !item.available) return false;
    if (availabilityFilter === 'UNAVAILABLE' && item.available) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        item.itemName.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const availableCount = items.filter((i) => i.available).length;
  const unavailableCount = items.length - availableCount;
  const activeCatObj = categories.find((c) => String(c.id) === String(selectedCategory)) || null;

  if (!restaurant) return (
    <div className="page page--wide"><Alert type="error">{error || 'Không tìm thấy quán'}</Alert>
      <Link to="/partner" className="btn btn--outline">Quay lại Quán của tôi</Link></div>
  );

  return (
    <div className="page page--wide tf-partner-menu">
      <div className="tf-partner-menu__top">
        <Link to="/partner" className="back-link"><Icon name="arrowLeft" size={16} />Quán của tôi</Link>
        <Link to={'/restaurants/' + restaurantId} className="btn btn--outline btn--sm" target="_blank" rel="noopener noreferrer">
          Xem trang quán <Icon name="externalLink" size={14} />
        </Link>
      </div>
      {flash && <Alert type="success">{flash}</Alert>}
      {error && <Alert type="error">{error}</Alert>}

      <section className="tf-partner-menu__header" aria-label="Thông tin và trạng thái quán">
        <div className="tf-partner-menu__identity">
          <div className="tf-partner-menu__avatar">
            {restaurant.avatarImage ? <img src={restaurant.avatarImage} alt="" /> : <Icon name="store" size={28} />}
          </div>
          <div className="tf-partner-menu__identity-text">
            <h1>{restaurant.restaurantName || 'Nhà hàng'}</h1>
            <span className={'tf-badge ' + (restaurant.open ? 'tf-badge--open' : 'tf-badge--closed')}>
              <span className={'live-dot' + (restaurant.open ? '' : ' live-dot--muted')} />
              {restaurant.open ? 'Đang mở cửa' : 'Tạm đóng cửa'}
            </span>
            {restaurant.address && <p><Icon name="mapPin" size={14} />{restaurant.address}</p>}
          </div>
        </div>
        <button type="button" className={'btn ' + (restaurant.open ? 'btn--outline' : 'btn--primary')}
          onClick={handleToggleOpen} disabled={updatingStatus}>
          <Icon name={restaurant.open ? 'clock' : 'check'} size={15} />
          {updatingStatus ? 'Đang cập nhật...' : restaurant.open ? 'Tạm dừng nhận đơn' : 'Mở cửa nhận đơn'}
        </button>
      </section>

      <div className="tf-partner-menu__stats" aria-label="Tổng quan thực đơn">
        <div><small>Tổng món</small><strong>{items.length}</strong></div>
        <div><small>Còn món</small><strong>{availableCount}</strong></div>
        <div><small>Tạm hết</small><strong>{unavailableCount}</strong></div>
        <div><small>Nhóm thực đơn</small><strong>{categories.length}</strong></div>
      </div>

      <div className="tf-partner-menu__toolbar">
        <div className="tf-partner-menu__categories" aria-label="Lọc nhóm thực đơn">
          <button type="button" className={'tf-cat-tab' + (selectedCategory === 'ALL' ? ' is-active' : '')}
            aria-pressed={selectedCategory === 'ALL'} onClick={() => setSelectedCategory('ALL')}>
            Tất cả món <span className="tf-cat-tab__count">({items.length})</span>
          </button>
          {categories.map((cat) => (
            <button key={cat.id} type="button"
              className={'tf-cat-tab' + (selectedCategory === String(cat.id) ? ' is-active' : '')}
              aria-pressed={selectedCategory === String(cat.id)}
              onClick={() => setSelectedCategory(String(cat.id))}>
              {cat.categoryName} <span className="tf-cat-tab__count">({cat.itemCount ?? 0})</span>
            </button>
          ))}
          {uncategorizedCount > 0 && (
            <button type="button" className={'tf-cat-tab' + (selectedCategory === 'UNCATEGORIZED' ? ' is-active' : '')}
              aria-pressed={selectedCategory === 'UNCATEGORIZED'} onClick={() => setSelectedCategory('UNCATEGORIZED')}>
              Chưa phân nhóm <span className="tf-cat-tab__count">({uncategorizedCount})</span>
            </button>
          )}
        </div>
        <button type="button" className="btn btn--outline btn--sm tf-partner-menu__add-category"
          onClick={() => { setEditingCategory(null); setCategoryModalOpen(true); }}>
          <Icon name="plus" size={14} />Thêm nhóm
        </button>
      </div>

      <div className="tf-partner-menu__filters">
        <select className="field__input" value={availabilityFilter}
          onChange={(event) => setAvailabilityFilter(event.target.value)} aria-label="Lọc trạng thái món">
          <option value="ALL">Tất cả trạng thái</option>
          <option value="AVAILABLE">Còn món ({availableCount})</option>
          <option value="UNAVAILABLE">Tạm hết ({unavailableCount})</option>
        </select>
        <div className="tf-search-box">
          <Icon name="search" size={15} className="tf-search-box__icon" />
          <input type="search" className="tf-search-box__input" value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)} aria-label="Tìm tên món"
            placeholder="Tìm tên món..." />
        </div>
        <button type="button" className="btn btn--primary"
          onClick={() => { setEditingItem(null); setItemModalOpen(true); }}>
          <Icon name="plus" size={16} />Thêm món mới
        </button>
      </div>

      {activeCatObj && <div className="tf-partner-menu__category-actions">
        <div><strong>{activeCatObj.categoryName}</strong><small>Thứ tự {activeCatObj.displayOrder ?? 0}</small></div>
        <div>
          <button type="button" className="btn btn--outline btn--sm"
            onClick={() => { setEditingCategory(activeCatObj); setCategoryModalOpen(true); }}>
            <Icon name="edit" size={13} />Sửa nhóm
          </button>
          <button type="button" className="btn btn--ghost btn--sm btn--danger-text"
            onClick={() => setDeleteConfirm({ type: 'category', data: activeCatObj })}>
            <Icon name="trash" size={13} />Xóa nhóm
          </button>
        </div>
      </div>}

      {filteredItems.length === 0 ? (
        <div className="empty-state">
          <Icon name="utensils" size={34} />
          <strong>{searchQuery || availabilityFilter !== 'ALL' || selectedCategory !== 'ALL'
            ? 'Không tìm thấy món phù hợp' : 'Chưa có món nào trong thực đơn'}</strong>
          <p>{items.length ? 'Thử đặt lại bộ lọc để xem các món khác.' : 'Thêm món đầu tiên để bắt đầu bán hàng.'}</p>
          {items.length ? (
            <button type="button" className="btn btn--outline btn--sm"
              onClick={() => { setSearchQuery(''); setSelectedCategory('ALL'); setAvailabilityFilter('ALL'); }}>
              Đặt lại bộ lọc
            </button>
          ) : (
            <button type="button" className="btn btn--primary btn--sm"
              onClick={() => { setEditingItem(null); setItemModalOpen(true); }}>Thêm món đầu tiên</button>
          )}
        </div>
      ) : (
        <div className="tf-food-grid">
          {filteredItems.map((item) => (
            <FoodCard key={item.id} item={item} isPartner
              toggleLoading={busyItemIds.includes(item.id)}
              onToggleAvailability={handleToggleItemAvailability}
              onEdit={(target) => { setEditingItem(target); setItemModalOpen(true); }}
              onDelete={(target) => setDeleteConfirm({ type: 'item', data: target })} />
          ))}
        </div>
      )}

      <MenuItemModal open={itemModalOpen} item={editingItem} categories={categories}
        loading={savingItem} error={itemModalError} onSave={handleSaveItem}
        onClose={() => { setItemModalOpen(false); setEditingItem(null); }} />
      <CategoryModal open={categoryModalOpen} category={editingCategory}
        loading={savingCategory} error={categoryModalError} onSave={handleSaveCategory}
        onClose={() => { setCategoryModalOpen(false); setEditingCategory(null); }} />
      <ConfirmModal open={Boolean(deleteConfirm)}
        title={deleteConfirm?.type === 'item' ? 'Xác nhận xóa món ăn' : 'Xác nhận xóa nhóm thực đơn'}
        message={deleteConfirm?.type === 'item'
          ? 'Xóa món "' + (deleteConfirm?.data?.itemName || '') + '" khỏi thực đơn?'
          : 'Xóa nhóm "' + (deleteConfirm?.data?.categoryName || '') + '"? Các món trong nhóm sẽ chuyển về Chưa phân nhóm.'}
        loading={deleting} onConfirm={handleConfirmDelete} onCancel={() => setDeleteConfirm(null)} />
    </div>
  );
}
