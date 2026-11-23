import { useEffect, useState } from 'react';
import api from '../api.js';
import { useAuth } from '../auth.jsx';
import { Card, Empty, ErrorBox, Loading, PageHead, Pager, dateTime, useApi, useDebounced } from '../ui.jsx';

const pretty = (a) => a.replace(/[._]/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

export default function Activity() {
  const { can } = useAuth();
  const [q, setQ] = useState('');
  const debouncedQ = useDebounced(q);
  const [page, setPage] = useState(1);
  const limit = 20;
  const list = useApi(() => api.get('/activity', { params: { q: debouncedQ, page, limit } }).then((r) => r.data), [debouncedQ, page]);
  useEffect(() => setPage(1), [debouncedQ]);

  return (
    <>
      <PageHead title="Activity history"
        subtitle={can('users.manage') ? 'Everything done in the system, by everyone' : 'Your recent actions'} />
      <div className="toolbar">
        <input className="input search" placeholder="Search actions, e.g. order or stock" aria-label="Search activity" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <Card>
        <ErrorBox error={list.error} onRetry={list.reload} />
        {list.loading && !list.data ? <Loading /> : list.data && (
          list.data.items.length === 0 ? <Empty title="No activity matches" /> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>When</th>{can('users.manage') && <th>User</th>}<th>Action</th><th>Record</th><th>Details</th></tr></thead>
                <tbody>
                  {list.data.items.map((a) => (
                    <tr key={a.log_id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{dateTime(a.created_at)}</td>
                      {can('users.manage') && <td>{a.user_name || 'System'}</td>}
                      <td>{pretty(a.action)}</td>
                      <td>{a.entity ? `${a.entity}${a.entity_id ? ` #${a.entity_id}` : ''}` : '—'}</td>
                      <td className="json">{a.details ? JSON.stringify(a.details) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
        {list.data && <Pager page={page} limit={limit} total={list.data.total} onChange={setPage} />}
      </Card>
    </>
  );
}
