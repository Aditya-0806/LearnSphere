import { ApiError, SAFETY_RULES, callGemini, createHandler, loadPublishedPost, postContext } from './_lib/shared.js';

const LEVELS = {
  beginner:
    'The reader is new to this topic. Use plain language, define every technical term the first time it appears, and use one everyday analogy. Keep sentences short.',
  intermediate:
    'The reader knows the basics. Skip definitions of common terms, explain how and why things work, and include one concrete, practical example.',
  advanced:
    'The reader is experienced. Be concise and precise. Cover trade-offs, edge cases, failure modes and how this connects to broader design decisions.',
};

export default createHandler(async (body) => {
  const level = String(body.level || '').toLowerCase();
  if (!LEVELS[level]) {
    throw new ApiError(400, 'invalid_request', 'level must be "beginner", "intermediate" or "advanced".');
  }
  const post = await loadPublishedPost(body.postId);

  const system = `You are the AI Explain feature of LearnSphere, a platform where people share what they learn.
Explain the post below so a reader can truly understand it. ${LEVELS[level]}

Rules:
- Stay faithful to the author's content. Do not invent claims, numbers or sources the author did not write.
- If you add outside knowledge (extra examples, analogies, background), introduce it with the phrase "Beyond the post:" so readers can tell it apart.
- If the post is too thin or unclear to explain some part, say so briefly instead of guessing.
- Format in Markdown: short paragraphs, a few bullets where they help, and at most one short code block. Aim for 150 to 350 words.
- ${SAFETY_RULES}`;

  const explanation = await callGemini({
    system,
    contents: [{ role: 'user', parts: [{ text: `${postContext(post)}\n\nExplain this post for a ${level} reader.` }] }],
    temperature: 0.4,
    maxOutputTokens: 4096,
  });
  return { level, explanation };
});
