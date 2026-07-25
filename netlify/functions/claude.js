const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const jsonResponse = (body, status) =>
  Response.json(body, { status, headers: corsHeaders });

export default async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('', { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const baseUrl = process.env.ANTHROPIC_BASE_URL;

  if (!apiKey || !baseUrl) {
    return jsonResponse({ error: 'AI Gateway is not configured.' }, 500);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  const payload = {
    ...body,
    model: 'claude-sonnet-4-6',
    max_tokens: Math.min(body.max_tokens || 1000, 2000),
  };

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json();

    return jsonResponse(data, response.status);
  } catch (error) {
    return jsonResponse({ error: error.message }, 502);
  }
};
