// ═══════════════════════════════════════
// RECIPES
// ═══════════════════════════════════════
const recipesData = [];

let userRecipes = [];
let _sendRecipeId = null;
newRecipeVisibility = 'private'; // reset to default private

async function loadRecipesFromDB() {
  try {
    const uid = currentUser?.id;
    if (!uid) return;
    let query = supabase.from('recipes').select('*');
    if (!isAdmin()) {
      if (isPatient()) {
        // Patients see only recipes sent to them or shared with all patients by their nutritionist
        const nutId = currentProfile?.nutritionist_id;
        if (nutId) {
          query = query.or(`patient_id.eq.${uid},and(visibility.eq.public,author_id.eq.${nutId})`);
        } else {
          query = query.eq('patient_id', uid);
        }
      } else if (isProfessional()) {
        // Professionals see their own recipes (try author_id or user_id)
        query = query.or(`author_id.eq.${uid},user_id.eq.${uid}`);
      } else {
        // Standard users see only their own
        query = query.or(`author_id.eq.${uid},user_id.eq.${uid}`);
      }
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) { console.warn('[loadRecipesFromDB]', error.code, error.message); return; }
    if (!data || !data.length) return;
    userRecipes = data.map(r => ({
      id: r.id, db_id: r.id,
      icon: r.category === 'cafe' ? '☀️' : r.category === 'lanche' ? '🍎' : r.category === 'jantar' ? '🌙' : '<i class="fa-solid fa-utensils ic-recipes"></i>',
      title: r.title || r.name || '--',
      kcal: r.kcal || 0, prot: r.prot || r.protein || 0,
      totalGrams: r.total_grams || null,
      category: [r.category || 'almoco', r.kcal < 250 ? 'lowcal' : null, (r.prot||r.protein||0) > 25 ? 'highprot' : null].filter(Boolean),
      source: r.visibility || 'private',
      author_id: r.author_id || r.user_id, patient_id: r.patient_id,
      approved: r.approved, pending: r.pending,
      ingredients: (() => { try { return typeof r.ingredients === 'string' ? JSON.parse(r.ingredients) : (r.ingredients || []); } catch(e) { return []; } })(),
      steps: (() => { try { return typeof r.steps === 'string' ? JSON.parse(r.steps) : (r.steps || []); } catch(e) { return []; } })(),
    }));
    renderRecipes(currentFilter);
  } catch(e) { console.warn('[loadRecipesFromDB] exception:', e); }
}

async function openSendRecipeModal(recipeId) {
  _sendRecipeId = recipeId;
  const recipe = [...recipesData, ...userRecipes].find(r => r.id == recipeId);
  if (!recipe) { showToast('Receita nao encontrada', 'error'); return; }
  // Load patients and show quick modal
  const { data: links } = await supabase.from('professional_patients').select('patient_id').eq('professional_id', currentUser.id);
  if (!links || !links.length) { showToast('Nenhum paciente vinculado.', 'error'); return; }
  const ids = links.map(l => l.patient_id);
  const { data: patients } = await supabase.from('profiles').select('id,name,email').in('id', ids);
  if (!patients || !patients.length) { showToast('Nenhum paciente encontrado.', 'error'); return; }
  const opts = patients.map(p => `<option value="${p.id}">${p.name || p.email}</option>`).join('');
  const modal = document.getElementById('quickSendRecipeModal');
  document.getElementById('qsrRecipeTitle').textContent = recipe.title;
  document.getElementById('qsrPatientSelect').innerHTML = opts;
  document.getElementById('qsrMealSelect').value = 'almoco';
  modal.classList.add('show');
}

function closeQuickSendRecipeModal() {
  document.getElementById('quickSendRecipeModal').classList.remove('show');
}

async function confirmSendRecipeToPatient() {
  const patientId = document.getElementById('qsrPatientSelect').value;
  const mealSlot  = document.getElementById('qsrMealSelect').value;
  const recipe = [...recipesData, ...userRecipes].find(r => r.id == _sendRecipeId);
  if (!recipe || !patientId) return;

  // Save recipe assignment in Supabase
  await supabase.from('recipes').upsert({
    title: recipe.title, kcal: recipe.kcal, prot: recipe.prot,
    category: mealSlot,
    ingredients: JSON.stringify(recipe.ingredients || []),
    steps: JSON.stringify(recipe.steps || []),
    visibility: 'patient',
    user_id: currentUser.id,
    author_id: currentUser.id,
    patient_id: patientId,
    approved: true,
    pending: false,
    created_at: new Date().toISOString()
  });

  closeQuickSendRecipeModal();
  showToast('<i class="fa-solid fa-circle-check ic-check"></i> Receita enviada para o paciente!');
}
let currentFilter = 'all';

function toggleRecipeForm() {
  const form = document.getElementById('recipeAddForm');
  form.classList.toggle('open');
  if (form.classList.contains('open')) {
    // Set default visibility based on role
    if (isProfessional()) {
      loadPatientsForRecipe();
      // Default: send to all patients
      newRecipeVisibility = 'all_patients';
      document.querySelectorAll('.visibility-btn').forEach(b => b.classList.remove('active'));
      document.getElementById('visAllPatients')?.classList.add('active');
      document.getElementById('visPatient').style.display = 'flex';
    } else {
      // Standard pro: only private
      newRecipeVisibility = 'private';
      document.querySelectorAll('.visibility-btn').forEach(b => b.classList.remove('active'));
      document.getElementById('visPrivate')?.classList.add('active');
      const visAllPatientsBtn = document.getElementById('visAllPatients');
      if (visAllPatientsBtn) visAllPatientsBtn.style.display = 'none';
    }
  }
}

