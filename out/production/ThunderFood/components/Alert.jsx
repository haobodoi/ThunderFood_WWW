import Icon from './Icon.jsx';

const ICONS = { success: 'check', error: 'alert', warning: 'clock', info: 'alert' };

export default function Alert({ type = 'info', title, children }) {
  return (
    <div className={`alert alert--${type}`} role={type === 'error' ? 'alert' : 'status'}>
      <Icon name={ICONS[type]} size={18} className="alert__icon" />
      <div>
        {title && <strong className="alert__title">{title}</strong>}
        {children && <div className="alert__body">{children}</div>}
      </div>
    </div>
  );
}
