import { AlertTriangle, CheckCircle2, HelpCircle, X, XCircle } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

/* ---------------- Toasts ---------------- */

const ToastCtx = createContext(() => {});
let nextId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const toast = useCallback(
    (message, tone = 'success') => {
      const id = nextId++;
      setToasts((t) => [...t, { id, message, tone }]);
      setTimeout(() => dismiss(id), tone === 'error' ? 6000 : 3500);
    },
    [dismiss],
  );

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.tone}`}>
            {t.tone === 'error' ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
            <span>{t.message}</span>
            <button type="button" className="toast__close" onClick={() => dismiss(t.id)} aria-label="Dismiss"><X size={16} /></button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);

/* ---------------- Confirm dialog (promise based) ---------------- */

const ConfirmCtx = createContext(async () => false);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const resolver = useRef(null);

  const confirm = useCallback(
    (opts) =>
      new Promise((resolve) => {
        resolver.current = resolve;
        setState(typeof opts === 'string' ? { title: opts } : opts);
      }),
    [],
  );

  const close = (value) => {
    resolver.current?.(value);
    resolver.current = null;
    setState(null);
  };

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      {state && <ConfirmDialog {...state} onClose={close} />}
    </ConfirmCtx.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmCtx);

function ConfirmDialog({ title, text, confirmLabel = 'Confirm', cancelLabel = 'Cancel', tone = 'primary', onClose }) {
  const okRef = useRef(null);
  useEffect(() => {
    okRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const Icon = tone === 'danger' ? AlertTriangle : HelpCircle;

  return (
    <div className="modal" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" onMouseDown={(e) => e.target === e.currentTarget && onClose(false)}>
      <div className="modal__box">
        <div className="modal__head">
          <span className={`modal__icon ${tone === 'danger' ? 'modal__icon--danger' : ''}`}><Icon size={20} /></span>
          <div>
            <h2 id="confirm-title" className="modal__title">{title}</h2>
            {text && <p className="modal__text">{text}</p>}
          </div>
        </div>
        <div className="modal__foot">
          <button type="button" className="btn" onClick={() => onClose(false)}>{cancelLabel}</button>
          <button ref={okRef} type="button" className={`btn ${tone === 'danger' ? 'btn--danger' : 'btn--primary'}`} onClick={() => onClose(true)}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Generic modal shell for custom dialogs. */
export function Modal({ title, text, icon: Icon, tone, onClose, children, footer, as: As = 'div', ...rest }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <As className="modal__box" {...rest}>
        <div className="modal__head">
          {Icon && <span className={`modal__icon ${tone ? `modal__icon--${tone}` : ''}`}><Icon size={20} /></span>}
          <div>
            <h2 className="modal__title">{title}</h2>
            {text && <p className="modal__text">{text}</p>}
          </div>
        </div>
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__foot">{footer}</div>}
      </As>
    </div>
  );
}