function previewRecipePhotos(event) {
  const files = Array.from(event.target.files);
  const preview = document.getElementById('recipePhotoPreview');
  preview.innerHTML = '';
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = document.createElement('img');
      img.src = e.target.result;
      img.style.cssText = 'width:70px;height:70px;object-fit:cover;border-radius:8px;border:2px solid var(--green-light);';
      preview.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
}

function setVisibility(type, btn) {
  newRecipeVisibility = type;
  document.querySelectorAll('.visibility-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('patientSelectField').style.display = type === 'patient' ? 'block' : 'none';
}

function openAiRecipeModal() { document.getElementById('aiRecipeModal').classList.add('show'); }
function closeAiRecipeModal() {
  document.getElementById('aiRecipeModal').classList.remove('show');
  document.getElementById('aiRecipeResult').style.display = 'none';
  document.getElementById('aiRecipeLoading').style.display = 'none';
}

async function generateAiRecipe() {
  const food = document.getElementById('cravingFood').value.trim();
  const maxKcal = document.getElementById('cravingKcal').value || 500;
  const minProt = document.getElementById('cravingProt').value || 0;
  if (!food) { showToast('Diga o que você quer comer!', 'error'); return; }

  document.getElementById('aiRecipeLoading').style.display = 'block';
  document.getElementById('aiRecipeResult').style.display = 'none';

  // Build user profile + body fat context
  const p = currentProfile || {};
  const userCtx = [
    p.age ? `idade: ${p.age} anos` : '',
    p.sex ? `sexo: ${p.sex === 'm' ? 'masculino' : 'feminino'}` : '',
    p.weight ? `peso: ${p.weight}kg` : '',
    p.height ? `altura: ${p.height}cm` : '',
    p.body_fat_pct ? `percentual de gordura corporal: ${p.body_fat_pct}%` : ''
  ].filter(Boolean).join(', ');

  let prompt = `Crie uma receita saudável com base nessa vontade: "${food}". A receita deve ter no máximo ${maxKcal} kcal e pelo menos ${minProt}g de proteína.
DADOS DO USUÁRIO: ${userCtx || 'Não informados'}.
Considere o perfil e o percentual de gordura do usuário ao selecionar porções e ingredientes (ex: se o percentual de gordura for alto, prefira menos carboidratos simples e gorduras saturadas; se for baixo/hipertrofia, equilibre carboidratos complexos e proteínas).
Retorne JSON: { title, kcal, prot, totalGrams, servings, time, category, ingredients, steps, tips, storage }`;

  prompt += `
Regras obrigatorias para evitar receita resumida:
- ingredients deve ter 6 a 12 itens com quantidade caseira e peso aproximado.
- steps deve ter 5 a 9 passos detalhados, com tempo, ponto visual, temperatura/fogo quando fizer sentido e ordem clara.
- Inclua rendimento/porcoes, tempo total, dicas de substituicao e armazenamento.
- A pessoa deve conseguir cozinhar seguindo somente a resposta.
- Se retornar tips ou storage, inclua esses campos no JSON.`;

  try {
    const askFn = window.callGroqLarge || window.callGroq;
    const data = await askFn([{ role: 'system', content: 'Retorne SOMENTE JSON valido sem markdown, sem listas soltas e sem texto adicional.' }, { role: 'user', content: prompt }]);

    const el = document.getElementById('aiRecipeResult');
    el.style.display = 'block';
    lastAiRecipeData = data;
    el.innerHTML = `
      <div style="font-family:'Playfair Display',serif;font-size:1.1rem;font-weight:700;color:var(--green-deep);margin-bottom:0.5rem;">${data.title}</div>
      <div style="display:flex;gap:0.4rem;flex-wrap:wrap;margin-bottom:0.75rem;">
        <span class="recipe-chip">🔥 ${data.kcal} kcal</span>
        <span class="recipe-chip yellow">💪 ${data.prot}g prot</span>
        ${data.totalGrams ? `<span class="recipe-chip">⚖️ ${data.totalGrams}g total</span>` : ''}
        <span class="recipe-chip orange">⏱ ${data.time||'—'}</span>
      </div>
      <div style="font-size:0.82rem;color:var(--text-muted);margin-bottom:0.3rem;font-weight:700;">Ingredientes:</div>
      <ul style="font-size:0.82rem;padding-left:1.2rem;margin-bottom:0.6rem;">${(data.ingredients||[]).map(i=>`<li>${typeof i === 'object' && i !== null ? (i.name || i.title || JSON.stringify(i)) : i}</li>`).join('')}</ul>
      <div style="font-size:0.82rem;color:var(--text-muted);margin-bottom:0.3rem;font-weight:700;">Preparo:</div>
      <ol style="font-size:0.82rem;padding-left:1.2rem;margin-bottom:0.75rem;">${(data.steps||[]).map(s=>`<li>${typeof s === 'object' && s !== null ? (s.step || s.text || s.description || JSON.stringify(s)) : s}</li>`).join('')}</ol>
      ${(data.tips||[]).length ? `<div style="font-size:0.82rem;color:var(--text-muted);margin-bottom:0.3rem;font-weight:700;">Dicas:</div><ul style="font-size:0.82rem;padding-left:1.2rem;margin-bottom:0.6rem;">${(data.tips||[]).map(t=>`<li>${typeof t === 'object' && t !== null ? (t.text || t.description || JSON.stringify(t)) : t}</li>`).join('')}</ul>` : ''}
      ${data.storage ? `<div style="font-size:0.82rem;color:var(--text-muted);margin-bottom:0.75rem;"><strong>Armazenamento:</strong> ${typeof data.storage === 'object' ? JSON.stringify(data.storage) : data.storage}</div>` : ''}
      <button onclick="saveAiRecipe()" style="width:100%;background:var(--green-mid);color:white;border:none;border-radius:50px;padding:0.7rem;font-family:'Syne',sans-serif;font-weight:700;cursor:pointer;">
        <i class="fa-solid fa-floppy-disk" style="color:white!important;margin-right:0.3rem;"></i> Salvar esta Receita
      </button>`;
  } catch(e) {
    showToast('Erro ao gerar receita: ' + e.message, 'error');
  } finally {
    document.getElementById('aiRecipeLoading').style.display = 'none';
  }
}

function saveAiRecipe(data) {
  // Use global lastAiRecipeData if no data passed (called from onclick with no args)
  const d = data || lastAiRecipeData;
  if (!d) { showToast('Nenhuma receita gerada ainda.', 'error'); return; }
  // Pre-fill the recipe form with AI-generated data
  closeAiRecipeModal();
  const form = document.getElementById('recipeAddForm');
  if (!form.classList.contains('open')) toggleRecipeForm();
  showPanel('recipes', document.getElementById('nav-recipes'));
  setTimeout(() => {
    document.getElementById('newRecipeName').value = d.title || '';
    document.getElementById('newRecipeKcal').value = d.kcal || '';
    document.getElementById('newRecipeProt').value = d.prot || '';
    document.getElementById('newRecipeTotalGrams').value = d.totalGrams || '';
    document.getElementById('newRecipeIngredients').value = (d.ingredients||[]).map(i=>typeof i === 'object' && i !== null ? (i.name || i.title || JSON.stringify(i)) : i).join('\n');
    document.getElementById('newRecipeSteps').value = (d.steps||[]).map(s=>typeof s === 'object' && s !== null ? (s.step || s.text || s.description || JSON.stringify(s)) : s).join('\n');
    if (d.category) document.getElementById('newRecipeCat').value = d.category;
    showToast('Receita IA preenchida! Revise e salve.');
  }, 200);
}

async function openPatientGoalsModal(patientId, patientName) {
  document.getElementById('patientGoalsPatientId').value = patientId;
  document.getElementById('patientGoalsDesc').textContent = 'Definir metas nutricionais para ' + patientName;
  // Load existing goals
  try {
    const { data } = await supabase.from('user_goals').select('*').eq('user_id', patientId).maybeSingle();
    if (data) {
      document.getElementById('pgKcal').value = data.daily_kcal || '';
      document.getElementById('pgProt').value = data.daily_prot || '';
      document.getElementById('pgCarbs').value = data.daily_carbs || '';
      document.getElementById('pgFat').value = data.daily_fat || '';
    }
  } catch(e) {}
  document.getElementById('patientGoalsModal').classList.add('show');
}

function closePatientGoalsModal() { document.getElementById('patientGoalsModal').classList.remove('show'); }

async function savePatientGoals() {
  const patientId = document.getElementById('patientGoalsPatientId').value;
  const kcal = parseInt(document.getElementById('pgKcal').value) || null;
  const prot = parseInt(document.getElementById('pgProt').value) || null;
  const carbs = parseInt(document.getElementById('pgCarbs').value) || null;
  const fat = parseInt(document.getElementById('pgFat').value) || null;
  if (!patientId || !kcal) { showToast('Preencha ao menos a meta de calorias.', 'error'); return; }

  const goalData = {
    user_id: patientId,
    daily_kcal: kcal,
    daily_prot: prot,
    daily_carbs: carbs,
    daily_fat: fat,
    updated_at: new Date().toISOString()
  };

  // Tenta upsert direto
  let { error } = await supabase.from('user_goals').upsert(goalData, { onConflict: 'user_id' });

  // Se falhar, tenta sem campos opcionais
  if (error) {
    const msg = error.message || '';
    const isColErr = msg.includes('column') || msg.includes('does not exist') || error.code === '42703';
    if (isColErr) {
      const fallback = { user_id: patientId, daily_kcal: kcal, updated_at: goalData.updated_at };
      if (!msg.includes('daily_prot') && prot) fallback.daily_prot = prot;
      if (!msg.includes('daily_carbs') && carbs) fallback.daily_carbs = carbs;
      if (!msg.includes('daily_fat') && fat) fallback.daily_fat = fat;
      const res2 = await supabase.from('user_goals').upsert(fallback, { onConflict: 'user_id' });
      error = res2.error;
    }
  }

  if (error) {
    console.error('[savePatientGoals]', error);
    const isRls = error.message?.includes('policy') || error.message?.includes('row-level') || error.code === '42501' || error.code === 'PGRST301';
    if (isRls) {
      showToast('⚠️ Sem permissão (RLS). Execute no Supabase:\nCREATE POLICY "Nut set goals" ON user_goals FOR ALL USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM professional_patients WHERE professional_id = auth.uid() AND patient_id = user_goals.user_id));', 'error');
      console.warn('SQL necessário para nutricionistas alterarem metas:\n\nCREATE POLICY "Nutritionist set patient goals" ON user_goals\nFOR ALL USING (\n  auth.uid() = user_id\n  OR EXISTS (\n    SELECT 1 FROM professional_patients\n    WHERE professional_id = auth.uid() AND patient_id = user_goals.user_id\n  )\n);');
    } else {
      showToast('Erro ao salvar metas: ' + error.message, 'error');
    }
    return;
  }
  closePatientGoalsModal();
  showToast('<i class="fa-solid fa-bullseye ic-goal"></i> Metas do paciente salvas!');
}

async function loadPatientsForRecipe() {
  const sel = document.getElementById('recipePatientSelect');
  sel.innerHTML = '<option>Carregando...</option>';
  const { data: links, error } = await supabase.from('professional_patients')
    .select('patient_id')
    .eq('professional_id', currentUser.id);
  if (error) console.error('[loadPatientsForRecipe]', error);
  if (!links || links.length === 0) { sel.innerHTML = '<option value="">Nenhum paciente</option>'; return; }
  const ids = links.map(l => l.patient_id);
  const { data: patients, error: pErr } = await supabase.from('profiles').select('id,name,email').in('id', ids);
  if (pErr) console.error('[loadPatientsForRecipe]', pErr);
  if (!patients || patients.length === 0) { sel.innerHTML = '<option value="">Nenhum paciente</option>'; return; }
  sel.innerHTML = patients.map(p => `<option value="${p.id}">${p.name||p.email}</option>`).join('');
}

// ── Detecta quais colunas existem na tabela recipes (cache) ──────────────
let _recipesColumnsCache = null;
async function getRecipesColumns() {
  if (_recipesColumnsCache) return _recipesColumnsCache;
  try {
    // Faz um SELECT vazio só para ver o schema via PostgREST
    const { data, error } = await supabase.from('recipes').select('*').limit(1);
    if (!error && data) {
      // Se retornou linhas, pega as chaves da primeira; se vazio, tenta outra abordagem
      if (data.length > 0) {
        _recipesColumnsCache = new Set(Object.keys(data[0]));
        return _recipesColumnsCache;
      }
    }
    // Fallback: insere payload mínimo e vê o que aceita
    return null;
  } catch(e) { return null; }
}

// Remove do objeto apenas as chaves que NÃO existem na tabela
function filterPayload(obj, knownCols) {
  if (!knownCols) return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (knownCols.has(k)) out[k] = v;
  }
  return out;
}

