import { AlertTriangle, ArrowLeft, CheckCircle2, Info, Inbox, Loader2, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fullName } from '../utils/format';

export function PageHeader({ title, subtitle, actions, back }) {
  const navigate = useNavigate();
  return (
    <div className="page-header">
      <div>
        {back && (
          <button type="button" className="page-header__back no-print" onClick={() => (typeof back === 'string' ? navigate(back) : navigate(-1))}>
            <ArrowLeft size={14} /> Back
          </button>
        )}
        <h1 className="page-header__title">{title}</h1>
        {subtitle && <p className="page-header__sub">{subtitle}</p>}
      </div>
      {actions && <div className="row no-print">{actions}</div>}
    </div>
  );
}

export function Card({ title, icon: Icon, actions, children, footer, className = '', bodyClass = 'card__body', ...rest }) {
  return (
    <section className={`card ${className}`} {...rest}>
      {(title || actions) && (
        <header className="card__head">
          {Icon && <Icon size={18} color="var(--brand)" />}
          {title && <h2 className="card__title">{title}</h2>}
          <span className="spacer" />
          {actions}
        </header>
      )}
      {bodyClass ? <div className={bodyClass}>{children}</div> : children}
      {footer && <footer className="card__foot">{footer}</footer>}
    </section>
  );
}

export function StatCard({ icon: Icon, label, value, tone = '', as: As = 'div', ...rest }) {
  return (
    <As className="stat" {...rest}>
      <span className={`stat__icon ${tone ? `stat__icon--${tone}` : ''}`}><Icon size={22} /></span>
      <span>
        <div className="stat__value tabular">{value}</div>
        <div className="stat__label">{label}</div>
      </span>
    </As>
  );
}

const ALERT_ICONS = { error: XCircle, success: CheckCircle2, warning: AlertTriangle, info: Info };
export function Alert({ tone = 'info', children, className = '' }) {
  const Icon = ALERT_ICONS[tone];
  return (
    <div className={`alert alert--${tone} ${className}`} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon size={18} />
      <div>{children}</div>
    </div>
  );
}

export function Badge({ tone = '', icon: Icon, children, ...rest }) {
  const Tag = rest.onClick ? 'button' : 'span';
  return (
    <Tag type={rest.onClick ? 'button' : undefined} className={`badge ${tone ? `badge--${tone}` : ''}`} {...rest}>
      {Icon && <Icon size={12} />}
      {children}
    </Tag>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, text, action }) {
  return (
    <div className="empty">
      <div className="empty__icon"><Icon size={26} /></div>
      <div className="empty__title">{title}</div>
      {text && <p>{text}</p>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}

export function Skeleton({ height = 16, width = '100%', style }) {
  return <div className="skeleton" style={{ height, width, ...style }} />;
}

export function SkeletonList({ rows = 4, height = 72 }) {
  return (
    <div className="stack-sm" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => <Skeleton key={i} height={height} style={{ borderRadius: 14 }} />)}
    </div>
  );
}

export const Spinner = ({ size = 16 }) => <Loader2 size={size} className="spin" />;

export function Avatar({ person, size = 40 }) {
  const name = fullName(person) || 'Steno Drive';
  const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.38 }} title={name}>
      {person?.photoUrl ? <img src={person.photoUrl} alt="" /> : initials}
    </span>
  );
}

export function IconButton({ label, icon: Icon, tone, ...rest }) {
  return (
    <button type="button" className={`icon-btn ${tone ? `icon-btn--${tone}` : ''}`} aria-label={label} title={label} {...rest}>
      <Icon size={16} />
    </button>
  );
}

export function Field({ label, required, hint, children, className = '' }) {
  return (
    <label className={`field ${className}`}>
      {label && <span className="field__label">{label}{required && <span className="req">*</span>}</span>}
      {children}
      {hint && <span className="field__hint">{hint}</span>}
    </label>
  );
}
