import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';

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

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!photo) return undefined;
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onPhoto = (e) => {
    const file = e.target.files?.[0];
    setError('');
    if (file && file.size > 5 * 1024 * 1024) {
      setError('Photo must be smaller than 5 MB.');
      e.target.value = '';
      return;
    }
    setPhoto(file || null);
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
    }
  };

  return (
    <div className="card card--narrow">
      <h2 className="page-title">New Student</h2>
      <form className="reg-form" onSubmit={onSubmit}>
        <label className="reg-form__label" htmlFor="firstName">Student Name <span>:</span></label>
        <div className="reg-form__fields reg-form__fields--3">
          <input id="firstName" className="input" placeholder="First Name *" value={form.firstName} onChange={set('firstName')} required />
          <input className="input" placeholder="Middle Name" value={form.middleName} onChange={set('middleName')} />
          <input className="input" placeholder="Last Name" value={form.lastName} onChange={set('lastName')} />
        </div>

        <label className="reg-form__label" htmlFor="fatherFirstName">Father’s Name <span>:</span></label>
        <div className="reg-form__fields reg-form__fields--3">
          <input id="fatherFirstName" className="input" placeholder="First Name *" value={form.fatherFirstName} onChange={set('fatherFirstName')} required />
          <input className="input" placeholder="Middle Name" value={form.fatherMiddleName} onChange={set('fatherMiddleName')} />
          <input className="input" placeholder="Last Name" value={form.fatherLastName} onChange={set('fatherLastName')} />
        </div>

        <label className="reg-form__label" htmlFor="state">Address <span>:</span></label>
        <div className="reg-form__fields reg-form__fields--2">
          <select id="state" className="input" value={form.state} onChange={set('state')} required>
            <option value="">State *</option>
            {STATES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <input className="input" placeholder="City *" value={form.city} onChange={set('city')} required />
        </div>

        <label className="reg-form__label" htmlFor="mobile">Mobile No. <span>:</span></label>
        <div className="reg-form__fields">
          <input
            id="mobile" className="input" placeholder="xxxxxxxxxx" inputMode="numeric" maxLength={10}
            pattern="[6-9][0-9]{9}" title="10-digit mobile number"
            value={form.mobile} onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value.replace(/\D/g, '') }))} required
          />
        </div>

        <label className="reg-form__label" htmlFor="email">Email Id <span>:</span></label>
        <div className="reg-form__fields">
          <input id="email" type="email" className="input" placeholder="xyz@gmail.com" value={form.email} onChange={set('email')} required />
        </div>

        <label className="reg-form__label" htmlFor="photo">Upload Image <span>:</span></label>
        <div className="reg-form__fields reg-form__photo">
          <input id="photo" type="file" accept="image/*" onChange={onPhoto} />
          {preview && <img src={preview} alt="Preview" className="reg-form__preview" />}
        </div>

        {error && <p className="form-error reg-form__full" role="alert">{error}</p>}
        <div className="reg-form__full center">
          <button className="btn btn--primary" disabled={busy}>{busy ? 'Registering…' : 'Register'}</button>
        </div>
      </form>
      <p className="center muted">Already registered? <Link to="/">Login</Link></p>
    </div>
  );
}
