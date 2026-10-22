import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShieldCheck, ShieldOff, KeyRound, Lock, RefreshCw, Smartphone } from 'lucide-react';
import { Alert, Badge, Button, Card, Field, Input, Modal, PasswordInput } from '../components/ui';
import EnrollTwoFactor from '../components/EnrollTwoFactor';
import BackupCodes from '../components/BackupCodes';
import OtpInput from '../components/OtpInput';
import PasswordStrength, { isStrongPassword } from '../components/PasswordStrength';
import { accountApi, twoFactorApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatDate } from '../utils/format';

export default function Security() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [status, setStatus] = useState(null);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);

  const load = useCallback(() => twoFactorApi.status().then(setStatus).catch(() => {}), []);

  useEffect(() => {
    load();
  }, [load, user.twoFactorEnabled]);

  useEffect(() => {
    if (params.get('setup') === '1' && !user.twoFactorEnabled) {
      setEnrollOpen(true);
      setParams({}, { replace: true });
    }
  }, [params, setParams, user.twoFactorEnabled]);

  const remaining = status?.backupCodesRemaining ?? 0;

  return (
    <div className="stack-lg">
      <div className="page-head">
        <div>
          <h2>Security</h2>
          <p className="muted">Manage two-factor authentication, backup codes and your password.</p>
        </div>
      </div>

      <Card
        title="Two-factor authentication"
        description="Require a code from your authenticator app in addition to your password."
        actions={user.twoFactorEnabled ? <Badge tone="success" dot>Enabled</Badge> : <Badge tone="danger" dot>Disabled</Badge>}
      >
        <div className="setting-row">
          <span className={`setting-icon ${user.twoFactorEnabled ? 'tone-success' : 'tone-neutral'}`}>
            <Smartphone size={20} />
          </span>
          <div className="setting-text">
            <strong>Authenticator app (TOTP)</strong>
            <p className="muted">
              {user.twoFactorEnabled
                ? `Enabled on ${formatDate(user.twoFactorEnabledAt)}. You’ll be asked for a code every time you sign in.`
                : 'Use Google Authenticator, Microsoft Authenticator, Authy or any TOTP app.'}
            </p>
          </div>
          {user.twoFactorEnabled ? (
            <Button variant="danger-outline" icon={ShieldOff} onClick={() => setDisableOpen(true)}>Disable</Button>
          ) : (
            <Button icon={ShieldCheck} onClick={() => setEnrollOpen(true)}>Enable 2FA</Button>
          )}
        </div>

        {user.twoFactorEnabled && (
          <div className="setting-row bordered">
            <span className="setting-icon tone-info"><KeyRound size={20} /></span>
            <div className="setting-text">
              <strong>Backup codes</strong>
              <p className="muted">
                {remaining} of 10 unused. One-time codes for when you can’t use your authenticator app.
              </p>
              {remaining <= 3 && (
                <Alert type="warning">You’re running low on backup codes. Generate a new set.</Alert>
              )}
            </div>
            <Button variant="secondary" icon={RefreshCw} onClick={() => setRegenOpen(true)}>Regenerate</Button>
          </div>
        )}
      </Card>

      <ChangePasswordCard />

      <EnrollTwoFactor open={enrollOpen} onClose={() => setEnrollOpen(false)} onEnabled={load} />
      <DisableModal open={disableOpen} onClose={() => setDisableOpen(false)} />
      <RegenerateModal open={regenOpen} onClose={() => setRegenOpen(false)} onDone={load} />
    </div>
  );
}

function DisableModal({ open, onClose }) {
  const { setUser } = useAuth();
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setPassword('');
      setCode('');
      setError(null);
    }
  }, [open]);

  const submit = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await twoFactorApi.disable(password, code.trim());
      setUser(res.user);
      toast.success('Two-factor authentication disabled.');
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Disable two-factor authentication?"
      description="Your account will be protected by your password only."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={submit} loading={loading} disabled={!password || code.trim().length < 6}>
            Disable 2FA
          </Button>
        </>
      }
    >
      <form className="form" onSubmit={submit}>
        {error && <Alert type="error">{error}</Alert>}
        <Field label="Current password">
          <PasswordInput icon={Lock} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" autoFocus />
        </Field>
        <Field label="Authentication code" hint="6-digit code from your app, or a backup code.">
          <Input icon={KeyRound} className="mono" value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" autoComplete="one-time-code" />
        </Field>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

function RegenerateModal({ open, onClose, onDone }) {
  const { user } = useAuth();
  const [code, setCode] = useState('');
  const [codes, setCodes] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setCode('');
      setCodes(null);
      setError(null);
    }
  }, [open]);

  const submit = async (value = code) => {
    if (value.length !== 6 || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await twoFactorApi.regenerateBackupCodes(value);
      setCodes(res.backupCodes);
      onDone?.();
    } catch (err) {
      setError(err.message);
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={codes ? 'Your new backup codes' : 'Regenerate backup codes'}
      description={codes ? 'Your previous codes no longer work.' : 'This will invalidate all of your existing backup codes.'}
      footer={
        codes ? (
          <Button onClick={onClose}>Done</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={() => submit()} loading={loading} disabled={code.length !== 6}>Generate new codes</Button>
          </>
        )
      }
    >
      {error && <Alert type="error">{error}</Alert>}
      {codes ? (
        <BackupCodes codes={codes} email={user.email} />
      ) : (
        <div className="enroll-step center">
          <p>Enter the 6-digit code from your authenticator app to confirm.</p>
          <OtpInput value={code} onChange={setCode} onComplete={submit} disabled={loading} error={Boolean(error)} />
        </div>
      )}
    </Modal>
  );
}

function ChangePasswordCard() {
  const toast = useToast();
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const fe = {};
    if (!form.current) fe.current = 'Enter your current password.';
    if (!isStrongPassword(form.next)) fe.next = 'Password doesn’t meet the requirements.';
    if (form.next !== form.confirm) fe.confirm = 'Passwords don’t match.';
    setErrors(fe);
    if (Object.keys(fe).length) return;

    setLoading(true);
    try {
      const res = await accountApi.changePassword(form.current, form.next);
      setForm({ current: '', next: '', confirm: '' });
      toast.success(
        res.otherSessionsRevoked
          ? `Password updated. Signed out ${res.otherSessionsRevoked} other session(s).`
          : 'Password updated.'
      );
    } catch (err) {
      if (err.code === 'INVALID_PASSWORD') setErrors({ current: err.message });
      else toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Password" description="Changing your password signs you out of all other devices.">
      <form className="form narrow" onSubmit={submit} noValidate>
        <Field label="Current password" error={errors.current}>
          <PasswordInput icon={Lock} value={form.current} onChange={set('current')} autoComplete="current-password" />
        </Field>
        <Field label="New password" error={errors.next}>
          <PasswordInput icon={Lock} value={form.next} onChange={set('next')} autoComplete="new-password" />
          <PasswordStrength password={form.next} />
        </Field>
        <Field label="Confirm new password" error={errors.confirm}>
          <PasswordInput icon={Lock} value={form.confirm} onChange={set('confirm')} autoComplete="new-password" />
        </Field>
        <div>
          <Button type="submit" loading={loading}>Update password</Button>
        </div>
      </form>
    </Card>
  );
}
