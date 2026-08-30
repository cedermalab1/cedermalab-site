exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' }, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.log('DEBUG: No API key found in environment variables');
    return { statusCode: 500, body: JSON.stringify({ error: 'API key not configured.' }) };
  }
  console.log('DEBUG: API key present, length:', apiKey.length, 'starts with:', apiKey.substring(0, 7));
  let body;
  try { body = JSON.parse(event.body); } catch { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }; }
  const payload = { ...body, model: 'claude-sonnet-4-6', max_tokens: Math.min(body.max_tokens || 1000, 2000) };
  console.log('DEBUG: Sending payload to Anthropic:', JSON.stringify(payload).substring(0, 300));
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify(payload),
    });
    const data = await r.json();
    console.log('DEBUG: Anthropic response status:', r.status);
    console.log('DEBUG: Anthropic response body:', JSON.stringify(data).substring(0, 500));
    return { statusCode: r.status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(data) };
  } catch (err) {
    console.log('DEBUG: Fetch threw an error:', err.message);
    return { statusCode: 502, body: JSON.stringify({ error: err.message }) };
  }
};
