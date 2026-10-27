import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLE_LABEL, homePathFor } from '../utils/roleUtils.js';
import Icon from '../components/Icon.jsx';

export default function HomePage() {
  const { user } = useAuth();

  return (
    <>
      <section className="hero">
        <div className="container hero__inner">
          <span className="hero__badge">
            <Icon name="bolt" size={14} strokeWidth={2.6} />
            Giao nhanh như sấm
          </span>
          <h1 className="hero__title">
            Món ngon từ nhà hàng quanh bạn,
            <br />
            <span>giao tận nơi.</span>
          </h1>
          <p className="hero__subtitle">
            ThunderFood kết nối khách hàng với nhiều nhà hàng trên cùng một nền tảng: tìm món, đặt hàng, thanh
            toán và theo dõi đơn chỉ trong vài bước.
          </p>

          <div className="hero__actions">
            {user ? (
              <>
                <Link to={homePathFor(user)} className="btn btn--primary btn--lg">
                  Vào trang {ROLE_LABEL[user.role].toLowerCase()}
                  <Icon name="arrowRight" size={18} />
                </Link>
                <span className="hero__hello">Xin chào, {user.fullName}!</span>
              </>
            ) : (
              <>
                <Link to="/register" className="btn btn--primary btn--lg">
                  Đăng ký ngay
                  <Icon name="arrowRight" size={18} />
                </Link>
                <Link to="/login" className="btn btn--outline btn--lg">
                  Tôi đã có tài khoản
                </Link>
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
