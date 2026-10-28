import { useAuth } from '../../context/AuthContext.jsx';
import AccountInfoCard from '../../components/AccountInfoCard.jsx';
import Icon from '../../components/Icon.jsx';
import RestaurantListSection from '../../components/RestaurantListSection.jsx';

export default function CustomerHomePage() {
  const { user } = useAuth();
  return (
    <div className="customer-home">
      <div className="container customer-home__intro">
        <div className="welcome-card customer-home__welcome">
          <div>
            <h1>Xin chào, {user?.fullName || 'bạn'}!</h1>
            <p>Khám phá thực đơn và chọn món cho bữa ăn hôm nay.</p>
          </div>
          <div className="welcome-card__icon"><Icon name="utensils" size={32} /></div>
        </div>
      </div>
      <RestaurantListSection title="Khám phá nhà hàng" />
      <section className="container customer-home__account">
        <h2>Thông tin tài khoản của bạn</h2>
        <AccountInfoCard user={user} />
      </section>
    </div>
  );
}
