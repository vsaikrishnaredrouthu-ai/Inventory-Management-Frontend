import { useEffect, useState } from 'react';
import api from '../api.js';
import { useAuth } from '../auth.jsx';
import { Badge, Card, Empty, ErrorBox, Loading, PageHead, Pager, dateTime, useApi, useDebounced } from '../ui.jsx';

const VERB = {
  create: 'created', update: 'updated', delete: 'deleted', move: 'stock moved',
  receive: 'received', cancel: 'cancelled', status: 'status changed',
  role_change: 'role changed', export: 'exported', sale: 'sale recorded',
};
const SPECIAL = {
  login: 'Logged in', logout: 'Logged out', check_in: 'Checked in', check_out: 'Checked out',
};

function label(action = '') {
  if (SPECIAL[action]) return SPECIAL[action];
  const [entity, verb] = action.split('.');
  if (!verb) return action.replace(/[_.]/g, ' ').replace(/^./, (c) => c.toUpperCase());
  const name = entity.replace(/_/g, ' ');
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${VERB[verb] || verb.replace(/_/g, ' ')}`;
}

function tone(action = '') {
  if (action === 'check_in' || action === 'check_out') return 'info';
  if (action.endsWith('.delete') || action === 'logout') return 'warning';
  if (action.endsWith('.create') || action === 'login') return 'success';
  return 'neutral';
}

// Owner only: the full history of what staff did in the system.
export default function Activity() {
  const { can } = useAuth();
  if (!can('users.manage')) {
    return <Empty title="Only the Owner can see activity history">Use the menu to pick a page.</Empty>;
  }
  return <ActivityList />;
}

function ActivityList() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const limit = 25;
  const debouncedQ = useDebounced(q);
  const list = useApi(
    () => api.get('/activity', { params: { q: debouncedQ || undefined, page, limit } }).then((r) => r.data),
    [debouncedQ, page]);
  useEffect(() => setPage(1), [debouncedQ]);
  const items = list.data?.items || [];

  return (
    <>
      <PageHead title="Activity history" subtitle="What each person did, newest first" />
      <div className="toolbar">
        <input className="input search" placeholder="Search by action, for example product or check_in" aria-label="Search activity"
          value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn ghost sm" onClick={() => setQ('check_')}>Check in / out only</button>
        {q && <button className="btn ghost sm" onClick={() => setQ('')}>Clear</button>}
      </div>
      <Card>
        {list.loading && <Loading />}
        <ErrorBox error={list.error} onRetry={list.reload} />
        {!list.loading && !list.error && !items.length && <Empty title="No activity found" />}
        {items.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>When</th><th>Person</th><th>Action</th><th>Item</th><th>IP address</th></tr></thead>
              <tbody>
                {items.map((a) => (
                  <tr key={a.log_id}>
                    <td>{dateTime(a.created_at)}</td>
                    <td>{a.user_name || '—'}</td>
                    <td><Badge tone={tone(a.action)}>{label(a.action)}</Badge></td>
                    <td>{a.entity}{a.entity_id ? ` #${a.entity_id}` : ''}</td>
                    <td className="muted">{a.ip_address || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {list.data && <Pager page={page} limit={limit} total={list.data.total} onChange={setPage} />}
      </Card>
    </>
  );
}
