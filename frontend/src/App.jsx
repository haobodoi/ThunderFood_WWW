import { Route, Routes } from 'react-router-dom';
import PublicLayout from './layouts/PublicLayout.jsx';
import DashboardLayout from './layouts/DashboardLayout.jsx';
import ScrollToTop from './components/ScrollToTop.jsx';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import GuestRoute from './routes/GuestRoute.jsx';
import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import ForbiddenPage from './pages/ForbiddenPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import CustomerHomePage from './pages/customer/CustomerHomePage.jsx';
import MyRestaurantsPage from './pages/partner/MyRestaurantsPage.jsx';
import RestaurantRegisterPage from './pages/partner/RestaurantRegisterPage.jsx';
import RestaurantDetailPage from './pages/customer/RestaurantDetailPage.jsx';
import RestaurantMenuPage from './pages/partner/RestaurantMenuPage.jsx';
import AdminHomePage from './pages/admin/AdminHomePage.jsx';
import RestaurantReviewListPage from './pages/admin/RestaurantReviewListPage.jsx';
import RestaurantReviewDetailPage from './pages/admin/RestaurantReviewDetailPage.jsx';
import CartPage from './pages/customer/CartPage.jsx';
import ReviewManagementPage from './pages/ReviewManagementPage.jsx';
import CheckoutPage from './pages/customer/CheckoutPage.jsx';
import OrdersPage from './pages/customer/OrdersPage.jsx';
import OrderDetailPage from './pages/customer/OrderDetailPage.jsx';
import PartnerOrdersPage from './pages/partner/PartnerOrdersPage.jsx';
import { ROLES } from './utils/roleUtils.js';

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/restaurants/:id" element={<RestaurantDetailPage />} />

          <Route element={<GuestRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          <Route element={<ProtectedRoute roles={[ROLES.CUSTOMER]} />}>
            <Route path="/customer" element={<CustomerHomePage />} />
            <Route path="/customer/cart" element={<CartPage />} />
            <Route path="/customer/checkout/:cartId" element={<CheckoutPage />} />
            <Route path="/customer/orders" element={<OrdersPage />} />
            <Route path="/customer/orders/:id" element={<OrderDetailPage />} />
            <Route path="/customer/reviews" element={<ReviewManagementPage />} />
          </Route>

          <Route path="/403" element={<ForbiddenPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route element={<ProtectedRoute roles={[ROLES.RESTAURANT_PARTNER]} />}>
          <Route element={<DashboardLayout area="partner" />}>
            <Route path="/partner" element={<MyRestaurantsPage />} />
            <Route path="/partner/orders" element={<PartnerOrdersPage />} />
            <Route path="/partner/reviews" element={<ReviewManagementPage area="partner" />} />
            <Route path="/partner/restaurants/:restaurantId/menu" element={<RestaurantMenuPage />} />
            <Route path="/partner/register" element={<RestaurantRegisterPage />} />
            <Route path="/partner/register/:id" element={<RestaurantRegisterPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute roles={[ROLES.ADMIN]} />}>
          <Route element={<DashboardLayout area="admin" />}>
            <Route path="/admin" element={<AdminHomePage />} />
            <Route path="/admin/review-reports" element={<ReviewManagementPage area="admin" />} />
            <Route path="/admin/restaurants" element={<RestaurantReviewListPage />} />
            <Route path="/admin/restaurants/:id" element={<RestaurantReviewDetailPage />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}
