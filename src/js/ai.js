// ═══════════════════════════════════════
// GROQ & HUGGINGFACE (Visão) API
// ═══════════════════════════════════════
const GROQ_KEYS = [
  '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',
  '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',
  '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',
  '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',
  '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'  
];
let currentGroqKeyIndex = 0;

// Chave HuggingFace para análise de imagens (CameraIA)
// Obtenha em: https://huggingface.co/settings/tokens
// IMPORTANTE: aceite os termos do modelo em: https://huggingface.co/meta-llama/Llama-3.2-11B-Vision-Instruct
const HF_KEY = ''; // ← Substitua pela sua chave HuggingFace
const HF_VISION_MODEL = 'meta-llama/Llama-3.2-11B-Vision-Instruct';
const HF_VISION_URL = `https://api-inference.huggingface.co/models/${HF_VISION_MODEL}/v1/chat/completions`;

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL        = 'llama-3.3-70b-versatile';      // texto geral
const GROQ_MODEL_FAST   = 'llama-3.1-8b-instant';         // fallback leve
const GROQ_MODEL_VISION    = 'meta-llama/llama-4-scout-17b-16e-instruct'; // visão principal
const GROQ_MODEL_VISION_FB = 'meta-llama/llama-4-maverick-17b-128e-instruct'; // visão fallback

function getGroqKey() {
  return GROQ_KEYS[currentGroqKeyIndex] || GROQ_KEYS[0];
}

function rotateGroqKey() {
  currentGroqKeyIndex = (currentGroqKeyIndex + 1) % GROQ_KEYS.length;
}

function extractJSON(text) {
  let s = text.replace(/```json/g,'').replace(/```/g,'').trim();
  let a = s.indexOf('{'), b = s.indexOf('[');
  let start = (a===-1)?b:(b===-1?a:Math.min(a,b));
  if (start===-1) throw new Error('JSON not found');
  let end = Math.max(s.lastIndexOf('}'), s.lastIndexOf(']'));
  return JSON.parse(s.substring(start, end+1));
}

async function _groqFetch(model, messages, maxTokens = 4096) {
  const key = getGroqKey();
  if (!key || key.length < 10) throw new Error('401 — Chave Groq não configurada');
  let res;
  try {
    res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
      body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.2 })
    });
  } catch(netErr) {
    throw new Error('Sem conexão com a API. Verifique sua internet.');
  }
  return res;
}

async function callGroq(messages, retries = 3, maxTokens = 4096) {
  let lastErr;
  for (let attempt = 0; attempt < retries; attempt++) {
    // Na última tentativa, usa modelo menor como fallback
    const model = attempt === retries - 1 ? GROQ_MODEL_FAST : GROQ_MODEL;
    const res = await _groqFetch(model, messages, maxTokens);
    if (res.status === 401 || res.status === 403) throw new Error('401');
    if (res.status === 429) {
      rotateGroqKey(); // Rate limit atingido, rotaciona a chave!
      if (attempt < retries - 1) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1))); // Espera menor, pois já trocou a chave
        continue;
      }
      throw new Error('429 — Todas as chaves atingiram o limite (Rate Limit). Tente novamente em alguns minutos.');
    }
    if (res.status === 413) throw new Error('413');
    if (!res.ok) {
      const body = await res.text().catch(()=>'');
      lastErr = new Error('Groq ' + res.status + ': ' + body.slice(0,120));
      if (attempt < retries - 1) {
        await new Promise(r => setTimeout(r, 3000));
        continue;
      }
      throw lastErr;
    }
    const data = await res.json();
    if (!data.choices?.[0]?.message?.content) throw new Error('Resposta vazia da API');
    return extractJSON(data.choices[0].message.content);
  }
  throw lastErr || new Error('429 — Todas as chaves atingiram o limite (Rate Limit). Tente novamente em alguns minutos.');
}

// Versão com mais tokens para prompts longos (como geração de dieta)
async function callGroqLarge(messages) {
  return callGroq(messages, 3, 8192);
}

async function askClaude(prompt, sys) {
  return callGroq([
    { role:'system', content: sys || 'Você é especialista em nutrição. Responda SOMENTE em JSON válido.' },
    { role:'user', content: prompt }
  ]);
}

