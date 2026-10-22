import { useEffect, useState } from 'react';
import { Copy, Smartphone, QrCode, ShieldCheck, KeyRound, Check } from 'lucide-react';
import { Alert, Button, Modal, Spinner } from './ui';
import OtpInput from './OtpInput';
import BackupCodes from './BackupCodes';
import { twoFactorApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const STEPS = [
  { key: 'app', label: 'Get the app', icon: Smartphone },
  { key: 'scan', label: 'Scan QR code', icon: QrCode },
  { key: 'verify', label: 'Verify', icon: ShieldCheck },
  { key: 'backup', label: 'Backup codes', icon: KeyRound },
];

const APPS = ['Google Authenticator', 'Microsoft Authenticator', 'Authy', '1Password', 'Bitwarden'];

export default function EnrollTwoFactor({ open, onClose, onEnabled }) {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [setup, setSetup] = useState(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [codes, setCodes] = useState([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) {
      setStep(0);
      setSetup(null);
      setCode('');
      setError(null);
      setCodes([]);
      setSaved(false);
    }
  }, [open]);

  const loadSetup = async () => {
    setLoading(true);
    setError(null);
    try {
      setSetup(await twoFactorApi.setup());
      setStep(1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const verify = async (value = code) => {
    if (value.length !== 6 || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await twoFactorApi.enable(value);
      setCodes(res.backupCodes);
      setUser(res.user);
      if (res.otherSessionsRevoked) {
        toast.info(`Signed out ${res.otherSessionsRevoked} other session(s) for your security.`);
      }
      setStep(3);
    } catch (err) {
      setError(err.code === 'SETUP_EXPIRED' ? `${err.message}` : err.message);
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  const finish = () => {
    toast.success('Two-factor authentication is now on.');
    onEnabled?.();
    onClose();
  };

  const copyKey = async () => {
    await navigator.clipboard.writeText(setup.manualKey.replace(/\s/g, ''));
    toast.success('Setup key copied.');
  };

  const isFinal = step === 3;

  return (
    <Modal
      open={open}
      onClose={isFinal ? undefined : onClose}
      dismissible={!isFinal}
      size="lg"
      title="Set up two-factor authentication"
      description="Add an extra layer of security using an authenticator app."
      footer={
        <>
          {step === 0 && (
            <>
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button onClick={loadSetup} loading={loading}>I have an app — continue</Button>
            </>
          )}
          {step === 1 && (
            <>
              <Button variant="ghost" onClick={() => setStep(0)}>Back</Button>
              <Button onClick={() => setStep(2)}>I’ve scanned it</Button>
            </>
          )}
          {step === 2 && (
            <>
              <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => verify()} loading={loading} disabled={code.length !== 6}>Verify & enable</Button>
            </>
          )}
          {step === 3 && (
            <Button onClick={finish} disabled={!saved}>Done</Button>
          )}
        </>
      }
    >
      <ol className="stepper">
        {STEPS.map((s, i) => (
          <li key={s.key} className={i < step ? 'done' : i === step ? 'active' : ''}>
            <span className="step-dot">{i < step ? <Check size={14} /> : i + 1}</span>
            <span className="step-label">{s.label}</span>
          </li>
        ))}
      </ol>

      {error && <Alert type="error">{error}</Alert>}

      {step === 0 && (
        <div className="enroll-step">
          <p>Install an authenticator app on your phone. Any app that supports time-based one-time passwords (TOTP) will work:</p>
          <div className="app-chips">
            {APPS.map((a) => (
              <span key={a} className="chip"><Smartphone size={14} /> {a}</span>
            ))}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="enroll-scan">
          <div className="qr-frame">
            {setup ? <img src={setup.qrCodeDataUrl} alt="QR code for your authenticator app" width={200} height={200} /> : <Spinner />}
          </div>
          <div className="enroll-scan-text">
            <h4>Scan this QR code</h4>
            <p className="muted">Open your authenticator app, tap <strong>+</strong> / <strong>Add account</strong>, then scan the code.</p>
            <div className="manual-key">
              <span className="muted small">Can’t scan? Enter this key manually:</span>
              <div className="key-box">
                <code>{setup?.manualKey}</code>
                <button className="icon-btn" onClick={copyKey} aria-label="Copy key"><Copy size={16} /></button>
              </div>
              <dl className="key-meta">
                <div><dt>Account</dt><dd>{setup?.account}</dd></div>
                <div><dt>Issuer</dt><dd>{setup?.issuer}</dd></div>
                <div><dt>Type</dt><dd>Time-based, 6 digits, 30s</dd></div>
              </dl>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="enroll-step center">
          <p>Enter the 6-digit code shown in your authenticator app to confirm it’s set up correctly.</p>
          <OtpInput value={code} onChange={setCode} onComplete={verify} disabled={loading} error={Boolean(error)} />
        </div>
      )}

      {step === 3 && (
        <div className="enroll-step">
          <Alert type="success" title="Two-factor authentication is enabled">
            Save these backup codes now. Use one if you lose access to your authenticator app — each works only once.
            You won’t be able to see them again.
          </Alert>
          <BackupCodes codes={codes} email={user?.email} />
          <label className="checkbox">
            <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
            <span>I’ve saved my backup codes in a safe place.</span>
          </label>
        </div>
      )}
    </Modal>
  );
}
