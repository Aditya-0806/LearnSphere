import { useState } from 'react';
import { initials } from '../lib/utils.js';

const HUES = [236, 262, 198, 168, 24, 338, 142, 12];

function hueFor(text = '') {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  return HUES[hash % HUES.length];
}

export default function Avatar({ name, username, url, size = 36 }) {
  const [broken, setBroken] = useState(false);
  const label = name || username || '';
  const style = { width: size, height: size, fontSize: Math.round(size * 0.38) };

  if (url && !broken) {
    return <img className="avatar" style={style} src={url} alt="" onError={() => setBroken(true)} referrerPolicy="no-referrer" />;
  }
  const hue = hueFor(username || name);
  return (
    <span
      className="avatar avatar-initials"
      style={{ ...style, background: `hsl(${hue} 70% 94%)`, color: `hsl(${hue} 55% 30%)` }}
      aria-hidden="true"
    >
      {initials(label)}
    </span>
  );
}
