import { useEffect, useState } from 'react';
import api from '../api.js';
import { useAuth } from '../auth.jsx';
import { Badge, Confirm, Empty, ErrorBox, Field, Loading, Modal, PageHead, Pager, Tabs, Card, fieldErrors, money, num, day, useApi, useDebounced, useToast } from '../ui.jsx';

export default function Products() {
  const { can } = useAuth();
  const [tab, setTab] = useState('products');
  const tabs = [{ value: 'products', label: 'Products' }];
  if (can('categories.read')) tabs.push({ value: 'categories', label: 'Categories' });

  return (
    <>
      <PageHead title="Products" subtitle="Catalogue, pricing and categories" />
      {tabs.length > 1 && <Tabs tabs={tabs} value={tab} onChange={setTab} />}
      {tab === 'products' ? <ProductList /> : <CategoryList />}
    </>
  );
}

/* ---------- product list ---------- */
function ProductList() {
  const { can } = useAuth();
  const toast = useToast();
  const [q, setQ] = useState('');
  const debouncedQ = useDebounced(q);
  const [categoryId, setCategoryId] = useState('');
  const [stock, setStock] = useState('');
  const [status, setStatus] = useState('active');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null); // null | {} (new) | product
  const [confirm, setConfirm] = useState(null);
  const limit = 10;

  const categories = useApi(() => api.get('/categories').then((r) => r.data.items).catch(() => []), []);
  const suppliers = useApi(() => api.get('/suppliers').then((r) => r.data.items), []);
  const list = useApi(() => api.get('/products', {
    params: { q: debouncedQ, category_id: categoryId, stock, status, page, limit, sort: 'name' },
  }).then((r) => r.data), [debouncedQ, categoryId, stock, status, page]);

  useEffect(() => setPage(1), [debouncedQ, categoryId, stock, status]);

  const toggleActive = async (p) => {
    try {
      await api.put(`/products/${p.product_id}`, { is_active: !p.is_active });
      toast(p.is_active ? 'Product deactivated' : 'Product activated');
      list.reload();
    } catch (e) { toast(e.message, 'danger'); }
  };

  const remove = async (p) => {
    try {
      await api.delete(`/products/${p.product_id}`);
      toast('Product deleted');
      list.reload();
    } catch (e) { toast(e.message, 'danger'); }
    setConfirm(null);
  };

  const canWrite = can('products.write');

  return (
    <>
      <div className="toolbar">
        <input className="input search" placeholder="Search by name or SKU" aria-label="Search products"
          value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="select" aria-label="Category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">All categories</option>
          {categories.data?.map((c) => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
        </select>
        <select className="select" aria-label="Stock level" value={stock} onChange={(e) => setStock(e.target.value)}>
          <option value="">Any stock level</option>
          <option value="ok">In stock</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
        </select>
        <select className="select" aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="">All</option>
        </select>
        {canWrite && (
          <button className="btn primary" onClick={() => setEditing({})}>
            <i className="ti ti-plus" aria-hidden="true" /> Add product
          </button>
        )}
      </div>

      <Card>
        <ErrorBox error={list.error} onRetry={list.reload} />
        {list.loading && !list.data ? <Loading /> : list.data && (
          list.data.items.length === 0 ? <Empty title="No products match these filters" /> : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th aria-label="Image"></th>
                    <th>SKU</th><th>Product</th><th>Category</th>
                    <th className="num">Price</th><th className="num">In stock</th><th className="num">Reorder at</th>
                    <th>Expiry</th><th>Status</th>
                    {canWrite && <th aria-label="Actions"></th>}
                  </tr>
                </thead>
                <tbody>
                  {list.data.items.map((p) => (
                    <tr key={p.product_id}>
                      <td>
                        <div className="thumb" aria-hidden="true">
                          {p.image_url ? <img src={p.image_url} alt="" /> : <i className="ti ti-photo" />}
                        </div>
                      </td>
                      <td>{p.sku}</td>
                      <td>{p.product_name}{!p.is_active && <span className="muted"> (inactive)</span>}</td>
                      <td>{p.category_name || <span className="muted">—</span>}</td>
                      <td className="num">{money(p.unit_price)}</td>
                      <td className={`num ${p.stock_status === 'out' ? 'out-text' : p.stock_status === 'low' ? 'low-text' : ''}`}>{num(p.quantity)}</td>
                      <td className="num">{num(p.reorder_level)}</td>
                      <td>{p.expiry_date ? day(p.expiry_date) : <span className="muted">—</span>}</td>
                      <td><Badge tone={p.stock_status === 'ok' ? 'success' : p.stock_status === 'low' ? 'warning' : 'danger'}>
                        {p.stock_status === 'ok' ? 'In stock' : p.stock_status === 'low' ? 'Low' : 'Out'}</Badge></td>
                      {canWrite && (
                        <td>
                          <div className="row-actions">
                            <button className="icon-btn" aria-label={`Edit ${p.product_name}`} onClick={() => setEditing(p)}><i className="ti ti-edit" aria-hidden="true" /></button>
                            <button className="icon-btn" aria-label={p.is_active ? 'Deactivate' : 'Activate'} onClick={() => toggleActive(p)}>
                              <i className={`ti ${p.is_active ? 'ti-eye-off' : 'ti-eye'}`} aria-hidden="true" /></button>
                            <button className="icon-btn" aria-label={`Delete ${p.product_name}`} onClick={() => setConfirm(p)}><i className="ti ti-trash" aria-hidden="true" /></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
        {list.data && <Pager page={page} limit={limit} total={list.data.total} onChange={setPage} />}
      </Card>

      {editing && (
        <ProductForm
          product={editing.product_id ? editing : null}
          categories={categories.data || []}
          suppliers={suppliers.data || []}
          suppliersError={suppliers.error}
          onRetrySuppliers={suppliers.reload}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); list.reload(); }}
        />
      )}
      {confirm && (
        <Confirm danger confirmLabel="Delete" message={`Delete "${confirm.product_name}"? Products with order or purchase history cannot be deleted; deactivate them instead.`}
          onConfirm={() => remove(confirm)} onCancel={() => setConfirm(null)} />
      )}
    </>
  );
}

function ProductForm({ product, categories, suppliers, suppliersError, onRetrySuppliers, onClose, onSaved }) {
  const toast = useToast();
  const isNew = !product;
  const [form, setForm] = useState(() => ({
    sku: product?.sku || '',
    product_name: product?.product_name || '',
    description: product?.description || '',
    category_id: product?.category_id ?? '',
    supplier_id: product?.supplier_id ?? '',
    unit_price: product?.unit_price ?? '',
    cost_price: product?.cost_price ?? '',
    quantity: '',
    reorder_level: product?.reorder_level ?? 10,
    expiry_date: product?.expiry_date ? String(product.expiry_date).slice(0, 10) : '',
    is_active: product?.is_active ?? true,
  }));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const local = {};
    if (!form.sku.trim()) local.sku = 'Enter a SKU';
    if (!form.product_name.trim()) local.product_name = 'Enter a product name';
    if (form.unit_price === '' || Number(form.unit_price) < 0) local.unit_price = 'Enter a selling price';
    setErrors(local);
    if (Object.keys(local).length) return;

    const payload = {
      sku: form.sku.trim(),
      product_name: form.product_name.trim(),
      description: form.description || null,
      category_id: form.category_id ? Number(form.category_id) : null,
      supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
      unit_price: Number(form.unit_price),
      cost_price: Number(form.cost_price || 0),
      reorder_level: Number(form.reorder_level || 0),
      expiry_date: form.expiry_date || null,
      is_active: form.is_active,
    };
    if (isNew) payload.quantity = Number(form.quantity || 0);

    setBusy(true);
    try {
      if (isNew) await api.post('/products', payload);
      else await api.put(`/products/${product.product_id}`, payload);
      toast(isNew ? 'Product added' : 'Product saved');
      onSaved();
    } catch (err) {
      setErrors({ ...fieldErrors(err), _form: err.message });
    } finally {
      setBusy(false);
    }
  };

  const uploadImage = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      await api.post(`/products/${product.product_id}/image`, fd);
      toast('Image uploaded');
      onSaved();
    } catch (err) {
      toast(err.message, 'danger');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal title={isNew ? 'Add product' : `Edit ${product.product_name}`} onClose={onClose} wide
      footer={<>
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn primary" form="product-form" disabled={busy}>{busy ? 'Saving…' : 'Save product'}</button>
      </>}>
      {errors._form && <div className="alert danger" role="alert">{errors._form}</div>}
      <form id="product-form" onSubmit={submit} noValidate className="form-grid">
        <Field label="SKU" error={errors.sku}><input className="input" value={form.sku} onChange={set('sku')} /></Field>
        <Field label="Product name" error={errors.product_name}><input className="input" value={form.product_name} onChange={set('product_name')} /></Field>
        <Field label="Category">
          <select className="select" value={form.category_id} onChange={set('category_id')}>
            <option value="">No category</option>
            {categories.map((c) => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
          </select>
        </Field>
        <Field label="Supplier">
          <select className="select" value={form.supplier_id} onChange={set('supplier_id')}>
            <option value="">No supplier</option>
            {suppliers.map((s) => <option key={s.supplier_id} value={s.supplier_id}>{s.supplier_name}</option>)}
          </select>
          {suppliersError ? (
            <p className="field-error">Could not load suppliers. <button type="button" className="btn ghost sm" onClick={onRetrySuppliers}>Try again</button></p>
          ) : suppliers.length === 0 ? (
            <p className="muted" style={{ fontSize: '0.85rem' }}>No suppliers yet. Ask the Purchase Manager to add one.</p>
          ) : null}
        </Field>
        <Field label="Selling price (₹)" error={errors.unit_price}><input className="input" type="number" min="0" step="0.01" value={form.unit_price} onChange={set('unit_price')} /></Field>
        <Field label="Cost price (₹)" hint="Used for stock value and profit"><input className="input" type="number" min="0" step="0.01" value={form.cost_price} onChange={set('cost_price')} /></Field>
        {isNew && (
          <Field label="Opening stock" hint="Later changes are made on the Stock page">
            <input className="input" type="number" min="0" step="1" value={form.quantity} onChange={set('quantity')} />
          </Field>
        )}
        <Field label="Reorder level" hint="Alert when stock falls to this number"><input className="input" type="number" min="0" step="1" value={form.reorder_level} onChange={set('reorder_level')} /></Field>
        <Field label="Expiry date (optional)"><input className="input" type="date" value={form.expiry_date} onChange={set('expiry_date')} /></Field>
        <Field label="Description" className="wide"><textarea className="textarea" value={form.description} onChange={set('description')} /></Field>
        <label className="check wide">
          <input type="checkbox" checked={form.is_active} onChange={set('is_active')} /> Active (can be sold and ordered)
        </label>
      </form>

      {!isNew && (
        <div style={{ marginTop: '1.2rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
          <Field label="Product photo" hint="PNG, JPG, WEBP or GIF, up to 2 MB">
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={uploading}
              onChange={(e) => uploadImage(e.target.files?.[0])} />
          </Field>
          {uploading && <p className="muted">Uploading…</p>}
        </div>
      )}
    </Modal>
  );
}

/* ---------- categories ---------- */
function CategoryList() {
  const { can } = useAuth();
  const toast = useToast();
  const cats = useApi(() => api.get('/categories').then((r) => r.data.items), []);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const canWrite = can('categories.write');

  const remove = async (c) => {
    try { await api.delete(`/categories/${c.category_id}`); toast('Category deleted'); cats.reload(); }
    catch (e) { toast(e.message, 'danger'); }
    setConfirm(null);
  };

  return (
    <Card title="Categories" actions={canWrite && <button className="btn primary sm" onClick={() => setEditing({})}><i className="ti ti-plus" aria-hidden="true" /> Add category</button>}>
      <ErrorBox error={cats.error} onRetry={cats.reload} />
      {cats.loading ? <Loading /> : cats.data && (cats.data.length === 0 ? <Empty title="No categories yet" /> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Category</th><th>Description</th><th className="num">Products</th>{canWrite && <th aria-label="Actions"></th>}</tr></thead>
            <tbody>
              {cats.data.map((c) => (
                <tr key={c.category_id}>
                  <td>{c.category_name}</td>
                  <td className="muted">{c.description || '—'}</td>
                  <td className="num">{num(c.product_count)}</td>
                  {canWrite && (
                    <td><div className="row-actions">
                      <button className="icon-btn" aria-label={`Edit ${c.category_name}`} onClick={() => setEditing(c)}><i className="ti ti-edit" aria-hidden="true" /></button>
                      <button className="icon-btn" aria-label={`Delete ${c.category_name}`} onClick={() => setConfirm(c)}><i className="ti ti-trash" aria-hidden="true" /></button>
                    </div></td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {editing && <CategoryForm category={editing.category_id ? editing : null} onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); cats.reload(); }} />}
      {confirm && <Confirm danger confirmLabel="Delete" message={`Delete the category "${confirm.category_name}"? Its products stay in the catalogue without a category.`}
        onConfirm={() => remove(confirm)} onCancel={() => setConfirm(null)} />}
    </Card>
  );
}

function CategoryForm({ category, onClose, onSaved }) {
  const toast = useToast();
  const [name, setName] = useState(category?.category_name || '');
  const [description, setDescription] = useState(category?.description || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (name.trim().length < 2) return setError('Enter a category name (at least 2 characters)');
    setBusy(true); setError('');
    try {
      const body = { category_name: name.trim(), description: description || null };
      if (category) await api.put(`/categories/${category.category_id}`, body);
      else await api.post('/categories', body);
      toast('Category saved');
      onSaved();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  return (
    <Modal title={category ? 'Edit category' : 'Add category'} onClose={onClose}
      footer={<><button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn primary" form="cat-form" disabled={busy}>Save</button></>}>
      {error && <div className="alert danger" role="alert">{error}</div>}
      <form id="cat-form" onSubmit={submit} noValidate>
        <Field label="Name"><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Description"><textarea className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
      </form>
    </Modal>
  );
}
