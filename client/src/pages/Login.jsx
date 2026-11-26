import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Slider from '../components/Slider';
import { homePathFor, useAuth } from '../context/AuthContext';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ username: '', password: '' });
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
      <Header />
      <main className="login">
        <section className="login__slides">
          <Slider />
        </section>
        <section className="login__panel">
          <img src="/logo.svg" alt="Steno Drive logo" className="login__logo" />
          <form onSubmit={onSubmit} className="login__form">
            <input
              className="input"
              placeholder="Username"
              autoComplete="username"
              value={form.username}
              onChange={set('username')}
              required
            />
            <input
              className="input"
              type="password"
              placeholder="Password"
              autoComplete="current-password"
              value={form.password}
              onChange={set('password')}
              required
            />
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="btn btn--primary btn--center" disabled={busy}>
              {busy ? 'Logging in…' : 'Login'}
            </button>
          </form>
          <p className="login__register">
            New Student : <Link to="/register">Register</Link>
          </p>
        </section>
      </main>
    </>
  );
}
