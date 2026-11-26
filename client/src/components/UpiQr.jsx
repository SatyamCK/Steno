import { QRCodeSVG } from 'qrcode.react';

/** Scannable UPI QR built from the admin's settings. */
export default function UpiQr({ settings, size = 200 }) {
  const params = new URLSearchParams({ pa: settings.upiId, pn: settings.payeeName, cu: 'INR' });
  if (settings.feeAmount && /^\d+(\.\d+)?$/.test(settings.feeAmount)) params.set('am', settings.feeAmount);
  return (
    <div className="upi">
      <QRCodeSVG value={`upi://pay?${params}`} size={size} marginSize={2} className="upi__qr" />
      <div className="upi__id">UPI – {settings.upiId}</div>
    </div>
  );
}
