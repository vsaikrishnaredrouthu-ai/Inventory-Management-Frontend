import { useState } from 'react';
import api, { downloadCsv } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Card, Empty, ErrorBox, Loading, PageHead, Stat, daysAgo, money, num, today, useApi, useToast } from '../ui.jsx';

const EXPORTS = [
  { type: 'sales', label: 'Sales', perm: 'sales.read', icon: 'ti-receipt' },
  { type: 'orders', label: 'Orders', perm: 'orders.read', icon: 'ti-shopping-cart' },
  { type: 'purchases', label: 'Purchases', perm: 'purchases.read', icon: 'ti-truck' },
  { type: 'stock', label: 'Stock levels', perm: 'stock.read', icon: 'ti-stack-2' },
  { type: 'stock_history', label: 'Stock history', perm: 'stock.read', icon: 'ti-history' },
];

export default function Reports() {
  const { can } = useAuth();
  const toast = useToast();
  const [from, setFrom] = useState(daysAgo(29));
  const [to, setTo] = useState(today());
  const [busy, setBusy] = useState('');

  const sales = useApi(() => (can('sales.read')
    ? api.get('/reports/sales', { params: { from, to } }).then((r) => r.data) : Promise.resolve(null)), [from, to]);
  const purchases = useApi(() => (can('purchases.read')
    ? api.get('/reports/purchases', { params: { from, to } }).then((r) => r.data) : Promise.resolve(null)), [from, to]);
  const stock = useApi(() => (can('stock.read')
    ? api.get('/reports/stock').then((r) => r.data) : Promise.resolve(null)), []);

  const available = EXPORTS.filter((e) => can(e.perm));

  const exportCsv = async (type) => {
    setBusy(type);
    try {
      await downloadCsv('/reports/export', { type, from, to }, `${type}-${from}-to-${to}.csv`);
      toast('Report downloaded');
    } catch (e) {
      toast(e.message, 'danger');
    } finally {
      setBusy('');
    }
  };

  return (
    <>
      <PageHead title="Reports" subtitle="Summaries and downloadable CSV files for the period you choose" />

      <div className="toolbar">
        <label className="field" style={{ margin: 0 }}>
          <span className="field-label">From</span>
          <input className="input" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="field" style={{ margin: 0 }}>
          <span className="field-label">To</span>
          <input className="input" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
        </label>
      </div>

      <Card title="Download CSV">
        {available.length === 0 ? <Empty title="No reports are available for your role" /> : (
          <div className="page-actions">
            {available.map((e) => (
              <button key={e.type} className="btn" disabled={busy === e.type} onClick={() => exportCsv(e.type)}>
                <i className={`ti ${e.icon}`} aria-hidden="true" /> {busy === e.type ? 'Preparing…' : e.label}
              </button>
            ))}
          </div>
        )}
        <p className="muted" style={{ fontSize: '0.85rem', marginTop: '0.75rem', marginBottom: 0 }}>
          Sales, orders and purchases use the dates above. Stock files show the current position.
        </p>
      </Card>

      {sales.data && (
        <Card title="Sales summary">
          <ErrorBox error={sales.error} onRetry={sales.reload} />
          <div className="grid-stats" style={{ marginBottom: '0.75rem' }}>
            <Stat label="Revenue" value={money(sales.data.totals.revenue)} icon="ti-cash" />
            <Stat label="Sales" value={num(sales.data.totals.sales_count)} icon="ti-receipt" />
            <Stat label="Average sale" value={money(sales.data.totals.average_sale)} icon="ti-chart-bar" />
          </div>
          {sales.data.by_payment.length > 0 && (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Payment method</th><th className="num">Sales</th><th className="num">Revenue</th></tr></thead>
                <tbody>
                  {sales.data.by_payment.map((r) => (
                    <tr key={r.payment_method}><td>{r.payment_method.replace('_', ' ')}</td><td className="num">{num(r.sales_count)}</td><td className="num">{money(r.revenue)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {purchases.data && (
        <Card title="Received purchases by supplier">
          <ErrorBox error={purchases.error} onRetry={purchases.reload} />
          {purchases.data.items.length === 0 ? <p className="muted">No received purchases in this period.</p> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Supplier</th><th className="num">Purchases</th><th className="num">Total</th></tr></thead>
                <tbody>
                  {purchases.data.items.map((r) => (
                    <tr key={r.supplier_name}><td>{r.supplier_name}</td><td className="num">{num(r.purchases)}</td><td className="num">{money(r.total)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {can('stock.read') && (
        <Card title="Stock position">
          {stock.loading && <Loading />}
          <ErrorBox error={stock.error} onRetry={stock.reload} />
          {stock.data && (
            <div className="table-wrap">
              <table>
                <thead><tr><th>SKU</th><th>Product</th><th>Category</th><th className="num">On hand</th><th className="num">Reorder at</th><th className="num">Value</th><th>Status</th></tr></thead>
                <tbody>
                  {stock.data.items.slice(0, 50).map((p) => (
                    <tr key={p.sku}>
                      <td>{p.sku}</td><td>{p.product_name}</td><td>{p.category_name || '—'}</td>
                      <td className="num">{num(p.quantity)}</td><td className="num">{num(p.reorder_level)}</td>
                      <td className="num">{money(p.stock_value)}</td>
                      <td>{p.status === 'ok' ? 'In stock' : p.status === 'low' ? 'Low' : 'Out of stock'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {stock.data.items.length > 50 && <p className="muted">Showing 50 of {num(stock.data.items.length)}. Download the CSV for the full list.</p>}
            </div>
          )}
        </Card>
      )}
    </>
  );
}
