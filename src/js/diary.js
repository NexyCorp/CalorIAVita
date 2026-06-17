// ═══════════════════════════════════════
// DIARY
// ═══════════════════════════════════════
// Helper para sempre pegar o cliente Supabase correto (compatível com várias versões do auth.js)
const _sb = () => (typeof window !== 'undefined' && (window._db || window.supabase)) || supabase;

function initDiaryDate() {
  renderDiaryDate();
  buildWeeklyGrid();
}

function renderDiaryDate() {
  const d = new Date(diaryDate + 'T12:00:00');
  const days = currentLang==='en'
    ? ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
    : ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  const months = currentLang==='en'
    ? ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    : ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  document.getElementById('diaryDate').textContent = `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
}

function changeDiaryDate(delta) {
  const d = new Date(diaryDate);
  d.setDate(d.getDate() + delta);
  const today = new Date().toISOString().split('T')[0];
  if (d.toISOString().split('T')[0] > today) return; // can't go to future
  diaryDate = d.toISOString().split('T')[0];
  renderDiaryDate();
  if (window.loadDiaryForDate) window.loadDiaryForDate(diaryDate);
  else loadDiaryForDate(diaryDate);
}

async function addToDiaryMeal(mealKey, item) {
  diary[mealKey].push(item);
  renderMeal(mealKey);
  updateDiaryProgress();
  const saveFn = window.saveDiaryToDB || saveDiaryToDB;
  await saveFn(mealKey, item);
  showToast('<i class="fa-solid fa-circle-check ic-check"></i> ' + item.name + ' adicionado!', 'success');
}

function renderMeal(mealKey) {
  const el = document.getElementById('meal-' + mealKey + '-items');
  const kcalEl = document.getElementById('meal-' + mealKey + '-kcal');
  const items = diary[mealKey];
  const total = items.reduce((s,i) => s + i.kcal, 0);
  kcalEl.textContent = total + ' kcal';
  if (items.length === 0) {
    el.innerHTML = `<p style="color:var(--text-muted);font-size:0.82rem;padding:0.6rem 0;">${t('no_food')}</p>`;
    return;
  }
  el.innerHTML = items.map((it, idx) => `
    <div class="diary-item">
      ${it.photoUrl ? `<img src="${it.photoUrl}" alt="${it.name}" class="diary-item-photo" onclick="openPhotoLightbox('${it.photoUrl}')">` : ''}
      <span class="diary-item-name">${it.name}</span>
      <div class="diary-item-actions">
        <span class="diary-item-kcal">${it.kcal} kcal</span>
        <button class="btn-edit-item" onclick="openEditItem('${mealKey}',${idx})" title="Editar"><i class="fa-solid fa-pen ic-search"></i></button>
        <button class="btn-remove" onclick="removeDiaryItem('${mealKey}',${idx})" title="Remover">✕</button>
      </div>
    </div>
  `).join('');
}

function openEditItem(mealKey, idx) {
  const item = diary[mealKey][idx];
  const formEl = document.getElementById('edit-form-' + mealKey);
  const unitOptions = ['g','ml','xícara (240ml)','colher de sopa (15g)','colher de chá (5g)','kg'].map(u => `<option ${item.unit===u||item.unit===u.split(' ')[0]?'selected':''}>${u}</option>`).join('');
  formEl.innerHTML = `
    <input class="edit-field" id="editName-${mealKey}-${idx}" value="${item.name}" style="flex:2;min-width:100px;">
    <input type="number" class="edit-field" id="editQty-${mealKey}-${idx}" value="${item.qty||100}" style="width:70px;" min="1">
    <select class="edit-field" id="editUnit-${mealKey}-${idx}">${unitOptions}</select>
    <button class="btn-save-edit" onclick="saveEditItem('${mealKey}',${idx})">Salvar</button>
    <button onclick="document.getElementById('edit-form-${mealKey}').classList.remove('open')" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:1rem;">✕</button>
  `;
  formEl.classList.add('open');
}

async function saveEditItem(mealKey, idx) {
  const item = diary[mealKey][idx];
  const newName = document.getElementById(`editName-${mealKey}-${idx}`).value.trim();
  const newQty = parseFloat(document.getElementById(`editQty-${mealKey}-${idx}`).value) || 100;
  const newUnit = document.getElementById(`editUnit-${mealKey}-${idx}`).value;

  // Re-fetch nutrition if name changed
  let kcal = item.kcal, carbs = item.carbs, prot = item.prot, fat = item.fat;
  if (newName !== item.name || newQty !== (item.qty||100)) {
    try {
      const data = await askClaude(`JSON: name, calories, carbs, protein, fat para "${newName}" em ${newQty} ${newUnit}.`, 'Retorne SOMENTE JSON válido.');
      kcal = Math.round(data.calories||0); carbs = data.carbs||0; prot = data.protein||0; fat = data.fat||0;
    } catch(e) {}
  }

  const updated = { ...item, name:newName, qty:newQty, unit:newUnit, kcal, carbs, prot, fat };
  if (item.id) {
    await _sb().from('diary_entries').update({
      food_name:newName, kcal, carbs, protein:prot, fat, qty:newQty, unit:newUnit
    }).eq('id', item.id);
  }
  diary[mealKey][idx] = updated;
  renderMeal(mealKey);
  updateDiaryProgress();
  document.getElementById('edit-form-' + mealKey).classList.remove('open');
  showToast('<i class="fa-solid fa-circle-check ic-check"></i> Alimento editado!');
}

async function removeDiaryItem(mealKey, idx) {
  const item = diary[mealKey][idx];
  if (item?.id) await _sb().from('diary_entries').delete().eq('id', item.id);
  diary[mealKey].splice(idx, 1);
  renderMeal(mealKey);
  updateDiaryProgress();
  showToast('🗑 Removido', 'error');
}

function updateDiaryProgress() {
  const all = [...diary.cafe, ...diary.almoco, ...diary.lanche, ...diary.jantar];
  const totalKcal = all.reduce((s,i) => s+i.kcal, 0);
  const totalCarbs = all.reduce((s,i) => s+(i.carbs||0), 0);
  const totalProt = all.reduce((s,i) => s+(i.prot||0), 0);
  const totalFat = all.reduce((s,i) => s+(i.fat||0), 0);
  const totalSugar = all.reduce((s,i) => s+(i.sugar||0), 0);

  const consumedEl = document.getElementById('diaryKcalConsumed');
  if (consumedEl) consumedEl.textContent = Math.round(totalKcal);

  const rem = diaryGoal - totalKcal;
  const remEl = document.getElementById('diaryRemaining');
  if (remEl) {
    if (rem >= 0) {
      remEl.textContent = rem.toFixed(0) + ' kcal restantes para sua meta';
      remEl.style.color = rem < diaryGoal * 0.1 ? 'var(--yellow-hot)' : '';
    } else {
      remEl.innerHTML = Math.abs(rem).toFixed(0) + ' kcal acima da meta <i class="fa-solid fa-triangle-exclamation ic-alert"></i>';
      remEl.style.color = '#e53935';
    }
  }

  const goalDisp = document.getElementById('diaryGoalDisplay');
  if (goalDisp) goalDisp.textContent = diaryGoal;

  const pct = Math.min((totalKcal / diaryGoal) * 100, 100);
  const bar = document.getElementById('diaryProgressBar');
  if (bar) {
    bar.style.width = pct + '%';
    bar.classList.toggle('over', totalKcal > diaryGoal);
  }

  const carbsVal = document.getElementById('diaryCarbsVal');
  if (carbsVal) carbsVal.textContent = totalCarbs.toFixed(0) + 'g';
  const protVal = document.getElementById('diaryProtVal');
  if (protVal) protVal.textContent = totalProt.toFixed(0) + 'g';
  const fatVal = document.getElementById('diaryFatVal');
  if (fatVal) fatVal.textContent = totalFat.toFixed(0) + 'g';

  const carbGoal = (diaryGoal * 0.50) / 4;
  const protGoal = (diaryGoal * 0.25) / 4;
  const fatGoal = (diaryGoal * 0.25) / 9;

  const carbsBar = document.getElementById('diaryCarbsBar');
  if (carbsBar) carbsBar.style.width = Math.min((totalCarbs/carbGoal)*100, 100) + '%';
  const protBar = document.getElementById('diaryProtBar');
  if (protBar) protBar.style.width = Math.min((totalProt/protGoal)*100, 100) + '%';
  const fatBar = document.getElementById('diaryFatBar');
  if (fatBar) fatBar.style.width = Math.min((totalFat/fatGoal)*100, 100) + '%';

  // Sugar bar
  const sugarEl = document.getElementById('diarySugarVal');
  const sugarBar = document.getElementById('diarySugarBar');
  const sugarGoalEl = document.getElementById('diarySugarGoalDisplay');
  if (sugarEl) sugarEl.textContent = totalSugar.toFixed(1) + 'g';
  if (sugarGoalEl) sugarGoalEl.textContent = diaryGoalSugar;
  if (sugarBar) {
    const sp = Math.min((totalSugar / Math.max(diaryGoalSugar, 1)) * 100, 100);
    sugarBar.style.width = sp + '%';
    sugarBar.classList.toggle('over', totalSugar > diaryGoalSugar);
  }

  // Water display
  if (typeof updateWaterDisplay === 'function') {
    updateWaterDisplay();
  } else {
    const wVal = document.getElementById('diaryWaterVal');
    const wGoal = document.getElementById('diaryWaterGoalDisplay');
    const wBar = document.getElementById('diaryWaterBar');
    if (wVal) wVal.textContent = diaryWaterMl;
    if (wGoal) wGoal.textContent = diaryGoalWater;
    if (wBar) {
      const wp = Math.min((diaryWaterMl / Math.max(diaryGoalWater, 1)) * 100, 100);
      wBar.style.width = wp + '%';
      wBar.classList.toggle('over', diaryWaterMl > diaryGoalWater * 1.5);
    }
  }

  // Topbar mini progress
  const topText = document.getElementById('topbarKcalText');
  if (topText) topText.textContent = `${Math.round(totalKcal)} / ${diaryGoal} kcal`;
  const topFill = document.getElementById('topbarKcalFill');
  if (topFill) {
    topFill.style.width = pct + '%';
    topFill.classList.toggle('over', totalKcal > diaryGoal);
  }

  updateHomePanel();
}

function updateHomePanel() {
  const metaName = currentUser?.user_metadata?.name || currentUser?.user_metadata?.full_name || '';
  const name = (currentProfile?.name && currentProfile.name.trim()) ? currentProfile.name.trim() : (metaName || currentUser?.email?.split('@')[0] || '');
  const nameEl = document.getElementById('homeUserName');
  if (nameEl) nameEl.textContent = name ? name.split(' ')[0] + '!' : '!';

  const all = [...diary.cafe, ...diary.almoco, ...diary.lanche, ...diary.jantar];
  const totalKcal = all.reduce((s,i) => s+i.kcal, 0);
  const totalCarbs = all.reduce((s,i) => s+(i.carbs||0), 0);
  const totalProt  = all.reduce((s,i) => s+(i.prot||0), 0);
  const totalFat   = all.reduce((s,i) => s+(i.fat||0), 0);
  const goal = diaryGoal || 2000;
  const pct = Math.min((totalKcal / goal) * 100, 100);

  const setEl = (id, val) => { const e = document.getElementById(id); if(e) e.textContent = val; };
  const setW  = (id, w)   => { const e = document.getElementById(id); if(e) e.style.width = w + '%'; };

  setEl('homeKcalToday', Math.round(totalKcal));
  setEl('homeKcalGoalLabel', 'meta: ' + goal + ' kcal');
  setW('homeKcalBar', pct);
  setEl('homeCarbsVal', totalCarbs.toFixed(0) + 'g');
  setEl('homeProtVal',  totalProt.toFixed(0) + 'g');
  setEl('homeFatVal',   totalFat.toFixed(0) + 'g');
  const carbGoal = (goal*0.50)/4;
  const protGoal = (goal*0.25)/4;
  const fatGoal  = (goal*0.25)/9;
  setW('homeCarbsBar', Math.min((totalCarbs/carbGoal)*100,100));
  setW('homeProtBar',  Math.min((totalProt/protGoal)*100,100));
  setW('homeFatBar',   Math.min((totalFat/fatGoal)*100,100));
}


async function diaryAddFood() {
  const q = document.getElementById('diaryAddInput').value.trim();
  const qty = parseFloat(document.getElementById('diaryAddQty').value) || 100;
  const unit = document.getElementById('diaryAddUnit').value;
  const meal = document.getElementById('diaryMealSelect').value;
  if (!q) return;

  const btn = document.getElementById('btnDiaryAdd');
  btn.innerHTML = '<i class="fa-solid fa-hourglass-half ic-water"></i>';
  btn.disabled = true;

  try {
    const data = await askClaude(
      `JSON: name, calories, carbs, protein, fat para "${q}" em ${qty} ${unit}.`,
      'Retorne SOMENTE JSON válido.'
    );
    await addToDiaryMeal(meal, {
      name: data.name || q,
      kcal: Math.round(data.calories||0),
      carbs: data.carbs||0, prot: data.protein||0, fat: data.fat||0,
      qty, unit
    });
    document.getElementById('diaryAddInput').value = '';
  } catch(e) {
    const msg = e.message?.includes('429')
      ? '⏳ Limite de requisições da IA. Aguarde alguns segundos e tente novamente.'
      : 'Erro ao buscar alimento';
    showToast(msg, 'error');
  } finally {
    btn.textContent = '+ ' + t('add');
    btn.disabled = false;
  }
}

function toggleMeal(key) {
  const el = document.getElementById('meal-' + key + '-items');
  el.style.display = el.style.display === 'none' ? '' : 'none';
}

async function clearDiary() {
  if (!confirm('Limpar todo o diário deste dia?')) return;
  if (currentUser) {
    await _sb().from('diary_entries').delete().eq('user_id', currentUser.id).eq('date', diaryDate);
  }
  diary = { cafe:[], almoco:[], lanche:[], jantar:[] };
  ['cafe','almoco','lanche','jantar'].forEach(k => renderMeal(k));
  updateDiaryProgress();
  showToast('🗑 Diário limpo', 'error');
}

async function saveDiaryToDB(mealKey, item) {
  if (!currentUser) return;
  try {
    const { data, error } = await _sb().from('diary_entries').insert({
      user_id: currentUser.id, date: diaryDate, meal: mealKey,
      food_name: item.name, kcal: item.kcal,
      carbs: item.carbs||0, protein: item.prot||0, fat: item.fat||0,
      qty: item.qty||100, unit: item.unit||'g',
      photo_url: item.photoUrl || null
    }).select().maybeSingle();
    if (error) { console.warn('[saveDiaryToDB]', error.code, error.message); return; }
    if (data) item.id = data.id;
  } catch(e) { console.warn('[saveDiaryToDB] exception:', e); }
}

async function loadDiaryForDate(date) {
  diary = { cafe:[], almoco:[], lanche:[], jantar:[] };
  if (!currentUser) return;
  const { data } = await _sb().from('diary_entries').select('*').eq('user_id', currentUser.id).eq('date', date);
  (data||[]).forEach(entry => {
    const meal = entry.meal;
    if (diary[meal]) diary[meal].push({ id:entry.id, name:entry.food_name, kcal:entry.kcal, carbs:entry.carbs, prot:entry.protein, fat:entry.fat, qty:entry.qty||100, unit:entry.unit||'g', photoUrl: entry.photo_url||null });
  });
  ['cafe','almoco','lanche','jantar'].forEach(m => renderMeal(m));
  updateDiaryProgress();
}

// ─── Goal persistence ───
async function saveGoalToDB(kcal) {
  if (!currentUser) return;
  await _sb().from('user_goals').upsert({ user_id:currentUser.id, daily_kcal:kcal, updated_at:new Date().toISOString() }, { onConflict:'user_id' });
}

async function loadGoalFromDB() {
  if (!currentUser) return;
  const { data } = await _sb().from('user_goals').select('daily_kcal').eq('user_id',currentUser.id).maybeSingle();
  if (data) {
    diaryGoal = data.daily_kcal;
    const gi = document.getElementById('goalInput');
    if (gi) gi.value = diaryGoal;
  }
}

// ═══════════════════════════════════════
// CALCULATOR
// ═══════════════════════════════════════
function selectGoal(btn) {
  document.querySelectorAll('#panel-goal .goal-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentGoalDelta = parseInt(btn.dataset.goal);
}

async function calcCalories() {
  const sex = document.getElementById('calcSex').value;
  const age = parseInt(document.getElementById('calcAge').value);
  const weight = parseFloat(document.getElementById('calcWeight').value);
  const height = parseFloat(document.getElementById('calcHeight').value);
  const activity = parseFloat(document.getElementById('calcActivity').value);

  let tmb = sex === 'm'
    ? 88.362 + (13.397*weight) + (4.799*height) - (5.677*age)
    : 447.593 + (9.247*weight) + (3.098*height) - (4.330*age);
  const tdee = Math.round(tmb * activity);
  const goal = tdee + currentGoalDelta;
  const carbs = Math.round((goal*0.50)/4);
  const prot = Math.round((goal*0.25)/4);
  const fat = Math.round((goal*0.25)/9);

  document.getElementById('calcTMB').textContent = Math.round(tmb);
  document.getElementById('calcTDEE').textContent = tdee;
  document.getElementById('calcGoalVal').textContent = goal;
  document.getElementById('calcMacroCarbs').textContent = carbs + 'g';
  document.getElementById('calcMacroProt').textContent = prot + 'g';
  document.getElementById('calcMacroFat').textContent = fat + 'g';

  const advice = currentGoalDelta < 0
    ? '<i class="fa-solid fa-lightbulb ic-star"></i> Para emagrecer com saúde, mantenha déficit moderado e priorize proteínas.'
    : currentGoalDelta > 0
    ? '<i class="fa-solid fa-lightbulb ic-star"></i> Para ganhar massa, distribua em 5-6 refeições e priorize carboidratos ao redor do treino.'
    : '<i class="fa-solid fa-lightbulb ic-star"></i> Para manter o peso, foque na qualidade nutricional e consistência.';
  document.getElementById('calcAdvice').innerHTML = advice;
  document.getElementById('calcResult').classList.add('show');

  diaryGoal = goal;
  document.getElementById('goalInput').value = goal;
  updateDiaryProgress();
  await saveGoalToDB(goal);

  try {
    await _sb().from('profiles').update({ sex, age, weight, height }).eq('id', currentUser.id);
    currentProfile = { ...currentProfile, sex, age, weight, height };
  } catch(e) { console.warn('[CalorIA] Não foi possível sincronizar dados no perfil:', e); }

  showToast('<i class="fa-solid fa-bullseye ic-goal"></i> Meta calculada: ' + goal + ' kcal/dia');
}

// ═══════════════════════════════════════
// GOAL WEEKLY GRID
// ═══════════════════════════════════════
function buildWeeklyGrid() {
  const dayNames = currentLang==='en'
    ? ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
    : ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const today = new Date().getDay();
  const grid = document.getElementById('weeklyGrid');
  const progress = JSON.parse(localStorage.getItem('caloriaWeekProgress') || '{}');
  const totalKcal = Object.values(diary).flat().reduce((s,x) => s+x.kcal, 0);
  if (totalKcal > 0) progress[today] = totalKcal;
  localStorage.setItem('caloriaWeekProgress', JSON.stringify(progress));

  grid.innerHTML = dayNames.map((d, i) => {
    const isToday = i === today;
    const filled = progress[i] && progress[i] >= diaryGoal * 0.8;
    return `<div class="day-cell ${filled?'filled':''} ${isToday?'today':''}">
      <div class="day-cell-name">${d}</div>
      <div class="day-cell-num">${progress[i] ? Math.round(progress[i]) : '—'}</div>
    </div>`;
  }).join('');
}

async function saveGoal() {
  diaryGoal = parseInt(document.getElementById('goalInput').value) || 2000;
  updateDiaryProgress();
  buildWeeklyGrid();
  document.getElementById('goalInsight').innerHTML = `<i class="fa-solid fa-circle-check ic-check"></i> Meta de <strong>${diaryGoal} kcal/dia</strong> salva!`;
  await saveGoalToDB(diaryGoal);
  showToast('<i class="fa-solid fa-bullseye ic-goal"></i> Meta salva!');
}

// ═══════════════════════════════════════
// CAMERA
// ═══════════════════════════════════════
let currentImageBase64 = null, currentImageMimeType = 'image/jpeg';

function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  currentImageMimeType = file.type || 'image/jpeg';
  const reader = new FileReader();
  reader.onload = ev => {
    const src = ev.target.result;
    currentImageBase64 = src.split(',')[1];
    document.getElementById('cameraImg').src = src;
    document.getElementById('cameraPreview').style.display = 'block';
    document.getElementById('analyzeBtn').classList.add('show');
    document.getElementById('camResult').classList.remove('show');
  };
  reader.readAsDataURL(file);
}

async function analyzeImage() {
  if (!currentImageBase64) return;
  document.getElementById('camLoading').classList.add('show');
  document.getElementById('camResult').classList.remove('show');
  document.getElementById('analyzeBtn').disabled = true;
  try {
    const result = await askGeminiWithImage(currentImageBase64, currentImageMimeType,
      'Analise esta imagem. Retorne JSON: foodName, confidence, portion, calories, carbs, protein, fat, fiber, tips.');
    lastCamResult = result;
    document.getElementById('camFoodName').textContent = result.foodName;
    document.getElementById('camConfidence').textContent = `✓ ${result.confidence} • ${result.portion}`;
    document.getElementById('camKcal').textContent = Math.round(result.calories||0);
    document.getElementById('camCarbs').textContent = (result.carbs||0).toFixed(1) + 'g';
    document.getElementById('camProt').textContent = (result.protein||0).toFixed(1) + 'g';
    document.getElementById('camFat').textContent = (result.fat||0).toFixed(1) + 'g';
    document.getElementById('camExtra').innerHTML = result.tips ? '<i class="fa-solid fa-lightbulb ic-star"></i> ' + result.tips : '';
    document.getElementById('camResult').classList.add('show');
  } catch(e) {
    const camMsg = e.message?.includes('401') || e.message?.includes('403')
      ? '🔑 Chave API inválida. Verifique as configurações.'
      : e.message?.includes('429')
      ? '<i class="fa-solid fa-hourglass-half ic-water"></i> Limite de requisições atingido. Aguarde e tente novamente.'
      : e.message?.includes('413') || e.message?.includes('large')
      ? '📦 Imagem muito grande. Use uma foto menor.'
      : '<i class="fa-solid fa-xmark ic-alert"></i> Não foi possível analisar a imagem. Tente uma foto mais clara e bem iluminada.';
    showToast(camMsg, 'error');
  } finally {
    document.getElementById('camLoading').classList.remove('show');
    document.getElementById('analyzeBtn').disabled = false;
  }
}

async function addCamToDiary() {
  if (!lastCamResult) return;
  const _camMeal = document.getElementById('camMealSelect')?.value || document.getElementById('diaryMealSelect')?.value || 'almoco';
  let photoUrl = null;
  // Faz upload da foto para o Storage (se o usuário estiver logado)
  if (currentUser && currentImageBase64) {
    try {
      const ext = (currentImageMimeType.split('/')[1] || 'jpg').replace('jpeg','jpg');
      const path = `${currentUser.id}/${Date.now()}.${ext}`;
      const byteChars = atob(currentImageBase64);
      const byteNumbers = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
      const blob = new Blob([new Uint8Array(byteNumbers)], { type: currentImageMimeType });
      const { error: upErr } = await _sb().storage.from('diary-photos').upload(path, blob, { upsert: true, contentType: currentImageMimeType });
      if (!upErr) {
        const { data: urlData } = _sb().storage.from('diary-photos').getPublicUrl(path);
        photoUrl = urlData?.publicUrl || null;
      }
    } catch (e) { console.warn('Falha ao salvar foto:', e); }
  }
  addToDiaryMeal(_camMeal, { name:lastCamResult.foodName, kcal:Math.round(lastCamResult.calories||0), carbs:lastCamResult.carbs||0, prot:lastCamResult.protein||0, fat:lastCamResult.fat||0, photoUrl });
  showPanel('diary', null); setBottomNav('diary');
}

// ═══════════════════════════════════════
// COMPARE
// ═══════════════════════════════════════

function addCompareFoodToDiary(name, kcal, carbs, prot, fat) {
  const meal = document.getElementById('cmpDiaryMealSelect')?.value || document.getElementById('diaryMealSelect')?.value || 'almoco';
  addToDiaryMeal(meal, { name, kcal: Math.round(kcal), carbs: parseFloat(carbs), prot: parseFloat(prot), fat: parseFloat(fat) });
  showToast('<i class="fa-solid fa-circle-check ic-check"></i> ' + name + ' adicionado ao diario!');
}
async function compareFoods() {
  const f1 = document.getElementById('cmp1').value.trim();
  const f2 = document.getElementById('cmp2').value.trim();
  if (!f1 || !f2) { showToast('Preencha ambos os alimentos!', 'error'); return; }
  document.getElementById('cmpLoading').classList.add('show');
  document.getElementById('cmpCard1').classList.remove('show');
  document.getElementById('cmpCard2').classList.remove('show');
  document.getElementById('cmpSummary').style.display = 'none';
  document.getElementById('cmpMealSelectRow').style.display = 'none';

  // Build user profile + anamnese context for recommendation
  const p = currentProfile || {};
  let diseaseCtx = '';
  try {
    if (currentUser?.id) {
      const { data: an } = await _sb().from('patient_anamnese').select('diseases_general,diseases_chronic_auto,diseases_other').eq('patient_id', currentUser.id).maybeSingle();
      if (an) {
        const diseases = [...(an.diseases_general||[]), ...(an.diseases_chronic_auto||[])].filter(Boolean);
        if (diseases.length) diseaseCtx += ` Doenças: ${diseases.join(', ')}.`;
        if (an.diseases_other) diseaseCtx += ` Outras condições: ${an.diseases_other}.`;
      }
    }
  } catch(e) {}

  const userProfileCtx = [
    p.sex ? `Sexo: ${p.sex === 'm' ? 'masculino' : 'feminino'}` : '',
    p.age ? `Idade: ${p.age} anos` : '',
    p.weight ? `Peso: ${p.weight}kg` : '',
    p.height ? `Altura: ${p.height}cm` : '',
    p.body_fat_pct ? `Percentual de gordura: ${p.body_fat_pct}%` : '',
    diseaseCtx
  ].filter(Boolean).join('. ');

  const prompt = `Compare "${f1}" e "${f2}" por 100g.
DADOS DE SAÚDE E PERFIL DO USUÁRIO:
${userProfileCtx || 'Nenhum dado informado.'}

Escolha qual o alimento mais recomendado especificamente para este usuário com base no perfil de saúde dele (e.g., se for diabético, muito provavelmente alimentos com açúcar não seriam recomendados; se tiver alto percentual de gordura, alimentos menos gordurosos ou com menor carga glicêmica; se quiser ganhar massa, alimentos com maior teor proteico, etc.).

Retorne JSON com esta estrutura exata:
{
  "food1": { "name": string, "calories": number, "carbs": number, "protein": number, "fat": number, "fiber": number, "sodium": number },
  "food2": { "name": string, "calories": number, "carbs": number, "protein": number, "fat": number, "fiber": number, "sodium": number },
  "winner": 1 or 2,
  "summary": string
}`;

  try {
    const data = await askClaude(prompt, 'Retorne SOMENTE JSON válido.');
    const d1 = data.food1, d2 = data.food2;
    const w1 = data.winner === 1;

    function renderCompCard(d, cardId, nameId, kcalId, statsId, badgeId, isWinner) {
      const card = document.getElementById(cardId);
      if (!card) return;
      card.classList.add('show');
      card.classList.toggle('winner', isWinner);
      const badge = document.getElementById(badgeId);
      if (badge) {
        badge.innerHTML = '<i class="fa-solid fa-star"></i> Recomendado';
        badge.style.display = isWinner ? 'block' : 'none';
      }
      document.getElementById(nameId).textContent = d.name;
      document.getElementById(kcalId).textContent = Math.round(d.calories) + ' kcal';
      const stats = document.getElementById(statsId);
      if (stats) {
        stats.innerHTML = [
          ['<i class="fa-solid fa-wheat-awn ic-carb"></i> Carboidratos', (d.carbs||0).toFixed(1)+'g'],
          ['<i class="fa-solid fa-dumbbell ic-fire"></i> Proteínas', (d.protein||0).toFixed(1)+'g'],
          ['<i class="fa-solid fa-droplet ic-water"></i> Gorduras', (d.fat||0).toFixed(1)+'g'],
          ['🥦 Fibras', (d.fiber||0).toFixed(1)+'g'],
          ['🧂 Sódio', Math.round(d.sodium||0)+'mg'],
        ].map(([l,v]) => `<div class="compare-stat-row"><span class="compare-stat-label">${l}</span><span class="compare-stat-val">${v}</span></div>`).join('') +
        `<button onclick="addCompareFoodToDiary('${String(d.name||'').replace(/'/g,"\\'")}',${Math.round(d.calories||0)},${(d.carbs||0).toFixed(1)},${(d.protein||0).toFixed(1)},${(d.fat||0).toFixed(1)})" style="margin-top:0.8rem;width:100%;background:var(--green-mid);color:white;border:none;border-radius:50px;padding:0.6rem 1rem;font-family:'Syne',sans-serif;font-weight:700;font-size:0.82rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:0.4rem;"><i class="fa-solid fa-book" style="color:white!important;"></i> Adicionar ao Diario</button>`;
      }
    }

    renderCompCard(d1,'cmpCard1','cmpName1','cmpKcal1','cmpStats1','cmpBadge1',w1);
    renderCompCard(d2,'cmpCard2','cmpName2','cmpKcal2','cmpStats2','cmpBadge2',!w1);
    document.getElementById('cmpMealSelectRow').style.display = 'block';
    const sum = document.getElementById('cmpSummary');
    if (sum) {
      sum.innerHTML = '<i class="fa-solid fa-robot ic-chat"></i> <strong>Recomendação IA:</strong> ' + (data.summary || '');
      sum.style.display = 'block';
    }
  } catch(e) {
    showToast('Erro na comparação', 'error');
  } finally {
    document.getElementById('cmpLoading').classList.remove('show');
  }
}

