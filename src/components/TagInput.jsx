import { useState } from 'react';
import { X } from 'lucide-react';
import { TAG_LIMIT, normalizeTag } from '../lib/utils.js';

export default function TagInput({ id, value, onChange }) {
  const [draft, setDraft] = useState('');

  function addTag(raw) {
    const tag = normalizeTag(raw);
    if (!tag || value.includes(tag) || value.length >= TAG_LIMIT) return;
    onChange([...value, tag]);
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(draft);
      setDraft('');
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className="tag-input">
      {value.map((tag) => (
        <span key={tag} className="tag">
          #{tag}
          <button type="button" aria-label={`Remove tag ${tag}`} onClick={() => onChange(value.filter((t) => t !== tag))}>
            <X size={12} />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => {
          addTag(draft);
          setDraft('');
        }}
        placeholder={value.length >= TAG_LIMIT ? 'Tag limit reached' : 'Add a tag and press Enter'}
        disabled={value.length >= TAG_LIMIT}
        maxLength={24}
      />
    </div>
  );
}
