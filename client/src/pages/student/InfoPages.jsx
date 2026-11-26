import {
  ArrowRight, Award, BarChart3, BookOpen, CheckCircle2, ClipboardList, Headphones, IndianRupee, Keyboard, Phone, Target, TrendingUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import UpiQr from '../../components/UpiQr';
import { Alert, Avatar, Badge, Card, EmptyState, PageHeader, SkeletonList, StatCard } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { accuracyTone, CATEGORIES, fmtDate, fmtDateTime, fullName, testLabel } from '../../utils/format';
import { useApi, usePageTitle } from '../../utils/hooks';

const SECTION_META = {
  SHORTHAND: { icon: 'Aa', desc: 'Listen to dictation, then transcribe it within the time limit.' },
  ENGLISH_TYPING: { icon: <Keyboard size={22} />, desc: 'Copy the passage shown on screen for speed and accuracy.' },
  HINDI_TYPING: { icon: 'अ', desc: 'Hindi (Unicode) typing practice with full marking.' },
};

export function Home() {
  const { user } = useAuth();
  usePageTitle('Home');
  const { data: summary } = useApi('/me/summary');
  const { data: attempts } = useApi('/me/attempts');
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="stack">
      <div className="hero-card">
        <Avatar person={user} size={64} />
        <div>
          <h2>{greet}, {user.firstName}!</h2>
          <p className="muted">Consistency beats intensity — one dictation a day keeps your speed sharp.</p>
        </div>
        <span className="spacer" />
        {!user.feePaid && (
          <Link to="/fee" className="btn"><IndianRupee size={16} /> Fee pending — pay now</Link>
        )}
      </div>

      <div className="stats">
        <StatCard icon={ClipboardList} label="Tests completed" value={summary ? summary.attempts : '—'} />
        <StatCard icon={Target} tone="success" label="Average accuracy" value={summary?.avgAccuracy != null ? `${summary.avgAccuracy}%` : '—'} />
        <StatCard icon={Award} tone="warning" label="Best accuracy" value={summary?.bestAccuracy != null ? `${summary.bestAccuracy}%` : '—'} />
        <StatCard icon={TrendingUp} tone="violet" label="Fewest mistakes" value={summary?.fewestMistakes ?? '—'} />
      </div>

      <div>
        <div className="section-title">Practice sections</div>
        <div className="section-cards">
          {Object.entries(CATEGORIES).map(([key, c]) => (
            <Link key={key} to={c.path} className="section-card">
              <span className="section-card__icon">{SECTION_META[key].icon}</span>
              <span className="section-card__title">{c.label}</span>
              <span className="muted small">{SECTION_META[key].desc}</span>
              <span className="section-card__foot">
                {summary ? `${summary.tests[key]} tests available` : ' '}
                <ArrowRight size={18} />
              </span>
            </Link>
          ))}
        </div>
      </div>

      <Card title="Recent results" icon={BarChart3} bodyClass={null}>
        {!attempts && <div className="card__body"><SkeletonList rows={3} height={40} /></div>}
        {attempts?.length === 0 && (
          <EmptyState icon={Headphones} title="No tests taken yet" text="Your results will appear here after you submit your first test."
            action={<Link to="/shorthand" className="btn btn--primary">Start with Shorthand <ArrowRight size={16} /></Link>} />
        )}
        {attempts?.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Test</th><th>Section</th><th>Submitted</th><th>Mistakes</th><th>Accuracy</th><th /></tr></thead>
              <tbody>
                {attempts.map((a) => (
                  <tr key={a.id}>
                    <td><strong>{testLabel(a.test)}</strong></td>
                    <td className="muted">{CATEGORIES[a.test.category].label}</td>
                    <td className="muted nowrap">{fmtDateTime(a.createdAt)}</td>
                    <td className="tabular">{a.totalMistakes}</td>
                    <td><Badge tone={accuracyTone(a.counts.accuracy)}>{a.counts.accuracy}%</Badge></td>
                    <td style={{ textAlign: 'right' }}><Link to={`/result/${a.id}`} className="btn btn--sm">View result</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export function FeeDetail() {
  usePageTitle('Fee Detail');
  const { user } = useAuth();
  const { data: s } = useApi('/settings/public');
  return (
    <>
      <PageHeader title="Fee Detail" subtitle="Your subscription and payment information." />
      <div className="grid-2">
        <Card title="Subscription" icon={IndianRupee}>
          <div className="stack-sm">
            <div className="row"><span className="muted">Student</span><span className="spacer" /><strong>{fullName(user)}</strong></div>
            <div className="row"><span className="muted">Registered on</span><span className="spacer" /><strong>{fmtDate(user.createdAt)}</strong></div>
            <div className="row"><span className="muted">Fee</span><span className="spacer" /><strong>₹{s?.feeAmount ?? '—'}</strong></div>
            <div className="row">
              <span className="muted">Status</span><span className="spacer" />
              {user.feePaid ? <Badge tone="success" icon={CheckCircle2}>Paid</Badge> : <Badge tone="warning">Pending</Badge>}
            </div>
            {s && <p className="pre muted small" style={{ marginTop: 8 }}>{s.feeDetails}</p>}
          </div>
        </Card>
        <Card title="Pay via UPI" icon={Phone}>
          {s && (
            <div className="stack-sm" style={{ alignItems: 'center' }}>
              <UpiQr settings={s} size={170} />
              <p className="small muted center">After paying, send the screenshot to <strong>{s.contactMobile}</strong>.</p>
            </div>
          )}
        </Card>
      </div>
      {!user.feePaid && <Alert tone="warning" className="mt">Your fee is marked as pending. It will be updated once the institute confirms your payment.</Alert>}
    </>
  );
}

export function About() {
  usePageTitle('About');
  const { data: s } = useApi('/settings/public');
  return (
    <>
      <PageHeader title="About Steno Drive" />
      <Card icon={BookOpen} title="Who we are">
        <p className="pre" style={{ fontSize: 15.5, lineHeight: 1.75 }}>{s?.aboutText}</p>
        {s && (
          <div className="row" style={{ marginTop: 20 }}>
            <Badge tone="brand" icon={Phone}>{s.contactMobile}</Badge>
          </div>
        )}
      </Card>
    </>
  );
}

export function NotFound() {
  usePageTitle('Page not found');
  return (
    <Card>
      <EmptyState title="Page not found" text="The page you are looking for does not exist or has been moved." action={<Link to="/" className="btn btn--primary">Go to home</Link>} />
    </Card>
  );
}
