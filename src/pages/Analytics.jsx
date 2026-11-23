import { useState } from 'react';
import api from '../api.js';
import { useAuth } from '../auth.jsx';
import { BarChartBox, DonutChartBox, TrendChart } from '../charts.jsx';
import { Card, Empty, ErrorBox, Loading, PageHead, Stat, daysAgo, money, num, today, useApi } from '../ui.jsx';

const PAYMENT = { cash: 'Cash', card: 'Card', upi: 'UPI', bank_transfer: 'Bank transfer' };

export default function Analytics() {
  const { can } = useAuth();
  const [from, setFrom] = useState(daysAgo(29));
  const [to, setTo] = useState(today());
  const [group, setGroup] = useState('day');
  const canSales = can('sales.read');

  const sales = useApi(
    () => (canSales ? api.get('/reports/sales', { params: { from, to, group } }).then((r) => r.data) : Promise.resolve(null)),
    [from, to, group, canSales]);
  const top = useApi(
    () => (canSales ? api.get('/reports/top-products', { params: { from, to } }).then((r) => r.data) : Promise.resolve(null)),
    [from, to, canSales]);
  const dash = useApi(() => api.get('/dashboard/summary').then((r) => r.data), []);

  const fmtPeriod = (p) => new Date(p + 'T00:00:00').toLocaleDateString('en-IN',
    group === 'month' ? { month: 'short', year: 'numeric' } : { day: 'numeric', month: 'short' });

  return (
    <>
      <PageHead title="Analytics" subtitle="Trends for the period you choose" />

      <div className="toolbar">
        <label className="field" style={{ margin: 0 }}>
          <span className="field-label">From</span>
          <input className="input" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="field" style={{ margin: 0 }}>
          <span className="field-label">To</span>
          <input className="input" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
        </label>
        {canSales && (
          <div className="seg" role="group" aria-label="Group by" style={{ alignSelf: 'flex-end' }}>
            <button className={group === 'day' ? 'active' : ''} aria-pressed={group === 'day'} onClick={() => setGroup('day')}>Daily</button>
            <button className={group === 'month' ? 'active' : ''} aria-pressed={group === 'month'} onClick={() => setGroup('month')}>Monthly</button>
          </div>
        )}
      </div>

      {canSales ? (
        <>
          {sales.loading && <Loading />}
          <ErrorBox error={sales.error} onRetry={sales.reload} />
          {sales.data && (
            <>
              <div className="grid-stats">
                <Stat label="Revenue" value={money(sales.data.totals.revenue)} icon="ti-cash" />
                <Stat label="Sales" value={num(sales.data.totals.sales_count)} icon="ti-receipt" />
                <Stat label="Average sale" value={money(sales.data.totals.average_sale)} icon="ti-chart-bar" />
              </div>
              <div className="grid-2">
                <Card title={group === 'month' ? 'Revenue by month' : 'Revenue by day'}>
                  {sales.data.trend.length
                    ? <TrendChart labels={sales.data.trend.map((r) => fmtPeriod(r.period))} values={sales.data.trend.map((r) => r.revenue)} />
                    : <Empty title="No sales in this period" />}
                </Card>
                <Card title="Payment methods">
                  {sales.data.by_payment.length
                    ? <DonutChartBox labels={sales.data.by_payment.map((r) => PAYMENT[r.payment_method])} values={sales.data.by_payment.map((r) => r.revenue)} />
                    : <Empty title="No payments in this period" />}
                </Card>
                <Card title="Best sellers (by revenue)">
                  {top.data && top.data.items.length
                    ? <BarChartBox horizontal money labels={top.data.items.map((r) => r.product_name)} values={top.data.items.map((r) => r.revenue)} label="Revenue" />
                    : <Empty title="No completed sales in this period" />}
                </Card>
                {dash.data?.charts?.stock_by_category && (
                  <Card title="Units in stock by category">
                    <DonutChartBox labels={dash.data.charts.stock_by_category.map((r) => r.name)} values={dash.data.charts.stock_by_category.map((r) => r.units)} />
                  </Card>
                )}
              </div>
            </>
          )}
        </>
      ) : (
        <>
          <Empty title="Sales analytics are not part of your role">Stock and purchase figures are shown below.</Empty>
          {dash.data?.charts?.stock_by_category && (
            <Card title="Units in stock by category">
              <DonutChartBox labels={dash.data.charts.stock_by_category.map((r) => r.name)} values={dash.data.charts.stock_by_category.map((r) => r.units)} />
            </Card>
          )}
        </>
      )}
    </>
  );
}
