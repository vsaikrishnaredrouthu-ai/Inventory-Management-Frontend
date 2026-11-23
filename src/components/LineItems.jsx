import { useEffect, useState } from 'react';
import api from '../api.js';
import { Field, money } from '../ui.jsx';

export const itemsTotal = (items) =>
  items.reduce((sum, l) => sum + Number(l.quantity || 0) * Number(l.unit_price || 0), 0);

/**
 * Editable list of product lines used by orders, sales and purchases.
 * value: [{ product_id, quantity, unit_price }]
 */
export default function LineItems({ value, onChange, priceKey = 'unit_price', priceLabel = 'Unit price', showPrice = true }) {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    api.get('/products', { params: { status: 'active', limit: 100, sort: 'name' } })
      .then((r) => setProducts(r.data.items))
      .catch(() => setProducts([]));
  }, []);

  const byId = Object.fromEntries(products.map((p) => [p.product_id, p]));
  const setLine = (i, patch) => onChange(value.map((l, n) => (n === i ? { ...l, ...patch } : l)));
  const pickProduct = (i, id) => {
    const p = byId[id];
    setLine(i, { product_id: id ? Number(id) : '', unit_price: p ? p[priceKey] : '' });
  };
  const remove = (i) => onChange(value.filter((_, n) => n !== i));
  const add = () => onChange([...value, { product_id: '', quantity: 1, unit_price: '' }]);

  return (
    <div className="line-items">
      {value.map((line, i) => (
        <div className="line-item" key={i}>
          <Field label="Product">
            <select className="select" value={line.product_id} onChange={(e) => pickProduct(i, e.target.value)}>
              <option value="">Choose a product</option>
              {products.map((p) => (
                <option key={p.product_id} value={p.product_id}>
                  {p.product_name} ({p.sku}) · in stock {p.quantity}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Quantity">
            <input className="input" type="number" min="1" step="1" value={line.quantity}
              onChange={(e) => setLine(i, { quantity: e.target.value })} />
          </Field>
          {showPrice ? (
            <Field label={priceLabel}>
              <input className="input" type="number" min="0" step="0.01" value={line.unit_price}
                onChange={(e) => setLine(i, { unit_price: e.target.value })} />
            </Field>
          ) : <span />}
          <button type="button" className="icon-btn" aria-label="Remove this product" onClick={() => remove(i)}>
            <i className="ti ti-trash" aria-hidden="true" />
          </button>
        </div>
      ))}
      <div className="inline-form" style={{ justifyContent: 'space-between' }}>
        <button type="button" className="btn sm" onClick={add}><i className="ti ti-plus" aria-hidden="true" /> Add product</button>
        {showPrice && <span className="line-total">Total {money(itemsTotal(value))}</span>}
      </div>
    </div>
  );
}
