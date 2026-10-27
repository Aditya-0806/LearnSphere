import { useState } from 'react';
import { MessageCircle, Network, Sparkles } from 'lucide-react';
import AiExplain from './AiExplain.jsx';
import ChatPanel from './ChatPanel.jsx';
import DiagramPanel from './DiagramPanel.jsx';

const TABS = [
  { id: 'explain', label: 'Explain', icon: Sparkles },
  { id: 'diagram', label: 'Diagram', icon: Network },
  { id: 'chat', label: 'Ask', icon: MessageCircle },
];

export default function AiTools({ postId }) {
  const [tab, setTab] = useState('explain');

  function onKeyDown(e) {
    const index = TABS.findIndex((t) => t.id === tab);
    if (e.key === 'ArrowRight') setTab(TABS[(index + 1) % TABS.length].id);
    if (e.key === 'ArrowLeft') setTab(TABS[(index - 1 + TABS.length) % TABS.length].id);
  }

  return (
    <section className="ai-tools" aria-labelledby="ai-tools-title">
      <h2 id="ai-tools-title" className="ai-tools-title">Understand this post</h2>
      <div className="tabs" role="tablist" aria-label="AI tools" onKeyDown={onKeyDown}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`panel-${id}`}
            tabIndex={tab === id ? 0 : -1}
            className={tab === id ? 'active' : ''}
            onClick={() => setTab(id)}
          >
            <Icon size={16} aria-hidden="true" /> {label}
          </button>
        ))}
      </div>
      {/* Panels stay mounted so results and chat history survive tab switches. */}
      <div role="tabpanel" id="panel-explain" aria-labelledby="tab-explain" hidden={tab !== 'explain'}><AiExplain postId={postId} /></div>
      <div role="tabpanel" id="panel-diagram" aria-labelledby="tab-diagram" hidden={tab !== 'diagram'}><DiagramPanel postId={postId} /></div>
      <div role="tabpanel" id="panel-chat" aria-labelledby="tab-chat" hidden={tab !== 'chat'}><ChatPanel postId={postId} /></div>
    </section>
  );
}
