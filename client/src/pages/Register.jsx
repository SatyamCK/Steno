import { Camera, ImagePlus, Mail, MapPin, Phone, User, UserPlus, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Alert, Card, Field, PageHeader, Spinner } from '../components/ui';
import { usePageTitle } from '../utils/hooks';

const STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh',
  'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra',
  'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim',
  'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

const EMPTY = {
  firstName: '', middleName: '', lastName: '',
  fatherFirstName: '', fatherMiddleName: '', fatherLastName: '',
  state: '', city: '', mobile: '', email: '',
};

function Section({ icon: Icon, title, desc, children }) {
  return (
    <div className="form-section">
      <div className="form-section__title">
        <Icon size={18} />
        <div>{title}<div className="form-section__desc">{desc}</div></div>
      </div>
      <div>{children}</div>
    </div>
  );
}

export default function Register() {
  usePageTitle('Student Registration');
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!photo) return undefined;
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const pickPhoto = (file) => {
    setError('');
    if (!file) return;
    if (!file.type.startsWith('image/')) return setError('Please choose an image file (JPG or PNG).');
    if (file.size > 5 * 1024 * 1024) return setError('Photo must be smaller than 5 MB.');
    setPhoto(file);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!photo) return setError('Please upload your photo.');
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v.trim()));
    fd.append('photo', photo);
    setBusy(true);
    try {
      const res = await api('/register', { method: 'POST', form: fd });
      navigate('/payment', { replace: true, state: { name: res.name, mobile: form.mobile } });
    } catch (err) {
      setError(err.message);
      setBusy(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <>
      <PageHeader
        title="New Student Registration"
        subtitle="Fill in your details. After payment you will receive your username and password within 24 hours."
      />
      {error && <Alert tone="error" className="mb">{error}</Alert>}
      <form onSubmit={onSubmit} style={{ marginTop: error ? 16 : 0 }}>
        <Card bodyClass={null} footer={(
          <div className="row">
            <span className="small muted">Already registered? <Link to="/">Login here</Link></span>
            <span className="spacer" />
            <button className="btn btn--accent btn--lg" disabled={busy}>
              {busy ? <Spinner /> : <UserPlus size={18} />} {busy ? 'Submitting…' : 'Register'}
            </button>
          </div>
        )}
        >
          <Section icon={User} title="Student Name" desc="As it should appear on your results.">
            <div className="form-grid form-grid--3">
              <Field label="First name" required><input className="input" value={form.firstName} onChange={set('firstName')} required autoFocus /></Field>
              <Field label="Middle name"><input className="input" value={form.middleName} onChange={set('middleName')} /></Field>
              <Field label="Last name"><input className="input" value={form.lastName} onChange={set('lastName')} /></Field>
            </div>
          </Section>

          <Section icon={Users} title="Father’s Name" desc="Used for verification.">
            <div className="form-grid form-grid--3">
              <Field label="First name" required><input className="input" value={form.fatherFirstName} onChange={set('fatherFirstName')} required /></Field>
              <Field label="Middle name"><input className="input" value={form.fatherMiddleName} onChange={set('fatherMiddleName')} /></Field>
              <Field label="Last name"><input className="input" value={form.fatherLastName} onChange={set('fatherLastName')} /></Field>
            </div>
          </Section>

          <Section icon={MapPin} title="Address" desc="Your current state and city.">
            <div className="form-grid">
              <Field label="State" required>
                <select className="input" value={form.state} onChange={set('state')} required>
                  <option value="">Select state</option>
                  {STATES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="City" required><input className="input" value={form.city} onChange={set('city')} required /></Field>
            </div>
          </Section>

          <Section icon={Phone} title="Contact" desc="Your login details will be sent here.">
            <div className="form-grid">
              <Field label="Mobile number" required hint="10-digit number, without +91">
                <div className="input-icon">
                  <Phone size={16} />
                  <input
                    className="input" inputMode="numeric" maxLength={10} pattern="[6-9][0-9]{9}" title="10-digit mobile number"
                    placeholder="98xxxxxxxx" value={form.mobile}
                    onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value.replace(/\D/g, '') }))} required
                  />
                </div>
              </Field>
              <Field label="Email address" required>
                <div className="input-icon">
                  <Mail size={16} />
                  <input type="email" className="input" placeholder="name@example.com" value={form.email} onChange={set('email')} required />
                </div>
              </Field>
            </div>
          </Section>

          <Section icon={Camera} title="Photo" desc="A clear, recent passport-style photo.">
            <label
              className={`dropzone${dragOver ? ' is-over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); pickPhoto(e.dataTransfer.files?.[0]); }}
            >
              {preview ? <img src={preview} alt="Your photo" className="dropzone__preview" /> : <span className="dropzone__ph"><ImagePlus size={28} /></span>}
              <span>
                <strong>{photo ? photo.name : 'Upload your photo'}</strong>
                <div className="small muted">{photo ? 'Click to change' : 'Click to browse or drag & drop · JPG/PNG, up to 5 MB'}</div>
              </span>
              <input type="file" accept="image/*" onChange={(e) => pickPhoto(e.target.files?.[0])} />
            </label>
          </Section>
        </Card>
      </form>
    </>
  );
}
