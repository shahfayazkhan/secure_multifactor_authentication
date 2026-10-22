import { useCallback, useEffect, useState } from 'react';
import { Monitor, Smartphone, Tablet, LogOut, ShieldCheck, RefreshCw } from 'lucide-react';
import { Badge, Button, Card, EmptyState, Modal, Spinner } from '../components/ui';
import { sessionApi } from '../api/client';
import { useToast } from '../context/ToastContext';
import { formatDate, timeAgo } from '../utils/format';

const DEVICE_ICONS = { mobile: Smartphone, tablet: Tablet };

export default function Sessions() {
  const toast = useToast();
  const [sessions, setSessions] = useState(null);
  const [busy, setBusy] = useState(null);
  const [confirmAll, setConfirmAll] = useState(false);

  const load = useCallback(async () => {
    try {
      const { sessions: list } = await sessionApi.list();
      setSessions(list);
    } catch (err) {
      toast.error(err.message);
      setSessions([]);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const revoke = async (id) => {
    setBusy(id);
    try {
      await sessionApi.revoke(id);
      setSessions((s) => s.filter((x) => x.id !== id));
      toast.success('Device signed out.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  };

  const revokeAll = async () => {
    setBusy('all');
    try {
      const { revoked } = await sessionApi.revokeOthers();
      toast.success(`Signed out ${revoked} other session${revoked === 1 ? '' : 's'}.`);
      setConfirmAll(false);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  };

  const others = sessions?.filter((s) => !s.current).length ?? 0;

  return (
    <div className="stack-lg">
      <div className="page-head">
        <div>
          <h2>Devices & sessions</h2>
          <p className="muted">These devices are currently signed in to your account. Sign out any you don’t recognise.</p>
        </div>
        <div className="page-actions">
          <Button variant="secondary" icon={RefreshCw} onClick={load}>Refresh</Button>
          <Button variant="danger-outline" icon={LogOut} disabled={!others} onClick={() => setConfirmAll(true)}>
            Sign out all others
          </Button>
        </div>
      </div>

      <Card padded={false}>
        {!sessions ? (
          <div className="center-pad"><Spinner /></div>
        ) : sessions.length === 0 ? (
          <EmptyState icon={Monitor} title="No active sessions" />
        ) : (
          <ul className="session-list">
            {sessions.map((s) => {
              const Icon = DEVICE_ICONS[s.deviceType] || Monitor;
              return (
                <li key={s.id} className={s.current ? 'current' : ''}>
                  <span className="session-icon"><Icon size={20} /></span>
                  <div className="session-main">
                    <div className="session-title">
                      <strong>{s.browser} on {s.os}</strong>
                      {s.current && <Badge tone="success" dot>This device</Badge>}
                      {s.mfa && <Badge tone="info"><ShieldCheck size={12} /> 2FA</Badge>}
                      {s.remembered && <Badge tone="neutral">Remembered</Badge>}
                    </div>
                    <div className="session-meta">
                      <span>{s.ip || 'Unknown IP'}</span>
                      <span>Signed in {formatDate(s.createdAt)}</span>
                      <span>Active {timeAgo(s.lastSeenAt)}</span>
                    </div>
                  </div>
                  {!s.current && (
                    <Button variant="ghost" size="sm" icon={LogOut} loading={busy === s.id} onClick={() => revoke(s.id)}>
                      Sign out
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Modal
        open={confirmAll}
        onClose={() => setConfirmAll(false)}
        size="sm"
        title="Sign out all other devices?"
        description={`${others} other session${others === 1 ? '' : 's'} will be ended immediately. You’ll stay signed in here.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmAll(false)}>Cancel</Button>
            <Button variant="danger" loading={busy === 'all'} onClick={revokeAll}>Sign out others</Button>
          </>
        }
      />
    </div>
  );
}
