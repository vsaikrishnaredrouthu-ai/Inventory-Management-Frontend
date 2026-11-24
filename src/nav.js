// Sidebar items per role, following the flow chart. The backend enforces the same rules.
const MODULE = {
  owner: { to: '/users', label: 'User management', icon: 'ti-users' },
  product_manager: { to: '/products', label: 'Products', icon: 'ti-package' },
  sales_manager: { to: '/sales', label: 'Sales', icon: 'ti-receipt' },
  stock_manager: [
    { to: '/stock', label: 'Stock', icon: 'ti-stack-2' },
    { to: '/products', label: 'Products', icon: 'ti-package' },
  ],
  purchase_manager: { to: '/purchases', label: 'Purchase', icon: 'ti-truck' },
  order_manager: { to: '/orders', label: 'Orders', icon: 'ti-shopping-cart' },
};

export function navFor(roleKey) {
  return [
    { to: '/', label: 'Dashboard', icon: 'ti-layout-dashboard', end: true },
    ...[].concat(MODULE[roleKey] || []),
    { to: '/analytics', label: 'Analytics', icon: 'ti-chart-line' },
    { to: '/reports', label: 'Reports', icon: 'ti-file-text' },
    { to: '/notifications', label: 'Notifications', icon: 'ti-bell', badge: true },
    // Activity history is for the Owner only.
    ...(roleKey === 'owner' ? [{ to: '/activity', label: 'Activity history', icon: 'ti-history' }] : []),
    { to: '/profile', label: 'My profile', icon: 'ti-user' },
    { to: '/settings', label: 'Settings', icon: 'ti-settings' },
    { to: '/help', label: 'Help & support', icon: 'ti-help' },
  ].filter(Boolean);
}
