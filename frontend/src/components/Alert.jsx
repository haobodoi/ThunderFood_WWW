import { useContext, useEffect, useState } from 'react';
import Icon, { EnterpriseIcons } from './Icon.jsx';

const ICONS = { success: 'check', error: 'alert', warning: 'clock', info: 'alert' };

export default function Alert({ type = 'info', title, children }) {
  const enterprise = useContext(EnterpriseIcons);
  const [showToast, setShowToast] = useState(false);
  useEffect(() => {
    if (!enterprise || type !== 'error') return undefined;
    setShowToast(true);
    const timer = window.setTimeout(() => setShowToast(false), 6000);
    return () => window.clearTimeout(timer);
  }, [enterprise, type, children]);
  return (
    <>
    <div className={`alert alert--${type}`} role={type === 'error' ? 'alert' : 'status'}>
      <Icon name={ICONS[type]} size={18} className="alert__icon" />
      <div>
        {title && <strong className="alert__title">{title}</strong>}
        {children && <div className="alert__body">{children}</div>}
      </div>
    </div>
    {showToast && <div className="enterprise-toast enterprise-toast--error" role="status"><Icon name="alert" size={19} /><span>{title || 'Thao tác chưa hoàn tất'}</span><button type="button" onClick={() => setShowToast(false)} aria-label="Đóng thông báo"><Icon name="x" size={16} /></button></div>}
    </>
  );
}
