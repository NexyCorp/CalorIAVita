const { createClient } = require('@supabase/supabase-js');

function withCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, apikey, x-client-info');
  return res;
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    return withCors(res).status(200).end();
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return withCors(res).status(401).json({ error: 'Missing Authorization header' });
    }

    // 1. Verify Auth
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return withCors(res).status(401).json({ error: 'Unauthorized' });
    }

    // 2. Parse request
    const { provider, prompt, image, maxTokens, temperature } = req.body;

    // 3. Handle GROQ
    if (provider === 'groq') {
      const keysEnv = process.env.GROQ_KEYS;
      if (!keysEnv) throw new Error('GROQ_KEYS not configured');
      const keys = keysEnv.split(',').map(k => k.trim());
      const randomKey = keys[Math.floor(Math.random() * keys.length)];

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${randomKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          temperature: temperature || 0.7,
          max_tokens: maxTokens || 1024
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Groq API error');

      return withCors(res).status(200).json({ result: data.choices[0].message.content });
    }

    // 4. Handle GEMINI
    if (provider === 'gemini') {
      const keysEnv = process.env.GEMINI_KEYS;
      if (!keysEnv) throw new Error('GEMINI_KEYS not configured');
      const keys = keysEnv.split(',').map(k => k.trim());
      const randomKey = keys[Math.floor(Math.random() * keys.length)];

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${randomKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: 'image/jpeg', data: image } }
            ]
          }]
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Gemini API error');

      return withCors(res).status(200).json({ result: data.candidates[0].content.parts[0].text });
    }

    return withCors(res).status(400).json({ error: 'Unsupported provider' });

  } catch (error) {
    console.error(error);
    return withCors(res).status(500).json({ error: error.message });
  }
};
