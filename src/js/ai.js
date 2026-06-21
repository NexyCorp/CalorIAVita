// ═══════════════════════════════════════
// GROQ & HUGGINGFACE (Visão) API
// ═══════════════════════════════════════
//
// ┌─────────────────────────────────────────────────────────────────┐
// │  PRODUÇÃO (Cloudflare Pages):                                   │
// │  As chaves ficam em Secrets no Cloudflare Dashboard.            │
// │  Settings → Environment Variables → adicione como Secret:       │
// │    GROQ_KEY_1 / GROQ_KEY_2 / GROQ_KEY_3 / HF_KEY               │
// │  O cliente chama /api/ai — as chaves NUNCA chegam ao browser.   │
// │                                                                  │
// │  DESENVOLVIMENTO LOCAL (npm run dev):                            │
// │  As chaves abaixo são usadas diretamente (somente localhost).    │
// └─────────────────────────────────────────────────────────────────┘

// Chaves usadas apenas em DEV local (em produção, use Cloudflare Secrets)
const _DEV_GROQ_KEYS = [
  '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',
  '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',
  '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'
];
const _DEV_HF_KEY = ''; // opcional em dev — usa Groq Vision como fallback

const GROQ_URL             = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL           = 'llama-3.3-70b-versatile';
const GROQ_MODEL_FAST      = 'llama-3.1-8b-instant';
const GROQ_MODEL_VISION    = 'meta-llama/llama-4-scout-17b-16e-instruct';
const GROQ_MODEL_VISION_FB = 'meta-llama/llama-4-maverick-17b-128e-instruct';
const HF_VISION_MODEL      = 'meta-llama/Llama-3.2-11B-Vision-Instruct';
const HF_VISION_URL        = `https://api-inference.huggingface.co/models/${HF_VISION_MODEL}/v1/chat/completions`;

// Detecta se o proxy Cloudflare está disponível (produção)
// Em dev, a rota /api/ai não existe → cai direto nas chaves locais
const USE_PROXY = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

let _devGroqKeyIndex = 0;
function _getDevGroqKey() { return _DEV_GROQ_KEYS[_devGroqKeyIndex] || _DEV_GROQ_KEYS[0]; }
function _rotateDevGroqKey() { _devGroqKeyIndex = (_devGroqKeyIndex + 1) % _DEV_GROQ_KEYS.length; }

// ═══════════════════════════════════════
// JSON PARSER ROBUSTO (com reparo de truncamento)
// ═══════════════════════════════════════
function extractJSON(text) {
  // Remove markdown code fences
  let s = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

  // Encontra o início do JSON
  const a = s.indexOf('{'), b = s.indexOf('[');
  const start = (a === -1) ? b : (b === -1 ? a : Math.min(a, b));
  if (start === -1) throw new Error('Nenhum JSON encontrado na resposta da IA.');
  s = s.substring(start);

  // Tenta parse direto
  const endObj = s.lastIndexOf('}');
  const endArr = s.lastIndexOf(']');
  const end = Math.max(endObj, endArr);
  if (end !== -1) {
    try { return JSON.parse(s.substring(0, end + 1)); } catch(e) { /* tenta reparo */ }
  }

  // ── Reparo de JSON truncado ──────────────────────────────────────────────
  // Conta abre/fecha para saber o que falta
  function repairTruncatedJSON(raw) {
    let result = raw;
    // Remove vírgulas finais antes de fechar
    result = result.replace(/,\s*([}\]])/g, '$1');
    // Se string aberta no final, fecha ela
    if ((result.match(/"/g) || []).length % 2 !== 0) result += '"';
    // Fecha arrays e objetos abertos
    const opens = [];
    for (const ch of result) {
      if (ch === '{') opens.push('}');
      else if (ch === '[') opens.push(']');
      else if (ch === '}' || ch === ']') opens.pop();
    }
    result += opens.reverse().join('');
    return result;
  }

  try {
    const repaired = repairTruncatedJSON(s);
    const parsed = JSON.parse(repaired);
    console.warn('[CalorIA] JSON reparado (resposta truncada):', repaired.slice(-100));
    return parsed;
  } catch(e2) {
    throw new Error(`JSON inválido mesmo após tentativa de reparo: ${e2.message}\nTexto: ${s.slice(0, 200)}`);
  }
}

// ═══════════════════════════════════════
// CHAMADA VIA PROXY CLOUDFLARE
// ═══════════════════════════════════════
async function _callProxy(body) {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    throw new Error(data.error || `Proxy error ${res.status}`);
  }
  return data.content;
}

