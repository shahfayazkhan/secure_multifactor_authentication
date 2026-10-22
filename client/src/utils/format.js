import {
  LogIn,
  LogOut,
  ShieldCheck,
  ShieldOff,
  ShieldAlert,
  KeyRound,
  UserPlus,
  Lock,
  MonitorX,
  RefreshCw,
  UserCog,
  Smartphone,
} from 'lucide-react';

export function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function timeAgo(d) {
  if (!d) return '—';
  const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 45) return 'just now';
  const units = [
    ['year', 31536000],
    ['month', 2592000],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  for (const [name, secs] of units) {
    const v = Math.floor(s / secs);
    if (v >= 1) return `${v} ${name}${v > 1 ? 's' : ''} ago`;
  }
  return 'just now';
}

/** Presentation for each audit event type. tone ∈ success | danger | warning | info | neutral */
export const EVENTS = {
  REGISTER: { label: 'Account created', icon: UserPlus, tone: 'info' },
  LOGIN_SUCCESS: { label: 'Signed in', icon: LogIn, tone: 'success' },
  LOGIN_FAILED: { label: 'Failed sign-in attempt', icon: ShieldAlert, tone: 'danger' },
  ACCOUNT_LOCKED: { label: 'Account temporarily locked', icon: Lock, tone: 'danger' },
  MFA_CHALLENGE: { label: 'Password accepted, 2FA requested', icon: Smartphone, tone: 'neutral' },
  MFA_SUCCESS: { label: 'Signed in with 2FA', icon: ShieldCheck, tone: 'success' },
  MFA_FAILED: { label: 'Incorrect 2FA code', icon: ShieldAlert, tone: 'warning' },
  BACKUP_CODE_USED: { label: 'Backup code used', icon: KeyRound, tone: 'warning' },
  MFA_ENABLED: { label: 'Two-factor authentication enabled', icon: ShieldCheck, tone: 'success' },
  MFA_DISABLED: { label: 'Two-factor authentication disabled', icon: ShieldOff, tone: 'danger' },
  BACKUP_CODES_REGENERATED: { label: 'Backup codes regenerated', icon: RefreshCw, tone: 'info' },
  LOGOUT: { label: 'Signed out', icon: LogOut, tone: 'neutral' },
  SESSION_REVOKED: { label: 'Signed out a device', icon: MonitorX, tone: 'info' },
  SESSIONS_REVOKED_ALL: { label: 'Signed out all other devices', icon: MonitorX, tone: 'info' },
  PASSWORD_CHANGED: { label: 'Password changed', icon: Lock, tone: 'info' },
  PROFILE_UPDATED: { label: 'Profile updated', icon: UserCog, tone: 'neutral' },
};
