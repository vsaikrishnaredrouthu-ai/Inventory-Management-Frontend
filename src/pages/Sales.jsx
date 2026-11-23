import { useEffect, useState } from 'react';
import api from '../api.js';
import { useAuth } from '../auth.jsx';
import LineItems, { itemsTotal } from '../components/LineItems.jsx';
import OrderModal from '../components/OrderModal.jsx';
import { Badge, Card, Empty, ErrorBox, Field, Loading, Modal, PageHead, Pager, dateTime, fieldErrors, money, num, today, daysAgo, useApi, useDebounced, useToast } from '../ui.jsx';

const PAYMENT = { cash: 'Cash', card: 'Card', upi: 'UPI', bank_transfer: 'Bank transfer' };

export default function Sales() {
  const { can } = useAuth();
  const toast = useToast();
  const [payment, setPayment] = useState('');
  const [q, setQ] = useState('');
  const debouncedQ = useDebounced(q);
  const [from, setFrom] = useState(daysAgo(29));
  const [to, setTo] = useState(today());
  const [page, setPage] = useState(1);
  const [recording, setRecording] = useState(false);
  const [viewing, setViewing] = useState(null);
  const limit = 12;

  const list = useApi(() => api.get('/sales', { params: { payment_method: payment, q: debouncedQ, from, to, page, limit } }).then((r) => r.data),
    [payment, debouncedQ, from, to, page]);
  useEffect(() => setPage(1), [payment, debouncedQ, from, to]);

  return (
    <>
      <PageHead title="Sales" subtitle="Record sales and payments"
        actions={can('sales.write') && <button className="btn primary" onClick={() => setRecording(true)}><i className="ti ti-plus" aria-hidden="true" /> New sale</button>} />

      <div className="toolbar">
        <input className="input search" placeholder="Search customer" aria-label="Search sales" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="select" aria-label="Payment method" value={payment} onChange={(e) => setPayment(e.target.value)}>
          <option value="">All payments</option>
          {Object.entries(PAYMENT).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input className="input" type="date" aria-label="From" value={from} onChange={(e) => setFrom(e.target.value)} style={{ width: 'auto' }} />
        <input className="input" type="date" aria-label="To" value={to} onChange={(e) => setTo(e.target.value)} style={{ width: 'auto' }} />
      </div>

      <Card>
        <ErrorBox error={list.error} onRetry={list.reload} />
        {list.loading && !list.data ? <Loading /> : list.data && (
          list.data.items.length === 0 ? <Empty title="No sales in this period" /> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Sale</th><th>Date</th><th>Customer</th><th>Payment</th><th className="num">Amount</th><th>Sold by</th><th aria-label="Actions"></th></tr></thead>
                <tbody>
                  {list.data.items.map((s) => (
                    <tr key={s.sale_id}>
                      <td>#{s.order_id}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{dateTime(s.created_at)}</td>
                      <td>{s.customer_name}</td>
                      <td><Badge tone="info">{PAYMENT[s.payment_method]}</Badge></td>
                      <td className="num">{money(s.amount_paid)}</td>
                      <td>{s.sold_by_name || '—'}</td>
                      <td><div className="row-actions">
                        <button className="btn sm ghost" onClick={() => setViewing(s.order_id)}>View / invoice</button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
        {list.data && <Pager page={page} limit={limit} total={list.data.total} onChange={setPage} />}
      </Card>

      {recording && <NewSale onClose={() => setRecording(false)} onSaved={(id) => { setRecording(false); toast(`Sale #${id} recorded`); list.reload(); }} />}
      {viewing && <OrderModal orderId={viewing} onClose={() => setViewing(null)} onChanged={list.reload} />}
    </>
  );
}

function NewSale({ onClose, onSaved }) {
  const [form, setForm] = useState({ customer_name: '', customer_phone: '', payment_method: 'cash', amount_paid: '' });
  const [items, setItems] = useState([{ product_id: '', quantity: 1, unit_price: '' }]);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const total = itemsTotal(items);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const local = {};
    if (items.some((l) => !l.product_id || !(Number(l.quantity) > 0))) local.items = 'Each line needs a product and a quantity';
    const paid = Number(form.amount_paid || 0);
    if (!(paid >= total - 0.001)) local.amount_paid = `Amount paid must cover the total (${money(total)})`;
    setErrors(local);
    if (Object.keys(local).length) return;

    setBusy(true);
    try {
      const { data } = await api.post('/sales', {
        customer_name: form.customer_name || undefined,
        customer_phone: form.customer_phone || null,
        payment_method: form.payment_method,
        amount_paid: paid,
        items: items.map((l) => ({ product_id: Number(l.product_id), quantity: Number(l.quantity), unit_price: Number(l.unit_price || 0) })),
      });
      onSaved(data.order_id);
    } catch (err) {
      setErrors({ ...fieldErrors(err), _form: err.message });
    } finally { setBusy(false); }
  };

  return (
    <Modal title="New sale" onClose={onClose} wide
      footer={<><button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn primary" form="sale-form" disabled={busy}>{busy ? 'Saving…' : 'Complete sale'}</button></>}>
      {errors._form && <div className="alert danger" role="alert">{errors._form}</div>}
      <form id="sale-form" onSubmit={submit} noValidate>
        <div className="form-grid">
          <Field label="Customer name (optional)"><input className="input" placeholder="Walk-in customer" value={form.customer_name} onChange={set('customer_name')} /></Field>
          <Field label="Customer phone (optional)"><input className="input" value={form.customer_phone} onChange={set('customer_phone')} /></Field>
          <Field label="Payment method">
            <select className="select" value={form.payment_method} onChange={set('payment_method')}>
              {Object.entries(PAYMENT).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
          <Field label="Amount received (₹)" error={errors.amount_paid}>
            <span className="input-wrap">
              <input className="input" type="number" min="0" step="0.01" value={form.amount_paid}
                placeholder={total ? String(total.toFixed(2)) : '0.00'} onChange={set('amount_paid')} />
            </span>
          </Field>
        </div>
        {errors.items && <p className="field-error">{errors.items}</p>}
        <LineItems value={items} onChange={setItems} priceLabel="Unit price (₹)" />
        <div className="totals">
          <strong>Total {money(total)}</strong>
          <button type="button" className="btn ghost sm" onClick={() => setForm({ ...form, amount_paid: total.toFixed(2) })}>Fill with total</button>
        </div>
      </form>
    </Modal>
  );
}
