import { createContext, useCallback, useContext, useEffect, useState } from 'react';

/* ---------- formatting ---------- */
export const money = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(n || 0));
export const num = (n) => new Intl.NumberFormat('en-IN').format(Number(n || 0));
export const dateTime = (s) => (s ? new Date(s).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—');
// DATE columns come back as YYYY-MM-DD; parse them as local dates so they don't shift a day.
export const day = (s) => (s ? new Date(String(s).slice(0, 10) + 'T00:00:00').toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '—');
export const today = () => new Date().toISOString().slice(0, 10);
export const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

export const ROLE_LABEL = {
  owner: 'Owner', product_manager: 'Product Manager', sales_manager: 'Sales Manager',
  stock_manager: 'Stock Manager', purchase_manager: 'Purchase Manager', order_manager: 'Order Manager',
};

/* ---------- toasts ---------- */
const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const notify = useCallback((text, tone = 'success') => {
    const id = `${Date.now()}-${Math.random()}`;
    setItems((list) => [...list, { id, text, tone }]);
    setTimeout(() => setItems((list) => list.filter((i) => i.id !== id)), 4000);
  }, []);
  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((i) => (
          <div key={i.id} className={`toast ${i.tone}`}>{i.text}</div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

/* ---------- data loading ---------- */
export function useApi(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null, status: null });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    fn()
      .then((data) => alive && setState({ data, loading: false, error: null, status: null }))
      .catch((e) => alive && setState({ data: null, loading: false, error: e.message, status: e.status }));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return { ...state, reload: () => setTick((t) => t + 1) };
}

export function useDebounced(value, ms = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

/* ---------- building blocks ---------- */
export function PageHead({ title, subtitle, actions }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

export function Card({ title, actions, children, className = '' }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <div className="card-head">
          {title && <h2>{title}</h2>}
          {actions && <div className="card-actions">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, tone = '', icon }) {
  return (
    <div className={`stat ${tone}`}>
      {icon && <i className={`ti ${icon}`} aria-hidden="true" />}
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

export function Badge({ tone = 'neutral', children }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

const STATUS_TONE = {
  ok: 'success', low: 'warning', out: 'danger',
  pending: 'warning', processing: 'info', completed: 'success', received: 'success', cancelled: 'neutral',
  active: 'success', inactive: 'neutral',
};
export function StatusBadge({ value }) {
  const labels = { ok: 'In stock', low: 'Low stock', out: 'Out of stock' };
  return <Badge tone={STATUS_TONE[value] || 'neutral'}>{labels[value] || value}</Badge>;
}

export function Loading({ label = 'Loading…' }) {
  return <div className="state muted" role="status"><i className="ti ti-loader-2 spin" aria-hidden="true" /> {label}</div>;
}

export function ErrorBox({ error, onRetry }) {
  if (!error) return null;
  return (
    <div className="alert danger" role="alert">
      <span>{error}</span>
      {onRetry && <button className="btn ghost sm" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function Empty({ title = 'Nothing here yet', children }) {
  return (
    <div className="empty">
      <i className="ti ti-inbox" aria-hidden="true" />
      <p><strong>{title}</strong></p>
      {children && <p className="muted">{children}</p>}
    </div>
  );
}

export function Pager({ page, limit, total, onChange }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  if (total <= limit) return null;
  return (
    <nav className="pager" aria-label="Pagination">
      <button className="btn ghost sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        <i className="ti ti-chevron-left" aria-hidden="true" /> Previous
      </button>
      <span className="muted">Page {page} of {pages} · {num(total)} records</span>
      <button className="btn ghost sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>
        Next <i className="ti ti-chevron-right" aria-hidden="true" />
      </button>
    </nav>
  );
}

export function Modal({ title, onClose, children, footer, wide = false }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" aria-label="Close" onClick={onClose}><i className="ti ti-x" aria-hidden="true" /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, error, hint, children, className = '' }) {
  return (
    <label className={`field ${error ? 'has-error' : ''} ${className}`}>
      <span className="field-label">{label}</span>
      {children}
      {hint && !error && <span className="field-hint">{hint}</span>}
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}

/** Turns a server error with per-field details into a map for <Field error>. */
export function fieldErrors(err) {
  const map = {};
  (err?.details || []).forEach((d) => { if (d.field) map[d.field] = d.message; });
  return map;
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={value === t.value}
          className={value === t.value ? 'active' : ''}
          onClick={() => onChange(t.value)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Confirm({ message, onConfirm, onCancel, confirmLabel = 'Confirm', danger = false }) {
  return (
    <Modal
      title="Please confirm"
      onClose={onCancel}
      footer={
        <>
          <button className="btn ghost" onClick={onCancel}>Cancel</button>
          <button className={`btn ${danger ? 'danger' : 'primary'}`} onClick={onConfirm}>{confirmLabel}</button>
        </>
      }
    >
      <p>{message}</p>
    </Modal>
  );
}
