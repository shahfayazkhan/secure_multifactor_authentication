import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ShieldAlert, KeyRound, MonitorSmartphone, Clock, ArrowRight, Check, Circle } from 'lucide-react';
import { Badge, Button, Card, EmptyState, Spinner } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { accountApi, sessionApi, twoFactorApi } from '../api/client';
import { EVENTS, timeAgo } from '../utils/format';

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    let alive = true;
    Promise.all([twoFactorApi.status(), sessionApi.list(), accountApi.activity()])
      .then(([mfa, s, a]) => alive && setData({ mfa, sessions: s.sessions, events: a.events.slice(0, 6) }))
      .catch(() => alive && setData({ mfa: null, sessions: [], events: [] }));
    return () => {
      alive = false;
    };
  }, []);

  const checks = [
    { label: 'Strong password set', done: true },
    { label: 'Two-factor authentication enabled', done: user.twoFactorEnabled },
    { label: 'Backup codes available', done: (data?.mfa?.backupCodesRemaining ?? 0) > 0 },
    { label: 'Signed in on a single device', done: (data?.sessions?.length ?? 1) <= 1 },
  ];
  const score = Math.round((checks.filter((c) => c.done).length / checks.length) * 100);
  const tone = score >= 75 ? 'success' : score >= 50 ? 'warning' : 'danger';

  return (
    <div className="stack-lg">
      <div className="page-head">
        <div>
          <h2>Good to see you, {user.name.split(' ')[0]}</h2>
          <p className="muted">Here’s an overview of your account security.</p>
        </div>
      </div>

      {!user.twoFactorEnabled && (
        <div className="banner banner-warning">
          <ShieldAlert size={22} />
          <div>
            <strong>Your account isn’t protected by two-factor authentication.</strong>
            <p>Anyone with your password can sign in. Turn on 2FA in under a minute.</p>
          </div>
          <Link to="/security?setup=1">
            <Button size="sm">Enable 2FA</Button>
          </Link>
        </div>
      )}

      <div className="grid-4">
        <Stat icon={ShieldCheck} label="Two-factor" value={user.twoFactorEnabled ? 'Enabled' : 'Disabled'} tone={user.twoFactorEnabled ? 'success' : 'danger'} />
        <Stat icon={KeyRound} label="Backup codes left" value={data ? (user.twoFactorEnabled ? data.mfa?.backupCodesRemaining ?? '—' : '—') : '…'} tone="info" />
        <Stat icon={MonitorSmartphone} label="Active sessions" value={data ? data.sessions.length : '…'} tone="neutral" />
        <Stat icon={Clock} label="Last sign-in" value={timeAgo(user.lastLoginAt)} tone="neutral" />
      </div>

      <div className="grid-2">
        <Card title="Security score" description="Complete these steps to fully protect your account.">
          <div className="score">
            <div className={`score-ring tone-${tone}`} style={{ '--p': score }}>
              <span>{score}%</span>
            </div>
            <ul className="checklist">
              {checks.map((c) => (
                <li key={c.label} className={c.done ? 'done' : ''}>
                  {c.done ? <Check size={16} /> : <Circle size={16} />}
                  {c.label}
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <Card
          title="Recent activity"
          actions={
            <Link to="/activity" className="link">
              View all <ArrowRight size={14} />
            </Link>
          }
          padded={false}
        >
          {!data ? (
            <div className="center-pad"><Spinner /></div>
          ) : data.events.length === 0 ? (
            <EmptyState title="No activity yet" />
          ) : (
            <ul className="event-list compact">
              {data.events.map((e) => {
                const meta = EVENTS[e.type] || { label: e.type, icon: Clock, tone: 'neutral' };
                const Icon = meta.icon;
                return (
                  <li key={e.id}>
                    <span className={`event-icon tone-${meta.tone}`}><Icon size={15} /></span>
                    <div className="event-main">
                      <strong>{meta.label}</strong>
                      <small>{e.browser} · {e.os}</small>
                    </div>
                    <span className="muted small">{timeAgo(e.createdAt)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone }) {
  return (
    <div className="stat">
      <span className={`stat-icon tone-${tone}`}><Icon size={18} /></span>
      <div>
        <span className="stat-label">{label}</span>
        <strong className="stat-value">{value}</strong>
      </div>
      {tone === 'danger' && <Badge tone="danger">Action needed</Badge>}
    </div>
  );
}
