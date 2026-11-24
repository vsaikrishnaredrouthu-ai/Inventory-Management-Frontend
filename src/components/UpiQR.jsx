import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { money } from '../ui.jsx';

// Builds a standard UPI payment link and shows it as a QR code.
// Any UPI app (GPay, PhonePe, Paytm, BHIM) can scan it and fill in the amount.
// Configure the shop's UPI ID in the frontend .env file (VITE_UPI_ID, VITE_UPI_NAME).
const UPI_ID = import.meta.env.VITE_UPI_ID || '';
const UPI_NAME = import.meta.env.VITE_UPI_NAME || 'Inventory Shop';

export function upiLink({ amount, note }) {
  const params = new URLSearchParams({
    pa: UPI_ID,
    pn: UPI_NAME,
    am: Number(amount || 0).toFixed(2),
    cu: 'INR',
    tn: note || 'Sale payment',
  });
  return `upi://pay?${params.toString()}`;
}

export default function UpiQR({ amount, note }) {
  const [src, setSrc] = useState('');
  const [error, setError] = useState('');
  const amountNum = Number(amount || 0);

  useEffect(() => {
    if (!UPI_ID) { setError('Set VITE_UPI_ID in the frontend .env file to show the QR code.'); return; }
    if (!(amountNum > 0)) { setSrc(''); return; }
    let cancelled = false;
    QRCode.toDataURL(upiLink({ amount: amountNum, note }), { width: 220, margin: 1 })
      .then((url) => { if (!cancelled) { setSrc(url); setError(''); } })
      .catch(() => { if (!cancelled) setError('Could not create the QR code.'); });
    return () => { cancelled = true; };
  }, [amountNum, note]);

  return (
    <div className="upi-qr">
      {error && <p className="field-error">{error}</p>}
      {!error && !src && <p className="muted">Enter the amount to show the QR code.</p>}
      {src && (
        <>
          <img src={src} alt={`UPI QR code for ${money(amountNum)}`} width="220" height="220" />
          <p><strong>Pay {money(amountNum)}</strong> to {UPI_NAME}</p>
          <p className="muted">Scan with any UPI app. Check the payment arrived in your bank app before you complete the sale.</p>
        </>
      )}
    </div>
  );
}
