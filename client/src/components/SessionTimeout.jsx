import { useCallback, useEffect, useRef, useState } from 'react';
import { Clock } from 'lucide-react';
import { Button, Modal } from './ui';
import { useAuth } from '../context/AuthContext';

const WARN_BEFORE_MS = 2 * 60 * 1000;

/**
 * Mirrors the server's sliding idle timeout. Every successful API call
 * resets the timer (the server's rolling cookie does the same). Shortly
 * before expiry we warn the user and let them extend the session.
 * Sessions with "Keep me signed in" are skipped.
 */
export default function SessionTimeout() {
  const { session, refresh, logout } = useAuth();
  const [warning, setWarning] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const deadline = useRef(0);

  const idleMs = session?.idleTimeoutMs;
  const enabled = Boolean(idleMs) && !session?.remember;

  const reset = useCallback(() => {
    if (!enabled) return;
    deadline.current = Date.now() + idleMs;
    setWarning(false);
  }, [enabled, idleMs]);

  useEffect(() => {
    if (!enabled) return undefined;
    reset();
    window.addEventListener('api:activity', reset);
    const tick = setInterval(() => {
      const left = deadline.current - Date.now();
      setRemaining(Math.max(0, left));
      if (left <= 0) {
        clearInterval(tick);
        logout();
      } else if (left <= WARN_BEFORE_MS) setWarning(true);
    }, 1000);
    return () => {
      window.removeEventListener('api:activity', reset);
      clearInterval(tick);
    };
  }, [enabled, reset, logout]);

  if (!warning) return null;
  const mm = Math.floor(remaining / 60000);
  const ss = String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0');

  return (
    <Modal
      open
      dismissible={false}
      size="sm"
      title="Are you still there?"
      footer={
        <>
          <Button variant="ghost" onClick={logout}>Sign out</Button>
          <Button onClick={() => refresh().catch(() => {})}>Stay signed in</Button>
        </>
      }
    >
      <div className="timeout-body">
        <div className="timeout-icon">
          <Clock size={22} />
        </div>
        <p>
          For your security, you’ll be signed out in <strong>{mm}:{ss}</strong> due to inactivity.
        </p>
      </div>
    </Modal>
  );
}
