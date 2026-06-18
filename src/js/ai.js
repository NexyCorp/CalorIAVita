// ═══════════════════════════════════════
// GROQ API
// ═══════════════════════════════════════
const GROQ_KEY = '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';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL        = 'llama-3.3-70b-versatile';      // texto geral
const GROQ_MODEL_FAST   = 'llama-3.1-8b-instant';         // fallback leve
const GROQ_MODEL_VISION = 'meta-llama/llama-4-scout-17b-16e-instruct'; // visão (imagens)
const GROQ_MODEL_VISION_FB = 'llama-3.2-11b-vision-preview'; // fallback visão

function extractJSON(text) {
  let s = text.replace(/```json/g,'').replace(/```/g,'').trim();
  let a = s.indexOf('{'), b = s.indexOf('[');
  let start = (a===-1)?b:(b===-1?a:Math.min(a,b));
  if (start===-1) throw new Error('JSON not found');
  let end = Math.max(s.lastIndexOf('}'), s.lastIndexOf(']'));
  return JSON.parse(s.substring(start, end+1));
}

async function _groqFetch(model, messages, maxTokens = 4096) {
  if (!GROQ_KEY || GROQ_KEY.length < 10) throw new Error('401 — Chave Groq não configurada');
  let res;
  try {
    res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + GROQ_KEY },
      body: JSON.stringify({ 
        model, 
        messages, 
        max_tokens: maxTokens, 
        temperature: 0.2,
        response_format: { type: "json_object" }
      })
    });
  } catch(netErr) {
    throw new Error('Sem conexão com a API. Verifique sua internet.');
  }
  return res;
}

async function callGroq(messages, retries = 7, maxTokens = 4096) {
  let lastErr;
  
  // Lista de modelos disponíveis no Groq para rotação caso ocorra rate limit (429) ou erro
  // Modelos obsoletos (como llama3-8b-8192 e gemma2) foram removidos.
  const models = [
    GROQ_MODEL,               // 'llama-3.3-70b-versatile'
    'mixtral-8x7b-32768',     // Excelente para fallback longo
    GROQ_MODEL_FAST           // 'llama-3.1-8b-instant'
  ];

  // Se o usuário passou 7 retries, mas só temos 3 modelos, vamos tentar os modelos de forma circular
  // Ex: model[0], model[1], model[2], model[0], model[1]... dando um tempinho entre eles.
  const maxAttempts = Math.max(retries, models.length);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const model = models[attempt % models.length];
    
    // Se der 413, tenta reduzir maxTokens progressivamente nas próximas tentativas
    let currentMaxTokens = attempt > 0 ? Math.floor(maxTokens * Math.pow(0.75, attempt)) : maxTokens;

    let res;
    try {
      res = await _groqFetch(model, messages, currentMaxTokens);
    } catch(err) {
      lastErr = err;
      await new Promise(r => setTimeout(r, 1500));
      continue;
    }

    if (res.status === 401 || res.status === 403) throw new Error('401');
    if (res.status === 429) {
      lastErr = new Error('429');
      // Se já testamos todos os modelos e voltamos a pegar 429, esperamos um pouco antes de tentar a próxima rodada
      if (attempt >= models.length - 1) {
        await new Promise(r => setTimeout(r, 2000));
      }
      continue; 
    }
    if (res.status === 413) {
      lastErr = new Error('413');
      // No 413 (Payload too large), reduzimos maxTokens no próximo loop
      continue;
    }
    if (!res.ok) {
      const body = await res.text().catch(()=>'');
      lastErr = new Error('Groq ' + res.status + ': ' + body.slice(0,120));
      if (attempt < retries - 1) {
        await new Promise(r => setTimeout(r, 1500));
        continue;
      }
      throw lastErr;
    }
    
    const data = await res.json();
    if (!data.choices?.[0]?.message?.content) {
      lastErr = new Error('Resposta vazia da API');
      continue;
    }
    
    try {
      return extractJSON(data.choices[0].message.content);
    } catch (parseErr) {
      lastErr = new Error('Falha ao processar JSON da IA');
      continue;
    }
  }
  throw lastErr || new Error('Falha de IA após rotação de modelos.');
}

// Versão com mais tokens para prompts longos (como geração de dieta)
async function callGroqLarge(messages) {
  return callGroq(messages, 4, 8192);
}

async function askClaude(prompt, sys) {
  return callGroq([
    { role:'system', content: sys || 'Você é especialista em nutrição. Responda SOMENTE em JSON válido.' },
    { role:'user', content: prompt }
  ], 4);
}

// Análise de imagem com modelo de visão dedicado (llama-4-scout suporta image_url)
async function askGeminiWithImage(b64, mime, prompt) {
  if (!GROQ_KEY || GROQ_KEY.length < 10) throw new Error('401 — Chave Groq não configurada');
  const messages = [
    { role:'system', content:'Você é especialista em nutrição. Retorne SOMENTE JSON válido.' },
    { role:'user', content:[
      { type:'image_url', image_url:{ url:'data:'+mime+';base64,'+b64 }},
      { type:'text', text: prompt }
    ]}
  ];

  // Tenta modelo principal de visão, depois fallback
  for (const model of [GROQ_MODEL_VISION, GROQ_MODEL_VISION_FB]) {
    try {
      const res = await _groqFetch(model, messages, 2048);
      if (res.status === 401 || res.status === 403) throw new Error('401');
      if (!res.ok) {
        if (model === GROQ_MODEL_VISION) continue; // tenta fallback
        const body = await res.text().catch(()=>'');
        throw new Error('Groq ' + res.status + ': ' + body.slice(0,120));
      }
      const data = await res.json();
      if (!data.choices?.[0]?.message?.content) throw new Error('Resposta vazia da API');
      return extractJSON(data.choices[0].message.content);
    } catch(e) {
      if (model === GROQ_MODEL_VISION_FB) throw e;
    }
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




