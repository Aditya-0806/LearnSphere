import { useEffect, useId, useState } from 'react';
import { Loader2 } from 'lucide-react';

let mermaidPromise;

// Mermaid is large, so it is only downloaded the first time a diagram is shown.
function loadMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((mod) => {
      const mermaid = mod.default;
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict', // sanitizes labels and disables click handlers
        theme: 'base',
        fontFamily: 'Bricolage Grotesque, system-ui, sans-serif',
        themeVariables: {
          primaryColor: '#e9eaff',
          primaryBorderColor: '#3a3fd8',
          primaryTextColor: '#1b2240',
          lineColor: '#737a96',
          secondaryColor: '#f4f5fa',
          tertiaryColor: '#ffffff',
        },
      });
      return mermaid;
    });
  }
  return mermaidPromise;
}

/**
 * Renders Mermaid code to SVG. If parsing or rendering fails, `onFail` is called
 * so the parent can show a readable text fallback instead.
 */
export default function MermaidDiagram({ code, onFail }) {
  const reactId = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [svg, setSvg] = useState('');

  useEffect(() => {
    let cancelled = false;
    setSvg('');
    (async () => {
      const renderId = `mmd${reactId}${Math.random().toString(36).slice(2, 7)}`;
      try {
        const mermaid = await loadMermaid();
        await mermaid.parse(code);
        const result = await mermaid.render(renderId, code);
        if (!cancelled) setSvg(result.svg);
      } catch {
        document.getElementById(`d${renderId}`)?.remove(); // Mermaid can leave an error node behind
        if (!cancelled) onFail?.();
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, reactId]);

  if (!svg) {
    return (
      <div className="state compact" role="status">
        <Loader2 className="spin" size={18} aria-hidden="true" />
        <p>Drawing diagram…</p>
      </div>
    );
  }
  // Safe: Mermaid runs DOMPurify on its output when securityLevel is "strict".
  return <div className="diagram" role="img" aria-label="Generated diagram" dangerouslySetInnerHTML={{ __html: svg }} />;
}
