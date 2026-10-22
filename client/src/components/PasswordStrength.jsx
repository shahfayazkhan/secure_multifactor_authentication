import { Check, X } from 'lucide-react';

export const passwordRules = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'One number', test: (p) => /\d/.test(p) },
];

export const isStrongPassword = (p) => passwordRules.every((r) => r.test(p));

function score(p) {
  let s = passwordRules.filter((r) => r.test(p)).length;
  if (p.length >= 12) s += 1;
  if (/[^A-Za-z0-9]/.test(p)) s += 1;
  return Math.min(s, 6);
}

const LEVELS = [
  { min: 0, label: 'Too weak', tone: 'danger' },
  { min: 3, label: 'Weak', tone: 'warning' },
  { min: 4, label: 'Good', tone: 'info' },
  { min: 5, label: 'Strong', tone: 'success' },
];

export default function PasswordStrength({ password }) {
  if (!password) return null;
  const s = score(password);
  const level = [...LEVELS].reverse().find((l) => s >= l.min);
  return (
    <div className="pw-strength">
      <div className="pw-bar">
        {Array.from({ length: 6 }).map((_, i) => (
          <span key={i} className={i < s ? `on tone-${level.tone}` : ''} />
        ))}
      </div>
      <div className="pw-meta">
        <span className={`pw-label tone-${level.tone}`}>{level.label}</span>
      </div>
      <ul className="pw-rules">
        {passwordRules.map((r) => {
          const ok = r.test(password);
          return (
            <li key={r.label} className={ok ? 'ok' : ''}>
              {ok ? <Check size={13} /> : <X size={13} />} {r.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
