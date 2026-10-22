import { useEffect, useId, useState } from 'react';
import { Eye, EyeOff, X, AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

export function Spinner({ size = 18 }) {
  return <span className="spinner" style={{ width: size, height: size }} aria-hidden="true" />;
}

export function Button({ variant = 'primary', size = 'md', loading, block, icon: Icon, children, className = '', ...rest }) {
  return (
    <button
      className={`btn btn-${variant} btn-${size} ${block ? 'btn-block' : ''} ${className}`}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {loading ? <Spinner size={16} /> : Icon ? <Icon size={16} /> : null}
      {children && <span>{children}</span>}
    </button>
  );
}

export function Field({ label, error, hint, children, action }) {
  return (
    <div className={`field ${error ? 'has-error' : ''}`}>
      {(label || action) && (
        <div className="field-head">
          {label && <label>{label}</label>}
          {action}
        </div>
      )}
      {children}
      {error ? <p className="field-error">{error}</p> : hint ? <p className="field-hint">{hint}</p> : null}
    </div>
  );
}

export function Input({ icon: Icon, className = '', ...rest }) {
  return (
    <div className="input-wrap">
      {Icon && <Icon size={17} className="input-icon" />}
      <input className={`input ${Icon ? 'with-icon' : ''} ${className}`} {...rest} />
    </div>
  );
}

export function PasswordInput({ icon: Icon, ...rest }) {
  const [show, setShow] = useState(false);
  return (
    <div className="input-wrap">
      {Icon && <Icon size={17} className="input-icon" />}
      <input className={`input with-trailing ${Icon ? 'with-icon' : ''}`} type={show ? 'text' : 'password'} {...rest} />
      <button
        type="button"
        className="input-trailing"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? 'Hide password' : 'Show password'}
        tabIndex={-1}
      >
        {show ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  );
}

const ALERT_ICONS = { error: AlertCircle, success: CheckCircle2, info: Info, warning: AlertTriangle };

export function Alert({ type = 'info', title, children, onClose }) {
  const Icon = ALERT_ICONS[type];
  return (
    <div className={`alert alert-${type}`} role={type === 'error' ? 'alert' : 'status'}>
      <Icon size={18} className="alert-icon" />
      <div className="alert-body">
        {title && <strong>{title}</strong>}
        {children && <div>{children}</div>}
      </div>
      {onClose && (
        <button className="icon-btn" onClick={onClose} aria-label="Dismiss">
          <X size={16} />
        </button>
      )}
    </div>
  );
}

export function Badge({ tone = 'neutral', children, dot }) {
  return (
    <span className={`badge badge-${tone}`}>
      {dot && <span className="badge-dot" />}
      {children}
    </span>
  );
}

export function Card({ title, description, actions, children, className = '', padded = true }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <header className="card-head">
          <div>
            {title && <h3>{title}</h3>}
            {description && <p>{description}</p>}
          </div>
          {actions && <div className="card-actions">{actions}</div>}
        </header>
      )}
      <div className={padded ? 'card-body' : ''}>{children}</div>
    </section>
  );
}

export function Modal({ open, onClose, title, description, children, footer, size = 'md', dismissible = true }) {
  const id = useId();
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && dismissible && onClose?.();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose, dismissible]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && dismissible && onClose?.()}>
      <div className={`modal modal-${size}`} role="dialog" aria-modal="true" aria-labelledby={id}>
        <header className="modal-head">
          <div>
            <h2 id={id}>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          {dismissible && (
            <button className="icon-btn" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          )}
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children }) {
  return (
    <div className="empty">
      {Icon && (
        <div className="empty-icon">
          <Icon size={22} />
        </div>
      )}
      <h4>{title}</h4>
      {children && <p>{children}</p>}
    </div>
  );
}

export function FullPageLoader() {
  return (
    <div className="full-loader">
      <Spinner size={28} />
    </div>
  );
}
