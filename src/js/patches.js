// ═══════════════════════════════════════
// FEATURE 1: SUGAR & WATER TRACKING
// ═══════════════════════════════════════
// Variáveis globais declaradas em globals.js


async function loadGoalFromDB() {
  if (!currentUser) return;
  const { data } = await supabase.from('user_goals').select('daily_kcal,daily_sugar,daily_water').eq('user_id',currentUser.id).maybeSingle();
  if (data) {
    diaryGoal      = data.daily_kcal  || 2000;
    diaryGoalSugar = data.daily_sugar || 25;
    diaryGoalWater = data.daily_water || 2000;
    const gi = document.getElementById('goalInput');
    if (gi) gi.value = diaryGoal;
    const gs = document.getElementById('goalSugarInput');
    if (gs) gs.value = diaryGoalSugar;
    const gw = document.getElementById('goalWaterInput');
    if (gw) gw.value = diaryGoalWater;
  }
}

async function saveGoalToDB(kcal) {
  if (!currentUser) return;
  const sugar = parseInt(document.getElementById('goalSugarInput')?.value) || diaryGoalSugar;
  const water = parseInt(document.getElementById('goalWaterInput')?.value) || diaryGoalWater;
  await supabase.from('user_goals').upsert({
    user_id: currentUser.id,
    daily_kcal:  kcal,
    daily_sugar: sugar,
    daily_water: water,
    updated_at:  new Date().toISOString()
  }, { onConflict: 'user_id' });
}

