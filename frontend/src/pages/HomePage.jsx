import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { homePathFor } from '../utils/roleUtils.js';
import { HERO_MARQUEE_ROW_1 } from '../utils/mediaUtils.js';
import { getMotionSafeScrollBehavior } from '../utils/motionUtils.js';
import Icon from '../components/Icon.jsx';
import RestaurantListSection from '../components/RestaurantListSection.jsx';

const QUICK_SEARCHES = ['Cơm tấm', 'Bún chả', 'Bún bò', 'Gà rán', 'Trà sữa'];

export default function HomePage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [keyword, setKeyword] = useState('');
  const discoveryRef = useRef(null);
  const discover = () => discoveryRef.current?.scrollIntoView({ behavior: getMotionSafeScrollBehavior(), block: 'start' });
  const handleSearch = event => {
    event.preventDefault();
    setKeyword(search.trim());
    discover();
  };
  const quickSearch = term => {
    setSearch(term);
    setKeyword(term);
    discover();
  };
  return <>
    <section className="home-hero">
      <div className="container home-hero__grid">
        <div className="home-hero__copy">
          <p className="home-hero__eyebrow">THUNDERFOOD · ĐỒ ĂN BẠN YÊU</p>
          <h1>Món ngon đang <span>ở rất gần.</span></h1>
          <p>Khám phá quán yêu thích, chọn món hợp khẩu vị và thưởng thức theo cách của bạn.</p>
          <form className="home-hero__search" onSubmit={handleSearch}>
            <Icon name="search" size={20} />
            <input id="home-hero-search" name="heroSearch" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Tìm quán hoặc món ăn" aria-label="Tìm quán hoặc món ăn" />
            <button className="btn btn--primary" type="submit">Tìm kiếm</button>
          </form>
          <div className="home-hero__quick-search" aria-label="Tìm kiếm nhanh">
            <span>Tìm nhanh:</span>
            {QUICK_SEARCHES.map(term => <button key={term} type="button" onClick={() => quickSearch(term)}>{term}</button>)}
          </div>
          <div className="home-hero__links"><button type="button" className="home-hero__discover" onClick={discover}>Khám phá nhà hàng <Icon name="arrowRight" size={17} /></button><Link to={user ? homePathFor(user) : '/login'}>{user ? 'Tài khoản của tôi' : 'Đăng nhập'}</Link></div>
        </div>
        <div className="home-hero__image"><img src={HERO_MARQUEE_ROW_1[1].image} alt="" /><div className="home-hero__caption">Một bữa ngon<br /><strong>bắt đầu từ đây.</strong></div></div>
      </div>
    </section>
    <div id="explore-restaurants" ref={discoveryRef}>
      <RestaurantListSection title="Khám phá nhà hàng & món ngon hôm nay" externalKeyword={keyword} />
    </div>
  </>;
}
