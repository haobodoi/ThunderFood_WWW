import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLE_LABEL, homePathFor } from '../utils/roleUtils.js';
import { HERO_MARQUEE_ROW_1, HERO_MARQUEE_ROW_2, getSmartRestaurantCover } from '../utils/mediaUtils.js';
import { getMotionSafeScrollBehavior, prefersReducedMotion } from '../utils/motionUtils.js';
import { publicRestaurantApi } from '../api/publicRestaurantApi.js';
import { formatVND } from '../components/FoodCard.jsx';
import Icon from '../components/Icon.jsx';
import RestaurantListSection from '../components/RestaurantListSection.jsx';

const FEATURED_RESTAURANT_LIMIT = 8;

export default function HomePage() {
  const { user } = useAuth();
  const [restaurants, setRestaurants] = useState([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [heroSearch, setHeroSearch] = useState('');
  const [passedKeyword, setPassedKeyword] = useState('');
  const discoveryRef = useRef(null);

  useEffect(() => {
    let active = true;
    publicRestaurantApi.search()
      .then((list) => {
        if (active) setRestaurants(Array.isArray(list) ? list.slice(0, FEATURED_RESTAURANT_LIMIT) : []);
      })
      .catch(() => { if (active) setRestaurants([]); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    setActiveSlide((index) => (restaurants.length ? Math.min(index, restaurants.length - 1) : 0));
  }, [restaurants.length]);

  useEffect(() => {
    if (paused || restaurants.length < 2 || prefersReducedMotion()) return undefined;
    const timer = window.setInterval(() => setActiveSlide((index) => (index + 1) % restaurants.length), 5000);
    return () => window.clearInterval(timer);
  }, [activeSlide, paused, restaurants.length]);

  const spotlight = restaurants[activeSlide] || restaurants[0];
  const handleSearch = (event) => {
    event.preventDefault();
    setPassedKeyword(heroSearch.trim());
    discoveryRef.current?.scrollIntoView({ behavior: getMotionSafeScrollBehavior(), block: 'start' });
  };

  return (
    <>
      <section className="tf-hero">
        <div className="tf-hero__ambient" aria-hidden="true">
          <div className="tf-marquee tf-marquee--left">
            {[...HERO_MARQUEE_ROW_1, ...HERO_MARQUEE_ROW_1].map((dish, index) => (
              <div key={'a' + index} className="tf-marquee__card"><img src={dish.image} alt="" /></div>
            ))}
          </div>
          <div className="tf-marquee tf-marquee--right">
            {[...HERO_MARQUEE_ROW_2, ...HERO_MARQUEE_ROW_2].map((dish, index) => (
              <div key={'b' + index} className="tf-marquee__card"><img src={dish.image} alt="" /></div>
            ))}
          </div>
        </div>
        <div className="tf-hero__veil" aria-hidden="true" />
        <div className="container tf-hero__grid">
          <div className="tf-hero__content">
            <h1 className="tf-hero__title">Khám phá <span className="tf-hero__title-accent">quán ngon.</span></h1>
            <p className="tf-hero__desc">Khám phá nhà hàng, xem thực đơn và chọn món hợp khẩu vị trên ThunderFood.</p>
            <form className="tf-hero__search" onSubmit={handleSearch}>
              <Icon name="search" size={19} className="muted" />
              <input type="search" value={heroSearch} onChange={(event) => setHeroSearch(event.target.value)}
                placeholder="Tìm quán hoặc món đặc trưng..." aria-label="Tìm quán hoặc món đặc trưng" />
              <button type="submit" className="btn btn--primary">Tìm món</button>
            </form>
            <div className="tf-hero__actions">
              <a href="#explore-restaurants" className="btn btn--primary btn--lg"
                onClick={(event) => {
                  event.preventDefault();
                  discoveryRef.current?.scrollIntoView({ behavior: getMotionSafeScrollBehavior(), block: 'start' });
                }}>
                Khám phá nhà hàng <Icon name="arrowRight" size={18} />
              </a>
              {user ? <Link to={homePathFor(user)} className="btn btn--outline btn--lg">
                Trang {ROLE_LABEL[user.role]?.toLowerCase() || 'của tôi'}
              </Link> : <Link to="/login" className="btn btn--outline btn--lg">Đăng nhập</Link>}
            </div>
            <div className="tf-hero__metrics" aria-label="Các bước khám phá món">
              <div className="tf-hero__metric"><strong>Tìm quán</strong><span>Chọn theo khẩu vị</span></div>
              <div className="tf-hero__metric"><strong>Xem thực đơn</strong><span>Giá và món rõ ràng</span></div>
              <div className="tf-hero__metric"><strong>Chọn món</strong><span>Lưu danh sách tạm thời</span></div>
            </div>
          </div>

          <div className="tf-spotlight" role="region" aria-label="Nhà hàng nổi bật"
            onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}>
            <div className="tf-spotlight__card" aria-atomic="true">
              <div className="tf-spotlight__media">
                {spotlight && getSmartRestaurantCover(spotlight)
                  ? <img src={getSmartRestaurantCover(spotlight)} alt="" />
                  : <div className="tf-spotlight__placeholder"><Icon name="store" size={42} /></div>}
                {spotlight && <div className="tf-spotlight__overlay-top">
                  <span className={'tf-spotlight__availability' + (spotlight.open ? ' is-open' : '')}>
                    <Icon name={spotlight.open ? 'checkCircle' : 'pauseCircle'} size={15} />
                    {spotlight.open ? 'Đang phục vụ' : 'Tạm đóng'}
                  </span>
                </div>}
              </div>
              <div className="tf-spotlight__body">
                {spotlight ? (
                  <>
                    <div className="tf-spotlight__meta"><span>{spotlight.areaName || spotlight.province || 'Nhà hàng'}</span></div>
                    <h2 className="tf-spotlight__title" title={spotlight.restaurantName || 'Nhà hàng'}>
                      {spotlight.restaurantName || 'Nhà hàng'}
                    </h2>
                    <p className="tf-spotlight__description">
                      {spotlight.specialty || 'Khám phá các món đang phục vụ tại nhà hàng.'}
                    </p>
                    <div className="tf-spotlight__footer">
                      <div className="tf-spotlight__price"><small>Phí giao hàng</small><strong>{formatVND(spotlight.deliveryFee)}</strong></div>
                      <Link to={'/restaurants/' + spotlight.id} className="btn btn--primary">Xem thực đơn <Icon name="arrowRight" size={15} /></Link>
                    </div>
                  </>
                ) : (
                  <div className="tf-spotlight__empty"><h2>Khám phá thực đơn</h2><p>Danh sách quán sẽ xuất hiện khi dữ liệu sẵn sàng.</p></div>
                )}
              </div>
            </div>
            {restaurants.length > 1 && <div className="tf-spotlight__nav">
              <div className="tf-spotlight__position">
                <span>{activeSlide + 1}</span>
                <span aria-hidden="true">/</span>
                <span>{restaurants.length}</span>
                <progress className="tf-spotlight__progress" value={activeSlide + 1} max={restaurants.length}
                  aria-label={`Đang xem quán ${activeSlide + 1} trong ${restaurants.length}`} />
              </div>
              <div className="tf-spotlight__arrows">
                <button type="button" className="tf-spotlight__arrow"
                  onClick={() => setActiveSlide((index) => (index - 1 + restaurants.length) % restaurants.length)} aria-label="Quán trước">
                  <Icon name="chevronLeft" size={16} />
                </button>
                <button type="button" className="tf-spotlight__arrow"
                  onClick={() => setActiveSlide((index) => (index + 1) % restaurants.length)} aria-label="Quán tiếp theo">
                  <Icon name="chevronRight" size={16} />
                </button>
              </div>
            </div>}
          </div>
        </div>
      </section>
      <div id="explore-restaurants" ref={discoveryRef}>
        <RestaurantListSection title="Khám phá nhà hàng & món ngon hôm nay" externalKeyword={passedKeyword} />
      </div>
    </>
  );
}
