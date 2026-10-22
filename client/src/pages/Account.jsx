import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Lock, KeyRound, Trash2 } from 'lucide-react';
import { Alert, Button, Card, Field, Input, Modal, PasswordInput } from '../components/ui';
import { accountApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatDate } from '../utils/format';

export default function Account() {
  const { user, setUser, resetToGuest } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [name, setName] = useState(user.name);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [del, setDel] = useState({ password: '', code: '' });
  const [delError, setDelError] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await accountApi.updateProfile(name.trim());
      setUser(res.user);
      toast.success('Profile updated.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async () => {
    setDeleting(true);
    setDelError(null);
    try {
      await accountApi.deleteAccount(del.password, del.code.trim());
      resetToGuest();
      toast.success('Your account has been deleted.');
      navigate('/login', { replace: true });
    } catch (err) {
      setDelError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="stack-lg">
      <div className="page-head">
        <div>
          <h2>Account</h2>
          <p className="muted">Your personal details and account preferences.</p>
        </div>
      </div>

      <Card title="Profile">
        <form className="form narrow" onSubmit={saveProfile}>
          <Field label="Full name">
            <Input icon={User} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Email address" hint="Your email is used to sign in and can’t be changed here.">
            <Input icon={Mail} value={user.email} disabled />
          </Field>
          <dl className="key-meta">
            <div><dt>Member since</dt><dd>{formatDate(user.createdAt)}</dd></div>
            <div><dt>Password last changed</dt><dd>{user.passwordChangedAt ? formatDate(user.passwordChangedAt) : 'Never'}</dd></div>
          </dl>
          <div>
            <Button type="submit" loading={saving} disabled={name.trim().length < 2 || name.trim() === user.name}>
              Save changes
            </Button>
          </div>
        </form>
      </Card>

      <Card title="Danger zone" className="card-danger">
        <div className="setting-row">
          <span className="setting-icon tone-danger"><Trash2 size={20} /></span>
          <div className="setting-text">
            <strong>Delete account</strong>
            <p className="muted">Permanently remove your account, sessions and activity history. This can’t be undone.</p>
          </div>
          <Button variant="danger-outline" onClick={() => setDeleteOpen(true)}>Delete account</Button>
        </div>
      </Card>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        size="sm"
        title="Delete your account?"
        description="This permanently deletes your account and signs out every device."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button
              variant="danger"
              loading={deleting}
              disabled={!del.password || (user.twoFactorEnabled && del.code.trim().length < 6)}
              onClick={deleteAccount}
            >
              Delete permanently
            </Button>
          </>
        }
      >
        <div className="form">
          {delError && <Alert type="error">{delError}</Alert>}
          <Field label="Password">
            <PasswordInput icon={Lock} value={del.password} onChange={(e) => setDel((d) => ({ ...d, password: e.target.value }))} />
          </Field>
          {user.twoFactorEnabled && (
            <Field label="Authentication code" hint="6-digit code or a backup code.">
              <Input icon={KeyRound} className="mono" value={del.code} onChange={(e) => setDel((d) => ({ ...d, code: e.target.value }))} />
            </Field>
          )}
        </div>
      </Modal>
    </div>
  );
}
