import {
  BarChart3, ClipboardList, Home, IndianRupee, Info, Keyboard, Languages, LayoutDashboard, LogOut, PenLine, Settings, Users,
} from 'lucide-react';
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { homePathFor, useAuth } from '../context/AuthContext';
import { useApi } from '../utils/hooks';
import { useConfirm } from './feedback';
import Header from './Header';
import { Spinner } from './ui';

const STUDENT_LINKS = [
  { to: '/home', label: 'Home', icon: Home },
  { to: '/shorthand', label: 'English Shorthand', icon: PenLine },
  { to: '/english-typing', label: 'English Typing', icon: Keyboard },
  { to: '/hindi-typing', label: 'Hindi Typing', icon: Languages },
  { to: '/fee', label: 'Fee Detail', icon: IndianRupee },
  { to: '/about', label: 'About', icon: Info },
];

function useLogout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();
  return async () => {
    if (!(await confirm({ title: 'Log out?', text: 'You will need your username and password to log in again.', confirmLabel: 'Log out' }))) return;
    logout();
    navigate('/', { replace: true });
  };
}

export function Footer() {
  return (
    <footer className="footer no-print">
      <div className="footer__inner">
        <span>© {new Date().getFullYear()} Steno Drive. All rights reserved.</span>
        <span>Shorthand &amp; typing practice for competitive exams</span>
      </div>
    </footer>
  );
}

export function StudentLayout() {
  const onLogout = useLogout();
  return (
    <>
      <Header />
      <nav className="tabnav no-print" aria-label="Main">
        <div className="tabnav__inner">
          {STUDENT_LINKS.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to}><Icon size={17} />{label}</NavLink>
          ))}
          <button type="button" className="tabnav__logout" onClick={onLogout}><LogOut size={17} />Logout</button>
        </div>
      </nav>
      <main className="main">
        <Outlet />
      </main>
      <Footer />
    </>
  );
}

export function AdminLayout() {
  const onLogout = useLogout();
  const { pathname } = useLocation();
  // Refreshes the pending badge whenever the admin navigates.
  const { data: stats } = useApi(`/admin/stats?_=${pathname}`);
  const pending = stats?.students.pending || 0;

  return (
    <>
      <Header badge="Admin" />
      <div className="admin-shell">
        <nav className="sidebar no-print" aria-label="Admin">
          <div className="sidebar__label">Overview</div>
          <NavLink to="/admin" end><LayoutDashboard size={18} />Dashboard</NavLink>
          <div className="sidebar__label">Manage</div>
          <NavLink to="/admin/students"><Users size={18} />Students{pending > 0 && <span className="sidebar__count">{pending}</span>}</NavLink>
          <NavLink to="/admin/tests"><ClipboardList size={18} />Tests</NavLink>
          <NavLink to="/admin/results"><BarChart3 size={18} />Results</NavLink>
          <NavLink to="/admin/settings"><Settings size={18} />Settings</NavLink>
          <div className="sidebar__bottom">
            <button type="button" onClick={onLogout}><LogOut size={18} />Logout</button>
          </div>
        </nav>
        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </>
  );
}

/** Pages without the nav bar (test, result, outline) – mockup pages 5-7, 10. */
export function FocusLayout({ children, person }) {
  return (
    <>
      <Header person={person} />
      {children}
      <Footer />
    </>
  );
}

export function PublicLayout() {
  return (
    <>
      <Header showUser={false} />
      <main className="main main--narrow">
        <Outlet />
      </main>
      <Footer />
    </>
  );
}

export function RequireAuth({ role, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="empty"><Spinner size={28} /></div>;
  if (!user) return <Navigate to="/" replace state={{ from: location.pathname }} />;
  if (role && user.role !== role) return <Navigate to={homePathFor(user)} replace />;
  return children;
}
