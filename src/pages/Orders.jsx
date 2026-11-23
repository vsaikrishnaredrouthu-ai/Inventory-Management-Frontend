import { useEffect, useState } from 'react';
import api from '../api.js';
import { useAuth } from '../auth.jsx';
import LineItems from '../components/LineItems.jsx';
import OrderModal from '../components/OrderModal.jsx';
import { Badge, Card, Empty, ErrorBox, Field, Loading, Modal, PageHead, Pager, dateTime, fieldErrors, money, num, useApi, useDebounced, useToast } from '../ui.jsx';

const TONE = { pending: 'warning', processing: 'info', completed: 'success', cancelled: 'neutral' };

export default function Orders() {
  const { can } = useAuth();
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const debouncedQ = useDebounced(q);
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState(null);
  const limit = 12;
  const list = useApi(() => api.get('/orders', { params: { status, q: debouncedQ, page, limit } }).then((r) => r.data),
    [status, debouncedQ, page]);
  useEffect(() => setPage(1), [status, debouncedQ]);

  return (
    <>
      <PageHead title="Orders" subtitle="Customer orders and their progress"
        actions={can('orders.write') && <button className="btn primary" onClick={() => setCreating(true)}><i className="ti ti-plus" aria-hidden="true" /> New order</button>} />

      <div className="toolbar">
        <input className="input search" placeholder="Search customer, phone or order number" aria-label="Search orders" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="select" aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <Card>
        <ErrorBox error={list.error} onRetry={list.reload} />
        {list.loading && !list.data ? <Loading /> : list.data && (
          list.data.items.length === 0 ? <Empty title="No orders match these filters" /> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>#</th><th>Created</th><th>Customer</th><th className="num">Items</th><th className="num">Total</th><th>Status</th><th>By</th><th aria-label="Actions"></th></tr></thead>
                <tbody>
                  {list.data.items.map((o) => (
                    <tr key={o.order_id}>
                      <td>{o.order_id}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{dateTime(o.created_at)}</td>
                      <td>{o.customer_name}{o.customer_phone && <div className="muted" style={{ fontSize: '0.82rem' }}>{o.customer_phone}</div>}</td>
                      <td className="num">{num(o.item_count)}</td>
                      <td className="num">{money(o.total_amount)}</td>
                      <td><Badge tone={TONE[o.status]}>{o.status}</Badge></td>
                      <td>{o.created_by_name || '—'}</td>
                      <td><button className="btn sm ghost" onClick={() => setViewing(o.order_id)}>Open</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
        {list.data && <Pager page={page} limit={limit} total={list.data.total} onChange={setPage} />}
      </Card>

      {creating && <NewOrder onClose={() => setCreating(false)} onSaved={(id) => { setCreating(false); toast(`Order #${id} created`); list.reload(); }} />}
      {viewing && <OrderModal orderId={viewing} onClose={() => setViewing(null)} onChanged={list.reload} />}
    </>
  );
}

function NewOrder({ onClose, onSaved }) {
  const [form, setForm] = useState({ customer_name: '', customer_phone: '', notes: '' });
  const [items, setItems] = useState([{ product_id: '', quantity: 1, unit_price: '' }]);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (items.some((l) => !l.product_id || !(Number(l.quantity) > 0))) {
      return setErrors({ items: 'Each line needs a product and a quantity' });
    }
    setBusy(true);
    try {
      const { data } = await api.post('/orders', {
        customer_name: form.customer_name || undefined,
        customer_phone: form.customer_phone || null,
        notes: form.notes || null,
        items: items.map((l) => ({ product_id: Number(l.product_id), quantity: Number(l.quantity) })),
      });
      onSaved(data.order_id);
    } catch (err) {
      setErrors({ ...fieldErrors(err), _form: err.message });
    } finally { setBusy(false); }
  };

  return (
    <Modal title="New order" onClose={onClose} wide
      footer={<><button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn primary" form="order-form" disabled={busy}>{busy ? 'Saving…' : 'Create order'}</button></>}>
      {errors._form && <div className="alert danger" role="alert">{errors._form}</div>}
      <form id="order-form" onSubmit={submit} noValidate>
        <div className="form-grid">
          <Field label="Customer name"><input className="input" placeholder="Walk-in customer" value={form.customer_name} onChange={set('customer_name')} /></Field>
          <Field label="Customer phone"><input className="input" value={form.customer_phone} onChange={set('customer_phone')} /></Field>
        </div>
        {errors.items && <p className="field-error">{errors.items}</p>}
        <LineItems value={items} onChange={setItems} showPrice={false} />
        <Field label="Notes"><textarea className="textarea" value={form.notes} onChange={set('notes')} /></Field>
        <p className="muted" style={{ fontSize: '0.88rem' }}>Stock is reserved as soon as the order is created. Cancelling returns it.</p>
      </form>
    </Modal>
  );
}
