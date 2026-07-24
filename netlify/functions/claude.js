export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' } });
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const baseUrl = process.env.ANTHROPIC_BASE_URL;
  if (!apiKey || !baseUrl) return Response.json({ error: 'API key not configured.' }, { status: 500 });
  let body;
  try { body = await req.json(); } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const payload = { ...body, model: 'claude-sonnet-4-6', max_tokens: Math.min(body.max_tokens || 1000, 2000) };
  try {
    const r = await fetch(`${baseUrl.replace(/\/$/, '')}/v1/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify(payload),
    });
    const data = await r.json();
    return Response.json(data, { status: r.status, headers: { 'Access-Control-Allow-Origin': '*' } });
  } catch (err) { return Response.json({ error: err.message }, { status: 502 }); }
};
