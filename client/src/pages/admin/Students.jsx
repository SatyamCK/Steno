import {
  CheckCircle2, Copy, KeyRound, MessageCircle, Power, RefreshCcw, Search, Trash2, UserCheck, Users, UserX,
} from 'lucide-react';
import { useState } from 'react';
import { api } from '../../api';
import { Modal, useConfirm, useToast } from '../../components/feedback';
import {
  Alert, Avatar, Badge, Card, EmptyState, Field, IconButton, PageHeader, SkeletonList, Spinner,
} from '../../components/ui';
import { fmtDate, fullName } from '../../utils/format';
import { useApi, usePageTitle } from '../../utils/hooks';

const TABS = [
  { key: 'PENDING', label: 'Pending approval', stat: 'pending' },
  { key: 'ACTIVE', label: 'Active', stat: 'active' },
  { key: 'INACTIVE', label: 'Inactive', stat: 'inactive' },
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
  usePageTitle('Students');
  const toast = useToast();
  const confirm = useConfirm();
  const [status, setStatus] = useState('PENDING');
  const [q, setQ] = useState('');
  const { data: students, error, loading, reload } = useApi(`/admin/students?status=${status}`);
  const { data: stats, reload: reloadStats } = useApi('/admin/stats');
  const [dialog, setDialog] = useState(null); // { mode: 'approve' | 'reset', student }

  const refresh = () => {
    reload();
    reloadStats();
  };

  const act = async (fn, success) => {
    try {
      await fn();
      toast(success);
      refresh();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const toggleFee = (s) => act(() => api(`/admin/students/${s.id}`, { method: 'PATCH', body: { feePaid: !s.feePaid } }),
    `Fee marked ${s.feePaid ? 'pending' : 'paid'} for ${fullName(s)}`);

  const setActive = async (s, active) => {
    if (!active && !(await confirm({ title: `Deactivate ${fullName(s)}?`, text: 'They will not be able to log in until reactivated. Results are kept.', confirmLabel: 'Deactivate', tone: 'danger' }))) return;
    act(() => api(`/admin/students/${s.id}`, { method: 'PATCH', body: { status: active ? 'ACTIVE' : 'INACTIVE' } }),
      `${fullName(s)} ${active ? 'activated' : 'deactivated'}`);
  };

  const remove = async (s) => {
    if (!(await confirm({ title: `Delete ${fullName(s)}?`, text: 'This permanently removes the student and all their results. This cannot be undone.', confirmLabel: 'Delete student', tone: 'danger' }))) return;
    act(() => api(`/admin/students/${s.id}`, { method: 'DELETE' }), `${fullName(s)} deleted`);
  };

  const rows = (students || []).filter((s) =>
    `${fullName(s)} ${s.mobile} ${s.email} ${s.username || ''} ${s.city || ''}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <PageHeader title="Students" subtitle="Approve new registrations, manage access and track fee payments." />

      <div className="toolbar">
        <div className="segmented" role="tablist">
          {TABS.map((t) => (
            <button key={t.key} type="button" role="tab" aria-selected={status === t.key} onClick={() => setStatus(t.key)}>
              {t.label}{stats && <span className="count">{stats.students[t.stat]}</span>}
            </button>
          ))}
        </div>
        <span className="spacer" />
        <div className="search">
          <Search size={16} />
          <input className="input" placeholder="Search name, mobile, email…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search students" />
        </div>
      </div>

      {error && <Alert tone="error">{error.message}</Alert>}
      <Card bodyClass={null}>
        {loading && <div className="card__body"><SkeletonList rows={4} height={44} /></div>}
        {!loading && rows.length === 0 && (
          <EmptyState icon={Users} title={q ? 'No matching students' : status === 'PENDING' ? 'No pending registrations' : 'No students here'}
            text={status === 'PENDING' && !q ? 'New registrations will appear here for approval.' : undefined} />
        )}
        {!loading && rows.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th><th>Father’s name</th><th>Contact</th><th>Location</th><th>Registered</th>
                  <th>Fee</th><th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div className="person">
                        {s.photoUrl ? <a href={s.photoUrl} target="_blank" rel="noreferrer"><Avatar person={s} size={40} /></a> : <Avatar person={s} size={40} />}
                        <div>
                          <div className="person__name">{fullName(s)}</div>
                          <div className="person__sub">{s.username ? `@${s.username}` : 'No login yet'} · {s._count.attempts} tests</div>
                        </div>
                      </div>
                    </td>
                    <td>{[s.fatherFirstName, s.fatherMiddleName, s.fatherLastName].filter(Boolean).join(' ')}</td>
                    <td>
                      <div className="tabular">{s.mobile}</div>
                      <a href={`mailto:${s.email}`} className="small">{s.email}</a>
                    </td>
                    <td className="muted">{[s.city, s.state].filter(Boolean).join(', ')}</td>
                    <td className="muted nowrap">{fmtDate(s.createdAt)}</td>
                    <td>
                      <Badge tone={s.feePaid ? 'success' : 'warning'} onClick={() => toggleFee(s)} title="Click to toggle">
                        {s.feePaid ? 'Paid' : 'Pending'}
                      </Badge>
                    </td>
                    <td>
                      <div className="actions">
                        {status === 'PENDING' && (
                          <button type="button" className="btn btn--sm btn--primary" onClick={() => setDialog({ mode: 'approve', student: s })}>
                            <UserCheck size={15} />Approve
                          </button>
                        )}
                        {status === 'ACTIVE' && (
                          <>
                            <IconButton label="Reset password" icon={KeyRound} onClick={() => setDialog({ mode: 'reset', student: s })} />
                            <IconButton label="Deactivate" icon={UserX} onClick={() => setActive(s, false)} />
                          </>
                        )}
                        {status === 'INACTIVE' && <IconButton label="Activate" icon={Power} onClick={() => setActive(s, true)} />}
                        <IconButton label="Delete" icon={Trash2} tone="danger" onClick={() => remove(s)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {dialog && <CredentialsDialog {...dialog} onClose={() => setDialog(null)} onDone={refresh} />}
    </>
  );
}

function CredentialsDialog({ mode, student, onClose, onDone }) {
  const approve = mode === 'approve';
  const toast = useToast();
  const [username, setUsername] = useState(student.username || suggestUsername(student));
  const [password, setPassword] = useState(randomPassword);
  const [feePaid, setFeePaid] = useState(student.feePaid);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const message = `Hello ${student.firstName}, your Steno Drive account is ${approve ? 'active' : 'updated'}.\nUsername: ${username}\nPassword: ${password}\nLogin: ${window.location.origin}`;
  const mobile = (student.mobile || '').replace(/\D/g, '').slice(-10);

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (approve) await api(`/admin/students/${student.id}/approve`, { method: 'POST', body: { username, password, feePaid } });
      else await api(`/admin/students/${student.id}`, { method: 'PATCH', body: { password } });
      setDone(true);
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      toast('Login details copied');
    } catch {
      toast('Could not copy — please copy manually', 'error');
    }
  };

  if (done) {
    return (
      <Modal
        title={approve ? 'Student approved' : 'Password reset'}
        text={`Share these login details with ${fullName(student)}.`}
        icon={CheckCircle2} tone="success" onClose={onClose}
        footer={(
          <>
            <button type="button" className="btn" onClick={copy}><Copy size={16} />Copy</button>
            {mobile.length === 10 && (
              <a className="btn btn--success" href={`https://wa.me/91${mobile}?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">
                <MessageCircle size={16} />Send on WhatsApp
              </a>
            )}
            <button type="button" className="btn btn--primary" onClick={onClose}>Done</button>
          </>
        )}
      >
        <div className="cred">
          <span className="muted small">Username</span><code>{username}</code><span />
          <span className="muted small">Password</span><code>{password}</code><span />
          <span className="muted small">Mobile</span><span className="tabular">{student.mobile}</span><span />
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      as="form" onSubmit={onSubmit}
      title={approve ? `Approve ${fullName(student)}` : `Reset password for ${fullName(student)}`}
      text={approve ? 'Create login credentials to activate this account.' : 'Set a new password. The username stays the same.'}
      icon={approve ? UserCheck : KeyRound} onClose={onClose}
      footer={(
        <>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn--primary" disabled={busy}>
            {busy && <Spinner />}{approve ? 'Approve & activate' : 'Reset password'}
          </button>
        </>
      )}
    >
      <Field label="Username" hint={approve ? 'Lowercase letters, numbers, dot or underscore.' : undefined}>
        <input className="input" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} disabled={!approve} required autoFocus={approve} />
      </Field>
      <Field label="Password" hint="At least 6 characters.">
        <div className="row" style={{ flexWrap: 'nowrap' }}>
          <input className="input" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
          <IconButton label="Generate new password" icon={RefreshCcw} onClick={() => setPassword(randomPassword())} />
        </div>
      </Field>
      {approve && (
        <label className="check"><input type="checkbox" checked={feePaid} onChange={(e) => setFeePaid(e.target.checked)} />Fee payment received</label>
      )}
      {error && <Alert tone="error">{error}</Alert>}
    </Modal>
  );
}
