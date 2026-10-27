import { ApiError, SAFETY_RULES, callGemini, createHandler, loadPublishedPost, postContext } from './_lib/shared.js';

const MAX_MESSAGES = 12;
const MAX_MESSAGE_LENGTH = 1500;

export default createHandler(async (body) => {
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    throw new ApiError(400, 'invalid_request', 'messages must be a non-empty array.');
  }
  const messages = body.messages
    .slice(-MAX_MESSAGES)
    .map((m) => ({ role: m?.role === 'assistant' ? 'model' : 'user', text: String(m?.content ?? '').trim().slice(0, MAX_MESSAGE_LENGTH) }))
    .filter((m) => m.text);

  if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
    throw new ApiError(400, 'invalid_request', 'The last message must be a question from the user.');
  }
  // Gemini requires the conversation to start with a user turn.
  while (messages.length && messages[0].role !== 'user') messages.shift();

  const post = await loadPublishedPost(body.postId);

  const system = `You are the follow-up tutor on a LearnSphere post page. A reader is asking questions about the post below.

Rules:
- Keep what the AUTHOR WROTE separate from what YOU ADD. When you cite the post, say "The post says...". When you go beyond it, say "Beyond the post:" or "I'm assuming...".
- Never claim the author said, tested or built something unless it is in the post. If the post does not cover a question, say so, then offer general knowledge clearly marked as such.
- Match the reader's level. Be practical, concrete and concise (under 250 words unless asked for more). Use Markdown.
- If asked what to learn next, suggest 3 specific next topics that follow from the post.
- ${SAFETY_RULES}

${postContext(post)}`;

  const reply = await callGemini({
    system,
    contents: messages.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
    temperature: 0.5,
    maxOutputTokens: 4096,
  });
  return { reply };
});
