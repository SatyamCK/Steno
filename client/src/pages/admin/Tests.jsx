import { ClipboardList, FileText, Headphones, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { useConfirm, useToast } from '../../components/feedback';
import { Alert, Badge, Card, EmptyState, IconButton, PageHeader, SkeletonList } from '../../components/ui';
import { CATEGORIES, fmtDate, isHindi } from '../../utils/format';
import { useApi, usePageTitle } from '../../utils/hooks';

export default function Tests() {
  usePageTitle('Tests');
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const [category, setCategory] = useState('');
  const [q, setQ] = useState('');
  const { data: tests, error, loading, reload } = useApi(`/admin/tests${category ? `?category=${category}` : ''}`);

  const remove = async (t) => {
    if (!(await confirm({
      title: `Delete “${t.title}”?`,
      text: `This also deletes its audio, outline and ${t._count.attempts} student result${t._count.attempts === 1 ? '' : 's'}. This cannot be undone.`,
      confirmLabel: 'Delete test', tone: 'danger',
    }))) return;
    try {
      await api(`/admin/tests/${t.id}`, { method: 'DELETE' });
      toast(`Deleted “${t.title}”`);
      reload();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const rows = (tests || []).filter((t) => t.title.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <PageHeader
        title="Tests"
        subtitle="Dictations and typing passages available to students."
        actions={<Link to="/admin/tests/new" className="btn btn--accent"><Plus size={17} />Add test</Link>}
      />
      <div className="toolbar">
        <div className="segmented" role="tablist">
          <button type="button" role="tab" aria-selected={category === ''} onClick={() => setCategory('')}>All</button>
          {Object.entries(CATEGORIES).map(([k, c]) => (
            <button key={k} type="button" role="tab" aria-selected={category === k} onClick={() => setCategory(k)}>{c.label}</button>
          ))}
        </div>
        <span className="spacer" />
        <div className="search">
          <Search size={16} />
          <input className="input" placeholder="Search tests…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search tests" />
        </div>
      </div>

      {error && <Alert tone="error">{error.message}</Alert>}
      <Card bodyClass={null}>
        {loading && <div className="card__body"><SkeletonList rows={4} height={44} /></div>}
        {!loading && rows.length === 0 && (
          <EmptyState icon={ClipboardList} title="No tests found" text="Create a test to make it available to students."
            action={<Link to="/admin/tests/new" className="btn btn--primary"><Plus size={16} />Add test</Link>} />
        )}
        {!loading && rows.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Test</th><th>Section</th><th>Date</th><th>Speed</th><th>Duration</th><th>Media</th><th>Results</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <div className="person__name" lang={isHindi(t.category) ? 'hi' : undefined}>{t.title}</div>
                      <div className="person__sub">{t.words} words</div>
                    </td>
                    <td className="muted">{CATEGORIES[t.category].label}</td>
                    <td className="muted nowrap">{fmtDate(t.testDate)}</td>
                    <td className="nowrap">{t.wpm ? `${t.wpm} WPM` : '—'}</td>
                    <td className="nowrap">{t.durationMin} min</td>
                    <td>
                      {t.category === 'SHORTHAND' ? (
                        <div className="row">
                          <Badge tone={t.audioUrl ? 'brand' : 'warning'} icon={Headphones}>{t.audioUrl ? 'Audio' : 'No audio'}</Badge>
                          <Badge tone={t.outlineImages.length ? 'brand' : 'warning'} icon={FileText}>
                            {t.outlineImages.length ? `${t.outlineImages.length} pages` : 'No outline'}
                          </Badge>
                        </div>
                      ) : <span className="muted">—</span>}
                    </td>
                    <td><Link to={`/admin/results?testId=${t.id}`} className="tabular">{t._count.attempts}</Link></td>
                    <td><Badge tone={t.published ? 'success' : ''}>{t.published ? 'Published' : 'Hidden'}</Badge></td>
                    <td>
                      <div className="actions">
                        <IconButton label="Edit" icon={Pencil} onClick={() => navigate(`/admin/tests/${t.id}`)} />
                        <IconButton label="Delete" icon={Trash2} tone="danger" onClick={() => remove(t)} />
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
