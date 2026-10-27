import { useState } from 'react';
import { Copy, Network } from 'lucide-react';
import { callAi } from '../lib/api.js';
import { useToast } from '../hooks/useToast.jsx';
import AiNotice from './AiNotice.jsx';
import MermaidDiagram from './MermaidDiagram.jsx';

export default function DiagramPanel({ postId }) {
  const toast = useToast();
  const [diagram, setDiagram] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [renderFailed, setRenderFailed] = useState(false);
  const [showSource, setShowSource] = useState(false);

  async function generate() {
    setError(null);
    setRenderFailed(false);
    setLoading(true);
    try {
      const data = await callAi('diagram', { postId });
      setDiagram({ title: data.title, code: data.mermaid, steps: data.steps });
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(diagram.code);
      toast.success('Diagram code copied.');
    } catch {
      toast.error('Could not copy. Select the code and copy it manually.');
    }
  }

  return (
    <div className="ai-panel">
      {!diagram && (
        <>
          <p className="muted">Turn this post into a flowchart, sequence or architecture diagram.</p>
          <button type="button" className="btn btn-primary" onClick={generate} disabled={loading}>
            <Network size={16} aria-hidden="true" /> {loading ? 'Generating…' : 'Generate Diagram'}
          </button>
        </>
      )}
      {loading && <div className="skeleton" aria-hidden="true"><span /><span /><span /></div>}
      <AiNotice error={error} onRetry={generate} />

      {diagram && !loading && (
        <div className="ai-result">
          <h4 className="diagram-title">{diagram.title}</h4>

          {!renderFailed ? (
            <MermaidDiagram code={diagram.code} onFail={() => setRenderFailed(true)} />
          ) : (
            <div className="notice notice-warn" role="status">
              <div>
                <p>The diagram could not be drawn, so here is the same idea as text.</p>
                {diagram.steps.length > 0 ? (
                  <ol className="fallback-steps">
                    {diagram.steps.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ol>
                ) : (
                  <p className="muted">Try generating it again.</p>
                )}
              </div>
            </div>
          )}

          <div className="ai-result-foot">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowSource((v) => !v)} aria-expanded={showSource}>
              {showSource ? 'Hide' : 'View'} Mermaid code
            </button>
            <div className="row">
              <button type="button" className="btn btn-ghost btn-sm" onClick={copyCode}>
                <Copy size={14} aria-hidden="true" /> Copy
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={generate}>Regenerate</button>
            </div>
          </div>
          {showSource && (
            <pre className="code-source" tabIndex={0}>
              <code>{diagram.code}</code>
            </pre>
          )}
          <p className="muted small">AI-generated from the post. It may miss details.</p>
        </div>
      )}
    </div>
  );
}