// Extrai o nome da coluna problemática do erro PGRST204 e outros erros de coluna inexistente do Postgres
function extractBadColumn(errMsg) {
  let m = errMsg.match(/find the '([^']+)' column/);
  if (m) return m[1];
  m = errMsg.match(/column "([^"]+)"/);
  if (m) return m[1];
  m = errMsg.match(/column '([^']+)'/);
  if (m) return m[1];
  return null;
}

// ── Verificação por IA (somente pacientes/standard) ──────────────────────
async function checkRecipeWithAI(name, ingredients, steps, kcal, prot) {
  try {
    const prompt = `Você é um moderador de receitas de uma plataforma de nutrição. Avalie se a receita abaixo é saudável e adequada para publicação.

Receita: "${name}"
Calorias: ${kcal} kcal | Proteínas: ${prot}g
Ingredientes: ${ingredients.join(', ')}
Preparo: ${steps.join(' ')}

Responda SOMENTE com JSON (sem markdown):
{"aprovado": true, "motivo": ""}
ou
{"aprovado": false, "motivo": "Motivo claro em português."}

Rejeite APENAS se contiver ingredientes claramente perigosos, quantidades absurdas de substâncias nocivas, ou conteúdo que não seja comida de verdade. Receitas normais devem ser aprovadas.`;

    const data = await askClaude(prompt, 'Retorne SOMENTE JSON válido sem markdown.');
    return { approved: !!data.aprovado, reason: data.motivo || '' };
  } catch(e) {
    console.warn('[submitRecipe] Falha na checagem IA, aprovando por padrão:', e);
    return { approved: true, reason: '' }; // fail-open
  }
}

