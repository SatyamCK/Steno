import {
  ArrowRight, BarChart3, BookOpen, Eye, IndianRupee, Keyboard, Languages, PenLine, Phone, Plus, Save, Search, Trash2,
  UserCheck, Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../api';
import { useConfirm, useToast } from '../../components/feedback';
import {
  Alert, Avatar, Badge, Card, EmptyState, Field, IconButton, PageHeader, SkeletonList, Spinner, StatCard,
} from '../../components/ui';
import { accuracyTone, CATEGORIES, fmtDate, fmtDateTime, fmtDuration, fullName, testLabel } from '../../utils/format';
import { useApi, usePageTitle } from '../../utils/hooks';

/* ------------------------------ Dashboard ------------------------------ */

export function Dashboard() {
  usePageTitle('Admin dashboard');
  const { data: s, error } = useApi('/admin/stats');
  const { data: pending } = useApi('/admin/students?status=PENDING');
  const { data: attempts } = useApi('/admin/attempts');

  if (error) return <Alert tone="error">{error.message}</Alert>;
  return (
    <div className="stack">
      <PageHeader
        title="Dashboard"
        subtitle="An overview of students, tests and activity."
        actions={<Link to="/admin/tests/new" className="btn btn--accent"><Plus size={17} />Add test</Link>}
      />
      {!s ? <SkeletonList rows={1} height={84} /> : (
        <div className="stats stats--3">
          <StatCard as={Link} to="/admin/students" icon={UserCheck} tone={s.students.pending ? 'warning' : ''} label="Pending approvals" value={s.students.pending} />
          <StatCard icon={Users} tone="success" label="Active students" value={s.students.active} />
          <StatCard as={Link} to="/admin/results" icon={BarChart3} tone="violet" label="Tests submitted" value={s.attempts} />
          <StatCard as={Link} to="/admin/tests" icon={PenLine} label="Shorthand tests" value={s.tests.SHORTHAND} />
          <StatCard as={Link} to="/admin/tests" icon={Keyboard} label="English typing tests" value={s.tests.ENGLISH_TYPING} />
          <StatCard as={Link} to="/admin/tests" icon={Languages} label="Hindi typing tests" value={s.tests.HINDI_TYPING} />
        </div>
      )}

      <div className="grid-2">
        <Card title="Awaiting approval" icon={UserCheck} bodyClass={null} actions={<Link to="/admin/students" className="btn btn--sm btn--ghost">View all <ArrowRight size={14} /></Link>}>
          {!pending && <div className="card__body"><SkeletonList rows={3} height={36} /></div>}
          {pending?.length === 0 && <EmptyState icon={UserCheck} title="All caught up" text="No registrations waiting for approval." />}
          {pending?.length > 0 && (
            <ul className="list">
              {pending.slice(0, 5).map((p) => (
                <li key={p.id}>
                  <Avatar person={p} size={36} />
                  <div><div className="person__name">{fullName(p)}</div><div className="person__sub">{p.mobile} · {fmtDate(p.createdAt)}</div></div>
                  <span className="spacer" />
                  <Badge tone={p.feePaid ? 'success' : 'warning'}>{p.feePaid ? 'Paid' : 'Fee pending'}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Latest results" icon={BarChart3} bodyClass={null} actions={<Link to="/admin/results" className="btn btn--sm btn--ghost">View all <ArrowRight size={14} /></Link>}>
          {!attempts && <div className="card__body"><SkeletonList rows={3} height={36} /></div>}
          {attempts?.length === 0 && <EmptyState icon={BarChart3} title="No results yet" text="Submitted tests will appear here." />}
          {attempts?.length > 0 && (
            <ul className="list">
              {attempts.slice(0, 5).map((a) => (
                <li key={a.id}>
                  <div style={{ minWidth: 0 }}>
                    <div className="person__name">{a.user.firstName} {a.user.lastName}</div>
                    <div className="person__sub">{testLabel(a.test)} · {fmtDateTime(a.createdAt)}</div>
                  </div>
                  <span className="spacer" />
                  <Badge tone={accuracyTone(a.counts.accuracy)}>{a.counts.accuracy}%</Badge>
                  <Link to={`/result/${a.id}`} className="icon-btn" aria-label="View result" title="View result"><Eye size={16} /></Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------ Results ------------------------------ */

export function Results() {
  usePageTitle('Results');
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const [params, setParams] = useSearchParams();
  const testId = params.get('testId');
  const { data: attempts, error, loading, reload } = useApi(`/admin/attempts${testId ? `?testId=${testId}` : ''}`);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');

  const remove = async (a) => {
    if (!(await confirm({ title: 'Delete this result?', text: `${a.user.firstName}'s result for “${a.test.title}” will be permanently removed.`, confirmLabel: 'Delete', tone: 'danger' }))) return;
    try {
      await api(`/admin/attempts/${a.id}`, { method: 'DELETE' });
      toast('Result deleted');
      reload();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const rows = (attempts || []).filter((a) => {
    const hay = `${a.user.firstName} ${a.user.lastName || ''} ${a.user.username} ${a.test.title}`.toLowerCase();
    return hay.includes(q.toLowerCase()) && (!category || a.test.category === category);
  });

  return (
    <>
      <PageHeader title="Results" subtitle={testId && attempts?.[0] ? `Showing results for “${attempts[0].test.title}”` : 'All submitted tests, newest first.'} />
      <div className="toolbar">
        <div className="segmented" role="tablist">
          <button type="button" role="tab" aria-selected={category === ''} onClick={() => setCategory('')}>All</button>
          {Object.entries(CATEGORIES).map(([k, c]) => (
            <button key={k} type="button" role="tab" aria-selected={category === k} onClick={() => setCategory(k)}>{c.label}</button>
          ))}
        </div>
        {testId && <button type="button" className="btn btn--sm" onClick={() => setParams({})}>Clear test filter</button>}
        <span className="spacer" />
        <div className="search">
          <Search size={16} />
          <input className="input" placeholder="Search student or test…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search results" />
        </div>
      </div>
      {error && <Alert tone="error">{error.message}</Alert>}
      <Card bodyClass={null}>
        {loading && <div className="card__body"><SkeletonList rows={4} height={44} /></div>}
        {!loading && rows.length === 0 && <EmptyState icon={BarChart3} title="No results found" />}
        {!loading && rows.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Student</th><th>Test</th><th>Submitted</th><th>Mistakes</th><th>Accuracy</th><th>Time</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id}>
                    <td><div className="person__name">{a.user.firstName} {a.user.lastName}</div><div className="person__sub">@{a.user.username}</div></td>
                    <td><div>{testLabel(a.test)}</div><div className="person__sub">{CATEGORIES[a.test.category].label}</div></td>
                    <td className="muted nowrap">{fmtDateTime(a.createdAt)}</td>
                    <td className="tabular">{a.totalMistakes}</td>
                    <td><Badge tone={accuracyTone(a.counts.accuracy)}>{a.counts.accuracy}%</Badge></td>
                    <td className="muted nowrap">{fmtDuration(a.timeTakenSec)}</td>
                    <td>
                      <div className="actions">
                        <IconButton label="View result" icon={Eye} onClick={() => navigate(`/result/${a.id}`)} />
                        <IconButton label="Delete result" icon={Trash2} tone="danger" onClick={() => remove(a)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

/* ------------------------------ Settings ------------------------------ */

const GROUPS = [
  {
    title: 'Payment', icon: IndianRupee, fields: [
      { key: 'upiId', label: 'UPI ID', hint: 'Used to generate the payment QR code.' },
      { key: 'payeeName', label: 'Payee name', hint: 'Shown in the student’s UPI app.' },
      { key: 'feeAmount', label: 'Fee amount (₹)' },
      { key: 'feeDetails', label: 'Fee details', multiline: true, hint: 'Shown on the student Fee Detail page.' },
    ],
  },
  { title: 'Contact', icon: Phone, fields: [{ key: 'contactMobile', label: 'Contact mobile', hint: 'Students send registration and payment details here.' }] },
  { title: 'About page', icon: BookOpen, fields: [{ key: 'aboutText', label: 'About text', multiline: true }] },
];

export function Settings() {
  usePageTitle('Settings');
  const toast = useToast();
  const { data } = useApi('/admin/settings');
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      setForm(await api('/admin/settings', { method: 'PUT', body: form }));
      toast('Settings saved');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!form) return <SkeletonList rows={3} height={160} />;
  return (
    <form className="stack" onSubmit={onSubmit}>
      <PageHeader
        title="Settings"
        subtitle="Payment, contact and content shown to students."
        actions={<button className="btn btn--accent" disabled={busy}>{busy ? <Spinner /> : <Save size={16} />}Save settings</button>}
      />
      {GROUPS.map((g) => (
        <Card key={g.title} title={g.title} icon={g.icon}>
          <div className="form-grid">
            {g.fields.map((f) => (
              <Field key={f.key} label={f.label} hint={f.hint} className={f.multiline ? 'span-all' : ''}>
                {f.multiline ? (
                  <textarea className="input" rows={4} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                ) : (
                  <input className="input" value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                )}
              </Field>
            ))}
          </div>
        </Card>
      ))}
    </form>
  );
}
