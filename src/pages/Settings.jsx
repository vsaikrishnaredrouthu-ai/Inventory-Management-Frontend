import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api.js';
import { useAuth } from '../auth.jsx';
import { Card, PageHead, useToast } from '../ui.jsx';

const THEMES = [
  { value: 'system', label: 'Match device' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export default function Settings() {
  const { user, refresh } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const theme = user.preferences?.theme || 'system';

  const setTheme = async (value) => {
    setBusy(true);
    try {
      await api.put('/auth/preferences', { theme: value });
      await refresh();
    } catch (e) {
      toast(e.message, 'danger');
    } finally { setBusy(false); }
  };

  return (
    <>
      <PageHead title="Settings" subtitle="Appearance and account options" />
      <div className="grid-2">
        <Card title="Appearance">
          <p className="muted">Choose how the app looks on this account. Applies on every device you sign in from.</p>
          <div className="seg" role="group" aria-label="Theme" style={{ marginTop: '0.5rem' }}>
            {THEMES.map((t) => (
              <button key={t.value} className={theme === t.value ? 'active' : ''} aria-pressed={theme === t.value}
                disabled={busy} onClick={() => setTheme(t.value)}>{t.label}</button>
            ))}
          </div>
        </Card>

        <Card title="Account and security">
          <ul className="list">
            <li><div style={{ flex: 1 }}>Change your password<div className="muted" style={{ fontSize: '0.88rem' }}>Use a strong password you don't use elsewhere.</div></div>
              <Link to="/profile" className="btn sm">Open</Link></li>
            <li><div style={{ flex: 1 }}>Session length<div className="muted" style={{ fontSize: '0.88rem' }}>You stay signed in for 8 hours, or 30 days with “Remember me”. Log out on shared computers.</div></div></li>
          </ul>
        </Card>
      </div>
    </>
  );
}
