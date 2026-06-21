import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Verify Authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 2. Parse Request
    const { provider, prompt, image, maxTokens, temperature } = await req.json()

    // 3. Handle Provider: GROQ
    if (provider === 'groq') {
      const keysEnv = Deno.env.get('GROQ_KEYS')
      if (!keysEnv) throw new Error('GROQ_KEYS not configured in Supabase Secrets')
      const keys = keysEnv.split(',').map((k: string) => k.trim())
      const randomKey = keys[Math.floor(Math.random() * keys.length)]

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
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error?.message || 'Groq API error')

      return new Response(JSON.stringify({ result: data.choices[0].message.content }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 4. Handle Provider: GEMINI (Vision)
    if (provider === 'gemini') {
      const keysEnv = Deno.env.get('GEMINI_KEYS')
      if (!keysEnv) throw new Error('GEMINI_KEYS not configured in Supabase Secrets')
      const keys = keysEnv.split(',').map((k: string) => k.trim())
      const randomKey = keys[Math.floor(Math.random() * keys.length)]

      // Gemini Vision API
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${randomKey}`, {
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
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error?.message || 'Gemini API error')

      return new Response(JSON.stringify({ result: data.candidates[0].content.parts[0].text }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    throw new Error('Unsupported provider')

  } catch (error: any) {
    console.error(error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
