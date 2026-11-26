import { FileText, Headphones, ImagePlus, Info, Music, Save, Timer, Trash2, Upload, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api';
import { useToast } from '../../components/feedback';
import { Alert, Card, Field, IconButton, PageHeader, SkeletonList, Spinner } from '../../components/ui';
import { CATEGORIES, isHindi } from '../../utils/format';
import { useApi, usePageTitle } from '../../utils/hooks';

/** yyyy-mm-dd in the browser's local timezone (toISOString would shift to UTC). */
const toInputDate = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

const EMPTY = {
  category: 'SHORTHAND', title: '', wpm: '', testDate: toInputDate(new Date()),
  durationMin: 30, listenMin: 4, passage: '', published: true,
};

/** Preview of a not-yet-uploaded image; revokes its object URL on unmount. */
function LocalImage({ file }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url ? <img src={url} alt={file.name} /> : null;
}

export default function TestForm() {
  const { id } = useParams();
  const isNew = !id;
  usePageTitle(isNew ? 'Add test' : 'Edit test');
  const navigate = useNavigate();
  const toast = useToast();
  const { data: existing, error: loadError } = useApi(isNew ? null : `/admin/tests/${id}`);

  const [form, setForm] = useState(EMPTY);
  const [audio, setAudio] = useState(null);
  const [removeAudio, setRemoveAudio] = useState(false);
  const [keepOutline, setKeepOutline] = useState([]);
  const [newOutline, setNewOutline] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!existing) return;
    setForm({
      category: existing.category, title: existing.title, wpm: existing.wpm ?? '',
      testDate: toInputDate(existing.testDate), durationMin: existing.durationMin,
      listenMin: existing.listenMin, passage: existing.passage, published: existing.published,
    });
    setKeepOutline(existing.outlineImages);
  }, [existing]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const shorthand = form.category === 'SHORTHAND';
  const hindi = isHindi(form.category);
  const words = form.passage.split(/\s+/).filter(Boolean).length;
  const dictationMin = shorthand && form.wpm ? (words / Number(form.wpm)).toFixed(1) : null;

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));
    // Send the chosen day as local midnight so it shows the same date everywhere.
    fd.set('testDate', new Date(`${form.testDate}T00:00:00`).toISOString());
    if (shorthand) {
      if (audio) fd.append('audio', audio);
      if (removeAudio) fd.append('removeAudio', 'true');
      newOutline.forEach((f) => fd.append('outline', f));
      if (!isNew) fd.append('keepOutline', JSON.stringify(keepOutline));
    }
    setBusy(true);
    try {
      await api(isNew ? '/admin/tests' : `/admin/tests/${id}`, { method: isNew ? 'POST' : 'PUT', form: fd });
      toast(isNew ? 'Test created' : 'Changes saved');
      navigate('/admin/tests');
    } catch (err) {
      setError(err.message);
      setBusy(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (loadError) return <Alert tone="error">{loadError.message}</Alert>;
  if (!isNew && !existing) return <SkeletonList rows={3} height={160} />;

  return (
    <form onSubmit={onSubmit} className="stack">
      <PageHeader
        back="/admin/tests"
        title={isNew ? 'Add test' : 'Edit test'}
        subtitle={isNew ? 'Create a new dictation or typing test.' : existing.title}
        actions={(
          <>
            <Link to="/admin/tests" className="btn">Cancel</Link>
            <button className="btn btn--accent" disabled={busy}>{busy ? <Spinner /> : <Save size={16} />}Save test</button>
          </>
        )}
      />
      {error && <Alert tone="error">{error}</Alert>}

      <Card title="Basic details" icon={Info}>
        <div className="form-grid">
          <Field label="Section" required>
            <select className="input" value={form.category} onChange={set('category')}>
              {Object.entries(CATEGORIES).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Test date" required>
            <input type="date" className="input" value={form.testDate} onChange={set('testDate')} required />
          </Field>
          <Field label="Title" required className="span-all">
            <input className="input" lang={hindi ? 'hi' : undefined} placeholder="e.g. 1 – Negotiable Instruments Act" value={form.title} onChange={set('title')} required />
          </Field>
          <label className="check span-all">
            <input type="checkbox" checked={form.published} onChange={set('published')} />
            Published — visible to students
          </label>
        </div>
      </Card>

      <Card title="Speed & timing" icon={Timer}>
        <div className="form-grid form-grid--3">
          <Field label="Speed (WPM)"><input type="number" min="1" className="input" value={form.wpm} onChange={set('wpm')} /></Field>
          <Field label="Typing time (minutes)" required>
            <input type="number" min="1" className="input" value={form.durationMin} onChange={set('durationMin')} required />
          </Field>
          {shorthand && (
            <Field label="Auto-start after (minutes)" hint={`0 = only when the audio ends.${dictationMin ? ` Dictation ≈ ${dictationMin} min at ${form.wpm} WPM.` : ''}`}>
              <input type="number" min="0" className="input" value={form.listenMin} onChange={set('listenMin')} />
            </Field>
          )}
        </div>
      </Card>

      <Card title="Passage" icon={FileText} actions={<span className="badge">{words} words</span>}>
        <Field hint={shorthand ? 'Used for marking. Students only see it in their result after submitting.' : 'Shown to students to copy, and used for marking.'}>
          <textarea
            className={`input${hindi ? ' hindi' : ''}`} lang={hindi ? 'hi' : 'en'}
            rows={12} value={form.passage} onChange={set('passage')} required
            placeholder="Paste the exact passage. Leave a blank line between paragraphs."
          />
        </Field>
      </Card>

      {shorthand && (
        <div className="grid-2">
          <Card title="Dictation audio" icon={Headphones}>
            <div className="stack-sm">
              {existing?.audioUrl && !removeAudio && !audio && (
                <div className="row" style={{ flexWrap: 'nowrap' }}>
                  <audio controls src={existing.audioUrl} preload="none" style={{ width: '100%' }} />
                  <IconButton label="Remove audio" icon={Trash2} tone="danger" onClick={() => setRemoveAudio(true)} />
                </div>
              )}
              {audio && (
                <div className="row"><Music size={16} color="var(--brand)" /><strong>{audio.name}</strong><span className="spacer" /><IconButton label="Clear" icon={X} onClick={() => setAudio(null)} /></div>
              )}
              {removeAudio && !audio && <Alert tone="warning">Audio will be removed when you save.</Alert>}
              <label className="dropzone">
                <span className="dropzone__ph" style={{ width: 52, height: 52 }}><Upload size={22} /></span>
                <span><strong>{existing?.audioUrl || audio ? 'Replace audio' : 'Upload audio'}</strong><div className="small muted">MP3, M4A or WAV · up to 50 MB</div></span>
                <input type="file" accept="audio/*" onChange={(e) => { setAudio(e.target.files?.[0] || null); setRemoveAudio(false); }} />
              </label>
            </div>
          </Card>

          <Card title="Outline pages" icon={ImagePlus}>
            <div className="stack-sm">
              {keepOutline.length + newOutline.length > 0 && (
                <ul className="thumbs">
                  {keepOutline.map((u, i) => (
                    <li key={u}>
                      <a href={u} target="_blank" rel="noreferrer"><img src={u} alt={`Page ${i + 1}`} /></a>
                      <span className="thumbs__num">{i + 1}</span>
                      <IconButton label="Remove page" icon={X} tone="danger" onClick={() => setKeepOutline((k) => k.filter((x) => x !== u))} />
                    </li>
                  ))}
                  {newOutline.map((f, i) => (
                    <li key={`${f.name}-${i}`}>
                      <LocalImage file={f} />
                      <span className="thumbs__num">{keepOutline.length + i + 1} · new</span>
                      <IconButton label="Remove page" icon={X} tone="danger" onClick={() => setNewOutline((n) => n.filter((_, j) => j !== i))} />
                    </li>
                  ))}
                </ul>
              )}
              <label className="dropzone">
                <span className="dropzone__ph" style={{ width: 52, height: 52 }}><ImagePlus size={22} /></span>
                <span><strong>Add pages</strong><div className="small muted">Scanned images, in page order</div></span>
                <input type="file" accept="image/*" multiple onChange={(e) => { setNewOutline((n) => [...n, ...Array.from(e.target.files || [])]); e.target.value = ''; }} />
              </label>
            </div>
          </Card>
        </div>
      )}
    </form>
  );
}
