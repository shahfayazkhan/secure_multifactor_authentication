import { useEffect, useState } from 'react';
import { Clock, History } from 'lucide-react';
import { Button, Card, EmptyState, Spinner } from '../components/ui';
import { accountApi } from '../api/client';
import { useToast } from '../context/ToastContext';
import { EVENTS, formatDate, timeAgo } from '../utils/format';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'signin', label: 'Sign-ins', types: ['LOGIN_SUCCESS', 'MFA_SUCCESS', 'LOGOUT', 'MFA_CHALLENGE'] },
  { key: 'alerts', label: 'Alerts', types: ['LOGIN_FAILED', 'ACCOUNT_LOCKED', 'MFA_FAILED', 'BACKUP_CODE_USED'] },
  { key: 'changes', label: 'Changes', types: ['MFA_ENABLED', 'MFA_DISABLED', 'BACKUP_CODES_REGENERATED', 'PASSWORD_CHANGED', 'PROFILE_UPDATED', 'SESSION_REVOKED', 'SESSIONS_REVOKED_ALL', 'REGISTER'] },
];

export default function Activity() {
  const toast = useToast();
  const [events, setEvents] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    accountApi
      .activity()
      .then((d) => {
        setEvents(d.events);
        setHasMore(d.hasMore);
      })
      .catch((e) => {
        toast.error(e.message);
        setEvents([]);
      });
  }, [toast]);

  const more = async () => {
    setLoadingMore(true);
    try {
      const d = await accountApi.activity(events[events.length - 1].createdAt);
      setEvents((e) => [...e, ...d.events]);
      setHasMore(d.hasMore);
    } finally {
      setLoadingMore(false);
    }
  };

  const active = FILTERS.find((f) => f.key === filter);
  const shown = events?.filter((e) => !active.types || active.types.includes(e.type));

  return (
    <div className="stack-lg">
      <div className="page-head">
        <div>
          <h2>Activity log</h2>
          <p className="muted">Security events on your account from the last 90 days.</p>
        </div>
        <div className="segmented">
          {FILTERS.map((f) => (
            <button key={f.key} className={filter === f.key ? 'active' : ''} onClick={() => setFilter(f.key)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <Card padded={false}>
        {!events ? (
          <div className="center-pad"><Spinner /></div>
        ) : shown.length === 0 ? (
          <EmptyState icon={History} title="Nothing here yet">No events match this filter.</EmptyState>
        ) : (
          <ul className="event-list">
            {shown.map((e) => {
              const meta = EVENTS[e.type] || { label: e.type, icon: Clock, tone: 'neutral' };
              const Icon = meta.icon;
              return (
                <li key={e.id}>
                  <span className={`event-icon tone-${meta.tone}`}><Icon size={16} /></span>
                  <div className="event-main">
                    <strong>{meta.label}</strong>
                    <small>
                      {e.browser} · {e.os} · {e.ip}
                      {e.meta?.method && ` · via ${e.meta.method === 'backup' ? 'backup code' : 'authenticator'}`}
                    </small>
                  </div>
                  <div className="event-time">
                    <span>{timeAgo(e.createdAt)}</span>
                    <small className="muted">{formatDate(e.createdAt)}</small>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {hasMore && (
          <div className="card-foot">
            <Button variant="secondary" loading={loadingMore} onClick={more}>Load more</Button>
          </div>
        )}
      </Card>
    </div>
  );
}