// Expor funções para o escopo global
window.initDiaryDate = initDiaryDate;
window.renderDiaryDate = renderDiaryDate;
window.changeDiaryDate = changeDiaryDate;
window.addToDiaryMeal = addToDiaryMeal;
window.renderMeal = renderMeal;
window.openEditItem = openEditItem;
window.saveEditItem = saveEditItem;
window.removeDiaryItem = typeof removeDiaryItem !== 'undefined' ? removeDiaryItem : undefined; // wait, let's check if it exists or if we should just expose it
window.updateDiaryProgress = typeof updateDiaryProgress !== 'undefined' ? updateDiaryProgress : undefined;
window.saveDiaryToDB = typeof saveDiaryToDB !== 'undefined' ? saveDiaryToDB : undefined;
window.loadDiaryForDate = typeof loadDiaryForDate !== 'undefined' ? loadDiaryForDate : undefined;
window.clearDiaryMeal = typeof clearDiaryMeal !== 'undefined' ? clearDiaryMeal : undefined;
window.openPhotoLightbox = typeof openPhotoLightbox !== 'undefined' ? openPhotoLightbox : undefined;
window.closePhotoLightbox = typeof closePhotoLightbox !== 'undefined' ? closePhotoLightbox : undefined;
window.buildWeeklyGrid = typeof buildWeeklyGrid !== 'undefined' ? buildWeeklyGrid : undefined;
window.changeWeeklyWeek = typeof changeWeeklyWeek !== 'undefined' ? changeWeeklyWeek : undefined;
window.openCamPanel = typeof openCamPanel !== 'undefined' ? openCamPanel : undefined;
window.closeCamPanel = typeof closeCamPanel !== 'undefined' ? closeCamPanel : undefined;
window.startCam = typeof startCam !== 'undefined' ? startCam : undefined;
window.stopCam = typeof stopCam !== 'undefined' ? stopCam : undefined;
window.takePhoto = typeof takePhoto !== 'undefined' ? takePhoto : undefined;
window.retakePhoto = typeof retakePhoto !== 'undefined' ? retakePhoto : undefined;
window.analyzePhoto = typeof analyzePhoto !== 'undefined' ? analyzePhoto : undefined;
window.addCamToDiary = addCamToDiary;
window.addCompareFoodToDiary = addCompareFoodToDiary;
window.compareFoods = compareFoods;
window.updateHomePanel = updateHomePanel;
window.selectGoal = selectGoal;
window.calcCalories = calcCalories;
window.saveGoal = saveGoal;
window.handleImageUpload = handleImageUpload;
window.analyzeImage = analyzeImage;
