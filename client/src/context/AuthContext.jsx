import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { authApi, clearCsrfToken } from '../api/client';

const AuthContext = createContext(null);

/**
 * status:
 *  - 'loading'  bootstrapping
 *  - 'guest'    not signed in
 *  - 'mfa'      password accepted, waiting for the 2FA code
 *  - 'authed'   fully signed in
 */
export function AuthProvider({ children }) {
  const [status, setStatus] = useState('loading');
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [mfaExpiresAt, setMfaExpiresAt] = useState(null);
  const [expiredReason, setExpiredReason] = useState(null);

  const applyAuthed = useCallback((data) => {
    setUser(data.user);
    setSession(data.session || null);
    setMfaExpiresAt(null);
    setExpiredReason(null);
    setStatus('authed');
  }, []);

  const bootstrap = useCallback(async () => {
    try {
      const data = await authApi.session();
      if (data.authenticated) applyAuthed(data);
      else if (data.mfaPending) {
        setMfaExpiresAt(data.mfaPending.expiresAt);
        setStatus('mfa');
      } else setStatus('guest');
    } catch {
      setStatus('guest');
    }
  }, [applyAuthed]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  // Server says our session is gone (expired, revoked from another device, password changed…)
  const statusRef = useRef(status);
  statusRef.current = status;

  useEffect(() => {
    const onExpired = (e) => {
      if (statusRef.current !== 'authed') return;
      setExpiredReason(e.detail?.message || 'Your session has ended. Please sign in again.');
      setUser(null);
      setSession(null);
      setStatus('guest');
    };
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, []);

  const login = useCallback(
    async ({ email, password, remember }) => {
      const data = await authApi.login({ email, password, remember });
      if (data.mfaRequired) {
        setMfaExpiresAt(data.expiresAt);
        setStatus('mfa');
        return { mfaRequired: true };
      }
      applyAuthed(data);
      return { mfaRequired: false };
    },
    [applyAuthed]
  );

  const verifyMfa = useCallback(
    async (code) => {
      const data = await authApi.verifyMfa(code);
      applyAuthed(data);
      return data;
    },
    [applyAuthed]
  );

  const cancelMfa = useCallback(async () => {
    try {
      await authApi.cancelMfa();
    } finally {
      setMfaExpiresAt(null);
      setStatus('guest');
    }
  }, []);

  const register = useCallback(
    async (body) => {
      const data = await authApi.register(body);
      applyAuthed(data);
      return data;
    },
    [applyAuthed]
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      clearCsrfToken();
      setUser(null);
      setSession(null);
      setStatus('guest');
    }
  }, []);

  const refresh = useCallback(async () => {
    const data = await authApi.me();
    setUser(data.user);
    setSession(data.session);
    return data;
  }, []);

  const value = useMemo(
    () => ({
      status,
      user,
      session,
      mfaExpiresAt,
      expiredReason,
      clearExpiredReason: () => setExpiredReason(null),
      setUser,
      login,
      verifyMfa,
      cancelMfa,
      register,
      logout,
      refresh,
      resetToGuest: () => {
        clearCsrfToken();
        setStatus('guest');
      },
    }),
    [status, user, session, mfaExpiresAt, expiredReason, login, verifyMfa, cancelMfa, register, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
