import { useEffect, useState } from 'react';
import api from '../api.js';
import { useAuth } from '../auth.jsx';
import { Card, Field, PageHead, dateTime, fieldErrors, useToast } from '../ui.jsx';

export default function Profile() {
  const { user, refresh } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ full_name: '', email: '', username: '', phone: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setForm({ full_name: user.full_name || '', email: user.email || '', username: user.username || '', phone: user.phone || '' });
  }, [user]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const saveProfile = async (e) => {
    e.preventDefault();
    const local = {};
    if (form.full_name.trim().length < 2) local.full_name = 'Enter your full name';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) local.email = 'Enter a valid email';
    setErrors(local);
    if (Object.keys(local).length) return;
    setBusy(true);
    try {
      await api.put('/auth/profile', { ...form, username: form.username || null, phone: form.phone || null });
      await refresh();
      toast('Profile saved');
    } catch (err) { setErrors({ ...fieldErrors(err), _form: err.message }); }
    finally { setBusy(false); }
  };

  const [pw, setPw] = useState({ current_password: '', new_password: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const savePassword = async (e) => {
    e.preventDefault();
    if (pw.new_password !== pw.confirm) return setPwError('The new passwords do not match');
    setBusy(true); setPwError('');
    try {
      await api.post('/auth/change-password', { current_password: pw.current_password, new_password: pw.new_password });
      setPw({ current_password: '', new_password: '', confirm: '' });
      toast('Password changed');
    } catch (err) { setPwError(err.message); }
    finally { setBusy(false); }
  };

  return (
    <>
      <PageHead title="My profile" subtitle="Keep your details and password up to date" />
      <div className="grid-2">
        <Card title="Your details">
          {errors._form && <div className="alert danger" role="alert">{errors._form}</div>}
          <form onSubmit={saveProfile} noValidate>
            <Field label="Full name" error={errors.full_name}><input className="input" value={form.full_name} onChange={set('full_name')} /></Field>
            <Field label="Email" error={errors.email}><input className="input" type="email" value={form.email} onChange={set('email')} /></Field>
            <Field label="Username (optional)" error={errors.username}><input className="input" value={form.username} onChange={set('username')} /></Field>
            <Field label="Phone (optional)"><input className="input" value={form.phone} onChange={set('phone')} /></Field>
            <button className="btn primary" disabled={busy}>Save details</button>
          </form>
          <dl className="kv" style={{ marginTop: '1.2rem' }}>
            <dt>Role</dt><dd>{user.role_name}</dd>
            <dt>Last login</dt><dd>{dateTime(user.last_login_at)}</dd>
            <dt>Member since</dt><dd>{dateTime(user.created_at)}</dd>
          </dl>
        </Card>

        <Card title="Change password">
          {pwError && <div className="alert danger" role="alert">{pwError}</div>}
          <form onSubmit={savePassword} noValidate>
            <Field label="Current password"><input className="input" type="password" autoComplete="current-password" value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} /></Field>
            <Field label="New password" hint="At least 8 characters, with a letter and a number">
              <input className="input" type="password" autoComplete="new-password" value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} />
            </Field>
            <Field label="Confirm new password"><input className="input" type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} /></Field>
            <button className="btn primary" disabled={busy || !pw.current_password || !pw.new_password}>Change password</button>
          </form>
        </Card>
      </div>
    </>
  );
}
