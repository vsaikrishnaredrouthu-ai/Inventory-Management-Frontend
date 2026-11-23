import { useEffect, useState } from 'react';
import api from '../api.js';
import { useAuth } from '../auth.jsx';
import { Badge, Card, Confirm, Empty, ErrorBox, Field, Loading, Modal, PageHead, Pager, dateTime, fieldErrors, useApi, useDebounced, useToast } from '../ui.jsx';

export default function Users() {
  const { user: me } = useAuth();
  const toast = useToast();
  const roles = useApi(() => api.get('/users/roles').then((r) => r.data.items), []);
  const [q, setQ] = useState('');
  const debouncedQ = useDebounced(q);
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null); // {type:'create'|'edit'|'role'|'password'|'deactivate', user?}
  const limit = 10;

  const list = useApi(() => api.get('/users', { params: { q: debouncedQ, role, status, page, limit } }).then((r) => r.data),
    [debouncedQ, role, status, page]);
  useEffect(() => setPage(1), [debouncedQ, role, status]);

  const toggleStatus = async (u) => {
    try {
      await api.post(`/users/${u.user_id}/status`, { is_active: !u.is_active });
      toast(u.is_active ? 'Account deactivated' : 'Account reactivated');
      list.reload();
    } catch (e) { toast(e.message, 'danger'); }
    setModal(null);
  };

  return (
    <>
      <PageHead title="User management" subtitle="Create accounts, assign roles, reset passwords and deactivate access"
        actions={<button className="btn primary" onClick={() => setModal({ type: 'create' })}><i className="ti ti-user-plus" aria-hidden="true" /> Add user</button>} />

      <div className="toolbar">
        <input className="input search" placeholder="Search name, email or username" aria-label="Search users" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="select" aria-label="Role" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">All roles</option>
          {roles.data?.map((r) => <option key={r.role_key} value={r.role_key}>{r.role_name}</option>)}
        </select>
        <select className="select" aria-label="Account status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All accounts</option>
          <option value="active">Active</option>
          <option value="inactive">Deactivated</option>
        </select>
      </div>

      <Card>
        <ErrorBox error={list.error} onRetry={list.reload} />
        {list.loading && !list.data ? <Loading /> : list.data && (
          list.data.items.length === 0 ? <Empty title="No users match these filters" /> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Last login</th><th aria-label="Actions"></th></tr></thead>
                <tbody>
                  {list.data.items.map((u) => {
                    const isMe = u.user_id === me.user_id;
                    return (
                      <tr key={u.user_id}>
                        <td>{u.full_name}{isMe && <span className="muted"> (you)</span>}<div className="muted" style={{ fontSize: '0.82rem' }}>{u.username ? `@${u.username}` : ''}</div></td>
                        <td>{u.email}</td>
                        <td><Badge tone="info">{u.role_name}</Badge></td>
                        <td><Badge tone={u.is_active ? 'success' : 'neutral'}>{u.is_active ? 'Active' : 'Deactivated'}</Badge></td>
                        <td style={{ whiteSpace: 'nowrap' }}>{u.last_login_at ? dateTime(u.last_login_at) : <span className="muted">Never</span>}</td>
                        <td><div className="row-actions">
                          <button className="btn sm ghost" onClick={() => setModal({ type: 'edit', user: u })}>Edit</button>
                          <button className="btn sm ghost" onClick={() => setModal({ type: 'role', user: u })}>Change role</button>
                          <button className="btn sm ghost" onClick={() => setModal({ type: 'password', user: u })}>Reset password</button>
                          <button className="btn sm ghost" disabled={isMe} title={isMe ? 'You cannot deactivate your own account' : ''}
                            onClick={() => (u.is_active ? setModal({ type: 'deactivate', user: u }) : toggleStatus(u))}>
                            {u.is_active ? 'Deactivate' : 'Reactivate'}
                          </button>
                        </div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
        {list.data && <Pager page={page} limit={limit} total={list.data.total} onChange={setPage} />}
      </Card>

      {modal?.type === 'create' && <UserForm roles={roles.data || []} onClose={() => setModal(null)} onSaved={() => { setModal(null); list.reload(); }} />}
      {modal?.type === 'edit' && <UserForm user={modal.user} roles={roles.data || []} onClose={() => setModal(null)} onSaved={() => { setModal(null); list.reload(); }} />}
      {modal?.type === 'role' && <RoleForm user={modal.user} roles={roles.data || []} onClose={() => setModal(null)} onSaved={() => { setModal(null); list.reload(); }} />}
      {modal?.type === 'password' && <PasswordForm user={modal.user} onClose={() => setModal(null)} />}
      {modal?.type === 'deactivate' && (
        <Confirm danger confirmLabel="Deactivate" onCancel={() => setModal(null)} onConfirm={() => toggleStatus(modal.user)}
          message={`${modal.user.full_name} will no longer be able to log in. Their history is kept and you can reactivate the account later.`} />
      )}
    </>
  );
}

function UserForm({ user, roles, onClose, onSaved }) {
  const toast = useToast();
  const isNew = !user;
  const [form, setForm] = useState({
    full_name: user?.full_name || '', email: user?.email || '', username: user?.username || '',
    phone: user?.phone || '', role_key: user?.role_key || 'sales_manager', password: '',
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const local = {};
    if (form.full_name.trim().length < 2) local.full_name = 'Enter the full name';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) local.email = 'Enter a valid email';
    if (isNew && form.password.length < 8) local.password = 'At least 8 characters, with a letter and a number';
    setErrors(local);
    if (Object.keys(local).length) return;

    const body = { full_name: form.full_name.trim(), email: form.email.trim(), username: form.username || null, phone: form.phone || null };
    setBusy(true);
    try {
      if (isNew) await api.post('/users', { ...body, role_key: form.role_key, password: form.password });
      else await api.put(`/users/${user.user_id}`, body);
      toast(isNew ? 'User created. Share the password with them securely.' : 'User updated');
      onSaved();
    } catch (err) {
      setErrors({ ...fieldErrors(err), _form: err.message });
    } finally { setBusy(false); }
  };

  return (
    <Modal title={isNew ? 'Add user' : `Edit ${user.full_name}`} onClose={onClose}
      footer={<><button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn primary" form="user-form" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button></>}>
      {errors._form && <div className="alert danger" role="alert">{errors._form}</div>}
      <form id="user-form" onSubmit={submit} noValidate className="form-grid">
        <Field label="Full name" error={errors.full_name} className="wide"><input className="input" value={form.full_name} onChange={set('full_name')} /></Field>
        <Field label="Email" error={errors.email}><input className="input" type="email" value={form.email} onChange={set('email')} /></Field>
        <Field label="Username (optional)" error={errors.username}><input className="input" value={form.username} onChange={set('username')} /></Field>
        <Field label="Phone (optional)"><input className="input" value={form.phone} onChange={set('phone')} /></Field>
        {isNew && <>
          <Field label="Role">
            <select className="select" value={form.role_key} onChange={set('role_key')}>
              {roles.map((r) => <option key={r.role_key} value={r.role_key}>{r.role_name}</option>)}
            </select>
          </Field>
          <Field label="Temporary password" error={errors.password} hint="The user should change it after first login">
            <input className="input" type="text" autoComplete="new-password" value={form.password} onChange={set('password')} />
          </Field>
        </>}
      </form>
    </Modal>
  );
}

function RoleForm({ user, roles, onClose, onSaved }) {
  const toast = useToast();
  const [role, setRole] = useState(user.role_key);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    if (role === user.role_key) return setError('Choose a different role');
    setBusy(true); setError('');
    try {
      await api.put(`/users/${user.user_id}/role`, { role_key: role });
      toast(`${user.full_name} is now ${roles.find((r) => r.role_key === role)?.role_name}`);
      onSaved();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  return (
    <Modal title={`Change role: ${user.full_name}`} onClose={onClose}
      footer={<><button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn primary" form="role-form" disabled={busy}>Save role</button></>}>
      {error && <div className="alert danger" role="alert">{error}</div>}
      <form id="role-form" onSubmit={save}>
        <p className="muted">Current role: <strong>{user.role_name}</strong>. The new role's menu and permissions apply on the user's next request; the old role's access stops immediately.</p>
        <Field label="New role">
          <select className="select" value={role} onChange={(e) => setRole(e.target.value)}>
            {roles.map((r) => <option key={r.role_key} value={r.role_key}>{r.role_name} — {r.description}</option>)}
          </select>
        </Field>
      </form>
    </Modal>
  );
}

function PasswordForm({ user, onClose }) {
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      return setError('Use at least 8 characters, with a letter and a number');
    }
    if (password !== confirm) return setError('The passwords do not match');
    setBusy(true); setError('');
    try {
      await api.post(`/users/${user.user_id}/reset-password`, { password });
      toast('Password reset. Give the new password to the user securely.');
      onClose();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  return (
    <Modal title={`Reset password: ${user.full_name}`} onClose={onClose}
      footer={<><button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn primary" form="pw-form" disabled={busy}>Reset password</button></>}>
      {error && <div className="alert danger" role="alert">{error}</div>}
      <form id="pw-form" onSubmit={save} noValidate>
        <Field label="New password"><input className="input" type="text" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        <Field label="Confirm password"><input className="input" type="text" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></Field>
      </form>
    </Modal>
  );
}
