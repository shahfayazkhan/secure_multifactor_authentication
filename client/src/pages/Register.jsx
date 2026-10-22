import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User } from 'lucide-react';
import { Alert, Button, Field, Input, PasswordInput } from '../components/ui';
import PasswordStrength, { isStrongPassword } from '../components/PasswordStrength';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Register() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    const fe = {};
    if (form.name.trim().length < 2) fe.name = 'Enter your full name.';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) fe.email = 'Enter a valid email address.';
    if (!isStrongPassword(form.password)) fe.password = 'Password doesn’t meet the requirements.';
    if (form.password !== form.confirm) fe.confirm = 'Passwords don’t match.';
    setErrors(fe);
    if (Object.keys(fe).length) return;

    setLoading(true);
    setError(null);
    try {
      await register({ name: form.name.trim(), email: form.email, password: form.password });
      toast.success('Account created. Secure it by enabling two-factor authentication.');
      navigate('/security?setup=1', { replace: true });
    } catch (err) {
      if (err.details?.fields) setErrors(err.details.fields);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="auth-head">
        <h2>Create your account</h2>
        <p>It takes less than a minute. You’ll set up 2FA next.</p>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <form className="form" onSubmit={onSubmit} noValidate>
        <Field label="Full name" error={errors.name}>
          <Input icon={User} autoComplete="name" placeholder="Jane Cooper" value={form.name} onChange={set('name')} autoFocus />
        </Field>
        <Field label="Email address" error={errors.email}>
          <Input icon={Mail} type="email" autoComplete="email" placeholder="you@company.com" value={form.email} onChange={set('email')} />
        </Field>
        <Field label="Password" error={errors.password}>
          <PasswordInput icon={Lock} autoComplete="new-password" placeholder="Create a strong password" value={form.password} onChange={set('password')} />
          <PasswordStrength password={form.password} />
        </Field>
        <Field label="Confirm password" error={errors.confirm}>
          <PasswordInput icon={Lock} autoComplete="new-password" placeholder="Repeat your password" value={form.confirm} onChange={set('confirm')} />
        </Field>

        <Button type="submit" block size="lg" loading={loading}>
          Create account
        </Button>
      </form>

      <p className="auth-switch">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </>
  );
}
