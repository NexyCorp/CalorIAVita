/**
 * Cloudflare Pages Function — Proxy seguro para APIs de IA
 * Arquivo: functions/api/ai.js
 *
 * Configure os Secrets no Cloudflare Dashboard:
 *   Settings → Environment Variables → Add variable (tipo: Secret)
 *   GROQ_KEY_1  /  GROQ_KEY_2  /  GROQ_KEY_3  /  HF_KEY
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
  let lastErr = '';
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
    } catch(e) {
      lastErr = 'Sem conexão com Groq: ' + e.message;
      continue;
    }
    if (res.status === 429 || res.status === 503) {
      lastStatus = res.status;
      lastErr = `Chave ${ki+1} com rate limit (429)`;
      if (ki < keys.length - 1) await new Promise(r => setTimeout(r, 600 * (ki + 1)));
      continue; // próxima chave
    }
    if (res.status === 401 || res.status === 403) {
      return { error: `Chave Groq ${ki+1} inválida (${res.status}).`, status: 401 };
    }
    if (res.status === 413) {
      return { error: 'Payload muito grande para o Groq (413). A imagem foi comprimida?', status: 413 };
    }
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { error: `Groq ${res.status}: ${body.slice(0, 150)}`, status: res.status };
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return { error: 'Resposta vazia da API Groq', status: 200 };
    return { content, status: 200 };
  }
  return {
    error: `429 — Todas as ${keys.length} chaves Groq atingiram o limite. Tente em alguns minutos. (Último erro: ${lastErr})`,
    status: lastStatus
  };
}

// ─── Handler: texto ────────────────────────────────────────────────────────────
async function handleText(body, env) {
  const keys = [env.GROQ_KEY_1, env.GROQ_KEY_2, env.GROQ_KEY_3, env.GROQ_KEY_4].filter(k => k && k.length > 10);
  if (keys.length === 0) return errResp('Nenhuma chave Groq configurada no Cloudflare (GROQ_KEY_1/2/3/4).', 401);

  const { messages, maxTokens = 6000, useLarge } = body;
  const tokenLimit = useLarge ? 8192 : maxTokens;

  for (const model of [GROQ_MODEL, GROQ_MODEL_FAST]) {
    const result = await groqFetch(keys, model, messages, tokenLimit);
    if (result.content) return jsonResp({ content: result.content, provider: 'groq', model });
    if (result.status === 401) return errResp(result.error, 401);
    if (result.status === 413) return errResp(result.error, 413);
    if (model === GROQ_MODEL_FAST) return errResp(result.error, result.status || 500);
    // Se falhou no modelo principal, tenta fast
  }
  return errResp('Não foi possível processar a requisição.', 500);
}

// ─── Handler: visão ─────────────────────────────────────────────────────────────
async function handleVision(body, env) {
  const { b64, mime, prompt } = body;

  // Valida tamanho: base64 de 1MB = ~750KB original
  // Após compressão client-side (1024px, 75%), deve ser < 500KB base64
  if (b64 && b64.length > 1_500_000) { // ~1.1MB base64 = ~800KB original
    return errResp('Imagem ainda muito grande após compressão. Tente uma foto com menos detalhes ou resolução menor.', 413);
  }

  const mimeType = mime || 'image/jpeg';
  const dataUri  = `data:${mimeType};base64,${b64}`;
  const hfKey    = env.HF_KEY;

  // ── HuggingFace (primário) ───────────────────────────────────────────────
  const hfConfigured = hfKey && hfKey.length > 10 && !hfKey.includes('xxxx');
  if (hfConfigured) {
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
      } catch(e) {
        console.log('[Vision] HF network error, fallback Groq:', e.message);
        break;
      }
      if (res.status === 400) {
        const t = await res.text().catch(() => '');
        // 400 pode ser imagem inválida — vai para Groq que pode lidar diferente
        console.log('[Vision] HF 400, tentando Groq:', t.slice(0, 100));
        break;
      }
      if (res.status === 401 || res.status === 403) {
        console.log('[Vision] HF auth falhou (', res.status, '), usando Groq');
        break;
      }
      if (res.status === 404) {
        console.log('[Vision] HF 404 — modelo não encontrado, usando Groq');
        break;
      }
      if (res.status === 429 || res.status === 503) {
        if (attempt === 0) { await new Promise(r => setTimeout(r, 3000)); continue; }
        console.log('[Vision] HF rate limit esgotado, usando Groq');
        break;
      }
      if (!res.ok) {
        console.log('[Vision] HF', res.status, '— usando Groq');
        if (attempt === 0) { await new Promise(r => setTimeout(r, 2000)); continue; }
        break;
      }
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content;
      if (text) return jsonResp({ content: text, provider: 'huggingface' }); // ✅ HF sucesso
      if (attempt === 0) continue;
      break;
    }
  } else {
    console.log('[Vision] HF_KEY não configurada ou inválida — usando Groq diretamente');
  }

  // ── Groq Vision fallback ─────────────────────────────────────────────────
  const keys = [env.GROQ_KEY_1, env.GROQ_KEY_2, env.GROQ_KEY_3, env.GROQ_KEY_4].filter(k => k && k.length > 10);
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
    if (result.content) return jsonResp({ content: result.content, provider: 'groq_vision', model });
    if (result.status === 401) return errResp(result.error, 401);
    if (result.status === 413) return errResp('Imagem muito grande para o Groq Vision. Comprima mais a foto.', 413);
    if (model === GROQ_MODEL_VISION_FB) return errResp(result.error || 'Não foi possível analisar a imagem.', result.status || 500);
  }
  return errResp('Não foi possível analisar a imagem.', 500);
}

// ─── Entry point ──────────────────────────────────────────────────────────────
export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); }
  catch(e) { return errResp('Body JSON inválido: ' + e.message, 400); }

  if (body.type === 'vision') return handleVision(body, env);
  if (body.type === 'text')   return handleText(body, env);
  return errResp('Tipo inválido. Use "text" ou "vision".', 400);
}

// Preflight CORS
export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}
