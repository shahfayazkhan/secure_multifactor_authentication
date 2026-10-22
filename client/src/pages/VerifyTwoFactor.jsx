import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Smartphone, KeyRound, ArrowLeft } from 'lucide-react';
import { Alert, Button, Field, Input } from '../components/ui';
import OtpInput from '../components/OtpInput';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

function useCountdown(target) {
  const [left, setLeft] = useState(() => (target ? new Date(target) - Date.now() : 0));
  useEffect(() => {
    if (!target) return undefined;
    const t = setInterval(() => setLeft(new Date(target) - Date.now()), 1000);
    return () => clearInterval(t);
  }, [target]);
  return Math.max(0, left);
}

export default function VerifyTwoFactor() {
  const { verifyMfa, cancelMfa, mfaExpiresAt, resetToGuest } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [mode, setMode] = useState('totp'); // 'totp' | 'backup'
  const [code, setCode] = useState('');
  const [backup, setBackup] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const left = useCountdown(mfaExpiresAt);

  const submit = async (value) => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const data = await verifyMfa(value);
      if (data.usedBackupCode) {
        const n = data.backupCodesRemaining;
        toast.info(`Signed in with a backup code. ${n} code${n === 1 ? '' : 's'} left.`);
      }
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (['MFA_EXPIRED', 'MFA_TOO_MANY_ATTEMPTS'].includes(err.code)) {
        toast.error(err.message);
        resetToGuest();
        navigate('/login', { replace: true });
        return;
      }
      const remaining = err.details?.attemptsRemaining;
      setError(remaining != null ? `${err.message} ${remaining} attempt${remaining === 1 ? '' : 's'} left.` : err.message);
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  const back = async () => {
    await cancelMfa();
    navigate('/login', { replace: true });
  };

  const mm = Math.floor(left / 60000);
  const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, '0');

  return (
    <>
      <button className="link-btn back-link" onClick={back}>
        <ArrowLeft size={16} /> Back to sign in
      </button>

      <div className="auth-head center">
        <div className="auth-icon">{mode === 'totp' ? <Smartphone size={24} /> : <KeyRound size={24} />}</div>
        <h2>Two-factor authentication</h2>
        <p>
          {mode === 'totp'
            ? 'Open your authenticator app and enter the 6-digit code for SFK Secure.'
            : 'Enter one of the backup codes you saved when you set up 2FA. Each code works once.'}
        </p>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {mode === 'totp' ? (
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            if (code.length === 6) submit(code);
          }}
        >
          <OtpInput value={code} onChange={setCode} onComplete={submit} disabled={loading} error={Boolean(error)} />
          <Button type="submit" block size="lg" loading={loading} disabled={code.length !== 6}>
            Verify
          </Button>
        </form>
      ) : (
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            if (backup.trim()) submit(backup.trim());
          }}
        >
          <Field label="Backup code">
            <Input
              icon={KeyRound}
              className="mono"
              placeholder="XXXXX-XXXXX"
              value={backup}
              onChange={(e) => setBackup(e.target.value.toUpperCase())}
              autoComplete="off"
              autoFocus
            />
          </Field>
          <Button type="submit" block size="lg" loading={loading} disabled={!backup.trim()}>
            Verify backup code
          </Button>
        </form>
      )}

      <div className="verify-foot">
        <button
          className="link-btn"
          onClick={() => {
            setMode(mode === 'totp' ? 'backup' : 'totp');
            setError(null);
          }}
        >
          {mode === 'totp' ? 'Lost your device? Use a backup code' : 'Use authenticator app instead'}
        </button>
        {mfaExpiresAt && (
          <span className={`muted small ${left < 60000 ? 'text-warning' : ''}`}>Expires in {mm}:{ss}</span>
        )}
      </div>
    </>
  );
}
