import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { publicRestaurantApi } from '../../api/publicRestaurantApi.js';
import { getErrorMessage } from '../../api/baseApi.js';
import { getSmartRestaurantCover } from '../../utils/mediaUtils.js';
import { getMotionSafeScrollBehavior } from '../../utils/motionUtils.js';
import FoodCard, { formatVND } from '../../components/FoodCard.jsx';
import FullPageLoader from '../../components/FullPageLoader.jsx';
import Alert from '../../components/Alert.jsx';
import Modal from '../../components/Modal.jsx';
import Icon from '../../components/Icon.jsx';

import { useAuth } from '../../context/AuthContext.jsx';
import { useCart } from '../../context/CartContext.jsx';
import CartContents from '../../components/CartContents.jsx';
import CustomerReviews from '../../components/CustomerReviews.jsx';

const categoryKey = (category) => String(category.categoryId ?? 'OTHER');

export default function RestaurantDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const cartState = useCart();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);
  const [menuSearch, setMenuSearch] = useState('');
  const [viewingItem, setViewingItem] = useState(null);
  const [modalQty, setModalQty] = useState(1);
  const [modalNote, setModalNote] = useState('');
  const [cartError, setCartError] = useState('');
  const currentCart = cartState.find(id);
  const selectedItems = Object.fromEntries((currentCart?.items || []).map(line => [line.itemId, { qty: (currentCart.items.filter(i => i.itemId === line.itemId).reduce((n, i) => n + i.quantity, 0)) }]));
  const [cartOpen, setCartOpen] = useState(false);
  const [cartToast, setCartToast] = useState('');
  const toastTimer = useRef(null);
  const sectionRefs = useRef({});

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setData(null);
    setCartOpen(false);
    setViewingItem(null);
    setCartError('');
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

  const addToCart = async (item, quantity = 1, note = '') => {
    if (!user) { navigate('/login', { state: { from: `/restaurants/${id}` } }); return; }
    if (user.role !== 'CUSTOMER') { setCartError('Vui lòng dùng tài khoản khách hàng để thêm giỏ.'); return; }
    setCartError('');
    try {
      await cartState.add(item, quantity, note);
      showToast('Đã thêm ' + quantity + ' × ' + item.itemName + ' vào giỏ hàng');
      setViewingItem(null);
    } catch (err) { setCartError(getErrorMessage(err, err.message)); }
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
  const totalCount = Number(currentCart?.quantity || 0);
  const totalAmount = Number(currentCart?.subtotal || 0);

  const selectCategory = (key) => {
    setActiveCategory(key);
    sectionRefs.current[key]?.scrollIntoView({ behavior: getMotionSafeScrollBehavior(), block: 'start' });
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
        {(cartError || cartState.error) && <Alert type="error">{cartError || cartState.error}<button className="btn btn--ghost btn--sm" disabled={cartState.loading || cartState.busy} onClick={cartState.refresh}>Đồng bộ lại giỏ</button></Alert>}
        {!isOpen && <Alert type="warning" title="Nhà hàng hiện tạm đóng cửa">
          Bạn có thể xem trước thực đơn và quay lại khi quán mở cửa.
        </Alert>}
        {filteredMenu.length === 0 ? (
          <div className="empty-state">
            <Icon name="utensils" size={36} />
            <strong>{menuSearch ? 'Không tìm thấy món phù hợp' : 'Nhà hàng đang cập nhật thực đơn'}</strong>
            <p>{menuSearch ? 'Hãy thử từ khóa khác.' : 'Vui lòng quay lại sau.'}</p>
            {menuSearch && <button type="button" className="btn btn--outline btn--sm" onClick={() => setMenuSearch('')}>Xem toàn bộ thực đơn</button>}
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
                      <FoodCard key={item.id} item={item} orderable={isOpen && !cartState.busy && !cartState.loading} quantityInCart={selectedItems[item.id]?.qty || 0}
                        onClick={() => { setViewingItem(item); setModalQty(1); setModalNote(''); setCartError(''); }}
                        onAddToCart={() => addToCart(item)} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>

      <CustomerReviews key={id} restaurantId={id} />

      {totalCount > 0 && (
        <div className="tf-floating-cart" role="region" aria-label="Danh sách chọn món">
          <div className="tf-floating-cart__summary">
            <span className="tf-floating-cart__count">{totalCount}</span>
            <div><strong>Đã chọn {totalCount} món</strong><small>Tạm tính {formatVND(totalAmount)} · chưa gồm phí giao</small></div>
          </div>
          <button type="button" className="btn btn--primary btn--sm" onClick={() => setCartOpen(true)}>
            Xem giỏ hàng
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
            <label className="commerce-field">Ghi chú cho món<textarea maxLength={300} rows={2} value={modalNote} onChange={e => setModalNote(e.target.value)} placeholder="Ví dụ: ít cay, không hành…" /></label>
            {cartError && <Alert type="error">{cartError}</Alert>}
            <div className="tf-item-detail__actions">
              <div className="tf-quantity" aria-label="Số lượng">
                <button type="button" className="icon-btn" disabled={modalQty <= 1 || cartState.busy}
                  onClick={() => setModalQty((value) => Math.max(1, value - 1))} aria-label="Giảm số lượng"><Icon name="minus" size={15} /></button>
                <strong>{modalQty}</strong>
                <button type="button" className="icon-btn" disabled={modalQty >= 99 || cartState.busy} onClick={() => setModalQty((value) => Math.min(99, value + 1))}
                  aria-label="Tăng số lượng"><Icon name="plus" size={15} /></button>
              </div>
              <button type="button" className="btn btn--primary" disabled={!viewingItem.available || !isOpen || cartState.busy || cartState.loading}
                onClick={() => addToCart(viewingItem, modalQty, modalNote)}>
                Thêm vào giỏ · {formatVND(Number(viewingItem.price || 0) * modalQty)}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {cartOpen && (
        <Modal title="Giỏ hàng" onClose={() => setCartOpen(false)}>
          <CartContents cart={currentCart} />
          <Link className="btn btn--ghost" to="/customer/cart">Xem giỏ của tất cả quán</Link>
        </Modal>
      )}
    </div>
  );
}
