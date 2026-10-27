import { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { callAi } from '../lib/api.js';
import AiNotice from './AiNotice.jsx';
import Markdown from './Markdown.jsx';

const STARTERS = [
  'Explain this in simpler terms.',
  'Give me a practical example.',
  'How does this work in a real project?',
  'What should I learn next?',
];

const MAX_LENGTH = 1000;

export default function ChatPanel({ postId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const logRef = useRef(null);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  async function send(text, history = messages) {
    const content = text.trim();
    if (!content || loading) return;
    const next = [...history, { role: 'user', content }];
    setMessages(next);
    setInput('');
    setError(null);
    setLoading(true);
    try {
      const data = await callAi('chat', { postId, messages: next });
      setMessages([...next, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  function retry() {
    const history = messages.slice(0, -1);
    const last = messages[messages.length - 1];
    if (last?.role === 'user') send(last.content, history);
  }

  function onSubmit(e) {
    e.preventDefault();
    send(input);
  }

  return (
    <div className="ai-panel chat">
      <div className="chat-log" ref={logRef} aria-live="polite" aria-label="Conversation about this post">
        {messages.length === 0 && (
          <div className="chat-empty">
            <p className="muted">Ask anything about this post. The AI reads it first and tells you what the post says versus what it adds.</p>
            <div className="chip-row">
              {STARTERS.map((s) => (
                <button key={s} type="button" className="chip" onClick={() => send(s)} disabled={loading}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`bubble bubble-${m.role}`}>
            {m.role === 'assistant' ? <Markdown source={m.content} /> : <p>{m.content}</p>}
          </div>
        ))}
        {loading && (
          <div className="bubble bubble-assistant typing" role="status" aria-label="AI is typing">
            <span /><span /><span />
          </div>
        )}
        <AiNotice error={error} onRetry={retry} />
      </div>

      <form className="chat-form" onSubmit={onSubmit}>
        <label htmlFor="chat-input" className="sr-only">Ask a follow-up question</label>
        <textarea
          id="chat-input"
          rows={2}
          value={input}
          maxLength={MAX_LENGTH}
          placeholder="Ask a follow-up question"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
        />
        <button type="submit" className="btn btn-primary" disabled={loading || !input.trim()} aria-label="Send question">
          <Send size={16} aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
