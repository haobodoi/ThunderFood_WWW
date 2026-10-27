import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { homePathFor } from '../utils/roles.js';
import Icon from '../components/Icon.jsx';

export default function ForbiddenPage() {
  const { user } = useAuth();
  return (
    <div className="status-page">
      <div className="status-page__icon status-page__icon--danger">
        <Icon name="lock" size={30} />
      </div>
      <span className="status-page__code">403</span>
      <h1>Bạn không có quyền truy cập trang này</h1>
      <p>Trang này dành cho vai trò khác. Hãy quay lại trang dành cho bạn.</p>
      <Link to={user ? homePathFor(user) : '/'} className="btn btn--primary">
        {user ? 'Về trang của tôi' : 'Về trang chủ'}
      </Link>
    </div>
  );
}
