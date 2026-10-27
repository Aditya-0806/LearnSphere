import { AlertTriangle, Settings } from 'lucide-react';

const SETUP_CODES = ['ai_not_configured', 'db_not_configured', 'ai_auth_error'];

/** Shows an AI error. Setup problems get a clear "configure this" message. */
export default function AiNotice({ error, onRetry }) {
  if (!error) return null;
  const isSetup = SETUP_CODES.includes(error.code);
  const Icon = isSetup ? Settings : AlertTriangle;
  return (
    <div className={`notice ${isSetup ? 'notice-warn' : 'notice-error'}`} role="alert">
      <Icon size={18} aria-hidden="true" />
      <div>
        <p>{error.message}</p>
        {isSetup && <p className="muted">This is a setup issue on the server, not something you did wrong.</p>}
        {onRetry && !isSetup && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>Try again</button>
        )}
      </div>
    </div>
  );
}
