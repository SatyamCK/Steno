import { FileText, Send, Timer } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api';
import { useConfirm } from '../../components/feedback';
import Header from '../../components/Header';
import { Alert, Card, Spinner } from '../../components/ui';
import { CATEGORIES, fmtClock, isHindi } from '../../utils/format';
import { session, useApi, useElapsed, useLatest, useLeaveWarning, usePageTitle } from '../../utils/hooks';
import { resetTestSession } from './TestList';

/** Mockup page 6: duration, timer, big typing box, Submit. */
export default function Transcribe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { data: test, error } = useApi(`/tests/${id}`);
  usePageTitle(test ? `Typing — ${test.title}` : 'Test');

  const startKey = `start_${id}`;
  const draftKey = `draft_${id}`;
  const [startedAt] = useState(() => {
    const saved = Number(session.get(startKey));
    if (saved) return saved;
    const now = Date.now();
    session.set(startKey, String(now));
    return now;
  });
  const [text, setText] = useState(() => session.get(draftKey) || '');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const submittedRef = useRef(false);
  const textRef = useLatest(text);

  const elapsed = useElapsed(startedAt, !submitting);
  const totalSec = (test?.durationMin || 0) * 60;
  const remaining = Math.max(0, totalSec - elapsed);
  const hindi = test && isHindi(test.category);

  useLeaveWarning(!submitting);

  useEffect(() => {
    session.set(draftKey, text);
  }, [draftKey, text]);

  const submit = async (auto = false) => {
    if (submittedRef.current) return;
    if (!auto && !(await confirm({
      title: 'Submit your test?',
      text: `You have typed ${words} words with ${fmtClock(remaining)} remaining. You cannot change your answer after submitting.`,
      confirmLabel: 'Submit test',
    }))) return;
    submittedRef.current = true;
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await api(`/tests/${id}/attempts`, {
        method: 'POST',
        body: { typedText: textRef.current, timeTakenSec: Math.min(elapsed, totalSec) },
      });
      resetTestSession(id);
      navigate(`/result/${res.id}`, { replace: true });
    } catch (err) {
      submittedRef.current = false;
      setSubmitting(false);
      setSubmitError(`${err.message} Your text is safe — please try submitting again.`);
    }
  };
  const submitRef = useLatest(submit);

  useEffect(() => {
    if (test && totalSec > 0 && totalSec - elapsed <= 0) submitRef.current(true);
  }, [test, totalSec, elapsed, submitRef]);

  const block = (e) => e.preventDefault();
  const words = text.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(elapsed, 1) / 60;
  const grossWpm = Math.round(words / minutes);
  const timerTone = remaining <= 60 ? 'timer--danger' : remaining <= 300 ? 'timer--warn' : '';

  return (
    <>
      <Header />
      {error && <main className="main"><Alert tone="error">{error.message} <Link to="/home">Go back</Link></Alert></main>}
      {test && (
        <>
          <div className="exam-bar">
            <div className="exam-bar__inner">
              <div style={{ minWidth: 0 }}>
                <div className="exam-bar__title" lang={hindi ? 'hi' : undefined}>{test.title}</div>
                <div className="exam-bar__sub">
                  {CATEGORIES[test.category].label}{test.wpm ? ` · ${test.wpm} WPM` : ''} · Duration : {test.durationMin} Min
                </div>
              </div>
              <span className="spacer" />
              <div className={`timer ${timerTone}`} role="timer" aria-label="Time remaining">
                <Timer size={18} />
                <span><span className="timer__label">Time left </span>{fmtClock(remaining)}</span>
              </div>
              <button type="button" className="btn btn--accent" onClick={() => submit(false)} disabled={submitting}>
                {submitting ? <Spinner /> : <Send size={16} />} {submitting ? 'Submitting…' : 'Submit'}
              </button>
            </div>
            <div className="time-progress"><div className="time-progress__bar" style={{ width: `${totalSec ? (Math.min(elapsed, totalSec) / totalSec) * 100 : 0}%` }} /></div>
          </div>

          <main className="main stack">
            {submitError && <Alert tone="error">{submitError}</Alert>}

            {test.passage && (
              <Card title="Passage" icon={FileText} bodyClass={null}>
                <div className={`passage${hindi ? ' hindi' : ''}`} lang={hindi ? 'hi' : undefined} onCopy={block} onCut={block} onContextMenu={block}>
                  {test.passage}
                </div>
              </Card>
            )}

            <section className="card editor">
              <textarea
                className={`type-box${hindi ? ' hindi' : ''}`}
                lang={hindi ? 'hi' : 'en'}
                aria-label="Type your transcription here"
                placeholder="Type Here…"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onPaste={block}
                onDrop={block}
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
                autoComplete="off"
                disabled={submitting}
                autoFocus
              />
              <div className="editor__foot">
                <span>Words: <strong className="tabular">{words}</strong></span>
                <span>Characters: <strong className="tabular">{text.length}</strong></span>
                <span>Speed: <strong className="tabular">{grossWpm}</strong> WPM</span>
                <span>Elapsed: <strong className="tabular">{fmtClock(Math.min(elapsed, totalSec))}</strong></span>
                <span className="spacer" />
                <span>Draft saved automatically</span>
              </div>
            </section>
          </main>
        </>
      )}
    </>
  );
}
