import { useEffect, useId, useRef } from 'react';
import Icon from './Icon.jsx';

export default function Modal({ title, children, footer, onClose }) {
  const titleId = useId();
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const panel = panelRef.current;
    panel?.querySelector('[autofocus], button:not(:disabled), input:not(:disabled)')?.focus();

    const handleKey = (event) => {
      if (event.key === 'Escape' && onCloseRef.current) {
        event.preventDefault();
        onCloseRef.current();
      }
      if (event.key !== 'Tab' || !panel) return;
      const focusable = [...panel.querySelectorAll(
        'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
      )].filter((element) => element.getClientRects().length);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, []);

  return (
    <div className="modal" role="presentation">
      <div className="modal__backdrop" onClick={onClose} />
      <div className="modal__panel" ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="modal__head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="icon-btn icon-btn--ghost" onClick={onClose}
            disabled={!onClose} aria-label="Đóng">
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__foot">{footer}</div>}
      </div>
    </div>
  );
}