async function submitRecipe() {
  const name = document.getElementById('newRecipeName').value.trim();
  const kcal = parseInt(document.getElementById('newRecipeKcal').value) || 0;
  const prot = parseInt(document.getElementById('newRecipeProt').value) || 0;
  const totalGrams = parseInt(document.getElementById('newRecipeTotalGrams').value) || null;
  const cat = document.getElementById('newRecipeCat').value;
  const ingText = document.getElementById('newRecipeIngredients').value.trim();
  const stepsText = document.getElementById('newRecipeSteps').value.trim();
  if (!name || !ingText || !stepsText) { showToast('Preencha todos os campos', 'error'); return; }

  const ingredients = ingText.split('\n').filter(Boolean);
  const steps = stepsText.split('\n').filter(Boolean);
  const patientId = newRecipeVisibility === 'patient' ? document.getElementById('recipePatientSelect').value : null;
  const dbVisibility = newRecipeVisibility === 'all_patients' ? 'public'
    : newRecipeVisibility === 'patient' ? 'patient'
    : 'private';

  // ── Verificação IA: apenas pacientes e usuários padrão ──
  const userRole = getUserRole();
  const needsAICheck = userRole === 'patient' || userRole === 'standard';
  if (needsAICheck) {
    showToast('🤖 Verificando receita com IA...');
    const aiResult = await checkRecipeWithAI(name, ingredients, steps, kcal, prot);
    if (!aiResult.approved) {
      document.getElementById('aiRejectReason').textContent = aiResult.reason || 'A receita não atende aos critérios de qualidade nutricional.';
      document.getElementById('aiRejectRecipeModal').classList.add('show');
      return; // não salva
    }
  }

  showToast('💾 Salvando receita...');

  // Objeto local (memória)
  const recipe = {
    id: Date.now(), icon: '<i class="fa-solid fa-utensils ic-recipes"></i>',
    title: name, kcal, prot, totalGrams,
    category: [cat, kcal < 250 ? 'lowcal' : null, prot > 25 ? 'highprot' : null].filter(Boolean),
    source: dbVisibility, ingredients, steps,
    author: currentProfile?.name || 'Usuário',
    author_id: currentUser?.id, patient_id: patientId,
    pending: false, approved: true
  };

  // Payload completo (com TODOS os possíveis nomes de colunas)
  const fullPayload = {
    title: name, kcal, prot, total_grams: totalGrams, category: cat,
    ingredients: ingredients,
    steps: steps,
    visibility: dbVisibility,
    user_id: currentUser.id, author_id: currentUser.id,
    patient_id: patientId, approved: true, pending: false,
    created_at: new Date().toISOString()
  };

  // Fetch schema columns cache to filter payload proactively
  const knownCols = await getRecipesColumns();
  let payload = {};
  if (knownCols) {
    payload = filterPayload(fullPayload, knownCols);
  } else {
    payload = { ...fullPayload };
  }

  let savedRecipe = null, saveErr = null;

  for (let attempt = 0; attempt < 10; attempt++) {
    const { data, error } = await supabase.from('recipes').insert(payload).select();
    if (!error) { savedRecipe = data?.[0]; saveErr = null; break; }

    saveErr = error;
    const msg = error.message || '';
    const code = error.code || '';
    const isArrayTypeMismatch = msg.includes('array') || msg.includes('text[]') || msg.includes('jsonb') || msg.includes('invalid input format');
    const isSchemaErr = msg.includes('column') || msg.includes('does not exist') || code === 'PGRST204' || code === '42703';
    const isRlsErr = msg.includes('policy') || msg.includes('row-level') || code === '42501' || code === 'PGRST301';

    console.warn(`[submitRecipe] Tentativa ${attempt+1} falhou (${code}):`, msg);

    if (isRlsErr) break; // RLS — não adianta remover campos
    
    if (isArrayTypeMismatch) {
      if (typeof payload.ingredients !== 'string') {
        payload.ingredients = JSON.stringify(ingredients);
        payload.steps = JSON.stringify(steps);
        continue;
      }
    }

    if (!isSchemaErr) break; // Erro desconhecido — para

    // Remove APENAS a coluna específica que causou o erro
    const badCol = extractBadColumn(msg);
    if (badCol && payload[badCol] !== undefined) {
      console.info(`[submitRecipe] Removendo coluna inexistente: ${badCol}`);
      const { [badCol]: _, ...rest } = payload;
      payload = rest;
    } else {
      // Não conseguiu identificar a coluna — tenta payload absolutamente mínimo
      payload = { user_id: currentUser.id, ingredients: JSON.stringify(ingredients),
        steps: JSON.stringify(steps), created_at: new Date().toISOString() };
      const { data: d2, error: e2 } = await supabase.from('recipes').insert(payload).select('id').single();
      if (!e2) { savedRecipe = d2; saveErr = null; }
      else { saveErr = e2; }
      break;
    }
  }

  if (saveErr) {
    console.error('[submitRecipe] Erro final:', saveErr);
    userRecipes.push(recipe); // salva localmente mesmo assim
    const isRls = (saveErr.message||'').includes('policy') || (saveErr.message||'').includes('row-level') || saveErr.code === '42501' || saveErr.code === 'PGRST301';
    showToast('<i class="fa-solid fa-triangle-exclamation ic-alert"></i> ' +
      (isRls ? '⚠️ Sem permissão (RLS). Verifique políticas da tabela "recipes".' : 'Erro ao salvar: ' + (saveErr.message || saveErr.code)), 'error');
  } else {
    recipe.id = savedRecipe?.id || recipe.id;
    recipe.db_id = savedRecipe?.id;
    userRecipes.push(recipe);
    showToast('<i class="fa-solid fa-circle-check ic-check"></i> Receita salva!');
  }

  toggleRecipeForm();
  renderRecipes(currentFilter);
  document.getElementById('newRecipeName').value = '';
  document.getElementById('newRecipeKcal').value = '';
  document.getElementById('newRecipeProt').value = '';
  document.getElementById('newRecipeTotalGrams').value = '';
  document.getElementById('newRecipeIngredients').value = '';
  document.getElementById('newRecipeSteps').value = '';
  document.getElementById('recipePhotoPreview').innerHTML = '';
}

