import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { publicRestaurantApi } from '../../api/publicRestaurantApi.js';
import { getErrorMessage } from '../../api/baseApi.js';
import { getSmartRestaurantCover } from '../../utils/mediaUtils.js';
import FoodCard, { formatVND } from '../../components/FoodCard.jsx';
import FullPageLoader from '../../components/FullPageLoader.jsx';
import Alert from '../../components/Alert.jsx';
import Modal from '../../components/Modal.jsx';
import Icon from '../../components/Icon.jsx';

const categoryKey = (category) => String(category.categoryId ?? 'OTHER');

export default function RestaurantDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);
  const [menuSearch, setMenuSearch] = useState('');
  const [viewingItem, setViewingItem] = useState(null);
  const [modalQty, setModalQty] = useState(1);
  const [selectedItems, setSelectedItems] = useState({});
  const [cartOpen, setCartOpen] = useState(false);
  const [cartToast, setCartToast] = useState('');
  const toastTimer = useRef(null);
  const sectionRefs = useRef({});

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setData(null);
    setSelectedItems({});
    publicRestaurantApi.getMenu(id)
      .then((response) => {
        if (!active) return;
        setData(response);
        setActiveCategory(response?.menu?.length ? categoryKey(response.menu[0]) : null);
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err, 'Không thể tải thông tin nhà hàng.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      window.clearTimeout(toastTimer.current);
    };
  }, [id]);

  const showToast = (message) => {
    window.clearTimeout(toastTimer.current);
    setCartToast(message);
    toastTimer.current = window.setTimeout(() => setCartToast(''), 2800);
  };

  const addToCart = (item, quantity = 1) => {
    setSelectedItems((previous) => ({
      ...previous,
      [item.id]: { item, qty: (previous[item.id]?.qty || 0) + quantity },
    }));
    showToast('Đã thêm ' + quantity + ' × ' + item.itemName + ' vào danh sách chọn món');
  };

  const changeQuantity = (itemId, delta) => {
    setSelectedItems((previous) => {
      const entry = previous[itemId];
      if (!entry) return previous;
      const next = { ...previous };
      const qty = entry.qty + delta;
      if (qty < 1) delete next[itemId];
      else next[itemId] = { ...entry, qty };
      return next;
    });
  };

  if (loading) return <FullPageLoader text="Đang tải thực đơn..." />;
  if (error || !data?.restaurant) {
    return (
      <div className="container tf-detail-error">
        <Alert type="error">{error || 'Không tìm thấy nhà hàng'}</Alert>
        <Link to="/" className="btn btn--primary">
          <Icon name="arrowLeft" size={16} /> Quay lại trang khám phá
        </Link>
      </div>
    );
  }

  const { restaurant } = data;
  const isOpen = Boolean(restaurant.open);
  const coverUrl = getSmartRestaurantCover(restaurant);
  const validTags = (Array.isArray(restaurant.tags) ? restaurant.tags : [])
    .filter((tag) => typeof tag.tagName === 'string' && tag.tagName.trim())
    .filter((tag) => tag.tagType === 'CUISINE');
  const menu = Array.isArray(data.menu) ? data.menu : [];
  const seenImages = new Set();
  const uniqueMenu = menu.map((category) => ({
    ...category,
    items: (Array.isArray(category.items) ? category.items : []).map((item) => {
      const imageUrl = typeof item.imageUrl === 'string' ? item.imageUrl.trim() : '';
      const duplicate = imageUrl && seenImages.has(imageUrl);
      if (imageUrl) seenImages.add(imageUrl);
      return { ...item, displayImageUrl: duplicate ? null : imageUrl || null };
    }),
  }));
  const query = menuSearch.trim().toLocaleLowerCase('vi-VN');
  const filteredMenu = uniqueMenu
    .map((category) => ({
      ...category,
      items: category.items.filter((item) =>
        !query || String(item.itemName || '').toLocaleLowerCase('vi-VN').includes(query)
          || String(item.description || '').toLocaleLowerCase('vi-VN').includes(query)),
    }))
    .filter((category) => category.items.length > 0);
  const cartEntries = Object.values(selectedItems);
  const totalCount = cartEntries.reduce((sum, entry) => sum + entry.qty, 0);
  const totalAmount = cartEntries.reduce((sum, entry) =>
    sum + Number(entry.item.price || 0) * entry.qty, 0);

  const selectCategory = (key) => {
    setActiveCategory(key);
    sectionRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className={'restaurant-detail-page' + (totalCount ? ' restaurant-detail-page--with-cart' : '')}>
      {cartToast && <div className="tf-toast" role="status"><Icon name="check" size={18} />{cartToast}</div>}

      <section className="tf-store-hero">
        <div className="tf-store-hero__banner">
          {coverUrl ? <img src={coverUrl} alt="" /> : <div className="tf-store-hero__banner-fallback" />}
          <div className="tf-store-hero__banner-overlay" />
          <div className="container tf-store-hero__banner-inner">
            <Link to="/" className="tf-store-hero__back">
              <Icon name="arrowLeft" size={16} /> Khám phá quán khác
            </Link>
          </div>
        </div>
        <div className="tf-store-hero__surface">
          <div className="container tf-store-hero__content">
            <div className="tf-store-hero__main">
              <div className="tf-store-hero__avatar">
                {restaurant.avatarImage ? <img src={restaurant.avatarImage} alt="" /> : <Icon name="store" size={36} />}
              </div>
              <div className="tf-store-hero__info">
                <div className="tf-store-hero__heading">
                  <h1>{restaurant.restaurantName || 'Nhà hàng'}</h1>
                  <span className={'service-status' + (isOpen ? ' is-open' : '')}>
                    <Icon name={isOpen ? 'checkCircle' : 'pauseCircle'} size={16} />
                    {isOpen ? 'Đang phục vụ' : 'Tạm đóng cửa'}
                  </span>
                </div>
                {restaurant.description && <p className="tf-store-hero__description">{restaurant.description}</p>}
                <div className="tf-store-hero__contact">
                  {restaurant.address && <span><Icon name="mapPin" size={14} />{restaurant.address}</span>}
                  {restaurant.phone && <a href={'tel:' + restaurant.phone}><Icon name="phone" size={14} />{restaurant.phone}</a>}
                </div>
                {(restaurant.specialty || validTags.length > 0) && (
                  <div className="tf-store-hero__taxonomy">
                    <span className="tf-store-hero__taxonomy-label"><Icon name="utensils" size={14} />Ẩm thực</span>
                    <span className="tf-store-hero__taxonomy-values">
                      {[restaurant.specialty, ...validTags.map((tag) => tag.tagName.trim())]
                        .filter((value, index, values) => value && values.indexOf(value) === index)
                        .join(' · ')}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="tf-store-hero__stats" aria-label="Thông tin nhà hàng">
              <div className="tf-store-stat"><small>Thực đơn</small><strong>{uniqueMenu.reduce((sum, cat) => sum + cat.items.length, 0)} món</strong></div>
              <div className="tf-store-stat"><small>Phí giao hàng</small><strong>{formatVND(restaurant.deliveryFee)}</strong></div>
            </div>
          </div>
        </div>
      </section>

      <nav className="tf-sticky-nav" aria-label="Danh mục thực đơn">
        <div className="container tf-sticky-nav__inner">
          <div className="tf-sticky-nav__tabs">
            {uniqueMenu.filter((cat) => cat.items.length).map((cat) => {
              const key = categoryKey(cat);
              return (
                <button key={key} type="button" onClick={() => selectCategory(key)}
                  className={'tf-cat-tab' + (activeCategory === key ? ' is-active' : '')}>
                  <span>{cat.categoryName || 'Món khác'}</span>
                  <span className="tf-cat-tab__count">({cat.items.length})</span>
                </button>
              );
            })}
          </div>
          <div className="tf-search-box tf-sticky-nav__search">
            <Icon name="search" size={15} className="tf-search-box__icon" />
            <input type="search" className="tf-search-box__input" value={menuSearch}
              onChange={(event) => setMenuSearch(event.target.value)}
              aria-label="Tìm món trong quán" placeholder="Tìm món trong quán..." />
          </div>
        </div>
      </nav>

      <main className="container tf-menu-content">
        {!isOpen && <Alert type="warning" title="Nhà hàng hiện tạm đóng cửa">
          Bạn có thể xem trước thực đơn và quay lại khi quán mở cửa.
        </Alert>}
        {filteredMenu.length === 0 ? (
          <div className="empty-state">
            <Icon name="utensils" size={36} />
            <strong>{menuSearch ? 'Không tìm thấy món phù hợp' : 'Nhà hàng đang cập nhật thực đơn'}</strong>
            <p>{menuSearch ? 'Hãy thử từ khóa khác.' : 'Vui lòng quay lại sau.'}</p>
            {menuSearch && <button className="btn btn--outline btn--sm" onClick={() => setMenuSearch('')}>Xem toàn bộ thực đơn</button>}
          </div>
        ) : (
          <div className="tf-menu-sections">
            {filteredMenu.map((cat) => {
              const key = categoryKey(cat);
              return (
                <section key={key} ref={(element) => { sectionRefs.current[key] = element; }} className="tf-menu-section">
                  <div className="tf-menu-section__head">
                    <h2>{cat.categoryName || 'Món khác'}</h2>
                    <span className="tf-menu-section__count">{cat.items.length} món</span>
                  </div>
                  <div className="tf-food-grid">
                    {cat.items.map((item) => (
                      <FoodCard key={item.id} item={item} orderable={isOpen} quantityInCart={selectedItems[item.id]?.qty || 0}
                        onClick={() => { setViewingItem(item); setModalQty(1); }}
                        onAddToCart={() => addToCart(item)} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>

      {totalCount > 0 && (
        <div className="tf-floating-cart" role="region" aria-label="Danh sách chọn món">
          <div className="tf-floating-cart__summary">
            <span className="tf-floating-cart__count">{totalCount}</span>
            <div><strong>Đã chọn {totalCount} món</strong><small>Tạm tính {formatVND(totalAmount)} · chưa gồm phí giao</small></div>
          </div>
          <button type="button" className="btn btn--primary btn--sm" onClick={() => setCartOpen(true)}>
            Xem món đã chọn
          </button>
        </div>
      )}

      {viewingItem && (
        <Modal title={viewingItem.itemName || 'Chi tiết món'} onClose={() => setViewingItem(null)}>
          <div className="tf-item-detail">
            <div className="tf-item-detail__media">
              {viewingItem.displayImageUrl ? <img src={viewingItem.displayImageUrl} alt={viewingItem.itemName} /> :
                <div className="tf-item-detail__placeholder"><Icon name="utensils" size={30} /><span>Chưa có ảnh món</span></div>}
            </div>
            <div className="tf-item-detail__meta">
              <strong>{formatVND(viewingItem.price)}</strong>
              <span className={'status-label ' + (viewingItem.available ? 'status-label--success' : 'status-label--neutral')}>
                <Icon name={viewingItem.available ? 'checkCircle' : 'pauseCircle'} size={15} />
                <span>{viewingItem.available ? 'Đang phục vụ' : 'Tạm hết hàng'}</span>
              </span>
            </div>
            {viewingItem.description && <p>{viewingItem.description}</p>}
            <div className="tf-item-detail__actions">
              <div className="tf-quantity" aria-label="Số lượng">
                <button type="button" className="icon-btn" disabled={modalQty <= 1}
                  onClick={() => setModalQty((value) => Math.max(1, value - 1))} aria-label="Giảm số lượng"><Icon name="minus" size={15} /></button>
                <strong>{modalQty}</strong>
                <button type="button" className="icon-btn" onClick={() => setModalQty((value) => value + 1)}
                  aria-label="Tăng số lượng"><Icon name="plus" size={15} /></button>
              </div>
              <button type="button" className="btn btn--primary" disabled={!viewingItem.available || !isOpen}
                onClick={() => { addToCart(viewingItem, modalQty); setViewingItem(null); }}>
                Chọn món · {formatVND(Number(viewingItem.price || 0) * modalQty)}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {cartOpen && (
        <Modal title="Món đã chọn" onClose={() => setCartOpen(false)}>
          <div className="tf-cart-preview">
            {cartEntries.length === 0 ? <p>Chưa chọn món nào.</p> : cartEntries.map(({ item, qty }) => (
              <div className="tf-cart-preview__row" key={item.id}>
                <div><strong>{item.itemName}</strong><small>{formatVND(item.price)} / món</small></div>
                <div className="tf-quantity">
                  <button type="button" className="icon-btn" onClick={() => changeQuantity(item.id, -1)}
                    aria-label={'Giảm số lượng ' + item.itemName}><Icon name="minus" size={14} /></button>
                  <strong>{qty}</strong>
                  <button type="button" className="icon-btn" onClick={() => changeQuantity(item.id, 1)}
                    aria-label={'Tăng số lượng ' + item.itemName}><Icon name="plus" size={14} /></button>
                </div>
              </div>
            ))}
            <div className="tf-cart-preview__total"><span>Tạm tính</span><strong>{formatVND(totalAmount)}</strong></div>
            <p className="tf-cart-preview__note">Đây là danh sách chọn món tạm thời. Chức năng đặt hàng sẽ được bổ sung ở giai đoạn tiếp theo.</p>
            <button type="button" className="btn btn--outline btn--sm" onClick={() => { setSelectedItems({}); setCartOpen(false); }}>Xóa danh sách</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
