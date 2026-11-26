import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api';
import { CATEGORIES, isHindi } from '../../utils/format';
import { useApi } from '../../utils/hooks';

/** yyyy-mm-dd in the browser's local timezone (toISOString would shift to UTC). */
const toInputDate = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

const EMPTY = {
  category: 'SHORTHAND', title: '', wpm: '', testDate: toInputDate(new Date()),
  durationMin: 30, listenMin: 4, passage: '', published: true,
};

export default function TestForm() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
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
      navigate('/admin/tests');
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  if (loadError) return <p className="form-error">{loadError.message}</p>;
  if (!isNew && !existing) return <p className="muted">Loading…</p>;

  return (
    <form className="card form-grid" onSubmit={onSubmit}>
      <h2 className="page-title page-title--left form-grid__full">{isNew ? 'Add Test' : 'Edit Test'}</h2>

      <label className="field">
        <span>Section</span>
        <select className="input" value={form.category} onChange={set('category')}>
          {Object.entries(CATEGORIES).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}
        </select>
      </label>
      <label className="field">
        <span>Test date</span>
        <input type="date" className="input" value={form.testDate} onChange={set('testDate')} required />
      </label>
      <label className="field form-grid__full">
        <span>Title</span>
        <input className="input" placeholder="e.g. 1 – Negotiable Instruments Act" value={form.title} onChange={set('title')} required />
      </label>
      <label className="field">
        <span>Speed (WPM)</span>
        <input type="number" min="1" className="input" value={form.wpm} onChange={set('wpm')} />
      </label>
      <label className="field">
        <span>Transcription / typing duration (min)</span>
        <input type="number" min="1" className="input" value={form.durationMin} onChange={set('durationMin')} required />
      </label>
      {shorthand && (
        <label className="field">
          <span>Auto-start transcription after (min of listening)</span>
          <input type="number" min="0" className="input" value={form.listenMin} onChange={set('listenMin')} />
          <small className="muted">0 = only when the audio ends.{dictationMin && ` Dictation length at ${form.wpm} WPM ≈ ${dictationMin} min.`}</small>
        </label>
      )}
      <label className="check form-grid__full">
        <input type="checkbox" checked={form.published} onChange={set('published')} /> Published (visible to students)
      </label>

      <label className="field form-grid__full">
        <span>Passage ({words} words) — used for marking{shorthand ? '; hidden from students until they submit' : ' and shown to students to copy'}</span>
        <textarea
          className={`input textarea${isHindi(form.category) ? ' hindi' : ''}`}
          lang={isHindi(form.category) ? 'hi' : 'en'}
          rows={12} value={form.passage} onChange={set('passage')} required
          placeholder="Paste the exact passage. Leave a blank line between paragraphs."
        />
      </label>

      {shorthand && (
        <>
          <fieldset className="field form-grid__full">
            <legend>Dictation audio</legend>
            {existing?.audioUrl && !removeAudio && !audio && (
              <div className="row">
                <audio controls src={existing.audioUrl} preload="none" />
                <button type="button" className="btn btn--sm btn--danger" onClick={() => setRemoveAudio(true)}>Remove</button>
              </div>
            )}
            <input type="file" accept="audio/*" onChange={(e) => { setAudio(e.target.files?.[0] || null); setRemoveAudio(false); }} />
          </fieldset>

          <fieldset className="field form-grid__full">
            <legend>Outline pages (images, in order)</legend>
            {keepOutline.length > 0 && (
              <ul className="thumbs">
                {keepOutline.map((u, i) => (
                  <li key={u}>
                    <a href={u} target="_blank" rel="noreferrer"><img src={u} alt={`Page ${i + 1}`} /></a>
                    <button type="button" className="btn btn--sm btn--danger" onClick={() => setKeepOutline((k) => k.filter((x) => x !== u))}>Remove</button>
                  </li>
                ))}
              </ul>
            )}
            <input type="file" accept="image/*" multiple onChange={(e) => setNewOutline(Array.from(e.target.files || []))} />
            {newOutline.length > 0 && <small className="muted">{newOutline.length} new page(s) will be added after the existing ones.</small>}
          </fieldset>
        </>
      )}

      {error && <p className="form-error form-grid__full">{error}</p>}
      <div className="form-grid__full row row--end">
        <Link to="/admin/tests" className="btn btn--secondary">Cancel</Link>
        <button className="btn btn--primary" disabled={busy}>{busy ? 'Saving…' : 'Save Test'}</button>
      </div>
    </form>
  );
}
