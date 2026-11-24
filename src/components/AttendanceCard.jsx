import { useState } from 'react';
import api from '../api.js';
import { useAuth } from '../auth.jsx';
import { Card, ErrorBox, Loading, dateTime, useApi, useToast } from '../ui.jsx';

// Owner-only: check in and check out for the signed-in Owner. Other roles see nothing here.
export default function AttendanceCard() {
  const { can } = useAuth();
  if (!can('users.manage')) return null;
  return <OwnerCheckInCard />;
}

function OwnerCheckInCard() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const today = useApi(() => api.get('/attendance/today').then((r) => r.data.item), []);
  const item = today.data;

  const act = async (path, message) => {
    setBusy(true);
    try {
      await api.post(`/attendance/${path}`);
      toast(message);
      await today.reload();
    } catch (err) {
      toast(err.message, 'danger');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Check in / check out">
      {today.loading && <Loading />}
      <ErrorBox error={today.error} onRetry={today.reload} />
      {!today.loading && !today.error && (
        <div className="attendance-row">
          <div>
            {!item?.check_in && <p className="muted">You have not checked in today.</p>}
            {item?.check_in && (
              <p>
                Checked in <strong>{dateTime(item.check_in)}</strong>
                {item.check_out
                  ? <> · checked out <strong>{dateTime(item.check_out)}</strong></>
                  : ' · still working'}
              </p>
            )}
          </div>
          <div className="attendance-actions">
            <button className="btn primary" disabled={busy || !!item?.check_in}
              onClick={() => act('check-in', 'Checked in. Have a good day.')}>Check in</button>
            <button className="btn" disabled={busy || !item?.check_in || !!item?.check_out}
              onClick={() => act('check-out', 'Checked out. See you next time.')}>Check out</button>
          </div>
        </div>
      )}
    </Card>
  );
}