// ─── Fallback Groq Vision ────────────────────────────────────────
async function _askGroqVision(b64, mime, prompt) {
  const messages = [
    { role: 'system', content: 'Você é especialista em nutrição. Retorne SOMENTE JSON válido, sem markdown, sem texto extra.' },
    { role: 'user', content: [
      { type: 'image_url', image_url: { url: 'data:' + mime + ';base64,' + b64 } },
      { type: 'text', text: prompt }
    ]}
  ];

  // Tenta modelo principal de visão, depois fallback
  for (const model of [GROQ_MODEL_VISION, GROQ_MODEL_VISION_FB]) {
    let res;
    try {
      res = await _groqFetch(model, messages, 2048);
    } catch(netErr) {
      if (model === GROQ_MODEL_VISION_FB) throw netErr;
      continue; // tenta fallback
    }
    if (res.status === 401 || res.status === 403) throw new Error('401 — Chave Groq inválida');
    if (res.status === 429) {
      rotateGroqKey();
      if (model === GROQ_MODEL_VISION_FB) throw new Error('429 — Rate limit Groq. Tente novamente em instantes.');
      continue;
    }
    if (!res.ok) {
      if (model === GROQ_MODEL_VISION) continue; // tenta fallback
      const body = await res.text().catch(() => '');
      throw new Error('Groq ' + res.status + ': ' + body.slice(0, 120));
    }
    const data = await res.json();
    if (!data.choices?.[0]?.message?.content) throw new Error('Resposta vazia da API Groq (visão)');
    return extractJSON(data.choices[0].message.content);
  }
  throw new Error('Não foi possível analisar a imagem via Groq.');
}

// ─── Análise de imagem: HuggingFace (primário) → Groq Vision (fallback) ──────
// Mantém o nome askGeminiWithImage para compatibilidade com diary.js
async function askGeminiWithImage(b64, mime, prompt, _retries = 2) {
  const mimeType = mime || 'image/jpeg';
  const dataUri = `data:${mimeType};base64,${b64}`;
  const hfConfigured = HF_KEY && HF_KEY.length >= 10 && !HF_KEY.includes('xxxx');

  // ─── Tentativa 1: HuggingFace ──────────────────────────────────
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

    for (let attempt = 0; attempt < _retries; attempt++) {
      let res;
      try {
        res = await fetch(HF_VISION_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + HF_KEY },
          body: JSON.stringify(payload)
        });
      } catch(netErr) {
        console.warn('[CameraIA] HuggingFace indisponível, ativando fallback Groq...');
        break; // sai do loop HF e vai para Groq
      }

      if (res.status === 401 || res.status === 403 || res.status === 404) {
        // Chave ou modelo inválido — não adianta tentar de novo, vai para Groq
        console.warn(`[CameraIA] HF ${res.status} — usando fallback Groq...`);
        break;
      }
      if (res.status === 429 || res.status === 503) {
        if (attempt < _retries - 1) {
          const wait = 3000 * (attempt + 1);
          console.warn(`[CameraIA] HF ${res.status} — aguardando ${wait}ms... (tentativa ${attempt + 1}/${_retries})`);
          await new Promise(r => setTimeout(r, wait));
          continue;
        }
        console.warn('[CameraIA] HF esgotou tentativas — ativando fallback Groq...');
        break; // fallback para Groq
      }
      if (res.status === 400) {
        const errTxt = await res.text().catch(() => '');
        // Imagem inválida ou muito grande — não tenta Groq pois seria o mesmo problema
        throw new Error(`Imagem inválida ou muito grande. Tente uma foto menor. (HF 400: ${errTxt.substring(0, 100)})`);
      }
      if (!res.ok) {
        if (attempt < _retries - 1) { await new Promise(r => setTimeout(r, 2000)); continue; }
        console.warn(`[CameraIA] HF ${res.status} — usando fallback Groq...`);
        break;
      }

      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content;
      if (!text) {
        if (attempt < _retries - 1) continue;
        break; // fallback para Groq
      }
      return extractJSON(text); // ✅ sucesso via HuggingFace
    }
  } else {
    console.warn('[CameraIA] HF_KEY não configurada — usando fallback Groq diretamente...');
  }

  // ─── Tentativa 2: Groq Vision (fallback) ─────────────────────────
  console.info('[CameraIA] Usando Groq Vision como fallback...');
  return _askGroqVision(b64, mimeType, prompt);
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
  // Reset expanded panel
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
    // Basic display
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
    // Lipids & water
    document.getElementById('resLipids').textContent = (data.lipids_total||data.fat||0).toFixed(1)+'g';
    document.getElementById('resSatFat').textContent = (data.saturated_fat||0).toFixed(1)+'g';
    document.getElementById('resMonoFat').textContent = (data.monounsaturated_fat||0).toFixed(1)+'g';
    document.getElementById('resPolyFat').textContent = (data.polyunsaturated_fat||0).toFixed(1)+'g';
    document.getElementById('resTransFat').textContent = (data.trans_fat||0).toFixed(2)+'g';
    document.getElementById('resWater').textContent = (data.water||0).toFixed(1)+'g';
    document.getElementById('resAsh').textContent = (data.ash||0).toFixed(2)+'g';
    document.getElementById('resCholine').textContent = (data.choline||0).toFixed(1)+'mg';
    // Vitamins
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
    // Minerals
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
    // Phytochemicals
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
      ? '🔑 Chave da API inválida ou expirada. Verifique as configurações.'
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
    // Mostra score nutricional se tiver dados
    if (lastSearchResult) _showNutriScore(lastSearchResult);
    // Scroll suave para o painel expandido
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
  } else {
    box.style.display = 'none';
  }
}

function quickSearch(term) {
  document.getElementById('foodSearchInput').value = term;
  searchFood();
}

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




