import { useState } from 'react';
import { api } from '../../api';
import { fmtDate, fullName } from '../../utils/format';
import { useApi } from '../../utils/hooks';

const TABS = [
  { key: 'PENDING', label: 'Pending Approval' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'INACTIVE', label: 'Inactive' },
];

const suggestUsername = (s) =>
  `${s.firstName}${s.lastName ? `.${s.lastName}` : ''}`.toLowerCase().replace(/[^a-z0-9.]/g, '').slice(0, 20) +
  (s.mobile ? s.mobile.slice(-3) : '');

const randomPassword = () => {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
};

export default function Students() {
  const [status, setStatus] = useState('PENDING');
  const { data: students, error, loading, reload } = useApi(`/admin/students?status=${status}`);
  const [dialog, setDialog] = useState(null); // { mode: 'approve' | 'reset', student }
  const [msg, setMsg] = useState('');

  const act = async (fn, success) => {
    setMsg('');
    try {
      await fn();
      setMsg(success);
      reload();
    } catch (e) {
      setMsg(`Error: ${e.message}`);
    }
  };

  const toggleFee = (s) =>
    act(() => api(`/admin/students/${s.id}`, { method: 'PATCH', body: { feePaid: !s.feePaid } }),
      `Fee marked ${s.feePaid ? 'pending' : 'paid'} for ${fullName(s)}.`);
  const setActive = (s, active) =>
    act(() => api(`/admin/students/${s.id}`, { method: 'PATCH', body: { status: active ? 'ACTIVE' : 'INACTIVE' } }),
      `${fullName(s)} ${active ? 'activated' : 'deactivated'}.`);
  const remove = (s) => {
    if (!window.confirm(`Delete ${fullName(s)} and all their results? This cannot be undone.`)) return;
    act(() => api(`/admin/students/${s.id}`, { method: 'DELETE' }), `${fullName(s)} deleted.`);
  };

  return (
    <div className="stack">
      <div className="toolbar">
        <h2 className="page-title page-title--left">Students</h2>
        <div className="tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.key} type="button" role="tab" aria-selected={status === t.key} onClick={() => setStatus(t.key)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {msg && <p className={msg.startsWith('Error') ? 'form-error' : 'notice notice--ok'}>{msg}</p>}
      {loading && <p className="muted">Loading…</p>}
      {error && <p className="form-error">{error.message}</p>}
      {students?.length === 0 && <p className="empty">No students here.</p>}
      {students?.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Photo</th><th>Student</th><th>Father’s Name</th><th>Contact</th><th>Address</th>
                <th>Registered</th>{status !== 'PENDING' && <th>Username</th>}<th>Fee</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id}>
                  <td>
                    {s.photoUrl ? <a href={s.photoUrl} target="_blank" rel="noreferrer"><img src={s.photoUrl} alt="" className="thumb" /></a> : '—'}
                  </td>
                  <td><strong>{fullName(s)}</strong><div className="muted small">{s._count.attempts} tests given</div></td>
                  <td>{[s.fatherFirstName, s.fatherMiddleName, s.fatherLastName].filter(Boolean).join(' ')}</td>
                  <td>{s.mobile}<div className="small"><a href={`mailto:${s.email}`}>{s.email}</a></div></td>
                  <td>{[s.city, s.state].filter(Boolean).join(', ')}</td>
                  <td>{fmtDate(s.createdAt)}</td>
                  {status !== 'PENDING' && <td><code>{s.username}</code></td>}
                  <td>
                    <button type="button" className={`pill pill--btn ${s.feePaid ? 'pill--ok' : 'pill--warn'}`} onClick={() => toggleFee(s)} title="Click to toggle">
                      {s.feePaid ? 'Paid' : 'Pending'}
                    </button>
                  </td>
                  <td className="actions">
                    {status === 'PENDING' && (
                      <button type="button" className="btn btn--sm btn--primary" onClick={() => setDialog({ mode: 'approve', student: s })}>Approve</button>
                    )}
                    {status === 'ACTIVE' && (
                      <>
                        <button type="button" className="btn btn--sm" onClick={() => setDialog({ mode: 'reset', student: s })}>Reset Password</button>
                        <button type="button" className="btn btn--sm btn--secondary" onClick={() => setActive(s, false)}>Deactivate</button>
                      </>
                    )}
                    {status === 'INACTIVE' && (
                      <button type="button" className="btn btn--sm" onClick={() => setActive(s, true)}>Activate</button>
                    )}
                    <button type="button" className="btn btn--sm btn--danger" onClick={() => remove(s)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {dialog && (
        <CredentialsDialog
          {...dialog}
          onClose={() => setDialog(null)}
          onDone={(text) => {
            setDialog(null);
            setMsg(text);
            reload();
          }}
        />
      )}
    </div>
  );
}

function CredentialsDialog({ mode, student, onClose, onDone }) {
  const approve = mode === 'approve';
  const [username, setUsername] = useState(student.username || suggestUsername(student));
  const [password, setPassword] = useState(randomPassword);
  const [feePaid, setFeePaid] = useState(student.feePaid);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (approve) {
        await api(`/admin/students/${student.id}/approve`, { method: 'POST', body: { username, password, feePaid } });
      } else {
        await api(`/admin/students/${student.id}`, { method: 'PATCH', body: { password } });
      }
      onDone(`${approve ? 'Approved' : 'Password reset for'} ${fullName(student)}. Send to ${student.mobile}:  Username: ${username}  Password: ${password}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal__box" onSubmit={onSubmit}>
        <h3>{approve ? 'Approve' : 'Reset password for'} {fullName(student)}</h3>
        <label className="field">
          <span>Username</span>
          <input className="input" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} disabled={!approve} required />
        </label>
        <label className="field">
          <span>Password</span>
          <div className="row">
            <input className="input" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
            <button type="button" className="btn btn--sm btn--secondary" onClick={() => setPassword(randomPassword())}>Generate</button>
          </div>
        </label>
        {approve && (
          <label className="check">
            <input type="checkbox" checked={feePaid} onChange={(e) => setFeePaid(e.target.checked)} /> Fee received
          </label>
        )}
        {error && <p className="form-error">{error}</p>}
        <div className="modal__actions">
          <button type="button" className="btn btn--secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn--primary" disabled={busy}>{approve ? 'Approve & Activate' : 'Reset Password'}</button>
        </div>
      </form>
    </div>
  );
}
