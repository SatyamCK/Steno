import {
  AlertTriangle, ArrowRight, Ban, Clock, Gauge, Headphones, Keyboard, Play, RefreshCcw, SkipForward, Timer, Volume2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useConfirm } from '../../components/feedback';
import { FocusLayout } from '../../components/Layouts';
import { Alert, Card, PageHeader, SkeletonList } from '../../components/ui';
import { CATEGORIES, fmtClock, isHindi } from '../../utils/format';
import { session, useApi, useElapsed, useLeaveWarning, usePageTitle } from '../../utils/hooks';

/** Mockup page 5: instructions + Skip / Listen Audio (shorthand), or Start (typing tests). */
export default function TestStart() {
  const { id } = useParams();
  const { data: test, error } = useApi(`/tests/${id}`);
  usePageTitle(test ? test.title : 'Test');

  return (
    <FocusLayout>
      <main className="main">
        {error && <Alert tone="error">{error.message} <Link to="/home">Go back</Link></Alert>}
        {!test && !error && <SkeletonList rows={2} height={180} />}
        {test && (
          <>
            <PageHeader
              back={CATEGORIES[test.category].path}
              title={<span lang={isHindi(test.category) ? 'hi' : undefined}>{test.title}</span>}
              subtitle={`${CATEGORIES[test.category].label}${test.wpm ? ` · ${test.wpm} WPM` : ''}`}
            />
            {test.category === 'SHORTHAND' ? <ListenStep test={test} /> : <TypingIntro test={test} />}
          </>
        )}
      </main>
    </FocusLayout>
  );
}

function MetaGrid({ test }) {
  return (
    <div className="meta-list">
      <div className="meta"><div className="meta__label"><Gauge size={14} />Speed</div><div className="meta__value">{test.wpm ? `${test.wpm} WPM` : '—'}</div></div>
      <div className="meta"><div className="meta__label"><Timer size={14} />Time to type</div><div className="meta__value">{test.durationMin} min</div></div>
      {test.category === 'SHORTHAND' && (
        <div className="meta"><div className="meta__label"><Headphones size={14} />Auto-start after</div><div className="meta__value">{test.listenMin ? `${test.listenMin} min` : 'Audio ends'}</div></div>
      )}
    </div>
  );
}

function ListenStep({ test }) {
  const navigate = useNavigate();
  const confirm = useConfirm();
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
      setAudioError('Could not play the audio. Check your speakers or browser settings and try again.');
    }
  };

  const skip = async () => {
    if (phase === 'listening' && !(await confirm({
      title: 'Stop the dictation?',
      text: 'The audio cannot be played again. Transcription will start immediately.',
      confirmLabel: 'Start transcription',
    }))) return;
    goWrite();
  };

  const pct = progress.dur ? Math.min(100, (progress.cur / progress.dur) * 100) : 0;

  return (
    <div className="intro-grid">
      <Card title="Instructions" icon={AlertTriangle}>
        <ul className="rules">
          <li><RefreshCcw size={18} /><span>Do not refresh the page while listening. The audio can be played <strong>only once</strong>.</span></li>
          <li><Clock size={18} /><span>Transcription starts automatically when the audio ends{test.listenMin ? ` or after ${test.listenMin} min of listening` : ''}. You can also go ahead with <strong>Skip</strong>.</span></li>
          <li><Keyboard size={18} /><span>You will get {test.durationMin} minutes to type. The test submits automatically when time is up.</span></li>
          <li><Ban size={18} /><span>Copy, paste and spell-check are disabled during the test.</span></li>
        </ul>
      </Card>

      <Card title="Dictation" icon={Volume2}>
        <div className="stack-sm">
          <MetaGrid test={test} />
          {test.audioUrl ? (
            <audio
              ref={audioRef} src={test.audioUrl} preload="auto"
              onTimeUpdate={(e) => setProgress({ cur: e.target.currentTime, dur: e.target.duration || 0 })}
              onLoadedMetadata={(e) => setProgress({ cur: 0, dur: e.target.duration || 0 })}
              onEnded={goWrite}
              onError={() => setAudioError('The audio file could not be loaded.')}
            />
          ) : (
            <Alert tone="warning">Audio for this dictation has not been uploaded yet. Use Skip to practise transcription.</Alert>
          )}

          {phase === 'already' && <Alert tone="info">The audio for this attempt has already been played. Continue with transcription.</Alert>}

          {(phase === 'listening' || phase === 'idle') && test.audioUrl && (
            <div className="player" aria-live="polite">
              <div className="player__row">
                <span className="player__state">
                  {phase === 'listening' ? <span className="eq" aria-hidden="true"><i /><i /><i /><i /></span> : <Headphones size={18} />}
                  {phase === 'listening' ? 'Playing dictation' : 'Ready to play'}
                </span>
                <span className="tabular">{fmtClock(progress.cur)} / {fmtClock(progress.dur)}</span>
              </div>
              <div className="progress"><div className="progress__bar" style={{ width: `${pct}%` }} /></div>
              {phase === 'listening' && limitSec > 0 && (
                <div className="player__row"><span>Transcription starts automatically in</span><strong className="tabular" style={{ color: '#fff' }}>{fmtClock(remaining)}</strong></div>
              )}
            </div>
          )}
          {audioError && <Alert tone="error">{audioError}</Alert>}

          <div className="grid-2" style={{ gap: 12 }}>
            <button type="button" className="btn btn--lg" onClick={skip}>
              {phase === 'already' ? <ArrowRight size={18} /> : <SkipForward size={18} />} {phase === 'already' ? 'Continue' : 'Skip'}
            </button>
            <button type="button" className="btn btn--accent btn--lg" onClick={listen} disabled={!test.audioUrl || phase !== 'idle'}>
              <Play size={18} /> {phase === 'listening' ? 'Playing…' : 'Listen Audio'}
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function TypingIntro({ test }) {
  const navigate = useNavigate();
  return (
    <div className="intro-grid">
      <Card title="Instructions" icon={AlertTriangle}>
        <ul className="rules">
          <li><Keyboard size={18} /><span>The passage will be shown on screen. Type it exactly as shown, including capitals and punctuation.</span></li>
          <li><Clock size={18} /><span>You have {test.durationMin} minutes. The timer starts when you click Start, and the test submits automatically when time is up.</span></li>
          <li><Ban size={18} /><span>Copy, paste and spell-check are disabled. Do not refresh the page during the test.</span></li>
          {isHindi(test.category) && <li><Keyboard size={18} /><span>Use a Hindi Unicode keyboard (e.g. Inscript) to type.</span></li>}
        </ul>
      </Card>
      <Card title="Test details" icon={Timer}>
        <div className="stack-sm">
          <MetaGrid test={test} />
          <button type="button" className="btn btn--accent btn--lg btn--block" onClick={() => navigate(`/test/${test.id}/write`, { replace: true })}>
            <Play size={18} /> Start Test
          </button>
        </div>
      </Card>
    </div>
  );
}