function getVisibleRecipes() {
  const all = [...recipesData, ...userRecipes.filter(r => r.approved || r.source === 'mine' || r.source === 'private')];
  if (!currentProfile) return [];
  // Patients see only recipes sent to them by their nutritionist
  if (currentProfile.role === 'patient') {
    return all.filter(r => r.patient_id === currentUser?.id || r.author_id === currentUser?.id);
  }
  // Professionals see their own recipes + patient-targeted ones they created
  if (isProfessional()) {
    return all.filter(r => r.author_id === currentUser?.id || r.source === 'private' || r.patient_id);
  }
  // Standard pro users see only their own recipes
  if (isStandardPro() || isAdmin()) return all.filter(r => r.author_id === currentUser?.id || isAdmin());
  return [];
}

function renderRecipes(filter) {
  currentFilter = filter;
  const grid = document.getElementById('recipesGrid');
  let recipes = getVisibleRecipes();

  if (filter === 'all') {}
  else if (filter === 'mine') recipes = recipes.filter(r => r.author_id === currentUser?.id || r.source === 'mine');
  else recipes = recipes.filter(r => r.category.includes(filter));

  if (recipes.length === 0) {
    grid.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:2rem;">Nenhuma receita encontrada.</p>';
    return;
  }

  grid.innerHTML = recipes.map(r => `
    <div class="recipe-card" data-recipe-id="${String(r.id).replace(/"/g,'&quot;')}">
      <div class="recipe-thumb" style="background:${r.kcal<250?'var(--green-pale)':r.kcal<350?'var(--yellow-pale)':'var(--orange-pale)'};">${r.icon}</div>
      <div class="recipe-body">
        <div class="recipe-title">${r.title}</div>
        <div class="recipe-meta">
          <span class="recipe-chip">🔥 ${r.kcal} kcal</span>
          <span class="recipe-chip orange">⏱ ${r.time||'—'}</span>
          <span class="recipe-chip yellow"><i class="fa-solid fa-dumbbell ic-fire"></i> ${r.prot}g prot</span>
          ${r.totalGrams ? `<span class="recipe-chip" style="background:var(--green-pale);color:var(--green-deep);">⚖️ ${r.totalGrams >= 1000 ? (r.totalGrams/1000).toFixed(1)+'kg' : r.totalGrams+'g'}</span>` : ''}
          <span class="recipe-chip purple"><i class="fa-solid fa-lock ic-lock"></i> Privada</span>
          ${r.pending?'<span class="ai-review-badge">🤖 Pendente</span>':''}
        </div>
      </div>
    </div>
  `).join('');
  // Attach click events safely (avoids quote escaping issues with UUIDs)
  grid.querySelectorAll('.recipe-card[data-recipe-id]').forEach(card => {
    card.addEventListener('click', () => openRecipe(card.dataset.recipeId));
  });
}

