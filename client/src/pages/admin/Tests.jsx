import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { CATEGORIES, fmtDate, isHindi } from '../../utils/format';
import { useApi } from '../../utils/hooks';

export default function Tests() {
  const [category, setCategory] = useState('');
  const { data: tests, error, loading, reload } = useApi(`/admin/tests${category ? `?category=${category}` : ''}`);
  const [msg, setMsg] = useState('');

  const remove = async (t) => {
    if (!window.confirm(`Delete "${t.title}" and all ${t._count.attempts} results for it?`)) return;
    try {
      await api(`/admin/tests/${t.id}`, { method: 'DELETE' });
      setMsg(`Deleted "${t.title}".`);
      reload();
    } catch (e) {
      setMsg(`Error: ${e.message}`);
    }
  };

  return (
    <div className="stack">
      <div className="toolbar">
        <h2 className="page-title page-title--left">Tests</h2>
        <select className="input input--auto" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All sections</option>
          {Object.entries(CATEGORIES).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}
        </select>
        <span className="spacer" />
        <Link to="/admin/tests/new" className="btn btn--primary">+ Add Test</Link>
      </div>
      {msg && <p className={msg.startsWith('Error') ? 'form-error' : 'notice notice--ok'}>{msg}</p>}
      {loading && <p className="muted">Loading…</p>}
      {error && <p className="form-error">{error.message}</p>}
      {tests?.length === 0 && <p className="empty">No tests yet. Click “Add Test”.</p>}
      {tests?.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Date</th><th>Section</th><th>Title</th><th>WPM</th><th>Duration</th><th>Words</th><th>Media</th><th>Results</th><th>Status</th><th /></tr>
            </thead>
            <tbody>
              {tests.map((t) => (
                <tr key={t.id}>
                  <td>{fmtDate(t.testDate)}</td>
                  <td>{CATEGORIES[t.category].label}</td>
                  <td lang={isHindi(t.category) ? 'hi' : undefined}>{t.title}</td>
                  <td>{t.wpm ?? '—'}</td>
                  <td>{t.durationMin} min</td>
                  <td>{t.words}</td>
                  <td className="small">
                    {t.category === 'SHORTHAND' ? (
                      <>
                        {t.audioUrl ? '🔊 audio' : <span className="text-warn">no audio</span>}
                        <br />
                        {t.outlineImages.length ? `📄 ${t.outlineImages.length} outline pg` : <span className="text-warn">no outline</span>}
                      </>
                    ) : '—'}
                  </td>
                  <td><Link to={`/admin/results?testId=${t.id}`}>{t._count.attempts}</Link></td>
                  <td><span className={`pill ${t.published ? 'pill--ok' : 'pill--muted'}`}>{t.published ? 'Published' : 'Hidden'}</span></td>
                  <td className="actions">
                    <Link to={`/admin/tests/${t.id}`} className="btn btn--sm">Edit</Link>
                    <button type="button" className="btn btn--sm btn--danger" onClick={() => remove(t)}>Delete</button>
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
