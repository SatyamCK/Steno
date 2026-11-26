import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api';
import Header from '../../components/Header';
import { useAuth } from '../../context/AuthContext';
import { fmtClock, isHindi, testLabel } from '../../utils/format';
import { session, useApi, useElapsed, useLatest, useLeaveWarning } from '../../utils/hooks';
import { resetTestSession } from './TestList';

/** Mockup page 6: duration, timer, big typing box, Submit. */
export default function Transcribe() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: test, error } = useApi(`/tests/${id}`);

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
  const remaining = totalSec - elapsed;
  const hindi = test && isHindi(test.category);

  useLeaveWarning(!submitting);

  useEffect(() => {
    session.set(draftKey, text);
  }, [draftKey, text]);

  const submit = async (auto = false) => {
    if (submittedRef.current) return;
    if (!auto && !window.confirm('Submit your transcription? You cannot change it afterwards.')) return;
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
      setSubmitError(`${err.message} Your text is safe — try submitting again.`);
    }
  };
  const submitRef = useLatest(submit);

  useEffect(() => {
    if (test && totalSec > 0 && remaining <= 0) submitRef.current(true);
  }, [test, totalSec, remaining, submitRef]);

  const block = (e) => e.preventDefault();
  const words = text.split(/\s+/).filter(Boolean).length;

  return (
    <>
      <Header person={user} showDate />
      {error && <p className="form-error page">{error.message} <Link to="/home">Go back</Link></p>}
      {test && (
        <div className="page page--wide transcribe">
          <div className="transcribe__meta">
            <div className="transcribe__title" lang={hindi ? 'hi' : undefined}>{testLabel(test)}</div>
            <div>Duration : {test.durationMin} Min</div>
            <div>
              Timer : <strong>{fmtClock(Math.min(elapsed, totalSec))}</strong>
              <span className={`time-left${remaining <= 60 ? ' is-low' : ''}`}>
                ({fmtClock(remaining)} left)
              </span>
            </div>
          </div>

          {test.passage && (
            <div
              className={`passage${hindi ? ' hindi' : ''}`}
              lang={hindi ? 'hi' : undefined}
              onCopy={block}
              onCut={block}
              onContextMenu={block}
            >
              {test.passage}
            </div>
          )}

          <textarea
            className={`type-box${hindi ? ' hindi' : ''}`}
            lang={hindi ? 'hi' : 'en'}
            placeholder="Type Here…."
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

          <div className="transcribe__footer">
            <span className="muted">Words typed : {words}</span>
            {submitError && <span className="form-error">{submitError}</span>}
            <button type="button" className="btn btn--primary btn--submit" onClick={() => submit(false)} disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
