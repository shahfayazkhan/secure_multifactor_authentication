import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FullPageLoader } from './ui';

/** Only fully authenticated users (password + 2FA when enabled). */
export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <FullPageLoader />;
  if (status === 'mfa') return <Navigate to="/verify" replace />;
  if (status !== 'authed') return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

/** Login / register — signed-in users go to the app. */
export function GuestRoute() {
  const { status } = useAuth();
  if (status === 'loading') return <FullPageLoader />;
  if (status === 'authed') return <Navigate to="/dashboard" replace />;
  if (status === 'mfa') return <Navigate to="/verify" replace />;
  return <Outlet />;
}

/** The 2FA challenge screen is only reachable while a challenge is pending. */
export function MfaRoute() {
  const { status } = useAuth();
  if (status === 'loading') return <FullPageLoader />;
  if (status === 'authed') return <Navigate to="/dashboard" replace />;
  if (status !== 'mfa') return <Navigate to="/login" replace />;
  return <Outlet />;
}
