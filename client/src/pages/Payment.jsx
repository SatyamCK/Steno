import { KeyRound, LogIn, MessageCircle, QrCode, Send } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import UpiQr from '../components/UpiQr';
import { Alert, PageHeader, SkeletonList } from '../components/ui';
import { useApi, usePageTitle } from '../utils/hooks';

export default function Payment() {
  usePageTitle('Payment');
  const { state } = useLocation();
  const { data: s, error } = useApi('/settings/public');

  const waText = encodeURIComponent(
    `Hello, I have registered on Steno Drive.\nName: ${state?.name || ''}\nMobile: ${state?.mobile || ''}\nI have paid the fee of ₹${s?.feeAmount || ''}. Payment screenshot attached.`,
  );
  const waNumber = (s?.contactMobile || '').replace(/\D/g, '');

  return (
    <>
      <PageHeader title="Complete your payment" subtitle="Three quick steps to activate your Steno Drive account." />
      {state?.name && (
        <Alert tone="success">
          Thank you, <strong>{state.name}</strong>. Your registration has been received.
        </Alert>
      )}
      {error && <Alert tone="error">{error.message}</Alert>}
      {!s && !error && <SkeletonList rows={1} height={320} />}
      {s && (
        <div className="steps" style={{ marginTop: 20 }}>
          <div className="step">
            <span className="step__num">1</span>
            <div className="step__title"><QrCode size={16} style={{ verticalAlign: -3 }} /> Pay the fee</div>
            <div className="amount">₹{s.feeAmount}</div>
            <UpiQr settings={s} size={160} />
          </div>
          <div className="step">
            <span className="step__num">2</span>
            <div className="step__title"><Send size={16} style={{ verticalAlign: -3 }} /> Send details</div>
            <p>Send your registration details and the payment screenshot on <strong>{s.contactMobile}</strong>.</p>
            {waNumber.length >= 10 && (
              <a className="btn btn--success" href={`https://wa.me/91${waNumber.slice(-10)}?text=${waText}`} target="_blank" rel="noreferrer">
                <MessageCircle size={17} /> Send on WhatsApp
              </a>
            )}
          </div>
          <div className="step">
            <span className="step__num">3</span>
            <div className="step__title"><KeyRound size={16} style={{ verticalAlign: -3 }} /> Get your login</div>
            <p>Within <strong>24 hours</strong> you will receive your <strong>Username</strong> and <strong>Password</strong>. Use them to log in and start practising.</p>
            <Link className="btn btn--primary" to="/"><LogIn size={17} /> Go to Login</Link>
          </div>
        </div>
      )}
    </>
  );
}
