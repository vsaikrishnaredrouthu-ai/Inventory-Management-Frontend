import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

const DEMO_ACCOUNTS = [
  ['Owner', 'owner@demo.local'],
  ['Product Manager', 'product@demo.local'],
  ['Sales Manager', 'sales@demo.local'],
  ['Stock Manager', 'stock@demo.local'],
  ['Purchase Manager', 'purchase@demo.local'],
  ['Order Manager', 'orders@demo.local'],
];

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!identifier.trim()) next.identifier = 'Enter your email or username';
    if (!password) next.password = 'Enter your password';
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    setError('');
    try {
      await login(identifier.trim(), password, remember);
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <i className="ti ti-box-seam" aria-hidden="true" />
          Inventory Management
        </div>
        <h1 style={{ fontSize: '1.3rem', marginBottom: '0.25rem' }}>Log in</h1>
        <p className="muted" style={{ marginBottom: '1.2rem' }}>Use the account your Owner created for you.</p>

        {error && <div className="alert danger" role="alert">{error}</div>}

        <form onSubmit={submit} noValidate>
          <label className="field">
            <span className="field-label">Email or username</span>
            <input className="input" autoComplete="username" value={identifier}
              onChange={(e) => setIdentifier(e.target.value)} aria-invalid={Boolean(errors.identifier)} />
            {errors.identifier && <span className="field-error">{errors.identifier}</span>}
          </label>

          <label className="field">
            <span className="field-label">Password</span>
            <span className="input-wrap">
              <input className="input" type={showPassword ? 'text' : 'password'} autoComplete="current-password"
                value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={Boolean(errors.password)} />
              <button type="button" className="icon-btn toggle" aria-pressed={showPassword}
                aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((s) => !s)}>
                <i className={`ti ${showPassword ? 'ti-eye-off' : 'ti-eye'}`} aria-hidden="true" />
              </button>
            </span>
            {errors.password && <span className="field-error">{errors.password}</span>}
          </label>

          <div className="auth-row">
            <label className="check">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              Remember me
            </label>
            <Link to="/forgot-password">Forgot password?</Link>
          </div>

          <button className="btn primary block" type="submit" disabled={busy}>
            {busy ? 'Logging in…' : 'Login'}
          </button>
        </form>

        {import.meta.env.VITE_SHOW_DEMO === 'true' && (
          <div className="demo-box">
            <p className="muted" style={{ fontSize: '0.85rem' }}>Demo accounts (password <code>Demo@1234</code>)</p>
            <div className="demo-grid">
              {DEMO_ACCOUNTS.map(([label, email]) => (
                <button key={email} type="button" className="btn"
                  onClick={() => { setIdentifier(email); setPassword('Demo@1234'); }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
