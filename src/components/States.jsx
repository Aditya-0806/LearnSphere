import { AlertTriangle, Loader2 } from 'lucide-react';

export function Loading({ label = 'Loading' }) {
  return (
    <div className="state" role="status">
      <Loader2 className="spin" size={22} aria-hidden="true" />
      <p>{label}…</p>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children }) {
  return (
    <div className="state empty">
      {Icon && <Icon size={28} aria-hidden="true" />}
      <h3>{title}</h3>
      {children && <div className="state-body">{children}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="state error" role="alert">
      <AlertTriangle size={26} aria-hidden="true" />
      <h3>Something went wrong</h3>
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="btn btn-secondary" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
