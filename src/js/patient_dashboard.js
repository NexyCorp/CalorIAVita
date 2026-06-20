// ══════════════════════════════════════════════════════════
// PATIENT DASHBOARD (Dossiê do Paciente) — Visão Nutricionista
// ══════════════════════════════════════════════════════════
window._currentPdId = null;
window._currentPdName = null;

function openPatientDashboard(id, name) {
  window._currentPdId = id;
  window._currentPdName = name;
  const nameEl = document.getElementById('pdName');
  if (nameEl) nameEl.innerHTML = '<i class="fa-solid fa-user"></i> ' + name;
  const modal = document.getElementById('patientDashboardModal');
  if (modal) modal.classList.add('show');

  // Default date = today
  const tzoffset = (new Date()).getTimezoneOffset() * 60000;
  const localISOTime = (new Date(Date.now() - tzoffset)).toISOString().split('T')[0];
  const dateEl = document.getElementById('pdDiaryDate');
  if (dateEl) dateEl.value = localISOTime;

  // Click first tab
  const firstTab = document.querySelector('.pd-tab');
  if (firstTab) firstTab.click();
}
window.openPatientDashboard = openPatientDashboard;

function closePatientDashboard() {
  const modal = document.getElementById('patientDashboardModal');
  if (modal) modal.classList.remove('show');
}
window.closePatientDashboard = closePatientDashboard;


function switchPdTab(tabId, btn) {
  document.querySelectorAll('.pd-tab').forEach(function(b) { b.classList.remove('active'); });
  document.querySelectorAll('.pd-content').forEach(function(c) { c.classList.remove('active'); });
  btn.classList.add('active');
  var tabEl = document.getElementById('pdTab-' + tabId);
  if (tabEl) tabEl.classList.add('active');

  if (tabId === 'anamnese') loadPdAnamnese();
  else if (tabId === 'diary') loadPdDiary();
  else if (tabId === 'dietas') loadPdDietas();
  else if (tabId === 'goals') loadPdGoals();
}
window.switchPdTab = switchPdTab;

async function loadPdAnamnese() {
  var el = document.getElementById('pdAnamneseData');
  if (!el) return;
  el.innerHTML = '<p style="color:var(--text-muted);">Carregando anamnese...</p>';
  try {
    var res = await supabase.from('patient_anamnese').select('*').eq('patient_id', window._currentPdId).maybeSingle();
    var an = res.data;
    if (!an) {
      el.innerHTML = '<p style="color:var(--text-muted);">Nenhuma anamnese preenchida ainda.</p>';
      return;
    }
    var dGeneral = (an.diseases_general || []).join(', ') || 'Nenhuma';
    var dChronic = (an.diseases_chronic_auto || []).join(', ') || 'Nenhuma';
    el.innerHTML = '<div style="background:var(--bg-card);padding:1rem;border-radius:8px;border:1px solid var(--border);">' +
      '<p><strong>Data de Nasc.:</strong> ' + (an.dob || '—') + '</p>' +
      '<p><strong>Peso Habitual:</strong> ' + (an.weight_usual ? an.weight_usual + 'kg' : '—') + '</p>' +
      '<p><strong>Peso Desejado:</strong> ' + (an.weight_desired ? an.weight_desired + 'kg' : '—') + '</p>' +
      '<p><strong>Circunferência Abdominal:</strong> ' + (an.waist_cm ? an.waist_cm + 'cm' : '—') + '</p>' +
      '<p><strong>% Gordura Corporal:</strong> ' + (an.body_fat_pct ? an.body_fat_pct + '%' : '—') + '</p>' +
      '<p><strong>Atividade Física:</strong> ' + (an.activity_type || '—') + ' — ' + (an.activity_freq ? an.activity_freq + 'x/sem' : '—') + '</p>' +
      '<p><strong>Doenças Gerais:</strong> ' + dGeneral + '</p>' +
      '<p><strong>Doenças Crônicas/Autoimunes:</strong> ' + dChronic + '</p>' +
      '<p><strong>Outras Condições/Detalhes:</strong> ' + (an.diseases_other || '—') + '</p>' +
      '<p><strong>Medicamentos:</strong> ' + (an.medications || '—') + '</p>' +
      '<p><strong>Suplementos:</strong> ' + (an.supplements || '—') + '</p>' +
      '<p><strong>Alergias:</strong> ' + ((an.allergies || []).join(', ') || 'Nenhuma') + '</p>' +
      '<div style="margin-top:1rem;"><button class="btn-primary" onclick="window.printPatientAnamnese(window._currentPdId, window._currentPdName)">' +
      '<i class="fa-solid fa-file-pdf"></i> Imprimir Anamnese Completa</button></div>' +
      '</div>';
  } catch (err) {
    console.error('[loadPdAnamnese]', err);
    document.getElementById('pdAnamneseData').innerHTML = '<p style="color:var(--text-muted);">Erro ao carregar anamnese.</p>';
  }
}
window.loadPdAnamnese = loadPdAnamnese;

