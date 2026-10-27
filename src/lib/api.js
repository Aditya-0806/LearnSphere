/** Calls one of the server-side AI endpoints (/api/explain, /api/diagram, /api/chat). */
export async function callAi(endpoint, payload) {
  let response;
  try {
    response = await fetch(`/api/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error('Could not reach the AI service. Check your connection and try again.');
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    /* non-JSON response */
  }

  if (!response.ok || !data?.ok) {
    const error = new Error(data?.error?.message || `The AI request failed (status ${response.status}).`);
    error.code = data?.error?.code || 'unknown';
    throw error;
  }
  return data;
}
