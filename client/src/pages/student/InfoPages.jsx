import { Link } from 'react-router-dom';
import UpiQr from '../../components/UpiQr';
import { useAuth } from '../../context/AuthContext';
import { CATEGORIES, fmtDate, fmtDateTime, fullName, testLabel } from '../../utils/format';
import { useApi } from '../../utils/hooks';

export function Home() {
  const { user } = useAuth();
  const { data: attempts } = useApi('/me/attempts');

  return (
    <div className="stack">
      <section className="welcome">
        <div>
          <h2>Welcome, {user.firstName}!</h2>
          <p className="muted">Pick a section to start practising.</p>
        </div>
        {!user.feePaid && (
          <Link to="/fee" className="notice notice--warn">Fee pending — view payment details</Link>
        )}
      </section>

      <section className="tiles">
        {Object.entries(CATEGORIES).map(([key, c]) => (
          <Link key={key} to={c.path} className={`tile tile--${key.toLowerCase()}`}>
            <span className="tile__icon" aria-hidden="true">{key === 'SHORTHAND' ? '✍️' : key === 'HINDI_TYPING' ? 'अ' : '⌨️'}</span>
            <span className="tile__label">{c.label}</span>
          </Link>
        ))}
      </section>

      <section>
        <h3>Recent Results</h3>
        {!attempts && <p className="muted">Loading…</p>}
        {attempts?.length === 0 && <p className="empty">You have not given any test yet.</p>}
        {attempts?.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Date</th><th>Section</th><th>Test</th><th>Mistakes</th><th>Accuracy</th><th /></tr>
              </thead>
              <tbody>
                {attempts.map((a) => (
                  <tr key={a.id}>
                    <td>{fmtDateTime(a.createdAt)}</td>
                    <td>{CATEGORIES[a.test.category].label}</td>
                    <td>{testLabel(a.test)}</td>
                    <td>{a.totalMistakes}</td>
                    <td>{a.counts.accuracy}%</td>
                    <td><Link to={`/result/${a.id}`}>View Result</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export function FeeDetail() {
  const { user } = useAuth();
  const { data: s } = useApi('/settings/public');
  return (
    <div className="card card--narrow">
      <h2 className="page-title">Fee Detail</h2>
      <dl className="details">
        <dt>Student</dt><dd>{fullName(user)}</dd>
        <dt>Registered on</dt><dd>{fmtDate(user.createdAt)}</dd>
        <dt>Fee</dt><dd>₹{s?.feeAmount ?? '—'}</dd>
        <dt>Status</dt>
        <dd>
          <span className={`pill ${user.feePaid ? 'pill--ok' : 'pill--warn'}`}>{user.feePaid ? 'Paid' : 'Pending'}</span>
        </dd>
      </dl>
      {s && (
        <>
          <p className="pre">{s.feeDetails}</p>
          <div className="center">
            <UpiQr settings={s} size={170} />
            <p>Send payment screenshot to <strong>{s.contactMobile}</strong></p>
          </div>
        </>
      )}
    </div>
  );
}

export function About() {
  const { data: s } = useApi('/settings/public');
  return (
    <div className="card card--narrow">
      <h2 className="page-title">About</h2>
      <p className="pre">{s?.aboutText}</p>
      {s && <p>Contact : <strong>{s.contactMobile}</strong></p>}
    </div>
  );
}

export function NotFound() {
  return (
    <div className="card card--narrow center">
      <h2>Page not found</h2>
      <Link to="/" className="btn">Go Home</Link>
    </div>
  );
}
