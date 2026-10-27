import { Outlet } from 'react-router-dom';
import Navbar from './Navbar.jsx';

export default function PublicLayout() {
  return (
    <div className="public-layout">
      <Navbar />
      <main className="public-layout__main">
        <Outlet />
      </main>
      <footer className="footer">
        <div className="container footer__inner">
          <span>© {new Date().getFullYear()} ThunderFood · Nhóm 12</span>
          <span>Website đặt đồ ăn trực tuyến</span>
        </div>
      </footer>
    </div>
  );
}
