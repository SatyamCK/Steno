import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Header from '../../components/Header';
import { useAuth } from '../../context/AuthContext';
import { CATEGORIES, fmtClock, isHindi, testLabel } from '../../utils/format';
import { session, useApi, useElapsed, useLeaveWarning } from '../../utils/hooks';

/** Mockup page 5: instructions + Skip / Listen Audio (shorthand), or Start (typing tests). */
export default function TestStart() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data: test, error } = useApi(`/tests/${id}`);

  return (
    <>
      <Header person={user} showDate />
      {error && <p className="form-error page">{error.message} <Link to="/home">Go back</Link></p>}
      {test && (test.category === 'SHORTHAND' ? <ListenStep test={test} /> : <TypingIntro test={test} />)}
    </>
  );
}

function ListenStep({ test }) {
  const navigate = useNavigate();
  const audioRef = useRef(null);
  const listenedKey = `listened_${test.id}`;
  const [phase, setPhase] = useState(() => (session.get(listenedKey) ? 'already' : 'idle'));
  const [startedAt, setStartedAt] = useState(null);
  const [progress, setProgress] = useState({ cur: 0, dur: 0 });
  const [audioError, setAudioError] = useState('');
  const elapsed = useElapsed(startedAt, phase === 'listening');
  const limitSec = test.listenMin * 60;
  const remaining = limitSec - elapsed;

  useLeaveWarning(phase === 'listening');

  const goWrite = () => {
    audioRef.current?.pause();
    session.set(listenedKey, '1');
    navigate(`/test/${test.id}/write`, { replace: true });
  };

  // Transcription starts automatically when the listening time is over.
  useEffect(() => {
    if (phase === 'listening' && limitSec > 0 && remaining <= 0) goWrite();
  });

  const listen = async () => {
    setAudioError('');
    try {
      await audioRef.current.play();
      session.set(listenedKey, '1');
      setStartedAt(Date.now());
      setPhase('listening');
    } catch {
      setAudioError('Could not play the audio. Check your speakers / browser settings and try again.');
    }
  };

  const skip = () => {
    if (phase === 'listening' && !window.confirm('Stop the audio and start transcription now?')) return;
    goWrite();
  };

  const pct = progress.dur ? Math.min(100, (progress.cur / progress.dur) * 100) : 0;

  return (
    <div className="page test-intro">
      <div className="instructions">
        <strong>Instructions :</strong>
        <ul>
          <li>Do not refresh the page while listening to the audio — it can be played only once.</li>
          <li>
            Transcription will start automatically when the audio ends or after {test.listenMin} min of listening
            (otherwise go ahead through <em>Skip</em>).
          </li>
          <li>You will get {test.durationMin} min to transcribe. Copy / paste is disabled.</li>
        </ul>
      </div>
      <h2 className="test-intro__title">{testLabel(test)}</h2>

      {test.audioUrl ? (
        <audio
          ref={audioRef}
          src={test.audioUrl}
          preload="auto"
          onTimeUpdate={(e) => setProgress({ cur: e.target.currentTime, dur: e.target.duration || 0 })}
          onLoadedMetadata={(e) => setProgress({ cur: 0, dur: e.target.duration || 0 })}
          onEnded={goWrite}
          onError={() => setAudioError('Audio file could not be loaded.')}
        />
      ) : (
        <p className="notice">Audio for this dictation has not been uploaded yet. Use Skip to practise transcription.</p>
      )}

      {phase === 'already' && (
        <p className="notice">The audio for this attempt has already been played. Continue with transcription.</p>
      )}

      {phase === 'listening' && (
        <div className="listen-status" aria-live="polite">
          <div className="progress"><div className="progress__bar" style={{ width: `${pct}%` }} /></div>
          <div className="listen-status__row">
            <span>🔊 Listening… {fmtClock(progress.cur)} / {fmtClock(progress.dur)}</span>
            {limitSec > 0 && <span>Transcription starts in <strong>{fmtClock(remaining)}</strong></span>}
          </div>
        </div>
      )}
      {audioError && <p className="form-error">{audioError}</p>}

      <div className="test-intro__actions">
        <button type="button" className="btn btn--primary btn--wide" onClick={skip}>
          {phase === 'already' ? 'Continue' : 'Skip'}
        </button>
        <button
          type="button" className="btn btn--wide" onClick={listen}
          disabled={!test.audioUrl || phase !== 'idle'}
        >
          {phase === 'listening' ? 'Playing…' : 'Listen Audio'}
        </button>
      </div>
    </div>
  );
}

function TypingIntro({ test }) {
  const navigate = useNavigate();
  return (
    <div className="page test-intro">
      <div className="instructions">
        <strong>Instructions :</strong>
        <ul>
          <li>The passage will be shown on screen. Type it exactly as shown, including capitals and punctuation.</li>
          <li>Duration is {test.durationMin} min. The timer starts when you click Start, and the test submits automatically when time is up.</li>
          <li>Copy / paste is disabled. Do not refresh the page during the test.</li>
          {isHindi(test.category) && <li>Use your Hindi (Unicode / Inscript) keyboard to type.</li>}
        </ul>
      </div>
      <h2 className="test-intro__title" lang={isHindi(test.category) ? 'hi' : undefined}>
        {CATEGORIES[test.category].label} — {testLabel(test)}
      </h2>
      <div className="test-intro__actions">
        <button type="button" className="btn btn--secondary btn--wide" onClick={() => navigate(-1)}>Back</button>
        <button
          type="button" className="btn btn--primary btn--wide"
          onClick={() => navigate(`/test/${test.id}/write`, { replace: true })}
        >
          Start
        </button>
      </div>
    </div>
  );
}
