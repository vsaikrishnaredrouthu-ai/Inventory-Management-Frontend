# Inventory Management – Frontend

Responsive React (Vite) web app for the Inventory Management website. Each role sees
its own dashboard and sidebar, as shown in the flow chart. It talks to the Express
API over Axios and draws charts with Chart.js.

## Features

- One login screen for all six roles, with show/hide password, Remember me, and Forgot password
- Role-based sidebar: Owner (User management), Product Manager (Products), Sales Manager (Sales), Stock Manager (Stock), Purchase Manager (Purchase), Order Manager (Orders)
- Common pages for everyone: Dashboard, Analytics, Reports, Notifications, Activity history, My profile, Settings, Help & support, Logout
- Interactive tables with search, filters, sorting and paging; add/edit dialogs with inline validation
- Quick sale and new order forms with live totals; printable invoice
- Purchase receiving and stock movements (in, out, damaged, expired, adjustment)
- Charts on the dashboard and Analytics page (sales trend, top products, payment methods, stock by category)
- CSV downloads for each report the role can see
- Light, dark and device-matching themes
- Responsive: the sidebar becomes a slide-in menu on phones and tablets; tables scroll sideways inside their card, so the page itself never does

## Quick start

Requirements: Node.js 18 or newer, and the backend running on port 5000.

```bash
npm install
cp .env.example .env.development   # optional: set VITE_SHOW_DEMO=true to show demo login buttons
npm run dev                        # http://localhost:5173
```

The dev server proxies `/api` and `/uploads` to `http://localhost:5000`.

Demo logins (after `npm run db:demo` in the backend, password `Demo@1234`):
`owner@demo.local`, `product@demo.local`, `sales@demo.local`, `stock@demo.local`,
`purchase@demo.local`, `orders@demo.local`.

## Build and deploy

```bash
npm run build      # outputs dist/
```

Either:

- **Same server as the API:** set `FRONTEND_DIST=/path/to/dist` in the backend `.env`. The API then serves the app at its root URL.
- **Separate hosting** (Vercel, Netlify, Cloudflare Pages, Render static site): set `VITE_API_URL` to your API address, e.g. `https://inventory-api.example.com/api`, and add the frontend URL to the backend's `CORS_ORIGINS`.

For a separate host, set `VITE_API_URL` before running `npm run build`. Vite reads it at build time.

## Project layout

```
index.html                 entry page
vite.config.js             dev server and API proxy
src/main.jsx               providers: router, toasts, auth
src/App.jsx                routes; pages require login
src/api.js                 Axios client, token storage, 401 handling, CSV download
src/auth.jsx               login state, permissions, theme
src/nav.js                 sidebar items per role
src/ui.jsx                 shared components (tables, modals, pager, badges, toasts) and formatters
src/charts.jsx             Chart.js wrappers
src/components/            Layout (sidebar + top bar), LineItems (product lines), OrderModal (order details and invoice)
src/pages/                 one file per screen
src/styles.css             design tokens (light and dark), layout, responsive rules, print styles
```

## Notes

- Currency is shown in Indian rupees (₹) and dates in `en-IN` format. Change `money()` and `dateTime()` in `src/ui.jsx` for another locale.
- The frontend hides menus by role, but the backend is the real security check. Every page is backed by a permission-checked API.
- Tabler Icons are bundled from npm (`@tabler/icons-webfont`), so the app works offline from the CDN.
