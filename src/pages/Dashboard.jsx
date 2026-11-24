import { Link } from 'react-router-dom';
import api from '../api.js';
import { useAuth } from '../auth.jsx';
import { BarChartBox, DonutChartBox, TrendChart } from '../charts.jsx';
import ShiftCard from '../components/ShiftCard.jsx';
import { navFor } from '../nav.js';
import { Card, ErrorBox, Loading, PageHead, Stat, StatusBadge, dateTime, money, num, useApi, ROLE_LABEL } from '../ui.jsx';

const PAGE_PERM = {
  '/products': 'products.read', '/stock': 'stock.read', '/orders': 'orders.read',
  '/purchases': 'purchases.read', '/sales': 'sales.read', '/reports': 'reports.view', '/users': 'users.manage',
};

const prettyAction = (a) => a.replace(/[._]/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

export default function Dashboard() {
  const { user, can } = useAuth();
  const { data, loading, error, reload } = useApi(() => api.get('/dashboard/summary').then((r) => r.data));

  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;

  const s = data.stats;
  const c = data.charts;
  const l = data.lists;
  const has = (k) => s[k] !== undefined;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const cards = [
    has('sales_today') && { label: `Sales today (${num(s.sales_count_today)})`, value: money(s.sales_today), icon: 'ti-cash', to: ['/reports', '/sales'] },
    has('sales_month') && { label: 'Sales this month', value: money(s.sales_month), icon: 'ti-chart-bar', to: ['/reports', '/sales'] },
    has('products') && { label: 'Active products', value: num(s.products), icon: 'ti-package', to: ['/products', '/stock'] },
    has('low_stock') && { label: 'Low stock items', value: num(s.low_stock), icon: 'ti-alert-triangle', tone: 'warning', to: ['/stock', '/products'] },
    has('out_of_stock') && { label: 'Out of stock', value: num(s.out_of_stock), icon: 'ti-circle-x', tone: 'danger', to: ['/stock', '/products'] },
    has('stock_value') && { label: 'Stock value (at cost)', value: money(s.stock_value), icon: 'ti-coin', to: ['/reports', '/stock'] },
    has('open_orders') && { label: 'Open orders', value: num(s.open_orders), icon: 'ti-shopping-cart', to: ['/orders', '/sales'] },
    has('pending_purchases') && { label: 'Purchases awaiting receipt', value: num(s.pending_purchases), icon: 'ti-truck', tone: 'warning', to: ['/purchases', '/reports'] },
    has('purchases_month') && { label: 'Received this month', value: money(s.purchases_month), icon: 'ti-truck-delivery', to: ['/purchases', '/reports'] },
    has('active_users') && { label: `Active users (of ${num(s.users)})`, value: num(s.active_users), icon: 'ti-users', to: ['/users'] },
    { label: 'Unread notifications', value: num(s.unread_notifications), icon: 'ti-bell', to: ['/notifications'] },
  ].filter(Boolean);

  // A card links to the first page in its list that this role can open from the sidebar.
  // A card opens a page if it is in the role's sidebar or the role has the read permission for it.
  const sidebar = new Set(navFor(user.role_key).map((i) => i.to));
  const canOpen = (page) => sidebar.has(page) || (PAGE_PERM[page] && can(PAGE_PERM[page]));
  const cardTo = (card) => (card.to || []).find(canOpen) || null;

  return (
    <>
      <PageHead
        title={`${greeting}, ${user.full_name.split(' ')[0]}`}
        subtitle={`${ROLE_LABEL[user.role_key] || user.role_name} dashboard · figures update as work is recorded`}
      />

      <ShiftCard />

      <div className="grid-stats">
        {cards.map((card) => {
          const to = cardTo(card);
          const stat = <Stat label={card.label} value={card.value} icon={card.icon} tone={card.tone} />;
          return to ? (
            <Link key={card.label} to={to} className="stat-link" aria-label={`${card.label}: open ${to.slice(1) || 'dashboard'}`}>
              {stat}
            </Link>
          ) : (
            <div key={card.label}>{stat}</div>
          );
        })}
      </div>

      <div className="grid-2">
        {c.sales_trend && (
          <Card title="Sales, last 14 days">
            <TrendChart labels={c.sales_trend.map((r) => r.day)} values={c.sales_trend.map((r) => r.revenue)} />
          </Card>
        )}
        {c.top_products && (
          <Card title="Top products, last 30 days">
            {c.top_products.length
              ? <BarChartBox horizontal money labels={c.top_products.map((r) => r.name)} values={c.top_products.map((r) => r.revenue)} label="Revenue" />
              : <p className="muted">No completed sales in the last 30 days yet.</p>}
          </Card>
        )}
        {c.stock_by_category && (
          <Card title="Units in stock by category">
            <DonutChartBox labels={c.stock_by_category.map((r) => r.name)} values={c.stock_by_category.map((r) => r.units)} />
          </Card>
        )}
        {l.low_stock && (
          <Card title="Needs reordering" actions={<Link className="btn ghost sm" to="/stock">Open stock</Link>}>
            {l.low_stock.length === 0 ? <p className="muted">Everything is above its reorder level.</p> : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Product</th><th className="num">Qty</th><th className="num">Reorder at</th><th>Status</th></tr></thead>
                  <tbody>
                    {l.low_stock.map((p) => (
                      <tr key={p.product_id}>
                        <td>{p.product_name} <span className="muted">· {p.sku}</span></td>
                        <td className="num">{num(p.quantity)}</td>
                        <td className="num">{num(p.reorder_level)}</td>
                        <td><StatusBadge value={p.quantity === 0 ? 'out' : 'low'} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
      </div>
    </>
  );
}