async function loadPdDiary() {
  var dateEl = document.getElementById('pdDiaryDate');
  var date = dateEl ? dateEl.value : new Date().toISOString().split('T')[0];
  var el = document.getElementById('pdDiaryContent');
  if (!el) return;
  el.innerHTML = '<p style="color:var(--text-muted);">Buscando registros...</p>';
  try {
    var res = await supabase.from('diary_entries').select('*').eq('user_id', window._currentPdId).eq('date', date).order('created_at', { ascending: true });
    var entries = res.data;
    if (!entries || entries.length === 0) {
      el.innerHTML = '<p style="color:var(--text-muted);">Nenhum registro encontrado nesta data.</p>';
      return;
    }
    var totalKcal = entries.reduce(function(s, e) { return s + (e.kcal || 0); }, 0);
    var html = '<div style="background:var(--green-pale);padding:0.7rem 1rem;border-radius:8px;margin-bottom:1rem;border:1px solid var(--green-light);">';
    html += '<strong style="color:var(--green-deep);">Total do dia: ' + Math.round(totalKcal) + ' kcal</strong></div>';

    entries.forEach(function(e) {
      var photoUrl = e.photo_url || e.photoUrl || null;
      var photoHtml = photoUrl
        ? '<img src="' + photoUrl + '" style="max-width:100%;max-height:220px;object-fit:cover;border-radius:8px;margin-top:0.5rem;cursor:pointer;" onclick="window.open(this.src,\'_blank\')" />'
        : '';
      html += '<div style="background:var(--bg-card);padding:1rem;border-radius:8px;border:1px solid var(--border);margin-bottom:0.75rem;">';
      html += '<div style="display:flex;justify-content:space-between;align-items:center;">';
      html += '<h4 style="margin:0;color:var(--green-deep);font-size:0.9rem;text-transform:capitalize;">' + (e.meal || 'Refeição') + '</h4>';
      html += '<span style="font-weight:700;color:var(--text-main);">' + (e.kcal || 0) + ' kcal</span></div>';
      html += '<p style="margin:0.3rem 0 0 0;font-size:0.9rem;">' + (e.food_name || 'Alimento') + '</p>';
      html += '<p style="margin:0.2rem 0;font-size:0.78rem;color:var(--text-muted);">C:' + (e.carbs || 0).toFixed(1) + 'g | P:' + (e.protein || 0).toFixed(1) + 'g | G:' + (e.fat || 0).toFixed(1) + 'g</p>';
      html += photoHtml;
      html += '</div>';
    });
    el.innerHTML = html;
  } catch (err) {
    console.error('[loadPdDiary]', err);
    el.innerHTML = '<p style="color:var(--text-muted);">Erro ao carregar diário.</p>';
  }
}
window.loadPdDiary = loadPdDiary;

async function loadPdDietas() {
  var el = document.getElementById('pdDietasContent');
  if (!el) return;
  el.innerHTML = '<p style="color:var(--text-muted);">Buscando dietas...</p>';
  try {
    var res = await supabase.from('user_diets').select('*').eq('user_id', window._currentPdId).order('created_at', { ascending: false });
    var dietas = res.data;
    if (!dietas || dietas.length === 0) {
      el.innerHTML = '<p style="color:var(--text-muted);">Nenhuma dieta gerada pela IA encontrada.</p>';
      return;
    }
    var html = '';
    dietas.forEach(function(d) {
      var planText = '';
      if (d.diet_plan) {
        if (typeof d.diet_plan === 'string') planText = d.diet_plan;
        else if (d.diet_plan.text) planText = d.diet_plan.text;
        else planText = JSON.stringify(d.diet_plan, null, 2);
      }
      html += '<div style="background:var(--bg-card);padding:1rem;border-radius:8px;border:1px solid var(--border);margin-bottom:0.75rem;">';
      html += '<div style="display:flex;justify-content:space-between;align-items:center;">';
      html += '<h4 style="margin:0;color:var(--green-deep);">' + (d.title || 'Dieta sem nome') + '</h4>';
      html += (d.is_active ? '<span style="background:#dcfce7;color:#166534;font-size:0.72rem;padding:2px 8px;border-radius:50px;font-weight:700;">Ativa</span>' : '') + '</div>';
      html += '<p style="font-size:0.78rem;color:var(--text-muted);margin:0.3rem 0;">' + new Date(d.created_at).toLocaleString('pt-BR') + '</p>';
      if (planText) {
        html += '<details style="margin-top:0.5rem;">';
        html += '<summary style="cursor:pointer;color:var(--green-mid);font-size:0.85rem;font-weight:700;">Ver plano completo</summary>';
        html += '<div style="margin-top:0.5rem;font-size:0.82rem;white-space:pre-wrap;max-height:300px;overflow-y:auto;">' + planText + '</div>';
        html += '</details>';
      }
      html += '</div>';
    });
    el.innerHTML = html;
  } catch (err) {
    console.error('[loadPdDietas]', err);
    el.innerHTML = '<p style="color:var(--text-muted);">Erro ao carregar dietas.</p>';
  }
}
window.loadPdDietas = loadPdDietas;

async function loadPdGoals() {
  var el = document.getElementById('pdGoalsContent');
  if (!el) return;
  el.innerHTML = '<p style="color:var(--text-muted);">Buscando metas...</p>';
  try {
    var res = await supabase.from('user_goals').select('*').eq('user_id', window._currentPdId).maybeSingle();
    var g = res.data;
    if (!g) {
      el.innerHTML = '<p style="color:var(--text-muted);">Nenhuma meta configurada pelo paciente.</p>';
      return;
    }
    el.innerHTML = '<div style="background:var(--bg-card);padding:1rem;border-radius:8px;border:1px solid var(--border);">' +
      '<p><strong>Meta Calórica:</strong> ' + (g.daily_kcal || '—') + ' kcal</p>' +
      '<p><strong>Carboidratos:</strong> ' + (g.daily_carbs || '—') + 'g</p>' +
      '<p><strong>Proteínas:</strong> ' + (g.daily_protein || '—') + 'g</p>' +
      '<p><strong>Gorduras:</strong> ' + (g.daily_fat || '—') + 'g</p>' +
      '<p><strong>Água:</strong> ' + (g.daily_water || '—') + ' ml</p>' +
      '</div>';
  } catch (err) {
    console.error('[loadPdGoals]', err);
    el.innerHTML = '<p style="color:var(--text-muted);">Erro ao carregar metas.</p>';
  }
}
window.loadPdGoals = loadPdGoals;
