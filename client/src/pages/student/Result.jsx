import { Fragment, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Header from '../../components/Header';
import { useAuth } from '../../context/AuthContext';
import { CATEGORIES, fmtDateTime, fmtDuration, fullName, isHindi, pad2, testLabel } from '../../utils/format';
import { useApi } from '../../utils/hooks';
import { printPage, savePdf } from '../../utils/pdf';

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
      // Show whichever version carries the punctuation so the mark is visible.
      const shown = punctCount(op.y) > punctCount(op.o) ? op.y : op.o;
      return <span title={`You typed: ${op.y}`}><PunctWord word={shown} /></span>;
    }
    case 'capital':
      return (<><span className="m-cap" title="Capital / small letter">{op.y}</span> <span className="m-ok">{op.o}</span></>);
    case 'spelling':
      return (<><mark className="m-spell" title="Spelling">{op.y}</mark> <span className="m-ok">{op.o}</span></>);
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
  const { data: a, error } = useApi(`/attempts/${id}`);
  const [tab, setTab] = useState('analysis');
  const [saving, setSaving] = useState(false);
  const printRef = useRef(null);

  if (error) {
    return (
      <>
        <Header person={user} showDate />
        <p className="form-error page">{error.message} <Link to="/home">Go back</Link></p>
      </>
    );
  }
  if (!a) return (<><Header person={user} showDate /><p className="page muted">Loading result…</p></>);

  const c = { ...a.counts, wrongAll: a.counts.wrong + a.counts.extra };
  const hindi = isHindi(a.test.category);

  const onSave = async () => {
    setSaving(true);
    try {
      await savePdf(printRef.current, `${fullName(a.user)} - ${a.test.title} - result.pdf`);
    } finally {
      setSaving(false);
    }
  };

  const backTo = user?.role === 'ADMIN' ? '/admin/results' : CATEGORIES[a.test.category].path;

  return (
    <>
      <Header person={a.user} showDate />
      <div className="page page--wide result">
        <div ref={printRef} className="printable">
          <h2 className="page-title">View Result</h2>
          <div className="result__info">
            <span><strong>{fullName(a.user)}</strong></span>
            <span lang={hindi ? 'hi' : undefined}>{CATEGORIES[a.test.category].label} — {testLabel(a.test)}</span>
            <span>Submitted : {fmtDateTime(a.createdAt)}</span>
            <span>Time taken : {fmtDuration(a.timeTakenSec)}</span>
          </div>

          <ul className="legend">
            {LEGEND.map((l) => (
              <li key={l.key}>
                <span className={`swatch ${l.swatch}`}>{l.key === 'wrongAll' ? 'Strike' : ''}</span>
                {l.label} : {pad2(c[l.key] || 0)}
              </li>
            ))}
          </ul>

          <div className="tabs no-print" role="tablist">
            <button type="button" role="tab" aria-selected={tab === 'analysis'} onClick={() => setTab('analysis')}>Analysis</button>
            <button type="button" role="tab" aria-selected={tab === 'typed'} onClick={() => setTab('typed')}>Your Transcription</button>
          </div>

          <div className={`result__text${hindi ? ' hindi' : ''}`} lang={hindi ? 'hi' : undefined}>
            {tab === 'analysis'
              ? a.ops.map((op, i) => (
                <Fragment key={i}>
                  {op.pb && <span className="para-break" />}
                  <Op op={op} />{' '}
                </Fragment>
              ))
              : <div className="pre">{a.typedText || <em className="muted">(nothing typed)</em>}</div>}
          </div>

          <div className="result__summary">
            <span className="result__total">Total Number of Mistakes : {pad2(a.totalMistakes)}</span>
            <span>Words in passage : {c.originalWords}</span>
            <span>Words typed : {c.typedWords}</span>
            <span>Accuracy : {c.accuracy}%</span>
            {c.extra > 0 && <span>Extra words : {c.extra}</span>}
          </div>
        </div>

        <div className="result__actions no-print">
          <button type="button" className="btn btn--secondary" onClick={() => navigate(backTo)}>Back</button>
          <span className="spacer" />
          <button type="button" className="btn" onClick={printPage}>Print Pdf</button>
          <button type="button" className="btn" onClick={onSave} disabled={saving}>{saving ? 'Saving…' : 'Save Pdf'}</button>
        </div>
      </div>
    </>
  );
}
