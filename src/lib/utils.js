export const TAG_LIMIT = 6;
export const SUGGESTED_TAGS = ['javascript', 'python', 'react', 'ai', 'web', 'devops', 'data', 'career', 'workshop', 'design'];

export const SECTION_FIELDS = [
  { key: 'context', label: 'Problem / context', placeholder: 'What were you trying to do, and what was getting in the way?' },
  { key: 'learned', label: 'What I learned', placeholder: 'The main thing you now understand that you did not before.' },
  { key: 'explanation', label: 'Explanation', placeholder: 'Explain how it works in your own words. Markdown is supported.' },
  { key: 'examples', label: 'Examples', placeholder: 'A code snippet, a command, or a real situation where this applies.' },
  { key: 'takeaways', label: 'Key takeaways', placeholder: 'Two or three bullet points someone should remember.' },
];

export function emptySections() {
  return Object.fromEntries(SECTION_FIELDS.map((f) => [f.key, '']));
}

/** Turns the structured fields into one Markdown document (what readers and the AI see). */
export function composeStructured(sections) {
  return SECTION_FIELDS.filter((f) => sections?.[f.key]?.trim())
    .map((f) => `## ${f.label}\n\n${sections[f.key].trim()}`)
    .join('\n\n');
}

export function stripMarkdown(md = '') {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}(#{1,6}|>|[-*]|\d+[.)])\s+/gm, '')
    .replace(/[*_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function excerpt(md, max = 190) {
  const text = stripMarkdown(md);
  return text.length <= max ? text : `${text.slice(0, max).replace(/\s+\S*$/, '')}…`;
}

export function readingTime(md) {
  const words = stripMarkdown(md).split(' ').filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function normalizeTag(tag) {
  return tag
    .toLowerCase()
    .trim()
    .replace(/^#/, '')
    .replace(/[^a-z0-9+#.\- ]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 24);
}

export function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Turns Supabase / network errors into messages a person can act on. */
export function friendlyError(error, fallback = 'Something went wrong. Please try again.') {
  const msg = String(error?.message || '');
  if (!msg) return fallback;
  if (/invalid login credentials/i.test(msg)) return 'Email or password is incorrect.';
  if (/email not confirmed/i.test(msg)) return 'Please verify your email first. Check your inbox for the confirmation link.';
  if (/already registered|already been registered/i.test(msg)) return 'An account with this email already exists. Try logging in.';
  if (/rate limit|too many/i.test(msg)) return 'Too many attempts. Please wait a minute and try again.';
  if (/password should be at least/i.test(msg)) return 'Your password is too short. Use at least 8 characters.';
  if (/failed to fetch|networkerror|load failed/i.test(msg)) return 'Network problem. Check your connection and try again.';
  if (/duplicate key|unique/i.test(msg) && /username/i.test(msg)) return 'That username is taken. Try another one.';
  if (/row-level security|permission denied/i.test(msg)) return 'You do not have permission to do that.';
  return msg || fallback;
}
