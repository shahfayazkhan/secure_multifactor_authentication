import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { Alert, Button, Field, Input, PasswordInput } from '../components/ui';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, expiredReason, clearExpiredReason } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '', remember: false });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    const fieldErrors = {};
    if (!/^\S+@\S+\.\S+$/.test(form.email)) fieldErrors.email = 'Enter a valid email address.';
    if (!form.password) fieldErrors.password = 'Enter your password.';
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length) return;

    setLoading(true);
    setError(null);
    clearExpiredReason();
    try {
      const { mfaRequired } = await login(form);
      navigate(mfaRequired ? '/verify' : location.state?.from || '/dashboard', { replace: true });
    } catch (err) {
      setError({ message: err.message, locked: err.code === 'ACCOUNT_LOCKED' });
      setForm((f) => ({ ...f, password: '' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="auth-head">
        <h2>Welcome back</h2>
        <p>Sign in to your account to continue.</p>
      </div>

      {expiredReason && !error && (
        <Alert type="info" onClose={clearExpiredReason}>{expiredReason}</Alert>
      )}
      {error && (
        <Alert type={error.locked ? 'warning' : 'error'} title={error.locked ? 'Account temporarily locked' : undefined}>
          {error.message}
        </Alert>
      )}

      <form className="form" onSubmit={onSubmit} noValidate>
        <Field label="Email address" error={errors.email}>
          <Input
            icon={Mail}
            type="email"
            autoComplete="username"
            placeholder="you@company.com"
            value={form.email}
            onChange={set('email')}
            autoFocus
          />
        </Field>
        <Field label="Password" error={errors.password}>
          <PasswordInput
            icon={Lock}
            autoComplete="current-password"
            placeholder="Enter your password"
            value={form.password}
            onChange={set('password')}
          />
        </Field>

        <label className="checkbox">
          <input type="checkbox" checked={form.remember} onChange={set('remember')} />
          <span>
            Keep me signed in
            <small>Stay signed in on this device for 14 days.</small>
          </span>
        </label>

        <Button type="submit" block size="lg" loading={loading}>
          Sign in {!loading && <ArrowRight size={16} />}
        </Button>
      </form>

      <p className="auth-switch">
        Don’t have an account? <Link to="/register">Create one</Link>
      </p>
    </>
  );
}
