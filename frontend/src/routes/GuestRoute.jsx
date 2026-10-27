import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import FullPageLoader from '../components/FullPageLoader.jsx';
import { canAccessPath, homePathFor } from '../utils/roleUtils.js';

export default function GuestRoute() {
  const { user, initializing } = useAuth();
  const location = useLocation();

  if (initializing) return <FullPageLoader />;

  if (user) {
    const from = location.state?.from;
    const target = canAccessPath(user, from) ? from : homePathFor(user);
    return <Navigate to={target} replace />;
  }

  return <Outlet />;
}
