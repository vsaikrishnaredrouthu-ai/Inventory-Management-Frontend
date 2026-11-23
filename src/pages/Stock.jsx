import { useEffect, useState } from 'react';
import api from '../api.js';
import { useAuth } from '../auth.jsx';
import { Badge, Card, Empty, ErrorBox, Field, Loading, Modal, PageHead, Pager, Stat, StatusBadge, Tabs, dateTime, fieldErrors, money, num, useApi, useDebounced, useToast } from '../ui.jsx';

const MOVE_TYPES = [
  { value: 'stock_in', label: 'Stock in (received)' },
  { value: 'stock_out', label: 'Stock out (taken out)' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'expired', label: 'Expired / discarded' },
  { value: 'adjustment', label: 'Adjustment (set counted quantity)' },
];
const TYPE_LABEL = Object.fromEntries([...MOVE_TYPES, { value: 'initial', label: 'Opening stock' }, { value: 'purchase_received', label: 'Purchase received' },
  { value: 'order', label: 'Order' }, { value: 'order_cancelled', label: 'Order cancelled' }].map((t) => [t.value, t.label]));
const TYPE_TONE = { stock_in: 'success', purchase_received: 'success', initial: 'info', adjustment: 'info', stock_out: 'warning', order: 'warning', damaged: 'danger', expired: 'danger', order_cancelled: 'neutral' };

export default function Stock() {
  const { can } = useAuth();
  const [tab, setTab] = useState('levels');
  const [moving, setMoving] = useState(false);
  const [levelsTotals, setLevelsTotals] = useState(null);
  const [filter, setFilter] = useState('');

  // Each summary card opens the levels table with the matching filter.
  const card = (label, value, icon, target, tone) => (
    <button type="button" className="stat-button" aria-label={`${label}: show these items`}
      onClick={() => { setTab('levels'); setFilter(target); }}>
      <Stat label={label} value={value} icon={icon} tone={tone} />
    </button>
  );

  return (
    <>
      <PageHead title="Stock" subtitle="Current levels, movements and history"
        actions={can('stock.write') && <button className="btn primary" onClick={() => setMoving(true)}>
          <i className="ti ti-arrows-exchange" aria-hidden="true" /> Record stock movement</button>} />

      {levelsTotals && (
        <div className="grid-stats">
          {card('Products tracked', num(levelsTotals.products), 'ti-package', '')}
          {card('Low stock', num(levelsTotals.low_stock), 'ti-alert-triangle', 'low', 'warning')}
          {card('Out of stock', num(levelsTotals.out_of_stock), 'ti-circle-x', 'out', 'danger')}
          {card('Stock value (at cost)', money(levelsTotals.stock_value), 'ti-coin', '')}
        </div>
      )}

      <Tabs tabs={[{ value: 'levels', label: 'Stock levels' }, { value: 'history', label: 'Stock history' }]} value={tab} onChange={setTab} />
      {tab === 'levels' ? <Levels onTotals={setLevelsTotals} refreshKey={moving} filter={filter} setFilter={setFilter} />
        : <History />}

      {moving && <MovementForm onClose={() => setMoving(false)} onSaved={() => setMoving(false)} />}
    </>
  );
}

