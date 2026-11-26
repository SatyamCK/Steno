import { Link, useLocation } from 'react-router-dom';
import UpiQr from '../components/UpiQr';
import { useApi } from '../utils/hooks';

export default function Payment() {
  const { state } = useLocation();
  const { data: settings, error } = useApi('/settings/public');

  return (
    <div className="card card--narrow center">
      <h2 className="page-title">Payment Page</h2>
      {state?.name && (
        <p className="notice notice--ok">
          Thank you, <strong>{state.name}</strong>. Your registration has been received.
        </p>
      )}
      {error && <p className="form-error">{error.message}</p>}
      {settings && (
        <>
          <p className="muted">Fee : ₹{settings.feeAmount}</p>
          <UpiQr settings={settings} />
          <div className="payment__info">
            <p>
              Registration Detail and Payment Detail send on{' '}
              <a href={`https://wa.me/91${settings.contactMobile}`} target="_blank" rel="noreferrer">
                {settings.contactMobile}
              </a>
            </p>
            <p>
              Within 24 hrs you will get <span className="accent">Username</span> and{' '}
              <span className="accent">Password</span>
            </p>
          </div>
        </>
      )}
      <Link className="btn btn--secondary" to="/">Back to Login</Link>
    </div>
  );
}
