import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShieldCheck,
  MonitorSmartphone,
  History,
  UserCog,
  LogOut,
  Menu,
  ChevronDown,
} from 'lucide-react';
import Logo from '../components/Logo';
import { Badge } from '../components/ui';
import SessionTimeout from '../components/SessionTimeout';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/security', label: 'Security', icon: ShieldCheck },
  { to: '/sessions', label: 'Devices & sessions', icon: MonitorSmartphone },
  { to: '/activity', label: 'Activity log', icon: History },
  { to: '/account', label: 'Account', icon: UserCog },
];

const initials = (name = '') =>
  name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

export default function AppLayout() {
  const { user, logout } = useAuth();
  const [navOpen, setNavOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  // A deliberate sign-out lands on a clean login page (no "return to" page).
  const signOut = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    setNavOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onClick = (e) => menuRef.current && !menuRef.current.contains(e.target) && setMenuOpen(false);
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const current = NAV.find((n) => location.pathname.startsWith(n.to));

  return (
    <div className={`app-shell ${navOpen ? 'nav-open' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-top">
          <Logo light />
        </div>
        <nav className="sidebar-nav">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className={`mfa-pill ${user?.twoFactorEnabled ? 'on' : 'off'}`}>
            <ShieldCheck size={16} />
            <div>
              <strong>2FA {user?.twoFactorEnabled ? 'enabled' : 'disabled'}</strong>
              <span>{user?.twoFactorEnabled ? 'Your account is protected' : 'Turn it on in Security'}</span>
            </div>
          </div>
        </div>
      </aside>
      <div className="sidebar-scrim" onClick={() => setNavOpen(false)} />

      <div className="app-main">
        <header className="topbar">
          <button className="icon-btn nav-toggle" onClick={() => setNavOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
          <h1 className="topbar-title">{current?.label || 'Dashboard'}</h1>
          <div className="topbar-right">
            {!user?.twoFactorEnabled && (
              <NavLink to="/security" className="topbar-cta">
                <Badge tone="warning" dot>2FA off</Badge>
              </NavLink>
            )}
            <div className="user-menu" ref={menuRef}>
              <button className="user-btn" onClick={() => setMenuOpen((o) => !o)} aria-expanded={menuOpen}>
                <span className="avatar">{initials(user?.name)}</span>
                <span className="user-meta">
                  <strong>{user?.name}</strong>
                  <small>{user?.email}</small>
                </span>
                <ChevronDown size={16} />
              </button>
              {menuOpen && (
                <div className="dropdown">
                  <NavLink to="/account" className="dropdown-item">
                    <UserCog size={16} /> Account settings
                  </NavLink>
                  <NavLink to="/security" className="dropdown-item">
                    <ShieldCheck size={16} /> Security
                  </NavLink>
                  <div className="dropdown-sep" />
                  <button className="dropdown-item danger" onClick={signOut}>
                    <LogOut size={16} /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="page">
          <Outlet />
        </main>
      </div>
      <SessionTimeout />
    </div>
  );
}
