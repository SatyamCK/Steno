import { Fragment, useState } from 'react';
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { homePathFor, useAuth } from '../context/AuthContext';
import Header from './Header';

function NavBar({ links, onLogout }) {
  const [open, setOpen] = useState(false);
  return (
    <nav className="navbar no-print">
      <button type="button" className="navbar__toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        ☰ Menu
      </button>
      <ul className={`navbar__list${open ? ' is-open' : ''}`} onClick={() => setOpen(false)}>
        {links.map((l) => (
          <Fragment key={l.to}>
            <li>
              <NavLink to={l.to} end={l.end}>{l.label}</NavLink>
            </li>
          </Fragment>
        ))}
        <li>
          <button type="button" className="navbar__logout" onClick={onLogout}>Logout</button>
        </li>
      </ul>
    </nav>
  );
}

const STUDENT_LINKS = [
  { to: '/home', label: 'Home' },
  { to: '/shorthand', label: 'English Shorthand' },
  { to: '/english-typing', label: 'English Typing' },
  { to: '/hindi-typing', label: 'Hindi Typing' },
  { to: '/fee', label: 'Fee Detail' },
  { to: '/about', label: 'About' },
];

const ADMIN_LINKS = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/students', label: 'Students' },
  { to: '/admin/tests', label: 'Tests' },
  { to: '/admin/results', label: 'Results' },
  { to: '/admin/settings', label: 'Settings' },
];

function useLogout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  return () => {
    logout();
    navigate('/', { replace: true });
  };
}

export function StudentLayout() {
  const { user } = useAuth();
  const onLogout = useLogout();
  return (
    <>
      <Header person={user} />
      <NavBar links={STUDENT_LINKS} onLogout={onLogout} />
      <main className="page">
        <Outlet />
      </main>
    </>
  );
}

export function AdminLayout() {
  const { user } = useAuth();
  const onLogout = useLogout();
  return (
    <>
      <Header person={user} badge="Admin" />
      <NavBar links={ADMIN_LINKS} onLogout={onLogout} />
      <main className="page page--wide">
        <Outlet />
      </main>
    </>
  );
}

/** Pages shown without the nav bar (test, result, outline) – mockup pages 5-7, 10. */
export function FocusLayout() {
  return (
    <main className="page page--wide">
      <Outlet />
    </main>
  );
}

export function PublicLayout() {
  return (
    <>
      <Header />
      <main className="page">
        <Outlet />
      </main>
    </>
  );
}

export function RequireAuth({ role, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="loader">Loading…</div>;
  if (!user) return <Navigate to="/" replace state={{ from: location.pathname }} />;
  if (role && user.role !== role) return <Navigate to={homePathFor(user)} replace />;
  return children;
}
