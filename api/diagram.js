import { ApiError, SAFETY_RULES, callGemini, createHandler, loadPublishedPost, postContext } from './_lib/shared.js';

const ALLOWED_START = /^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram(-v2)?|erDiagram|mindmap|timeline|journey)\b/;
const MAX_CODE_LENGTH = 4000;

/** Cleans model output and rejects anything that is not plain Mermaid text. */
export function sanitizeMermaid(raw) {
  let code = String(raw || '')
    .replace(/^```(?:mermaid)?\s*/i, '')
    .replace(/```\s*$/, '')
    .replace(/\r\n/g, '\n')
    .trim();
  if (!code || code.length > MAX_CODE_LENGTH) return null;
  if (/<\s*(script|iframe|object|embed|style)/i.test(code) || /javascript:/i.test(code)) return null;

  const lines = code
    .split('\n')
    .filter((line) => !/^\s*(click\s|%%\{)/i.test(line)); // no interactivity or init directives
  const firstReal = lines.find((line) => line.trim() && !line.trim().startsWith('%%'));
  if (!firstReal || !ALLOWED_START.test(firstReal.trim())) return null;
  return lines.join('\n').trim();
}

export default createHandler(async (body) => {
  const post = await loadPublishedPost(body.postId);

  const system = `You are the diagram generator of LearnSphere. Turn the post below into ONE clear Mermaid diagram.

Return ONLY a JSON object with these keys:
- "title": a short diagram title (max 8 words).
- "mermaid": valid Mermaid code. Choose the best type: flowchart TD or LR for processes and architectures, sequenceDiagram for interactions over time, stateDiagram-v2 for lifecycles, classDiagram or erDiagram for structures.
- "steps": an array of 3 to 8 short plain-text strings that describe the same diagram in reading order (used as a fallback when the diagram cannot render).

Mermaid rules (important, so it renders):
- Max 12 nodes. Keep labels under 6 words.
- Wrap every node label in double quotes, for example A["Client sends request"]. Never use parentheses, brackets, quotes or semicolons inside labels.
- Use simple ASCII node ids such as A, B, C or step1. No HTML, no click handlers, no styling or %%{init}%% directives.
- Show only what the post actually describes. Do not invent components.
- ${SAFETY_RULES}`;

  const text = await callGemini({
    system,
    contents: [{ role: 'user', parts: [{ text: `${postContext(post)}\n\nCreate the diagram JSON now.` }] }],
    json: true,
    temperature: 0.2,
    maxOutputTokens: 4096,
  });

  let parsed;
  try {
    parsed = JSON.parse(text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, ''));
  } catch {
    throw new ApiError(502, 'ai_bad_format', 'The AI returned a diagram in an unexpected format. Please try again.');
  }

  const code = sanitizeMermaid(parsed?.mermaid);
  if (!code) {
    throw new ApiError(502, 'ai_bad_diagram', 'The AI produced a diagram that could not be used. Please try again.');
  }
  const steps = Array.isArray(parsed?.steps)
    ? parsed.steps.map((s) => String(s).slice(0, 200)).filter(Boolean).slice(0, 8)
    : [];
  return { title: String(parsed?.title || 'Diagram').slice(0, 80), mermaid: code, steps };
});
