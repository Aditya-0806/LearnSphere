import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { callAi } from '../lib/api.js';
import AiNotice from './AiNotice.jsx';
import Markdown from './Markdown.jsx';

const LEVELS = [
  { id: 'beginner', label: 'Beginner', hint: 'Plain language and analogies' },
  { id: 'intermediate', label: 'Intermediate', hint: 'How and why it works' },
  { id: 'advanced', label: 'Advanced', hint: 'Trade-offs and edge cases' },
];

export default function AiExplain({ postId }) {
  const [level, setLevel] = useState('beginner');
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function explain(target = level) {
    setError(null);
    setLoading(true);
    try {
      const data = await callAi('explain', { postId, level: target });
      setResults((prev) => ({ ...prev, [target]: data.explanation }));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  const current = results[level];

  return (
    <div className="ai-panel">
      <fieldset className="level-picker">
        <legend>Explain this post for a…</legend>
        <div className="segmented" role="radiogroup">
          {LEVELS.map((l) => (
            <label key={l.id} className={level === l.id ? 'selected' : ''}>
              <input
                type="radio"
                name="level"
                value={l.id}
                checked={level === l.id}
                onChange={() => {
                  setLevel(l.id);
                  setError(null);
                }}
              />
              {l.label}
            </label>
          ))}
        </div>
        <p className="muted small">{LEVELS.find((l) => l.id === level).hint}</p>
      </fieldset>

      {!current && (
        <button type="button" className="btn btn-primary" onClick={() => explain()} disabled={loading}>
          <Sparkles size={16} aria-hidden="true" /> {loading ? 'Explaining…' : 'AI Explain'}
        </button>
      )}

      {loading && <div className="skeleton" aria-hidden="true"><span /><span /><span /></div>}
      <AiNotice error={error} onRetry={() => explain()} />

      {current && !loading && (
        <div className="ai-result">
          <Markdown source={current} />
          <div className="ai-result-foot">
            <span className="muted small">AI-generated. Check it against the original post.</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => explain()}>Regenerate</button>
          </div>
        </div>
      )}
    </div>
  );
}