function filterRecipes(f, btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderRecipes(f);
}

function openRecipe(id) {
  const all = [...recipesData, ...userRecipes];
  const r = all.find(x => x.id == id);
  if (!r) return;

  // Notify nutritionist if patient is viewing
  if (isPatient()) {
    notifyNutritionistRecipeView(r.title).catch(e => console.warn('[recipe notify]', e));
  }

  const totalLabel = r.totalGrams
    ? `<span class="recipe-chip" style="background:var(--green-pale);color:var(--green-deep);">⚖️ Total: ${r.totalGrams >= 1000 ? (r.totalGrams/1000).toFixed(1)+'kg' : r.totalGrams+'g'}</span>`
    : '';

  const photosHtml = r.photos && r.photos.length
    ? `<div style="margin-bottom:1rem;"><div class="modal-section-title">Fotos</div><div style="display:flex;gap:0.5rem;flex-wrap:wrap;">${r.photos.map(p => `<img src="${p}" style="width:80px;height:80px;object-fit:cover;border-radius:10px;cursor:pointer;" onclick="openPhotoLightbox('${p}')">`).join('')}</div></div>`
    : '';

  document.getElementById('recipeModalContent').innerHTML = `
    <button class="modal-close" onclick="closeModal()">✕</button>
    <div style="text-align:center;font-size:3.5rem;margin-bottom:0.5rem;">${r.icon}</div>
    <div class="modal-title" style="text-align:center;">${r.title}</div>
    <div style="display:flex;gap:0.5rem;flex-wrap:wrap;justify-content:center;margin-bottom:1rem;">
      <span class="recipe-chip">🔥 ${r.kcal} kcal</span>
      ${r.time?`<span class="recipe-chip orange">⏱ ${r.time}</span>`:''}
      <span class="recipe-chip yellow"><i class="fa-solid fa-dumbbell ic-fire"></i> ${r.prot}g proteína</span>
      ${totalLabel}
    </div>
    ${photosHtml}
    <div class="modal-section-title">Ingredientes</div>
    <ul class="ingredient-list">${r.ingredients.map(i=>`<li>${i}</li>`).join('')}</ul>
    <div class="modal-section-title">Modo de preparo</div>
    <ol class="step-list">${r.steps.map(s=>`<li>${s}</li>`).join('')}</ol>
    <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:1rem;">
      <select id="recipeDiaryMealSelect" class="form-select" style="flex:1;min-width:140px;max-width:160px;">
        <option value="cafe">☕ Café da manhã</option>
        <option value="almoco" selected>🍽️ Almoço</option>
        <option value="lanche">🍎 Lanche</option>
        <option value="jantar">🌙 Jantar</option>
      </select>
      <button onclick="addRecipeToDiary('${String(id)}')" style="flex:1;min-width:130px;background:var(--green-mid);color:white;border:none;border-radius:50px;padding:0.75rem;font-family:'Syne',sans-serif;font-weight:700;cursor:pointer;font-size:0.85rem;" onmouseover="this.style.background='var(--green-deep)'" onmouseout="this.style.background='var(--green-mid)'"><i class="fa-solid fa-book" style="color:white!important;margin-right:0.3rem;"></i> Diário (${r.kcal} kcal)</button>
      ${isProfessional() ? `<button onclick="openSendRecipeModal('${String(id)}')" style="flex:1;min-width:110px;background:#388e3c;color:white;border:none;border-radius:50px;padding:0.75rem;font-family:'Syne',sans-serif;font-weight:700;cursor:pointer;font-size:0.85rem;"><i class="fa-solid fa-paper-plane" style="color:white!important;margin-right:0.3rem;"></i> Enviar</button>` : ''}
      <button onclick="shareRecipeAsPdf('${String(id)}')" style="flex:1;min-width:110px;background:var(--green-pale);color:var(--green-deep);border:1px solid var(--border);border-radius:50px;padding:0.75rem;font-family:'Syne',sans-serif;font-weight:700;cursor:pointer;font-size:0.85rem;"><i class="fa-solid fa-share-nodes" style="color:var(--green-deep)!important;margin-right:0.3rem;"></i> Compartilhar</button>
    </div>
  `;
  document.getElementById('recipeModal').classList.add('show');
}

