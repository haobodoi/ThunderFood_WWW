import { useAuth } from '../../context/AuthContext.jsx';
import AccountInfoCard from '../../components/AccountInfoCard.jsx';
import Icon from '../../components/Icon.jsx';

export default function CustomerHomePage() {
  const { user } = useAuth();

  return (
    <div className="container section">
      <div className="welcome-card">
        <div>
          <span className="welcome-card__eyebrow">Khách hàng</span>
          <h1>Xin chào, {user.fullName}!</h1>
          <p className="muted">Bạn đã đăng nhập thành công với vai trò khách hàng.</p>
        </div>
        <div className="welcome-card__icon">
          <Icon name="utensils" size={34} />
        </div>
      </div>

      <AccountInfoCard user={user} />
    </div>
  );
}
