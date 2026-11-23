import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api.js';
import { useToast } from '../ui.jsx';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const toast = useToast();
  const [step, setStep] = useState('request');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [devToken, setDevToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const requestLink = async (e) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Enter a valid email address');
    setBusy(true); setError('');
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      setMessage(data.message);
      if (data.dev_token) setDevToken(data.dev_token);
      setStep('reset');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const reset = async (e) => {
    e.preventDefault();
    if (password !== confirm) return setError('The two passwords do not match');
    setBusy(true); setError('');
    try {
      await api.post('/auth/reset-password', { token: token.trim(), password });
      toast('Password updated. Please log in.');
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand"><i className="ti ti-lock" aria-hidden="true" /> Reset password</div>

        {error && <div className="alert danger" role="alert">{error}</div>}

        {step === 'request' && (
          <form onSubmit={requestLink} noValidate>
            <p className="muted">Enter the email on your account. We will send you a reset link that expires in 30 minutes.</p>
            <label className="field">
              <span className="field-label">Email</span>
              <input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <button className="btn primary block" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
          </form>
        )}

        {step === 'reset' && (
          <form onSubmit={reset} noValidate>
            {message && <div className="alert info" role="status">{message}</div>}
            {devToken && (
              <div className="alert info" role="note">
                <span>Development mode: your reset token is <code className="json">{devToken}</code></span>
              </div>
            )}
            <label className="field">
              <span className="field-label">Reset token from your link</span>
              <input className="input" value={token} onChange={(e) => setToken(e.target.value)} />
            </label>
            <label className="field">
              <span className="field-label">New password</span>
              <input className="input" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <span className="field-hint">At least 8 characters, with a letter and a number.</span>
            </label>
            <label className="field">
              <span className="field-label">Confirm new password</span>
              <input className="input" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </label>
            <button className="btn primary block" disabled={busy}>{busy ? 'Saving…' : 'Set new password'}</button>
          </form>
        )}

        <p style={{ marginTop: '1rem', textAlign: 'center' }}><Link to="/login">Back to login</Link></p>
      </div>
    </div>
  );
}
