import { Outlet } from 'react-router-dom';
import { ShieldCheck, Smartphone, KeyRound, MonitorSmartphone } from 'lucide-react';
import Logo from '../components/Logo';

const FEATURES = [
  { icon: Smartphone, title: 'Authenticator app 2FA', text: 'Time-based one-time codes (TOTP) from Google Authenticator, Authy, 1Password and more.' },
  { icon: KeyRound, title: 'One-time backup codes', text: 'Never get locked out — recovery codes work when your phone doesn’t.' },
  { icon: MonitorSmartphone, title: 'Session control', text: 'See every signed-in device and sign them out remotely.' },
];

export default function AuthLayout() {
  return (
    <div className="auth-shell">
      <aside className="auth-brand">
        <div className="auth-brand-inner">
          <Logo light />
          <div className="auth-hero">
            <span className="eyebrow">
              <ShieldCheck size={14} /> Multi-factor authentication
            </span>
            <h1>Security that stays out of your way.</h1>
            <p>Protect your account with a password and a second factor only you have.</p>
          </div>
          <ul className="auth-features">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title}>
                <span className="feature-icon">
                  <Icon size={18} />
                </span>
                <div>
                  <strong>{title}</strong>
                  <p>{text}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="auth-foot">© {new Date().getFullYear()} SFK Secure. All rights reserved.</p>
        </div>
        <div className="auth-glow" aria-hidden="true" />
      </aside>
      <main className="auth-main">
        <div className="auth-mobile-logo">
          <Logo />
        </div>
        <div className="auth-card">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
