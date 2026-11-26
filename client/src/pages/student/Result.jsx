import { AlertTriangle, ArrowLeft, Clock, Download, FileText, Printer, RotateCcw, Type } from 'lucide-react';
import { Fragment, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../../components/feedback';
import { FocusLayout } from '../../components/Layouts';
import { Alert, Card, PageHeader, SkeletonList, Spinner, StatCard } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { CATEGORIES, fmtDateTime, fmtDuration, fullName, isHindi, pad2 } from '../../utils/format';
import { useApi, usePageTitle } from '../../utils/hooks';
import { printPage, savePdf } from '../../utils/pdf';
import { resetTestSession } from './TestList';

const PUNCT_RE = /[\p{P}\p{S}]/u;

/** Render a word with its punctuation characters in red. */
function PunctWord({ word }) {
  return [...word].map((ch, i) => (PUNCT_RE.test(ch) ? <span key={i} className="m-punct">{ch}</span> : ch));
}

function Op({ op }) {
  switch (op.t) {
    case 'correct':
      return op.o;
    case 'punct': {
      const punctCount = (w) => [...w].filter((c) => PUNCT_RE.test(c)).length;
      const shown = punctCount(op.y) > punctCount(op.o) ? op.y : op.o; // show the version that carries the mark
      return <span title={`You typed: ${op.y}`}><PunctWord word={shown} /></span>;
    }
    case 'capital':
      return (<><span className="m-cap" title="Capital / small letter">{op.y}</span> <span className="m-ok">{op.o}</span></>);
    case 'spelling':
      return (<><mark className="m-spell" title="Spelling mistake">{op.y}</mark> <span className="m-ok">{op.o}</span></>);
    case 'wrong':
      return (<><s className="m-wrong" title="Wrong word">{op.y}</s> <span className="m-ok">{op.o}</span></>);
    case 'missing':
      return <span className="m-missing" title="Missing word">{op.o}</span>;
    case 'extra':
      return <s className="m-wrong" title="Extra word">{op.y}</s>;
    default:
      return null;
  }
}

const LEGEND = [
  { key: 'punctuation', label: 'Punctuation', swatch: 'sw-punct' },
  { key: 'capital', label: 'Capital-Small', swatch: 'sw-cap' },
  { key: 'spelling', label: 'Spelling', swatch: 'sw-spell' },
  { key: 'wrongAll', label: 'Wrong Word', swatch: 'sw-wrong' },
  { key: 'missing', label: 'Missing Word', swatch: 'sw-missing' },
  { key: 'correct', label: 'Correct Word', swatch: 'sw-ok' },
];

export default function Result() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: a, error } = useApi(`/attempts/${id}`);
  const [tab, setTab] = useState('analysis');
  const [saving, setSaving] = useState(false);
  const printRef = useRef(null);
  usePageTitle(a ? `Result — ${a.test.title}` : 'Result');

  if (error || !a) {
    return (
      <FocusLayout>
        <main className="main">
          {error ? <Alert tone="error">{error.message} <Link to="/home">Go back</Link></Alert> : <SkeletonList rows={3} height={120} />}
        </main>
      </FocusLayout>
    );
  }

  const c = { ...a.counts, wrongAll: a.counts.wrong + a.counts.extra };
  const hindi = isHindi(a.test.category);
  const isAdmin = user?.role === 'ADMIN';
  const backTo = isAdmin ? '/admin/results' : CATEGORIES[a.test.category].path;
  const grade = c.accuracy >= 95 ? 'Excellent' : c.accuracy >= 85 ? 'Good' : c.accuracy >= 70 ? 'Fair' : 'Needs practice';
  const accColor = c.accuracy >= 95 ? 'var(--success)' : c.accuracy >= 85 ? 'var(--warning)' : 'var(--danger)';

  const onSave = async () => {
    setSaving(true);
    try {
      await savePdf(printRef.current, `${fullName(a.user)} - ${a.test.title} - result.pdf`);
      toast('PDF downloaded');
    } catch {
      toast('Could not create the PDF. Please try Print instead.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const retake = () => {
    resetTestSession(a.test.id);
    navigate(`/test/${a.test.id}`);
  };

  return (
    <FocusLayout person={a.user}>
      <main className="main">
        <PageHeader
          back={backTo}
          title="View Result"
          subtitle={<span lang={hindi ? 'hi' : undefined}>{CATEGORIES[a.test.category].label} · {a.test.title}{a.test.wpm ? ` · ${a.test.wpm} WPM` : ''}</span>}
          actions={(
            <>
              {!isAdmin && <button type="button" className="btn" onClick={retake}><RotateCcw size={16} />Retake</button>}
              <button type="button" className="btn" onClick={printPage}><Printer size={16} />Print Pdf</button>
              <button type="button" className="btn btn--primary" onClick={onSave} disabled={saving}>
                {saving ? <Spinner /> : <Download size={16} />}Save Pdf
              </button>
            </>
          )}
        />

        <div ref={printRef} className="stack">
          <div className="print-header">
            <strong>Steno Drive</strong>
            <span>{fullName(a.user)} · {a.test.title}{a.test.wpm ? ` · ${a.test.wpm} WPM` : ''} · {fmtDateTime(a.createdAt)}</span>
          </div>

          <div className="stats">
            <div className="stat">
              <div className="score-ring" style={{ '--p': c.accuracy, '--ring-color': accColor }}>
                <div className="score-ring__inner"><div><div className="score-ring__val">{c.accuracy}%</div><div className="score-ring__lbl">Accuracy</div></div></div>
              </div>
              <span>
                <div className="stat__value" style={{ color: accColor, fontSize: 19 }}>{grade}</div>
                <div className="stat__label">Submitted {fmtDateTime(a.createdAt)}</div>
              </span>
            </div>
            <StatCard icon={AlertTriangle} tone="danger" label="Total Number of Mistakes" value={pad2(a.totalMistakes)} />
            <StatCard icon={Type} label="Words typed / in passage" value={`${c.typedWords} / ${c.originalWords}`} />
            <StatCard icon={Clock} tone="violet" label="Time taken" value={fmtDuration(a.timeTakenSec)} />
          </div>

          <div className="legend" aria-label="Mistake summary">
            {LEGEND.map((l) => (
              <span key={l.key} className="legend__item">
                <span className={`swatch ${l.swatch}`} />{l.label}: <strong>{pad2(c[l.key] || 0)}</strong>
              </span>
            ))}
          </div>

          <Card
            bodyClass={null}
            title={tab === 'analysis' ? 'Mistake analysis' : 'Your transcription'}
            icon={FileText}
            actions={(
              <div className="segmented no-print" role="tablist">
                <button type="button" role="tab" aria-selected={tab === 'analysis'} onClick={() => setTab('analysis')}>Analysis</button>
                <button type="button" role="tab" aria-selected={tab === 'typed'} onClick={() => setTab('typed')}>As typed</button>
              </div>
            )}
          >
            <div className={`result-text${hindi ? ' hindi' : ''}`} lang={hindi ? 'hi' : undefined}>
              {tab === 'analysis'
                ? a.ops.map((op, i) => (
                  <Fragment key={i}>
                    {op.pb && <span className="para-break" />}
                    <Op op={op} />{' '}
                  </Fragment>
                ))
                : <div className="pre">{a.typedText || <em className="muted">(nothing typed)</em>}</div>}
            </div>
          </Card>
          {c.extra > 0 && <p className="small muted">Includes {c.extra} extra word{c.extra > 1 ? 's' : ''} (typed but not in the passage), shown struck through and counted as wrong words.</p>}
        </div>

        <div className="row no-print" style={{ marginTop: 20 }}>
          <button type="button" className="btn btn--ghost" onClick={() => navigate(backTo)}><ArrowLeft size={16} />Back to {isAdmin ? 'results' : CATEGORIES[a.test.category].label}</button>
        </div>
      </main>
    </FocusLayout>
  );
}
