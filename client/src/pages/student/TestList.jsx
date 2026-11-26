import { useNavigate } from 'react-router-dom';
import { CATEGORIES, fmtDate, isHindi, testLabel } from '../../utils/format';
import { session, useApi } from '../../utils/hooks';

/** Clear any in-progress state so "Give Test" always starts a fresh attempt. */
export function resetTestSession(id) {
  ['listened_', 'start_', 'draft_'].forEach((k) => session.remove(`${k}${id}`));
}

export default function TestList({ category }) {
  const navigate = useNavigate();
  const { data: tests, error, loading } = useApi(`/tests?category=${category}`);
  const isShorthand = category === 'SHORTHAND';

  const give = (t) => {
    resetTestSession(t.id);
    navigate(`/test/${t.id}`);
  };

  return (
    <section>
      <h2 className="sr-only">{CATEGORIES[category].label}</h2>
      {loading && <p className="muted">Loading tests…</p>}
      {error && <p className="form-error">{error.message}</p>}
      {tests && tests.length === 0 && <p className="empty">No tests available yet. Please check back later.</p>}
      {tests && tests.length > 0 && (
        <ul className="test-list">
          {tests.map((t) => (
            <li key={t.id} className="test-row">
              <span className="test-row__date">{fmtDate(t.testDate)}</span>
              <span className="test-row__title" lang={isHindi(category) ? 'hi' : undefined}>{testLabel(t)}</span>
              <span className="test-row__actions">
                <button type="button" className="btn btn--primary btn--sm" onClick={() => give(t)}>Give Test</button>
                {isShorthand && (
                  <button
                    type="button" className="btn btn--sm" disabled={!t.hasOutline}
                    title={t.hasOutline ? '' : 'Outline not uploaded yet'}
                    onClick={() => navigate(`/outline/${t.id}`)}
                  >
                    View Outline
                  </button>
                )}
                <button
                  type="button" className="btn btn--sm" disabled={!t.lastAttemptId}
                  title={t.lastAttemptId ? '' : 'Give the test first'}
                  onClick={() => navigate(`/result/${t.lastAttemptId}`)}
                >
                  View Result
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
