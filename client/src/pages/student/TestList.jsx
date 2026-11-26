import { BarChart3, BookOpen, CheckCircle2, Clock, FileText, Gauge, Headphones, Play, RotateCcw, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Badge, Card, EmptyState, PageHeader, SkeletonList } from '../../components/ui';
import { accuracyTone, CATEGORIES, dateParts, isHindi } from '../../utils/format';
import { session, useApi, usePageTitle } from '../../utils/hooks';

/** Clear any in-progress state so "Give Test" always starts a fresh attempt. */
export function resetTestSession(id) {
  ['listened_', 'start_', 'draft_'].forEach((k) => session.remove(`${k}${id}`));
}

const SUBTITLES = {
  SHORTHAND: 'Listen to the dictation, transcribe it, and get an instant mistake analysis.',
  ENGLISH_TYPING: 'Type the passage shown on screen within the time limit.',
  HINDI_TYPING: 'Type the Hindi passage using your Unicode / Inscript keyboard.',
};

export default function TestList({ category }) {
  const { label } = CATEGORIES[category];
  usePageTitle(label);
  const navigate = useNavigate();
  const { data: tests, error, loading } = useApi(`/tests?category=${category}`);
  const [q, setQ] = useState('');
  const [wpm, setWpm] = useState('all');
  const isShorthand = category === 'SHORTHAND';
  const hindi = isHindi(category);

  const speeds = useMemo(() => [...new Set((tests || []).map((t) => t.wpm).filter(Boolean))].sort((a, b) => a - b), [tests]);
  const shown = (tests || []).filter((t) => (wpm === 'all' || t.wpm === Number(wpm)) && t.title.toLowerCase().includes(q.toLowerCase()));

  const give = (t) => {
    resetTestSession(t.id);
    navigate(`/test/${t.id}`);
  };

  return (
    <>
      <PageHeader title={label} subtitle={SUBTITLES[category]} />

      {tests?.length > 0 && (
        <div className="toolbar">
          <div className="search">
            <Search size={16} />
            <input className="input" placeholder="Search tests…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search tests" />
          </div>
          {speeds.length > 1 && (
            <div className="segmented" role="tablist" aria-label="Filter by speed">
              <button type="button" role="tab" aria-selected={wpm === 'all'} onClick={() => setWpm('all')}>All speeds</button>
              {speeds.map((s) => (
                <button key={s} type="button" role="tab" aria-selected={wpm === String(s)} onClick={() => setWpm(String(s))}>{s} WPM</button>
              ))}
            </div>
          )}
        </div>
      )}

      {loading && <SkeletonList rows={4} height={88} />}
      {error && <Alert tone="error">{error.message}</Alert>}
      {tests?.length === 0 && (
        <Card><EmptyState icon={BookOpen} title="No tests available yet" text="New tests are added regularly. Please check back soon." /></Card>
      )}
      {tests?.length > 0 && shown.length === 0 && <Card><EmptyState icon={Search} title="No matching tests" text="Try a different search or speed." /></Card>}

      <div className="test-cards">
        {shown.map((t) => {
          const d = dateParts(t.testDate);
          return (
            <article key={t.id} className="test-card">
              <div className="date-tile" aria-label={`Dated ${d.day} ${d.mon} ${d.yr}`}>
                <div className="date-tile__day">{d.day}</div>
                <div className="date-tile__mon">{d.mon}</div>
                <div className="date-tile__yr">{d.yr}</div>
              </div>
              <div style={{ minWidth: 0 }}>
                <h3 className="test-card__title" lang={hindi ? 'hi' : undefined}>{t.title}</h3>
                <div className="test-card__meta">
                  {t.wpm && <Badge tone="brand" icon={Gauge}>{t.wpm} WPM</Badge>}
                  <Badge icon={Clock}>{t.durationMin} min</Badge>
                  {isShorthand && t.hasAudio && <Badge icon={Headphones}>Audio</Badge>}
                  {t.lastResult ? (
                    <Badge tone={accuracyTone(t.lastResult.accuracy)} icon={CheckCircle2}>
                      Last: {t.lastResult.mistakes} mistakes · {t.lastResult.accuracy}%{t.attemptCount > 1 ? ` · ${t.attemptCount} attempts` : ''}
                    </Badge>
                  ) : (
                    <span className="small muted">Not attempted yet</span>
                  )}
                </div>
              </div>
              <div className="test-card__actions">
                <button type="button" className="btn btn--accent" onClick={() => give(t)}>
                  {t.lastResult ? <RotateCcw size={16} /> : <Play size={16} />} {t.lastResult ? 'Retake' : 'Give Test'}
                </button>
                {isShorthand && (
                  <button type="button" className="btn" disabled={!t.hasOutline} title={t.hasOutline ? 'View shorthand outline' : 'Outline not uploaded yet'} onClick={() => navigate(`/outline/${t.id}`)}>
                    <FileText size={16} /> View Outline
                  </button>
                )}
                <button type="button" className="btn" disabled={!t.lastAttemptId} title={t.lastAttemptId ? 'View your latest result' : 'Give the test first'} onClick={() => navigate(`/result/${t.lastAttemptId}`)}>
                  <BarChart3 size={16} /> View Result
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
