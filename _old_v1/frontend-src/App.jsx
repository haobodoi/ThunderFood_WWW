import { Route, Routes } from 'react-router-dom';
import PublicLayout from './components/PublicLayout.jsx';
import DashboardLayout from './components/DashboardLayout.jsx';
import ScrollToTop from './components/ScrollToTop.jsx';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import GuestRoute from './routes/GuestRoute.jsx';
import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import ForbiddenPage from './pages/ForbiddenPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import CustomerHome from './pages/customer/CustomerHome.jsx';
import PartnerHome from './pages/partner/PartnerHome.jsx';
import AdminHome from './pages/admin/AdminHome.jsx';
import { ROLES } from './utils/roles.js';

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />

          <Route element={<GuestRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          <Route element={<ProtectedRoute roles={[ROLES.CUSTOMER]} />}>
            <Route path="/customer" element={<CustomerHome />} />
          </Route>

          <Route path="/403" element={<ForbiddenPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route element={<ProtectedRoute roles={[ROLES.RESTAURANT_PARTNER]} />}>
          <Route element={<DashboardLayout area="partner" />}>
            <Route path="/partner" element={<PartnerHome />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute roles={[ROLES.ADMIN]} />}>
          <Route element={<DashboardLayout area="admin" />}>
            <Route path="/admin" element={<AdminHome />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}