// ═══════════════════════════════════════
// CHAMADA DIRETA GROQ (DEV local)
// ═══════════════════════════════════════
async function _devGroqFetch(model, messages, maxTokens = 6000) {
  const key = _getDevGroqKey();
  if (!key || key.length < 10) throw new Error('401 — Chave Groq de dev não configurada');
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.2 })
  });
  return res;
}

// ═══════════════════════════════════════
// callGroq — texto geral
// ═══════════════════════════════════════
async function callGroq(messages, retries = 3, maxTokens = 6000) {
  // Produção: usa proxy Cloudflare
  if (USE_PROXY) {
    const content = await _callProxy({ type: 'text', messages, maxTokens });
    return extractJSON(content);
  }

  // Dev local: direto ao Groq com rotação de chaves
  let lastErr;
  for (let attempt = 0; attempt < retries; attempt++) {
    const model = attempt === retries - 1 ? GROQ_MODEL_FAST : GROQ_MODEL;
    let res;
    try {
      res = await _devGroqFetch(model, messages, maxTokens);
    } catch(netErr) {
      throw new Error('Sem conexão com a API. Verifique sua internet.');
    }
    if (res.status === 401 || res.status === 403) throw new Error('401 — Chave Groq inválida');
    if (res.status === 429) {
      _rotateDevGroqKey();
      if (attempt < retries - 1) { await new Promise(r => setTimeout(r, 800 * (attempt + 1))); continue; }
      throw new Error('429 — Todas as chaves atingiram o limite. Tente em alguns minutos.');
    }
    if (res.status === 413) throw new Error('413 — Requisição muito grande.');
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      lastErr = new Error('Groq ' + res.status + ': ' + body.slice(0, 120));
      if (attempt < retries - 1) { await new Promise(r => setTimeout(r, 2000)); continue; }
      throw lastErr;
    }
    const data = await res.json();
    if (!data.choices?.[0]?.message?.content) throw new Error('Resposta vazia da API');
    return extractJSON(data.choices[0].message.content);
  }
  throw lastErr || new Error('Erro desconhecido no Groq.');
}

// Versão com mais tokens para prompts longos (dieta, receitas completas)
async function callGroqLarge(messages) {
  if (USE_PROXY) {
    const content = await _callProxy({ type: 'text', messages, maxTokens: 8192, useLarge: true });
    return extractJSON(content);
  }
  return callGroq(messages, 3, 8192);
}

async function askClaude(prompt, sys) {
  return callGroq([
    { role: 'system', content: sys || 'Você é especialista em nutrição. Responda SOMENTE em JSON válido.' },
    { role: 'user',   content: prompt }
  ]);
}

