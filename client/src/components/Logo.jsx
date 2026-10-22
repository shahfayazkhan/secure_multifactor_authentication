import { ShieldCheck } from 'lucide-react';

export default function Logo({ light = false }) {
  return (
    <div className={`logo ${light ? 'logo-light' : ''}`}>
      <span className="logo-mark">
        <ShieldCheck size={18} strokeWidth={2.4} />
      </span>
      <span className="logo-text">
        SFK <strong>Secure</strong>
      </span>
    </div>
  );
}
