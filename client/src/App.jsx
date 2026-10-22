import { Navigate, Route, Routes } from 'react-router-dom';
import AuthLayout from './layouts/AuthLayout';
import AppLayout from './layouts/AppLayout';
import { GuestRoute, MfaRoute, ProtectedRoute } from './components/RouteGuards';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyTwoFactor from './pages/VerifyTwoFactor';
import Dashboard from './pages/Dashboard';
import Security from './pages/Security';
import Sessions from './pages/Sessions';
import Activity from './pages/Activity';
import Account from './pages/Account';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>
        <Route element={<MfaRoute />}>
          <Route path="/verify" element={<VerifyTwoFactor />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/security" element={<Security />} />
          <Route path="/sessions" element={<Sessions />} />
          <Route path="/activity" element={<Activity />} />
          <Route path="/account" element={<Account />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
