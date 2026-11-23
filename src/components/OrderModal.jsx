import api from '../api.js';
import { useAuth } from '../auth.jsx';
import { Badge, ErrorBox, Loading, Modal, dateTime, money, num, useApi, useToast } from '../ui.jsx';

const PAYMENT = { cash: 'Cash', card: 'Card', upi: 'UPI', bank_transfer: 'Bank transfer' };

/** Order details with status actions and a printable invoice. Used by Orders and Sales. */
export default function OrderModal({ orderId, onClose, onChanged }) {
  const { can } = useAuth();
  const toast = useToast();
  const { data: o, loading, error, reload } = useApi(
    () => api.get(`/orders/${orderId}`).then((r) => r.data), [orderId]);

  const setStatus = async (status) => {
    try {
      await api.post(`/orders/${orderId}/status`, { status });
      toast(`Order #${orderId} is now ${status}`);
      reload();
      onChanged?.();
    } catch (e) {
      toast(e.message, 'danger');
    }
  };

  const canAct = can('orders.write') && o;
  const footer = o && (
    <>
      <button className="btn ghost no-print" onClick={() => window.print()}>
        <i className="ti ti-printer" aria-hidden="true" /> Print invoice
      </button>
      {canAct && o.status === 'pending' && <button className="btn" onClick={() => setStatus('processing')}>Start processing</button>}
      {canAct && o.status === 'processing' && <button className="btn primary" onClick={() => setStatus('completed')}>Mark completed</button>}
      {canAct && ['pending', 'processing'].includes(o.status) && (
        <button className="btn danger" onClick={() => setStatus('cancelled')}>Cancel order</button>
      )}
    </>
  );

  return (
    <Modal title={`Order #${orderId}`} onClose={onClose} footer={footer} wide>
      {loading && <Loading />}
      <ErrorBox error={error} onRetry={reload} />
      {o && (
        <>
          <div className="grid-2" style={{ marginBottom: '1rem' }}>
            <dl className="kv">
              <dt>Customer</dt><dd>{o.customer_name}</dd>
              <dt>Phone</dt><dd>{o.customer_phone || '—'}</dd>
              <dt>Created</dt><dd>{dateTime(o.created_at)}</dd>
              <dt>By</dt><dd>{o.created_by_name || '—'}</dd>
            </dl>
            <dl className="kv">
              <dt>Status</dt><dd><Badge tone={{ pending: 'warning', processing: 'info', completed: 'success', cancelled: 'neutral' }[o.status]}>{o.status}</Badge></dd>
              <dt>Payment</dt><dd>{o.payment_method ? `${PAYMENT[o.payment_method]} · ${money(o.amount_paid)}` : 'Not paid yet'}</dd>
              <dt>Notes</dt><dd>{o.notes || '—'}</dd>
            </dl>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Product</th><th>SKU</th><th className="num">Qty</th><th className="num">Price</th><th className="num">Amount</th></tr>
              </thead>
              <tbody>
                {o.items.map((it) => (
                  <tr key={it.order_item_id}>
                    <td>{it.product_name}</td>
                    <td>{it.sku}</td>
                    <td className="num">{num(it.quantity)}</td>
                    <td className="num">{money(it.unit_price)}</td>
                    <td className="num">{money(it.quantity * it.unit_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="totals">
            <strong>Total {money(o.total_amount)}</strong>
          </div>
        </>
      )}
    </Modal>
  );
}