async function notifyNutritionistRecipeView(recipeTitle) {
  if (!currentUser) return;
  let nutId = currentProfile?.nutritionist_id || null;
  if (!nutId) {
    try {
      const { data } = await supabase.from('professional_patients').select('professional_id').eq('patient_id', currentUser.id).maybeSingle();
      nutId = data?.professional_id || null;
      if (nutId && currentProfile) currentProfile.nutritionist_id = nutId;
    } catch(e) {}
  }
  if (!nutId) return;
  try {
    await supabase.from('chat_messages').insert({
      nutritionist_id: nutId,
      patient_id: currentUser.id,
      sender_id: currentUser.id,
      content: '📋 ' + (currentProfile?.name || 'Seu paciente') + ' visualizou a receita: "' + recipeTitle + '"',
      type: 'text',
      created_at: new Date().toISOString()
    });
  } catch(e) { /* silently fail */ }
}

async function shareRecipeAsPdf(id) {
  const all = [...recipesData, ...userRecipes];
  const r = all.find(x => x.id == id);
  if (!r) return;

  // Try Native Share first if supported
  if (navigator.share) {
    try {
      const fmtIng = r.ingredients.map(i => typeof i === 'object' && i !== null ? (i.name || i.title || JSON.stringify(i)) + (i.qty ? ` (${i.qty})` : '') : i).join('\n');
      const fmtStep = r.steps.map(s => typeof s === 'object' && s !== null ? (s.step || s.text || s.description || JSON.stringify(s)) : s).join('\n');
      await navigator.share({
        title: r.title,
        text: `Receita: ${r.title}\nCalorias: ${r.kcal} kcal\nProteínas: ${r.prot}g\n\nIngredientes:\n${fmtIng}\n\nModo de Preparo:\n${fmtStep}`
      });
      showToast('<i class="fa-solid fa-circle-check ic-check"></i> Receita compartilhada!');
      return;
    } catch(err) {
      console.warn('[Share] Web Share API failed/cancelled, falling back to PDF:', err);
    }
  }

  const logoB64 = LOGO_LIGHT_B64;
  const logoSvg = `<img src="${logoB64}" width="48" height="48" style="border-radius:8px;">`;

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${r.title} — CalorIA</title>
  <style>
    @media print { body { margin: 0; } .no-print { display: none !important; } }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 32px 28px; color: #1a2e1b; background: #fff; }
    .header { display: flex; align-items: center; gap: 14px; border-bottom: 3px solid #2a5c30; padding-bottom: 16px; margin-bottom: 22px; }
    .brand { font-size: 1.5rem; font-weight: 900; color: #2a5c30; letter-spacing: -0.5px; }
    .brand span { color: #f5a623; }
    h1 { font-size: 1.8rem; font-weight: 900; color: #1a4a1f; margin-bottom: 12px; }
    .chips { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px; }
    .chip { background: #e8f5e9; color: #1a4a1f; padding: 5px 14px; border-radius: 20px; font-size: 0.88rem; font-weight: 700; border: 1px solid #a5d6a7; }
    .chip.kcal { background: #fff3e0; border-color: #ffcc80; }
    .chip.prot { background: #e8f5e9; border-color: #a5d6a7; }
    h3 { font-size: 1.05rem; font-weight: 800; color: #2a5c30; margin: 22px 0 10px; padding-bottom: 4px; border-bottom: 1px solid #e0f2e0; text-transform: uppercase; letter-spacing: 0.5px; }
    ul, ol { padding-left: 1.4rem; line-height: 2; color: #2e3d2f; font-size: 0.95rem; }
    li { margin-bottom: 2px; }
    .footer { margin-top: 32px; font-size: 0.72rem; color: #888; border-top: 1px solid #ddd; padding-top: 14px; }
    .lgpd-note { font-size: 0.68rem; color: #aaa; margin-top: 6px; }
    .btn-print { display: block; margin: 20px auto 28px; padding: 12px 32px; background: #2a5c30; color: white; border: none; border-radius: 50px; font-size: 1rem; font-weight: 700; cursor: pointer; font-family: inherit; }
    .btn-print:hover { background: #1a4a1f; }
  </style>
  </head><body>
  <div class="header">
    ${logoSvg}
    <div class="brand">Calor<span>IA</span></div>
  </div>
  <button class="btn-print no-print" onclick="window.print()">🖨️ Salvar como PDF / Imprimir</button>
  <h1>${r.title}</h1>
  <div class="chips">
    <span class="chip kcal">🔥 ${r.kcal} kcal</span>
    ${r.time ? `<span class="chip">⏱ ${r.time}</span>` : ''}
    <span class="chip prot">💪 ${r.prot}g proteína</span>
    ${r.totalGrams ? `<span class="chip">⚖️ Total: ${r.totalGrams >= 1000 ? (r.totalGrams/1000).toFixed(1)+'kg' : r.totalGrams+'g'}</span>` : ''}
  </div>
  <h3>🥗 Ingredientes</h3>
  <ul>${r.ingredients.map(i=>`<li>${typeof i === 'object' && i !== null ? (i.name || i.title || JSON.stringify(i)) + (i.qty ? ` (${i.qty})` : '') : i}</li>`).join('')}</ul>
  <h3>📋 Modo de preparo</h3>
  <ol>${r.steps.map(s=>`<li>${typeof s === 'object' && s !== null ? (s.step || s.text || s.description || JSON.stringify(s)) : s}</li>`).join('')}</ol>
  <div class="footer">
    <span>Gerado pelo CalorIA — ${new Date().toLocaleDateString('pt-BR')}</span>
  </div>
  <p class="lgpd-note">🔒 Seus dados são protegidos conforme a LGPD (Lei 13.709/2018). Esta receita é para uso pessoal.</p>
  <script>window.onload=function(){window.print();}<\/script>
  </body></html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (!win) {
    // fallback if popup blocked
    const a = document.createElement('a');
    a.href = url;
    a.download = r.title.replace(/\s+/g, '_') + '_receita.html';
    a.click();
  }
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  showToast('<i class="fa-solid fa-file-pdf ic-alert"></i> Abrindo receita para salvar como PDF!');
}

function closeModal() { document.getElementById('recipeModal').classList.remove('show'); }

function addRecipeToDiary(id) {
  const all = [...recipesData, ...userRecipes];
  const r = all.find(x => x.id === id);
  if (!r) return;
  const _meal = document.getElementById('recipeDiaryMealSelect')?.value || document.getElementById('diaryMealSelect')?.value || 'almoco';
  addToDiaryMeal(_meal, { name:r.title, kcal:r.kcal, carbs:Math.round(r.kcal*0.45/4), prot:r.prot, fat:Math.round(r.kcal*0.25/9) });
  closeModal();
  showPanel('diary', null); setBottomNav('diary');
}

// Expor funções e dados para o escopo global
window.recipesData = recipesData;
window.userRecipes = userRecipes;
window.loadRecipesFromDB = typeof loadRecipesFromDB !== 'undefined' ? loadRecipesFromDB : undefined;
window.openSendRecipeModal = typeof openSendRecipeModal !== 'undefined' ? openSendRecipeModal : undefined;
window.closeQuickSendRecipeModal = typeof closeQuickSendRecipeModal !== 'undefined' ? closeQuickSendRecipeModal : undefined;
window.confirmSendRecipeToPatient = typeof confirmSendRecipeToPatient !== 'undefined' ? confirmSendRecipeToPatient : undefined;
window.renderRecipes = typeof renderRecipes !== 'undefined' ? renderRecipes : undefined;
window.filterRecipes = typeof filterRecipes !== 'undefined' ? filterRecipes : undefined;
window.openNewRecipeModal = typeof openNewRecipeModal !== 'undefined' ? openNewRecipeModal : undefined;
window.closeNewRecipeModal = typeof closeNewRecipeModal !== 'undefined' ? closeNewRecipeModal : undefined;
window.addNewRecipeIngredient = typeof addNewRecipeIngredient !== 'undefined' ? addNewRecipeIngredient : undefined;
window.removeNewRecipeIngredient = typeof removeNewRecipeIngredient !== 'undefined' ? removeNewRecipeIngredient : undefined;
window.addNewRecipeStep = typeof addNewRecipeStep !== 'undefined' ? addNewRecipeStep : undefined;
window.removeNewRecipeStep = typeof removeNewRecipeStep !== 'undefined' ? removeNewRecipeStep : undefined;
window.togglePatientSelect = typeof togglePatientSelect !== 'undefined' ? togglePatientSelect : undefined;
window.setRecipeVisibility = typeof setRecipeVisibility !== 'undefined' ? setRecipeVisibility : undefined;
window.saveNewRecipe = typeof saveNewRecipe !== 'undefined' ? saveNewRecipe : undefined;
window.openRecipeDetails = typeof openRecipeDetails !== 'undefined' ? openRecipeDetails : undefined;
window.printRecipePDF = typeof printRecipePDF !== 'undefined' ? printRecipePDF : undefined;
window.closeRecipeModal = closeModal; // Expor como closeRecipeModal para evitar conflitos com outros closeModals se existirem
window.shareRecipeAsPdf = shareRecipeAsPdf;
window.addRecipeToDiary = addRecipeToDiary;
window.openPatientGoalsModal = openPatientGoalsModal;
window.toggleRecipeForm = toggleRecipeForm;
window.openAiRecipeModal = openAiRecipeModal;
window.closeAiRecipeModal = closeAiRecipeModal;
window.generateAiRecipe = generateAiRecipe;
window.saveAiRecipe = saveAiRecipe;
window.submitRecipe = submitRecipe;
window.setVisibility = setVisibility;
window.previewRecipePhotos = previewRecipePhotos;
window.closeModal = closeModal;

