// A small, dependency-free Markdown renderer. It builds React elements (never raw HTML),
// so user and AI content cannot inject scripts. Supports headings, paragraphs, lists,
// blockquotes, fenced code, inline code, bold, italic and http(s) links.

const INLINE_RE = /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(\*[^*\n]+\*)|(\[[^\]\n]+\]\(https?:\/\/[^\s)]+\))/g;

function renderInline(text, keyPrefix) {
  const out = [];
  let last = 0;
  let index = 0;
  let match;
  INLINE_RE.lastIndex = 0;
  while ((match = INLINE_RE.exec(text))) {
    if (match.index > last) out.push(text.slice(last, match.index));
    const token = match[0];
    const key = `${keyPrefix}-${index++}`;
    if (token.startsWith('`')) out.push(<code key={key}>{token.slice(1, -1)}</code>);
    else if (token.startsWith('**')) out.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    else if (token.startsWith('*')) out.push(<em key={key}>{token.slice(1, -1)}</em>);
    else {
      const link = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/.exec(token);
      out.push(
        <a key={key} href={link[2]} target="_blank" rel="noopener noreferrer nofollow">
          {link[1]}
        </a>
      );
    }
    last = match.index + token.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const isBullet = (line) => /^\s*[-*]\s+/.test(line);
const isNumbered = (line) => /^\s*\d+[.)]\s+/.test(line);
const isHeading = (line) => /^#{1,3}\s+/.test(line);
const isFence = (line) => /^```/.test(line);
const isQuote = (line) => /^>\s?/.test(line);

export default function Markdown({ source = '', className = '' }) {
  const lines = String(source).replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const key = `b${blocks.length}`;

    if (!line.trim()) {
      i += 1;
    } else if (isFence(line)) {
      const code = [];
      i += 1;
      while (i < lines.length && !isFence(lines[i])) code.push(lines[i++]);
      i += 1;
      blocks.push(
        <pre key={key} tabIndex={0}>
          <code>{code.join('\n')}</code>
        </pre>
      );
    } else if (isHeading(line)) {
      const [, hashes, text] = /^(#{1,3})\s+(.*)$/.exec(line);
      const Tag = hashes.length >= 3 ? 'h4' : 'h3';
      blocks.push(<Tag key={key}>{renderInline(text, key)}</Tag>);
      i += 1;
    } else if (isBullet(line) || isNumbered(line)) {
      const ordered = isNumbered(line);
      const test = ordered ? isNumbered : isBullet;
      const items = [];
      while (i < lines.length && test(lines[i])) {
        items.push(lines[i].replace(ordered ? /^\s*\d+[.)]\s+/ : /^\s*[-*]\s+/, ''));
        i += 1;
      }
      const List = ordered ? 'ol' : 'ul';
      blocks.push(
        <List key={key}>
          {items.map((item, n) => (
            <li key={n}>{renderInline(item, `${key}-${n}`)}</li>
          ))}
        </List>
      );
    } else if (isQuote(line)) {
      const quote = [];
      while (i < lines.length && isQuote(lines[i])) quote.push(lines[i++].replace(/^>\s?/, ''));
      blocks.push(<blockquote key={key}>{renderInline(quote.join(' '), key)}</blockquote>);
    } else {
      const para = [];
      while (
        i < lines.length &&
        lines[i].trim() &&
        !isFence(lines[i]) &&
        !isHeading(lines[i]) &&
        !isBullet(lines[i]) &&
        !isNumbered(lines[i]) &&
        !isQuote(lines[i])
      ) {
        para.push(lines[i++]);
      }
      blocks.push(<p key={key}>{renderInline(para.join('\n'), key)}</p>);
    }
  }

  return <div className={`prose ${className}`}>{blocks}</div>;
}