// ═══════════════════════════════════════
// VISÃO: HuggingFace → Groq Vision (fallback)
// Mantém nome askGeminiWithImage para compatibilidade com diary.js
// ═══════════════════════════════════════
async function askGeminiWithImage(b64, mime, prompt) {
  const mimeType = mime || 'image/jpeg';

  // Produção: tudo passa pelo proxy seguro
  if (USE_PROXY) {
    const content = await _callProxy({ type: 'vision', b64, mime: mimeType, prompt });
    return extractJSON(content);
  }

  // Dev local: HuggingFace → Groq Vision fallback
  const dataUri = `data:${mimeType};base64,${b64}`;
  const hfKey = _DEV_HF_KEY;

  // ── HuggingFace (se configurado em dev) ──────────────────────────────────
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
      max_tokens: 1024, temperature: 0.2
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
        throw new Error(`Imagem inválida ou muito grande. (${t.slice(0, 100)})`);
      }
      if (res.status === 401 || res.status === 403 || res.status === 404) { console.warn('[CameraIA] HF auth error → Groq'); break; }
      if (res.status === 429 || res.status === 503) {
        if (attempt === 0) { await new Promise(r => setTimeout(r, 3000)); continue; }
        break;
      }
      if (!res.ok) { if (attempt === 0) { await new Promise(r => setTimeout(r, 2000)); continue; } break; }
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content;
      if (text) return extractJSON(text); // ✅
      if (attempt === 0) continue;
      break;
    }
  }

  // ── Groq Vision fallback (dev) ────────────────────────────────────────────
  console.info('[CameraIA] Usando Groq Vision como fallback...');
  const messages = [
    { role: 'system', content: 'Você é especialista em nutrição. Retorne SOMENTE JSON válido, sem markdown, sem texto extra.' },
    { role: 'user', content: [
      { type: 'image_url', image_url: { url: dataUri } },
      { type: 'text', text: prompt }
    ]}
  ];
  for (const model of [GROQ_MODEL_VISION, GROQ_MODEL_VISION_FB]) {
    let res;
    try { res = await _devGroqFetch(model, messages, 2048); } catch(e) { if (model === GROQ_MODEL_VISION_FB) throw e; continue; }
    if (res.status === 401 || res.status === 403) throw new Error('401 — Chave Groq inválida');
    if (res.status === 429) {
      _rotateDevGroqKey();
      if (model === GROQ_MODEL_VISION_FB) throw new Error('429 — Rate limit Groq Vision. Tente novamente em instantes.');
      continue;
    }
    if (!res.ok) { if (model === GROQ_MODEL_VISION) continue; const b = await res.text().catch(()=>''); throw new Error('Groq ' + res.status + ': ' + b.slice(0,120)); }
    const data = await res.json();
    if (!data.choices?.[0]?.message?.content) throw new Error('Resposta vazia do Groq Vision');
    return extractJSON(data.choices[0].message.content);
  }
  throw new Error('Não foi possível analisar a imagem.');
}

