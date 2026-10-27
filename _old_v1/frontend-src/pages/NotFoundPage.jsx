import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';

export default function NotFoundPage() {
  return (
    <div className="status-page">
      <div className="status-page__icon">
        <Icon name="search" size={30} />
      </div>
      <span className="status-page__code">404</span>
      <h1>Không tìm thấy trang</h1>
      <p>Đường dẫn bạn truy cập không tồn tại hoặc đã bị thay đổi.</p>
      <Link to="/" className="btn btn--primary">
        Về trang chủ
      </Link>
    </div>
  );
}
