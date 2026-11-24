import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api.js';
import { useAuth } from '../auth.jsx';
import { Card, ErrorBox, Loading, dateTime, useApi, useToast } from '../ui.jsx';

// Check in / check out for the signed-in user, shown on the dashboard.
export default function ShiftCard() {
  const { can } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const today = useApi(() => api.get('/shifts/today').then((r) => r.data.item), []);
  const item = today.data;

  const act = async (path, message) => {
    setBusy(true);
    try {
      await api.post(`/shifts/${path}`);
      toast(message);
      await today.reload();
    } catch (err) {
      toast(err.message, 'danger');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card
      title="Check in / out today"
      actions={can('users.manage') ? <Link className="btn sm" to="/work-hours">View work hours</Link> : null}
    >
      {today.loading && <Loading />}
      <ErrorBox error={today.error} onRetry={today.reload} />
      {!today.loading && !today.error && (
        <div className="shift-row">
          <div>
            {!item && <p className="muted">You have not checked in today.</p>}
            {item && (
              <p>
                Checked in <strong>{dateTime(item.check_in)}</strong>
                {item.check_out
                  ? <> · checked out <strong>{dateTime(item.check_out)}</strong></>
                  : ' · still working'}
              </p>
            )}
          </div>
          <div className="shift-actions">
            <button className="btn primary" disabled={busy || !!item}
              onClick={() => act('check-in', 'Checked in. Have a good day.')}>Check in</button>
            <button className="btn" disabled={busy || !item || !!item.check_out}
              onClick={() => act('check-out', 'Checked out. See you next time.')}>Check out</button>
          </div>
        </div>
      )}
    </Card>
  );
}