async function addWater(ml) {
  diaryWaterMl = Math.max(0, diaryWaterMl + ml);
  if (currentUser) {
    try {
      await supabase.from('diary_water').upsert({
        user_id: currentUser.id,
        date: diaryDate,
        ml: diaryWaterMl,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,date' });
    } catch(e) {
      console.warn('[CalorIA] diary_water: erro ao salvar água:', e);
    }
  }
  updateWaterDisplay();
  const diff = ml > 0 ? `+${ml}ml` : `${ml}ml`;
  showToast(`<i class="fa-solid fa-droplet ic-water"></i> ${diff} → ${diaryWaterMl}ml de ${diaryGoalWater}ml`);
}

async function loadWaterForDate(date) {
  if (!currentUser) return;
  try {
    const { data } = await supabase.from('diary_water').select('ml').eq('user_id', currentUser.id).eq('date', date).maybeSingle();
    diaryWaterMl = data?.ml || 0;
  } catch(e) { diaryWaterMl = 0; }
  updateWaterDisplay();
}

function updateWaterDisplay() {
  const el = document.getElementById('diaryWaterVal');
  const bar = document.getElementById('diaryWaterBar');
  const goalEl = document.getElementById('diaryWaterGoalDisplay');
  if (el) el.textContent = diaryWaterMl;
  if (goalEl) goalEl.textContent = diaryGoalWater;
  if (bar) {
    const pct = Math.min((diaryWaterMl / diaryGoalWater) * 100, 100);
    bar.style.width = pct + '%';
    bar.classList.toggle('over', diaryWaterMl > diaryGoalWater * 1.5);
  }
}

// Override updateDiaryProgress to also track sugar and update water/sugar goals display
window.updateDiaryProgress = function() {
  const all = [...diary.cafe, ...diary.almoco, ...diary.lanche, ...diary.jantar];
  const totalKcal  = all.reduce((s,i) => s+i.kcal, 0);
  const totalCarbs = all.reduce((s,i) => s+(i.carbs||0), 0);
  const totalProt  = all.reduce((s,i) => s+(i.prot||0), 0);
  const totalFat   = all.reduce((s,i) => s+(i.fat||0), 0);
  const totalSugar = all.reduce((s,i) => s+(i.sugar||0), 0);

  document.getElementById('diaryKcalConsumed').textContent = Math.round(totalKcal);
  const rem    = diaryGoal - totalKcal;
  const remEl  = document.getElementById('diaryRemaining');
  if (rem >= 0) {
    remEl.textContent = rem.toFixed(0) + ' kcal restantes para sua meta';
    remEl.style.color = rem < diaryGoal * 0.1 ? 'var(--yellow-hot)' : '';
  } else {
    remEl.innerHTML = Math.abs(rem).toFixed(0) + ' kcal acima da meta <i class="fa-solid fa-triangle-exclamation ic-alert"></i>';
    remEl.style.color = '#e53935';
  }
  document.getElementById('diaryGoalDisplay').textContent = diaryGoal;

  const pct = Math.min((totalKcal / diaryGoal) * 100, 100);
  const bar = document.getElementById('diaryProgressBar');
  bar.style.width = pct + '%';
  bar.classList.toggle('over', totalKcal > diaryGoal);

  document.getElementById('diaryCarbsVal').textContent = totalCarbs.toFixed(0) + 'g';
  document.getElementById('diaryProtVal').textContent  = totalProt.toFixed(0)  + 'g';
  document.getElementById('diaryFatVal').textContent   = totalFat.toFixed(0)   + 'g';

  const carbGoal = (diaryGoal * 0.50) / 4;
  const protGoal = (diaryGoal * 0.25) / 4;
  const fatGoal  = (diaryGoal * 0.25) / 9;
  document.getElementById('diaryCarbsBar').style.width = Math.min((totalCarbs/carbGoal)*100, 100) + '%';
  document.getElementById('diaryProtBar').style.width  = Math.min((totalProt/protGoal)*100, 100)  + '%';
  document.getElementById('diaryFatBar').style.width   = Math.min((totalFat/fatGoal)*100, 100)    + '%';

  // Sugar bar
  const sugarEl  = document.getElementById('diarySugarVal');
  const sugarBar = document.getElementById('diarySugarBar');
  const sugarGoalEl = document.getElementById('diarySugarGoalDisplay');
  if (sugarEl) sugarEl.textContent = totalSugar.toFixed(1) + 'g';
  if (sugarGoalEl) sugarGoalEl.textContent = diaryGoalSugar;
  if (sugarBar) {
    const sp = Math.min((totalSugar / diaryGoalSugar) * 100, 100);
    sugarBar.style.width = sp + '%';
    sugarBar.classList.toggle('over', totalSugar > diaryGoalSugar);
  }

  // Water display
  updateWaterDisplay();

  // Topbar
  document.getElementById('topbarKcalText').textContent = `${Math.round(totalKcal)} / ${diaryGoal} kcal`;
  const topFill = document.getElementById('topbarKcalFill');
  topFill.style.width = pct + '%';
  topFill.classList.toggle('over', totalKcal > diaryGoal);

  updateHomePanel();
}

// Override saveGoal to also save sugar/water goals
async function saveGoal() {
  diaryGoal      = parseInt(document.getElementById('goalInput').value) || 2000;
  diaryGoalSugar = parseInt(document.getElementById('goalSugarInput')?.value) || 25;
  diaryGoalWater = parseInt(document.getElementById('goalWaterInput')?.value) || 2000;
  updateDiaryProgress();
  buildWeeklyGrid();
  document.getElementById('goalInsight').innerHTML =
    `<i class="fa-solid fa-circle-check ic-check"></i> Metas salvas: <strong>${diaryGoal} kcal</strong> · açúcar máx. <strong>${diaryGoalSugar}g</strong> · água <strong>${diaryGoalWater}ml</strong>`;
  await saveGoalToDB(diaryGoal);
  showToast('<i class="fa-solid fa-bullseye ic-goal"></i> Metas salvas!');
}

// Override calcCalories to also calculate sugar/water goals
async function calcCalories() {
  const sex      = document.getElementById('calcSex').value;
  const age      = parseInt(document.getElementById('calcAge').value);
  const weight   = parseFloat(document.getElementById('calcWeight').value);
  const height   = parseFloat(document.getElementById('calcHeight').value);
  const activity = parseFloat(document.getElementById('calcActivity').value);

  let tmb = sex === 'm'
    ? 88.362 + (13.397*weight) + (4.799*height) - (5.677*age)
    : 447.593 + (9.247*weight) + (3.098*height) - (4.330*age);
  const tdee  = Math.round(tmb * activity);
  const goal  = tdee + currentGoalDelta;
  const carbs = Math.round((goal*0.50)/4);
  const prot  = Math.round((goal*0.25)/4);
  const fat   = Math.round((goal*0.25)/9);

  // Açúcar: OMS recomenda <10% das calorias = <25g (meta estrita) ou <50g (limite)
  const sugarGoal = Math.round((goal * 0.05) / 4); // 5% das kcal
  // Água: 35ml por kg de peso corporal (IOM)
  const waterGoal = Math.round(weight * 35);

  diaryGoalSugar = Math.max(25, sugarGoal);
  diaryGoalWater = Math.max(1500, waterGoal);

  document.getElementById('calcTMB').textContent  = Math.round(tmb);
  document.getElementById('calcTDEE').textContent = tdee;
  document.getElementById('calcGoalVal').textContent = goal;
  document.getElementById('calcMacroCarbs').textContent = carbs + 'g';
  document.getElementById('calcMacroProt').textContent  = prot  + 'g';
  document.getElementById('calcMacroFat').textContent   = fat   + 'g';

  // Atualiza os campos de meta na aba Meta Semanal
  const gsi = document.getElementById('goalSugarInput');
  const gwi = document.getElementById('goalWaterInput');
  if (gsi) gsi.value = diaryGoalSugar;
  if (gwi) gwi.value = diaryGoalWater;

  const advice = currentGoalDelta < 0
    ? `<i class="fa-solid fa-lightbulb ic-star"></i> Para emagrecer com saúde, mantenha déficit moderado e priorize proteínas. Limite açúcar a <strong>${diaryGoalSugar}g/dia</strong> e beba <strong>${diaryGoalWater}ml</strong> de água.`
    : currentGoalDelta > 0
    ? `<i class="fa-solid fa-lightbulb ic-star"></i> Para ganhar massa, distribua em 5–6 refeições. Hidratação recomendada: <strong>${diaryGoalWater}ml/dia</strong>.`
    : `<i class="fa-solid fa-lightbulb ic-star"></i> Para manter o peso, foque na qualidade nutricional. Açúcar livre: máx. <strong>${diaryGoalSugar}g/dia</strong>. Água: <strong>${diaryGoalWater}ml/dia</strong>.`;
  document.getElementById('calcAdvice').innerHTML = advice;
  document.getElementById('calcResult').classList.add('show');

  diaryGoal = goal;
  document.getElementById('goalInput').value = goal;
  updateDiaryProgress();
  await saveGoalToDB(goal);

  try {
    await supabase.from('profiles').update({ sex, age, weight, height }).eq('id', currentUser.id);
    currentProfile = { ...currentProfile, sex, age, weight, height };
  } catch(e) { console.warn('[CalorIA] sync profile:', e); }

  showToast(`<i class="fa-solid fa-bullseye ic-goal"></i> Meta: ${goal} kcal · açúcar máx. ${diaryGoalSugar}g · água ${diaryGoalWater}ml`);
}

// ═══════════════════════════════════════
// FEATURE 2: DISEASE-SPECIFIC FORM REDIRECT (AI)
// Already partially exists — extend with AI suggestion on patient load
// ═══════════════════════════════════════
async function suggestDiseaseFormForPatient(patientId, diseases) {
  if (!diseases || diseases.length === 0) return;
  const diseaseList = Array.isArray(diseases) ? diseases.join(', ') : diseases;
  try {
    const data = await askClaude(
      `Paciente com: ${diseaseList}. Quais perguntas adicionais uma nutricionista deveria fazer na consulta? Retorne JSON: { title: string, questions: [{label:string, type:'text'|'select'|'number', options?:string[]}] } com no máximo 8 perguntas relevantes para as doenças listadas.`,
      'Você é especialista em nutrição clínica. Retorne SOMENTE JSON válido.'
    );
    return data;
  } catch(e) {
    console.warn('[diseaseForm]', e);
    return null;
  }
}

// ═══════════════════════════════════════
// FEATURE 3: NUTRITIONIST TYPE / SPECIALTY
// ═══════════════════════════════════════
let _currentNutType = null;

const NUT_SPECIALTY_META = {
  clinica:    { label:'Nutrição Clínica',    icon:'🏥', badge:'specialty-clinic',    metrics:['IMC','CC','CQ','RCQ','CB','pregas','lab_glucose','lab_chol_total','lab_creatinine'] },
  esportiva:  { label:'Nutrição Esportiva',  icon:'🏋️', badge:'specialty-sports',   metrics:['IMC','CC','muscle_mass_kg','body_fat_pct','VO2max','hidratacao'] },
  pediatria:  { label:'Nutrição Pediátrica', icon:'👶', badge:'specialty-pediatric', metrics:['peso_idade','estatura_idade','IMC_idade','aleitamento','desenvolvimento'] },
  gestante:   { label:'Gestação & Lactação', icon:'🤰', badge:'specialty-pregnant',  metrics:['ganho_peso_gestacional','semana_gestacional','dpp','nausea','suplementos'] },
  oncologia:  { label:'Oncologia',           icon:'🎗️', badge:'specialty-oncology',  metrics:['estado_nutricional','perda_peso','apetite','quimio_radioterapia','fadiga'] },
  renal:      { label:'Nefrologia',          icon:'🫘', badge:'specialty-renal',     metrics:['potassio','fosforo','sodio','creatinina','ureia','dialise','restricao_proteina'] },
  cardio:     { label:'Cardiologia',         icon:'❤️', badge:'specialty-cardio',    metrics:['colesterol','triglicerides','pressao','sodio','gordura_saturada','omega3'] },
  geral:      { label:'Geral / Preventiva',  icon:'🌿', badge:'specialty-clinic',    metrics:['IMC','CC','habitos_gerais','hidratacao'] },
};

function openNutTypeModal() {
  // Pre-select current type
  document.querySelectorAll('.nut-type-select-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.type === _currentNutType);
  });
  document.getElementById('nutTypeModal').classList.add('show');
}
function closeNutTypeModal() { document.getElementById('nutTypeModal').classList.remove('show'); }

function selectNutType(btn) {
  document.querySelectorAll('.nut-type-select-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

async function saveNutType() {
  const activeBtn = document.querySelector('.nut-type-select-btn.active');
  if (!activeBtn) { showToast('Selecione uma especialidade', 'error'); return; }
  const type = activeBtn.dataset.type;
  _currentNutType = type;
  // Save to profile
  await supabase.from('profiles').update({ nutritionist_type: type }).eq('id', currentUser.id).catch(e => {
    console.warn('[saveNutType] coluna nutritionist_type ausente. SQL: ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nutritionist_type text;');
  });
  currentProfile = { ...currentProfile, nutritionist_type: type };
  closeNutTypeModal();
  renderNutSpecialtyBadge();
  showToast(`<i class="fa-solid fa-user-doctor ic-stethoscope"></i> Especialidade: ${NUT_SPECIALTY_META[type]?.label || type}`);
}

function renderNutSpecialtyBadge() {
  const type = _currentNutType || currentProfile?.nutritionist_type;
  if (!type || !isProfessional()) return;
  const meta = NUT_SPECIALTY_META[type];
  if (!meta) return;
  // Show badge in sidebar footer
  let badgeEl = document.getElementById('nutSpecialtyBadge');
  if (!badgeEl) {
    badgeEl = document.createElement('div');
    badgeEl.id = 'nutSpecialtyBadge';
    badgeEl.style.cssText = 'margin-bottom:0.4rem;cursor:pointer;';
    badgeEl.onclick = openNutTypeModal;
    const footer = document.querySelector('.sidebar-footer');
    if (footer) footer.insertBefore(badgeEl, footer.firstChild);
  }
  badgeEl.innerHTML = `<span class="nut-specialty-badge ${meta.badge}" title="Clique para alterar">${meta.icon} ${meta.label}</span>`;
}

// Load specialty on init
async function loadNutSpecialty() {
  if (!isProfessional() || !currentProfile) return;
  _currentNutType = currentProfile.nutritionist_type || null;
  renderNutSpecialtyBadge();
  // Add "Minha Especialidade" button to dropdown if professional
  const dbn = document.getElementById('dropdownBecomeNut');
  if (dbn) {
    const nutSpecBtn = document.createElement('button');
    nutSpecBtn.className = 'dropdown-item';
    nutSpecBtn.innerHTML = `<span><i class="fa-solid fa-user-doctor ic-stethoscope"></i></span><span>Minha Especialidade</span>`;
    nutSpecBtn.onclick = () => { openNutTypeModal(); closeDropdown(); };
    dbn.parentNode.insertBefore(nutSpecBtn, dbn);
  }
}

// ═══════════════════════════════════════
// FEATURE 5: AI DIET GENERATOR
// ═══════════════════════════════════════
let _lastGeneratedDiet = null;

function openDietGenModal() {
  document.getElementById('dietGenResult').style.display = 'none';
  document.getElementById('dietGenForm').style.display = 'block';
  document.getElementById('dietGenLoading').style.display = 'none';
  document.getElementById('dietGenModal').classList.add('show');
}
function closeDietGenModal() { document.getElementById('dietGenModal').classList.remove('show'); }
function dietGenNewPlan() {
  document.getElementById('dietGenResult').style.display = 'none';
  document.getElementById('dietGenForm').style.display = 'block';
}

async function generateAIDiet() {
  const goalSel  = document.getElementById('dietGenGoal').value;
  const restrict = Array.from(document.getElementById('dietGenRestrict').selectedOptions).map(o=>o.value).filter(v=>v!=='nenhuma').join(', ') || 'nenhuma';
  const numMeals = document.getElementById('dietGenMeals').value;
  const numDays  = document.getElementById('dietGenDays').value;
  const obs      = document.getElementById('dietGenObs').value.trim();

  // Build context from user profile + anamnese
  const p = currentProfile || {};
  const profileCtx = [
    p.age    ? `idade: ${p.age} anos`    : '',
    p.sex    ? `sexo: ${p.sex === 'm' ? 'masculino' : 'feminino'}` : '',
    p.weight ? `peso: ${p.weight}kg`     : '',
    p.height ? `altura: ${p.height}cm`   : '',
  ].filter(Boolean).join(', ');

  // Fetch anamnese if available
  let anamneseCtx = '';
  try {
    const { data: an } = await supabase.from('patient_anamnese').select('diseases_general,diseases_chronic_auto,diseases_other,allergies,food_aversions,food_preferences').eq('patient_id', currentUser.id).maybeSingle();
    if (an) {
      const diseases = [...(an.diseases_general||[]), ...(an.diseases_chronic_auto||[])].filter(Boolean);
      if (diseases.length) anamneseCtx += ` doenças: ${diseases.join(', ')};`;
      if (an.diseases_other) anamneseCtx += ` outras condições: ${an.diseases_other};`;
      if ((an.allergies||[]).length) anamneseCtx += ` alergias: ${an.allergies.join(', ')};`;
      if (an.food_aversions) anamneseCtx += ` aversões: ${an.food_aversions};`;
      if (an.food_preferences) anamneseCtx += ` preferências: ${an.food_preferences};`;
    }
  } catch(e) {}

  const prompt = `Você é uma nutricionista experiente. Crie um plano alimentar para ${numDays} dia(s) com ${numMeals} refeições por dia.

DADOS DO USUÁRIO:
- ${profileCtx}
- Meta calórica diária: ${diaryGoal} kcal
- Água mínima: ${diaryGoalWater}ml/dia
- Açúcar máximo: ${diaryGoalSugar}g/dia
- Objetivo: ${goalSel}
- Restrições: ${restrict}
${anamneseCtx ? `- Histórico clínico: ${anamneseCtx}` : ''}
${obs ? `- Obs. adicionais: ${obs}` : ''}

Retorne SOMENTE um JSON válido com esta estrutura:
{
  "totalKcal": number,
  "totalProtein": number,
  "totalCarbs": number,
  "totalFat": number,
  "totalSugar": number,
  "waterMl": number,
  "days": [
    {
      "day": 1,
      "meals": [
        {
          "meal": "Café da manhã",
          "mealKey": "cafe",
          "foods": [
            { "name": "Aveia com banana", "qty": "40g", "kcal": 150, "protein": 5, "carbs": 28, "fat": 2, "sugar": 4 }
          ],
          "totalKcal": 350
        }
      ]
    }
  ]
}`;

  document.getElementById('dietGenLoading').style.display = 'block';
  document.getElementById('dietGenForm').querySelector('button[onclick="generateAIDiet()"]').disabled = true;

  try {
    const data = await askClaude(prompt, 'Retorne SOMENTE JSON válido sem markdown nem texto adicional.');
    _lastGeneratedDiet = data;
    renderDietResult(data);
  } catch(e) {
    showToast('Erro ao gerar dieta: ' + e.message, 'error');
  } finally {
    document.getElementById('dietGenLoading').style.display = 'none';
    const btn = document.getElementById('dietGenForm').querySelector('button[onclick="generateAIDiet()"]');
    if (btn) btn.disabled = false;
  }
}

function renderDietResult(diet) {
  if (!diet || !diet.days) { showToast('Dados da dieta incompletos', 'error'); return; }
  const mealEmoji = { cafe:'🌅', almoco:'☀️', lanche:'🍎', jantar:'🌙' };

  const html = diet.days.map(day => `
    <div style="margin-bottom:1.2rem;">
      <div style="font-family:'Playfair Display',serif;font-size:1.1rem;font-weight:900;color:var(--green-deep);margin-bottom:0.6rem;">
        ${diet.days.length > 1 ? `📅 Dia ${day.day}` : '📅 Plano do dia'}
      </div>
      ${(day.meals||[]).map(meal => `
        <div class="diet-meal-block">
          <div class="diet-meal-title">${mealEmoji[meal.mealKey]||'🍽️'} ${meal.meal} · ${meal.totalKcal} kcal</div>
          ${(meal.foods||[]).map(f => `
            <div class="diet-food-row">
              <span>${f.name} <span style="color:var(--text-muted);font-size:0.78rem;">${f.qty}</span></span>
              <span class="diet-food-kcal">${f.kcal} kcal</span>
            </div>
          `).join('')}
        </div>
      `).join('')}
    </div>
  `).join('');

  const summary = `
    <div style="background:linear-gradient(135deg,var(--green-deep),#1a4a1f);color:white;border-radius:var(--radius-mid);padding:1rem;margin-bottom:1rem;display:grid;grid-template-columns:repeat(auto-fit,minmax(80px,1fr));gap:0.5rem;text-align:center;">
      <div><div style="font-family:'Playfair Display',serif;font-size:1.4rem;font-weight:900;">${diet.totalKcal||'—'}</div><div style="font-size:0.7rem;opacity:0.8;">kcal/dia</div></div>
      <div><div style="font-family:'Syne',sans-serif;font-size:1.1rem;font-weight:800;">${diet.totalProtein||'—'}g</div><div style="font-size:0.7rem;opacity:0.8;">proteína</div></div>
      <div><div style="font-family:'Syne',sans-serif;font-size:1.1rem;font-weight:800;">${diet.totalCarbs||'—'}g</div><div style="font-size:0.7rem;opacity:0.8;">carboidratos</div></div>
      <div><div style="font-family:'Syne',sans-serif;font-size:1.1rem;font-weight:800;">${diet.totalFat||'—'}g</div><div style="font-size:0.7rem;opacity:0.8;">gorduras</div></div>
      <div><div style="font-family:'Syne',sans-serif;font-size:1.1rem;font-weight:800;color:#ffd54f;">${diet.totalSugar||'—'}g</div><div style="font-size:0.7rem;opacity:0.8;">açúcares</div></div>
      <div><div style="font-family:'Syne',sans-serif;font-size:1.1rem;font-weight:800;color:#80deea;">${diet.waterMl||diaryGoalWater}ml</div><div style="font-size:0.7rem;opacity:0.8;">água</div></div>
    </div>`;

  document.getElementById('dietGenContent').innerHTML = summary + html;
  document.getElementById('dietGenForm').style.display = 'none';
  document.getElementById('dietGenResult').style.display = 'block';
}

async function applyDietToday() {
  if (!_lastGeneratedDiet?.days?.length) return;
  const day = _lastGeneratedDiet.days[0];
  let added = 0;
  for (const meal of (day.meals || [])) {
    for (const food of (meal.foods || [])) {
      await addToDiaryMeal(meal.mealKey || 'almoco', {
        name: food.name + (food.qty ? ` (${food.qty})` : ''),
        kcal: food.kcal || 0,
        carbs: food.carbs || 0,
        prot: food.protein || food.prot || 0,
        fat: food.fat || 0,
        sugar: food.sugar || 0,
        qty: 100, unit: 'g'
      });
      added++;
    }
  }
  closeDietGenModal();
  showPanel('diary', document.getElementById('nav-diary'));
  showToast(`<i class="fa-solid fa-circle-check ic-check"></i> ${added} alimentos adicionados ao diário!`);
}

function printDiet() {
  if (!_lastGeneratedDiet) return;
  const logoB64 = LOGO_LIGHT_B64;
  const mealEmoji = { cafe:'🌅', almoco:'☀️', lanche:'🍎', jantar:'🌙' };
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Plano Alimentar — CalorIA</title>
  <style>
    @media print { .no-print { display:none; } body { margin:0; } }
    * { box-sizing:border-box; margin:0; padding:0; }
    body { font-family:'Segoe UI',Arial,sans-serif; max-width:760px; margin:0 auto; padding:28px; color:#1a2e1b; }
    .header { display:flex; align-items:center; gap:12px; border-bottom:3px solid #2a5c30; padding-bottom:14px; margin-bottom:18px; }
    .brand { font-size:1.5rem; font-weight:900; color:#2a5c30; font-style:italic; }
    .brand span { color:#ffb300; }
    h2 { font-size:1.1rem; color:#2a5c30; margin:18px 0 8px; text-transform:uppercase; letter-spacing:0.5px; border-bottom:1px solid #e0f0e0; padding-bottom:4px; }
    .meal-block { background:#f0f9f0; border-radius:12px; padding:10px 14px; margin-bottom:10px; }
    .meal-title { font-weight:800; font-size:0.9rem; color:#1a4a1f; margin-bottom:6px; }
    .food-row { display:flex; justify-content:space-between; font-size:0.85rem; padding:2px 0; border-bottom:1px solid rgba(0,0,0,0.05); }
    .food-row:last-child { border:none; }
    .summary { display:flex; gap:10px; flex-wrap:wrap; background:#2a5c30; color:white; border-radius:12px; padding:14px; margin-bottom:18px; text-align:center; }
    .summary-item { flex:1; min-width:70px; }
    .summary-val { font-size:1.2rem; font-weight:900; }
    .summary-lbl { font-size:0.68rem; opacity:0.8; }
    .footer { margin-top:24px; font-size:0.7rem; color:#888; border-top:1px solid #ddd; padding-top:10px; }
    button.no-print { display:block; margin:0 auto 20px; padding:10px 28px; background:#2a5c30; color:white; border:none; border-radius:50px; font-size:0.95rem; cursor:pointer; }
  </style></head><body>
  <div class="header"><img src="${logoB64}" width="44" height="44" style="border-radius:8px;"><div class="brand">Calor<span>IA</span></div></div>
  <button class="no-print" onclick="window.print()">🖨️ Salvar como PDF</button>
  <h1 style="font-size:1.4rem;margin-bottom:4px;">Plano Alimentar Personalizado</h1>
  <p style="font-size:0.82rem;color:#666;margin-bottom:14px;">Gerado em ${new Date().toLocaleDateString('pt-BR')} · Meta: ${diaryGoal} kcal/dia · Água: ${diaryGoalWater}ml</p>
  <div class="summary">
    <div class="summary-item"><div class="summary-val">${_lastGeneratedDiet.totalKcal||'—'}</div><div class="summary-lbl">kcal/dia</div></div>
    <div class="summary-item"><div class="summary-val">${_lastGeneratedDiet.totalProtein||'—'}g</div><div class="summary-lbl">proteína</div></div>
    <div class="summary-item"><div class="summary-val">${_lastGeneratedDiet.totalCarbs||'—'}g</div><div class="summary-lbl">carboidratos</div></div>
    <div class="summary-item"><div class="summary-val">${_lastGeneratedDiet.totalFat||'—'}g</div><div class="summary-lbl">gorduras</div></div>
    <div class="summary-item"><div class="summary-val">${_lastGeneratedDiet.totalSugar||'—'}g</div><div class="summary-lbl">açúcares</div></div>
    <div class="summary-item"><div class="summary-val">${_lastGeneratedDiet.waterMl||diaryGoalWater}ml</div><div class="summary-lbl">água</div></div>
  </div>
  ${(_lastGeneratedDiet.days||[]).map(day => `
    <h2>${_lastGeneratedDiet.days.length > 1 ? '📅 Dia '+day.day : '📅 Plano do dia'}</h2>
    ${(day.meals||[]).map(meal => `
      <div class="meal-block">
        <div class="meal-title">${mealEmoji[meal.mealKey]||'🍽️'} ${meal.meal} · ${meal.totalKcal} kcal</div>
        ${(meal.foods||[]).map(f => `
          <div class="food-row"><span>${f.name} <span style="color:#888;font-size:0.75rem;">${f.qty}</span></span><span style="color:#2a5c30;font-weight:600;">${f.kcal} kcal</span></div>
        `).join('')}
      </div>`).join('')}
  `).join('')}
  <div class="footer">Plano gerado automaticamente pela IA CalorIA. Consulte sempre um nutricionista. 🔒 LGPD (Lei 13.709/2018).</div>
  </body></html>`;

  const blob = new Blob([html], { type:'text/html' });
  const url  = URL.createObjectURL(blob);
  const win  = window.open(url, '_blank');
  if (!win) { const a = document.createElement('a'); a.href=url; a.download='plano_alimentar.html'; a.click(); }
  setTimeout(() => URL.revokeObjectURL(url), 15000);
}

// Hook into initApp to load new features
const _origInitApp = initApp;
// Patch loadDiaryForDate to also load water
const _origLoadDiary = loadDiaryForDate;
loadDiaryForDate = async function(date) {
  diary = { cafe:[], almoco:[], lanche:[], jantar:[] };
  if (!currentUser) return;
  const { data } = await supabase.from('diary_entries').select('*').eq('user_id', currentUser.id).eq('date', date);
  (data||[]).forEach(entry => {
    const meal = entry.meal;
    if (diary[meal]) diary[meal].push({
      id: entry.id, name: entry.food_name, kcal: entry.kcal,
      carbs: entry.carbs, prot: entry.protein, fat: entry.fat,
      sugar: entry.sugar || 0,
      qty: entry.qty||100, unit: entry.unit||'g', photoUrl: entry.photo_url||null
    });
  });
  ['cafe','almoco','lanche','jantar'].forEach(m => renderMeal(m));
  updateDiaryProgress();
  await loadWaterForDate(date);
}

// Patch saveDiaryToDB to also save sugar
async function saveDiaryToDB(mealKey, item) {
  if (!currentUser) return;
  const payload = {
    user_id: currentUser.id, date: diaryDate, meal: mealKey,
    food_name: item.name, kcal: item.kcal,
    carbs: item.carbs||0, protein: item.prot||0, fat: item.fat||0,
    qty: item.qty||100, unit: item.unit||'g',
    photo_url: item.photoUrl || null
  };
  // Try inserting with sugar column, fall back without it
  let { data, error } = await supabase.from('diary_entries').insert({ ...payload, sugar: item.sugar||0 }).select().single();
  if (error && (error.code === '42703' || error.message?.includes('sugar'))) {
    // Column doesn't exist yet — insert without it
    const r2 = await supabase.from('diary_entries').insert(payload).select().single();
    data = r2.data; error = r2.error;
    if (!error) console.info('[CalorIA] Adicione coluna sugar: ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS sugar numeric DEFAULT 0;');
  }
  if (data) item.id = data.id;
}

// After app loads, bootstrap new features
document.addEventListener('DOMContentLoaded', () => {
  // nothing needed here — handled in initApp override below
});

// Extend setupRoleUI to also call loadNutSpecialty
const _origSetupRoleUI = setupRoleUI;
setupRoleUI = function() {
  _origSetupRoleUI();
  if (isProfessional()) {
    setTimeout(loadNutSpecialty, 300);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// PATCH v2 — CalorIA Melhorias Integradas
// 1. Açúcar e Água no diário (barras + metas por paciente)
// 2. Formulários específicos por doença (IA) — conectado ao painel de pacientes
// 3. Tipos de clínica/especialidade com métricas dinâmicas no formulário
// 4. Remoção de "unidade" e "prato" das medidas de porção caseiras
// 5. Gerador de dieta por IA com anamnese completa (incluindo nutricionista→paciente)
// ═══════════════════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────────────────
// PATCH 1 — Corrige updateDiaryProgress para incluir açúcar + mostra na UI
// ───────────────────────────────────────────────────────────────────────────
const _p2_origUpdateDiaryProgress = updateDiaryProgress;
updateDiaryProgress = function() {
  _p2_origUpdateDiaryProgress();

  // Sugar total from diary
  const all = [...diary.cafe, ...diary.almoco, ...diary.lanche, ...diary.jantar];
  const totalSugar = all.reduce((s, i) => s + (i.sugar || 0), 0);

  // Update sugar bar
  const sugarGoalEl = document.getElementById('diarySugarGoalDisplay');
  const sugarValEl  = document.getElementById('diarySugarVal');
  const sugarBar    = document.getElementById('diarySugarBar');
  if (sugarGoalEl) sugarGoalEl.textContent = diaryGoalSugar;
  if (sugarValEl)  sugarValEl.textContent  = totalSugar.toFixed(0) + 'g';
  if (sugarBar) {
    const sp = Math.min((totalSugar / Math.max(diaryGoalSugar, 1)) * 100, 100);
    sugarBar.style.width = sp + '%';
    sugarBar.classList.toggle('over', totalSugar > diaryGoalSugar);
  }

  // Topbar water display (if visible)
  const waterGoalEl = document.getElementById('diaryWaterGoalDisplay');
  if (waterGoalEl) waterGoalEl.textContent = diaryGoalWater;
}

// Patch savePatientGoals to also save sugar/water goals
const _p2_origSavePatientGoals = savePatientGoals;
async function savePatientGoals() {
  const patientId = document.getElementById('patientGoalsPatientId').value;
  const kcal  = parseInt(document.getElementById('pgKcal').value)  || null;
  const prot  = parseInt(document.getElementById('pgProt').value)  || null;
  const carbs = parseInt(document.getElementById('pgCarbs').value) || null;
  const fat   = parseInt(document.getElementById('pgFat').value)   || null;
  const sugar = parseInt(document.getElementById('pgSugar')?.value)|| null;
  const water = parseInt(document.getElementById('pgWater')?.value)|| null;
  if (!patientId || !kcal) { showToast('Preencha ao menos a meta de calorias.', 'error'); return; }

  const goalData = {
    user_id: patientId,
    daily_kcal: kcal,
    daily_prot: prot,
    daily_carbs: carbs,
    daily_fat: fat,
    daily_sugar: sugar || Math.round((kcal * 0.05) / 4),
    daily_water: water || Math.round((currentProfile?.weight || 70) * 35),
    updated_at: new Date().toISOString()
  };

  let { error } = await supabase.from('user_goals').upsert(goalData, { onConflict: 'user_id' });
  if (error) {
    const fallback = { user_id: patientId, daily_kcal: kcal, updated_at: goalData.updated_at };
    const res2 = await supabase.from('user_goals').upsert(fallback, { onConflict: 'user_id' });
    error = res2.error;
  }
  if (error) { showToast('Erro ao salvar metas: ' + error.message, 'error'); return; }
  closePatientGoalsModal();
  showToast('<i class="fa-solid fa-bullseye ic-goal"></i> Metas do paciente salvas! (kcal, macros, açúcar, água)');
}

// Patch openPatientGoalsModal to also load and show sugar/water fields
const _p2_origOpenPatientGoalsModal = openPatientGoalsModal;
openPatientGoalsModal = async function(patientId, patientName) {
  // Add sugar/water inputs if not present
  const grid = document.querySelector('#patientGoalsModal .modal-box > div[style*="grid"]');
  if (grid && !document.getElementById('pgSugar')) {
    const sugarDiv = document.createElement('div');
    sugarDiv.className = 'form-field';
    sugarDiv.innerHTML = '<label class="form-label"><i class="fa-solid fa-candy-cane" style="color:#e91e63;"></i> Açúcar máx. (g/dia)</label><input type="number" id="pgSugar" class="form-input" placeholder="25">';
    const waterDiv = document.createElement('div');
    waterDiv.className = 'form-field';
    waterDiv.innerHTML = '<label class="form-label"><i class="fa-solid fa-droplet ic-water"></i> Água mínima (ml/dia)</label><input type="number" id="pgWater" class="form-input" placeholder="2000">';
    grid.appendChild(sugarDiv);
    grid.appendChild(waterDiv);
  }

  document.getElementById('patientGoalsPatientId').value = patientId;
  document.getElementById('patientGoalsDesc').textContent = 'Definir metas nutricionais para ' + patientName;
  try {
    const { data } = await supabase.from('user_goals').select('*').eq('user_id', patientId).maybeSingle();
    if (data) {
      document.getElementById('pgKcal').value  = data.daily_kcal  || '';
      document.getElementById('pgProt').value  = data.daily_prot  || '';
      document.getElementById('pgCarbs').value = data.daily_carbs || '';
      document.getElementById('pgFat').value   = data.daily_fat   || '';
      const pgS = document.getElementById('pgSugar');
      const pgW = document.getElementById('pgWater');
      if (pgS) pgS.value = data.daily_sugar || '';
      if (pgW) pgW.value = data.daily_water || '';
    }
  } catch(e) {}
  document.getElementById('patientGoalsModal').classList.add('show');
}

// ───────────────────────────────────────────────────────────────────────────
// PATCH 2 — Formulário de doença específica acessível do painel de pacientes
// Adiciona botão "Formulário Específico" no cartão do paciente
// ───────────────────────────────────────────────────────────────────────────
const _p2_origLoadPatients = loadPatients;
async function loadPatients() {
  await _p2_origLoadPatients();
  // After patients load, inject disease form buttons into each patient row
  setTimeout(_p2_injectDiseaseButtons, 400);
}

function _p2_injectDiseaseButtons() {
  // Find all patient rows that have diseases but no disease-form btn yet
  document.querySelectorAll('.patient-row[data-patient-id]').forEach(row => {
    if (row.querySelector('.btn-disease-form')) return;
    const patId   = row.dataset.patientId;
    const patName = row.dataset.patientName || row.querySelector('[class*="patient-name"]')?.textContent || 'Paciente';
    const diseasesAttr = row.dataset.diseases;
    if (!diseasesAttr) return;
    let diseases;
    try { diseases = JSON.parse(diseasesAttr); } catch(e) { return; }
    if (!diseases || !diseases.length) return;

    const actionsDiv = row.querySelector('.patient-actions') || row.querySelector('[class*="actions"]');
    if (!actionsDiv) return;

    const btn = document.createElement('button');
    btn.className = 'btn-disease-form';
    btn.title = 'Formulário específico por doença';
    btn.style.cssText = 'background:var(--orange-pale);border:1px solid var(--orange-mid);color:var(--orange-hot);border-radius:50px;padding:0.35rem 0.75rem;font-size:0.72rem;font-family:"Syne",sans-serif;font-weight:700;cursor:pointer;white-space:nowrap;';
    btn.innerHTML = '<i class="fa-solid fa-file-medical" style="color:inherit;margin-right:0.3rem;"></i>Form Doença';
    btn.onclick = (e) => {
      e.stopPropagation();
      _p2_openDiseaseFormForPatient(patId, patName, diseases);
    };
    actionsDiv.appendChild(btn);
  });
}

async function _p2_openDiseaseFormForPatient(patientId, patientName, diseases) {
  showToast('<i class="fa-solid fa-robot ic-chat"></i> Gerando formulário específico com IA...', 'success');
  const diseaseList = Array.isArray(diseases) ? diseases.join(', ') : diseases;

  try {
    const data = await askClaude(
      `Paciente com diagnóstico de: ${diseaseList}. Como nutricionista clínica, liste as perguntas específicas mais importantes para a anamnese. Retorne JSON: { "title": "string", "sections": [{ "name": "string", "questions": [{ "id": "q1", "label": "string", "type": "text|select|number|textarea", "options": ["opt1"] }] }] }. Máximo 12 perguntas distribuídas em até 3 seções.`,
      'Você é especialista em nutrição clínica. Retorne SOMENTE JSON válido sem markdown.'
    );

    if (!data || !data.sections) throw new Error('Resposta inválida da IA');

    // Store state
    if (typeof _diseaseFormState !== 'undefined') {
      _diseaseFormState.disease = diseases[0] || 'custom';
      _diseaseFormState.patientId = patientId;
      _diseaseFormState.patientName = patientName;
    }

    // Build modal content
    const titleEl = document.getElementById('diseaseFormTitle');
    const bodyEl  = document.getElementById('diseaseFormBody');
    if (!titleEl || !bodyEl) { showToast('Modal de formulário não encontrado.', 'error'); return; }

    titleEl.textContent = data.title || `Formulário — ${patientName}`;

    bodyEl.innerHTML = data.sections.map(section => `
      <div style="background:var(--green-pale);border-radius:var(--radius-sm);padding:0.9rem 1rem;margin-bottom:0.75rem;">
        <div style="font-family:'Syne',sans-serif;font-size:0.72rem;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--green-mid);margin-bottom:0.6rem;">${section.name}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;">
          ${(section.questions||[]).map(q => {
            let input;
            if (q.type === 'select' && q.options) {
              input = `<select id="${q.id}" class="form-select"><option value="">Selecione</option>${(q.options||[]).map(o=>`<option>${o}</option>`).join('')}</select>`;
            } else if (q.type === 'textarea') {
              input = `<textarea id="${q.id}" class="form-input" rows="2" style="grid-column:1/-1;"></textarea>`;
            } else {
              input = `<input type="${q.type||'text'}" id="${q.id}" class="form-input" placeholder="">`;
            }
            const wide = q.type === 'textarea' || (q.label||'').length > 45;
            return `<div class="form-field" ${wide?'style="grid-column:1/-1;"':''}><label class="form-label">${q.label}</label>${input}</div>`;
          }).join('')}
        </div>
      </div>
    `).join('');

    // Store sections for save
    if (typeof _diseaseFormState !== 'undefined') {
      _diseaseFormState._aiSections = data.sections;
    }

    document.getElementById('diseaseFormModal').classList.add('show');
    showToast('<i class="fa-solid fa-circle-check ic-check"></i> Formulário específico gerado pela IA!');
  } catch(e) {
    showToast('Erro ao gerar formulário: ' + e.message, 'error');
    console.error('[_p2_openDiseaseFormForPatient]', e);
  }
}

// ───────────────────────────────────────────────────────────────────────────
// PATCH 3 — Tipo de clínica com métricas dinâmicas no formulário do paciente
// Exibe/oculta campos relevantes conforme a especialidade do nutricionista
// ───────────────────────────────────────────────────────────────────────────
function _p2_applySpecialtyMetrics(specialtyType) {
  if (!specialtyType || !isProfessional()) return;
  const meta = NUT_SPECIALTY_META[specialtyType];
  if (!meta) return;
  const metrics = meta.metrics || [];

  // Show/highlight relevant fields in the create patient modal
  const fieldHighlights = {
    'IMC':             ['cpWeight','cpHeight'],
    'CC':              ['cpWaist'],
    'CQ':              ['cpHip'],
    'RCQ':             ['cpWaist','cpHip'],
    'CB':              ['cpArmCirc'],
    'pregas':          ['cpBodyFat'],
    'lab_glucose':     ['labGlucose'],
    'lab_chol_total':  ['labCholTotal'],
    'lab_creatinine':  ['labCreatinine'],
    'muscle_mass_kg':  ['cpMuscleMass'],
    'body_fat_pct':    ['cpBodyFat'],
    'ganho_peso_gestacional': ['cpGestWeightGain'],
    'semana_gestacional':     ['cpGestWeek'],
    'potassio':        ['labKalemia'],
    'fosforo':         ['labPhosphorus'],
    'sodio':           ['labSodium'],
    'creatinina':      ['labCreatinine'],
    'ureia':           ['labUrea'],
    'colesterol':      ['labCholTotal'],
    'triglicerides':   ['labTg'],
  };

  // Add a specialty banner to the patient form if not already present
  const modal = document.getElementById('createPatientModal');
  if (!modal) return;
  let banner = modal.querySelector('#nutSpecialtyBanner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'nutSpecialtyBanner';
    banner.style.cssText = 'background:linear-gradient(135deg,var(--green-pale),#fff8e1);border:1px solid var(--green-light);border-radius:var(--radius-sm);padding:0.6rem 1rem;margin-bottom:0.75rem;display:flex;align-items:center;gap:0.6rem;font-size:0.82rem;';
    const firstSection = modal.querySelector('.patient-form-section');
    if (firstSection) firstSection.parentNode.insertBefore(banner, firstSection);
  }
  banner.innerHTML = `
    <span style="font-size:1.1rem;">${meta.icon}</span>
    <div>
      <div style="font-family:'Syne',sans-serif;font-weight:800;font-size:0.75rem;text-transform:uppercase;color:var(--green-deep);">Especialidade: ${meta.label}</div>
      <div style="font-size:0.72rem;color:var(--text-muted);">Campos prioritários: ${metrics.slice(0,6).join(', ')}</div>
    </div>`;

  // Highlight priority fields
  Object.entries(fieldHighlights).forEach(([metric, ids]) => {
    if (metrics.includes(metric)) {
      ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.style.borderColor = 'var(--green-mid)';
          el.style.borderWidth = '2px';
          const label = el.closest('.form-field')?.querySelector('.form-label');
          if (label && !label.querySelector('.priority-star')) {
            const star = document.createElement('span');
            star.className = 'priority-star';
            star.textContent = ' ★';
            star.style.color = '#ffb300';
            label.appendChild(star);
          }
        }
      });
    }
  });
}

// Extend openCreatePatientModal to apply specialty metrics
const _p2_origOpenCreatePatientModal = openCreatePatientModal;
openCreatePatientModal = function() {
  _p2_origOpenCreatePatientModal();
  setTimeout(() => _p2_applySpecialtyMetrics(_currentNutType || currentProfile?.nutritionist_type), 300);
};

// Extend saveNutType to also update the create patient modal if open
const _p2_origSaveNutType = saveNutType;
saveNutType = async function() {
  await _p2_origSaveNutType();
  const modal = document.getElementById('createPatientModal');
  if (modal && modal.classList.contains('show')) {
    setTimeout(() => _p2_applySpecialtyMetrics(_currentNutType), 200);
  }
};

// ───────────────────────────────────────────────────────────────────────────
// PATCH 4 — Remove "unidade" e "prato" das medidas de porção caseiras
// Garante que os selects de unidade usem apenas medidas caseiras válidas
// ───────────────────────────────────────────────────────────────────────────
const PORCOES_CASEIRAS = [
  { value: 'g',                  label: 'g (gramas)' },
  { value: 'ml',                 label: 'ml (mililitros)' },
  { value: 'xicara',            label: 'xícara (240ml)' },
  { value: 'col_sopa',          label: 'col. de sopa (15g)' },
  { value: 'col_cha',           label: 'col. de chá (5g)' },
  { value: 'col_sobremesa',     label: 'col. de sobremesa (10g)' },
  { value: 'fatia',             label: 'fatia' },
  { value: 'porcao',            label: 'porção' },
  { value: 'copo',              label: 'copo (200ml)' },
  { value: 'kg',                label: 'kg (quilogramas)' },
  { value: 'litro',             label: 'litro' },
];

function _p2_buildUnitOptions(selectedValue) {
  return PORCOES_CASEIRAS.map(p =>
    `<option value="${p.value}" ${(selectedValue===p.value||selectedValue===p.label)?'selected':''}>${p.label}</option>`
  ).join('');
}

// Replace unit selects on DOMContentLoaded and panel switch
function _p2_patchUnitSelects() {
  const selects = [
    document.getElementById('qtyUnit'),
    document.getElementById('diaryAddUnit'),
  ];
  selects.forEach(sel => {
    if (!sel || sel.dataset.patched) return;
    sel.innerHTML = _p2_buildUnitOptions(sel.value || 'g');
    sel.dataset.patched = '1';
  });
}

// Patch openEditItem to use caseiras units
const _p2_origOpenEditItem = openEditItem;
openEditItem = function(mealKey, idx) {
  const item = diary[mealKey][idx];
  const formEl = document.getElementById('edit-form-' + mealKey);
  const unitOptions = _p2_buildUnitOptions(item.unit || 'g');
  formEl.innerHTML = `
    <input class="edit-field" id="editName-${mealKey}-${idx}" value="${item.name}" style="flex:2;min-width:100px;">
    <input type="number" class="edit-field" id="editQty-${mealKey}-${idx}" value="${item.qty||100}" style="width:70px;" min="1">
    <select class="edit-field" id="editUnit-${mealKey}-${idx}">${unitOptions}</select>
    <button class="btn-save-edit" onclick="saveEditItem('${mealKey}',${idx})">Salvar</button>
    <button onclick="document.getElementById('edit-form-${mealKey}').classList.remove('open')" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:1rem;">✕</button>
  `;
  formEl.classList.add('open');
}

// Run patch after DOM ready and after each panel switch
document.addEventListener('DOMContentLoaded', () => setTimeout(_p2_patchUnitSelects, 800));

const _p2_origShowPanel = showPanel;
showPanel = function(name, btn) {
  _p2_origShowPanel(name, btn);
  if (name === 'search' || name === 'diary') setTimeout(_p2_patchUnitSelects, 200);
};

// ───────────────────────────────────────────────────────────────────────────
// PATCH 5 — Gerador de dieta por IA com anamnese completa + modo nutricionista
// Permite nutricionista gerar dieta para paciente específico
// ───────────────────────────────────────────────────────────────────────────
let _p2_dietPatientId   = null; // when null = generate for self
let _p2_dietPatientName = null;

// Extend openDietGenModal to support patient context when called from prof panel
function openDietGenModalForPatient(patientId, patientName) {
  _p2_dietPatientId   = patientId;
  _p2_dietPatientName = patientName;

  // Show patient badge
  const badge = document.getElementById('dietGenPatientBadge');
  if (badge) {
    badge.style.display = 'flex';
    badge.innerHTML = `<i class="fa-solid fa-user ic-user"></i> Gerando para: <strong style="margin-left:0.3rem;">${patientName}</strong> <button onclick="_p2_clearDietPatient()" style="background:none;border:none;cursor:pointer;font-size:0.9rem;color:var(--text-muted);margin-left:0.4rem;" title="Remover">✕</button>`;
  } else {
    _p2_ensureDietPatientBadge(patientName);
  }
  openDietGenModal();
}

function _p2_clearDietPatient() {
  _p2_dietPatientId   = null;
  _p2_dietPatientName = null;
  const badge = document.getElementById('dietGenPatientBadge');
  if (badge) badge.style.display = 'none';
}

function _p2_ensureDietPatientBadge(patientName) {
  const form = document.getElementById('dietGenForm');
  if (!form || document.getElementById('dietGenPatientBadge')) return;
  const badgeDiv = document.createElement('div');
  badgeDiv.id = 'dietGenPatientBadge';
  badgeDiv.style.cssText = 'display:flex;align-items:center;gap:0.4rem;background:var(--green-pale);border:1px solid var(--green-light);border-radius:var(--radius-sm);padding:0.5rem 0.9rem;font-size:0.82rem;font-weight:600;color:var(--green-deep);margin-bottom:0.75rem;flex-wrap:wrap;';
  badgeDiv.innerHTML = `<i class="fa-solid fa-user ic-user"></i> Gerando para: <strong style="margin-left:0.3rem;">${patientName}</strong> <button onclick="_p2_clearDietPatient()" style="background:none;border:none;cursor:pointer;font-size:0.9rem;color:var(--text-muted);margin-left:0.4rem;" title="Remover">✕</button>`;
  form.insertBefore(badgeDiv, form.firstChild);
}

// Override generateAIDiet to use patient anamnese when generating for a patient
const _p2_origGenerateAIDiet = generateAIDiet;
window.generateAIDiet = async function() {
  const goalSel  = document.getElementById('dietGenGoal').value;
  const restrict = Array.from(document.getElementById('dietGenRestrict').selectedOptions).map(o=>o.value).filter(v=>v!=='nenhuma').join(', ') || 'nenhuma';
  const numMeals = document.getElementById('dietGenMeals').value;
  const numDays  = document.getElementById('dietGenDays').value;
  const obs      = document.getElementById('dietGenObs').value.trim();

  const targetUserId = _p2_dietPatientId || currentUser?.id;
  const targetName   = _p2_dietPatientName || currentProfile?.name || 'Usuário';

  // Load profile
  let profile = currentProfile || {};
  if (_p2_dietPatientId) {
    try {
      const { data: p } = await supabase.from('profiles').select('*').eq('id', _p2_dietPatientId).maybeSingle();
      if (p) profile = p;
    } catch(e) {}
  }

  const profileCtx = [
    profile.age    ? `idade: ${profile.age} anos`    : '',
    profile.sex    ? `sexo: ${profile.sex === 'm' ? 'masculino' : 'feminino'}` : '',
    profile.weight ? `peso: ${profile.weight}kg`     : '',
    profile.height ? `altura: ${profile.height}cm`   : '',
  ].filter(Boolean).join(', ');

  // Load anamnese from patient or current user
  let anamneseCtx = '';
  try {
    const { data: an } = await supabase.from('patient_anamnese').select('*').eq('patient_id', targetUserId).maybeSingle();
    if (an) {
      const diseases = [...(an.diseases_general||[]), ...(an.diseases_chronic_auto||[])].filter(Boolean);
      if (diseases.length)      anamneseCtx += ` doenças: ${diseases.join(', ')};`;
      if (an.diseases_other)    anamneseCtx += ` outras condições: ${an.diseases_other};`;
      if ((an.allergies||[]).length) anamneseCtx += ` alergias: ${an.allergies.join(', ')};`;
      if (an.food_aversions)    anamneseCtx += ` aversões: ${an.food_aversions};`;
      if (an.food_preferences)  anamneseCtx += ` preferências: ${an.food_preferences};`;
      if (an.medications)       anamneseCtx += ` medicamentos: ${an.medications};`;
      if (an.activity_type)     anamneseCtx += ` atividade física: ${an.activity_type} ${an.activity_freq||''}x/sem;`;
      if (an.bowel_habit)       anamneseCtx += ` hábito intestinal: ${an.bowel_habit};`;
      // Financial context for food selection
      if (an.income)            anamneseCtx += ` renda: ${an.income};`;
    }
  } catch(e) {}

  // Load goals
  let targetGoalKcal = diaryGoal;
  let targetGoalSugar = diaryGoalSugar;
  let targetGoalWater = diaryGoalWater;
  try {
    const { data: gd } = await supabase.from('user_goals').select('daily_kcal,daily_sugar,daily_water').eq('user_id', targetUserId).maybeSingle();
    if (gd) {
      targetGoalKcal  = gd.daily_kcal  || targetGoalKcal;
      targetGoalSugar = gd.daily_sugar || targetGoalSugar;
      targetGoalWater = gd.daily_water || targetGoalWater;
    }
  } catch(e) {}

  // Specialty context
  const nutType = _currentNutType || currentProfile?.nutritionist_type;
  const nutSpecCtx = nutType && NUT_SPECIALTY_META[nutType]
    ? `Especialidade do nutricionista: ${NUT_SPECIALTY_META[nutType].label}.`
    : '';

  const prompt = `Você é uma nutricionista experiente. Crie um plano alimentar para ${numDays} dia(s) com ${numMeals} refeições por dia para o(a) paciente ${targetName}.
${nutSpecCtx}

DADOS DO PACIENTE:
- ${profileCtx || 'Dados não informados'}
- Meta calórica diária: ${targetGoalKcal} kcal
- Água mínima: ${targetGoalWater}ml/dia
- Açúcar máximo: ${targetGoalSugar}g/dia
- Objetivo: ${goalSel}
- Restrições alimentares: ${restrict}
${anamneseCtx ? `- Histórico clínico (anamnese): ${anamneseCtx}` : ''}
${obs ? `- Observações adicionais: ${obs}` : ''}

INSTRUÇÕES:
- Adapte os alimentos ao perfil clínico (doenças, alergias, medicamentos)
- Use medidas caseiras práticas (xícaras, colheres, gramas)
- Distribua macros adequadamente à meta calórica
- Inclua variedade e praticidade nos preparos
- Respeite aversões e preferências quando informadas

Retorne SOMENTE um JSON válido com esta estrutura:
{
  "totalKcal": number,
  "totalProtein": number,
  "totalCarbs": number,
  "totalFat": number,
  "totalSugar": number,
  "waterMl": number,
  "days": [
    {
      "day": 1,
      "meals": [
        {
          "meal": "Café da manhã",
          "mealKey": "cafe",
          "foods": [
            { "name": "Aveia com banana", "qty": "4 col. sopa (40g)", "kcal": 150, "protein": 5, "carbs": 28, "fat": 2, "sugar": 4 }
          ],
          "totalKcal": 350
        }
      ]
    }
  ]
}`;

  document.getElementById('dietGenLoading').style.display = 'block';
  const genBtn = document.getElementById('dietGenForm').querySelector('button[onclick="generateAIDiet()"]');
  if (genBtn) genBtn.disabled = true;

  try {
    const data = await askClaude(prompt, 'Retorne SOMENTE JSON válido sem markdown nem texto adicional.');
    _lastGeneratedDiet = data;
    _lastGeneratedDiet._forPatient = _p2_dietPatientName || null;
    renderDietResult(data);
  } catch(e) {
    showToast('Erro ao gerar dieta: ' + e.message, 'error');
  } finally {
    document.getElementById('dietGenLoading').style.display = 'none';
    if (genBtn) genBtn.disabled = false;
  }
}

// Add "Gerar Dieta IA" button to patient rows in the professional panel
function _p2_addDietGenBtnToPatientRows() {
  if (!isProfessional()) return;
  document.querySelectorAll('.patient-row[data-patient-id]').forEach(row => {
    if (row.querySelector('.btn-gen-diet')) return;
    const patId   = row.dataset.patientId;
    const patName = row.dataset.patientName || 'Paciente';
    const actionsDiv = row.querySelector('.patient-actions') || row.querySelector('[class*="actions"]');
    if (!actionsDiv) return;

    const btn = document.createElement('button');
    btn.className = 'btn-gen-diet';
    btn.title = 'Gerar plano alimentar com IA';
    btn.style.cssText = 'background:linear-gradient(135deg,var(--green-mid),#388e3c);color:white;border:none;border-radius:50px;padding:0.35rem 0.75rem;font-size:0.72rem;font-family:"Syne",sans-serif;font-weight:700;cursor:pointer;white-space:nowrap;';
    btn.innerHTML = '<i class="fa-solid fa-robot" style="color:white!important;margin-right:0.3rem;"></i>Dieta IA';
    btn.onclick = (e) => {
      e.stopPropagation();
      openDietGenModalForPatient(patId, patName);
    };
    actionsDiv.appendChild(btn);
  });
}

// Hook patient load to inject diet gen buttons
const _p2_origRenderPatients = typeof renderPatients === 'function' ? renderPatients : null;
const _p2_moPatientsObs = new MutationObserver(() => {
  if (document.querySelectorAll('.patient-row').length > 0) {
    _p2_addDietGenBtnToPatientRows();
    _p2_injectDiseaseButtons();
  }
});
const profPanel = document.getElementById('panel-prof');
if (profPanel) _p2_moPatientsObs.observe(profPanel, { childList: true, subtree: true });

// ───────────────────────────────────────────────────────────────────────────
// CSS additions for new elements
// ───────────────────────────────────────────────────────────────────────────
(function() {
  const style = document.createElement('style');
  style.textContent = `
    .macro-bar-inner.sugar {
      background: linear-gradient(90deg, #e91e63, #f06292);
    }
    .macro-bar-inner.sugar.over {
      background: linear-gradient(90deg, #c62828, #e53935);
    }
    .macro-bar-inner.water {
      background: linear-gradient(90deg, #1976d2, #42a5f5);
    }
    .macro-bar-inner.water.over {
      background: linear-gradient(90deg, #0d47a1, #1565c0);
    }
    .btn-disease-form {
      transition: all 0.15s;
    }
    .btn-disease-form:hover {
      background: var(--orange-mid) !important;
      color: white !important;
    }
    .btn-gen-diet:hover {
      opacity: 0.88;
      transform: translateY(-1px);
    }
    #dietGenPatientBadge {
      animation: fadeIn 0.2s ease;
    }
    .priority-star {
      color: #ffb300;
      font-size: 0.85em;
    }
    /* Dark mode for patches */
    [data-theme="dark"] .btn-disease-form {
      background: #2e1c08 !important;
      border-color: var(--orange-mid) !important;
      color: #ffb74d !important;
    }
    [data-theme="dark"] #nutSpecialtyBanner {
      background: linear-gradient(135deg, #1e3322, #2e2208) !important;
      border-color: #3a5540 !important;
    }
    [data-theme="dark"] #dietGenPatientBadge {
      background: #1e3322 !important;
      border-color: #3a5540 !important;
    }
  `;
  document.head.appendChild(style);
})();

// Apply unit select patch after init
// ───────────────────────────────────────────────────────────────────────────
setTimeout(_p2_patchUnitSelects, 1500);

console.log('[CalorIA Patch v2] Todas as melhorias carregadas: açúcar/água no diário, formulários por doença, tipos de especialidade, medidas caseiras, gerador de dieta com anamnese.');

// Expor funções para o escopo global
window.loadGoalFromDB = typeof loadGoalFromDB !== 'undefined' ? loadGoalFromDB : undefined;
window.saveGoalToDB = typeof saveGoalToDB !== 'undefined' ? saveGoalToDB : undefined;
window.addWater = typeof addWater !== 'undefined' ? addWater : undefined;
window.loadWaterForDate = typeof loadWaterForDate !== 'undefined' ? loadWaterForDate : undefined;
window.updateWaterDisplay = typeof updateWaterDisplay !== 'undefined' ? updateWaterDisplay : undefined;
window.saveDiseaseFormData = typeof saveDiseaseFormData !== 'undefined' ? saveDiseaseFormData : undefined;
window.closeDiseaseFormModal = typeof closeDiseaseFormModal !== 'undefined' ? closeDiseaseFormModal : undefined;
window.generateAIDiet = typeof generateAIDiet !== 'undefined' ? generateAIDiet : undefined;
window.applyDietToday = typeof applyDietToday !== 'undefined' ? applyDietToday : undefined;
window.printDiet = typeof printDiet !== 'undefined' ? printDiet : undefined;
window.dietGenNewPlan = typeof dietGenNewPlan !== 'undefined' ? dietGenNewPlan : undefined;
window.closeDietGenModal = typeof closeDietGenModal !== 'undefined' ? closeDietGenModal : undefined;
window.selectNutType = typeof selectNutType !== 'undefined' ? selectNutType : undefined;
window.saveNutType = typeof saveNutType !== 'undefined' ? saveNutType : undefined;
window.closeNutTypeModal = typeof closeNutTypeModal !== 'undefined' ? closeNutTypeModal : undefined;

