import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api.js';
import { Card, Empty, ErrorBox, Loading, PageHead, Pager, dateTime, useApi, useToast } from '../ui.jsx';

export default function Notifications() {
  const navigate = useNavigate();
  const toast = useToast();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 15;
  const list = useApi(() => api.get('/notifications', {
    params: { unread: unreadOnly ? 1 : 0, page, limit },
  }).then((r) => r.data), [unreadOnly, page]);
  useEffect(() => setPage(1), [unreadOnly]);

  const open = async (n) => {
    if (!n.is_read) {
      await api.post(`/notifications/${n.notification_id}/read`).catch(() => {});
    }
    if (n.link) navigate(n.link);
    else list.reload();
  };

  const markAll = async () => {
    try {
      await api.post('/notifications/read-all');
      toast('All notifications marked as read');
      list.reload();
    } catch (e) { toast(e.message, 'danger'); }
  };

  return (
    <>
      <PageHead title="Notifications" subtitle="Low stock, expiry, orders and account updates"
        actions={<>
          <div className="seg" role="group" aria-label="Filter">
            <button className={!unreadOnly ? 'active' : ''} aria-pressed={!unreadOnly} onClick={() => setUnreadOnly(false)}>All</button>
            <button className={unreadOnly ? 'active' : ''} aria-pressed={unreadOnly} onClick={() => setUnreadOnly(true)}>Unread</button>
          </div>
          <button className="btn" onClick={markAll}>Mark all as read</button>
        </>} />

      <Card>
        <ErrorBox error={list.error} onRetry={list.reload} />
        {list.loading && !list.data ? <Loading /> : list.data && (
          list.data.items.length === 0 ? <Empty title={unreadOnly ? 'No unread notifications' : 'No notifications yet'}>
            Alerts appear here when stock runs low or an order needs attention.
          </Empty> : (
            <ul className="list">
              {list.data.items.map((n) => (
                <li key={n.notification_id} className={n.is_read ? '' : 'unread'}>
                  <span className={`dot ${n.is_read ? 'off' : ''}`} aria-hidden="true" />
                  <button onClick={() => open(n)} style={{ all: 'unset', cursor: 'pointer', flex: 1 }}>
                    <div style={{ color: n.type === 'danger' ? 'var(--danger)' : n.type === 'warning' ? 'var(--warning)' : 'inherit' }}>{n.title}</div>
                    {n.message && <div className="muted" style={{ fontSize: '0.9rem', fontWeight: 400 }}>{n.message}</div>}
                    <div className="muted" style={{ fontSize: '0.8rem', fontWeight: 400 }}>{dateTime(n.created_at)}{n.link ? ' · open' : ''}</div>
                  </button>
                </li>
              ))}
            </ul>
          )
        )}
        {list.data && <Pager page={page} limit={limit} total={list.data.total} onChange={setPage} />}
      </Card>
    </>
  );
}
