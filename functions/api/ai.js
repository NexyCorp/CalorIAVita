/**
 * Cloudflare Pages Function — Proxy seguro para APIs de IA
 * Arquivo: functions/api/ai.js
 *
 * Configure os Secrets no Cloudflare Dashboard:
 *   Settings → Environment Variables → Add variable (tipo: Secret)
 *   GROQ_KEY_1  — primeira chave Groq
 *   GROQ_KEY_2  — segunda chave Groq
 *   GROQ_KEY_3  — terceira chave Groq
 *   HF_KEY      — chave HuggingFace (opcional, usa Groq Vision como fallback)
 *
 * O cliente envia POST /api/ai com body:
 *   { type: 'text',   messages, maxTokens?, useLarge? }  → Groq text
 *   { type: 'vision', b64, mime, prompt }                → HF Vision / Groq Vision fallback
 */

const GROQ_URL             = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL           = 'llama-3.3-70b-versatile';
const GROQ_MODEL_FAST      = 'llama-3.1-8b-instant';
const GROQ_MODEL_VISION    = 'meta-llama/llama-4-scout-17b-16e-instruct';
const GROQ_MODEL_VISION_FB = 'meta-llama/llama-4-maverick-17b-128e-instruct';
const HF_VISION_MODEL      = 'meta-llama/Llama-3.2-11B-Vision-Instruct';
const HF_VISION_URL        = `https://api-inference.huggingface.co/models/${HF_VISION_MODEL}/v1/chat/completions`;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResp(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS }
  });
}
function errResp(msg, status = 500) { return jsonResp({ error: msg }, status); }

// Groq fetch com rotação automática de chaves no 429
async function groqFetch(keys, model, messages, maxTokens = 6000) {
  let lastStatus = 429;
  for (let ki = 0; ki < keys.length; ki++) {
    const key = keys[ki];
    if (!key || key.length < 10) continue;
    let res;
    try {
      res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
        body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.2 })
      });
    } catch(e) { continue; }

    if (res.status === 429 || res.status === 503) {
      lastStatus = res.status;
      if (ki < keys.length - 1) await new Promise(r => setTimeout(r, 600 * (ki + 1)));
      continue; // próxima chave
    }
    if (res.status === 401 || res.status === 403) return { error: 'Chave Groq inválida.', status: 401 };
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { error: `Groq ${res.status}: ${body.slice(0, 150)}`, status: res.status };
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return { error: 'Resposta vazia da API Groq', status: 200 };
    return { content, status: 200 };
  }
  return { error: '429 — Todas as chaves Groq atingiram o limite. Tente em alguns minutos.', status: lastStatus };
}

async function handleText(body, env) {
  const keys = [env.GROQ_KEY_1, env.GROQ_KEY_2, env.GROQ_KEY_3].filter(k => k && k.length > 10);
  if (keys.length === 0) return errResp('Nenhuma chave Groq configurada no Cloudflare.', 401);

  const { messages, maxTokens = 6000, useLarge } = body;
  const tokenLimit = useLarge ? 8192 : maxTokens;

  for (const model of [GROQ_MODEL, GROQ_MODEL_FAST]) {
    const result = await groqFetch(keys, model, messages, tokenLimit);
    if (result.content) return jsonResp({ content: result.content });
    if (result.status === 401) return errResp(result.error, 401);
    if (model === GROQ_MODEL_FAST) return errResp(result.error, result.status || 500);
  }
  return errResp('Não foi possível processar a requisição.', 500);
}

async function handleVision(body, env) {
  const { b64, mime, prompt } = body;
  const mimeType = mime || 'image/jpeg';
  const dataUri  = `data:${mimeType};base64,${b64}`;
  const hfKey    = env.HF_KEY;

  // ── HuggingFace (primário) ───────────────────────────────────────────────
  if (hfKey && hfKey.length > 10) {
    const payload = {
      model: HF_VISION_MODEL,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: 'Você é especialista em nutrição. Retorne SOMENTE JSON válido, sem markdown, sem texto extra. ' + prompt },
          { type: 'image_url', image_url: { url: dataUri } }
        ]
      }],
      max_tokens: 1024,
      temperature: 0.2
    };
    for (let attempt = 0; attempt < 2; attempt++) {
      let res;
      try {
        res = await fetch(HF_VISION_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + hfKey },
          body: JSON.stringify(payload)
        });
      } catch(e) { break; }
      if (res.status === 400) {
        const t = await res.text().catch(() => '');
        return errResp(`Imagem inválida ou muito grande. (${t.slice(0,100)})`, 400);
      }
      if (res.status === 401 || res.status === 403 || res.status === 404) break;
      if (res.status === 429 || res.status === 503) {
        if (attempt === 0) { await new Promise(r => setTimeout(r, 3000)); continue; }
        break;
      }
      if (!res.ok) { if (attempt === 0) { await new Promise(r => setTimeout(r, 2000)); continue; } break; }
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content;
      if (text) return jsonResp({ content: text }); // ✅
      if (attempt === 0) continue;
      break;
    }
  }

  // ── Groq Vision fallback ─────────────────────────────────────────────────
  const keys = [env.GROQ_KEY_1, env.GROQ_KEY_2, env.GROQ_KEY_3].filter(k => k && k.length > 10);
  if (keys.length === 0) return errResp('Nenhuma chave configurada para análise de imagem.', 401);

  const messages = [
    { role: 'system', content: 'Você é especialista em nutrição. Retorne SOMENTE JSON válido, sem markdown, sem texto extra.' },
    { role: 'user', content: [
      { type: 'image_url', image_url: { url: dataUri } },
      { type: 'text', text: prompt }
    ]}
  ];
  for (const model of [GROQ_MODEL_VISION, GROQ_MODEL_VISION_FB]) {
    const result = await groqFetch(keys, model, messages, 2048);
    if (result.content) return jsonResp({ content: result.content });
    if (result.status === 401) return errResp(result.error, 401);
    if (model === GROQ_MODEL_VISION_FB) return errResp(result.error || 'Não foi possível analisar a imagem.', result.status || 500);
  }
  return errResp('Não foi possível analisar a imagem.', 500);
}

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch(e) { return errResp('Body JSON inválido.', 400); }
  if (body.type === 'vision') return handleVision(body, env);
  if (body.type === 'text')   return handleText(body, env);
  return errResp('Tipo inválido. Use "text" ou "vision".', 400);
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}
