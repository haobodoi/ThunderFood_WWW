import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { formatVND } from './FoodCard.jsx';
import Alert from './Alert.jsx';

function CopyRow({ label, value, shown }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setFailed(false); setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch { setFailed(true); }
  };
  return <div className="tf-qr__row">
    <dt>{label}</dt>
    <dd>
      <strong>{shown ?? value}</strong>
      <button type="button" className="btn btn--ghost btn--sm" onClick={copy} aria-label={`Sao chép ${label.toLowerCase()}`}>{failed ? 'Hãy chép tay' : copied ? 'Đã chép' : 'Sao chép'}</button>
    </dd>
  </div>;
}

export default function VietQrPayment({ qr }) {
  return <section className="tf-qr" aria-labelledby="tf-qr-title">
    <h2 id="tf-qr-title">Quét mã để thanh toán</h2>
    <p>Mở ứng dụng ngân hàng, chọn quét QR và kiểm tra đúng số tiền trước khi chuyển.</p>
    <div className="tf-qr__layout">
      <div className="tf-qr__code">
        <QRCodeSVG value={qr.payload} size={232} level="M" marginSize={2} title={`Mã VietQR, số tiền ${formatVND(qr.amount)}`} />
      </div>
      <dl className="tf-qr__details">
        <div className="tf-qr__row"><dt>Ngân hàng</dt><dd><strong>{qr.bankName}</strong></dd></div>
        <CopyRow label="Số tài khoản" value={qr.accountNumber} />
        <div className="tf-qr__row"><dt>Chủ tài khoản</dt><dd><strong>{qr.accountHolder}</strong></dd></div>
        <CopyRow label="Số tiền" value={String(Math.round(Number(qr.amount)))} shown={formatVND(qr.amount)} />
        <CopyRow label="Nội dung" value={qr.content} />
      </dl>
    </div>
    <Alert type="warning">Giữ nguyên số tiền và nội dung để quán đối soát được. Đơn được xử lý sau khi quán xác nhận đã nhận tiền.</Alert>
  </section>;
}
