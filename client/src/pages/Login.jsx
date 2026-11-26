import { BarChart3, Eye, EyeOff, Headphones, Keyboard, Lock, LogIn, User, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Slider from '../components/Slider';
import { Alert, Spinner } from '../components/ui';
import { homePathFor, useAuth } from '../context/AuthContext';
import { useApi, usePageTitle } from '../utils/hooks';

export default function Login() {
  usePageTitle('Login');
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: settings } = useApi('/settings/public');
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={homePathFor(user)} replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const u = await login(form.username.trim(), form.password);
      const from = location.state?.from;
      navigate(from && u.role === 'STUDENT' && !from.startsWith('/admin') ? from : homePathFor(u), { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <>
      <Header showUser={false} />
      <main className="auth">
        <section className="auth__hero">
          <div>
            <h1>Practise like it&apos;s exam day.</h1>
            <p>Shorthand dictations at real exam speeds, on-screen transcription and an instant, word-by-word analysis of every mistake.</p>
          </div>
          <Slider />
          <div className="auth__features">
            <span><Headphones size={17} />Dictation at 80–120 WPM</span>
            <span><Keyboard size={17} />English &amp; Hindi typing</span>
            <span><BarChart3 size={17} />Detailed mistake analysis</span>
          </div>
        </section>

        <section className="auth__panel">
          <div className="auth__card">
            <img src="/logo.svg" alt="Steno Drive logo" className="auth__logo" />
            <h2 className="auth__title">Welcome back</h2>
            <p className="auth__sub">Log in with the username and password sent to you.</p>

            <form onSubmit={onSubmit} className="stack-sm" noValidate>
              <label className="field">
                <span className="field__label">Username</span>
                <div className="input-icon">
                  <User size={17} />
                  <input className="input" autoComplete="username" placeholder="Enter your username" value={form.username} onChange={set('username')} required autoFocus />
                </div>
              </label>
              <label className="field">
                <span className="field__label">Password</span>
                <div className="input-icon">
                  <Lock size={17} />
                  <input
                    className="input" type={showPwd ? 'text' : 'password'} autoComplete="current-password"
                    placeholder="Enter your password" value={form.password} onChange={set('password')} required
                  />
                  <button type="button" className="icon-btn input-icon__end" onClick={() => setShowPwd((s) => !s)} aria-label={showPwd ? 'Hide password' : 'Show password'}>
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>
              {error && <Alert tone="error">{error}</Alert>}
              <button className="btn btn--accent btn--lg btn--block" disabled={busy || !form.username || !form.password} style={{ marginTop: 6 }}>
                {busy ? <Spinner /> : <LogIn size={18} />} {busy ? 'Logging in…' : 'Login'}
              </button>
            </form>

            <div className="auth__divider">New Student?</div>
            <Link to="/register" className="btn btn--block"><UserPlus size={17} />Register now</Link>

            <p className="auth__help">
              Forgot your password? Contact the institute{settings?.contactMobile ? ` on ${settings.contactMobile}` : ''}.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