// ═══════════════════════════════════════
// SEARCH
// ═══════════════════════════════════════
async function searchFood() {
  const query = document.getElementById('foodSearchInput').value.trim();
  if (!query) return;
  const qty = parseFloat(document.getElementById('qtyInput').value) || 100;
  const unit = document.getElementById('qtyUnit').value;

  document.getElementById('searchLoading').classList.add('show');
  document.getElementById('resultCard').classList.remove('show');
  document.getElementById('searchError').classList.remove('show');
  document.getElementById('searchBtn').disabled = true;
  document.getElementById('nutritionExpanded').classList.remove('show');
  document.getElementById('btnToggleNutr').innerHTML = '<i class="fa-solid fa-flask ic-water"></i> Ver nutrição completa (vitaminas, minerais…)';

  try {
    const data = await askClaude(
      `Informações nutricionais completas para "${query}", porção de ${qty} ${unit}. Retorne JSON com TODOS estes campos (use 0 se desconhecido):
name, portion, calories, carbs, protein, fat, fiber, sodium, sugar, cholesterol,
lipids_total, saturated_fat, monounsaturated_fat, polyunsaturated_fat, trans_fat, water, ash, choline,
vit_a_ug, vit_c_mg, vit_d_ug, vit_e_mg, vit_k_ug,
vit_b1_mg, vit_b2_mg, vit_b3_mg, vit_b5_mg, vit_b6_mg, vit_b9_ug, vit_b12_ug,
calcium_mg, iron_mg, magnesium_mg, phosphorus_mg, potassium_mg, zinc_mg, selenium_ug, manganese_mg, copper_mg, fluoride_ug, iodine_ug,
flavonoids_mg, polyphenols_mg, carotenoids_ug, lycopene_ug, lutein_ug, phytosterols_mg.
Dados baseados em TACO/USDA/IBGE.`,
      'Retorne APENAS JSON válido sem texto adicional.'
    );
    lastSearchResult = data;
    document.getElementById('resultName').textContent = data.name;
    document.getElementById('resultPortion').textContent = `Porção: ${qty} ${unit}`;
    document.getElementById('resultKcal').textContent = Math.round(data.calories);
    document.getElementById('resCarbs').textContent = (data.carbs||0).toFixed(1) + 'g';
    document.getElementById('resProt').textContent = (data.protein||0).toFixed(1) + 'g';
    document.getElementById('resFat').textContent = (data.fat||0).toFixed(1) + 'g';
    document.getElementById('resFiber').textContent = (data.fiber||0).toFixed(1) + 'g';
    document.getElementById('resSodium').textContent = Math.round(data.sodium||0) + 'mg';
    document.getElementById('resSugar').textContent = (data.sugar||0).toFixed(1) + 'g';
    document.getElementById('resCholest').textContent = Math.round(data.cholesterol||0) + 'mg';
    document.getElementById('resLipids').textContent = (data.lipids_total||data.fat||0).toFixed(1)+'g';
    document.getElementById('resSatFat').textContent = (data.saturated_fat||0).toFixed(1)+'g';
    document.getElementById('resMonoFat').textContent = (data.monounsaturated_fat||0).toFixed(1)+'g';
    document.getElementById('resPolyFat').textContent = (data.polyunsaturated_fat||0).toFixed(1)+'g';
    document.getElementById('resTransFat').textContent = (data.trans_fat||0).toFixed(2)+'g';
    document.getElementById('resWater').textContent = (data.water||0).toFixed(1)+'g';
    document.getElementById('resAsh').textContent = (data.ash||0).toFixed(2)+'g';
    document.getElementById('resCholine').textContent = (data.choline||0).toFixed(1)+'mg';
    document.getElementById('resVitA').textContent = Math.round(data.vit_a_ug||0)+'µg';
    document.getElementById('resVitC').textContent = (data.vit_c_mg||0).toFixed(1)+'mg';
    document.getElementById('resVitD').textContent = (data.vit_d_ug||0).toFixed(1)+'µg';
    document.getElementById('resVitE').textContent = (data.vit_e_mg||0).toFixed(2)+'mg';
    document.getElementById('resVitK').textContent = (data.vit_k_ug||0).toFixed(1)+'µg';
    document.getElementById('resVitB1').textContent = (data.vit_b1_mg||0).toFixed(3)+'mg';
    document.getElementById('resVitB2').textContent = (data.vit_b2_mg||0).toFixed(3)+'mg';
    document.getElementById('resVitB3').textContent = (data.vit_b3_mg||0).toFixed(2)+'mg';
    document.getElementById('resVitB5').textContent = (data.vit_b5_mg||0).toFixed(2)+'mg';
    document.getElementById('resVitB6').textContent = (data.vit_b6_mg||0).toFixed(3)+'mg';
    document.getElementById('resVitB9').textContent = Math.round(data.vit_b9_ug||0)+'µg';
    document.getElementById('resVitB12').textContent = (data.vit_b12_ug||0).toFixed(2)+'µg';
    document.getElementById('resCalcium').textContent = Math.round(data.calcium_mg||0)+'mg';
    document.getElementById('resIron').textContent = (data.iron_mg||0).toFixed(2)+'mg';
    document.getElementById('resMagnesium').textContent = Math.round(data.magnesium_mg||0)+'mg';
    document.getElementById('resPhosphorus').textContent = Math.round(data.phosphorus_mg||0)+'mg';
    document.getElementById('resPotassium').textContent = Math.round(data.potassium_mg||0)+'mg';
    document.getElementById('resZinc').textContent = (data.zinc_mg||0).toFixed(2)+'mg';
    document.getElementById('resSelenium').textContent = (data.selenium_ug||0).toFixed(1)+'µg';
    document.getElementById('resManganese').textContent = (data.manganese_mg||0).toFixed(3)+'mg';
    document.getElementById('resCopper').textContent = (data.copper_mg||0).toFixed(3)+'mg';
    document.getElementById('resFluoride').textContent = Math.round(data.fluoride_ug||0)+'µg';
    document.getElementById('resIodine').textContent = Math.round(data.iodine_ug||0)+'µg';
    document.getElementById('resSodium2').textContent = Math.round(data.sodium||0)+'mg';
    document.getElementById('resFlavonoids').textContent = (data.flavonoids_mg||0).toFixed(1)+'mg';
    document.getElementById('resPolyphenols').textContent = (data.polyphenols_mg||0).toFixed(1)+'mg';
    document.getElementById('resCarotenoids').textContent = Math.round(data.carotenoids_ug||0)+'µg';
    document.getElementById('resLycopene').textContent = Math.round(data.lycopene_ug||0)+'µg';
    document.getElementById('resLutein').textContent = Math.round(data.lutein_ug||0)+'µg';
    document.getElementById('resPhytosterols').textContent = (data.phytosterols_mg||0).toFixed(1)+'mg';
    document.getElementById('resultCard').classList.add('show');
  } catch(e) {
    const errEl = document.getElementById('searchError');
    errEl.classList.add('show');
    errEl.textContent = e.message?.includes('401') || e.message?.includes('403')
      ? '🔑 Chave da API inválida ou expirada.'
      : e.message?.includes('429')
      ? '⏳ Muitas requisições. Aguarde alguns segundos e tente novamente.'
      : '✕ Não foi possível buscar o alimento. Verifique sua conexão e tente novamente.';
  } finally {
    document.getElementById('searchLoading').classList.remove('show');
    document.getElementById('searchBtn').disabled = false;
  }
}

