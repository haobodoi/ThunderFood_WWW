import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { publicRestaurantApi } from '../api/publicRestaurantApi.js';
import { getSmartRestaurantCover } from '../utils/mediaUtils.js';
import { formatVND } from './FoodCard.jsx';
import Icon from './Icon.jsx';

const deliveryFeeSortValue = (value) => {
  if (value == null || (typeof value === 'string' && value.trim() === '')) return Number.POSITIVE_INFINITY;
  const fee = Number(value);
  return Number.isFinite(fee) && fee >= 0 ? fee : Number.POSITIVE_INFINITY;
};

export default function RestaurantListSection({
  title = 'Nhà hàng nổi bật trên ThunderFood', externalKeyword = '',
}) {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [keyword, setKeyword] = useState(externalKeyword);
  const [activeCuisine, setActiveCuisine] = useState('ALL');
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [sortBy, setSortBy] = useState('RECOMMENDED');

  useEffect(() => {
    setKeyword(externalKeyword);
  }, [externalKeyword]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(false);
      try {
        const list = await publicRestaurantApi.search({ keyword: keyword.trim() || undefined });
        if (active) setRestaurants(Array.isArray(list) ? list : []);
      } catch {
        if (active) { setRestaurants([]); setError(true); }
      } finally {
        if (active) setLoading(false);
      }
    }, 220);
    return () => { active = false; window.clearTimeout(timer); };
  }, [keyword, reloadToken]);

  const cuisines = useMemo(() => {
    const names = new Set();
    restaurants.forEach((restaurant) => {
      (Array.isArray(restaurant.tags) ? restaurant.tags : []).forEach((tag) => {
        if (tag.tagType === 'CUISINE' && tag.tagName?.trim()) names.add(tag.tagName.trim());
      });
    });
    return [...names].sort((a, b) => a.localeCompare(b, 'vi-VN'));
  }, [restaurants]);

  const displayed = restaurants
    .filter((restaurant) => !onlyOpen || restaurant.open)
    .filter((restaurant) => activeCuisine === 'ALL' ||
      (restaurant.tags || []).some((tag) => tag.tagType === 'CUISINE' && tag.tagName?.trim() === activeCuisine))
    .sort((a, b) => {
      if (sortBy === 'LOWEST_FEE') return deliveryFeeSortValue(a.deliveryFee) - deliveryFeeSortValue(b.deliveryFee);
      if (sortBy === 'OPEN_FIRST') return Number(Boolean(b.open)) - Number(Boolean(a.open));
      return 0;
    });

  const clearFilters = () => {
    setKeyword(''); setActiveCuisine('ALL'); setOnlyOpen(false); setSortBy('RECOMMENDED');
  };

  return (
    <section className="container tf-discovery" aria-labelledby="discovery-title">
      <div className="tf-discovery__head">
        <div className="tf-discovery__title-group">
          <h2 id="discovery-title">{title}</h2>
          <p>Khám phá quán ăn và thực đơn đang phục vụ trên ThunderFood.</p>
        </div>
        <div className="tf-discovery__controls">
          <div className="tf-search-box">
            <Icon name="search" size={16} className="tf-search-box__icon" />
            <input type="search" className="tf-search-box__input" value={keyword}
              onChange={(event) => { setKeyword(event.target.value); setActiveCuisine('ALL'); }}
              aria-label="Tìm tên quán hoặc món đặc trưng" placeholder="Tìm tên quán, món đặc trưng..." />
          </div>
          <select className="field__input tf-discovery__sort" value={sortBy}
            onChange={(event) => setSortBy(event.target.value)} aria-label="Sắp xếp nhà hàng">
            <option value="RECOMMENDED">Mặc định</option>
            <option value="LOWEST_FEE">Phí giao thấp nhất</option>
            <option value="OPEN_FIRST">Ưu tiên đang mở cửa</option>
          </select>
          <button type="button" className={'tf-open-filter' + (onlyOpen ? ' is-active' : '')}
            onClick={() => setOnlyOpen((value) => !value)} aria-pressed={onlyOpen}>
            <Icon name={onlyOpen ? 'checkCircle' : 'clock'} size={16} />
            Chỉ quán đang mở
          </button>
        </div>
      </div>

      {cuisines.length > 0 && (
        <div className="tf-cuisine-strip" aria-label="Lọc theo ẩm thực">
          {['ALL', ...cuisines].map((name) => (
            <button key={name} type="button" aria-pressed={activeCuisine === name}
              className={'tf-cuisine-tab' + (activeCuisine === name ? ' is-active' : '')}
              onClick={() => setActiveCuisine(name)}>
              {name === 'ALL' ? 'Tất cả' : name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="tf-restaurant-grid" aria-label="Đang tải nhà hàng">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="tf-rest-card tf-rest-card--skeleton" aria-hidden="true">
              <div className="skeleton tf-rest-card__skeleton-cover" />
              <div className="skeleton tf-rest-card__skeleton-line" />
              <div className="skeleton tf-rest-card__skeleton-line tf-rest-card__skeleton-line--short" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="empty-state" role="alert">
          <Icon name="store" size={36} />
          <strong>Không tải được danh sách nhà hàng</strong>
          <p>Vui lòng thử lại sau ít phút.</p>
          <button type="button" className="btn btn--outline btn--sm" onClick={() => setReloadToken((value) => value + 1)}>
            Thử lại
          </button>
        </div>
      ) : displayed.length === 0 ? (
        <div className="empty-state">
          <Icon name="store" size={36} />
          <strong>Không tìm thấy nhà hàng phù hợp</strong>
          <p>Thử từ khóa khác hoặc đặt lại bộ lọc.</p>
          <button type="button" className="btn btn--outline btn--sm" onClick={clearFilters}>
            Xem tất cả nhà hàng
          </button>
        </div>
      ) : (
        <div className="tf-restaurant-grid">
          {displayed.map((restaurant) => {
            const cover = getSmartRestaurantCover(restaurant);
            return (
              <Link key={restaurant.id} to={'/restaurants/' + restaurant.id} className="tf-rest-card__link">
                <article className="tf-rest-card">
                  <div className="tf-rest-card__cover">
                    {cover ? <img src={cover} alt="" className="tf-rest-card__cover-img" loading="lazy" /> :
                      <div className="tf-rest-card__cover-placeholder"><Icon name="store" size={32} /><span>Chưa có ảnh bìa</span></div>}
                    <div className="tf-rest-card__cover-gradient" />
                    <div className="tf-rest-card__availability-wrap">
                      <span className={'tf-rest-card__availability' + (restaurant.open ? ' is-open' : '')}>
                        <Icon name={restaurant.open ? 'checkCircle' : 'pauseCircle'} size={14} />
                        {restaurant.open ? 'Đang phục vụ' : 'Tạm đóng'}
                      </span>
                    </div>
                    <div className="tf-rest-card__avatar">
                      {restaurant.avatarImage ? <img src={restaurant.avatarImage} alt="" loading="lazy" /> : <Icon name="store" size={23} />}
                    </div>
                  </div>
                  <div className="tf-rest-card__body">
                    <div>
                      <h3 className="tf-rest-card__title" title={restaurant.restaurantName}>{restaurant.restaurantName || 'Nhà hàng'}</h3>
                      {restaurant.specialty && <p className="tf-rest-card__specialty"><Icon name="utensils" size={14} /><span>{restaurant.specialty}</span></p>}
                      {restaurant.address && <p className="tf-rest-card__address"><Icon name="mapPin" size={14} /><span>{restaurant.address}</span></p>}
                    </div>
                    <div className="tf-rest-card__footer">
                      <span className="tf-rest-card__fee">Phí giao: {formatVND(restaurant.deliveryFee)}</span>
                      <span className="tf-rest-card__cta">Xem thực đơn <Icon name="arrowRight" size={14} /></span>
                    </div>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
