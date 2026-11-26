import { Copy } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useToast } from './feedback';

/** Scannable UPI QR built from the admin's settings. */
export default function UpiQr({ settings, size = 180 }) {
  const toast = useToast();
  const params = new URLSearchParams({ pa: settings.upiId, pn: settings.payeeName, cu: 'INR' });
  if (/^\d+(\.\d+)?$/.test(settings.feeAmount || '')) params.set('am', settings.feeAmount);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(settings.upiId);
      toast('UPI ID copied');
    } catch {
      toast('Could not copy — please select it manually', 'error');
    }
  };

  return (
    <div className="upi">
      <QRCodeSVG value={`upi://pay?${params}`} size={size} marginSize={1} className="upi__qr" />
      <div className="upi__id">
        {settings.upiId}
        <button type="button" className="icon-btn" onClick={copy} aria-label="Copy UPI ID" title="Copy UPI ID"><Copy size={15} /></button>
      </div>
      <span className="small muted">Scan with any UPI app</span>
    </div>
  );
}