function toggleNutritionPanel() {
  const panel = document.getElementById('nutritionExpanded');
  const btn = document.getElementById('btnToggleNutr');
  panel.classList.toggle('show');
  if (panel.classList.contains('show')) {
    btn.innerHTML = '<i class="fa-solid fa-chevron-up ic-water"></i> Ocultar nutrição completa <span style="margin-left:0.5rem;background:rgba(255,255,255,0.18);border-radius:50px;padding:1px 8px;font-size:0.72rem;font-weight:700;">38 nutrientes</span>';
    if (lastSearchResult) _showNutriScore(lastSearchResult);
    setTimeout(() => panel.scrollIntoView({ behavior:'smooth', block:'nearest' }), 100);
  } else {
    btn.innerHTML = '<i class="fa-solid fa-flask ic-water"></i> Ver nutrição completa (vitaminas, minerais…) <span style="margin-left:0.5rem;background:rgba(255,255,255,0.18);border-radius:50px;padding:1px 8px;font-size:0.72rem;font-weight:700;">38 nutrientes</span>';
  }
}

function _showNutriScore(data) {
  const box = document.getElementById('nutriScoreBox');
  const content = document.getElementById('nutriScoreContent');
  if (!box || !content) return;
  const points = [];
  if ((data.fiber||0) >= 3) points.push('✅ Boa fonte de fibras');
  if ((data.vit_c_mg||0) >= 7) points.push('✅ Vitamina C presente');
  if ((data.calcium_mg||0) >= 100) points.push('✅ Boa fonte de cálcio');
  if ((data.iron_mg||0) >= 1) points.push('✅ Contém ferro');
  if ((data.potassium_mg||0) >= 200) points.push('✅ Rico em potássio');
  if ((data.protein||0) >= 10) points.push('✅ Boa fonte de proteína');
  if ((data.saturated_fat||0) > 5) points.push('⚠️ Gordura saturada elevada');
  if ((data.sodium||0) > 400) points.push('⚠️ Sódio elevado');
  if ((data.sugar||0) > 12) points.push('⚠️ Açúcares livres moderados/altos');
  if ((data.trans_fat||0) > 0.1) points.push('⚠️ Contém gordura trans');
  if ((data.vit_d_ug||0) >= 2) points.push('✅ Vitamina D presente');
  if ((data.magnesium_mg||0) >= 40) points.push('✅ Boa fonte de magnésio');
  if (points.length) {
    content.innerHTML = points.map(p => `<div>${p}</div>`).join('');
    box.style.display = 'block';
  } else { box.style.display = 'none'; }
}

function quickSearch(term) { document.getElementById('foodSearchInput').value = term; searchFood(); }

function addToDiaryFromSearch() {
  if (!lastSearchResult) return;
  const meal = document.getElementById('searchMealSelect')?.value || document.getElementById('diaryMealSelect')?.value || 'almoco';
  addToDiaryMeal(meal, {
    name: lastSearchResult.name,
    kcal: Math.round(lastSearchResult.calories),
    carbs: lastSearchResult.carbs||0,
    prot: lastSearchResult.protein||0,
    fat: lastSearchResult.fat||0
  });
  showPanel('diary', null);
  setBottomNav('diary');
}

// Expor funções para o escopo global
window.extractJSON = extractJSON;
window.callGroq = callGroq;
window.callGroqLarge = callGroqLarge;
window.askClaude = askClaude;
window.askGeminiWithImage = askGeminiWithImage;
window.searchFood = searchFood;
window.toggleNutritionPanel = toggleNutritionPanel;
window._showNutriScore = _showNutriScore;
window.quickSearch = quickSearch;
window.addToDiaryFromSearch = addToDiaryFromSearch;
