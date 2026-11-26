import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../api';
import { CATEGORIES, fmtDateTime, fmtDuration, testLabel } from '../../utils/format';
import { useApi } from '../../utils/hooks';

export function Dashboard() {
  const { data: s, error } = useApi('/admin/stats');
  if (error) return <p className="form-error">{error.message}</p>;
  if (!s) return <p className="muted">Loading…</p>;
  return (
    <div className="stack">
      <h2 className="page-title page-title--left">Dashboard</h2>
      <div className="stats">
        <Link to="/admin/students" className={`stat${s.students.pending ? ' stat--alert' : ''}`}>
          <span className="stat__num">{s.students.pending}</span><span>Pending approvals</span>
        </Link>
        <div className="stat"><span className="stat__num">{s.students.active}</span><span>Active students</span></div>
        <div className="stat"><span className="stat__num">{s.attempts}</span><span>Tests submitted</span></div>
        {Object.entries(CATEGORIES).map(([k, c]) => (
          <Link key={k} to="/admin/tests" className="stat">
            <span className="stat__num">{s.tests[k]}</span><span>{c.label} tests</span>
          </Link>
        ))}
      </div>
      <div className="row">
        <Link to="/admin/tests/new" className="btn btn--primary">+ Add Test</Link>
        <Link to="/admin/students" className="btn">Review registrations</Link>
      </div>
    </div>
  );
}

export function Results() {
  const [params] = useSearchParams();
  const testId = params.get('testId');
  const { data: attempts, error, reload } = useApi(`/admin/attempts${testId ? `?testId=${testId}` : ''}`);
  const [q, setQ] = useState('');

  const remove = async (a) => {
    if (!window.confirm('Delete this result?')) return;
    await api(`/admin/attempts/${a.id}`, { method: 'DELETE' }).catch((e) => window.alert(e.message));
    reload();
  };

  const rows = (attempts || []).filter((a) => {
    const hay = `${a.user.firstName} ${a.user.lastName || ''} ${a.user.username} ${a.test.title}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  return (
    <div className="stack">
      <div className="toolbar">
        <h2 className="page-title page-title--left">Results</h2>
        <input className="input input--auto" placeholder="Search student or test…" value={q} onChange={(e) => setQ(e.target.value)} />
        {testId && <Link to="/admin/results" className="btn btn--sm btn--secondary">Show all tests</Link>}
      </div>
      {error && <p className="form-error">{error.message}</p>}
      {attempts && rows.length === 0 && <p className="empty">No results.</p>}
      {rows.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Submitted</th><th>Student</th><th>Section</th><th>Test</th><th>Mistakes</th><th>Accuracy</th><th>Time</th><th /></tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td>{fmtDateTime(a.createdAt)}</td>
                  <td>{a.user.firstName} {a.user.lastName}<div className="muted small">{a.user.username}</div></td>
                  <td>{CATEGORIES[a.test.category].label}</td>
                  <td>{testLabel(a.test)}</td>
                  <td>{a.totalMistakes}</td>
                  <td>{a.counts.accuracy}%</td>
                  <td>{fmtDuration(a.timeTakenSec)}</td>
                  <td className="actions">
                    <Link to={`/result/${a.id}`} className="btn btn--sm">View</Link>
                    <button type="button" className="btn btn--sm btn--danger" onClick={() => remove(a)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const SETTING_FIELDS = [
  { key: 'upiId', label: 'UPI ID' },
  { key: 'payeeName', label: 'Payee name (shown in UPI apps)' },
  { key: 'contactMobile', label: 'Contact mobile (registration & payment details)' },
  { key: 'feeAmount', label: 'Fee amount (₹)' },
  { key: 'feeDetails', label: 'Fee details text', multiline: true },
  { key: 'aboutText', label: 'About page text', multiline: true },
];

export function Settings() {
  const { data } = useApi('/admin/settings');
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState('');
  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
      setForm(await api('/admin/settings', { method: 'PUT', body: form }));
      setMsg('Settings saved.');
    } catch (err) {
      setMsg(`Error: ${err.message}`);
    }
  };

  if (!form) return <p className="muted">Loading…</p>;
  return (
    <form className="card card--narrow stack" onSubmit={onSubmit}>
      <h2 className="page-title page-title--left">Settings</h2>
      {SETTING_FIELDS.map((f) => (
        <label key={f.key} className="field">
          <span>{f.label}</span>
          {f.multiline ? (
            <textarea className="input textarea" rows={4} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
          ) : (
            <input className="input" value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
          )}
        </label>
      ))}
      {msg && <p className={msg.startsWith('Error') ? 'form-error' : 'notice notice--ok'}>{msg}</p>}
      <div className="row row--end"><button className="btn btn--primary">Save Settings</button></div>
    </form>
  );
}
