import { useId } from 'react';

/** Accessible label + input/textarea + hint + error. Pass `as="textarea"` for multi-line. */
export default function Field({ label, error, hint, as: Tag = 'input', children, ...props }) {
  const id = useId();
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`field${error ? ' has-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children ? (
        children({ id, describedBy })
      ) : (
        <Tag id={id} aria-invalid={error ? 'true' : undefined} aria-describedby={describedBy} {...props} />
      )}
      {hint && !error && <p id={`${id}-hint`} className="field-hint">{hint}</p>}
      {error && <p id={`${id}-error`} className="field-error" role="alert">{error}</p>}
    </div>
  );
}
