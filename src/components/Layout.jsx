import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import api from '../api.js';
import { navFor } from '../nav.js';
import { ROLE_LABEL } from '../ui.jsx';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const items = useMemo(() => navFor(user.role_key), [user.role_key]);

  // Close the mobile drawer whenever the page changes.
  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    let alive = true;
    const load = () =>
      api.get('/notifications', { params: { limit: 1 } })
        .then((r) => alive && setUnread(r.data.unread))
        .catch(() => {});
    load();
    const timer = setInterval(load, 60000);
    return () => { alive = false; clearInterval(timer); };
  }, [location.pathname]);

  const onLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className={`app ${open ? 'nav-open' : ''}`}>
      <aside className="sidebar" aria-label="Main navigation">
        <div className="brand">
          <i className="ti ti-box-seam" aria-hidden="true" />
          <span>Inventory</span>
          <button className="icon-btn close-btn" aria-label="Close menu" onClick={() => setOpen(false)}>
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>
        <nav>
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className="nav-link">
              <i className={`ti ${item.icon}`} aria-hidden="true" />
              <span>{item.label}</span>
              {item.badge && unread > 0 && <span className="count" aria-label={`${unread} unread`}>{unread}</span>}
            </NavLink>
          ))}
        </nav>
        <button className="nav-link logout" onClick={onLogout}>
          <i className="ti ti-logout" aria-hidden="true" />
          <span>Logout</span>
        </button>
      </aside>

      <div className="scrim" onClick={() => setOpen(false)} aria-hidden="true" />

      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-btn" aria-label="Open menu" onClick={() => setOpen(true)}>
            <i className="ti ti-menu-2" aria-hidden="true" />
          </button>
          <div className="who">
            <span className="avatar" aria-hidden="true">{user.full_name?.[0] || '?'}</span>
            <div>
              <div className="who-name">{user.full_name}</div>
              <div className="role-pill">{ROLE_LABEL[user.role_key] || user.role_name}</div>
            </div>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
