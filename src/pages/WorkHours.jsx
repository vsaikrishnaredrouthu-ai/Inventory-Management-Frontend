import { useState } from 'react';
import api, { downloadCsv } from '../api.js';
import { Card, Empty, ErrorBox, Field, Loading, PageHead, Stat, day, dateTime, num, today, useApi, useToast } from '../ui.jsx';

export default function WorkHours() {
  const toast = useToast();
  const [range, setRange] = useState({ from: today(), to: today(), user_id: '' });
  const set = (k) => (e) => setRange({ ...range, [k]: e.target.value });
  const params = { from: range.from, to: range.to, ...(range.user_id ? { user_id: range.user_id } : {}) };

  const people = useApi(() => api.get('/users').then((r) => r.data.items), []);
  const list = useApi(() => api.get('/shifts', { params }).then((r) => r.data), [range.from, range.to, range.user_id]);
  const items = list.data?.items || [];
  const totalHours = items.reduce((sum, i) => sum + Number(i.hours || 0), 0);

  const download = async () => {
    try {
      await downloadCsv('/shifts/export', params, `work-hours-${range.from}-to-${range.to}.csv`);
    } catch (err) {
      toast(err.message, 'danger');
    }
  };

  return (
    <>
      <PageHead
        title="Work hours"
        subtitle="Check-in and check-out times for staff"
        actions={<button className="btn" onClick={download}>Download CSV</button>}
      />
      <Card>
        <div className="grid-3">
          <Field label="From"><input className="input" type="date" value={range.from} onChange={set('from')} /></Field>
          <Field label="To"><input className="input" type="date" value={range.to} onChange={set('to')} /></Field>
          <Field label="Staff member">
            <select className="select" value={range.user_id} onChange={set('user_id')}>
              <option value="">Everyone</option>
              {(people.data || []).map((p) => <option key={p.user_id} value={p.user_id}>{p.full_name}</option>)}
            </select>
          </Field>
        </div>
      </Card>

      <div className="grid-stats" style={{ marginTop: '1rem' }}>
        <Stat label="Records" value={num(items.length)} icon="ti-calendar-check" />
        <Stat label="Hours worked" value={totalHours.toFixed(2)} icon="ti-clock" />
      </div>

      <Card title="Records" className="mt">
        {list.loading && <Loading />}
        <ErrorBox error={list.error} onRetry={list.reload} />
        {!list.loading && !list.error && (items.length === 0 ? (
          <Empty title="No records in this period">Staff appear here after they check in.</Empty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Name</th><th>Date</th><th>Check in</th><th>Check out</th><th className="num">Hours</th></tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.shift_id}>
                    <td>{i.full_name}</td>
                    <td>{day(i.work_date)}</td>
                    <td>{dateTime(i.check_in)}</td>
                    <td>{i.check_out ? dateTime(i.check_out) : 'Still working'}</td>
                    <td className="num">{i.hours != null ? Number(i.hours).toFixed(2) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </Card>
    </>
  );
}