function Levels({ onTotals, refreshKey, filter, setFilter }) {
  const [q, setQ] = useState('');
  const debouncedQ = useDebounced(q);
  const [categoryId, setCategoryId] = useState('');
  const [page, setPage] = useState(1);
  const limit = 12;
  const categories = useApi(() => api.get('/categories').then((r) => r.data.items).catch(() => []), []);
  const levels = useApi(() => api.get('/stock/levels', {
    params: { q: debouncedQ, filter, category_id: categoryId, page, limit },
  }).then((r) => r.data), [debouncedQ, filter, categoryId, page, refreshKey]);

  useEffect(() => setPage(1), [debouncedQ, filter, categoryId]);
  useEffect(() => { if (levels.data?.totals) onTotals(levels.data.totals); }, [levels.data, onTotals]);

  return (
    <>
      <div className="toolbar">
        <input className="input search" placeholder="Search product or SKU" aria-label="Search stock" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="select" aria-label="Category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">All categories</option>
          {categories.data?.map((c) => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
        </select>
        <select className="select" aria-label="Show" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All items</option>
          <option value="low">Low or out of stock</option>
          <option value="out">Out of stock</option>
          <option value="expiring">Expiring within 30 days</option>
        </select>
      </div>
      <Card>
        <ErrorBox error={levels.error} onRetry={levels.reload} />
        {levels.loading && !levels.data ? <Loading /> : levels.data && (
          levels.data.items.length === 0 ? <Empty title="No items match these filters" /> : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>SKU</th><th>Product</th><th>Category</th><th className="num">On hand</th><th className="num">Reorder at</th>
                    <th className="num">Value</th><th>Expiry</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {levels.data.items.map((p) => (
                    <tr key={p.product_id}>
                      <td>{p.sku}</td>
                      <td>{p.product_name}</td>
                      <td>{p.category_name || <span className="muted">—</span>}</td>
                      <td className={`num ${p.stock_status === 'out' ? 'out-text' : p.stock_status === 'low' ? 'low-text' : ''}`}>{num(p.quantity)}</td>
                      <td className="num">{num(p.reorder_level)}</td>
                      <td className="num">{money(p.stock_value)}</td>
                      <td>{p.expiring ? <Badge tone="warning">{p.expiry_date?.slice(0, 10)}</Badge> : <span className="muted">{p.expiry_date ? p.expiry_date.slice(0, 10) : '—'}</span>}</td>
                      <td><StatusBadge value={p.stock_status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
        {levels.data && <Pager page={page} limit={limit} total={levels.data.total} onChange={setPage} />}
      </Card>
    </>
  );
}

function History() {
  const [productId, setProductId] = useState('');
  const [type, setType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const limit = 15;
  const products = useApi(() => api.get('/products', { params: { limit: 100, sort: 'name', status: '' } }).then((r) => r.data.items).catch(() => []), []);
  const history = useApi(() => api.get('/stock/transactions', {
    params: { product_id: productId, type, from, to, page, limit },
  }).then((r) => r.data), [productId, type, from, to, page]);

  useEffect(() => setPage(1), [productId, type, from, to]);

  return (
    <>
      <div className="toolbar">
        <select className="select" aria-label="Product" value={productId} onChange={(e) => setProductId(e.target.value)}>
          <option value="">All products</option>
          {products.data?.map((p) => <option key={p.product_id} value={p.product_id}>{p.product_name}</option>)}
        </select>
        <select className="select" aria-label="Movement type" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option>
          {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input className="input" type="date" aria-label="From date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ minWidth: 0, width: 'auto' }} />
        <input className="input" type="date" aria-label="To date" value={to} onChange={(e) => setTo(e.target.value)} style={{ minWidth: 0, width: 'auto' }} />
      </div>
      <Card>
        <ErrorBox error={history.error} onRetry={history.reload} />
        {history.loading && !history.data ? <Loading /> : history.data && (
          history.data.items.length === 0 ? <Empty title="No stock movements found" /> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>When</th><th>Product</th><th>Type</th><th className="num">Change</th><th className="num">Balance</th><th>By</th><th>Reason</th></tr></thead>
                <tbody>
                  {history.data.items.map((t) => (
                    <tr key={t.transaction_id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{dateTime(t.created_at)}</td>
                      <td>{t.product_name} <span className="muted">· {t.sku}</span></td>
                      <td><Badge tone={TYPE_TONE[t.transaction_type] || 'neutral'}>{TYPE_LABEL[t.transaction_type] || t.transaction_type}</Badge></td>
                      <td className={`num ${t.quantity_change < 0 ? 'out-text' : 'success-text'}`}>{t.quantity_change > 0 ? `+${num(t.quantity_change)}` : num(t.quantity_change)}</td>
                      <td className="num">{num(t.quantity_after)}</td>
                      <td>{t.user_name || <span className="muted">System</span>}</td>
                      <td className="muted">{t.reason || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
        {history.data && <Pager page={page} limit={limit} total={history.data.total} onChange={setPage} />}
      </Card>
    </>
  );
}

function MovementForm({ onClose, onSaved }) {
  const toast = useToast();
  const products = useApi(() => api.get('/products', { params: { limit: 100, sort: 'name', status: 'active' } }).then((r) => r.data.items), []);
  const [form, setForm] = useState({ product_id: '', type: 'stock_in', quantity: '', new_quantity: '', reason: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const current = products.data?.find((p) => String(p.product_id) === String(form.product_id));
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const local = {};
    if (!form.product_id) local.product_id = 'Choose a product';
    if (form.type === 'adjustment' && form.new_quantity === '') local.new_quantity = 'Enter the counted quantity';
    if (form.type !== 'adjustment' && !(Number(form.quantity) > 0)) local.quantity = 'Enter a quantity above zero';
    setErrors(local);
    if (Object.keys(local).length) return;

    const body = { product_id: Number(form.product_id), type: form.type, reason: form.reason || null };
    if (form.type === 'adjustment') body.new_quantity = Number(form.new_quantity);
    else body.quantity = Number(form.quantity);

    setBusy(true);
    try {
      const { data } = await api.post('/stock/movements', body);
      toast(`Stock updated: ${num(data.before)} → ${num(data.after)}`);
      onSaved();
    } catch (err) {
      setErrors({ ...fieldErrors(err), _form: err.message });
    } finally { setBusy(false); }
  };

  return (
    <Modal title="Record stock movement" onClose={onClose}
      footer={<><button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn primary" form="move-form" disabled={busy}>{busy ? 'Saving…' : 'Save movement'}</button></>}>
      {products.loading && <Loading label="Loading products…" />}
      {errors._form && <div className="alert danger" role="alert">{errors._form}</div>}
      <form id="move-form" onSubmit={submit} noValidate>
        <Field label="Product" error={errors.product_id}>
          <select className="select" value={form.product_id} onChange={set('product_id')}>
            <option value="">Choose a product</option>
            {products.data?.map((p) => <option key={p.product_id} value={p.product_id}>{p.product_name} ({p.sku})</option>)}
          </select>
        </Field>
        {current && <p className="muted" style={{ marginTop: '-0.4rem' }}>Currently on hand: <strong>{num(current.quantity)}</strong></p>}
        <Field label="Movement type">
          <select className="select" value={form.type} onChange={set('type')}>
            {MOVE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
        {form.type === 'adjustment' ? (
          <Field label="Counted quantity" error={errors.new_quantity} hint="The stock will be set to this number">
            <input className="input" type="number" min="0" step="1" value={form.new_quantity} onChange={set('new_quantity')} />
          </Field>
        ) : (
          <Field label="Quantity" error={errors.quantity}>
            <input className="input" type="number" min="1" step="1" value={form.quantity} onChange={set('quantity')} />
          </Field>
        )}
        <Field label="Reason (optional)"><input className="input" value={form.reason} onChange={set('reason')} /></Field>
      </form>
    </Modal>
  );
}
