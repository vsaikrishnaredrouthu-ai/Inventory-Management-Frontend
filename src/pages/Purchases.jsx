import { useEffect, useState } from 'react';
import api from '../api.js';
import { useAuth } from '../auth.jsx';
import LineItems, { itemsTotal } from '../components/LineItems.jsx';
import { Badge, Card, Confirm, Empty, ErrorBox, Field, Loading, Modal, PageHead, Pager, Tabs, dateTime, day, fieldErrors, money, num, today, useApi, useDebounced, useToast } from '../ui.jsx';

export default function Purchases() {
  const { can } = useAuth();
  const [tab, setTab] = useState('purchases');
  const tabs = [{ value: 'purchases', label: 'Purchase orders' }];
  if (can('suppliers.read')) tabs.push({ value: 'suppliers', label: 'Suppliers' });
  return (
    <>
      <PageHead title="Purchase" subtitle="Buy from suppliers and receive goods into stock" />
      {tabs.length > 1 && <Tabs tabs={tabs} value={tab} onChange={setTab} />}
      {tab === 'purchases' ? <PurchaseList /> : <SupplierList />}
    </>
  );
}

const STATUS_TONE = { pending: 'warning', received: 'success', cancelled: 'neutral' };

function PurchaseList() {
  const { can } = useAuth();
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const debouncedQ = useDebounced(q);
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const limit = 10;
  const list = useApi(() => api.get('/purchases', { params: { status, q: debouncedQ, page, limit } }).then((r) => r.data),
    [status, debouncedQ, page]);
  useEffect(() => setPage(1), [status, debouncedQ]);

  const act = async (fn, msg) => {
    try { await fn(); toast(msg); list.reload(); } catch (e) { toast(e.message, 'danger'); }
  };

  return (
    <>
      <div className="toolbar">
        <input className="input search" placeholder="Search supplier" aria-label="Search purchases" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="select" aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="received">Received</option>
          <option value="cancelled">Cancelled</option>
        </select>
        {can('purchases.write') && <button className="btn primary" onClick={() => setCreating(true)}><i className="ti ti-plus" aria-hidden="true" /> New purchase</button>}
      </div>
      <Card>
        <ErrorBox error={list.error} onRetry={list.reload} />
        {list.loading && !list.data ? <Loading /> : list.data && (
          list.data.items.length === 0 ? <Empty title="No purchase orders yet" /> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>#</th><th>Date</th><th>Supplier</th><th className="num">Items</th><th className="num">Total</th><th>Status</th><th>Created by</th><th aria-label="Actions"></th></tr></thead>
                <tbody>
                  {list.data.items.map((p) => (
                    <tr key={p.purchase_id}>
                      <td>{p.purchase_id}</td>
                      <td>{day(p.purchase_date)}</td>
                      <td>{p.supplier_name}</td>
                      <td className="num">{num(p.item_count)}</td>
                      <td className="num">{money(p.total_amount)}</td>
                      <td><Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge></td>
                      <td>{p.created_by_name || '—'}</td>
                      <td><div className="row-actions">
                        <button className="icon-btn" aria-label={`View purchase ${p.purchase_id}`} onClick={() => setViewing(p.purchase_id)}><i className="ti ti-eye" aria-hidden="true" /></button>
                        {can('purchases.write') && p.status === 'pending' && <>
                          <button className="btn sm primary" onClick={() => act(() => api.post(`/purchases/${p.purchase_id}/receive`), 'Received into stock')}>Receive</button>
                          <button className="btn sm ghost" onClick={() => setConfirm({ id: p.purchase_id, msg: `Cancel purchase #${p.purchase_id}?` })}>Cancel</button>
                        </>}
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

      {creating && <NewPurchase onClose={() => setCreating(false)} onSaved={() => { setCreating(false); list.reload(); }} />}
      {viewing && <PurchaseDetail id={viewing} onClose={() => setViewing(null)} />}
      {confirm && <Confirm danger confirmLabel="Cancel purchase" message={confirm.msg} onCancel={() => setConfirm(null)}
        onConfirm={() => { const id = confirm.id; setConfirm(null); act(() => api.post(`/purchases/${id}/cancel`), 'Purchase cancelled'); }} />}
    </>
  );
}

function NewPurchase({ onClose, onSaved }) {
  const toast = useToast();
  const suppliers = useApi(() => api.get('/suppliers').then((r) => r.data.items), []);
  const [form, setForm] = useState({ supplier_id: '', purchase_date: today(), notes: '' });
  const [items, setItems] = useState([{ product_id: '', quantity: 1, unit_price: '' }]);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const local = {};
    if (!form.supplier_id) local.supplier_id = 'Choose a supplier';
    if (items.some((l) => !l.product_id || !(Number(l.quantity) > 0))) local.items = 'Each line needs a product and a quantity';
    setErrors(local);
    if (Object.keys(local).length) return;
    setBusy(true);
    try {
      await api.post('/purchases', {
        supplier_id: Number(form.supplier_id),
        purchase_date: form.purchase_date || undefined,
        notes: form.notes || null,
        items: items.map((l) => ({ product_id: Number(l.product_id), quantity: Number(l.quantity), unit_cost: Number(l.unit_price || 0) })),
      });
      toast('Purchase order created. Receive it when the goods arrive.');
      onSaved();
    } catch (err) {
      setErrors({ ...fieldErrors(err), _form: err.message });
    } finally { setBusy(false); }
  };

  return (
    <Modal title="New purchase order" onClose={onClose} wide
      footer={<><button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn primary" form="po-form" disabled={busy}>{busy ? 'Saving…' : 'Create purchase'}</button></>}>
      {suppliers.loading && <Loading label="Loading suppliers…" />}
      {errors._form && <div className="alert danger" role="alert">{errors._form}</div>}
      <form id="po-form" onSubmit={submit} noValidate>
        <div className="form-grid">
          <Field label="Supplier" error={errors.supplier_id}>
            <select className="select" value={form.supplier_id} onChange={set('supplier_id')}>
              <option value="">Choose a supplier</option>
              {suppliers.data?.filter((s) => s.is_active).map((s) => <option key={s.supplier_id} value={s.supplier_id}>{s.supplier_name}</option>)}
            </select>
          </Field>
          <Field label="Purchase date"><input className="input" type="date" value={form.purchase_date} onChange={set('purchase_date')} /></Field>
        </div>
        {errors.items && <p className="field-error">{errors.items}</p>}
        <LineItems value={items} onChange={setItems} priceKey="cost_price" priceLabel="Unit cost (₹)" />
        <Field label="Notes (optional)"><textarea className="textarea" value={form.notes} onChange={set('notes')} /></Field>
        <p className="totals"><strong>Total {money(itemsTotal(items))}</strong></p>
      </form>
    </Modal>
  );
}

function PurchaseDetail({ id, onClose }) {
  const { data: p, loading, error, reload } = useApi(() => api.get(`/purchases/${id}`).then((r) => r.data), [id]);
  return (
    <Modal title={`Purchase #${id}`} onClose={onClose} wide>
      {loading && <Loading />}
      <ErrorBox error={error} onRetry={reload} />
      {p && (
        <>
          <dl className="kv" style={{ marginBottom: '1rem' }}>
            <dt>Supplier</dt><dd>{p.supplier_name}</dd>
            <dt>Date</dt><dd>{day(p.purchase_date)}</dd>
            <dt>Status</dt><dd><Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge>{p.received_at && <span className="muted"> · received {dateTime(p.received_at)}</span>}</dd>
            <dt>Notes</dt><dd>{p.notes || '—'}</dd>
          </dl>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Product</th><th>SKU</th><th className="num">Qty</th><th className="num">Unit cost</th><th className="num">Amount</th></tr></thead>
              <tbody>
                {p.items.map((it) => (
                  <tr key={it.purchase_item_id}><td>{it.product_name}</td><td>{it.sku}</td><td className="num">{num(it.quantity)}</td>
                    <td className="num">{money(it.unit_cost)}</td><td className="num">{money(it.quantity * it.unit_cost)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="totals"><strong>Total {money(p.total_amount)}</strong></div>
        </>
      )}
    </Modal>
  );
}

/* ---------- suppliers ---------- */
function SupplierList() {
  const { can } = useAuth();
  const toast = useToast();
  const [q, setQ] = useState('');
  const debouncedQ = useDebounced(q);
  const list = useApi(() => api.get('/suppliers', { params: { q: debouncedQ } }).then((r) => r.data.items), [debouncedQ]);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const canWrite = can('suppliers.write');

  const remove = async (s) => {
    try { await api.delete(`/suppliers/${s.supplier_id}`); toast('Supplier deleted'); list.reload(); }
    catch (e) { toast(e.message, 'danger'); }
    setConfirm(null);
  };

  return (
    <>
      <div className="toolbar">
        <input className="input search" placeholder="Search suppliers" aria-label="Search suppliers" value={q} onChange={(e) => setQ(e.target.value)} />
        {canWrite && <button className="btn primary" onClick={() => setEditing({})}><i className="ti ti-plus" aria-hidden="true" /> Add supplier</button>}
      </div>
      <Card>
        <ErrorBox error={list.error} onRetry={list.reload} />
        {list.loading && !list.data ? <Loading /> : list.data && (
          list.data.length === 0 ? <Empty title="No suppliers found" /> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Supplier</th><th>Contact</th><th>Phone</th><th>Email</th><th className="num">Purchases</th><th>Status</th>{canWrite && <th aria-label="Actions"></th>}</tr></thead>
                <tbody>
                  {list.data.map((s) => (
                    <tr key={s.supplier_id}>
                      <td>{s.supplier_name}</td>
                      <td>{s.contact_person || '—'}</td>
                      <td>{s.phone || '—'}</td>
                      <td>{s.email || '—'}</td>
                      <td className="num">{num(s.purchase_count)}</td>
                      <td><Badge tone={s.is_active ? 'success' : 'neutral'}>{s.is_active ? 'Active' : 'Inactive'}</Badge></td>
                      {canWrite && <td><div className="row-actions">
                        <button className="icon-btn" aria-label={`Edit ${s.supplier_name}`} onClick={() => setEditing(s)}><i className="ti ti-edit" aria-hidden="true" /></button>
                        <button className="icon-btn" aria-label={`Delete ${s.supplier_name}`} onClick={() => setConfirm(s)}><i className="ti ti-trash" aria-hidden="true" /></button>
                      </div></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </Card>
      {editing && <SupplierForm supplier={editing.supplier_id ? editing : null} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); list.reload(); }} />}
      {confirm && <Confirm danger confirmLabel="Delete" message={`Delete "${confirm.supplier_name}"? Suppliers with purchase orders cannot be deleted; mark them inactive instead.`}
        onConfirm={() => remove(confirm)} onCancel={() => setConfirm(null)} />}
    </>
  );
}

function SupplierForm({ supplier, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    supplier_name: supplier?.supplier_name || '', contact_person: supplier?.contact_person || '',
    phone: supplier?.phone || '', email: supplier?.email || '', address: supplier?.address || '',
    is_active: supplier?.is_active ?? true,
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const local = {};
    if (form.supplier_name.trim().length < 2) local.supplier_name = 'Enter the supplier name';
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) local.email = 'Enter a valid email';
    setErrors(local);
    if (Object.keys(local).length) return;
    setBusy(true);
    try {
      if (supplier) await api.put(`/suppliers/${supplier.supplier_id}`, form);
      else await api.post('/suppliers', form);
      toast('Supplier saved');
      onSaved();
    } catch (err) { setErrors({ ...fieldErrors(err), _form: err.message }); }
    finally { setBusy(false); }
  };

  return (
    <Modal title={supplier ? 'Edit supplier' : 'Add supplier'} onClose={onClose}
      footer={<><button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn primary" form="sup-form" disabled={busy}>Save supplier</button></>}>
      {errors._form && <div className="alert danger" role="alert">{errors._form}</div>}
      <form id="sup-form" onSubmit={submit} noValidate className="form-grid">
        <Field label="Supplier name" error={errors.supplier_name} className="wide"><input className="input" value={form.supplier_name} onChange={set('supplier_name')} /></Field>
        <Field label="Contact person"><input className="input" value={form.contact_person} onChange={set('contact_person')} /></Field>
        <Field label="Phone"><input className="input" value={form.phone} onChange={set('phone')} /></Field>
        <Field label="Email" error={errors.email}><input className="input" type="email" value={form.email} onChange={set('email')} /></Field>
        <Field label="Address" className="wide"><textarea className="textarea" value={form.address} onChange={set('address')} /></Field>
        {supplier && <label className="check wide"><input type="checkbox" checked={form.is_active} onChange={set('is_active')} /> Active supplier</label>}
      </form>
    </Modal>
  );
}
