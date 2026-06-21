// ═══════════════════════════════════════
// PATIENT DIARY (visão do nutricionista)
// ═══════════════════════════════════════
// Helper Supabase — compatível com qualquer versão do cliente registrado em window
const _getSb = () => (typeof window !== 'undefined' && (window._db || window.supabase)) || supabase;

const pdState = { patientId: null, patientName: null, date: null, tab: 'day', goal: 2000, waterGoal: 2000 };


function toLocalDateStr(d) {
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}

async function viewPatientDiary(patientId, patientName) {
  const modal = document.getElementById('patientDiaryModal');
  document.getElementById('patientDiaryTitle').textContent = `Diário de ${patientName}`;
  modal.classList.add('show');

  pdState.patientId = patientId;
  pdState.patientName = patientName;
  pdState.date = toLocalDateStr(new Date());
  pdState.tab = 'day';
  pdSwitchTab('day', true);

  // Busca a meta calórica e água do paciente
  const { data: goalData } = await supabase.from('user_goals').select('daily_kcal,daily_water').eq('user_id', patientId).maybeSingle();
  pdState.goal = goalData?.daily_kcal || 2000;
  pdState.waterGoal = goalData?.daily_water || 2000;

  await pdRender();
}

function pdChangeDay(delta) {
  const d = new Date(pdState.date + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  const today = new Date();
  today.setHours(0,0,0,0);
  if (d > today) return; // não permite ver o futuro
  pdState.date = toLocalDateStr(d);
  pdRender();
}

function pdSwitchTab(tab, skipRender) {
  pdState.tab = tab;
  document.getElementById('pdTabDay').classList.toggle('active', tab==='day');
  document.getElementById('pdTabChart').classList.toggle('active', tab==='chart');
  const dayNav = document.querySelector('.pd-day-nav');
  dayNav.style.display = tab==='day' ? 'flex' : 'none';
  if (!skipRender) pdRender();
}

async function pdRender() {
  // Atualiza label do dia
  const d = new Date(pdState.date + 'T00:00:00');
  const today = new Date(); today.setHours(0,0,0,0);
  const isToday = toLocalDateStr(d) === toLocalDateStr(today);
  const weekday = d.toLocaleDateString('pt-BR', { weekday:'long' });
  const dateLabel = d.toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' });
  document.getElementById('pdDayLabel').innerHTML = `${isToday ? 'Hoje' : weekday}<div class="pd-day-sub">${dateLabel}</div>`;
  document.getElementById('pdNextBtn').disabled = isToday;

  if (pdState.tab === 'day') {
    await pdRenderDay();
  } else {
    await pdRenderChart();
  }
}

async function pdRenderDay() {
  const content = document.getElementById('patientDiaryContent');
  if (content) content.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:1rem;">Carregando...</p>';

  let entries = [];
  try {
    const { data } = await supabase.from('diary_entries').select('*').eq('user_id', pdState.patientId).eq('date', pdState.date).order('created_at');
    if (data) entries = data;
  } catch(e) {}

  let waterMl = 0;
  try {
    const { data: wData } = await supabase.from('diary_water').select('ml').eq('user_id', pdState.patientId).eq('date', pdState.date).maybeSingle();
    waterMl = wData?.ml || 0;
  } catch(e) {}

  if (entries.length === 0 && waterMl === 0) {
    if (content) content.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:1.5rem;">Nenhum registro neste dia.</p>';
    return;
  }

  const totalKcal = entries.reduce((s,e) => s+e.kcal, 0);
  const meals = { cafe:[], almoco:[], lanche:[], jantar:[] };
  entries.forEach(e => { if (meals[e.meal]) meals[e.meal].push(e); });
  const mealLabels = { cafe:'🌅 Café', almoco:'<i class="fa-solid fa-sun ic-sun"></i> Almoço', lanche:'🍵 Lanche', jantar:'<i class="fa-solid fa-moon ic-moon"></i> Jantar' };
  const goalPct = pdState.goal ? Math.round((totalKcal/pdState.goal)*100) : 0;
  const overGoal = totalKcal > pdState.goal;

  if (content) {
    content.innerHTML = `
      <div style="background:var(--green-pale);border-radius:12px;padding:1rem;margin-bottom:1rem;text-align:center;display:flex;justify-content:space-around;align-items:center;flex-wrap:wrap;gap:1rem;">
        <div>
          <div style="font-family:'Playfair Display',serif;font-size:2.3rem;font-weight:900;color:${overGoal?'#ef5350':'var(--green-deep)'};">${totalKcal}</div>
          <div style="font-size:0.8rem;color:var(--text-muted);">kcal • meta: ${pdState.goal} kcal (${goalPct}%)</div>
        </div>
        <div style="border-left:1px solid var(--border-color);height:40px;opacity:0.3;"></div>
        <div>
          <div style="font-family:'Playfair Display',serif;font-size:2.3rem;font-weight:900;color:#29b6f6;">${waterMl}</div>
          <div style="font-size:0.8rem;color:var(--text-muted);">ml de água · meta: ${pdState.waterGoal || 2000} ml</div>
        </div>
      </div>
      ${Object.entries(meals).map(([key, items]) => items.length===0?'':`
        <div style="margin-bottom:0.75rem;">
          <p style="font-family:'Syne',sans-serif;font-size:0.75rem;font-weight:700;text-transform:uppercase;color:var(--green-mid);margin-bottom:0.4rem;">${mealLabels[key]}</p>
          ${items.map(e=>`
            <div class="pd-item-row">
              ${e.photo_url
                ? `<img src="${e.photo_url}" alt="${e.food_name}" class="pd-item-photo" onclick="openPhotoLightbox('${e.photo_url}')">`
                : `<div class="pd-item-photo-placeholder"><i class="fa-solid fa-utensils ic-recipes"></i></div>`}
              <span class="pd-item-name">${e.food_name}</span>
              <span class="pd-item-kcal">${e.kcal} kcal</span>
            </div>`).join('')}
        </div>`).join('')}
    `;
  }
}

async function pdRenderChart() {
  const content = document.getElementById('patientDiaryContent');
  content.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:1rem;">Carregando gráfico...</p>';

  // Busca os últimos 7 dias (incluindo hoje)
  const days = [];
  const refDate = new Date(pdState.date + 'T00:00:00');
  for (let i = 6; i >= 0; i--) {
    const d = new Date(refDate);
    d.setDate(d.getDate() - i);
    days.push(toLocalDateStr(d));
  }

  const { data } = await supabase.from('diary_entries').select('date,kcal').eq('user_id', pdState.patientId).in('date', days);

  const totals = {};
  days.forEach(d => totals[d] = 0);
  (data||[]).forEach(e => { totals[e.date] = (totals[e.date]||0) + e.kcal; });

  const goal = pdState.goal || 2000;
  const maxVal = Math.max(goal, ...Object.values(totals), 1);

  const bars = days.map(d => {
    const val = totals[d];
    const heightPct = Math.min((val / maxVal) * 100, 100);
    const isOver = val > goal;
    const dObj = new Date(d + 'T00:00:00');
    const label = dObj.toLocaleDateString('pt-BR', { weekday:'short' }).replace('.','');
    const dayNum = dObj.getDate();
    return `<div class="pd-chart-bar-col">
      <div class="pd-chart-bar ${isOver?'over':''}" style="height:${heightPct}%;" title="${val} kcal"></div>
      <div class="pd-chart-bar-label">${label}<br>${dayNum}</div>
    </div>`;
  }).join('');

  const goalLinePct = Math.min((goal / maxVal) * 100, 100);

  const avg = Math.round(Object.values(totals).reduce((a,b)=>a+b,0) / days.length);
  const daysOverGoal = Object.values(totals).filter(v => v > goal).length;
  const daysWithData = Object.values(totals).filter(v => v > 0).length;

  content.innerHTML = `
    <div style="background:var(--green-pale);border-radius:12px;padding:0.85rem;margin-bottom:1rem;display:flex;justify-content:space-around;text-align:center;flex-wrap:wrap;gap:0.5rem;">
      <div><div style="font-family:'Playfair Display',serif;font-size:1.4rem;font-weight:900;color:var(--green-deep);">${avg}</div><div style="font-size:0.7rem;color:var(--text-muted);">média/dia (kcal)</div></div>
      <div><div style="font-family:'Playfair Display',serif;font-size:1.4rem;font-weight:900;color:var(--yellow-hot);">${goal}</div><div style="font-size:0.7rem;color:var(--text-muted);">meta (kcal)</div></div>
      <div><div style="font-family:'Playfair Display',serif;font-size:1.4rem;font-weight:900;color:${daysOverGoal>0?'#ef5350':'var(--green-deep)'};">${daysOverGoal}/${daysWithData||7}</div><div style="font-size:0.7rem;color:var(--text-muted);">dias acima da meta</div></div>
    </div>
    <div class="pd-chart-wrap">
      <div class="pd-chart-bars">
        <div class="pd-goal-line" style="bottom:${goalLinePct}%;">Meta: ${goal} kcal</div>
        ${bars}
      </div>
    </div>
    <div class="pd-chart-legend">
      <span><span class="pd-chart-dot" style="background:var(--green-mid);"></span> Dentro da meta</span>
      <span><span class="pd-chart-dot" style="background:#ef5350;"></span> Acima da meta</span>
      <span><span class="pd-chart-dot" style="background:var(--yellow-hot);border-radius:2px;width:14px;height:2px;"></span> Linha da meta</span>
    </div>
    <p style="font-size:0.78rem;color:var(--text-muted);text-align:center;margin-top:0.75rem;">Últimos 7 dias até ${new Date(pdState.date+'T00:00:00').toLocaleDateString('pt-BR')}</p>
  `;
}

function closePatientDiary() { document.getElementById('patientDiaryModal').classList.remove('show'); }

// ═══════════════════════════════════════
// PRONTUÁRIO DO PACIENTE (PDF)
// ═══════════════════════════════════════
const recordState = { patientId: null, patientName: null, days: 7 };

function openRecordModal(patientId, patientName) {
  recordState.patientId = patientId;
  recordState.patientName = patientName;
  recordState.days = 7;
  document.getElementById('recordPatientName').textContent = patientName;
  document.querySelectorAll('.record-period-btn').forEach(b => b.classList.toggle('active', b.dataset.period === '7'));
  document.getElementById('recordAiBox').style.display = 'none';
  document.getElementById('recordAiBox').innerHTML = '';
  document.getElementById('recordModal').classList.add('show');
}

function closeRecordModal() { document.getElementById('recordModal').classList.remove('show'); }

function setRecordPeriod(days, btn) {
  recordState.days = days;
  document.querySelectorAll('.record-period-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

async function generatePatientRecordPdf(withAi) {
  const opts = {
    profile: document.getElementById('recOptProfile').checked,
    goal: document.getElementById('recOptGoal').checked,
    summary: document.getElementById('recOptSummary').checked,
    chart: document.getElementById('recOptChart').checked,
    macros: document.getElementById('recOptMacros').checked,
    meals: document.getElementById('recOptMeals').checked
  };

  const aiBtn = document.getElementById('recordAiBtn');
  const aiBox = document.getElementById('recordAiBox');
  if (withAi) {
    aiBtn.disabled = true;
    aiBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="color:white!important;margin-right:0.4rem;"></i> Gerando análise...';
    aiBox.style.display = 'block';
    aiBox.innerHTML = '<p style="color:var(--text-muted);">Analisando dados do paciente com IA...</p>';
  }

  try {
    showToast('<i class="fa-solid fa-hourglass-half ic-water"></i> Coletando dados do paciente...');

    // 1. Perfil do paciente
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', recordState.patientId).maybeSingle();

    // 2. Meta calórica e água
    const { data: goalData } = await supabase.from('user_goals').select('daily_kcal,daily_water').eq('user_id', recordState.patientId).maybeSingle();
    const dailyGoal = goalData?.daily_kcal || 2000;
    const dailyWaterGoal = goalData?.daily_water || 2000;

    // 3. Registros do período
    const days = [];
    const today = new Date();
    for (let i = recordState.days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      days.push(toLocalDateStr(d));
    }
    const { data: entries } = await supabase.from('diary_entries').select('*')
      .eq('user_id', recordState.patientId)
      .in('date', days)
      .order('date').order('created_at');

    const allEntries = entries || [];

    // 4. Água do período
    const { data: waterEntries } = await supabase.from('diary_water').select('date,ml')
      .eq('user_id', recordState.patientId)
      .in('date', days);
    const waterByDay = {};
    days.forEach(d => waterByDay[d] = 0);
    (waterEntries || []).forEach(w => { if (waterByDay[w.date] !== undefined) waterByDay[w.date] = w.ml || 0; });
    const totalWater = Object.values(waterByDay).reduce((s, v) => s + v, 0);
    const daysWithWater = Object.values(waterByDay).filter(v => v > 0).length;
    const avgWater = daysWithWater ? Math.round(totalWater / daysWithWater) : 0;

    // Agregações
    const totalsByDay = {};
    days.forEach(d => totalsByDay[d] = { kcal:0, carbs:0, prot:0, fat:0, count:0 });
    allEntries.forEach(e => {
      const t = totalsByDay[e.date];
      if (!t) return;
      t.kcal += e.kcal || 0;
      t.carbs += e.carbs || 0;
      t.prot += e.protein || 0;
      t.fat += e.fat || 0;
      t.count++;
    });
    const daysWithData = Object.values(totalsByDay).filter(d => d.count > 0);
    const totalKcal = allEntries.reduce((s,e) => s + (e.kcal||0), 0);
    const totalCarbs = allEntries.reduce((s,e) => s + (e.carbs||0), 0);
    const totalProt = allEntries.reduce((s,e) => s + (e.protein||0), 0);
    const totalFat = allEntries.reduce((s,e) => s + (e.fat||0), 0);
    const avgKcal = daysWithData.length ? Math.round(totalKcal / daysWithData.length) : 0;
    const daysOverGoal = Object.values(totalsByDay).filter(d => d.kcal > dailyGoal).length;
    const adherencePct = days.length ? Math.round((daysWithData.length / days.length) * 100) : 0;

    let aiAnalysisHtml = '';
    if (withAi) {
      try {
        const summaryForAi = {
          paciente: profile?.name || recordState.patientName,
          periodo_dias: recordState.days,
          meta_kcal: dailyGoal,
          media_kcal_dia: avgKcal,
          dias_com_registro: daysWithData.length,
          dias_total: days.length,
          dias_acima_da_meta: daysOverGoal,
          totais: { kcal: totalKcal, carboidratos_g: Math.round(totalCarbs), proteina_g: Math.round(totalProt), gordura_g: Math.round(totalFat) },
          perfil: { idade: profile?.age, sexo: profile?.sex, peso_kg: profile?.weight, altura_cm: profile?.height }
        };
        const prompt = `Analise os dados nutricionais a seguir de um paciente acompanhado por um nutricionista, referentes aos últimos ${recordState.days} dias:\n${JSON.stringify(summaryForAi)}\n\nRetorne um JSON com os campos: "pontos_positivos" (array de até 4 strings curtas), "pontos_atencao" (array de até 4 strings curtas) e "sugestoes" (array de até 4 strings curtas com sugestões de ajustes para o nutricionista considerar). Seja objetivo, profissional e baseado nos dados fornecidos.`;
        const ai = await askClaude(prompt, 'Você é um assistente de apoio à análise nutricional para nutricionistas. Responda SOMENTE com um JSON válido, sem markdown.');
        const positives = (ai.pontos_positivos||[]).map(p=>`<li>${p}</li>`).join('');
        const attention = (ai.pontos_atencao||[]).map(p=>`<li>${p}</li>`).join('');
        const suggestions = (ai.sugestoes||[]).map(p=>`<li>${p}</li>`).join('');
        aiAnalysisHtml = `
          <div class="record-ai-section">
            <h3>🤖 Análise gerada por IA</h3>
            ${positives ? `<p class="record-ai-label" style="color:#2d7a35;">Pontos positivos</p><ul>${positives}</ul>` : ''}
            ${attention ? `<p class="record-ai-label" style="color:#e65100;">Pontos de atenção</p><ul>${attention}</ul>` : ''}
            ${suggestions ? `<p class="record-ai-label" style="color:#1a4a7a;">Sugestões para o acompanhamento</p><ul>${suggestions}</ul>` : ''}
            <p class="record-ai-disclaimer">⚠️ Esta análise foi gerada automaticamente por inteligência artificial com base apenas nos dados registrados pelo paciente. Não substitui a avaliação clínica do(a) nutricionista responsável.</p>
          </div>`;
        aiBox.innerHTML = '<p style="color:var(--green-deep);"><i class="fa-solid fa-circle-check ic-check"></i> Análise gerada com sucesso! Gerando PDF...</p>';
      } catch (aiErr) {
        console.error('[generatePatientRecordPdf] erro IA:', aiErr);
        aiAnalysisHtml = `<div class="record-ai-section"><h3>🤖 Análise gerada por IA</h3><p style="color:#c62828;">Não foi possível gerar a análise por IA neste momento (${aiErr.message||'erro desconhecido'}).</p></div>`;
        aiBox.innerHTML = '<p style="color:#c62828;">Erro ao gerar análise por IA. Gerando PDF sem análise...</p>';
      }
    }

    buildRecordHtml({ profile, dailyGoal, dailyWaterGoal, days, totalsByDay, waterByDay, totalWater, avgWater, daysWithWater, allEntries, avgKcal, daysWithData, daysOverGoal, adherencePct, totalCarbs, totalProt, totalFat, totalKcal, opts, aiAnalysisHtml, withAi });

    showToast('<i class="fa-solid fa-file-pdf ic-alert"></i> Abrindo prontuário para salvar como PDF!');
    closeRecordModal();
  } catch (e) {
    console.error('[generatePatientRecordPdf] erro:', e);
    showToast('Erro ao gerar prontuário: ' + e.message, 'error');
  } finally {
    aiBtn.disabled = false;
    aiBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles" style="color:white!important;margin-right:0.4rem;"></i> Gerar com IA';
  }
}

function buildRecordHtml({ profile, dailyGoal, dailyWaterGoal, days, totalsByDay, waterByDay, totalWater, avgWater, daysWithWater, allEntries, avgKcal, daysWithData, daysOverGoal, adherencePct, totalCarbs, totalProt, totalFat, totalKcal, opts, aiAnalysisHtml, withAi }) {
  const logoSvg = `<img src="${LOGO_LIGHT_B64}" width="52" height="52" style="border-radius:8px;">`;
  const periodLabel = days.length === 7 ? 'Última semana' : 'Último mês';
  const periodRange = `${new Date(days[0]+'T00:00:00').toLocaleDateString('pt-BR')} a ${new Date(days[days.length-1]+'T00:00:00').toLocaleDateString('pt-BR')}`;
  const patientName = profile?.name || recordState.patientName || 'Paciente';

  const goalLineLabel = `Meta diária: ${dailyGoal} kcal`;

  // Chart bars
  const maxVal = Math.max(dailyGoal, ...Object.values(totalsByDay).map(d=>d.kcal), 1);
  const goalLinePct = Math.min((dailyGoal / maxVal) * 100, 100);
  const chartBars = days.map(d => {
    const val = totalsByDay[d].kcal;
    const heightPct = Math.min((val / maxVal) * 100, 100);
    const isOver = val > dailyGoal;
    const dObj = new Date(d+'T00:00:00');
    const label = days.length === 7
      ? dObj.toLocaleDateString('pt-BR',{weekday:'short'}).replace('.','')
      : dObj.getDate();
    return `<div class="rec-bar-col"><div class="rec-bar ${isOver?'over':''}" style="height:${heightPct}%;" title="${val} kcal"></div><div class="rec-bar-label">${label}</div></div>`;
  }).join('');

  // Macros pie (simple bars, avoids SVG complexity)
  const macroTotal = (totalCarbs + totalProt + totalFat) || 1;
  const carbsPct = Math.round((totalCarbs/macroTotal)*100);
  const protPct = Math.round((totalProt/macroTotal)*100);
  const fatPct = 100 - carbsPct - protPct;

  const profileHtml = opts.profile ? `
    <h3>👤 Dados do Paciente</h3>
    <div class="rec-grid">
      <div class="rec-stat"><span class="rec-stat-label">Nome</span><span class="rec-stat-value">${patientName}</span></div>
      ${profile?.age ? `<div class="rec-stat"><span class="rec-stat-label">Idade</span><span class="rec-stat-value">${profile.age} anos</span></div>` : ''}
      ${profile?.sex ? `<div class="rec-stat"><span class="rec-stat-label">Sexo</span><span class="rec-stat-value">${profile.sex === 'm' ? 'Masculino' : 'Feminino'}</span></div>` : ''}
      ${profile?.weight ? `<div class="rec-stat"><span class="rec-stat-label">Peso</span><span class="rec-stat-value">${profile.weight} kg</span></div>` : ''}
      ${profile?.height ? `<div class="rec-stat"><span class="rec-stat-label">Altura</span><span class="rec-stat-value">${profile.height} cm</span></div>` : ''}
      ${profile?.email ? `<div class="rec-stat"><span class="rec-stat-label">E-mail</span><span class="rec-stat-value">${profile.email}</span></div>` : ''}
    </div>` : '';

  const goalHtml = opts.goal ? `
    <h3>🎯 Metas Diárias</h3>
    <div class="rec-grid">
      <div class="rec-goal-card"><div class="rec-goal-value">${dailyGoal} kcal/dia</div><div style="font-size:0.75rem;opacity:0.85;margin-top:4px;">Meta calórica</div></div>
      <div class="rec-goal-card" style="background:linear-gradient(135deg,#1565c0,#42a5f5);"><div class="rec-goal-value">${dailyWaterGoal} ml/dia</div><div style="font-size:0.75rem;opacity:0.85;margin-top:4px;">Meta de água</div></div>
    </div>` : '';

  const waterHtml = opts.summary ? `
    <h3>💧 Hidratação no Período</h3>
    <div class="rec-grid">
      <div class="rec-stat"><span class="rec-stat-label">Média diária</span><span class="rec-stat-value">${avgWater} ml</span></div>
      <div class="rec-stat"><span class="rec-stat-label">Total no período</span><span class="rec-stat-value">${totalWater} ml</span></div>
      <div class="rec-stat"><span class="rec-stat-label">Dias com registro</span><span class="rec-stat-value">${daysWithWater}/${days.length}</span></div>
      <div class="rec-stat"><span class="rec-stat-label">Meta diária</span><span class="rec-stat-value">${dailyWaterGoal} ml</span></div>
    </div>
    <div class="rec-chart-wrap" style="height:120px;margin-top:12px;">
      <div class="rec-chart-bars">${days.map(d => {
        const val = waterByDay[d] || 0;
        const heightPct = Math.min((val / Math.max(dailyWaterGoal, 1)) * 100, 100);
        const dObj = new Date(d+'T00:00:00');
        const label = days.length === 7
          ? dObj.toLocaleDateString('pt-BR',{weekday:'short'}).replace('.','')
          : dObj.getDate();
        return `<div class="rec-bar-col"><div class="rec-bar" style="height:${heightPct}%;background:#42a5f5;" title="${val} ml"></div><div class="rec-bar-label">${label}</div></div>`;
      }).join('')}</div>
    </div>` : '';

  const summaryHtml = opts.summary ? `
    <h3>📊 Resumo do Período (${periodLabel})</h3>
    <div class="rec-grid">
      <div class="rec-stat"><span class="rec-stat-label">Média diária</span><span class="rec-stat-value">${avgKcal} kcal</span></div>
      <div class="rec-stat"><span class="rec-stat-label">Dias com registro</span><span class="rec-stat-value">${daysWithData.length}/${days.length}</span></div>
      <div class="rec-stat"><span class="rec-stat-label">Adesão ao diário</span><span class="rec-stat-value">${adherencePct}%</span></div>
      <div class="rec-stat"><span class="rec-stat-label">Dias acima da meta</span><span class="rec-stat-value" style="color:${daysOverGoal>0?'#c62828':'#2a5c30'}">${daysOverGoal}/${days.length}</span></div>
    </div>` : '';

  const chartHtml = opts.chart ? `
    <h3>📈 Calorias por dia</h3>
    <div class="rec-chart-wrap">
      <div class="rec-chart-goal-line" style="bottom:${goalLinePct}%;">${goalLineLabel}</div>
      <div class="rec-chart-bars">${chartBars}</div>
    </div>` : '';

  const macrosHtml = (opts.macros && macroTotal > 1) ? `
    <h3>🥑 Distribuição de Macronutrientes (total do período)</h3>
    <div class="rec-macro-bar">
      <div class="rec-macro-seg carbs" style="width:${carbsPct}%;" title="Carboidratos">${carbsPct}%</div>
      <div class="rec-macro-seg prot" style="width:${protPct}%;" title="Proteínas">${protPct}%</div>
      <div class="rec-macro-seg fat" style="width:${fatPct}%;" title="Gorduras">${fatPct}%</div>
    </div>
    <div class="rec-macro-legend">
      <span><span class="rec-dot carbs"></span> Carboidratos: ${Math.round(totalCarbs)}g</span>
      <span><span class="rec-dot prot"></span> Proteínas: ${Math.round(totalProt)}g</span>
      <span><span class="rec-dot fat"></span> Gorduras: ${Math.round(totalFat)}g</span>
    </div>` : '';

  const mealLabels = { cafe:'☕ Café da manhã', almoco:'🍽️ Almoço', lanche:'🍎 Lanche', jantar:'🌙 Jantar' };
  const mealsHtml = opts.meals ? `
    <h3>📋 Diário Detalhado</h3>
    ${days.map(d => {
      const dayEntries = allEntries.filter(e => e.date === d);
      if (dayEntries.length === 0) return '';
      const dObj = new Date(d+'T00:00:00');
      const dayTotal = totalsByDay[d].kcal;
      const byMeal = { cafe:[], almoco:[], lanche:[], jantar:[] };
      dayEntries.forEach(e => { if (byMeal[e.meal]) byMeal[e.meal].push(e); });
      return `<div class="rec-day-block">
        <div class="rec-day-header">${dObj.toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'})} <span class="rec-day-total">${dayTotal} kcal</span></div>
        ${Object.entries(byMeal).map(([k,items]) => items.length===0?'':`
          <div class="rec-meal-block">
            <p class="rec-meal-name">${mealLabels[k]}</p>
            <ul>${items.map(it => `<li>${it.food_name} <span class="rec-item-kcal">${it.kcal} kcal</span></li>`).join('')}</ul>
          </div>`).join('')}
      </div>`;
    }).join('') || '<p style="color:#888;">Nenhum registro no período.</p>'}` : '';

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Prontuário — ${patientName} — CalorIA</title>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">
  <style>
    @media print { body { margin: 0; } .no-print { display: none !important; } .rec-day-block { page-break-inside: avoid; } }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'DM Sans', Arial, sans-serif; max-width: 760px; margin: 0 auto; padding: 32px 28px; color: #1a2e1b; background: #fff; }
    .header { display: flex; align-items: center; gap: 14px; border-bottom: 3px solid #2a5c30; padding-bottom: 16px; margin-bottom: 20px; }
    .brand { font-family:'Playfair Display',serif; font-size: 1.6rem; font-weight: 900; font-style:italic; color: #2a5c30; letter-spacing: -0.5px; }
    .brand span { color: #ffb300; }
    .header-sub { font-size: 0.78rem; color: #888; margin-top: 2px; }
    h1 { font-family:'Playfair Display',serif; font-size: 1.7rem; font-weight: 900; color: #1a4a1f; margin-bottom: 4px; }
    .h1-sub { font-size: 0.9rem; color: #666; margin-bottom: 20px; }
    h3 { font-family:'Syne',sans-serif; font-size: 1rem; font-weight: 800; color: #2a5c30; margin: 24px 0 12px; padding-bottom: 6px; border-bottom: 2px solid #e8f5e9; text-transform: uppercase; letter-spacing: 0.5px; }
    .btn-print { display: block; margin: 16px auto 24px; padding: 12px 32px; background: #2a5c30; color: white; border: none; border-radius: 50px; font-size: 1rem; font-weight: 700; cursor: pointer; font-family: inherit; }
    .btn-print:hover { background: #1a4a1f; }
    .rec-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px,1fr)); gap: 10px; }
    .rec-stat { background: #f5f7f5; border-radius: 12px; padding: 10px 14px; border: 1px solid #e0e0e0; }
    .rec-stat-label { display: block; font-size: 0.7rem; color: #888; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; font-family:'Syne',sans-serif; margin-bottom: 2px; }
    .rec-stat-value { font-size: 1.1rem; font-weight: 800; color: #1a2e1b; font-family:'Syne',sans-serif; }
    .rec-goal-card { background: linear-gradient(135deg, #2a5c30 0%, #1a4a1f 100%); color: #fff; border-radius: 14px; padding: 16px; text-align: center; }
    .rec-goal-value { font-family:'Playfair Display',serif; font-size: 1.8rem; font-weight: 900; }
    .rec-chart-wrap { position: relative; height: 160px; border-bottom: 2px solid #ddd; margin-top: 8px; padding-top: 24px; }
    .rec-chart-bars { display: flex; align-items: flex-end; gap: 6px; height: 100%; }
    .rec-bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; }
    .rec-bar { width: 70%; background: #4caf50; border-radius: 4px 4px 0 0; min-height: 2px; }
    .rec-bar.over { background: #ef5350; }
    .rec-bar-label { font-size: 0.65rem; color: #888; margin-top: 4px; text-transform: capitalize; }
    .rec-chart-goal-line { position: absolute; left: 0; right: 0; border-top: 2px dashed #ffb300; font-size: 0.65rem; color: #e65100; text-align: right; padding-right: 4px; font-weight: 700; }
    .rec-macro-bar { display: flex; height: 28px; border-radius: 14px; overflow: hidden; }
    .rec-macro-seg { display: flex; align-items: center; justify-content: center; color: #fff; font-size: 0.75rem; font-weight: 700; }
    .rec-macro-seg.carbs { background: #4caf50; }
    .rec-macro-seg.prot { background: #ff9800; }
    .rec-macro-seg.fat { background: #ffb300; }
    .rec-macro-legend { display: flex; gap: 18px; flex-wrap: wrap; margin-top: 8px; font-size: 0.8rem; color: #555; }
    .rec-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 4px; vertical-align: middle; }
    .rec-dot.carbs { background: #4caf50; } .rec-dot.prot { background: #ff9800; } .rec-dot.fat { background: #ffb300; }
    .rec-day-block { margin-bottom: 14px; background: #fafbfa; border: 1px solid #eee; border-radius: 12px; padding: 12px 14px; }
    .rec-day-header { font-family:'Syne',sans-serif; font-weight: 800; font-size: 0.88rem; color: #1a4a1f; text-transform: capitalize; display: flex; justify-content: space-between; margin-bottom: 6px; }
    .rec-day-total { color: #2a5c30; }
    .rec-meal-block { margin-bottom: 6px; }
    .rec-meal-name { font-size: 0.78rem; font-weight: 700; color: #2d7a35; margin-bottom: 2px; }
    .rec-meal-block ul { padding-left: 1.2rem; font-size: 0.85rem; color: #444; line-height: 1.6; }
    .rec-item-kcal { color: #888; font-size: 0.78rem; }
    .record-ai-section { background: linear-gradient(135deg, #fff8e1 0%, #e8f5e9 100%); border-radius: 14px; padding: 16px 18px; margin-top: 24px; border: 1px solid #ffe082; }
    .record-ai-section h3 { border: none; margin-top: 0; color: #2a5c30; }
    .record-ai-label { font-weight: 800; font-family:'Syne',sans-serif; font-size: 0.85rem; margin: 10px 0 4px; }
    .record-ai-section ul { padding-left: 1.3rem; font-size: 0.88rem; line-height: 1.7; color: #2e3d2f; }
    .record-ai-disclaimer { font-size: 0.7rem; color: #999; margin-top: 12px; line-height: 1.5; }
    .footer { margin-top: 32px; font-size: 0.72rem; color: #888; border-top: 1px solid #ddd; padding-top: 14px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px; }
    .lgpd-note { font-size: 0.68rem; color: #aaa; margin-top: 6px; }
  </style>
  </head><body>
  <div class="header">
    ${logoSvg}
    <div>
      <div class="brand">Calor<span>IA</span></div>
      <div class="header-sub">Plataforma de Nutrição Inteligente</div>
    </div>
  </div>
  <button class="btn-print no-print" onclick="window.print()">🖨️ Salvar como PDF / Imprimir</button>
  <h1>Prontuário Nutricional</h1>
  <p class="h1-sub">Período: ${periodLabel} (${periodRange})</p>
  ${profileHtml}
  ${goalHtml}
  ${summaryHtml}
  ${waterHtml}
  ${chartHtml}
  ${macrosHtml}
  ${mealsHtml}
  ${aiAnalysisHtml}
  <div class="footer">
    <span>Documento gerado automaticamente pela plataforma CalorIA em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</span>
  </div>
  <p class="lgpd-note">🔒 Este documento contém dados pessoais e de saúde protegidos pela LGPD (Lei 13.709/2018). Uso restrito ao acompanhamento nutricional do paciente.</p>
  </body></html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  } else {
    showToast('Habilite os popups para visualizar o prontuário.', 'error');
  }
}

async function loadPatients() {
  const listEl = document.getElementById('patientsList');
  if (!listEl) return;
  listEl.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:2rem;">Carregando...</p>';

  if (!currentUser) return;

  try {
    const { data: links, error: linkErr } = await supabase
      .from('professional_patients')
      .select('patient_id')
      .eq('professional_id', currentUser.id);

    if (linkErr) throw linkErr;

    if (!links || links.length === 0) {
      document.getElementById('patientCount').textContent = '0';
      listEl.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:2rem;">Nenhum paciente cadastrado.</p>';
      const infoEl = document.getElementById('patientLimitInfo');
      if (infoEl) {
        const plan = getUserPlan() || 'free';
        const planLimits = window.PLAN_LIMITS ? window.PLAN_LIMITS[plan] : { patients: 0 };
        infoEl.textContent = planLimits.patients >= 999 ? 'Limite: Ilimitado' : `Limite: 0 / ${planLimits.patients} pacientes`;
      }
      return;
    }

    const patientIds = links.map(l => l.patient_id);

    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('id, name, email, sex, age, weight, height, body_fat_pct, avatar_url')
      .in('id', patientIds);

    if (profErr) throw profErr;

    const { data: anamneses, error: anErr } = await supabase
      .from('patient_anamnese')
      .select('patient_id, diseases_general, diseases_chronic_auto, diseases_other')
      .in('patient_id', patientIds);

    const anamneseMap = {};
    if (anamneses) {
      anamneses.forEach(a => {
        anamneseMap[a.patient_id] = [
          ...(a.diseases_general || []),
          ...(a.diseases_chronic_auto || [])
        ];
        if (a.diseases_other) {
          anamneseMap[a.patient_id].push(a.diseases_other);
        }
      });
    }

    const count = profiles.length;
    document.getElementById('patientCount').textContent = count;
    const infoEl = document.getElementById('patientLimitInfo');
    if (infoEl) {
      const plan = getUserPlan() || 'free';
      const planLimits = window.PLAN_LIMITS ? window.PLAN_LIMITS[plan] : { patients: 0 };
      infoEl.textContent = planLimits.patients >= 999 ? 'Limite: Ilimitado' : `Limite: ${count} / ${planLimits.patients} pacientes`;
    }

    listEl.innerHTML = profiles.map(p => {
      const initials = p.name ? p.name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase() : '?';
      const diseases = anamneseMap[p.id] || [];
      return `
        <div class="patient-row" data-patient-id="${p.id}" data-patient-name="${p.name || p.email}" data-diseases='${JSON.stringify(diseases)}'>
          <div class="patient-avatar">
            ${p.avatar_url ? `<img src="${p.avatar_url}">` : initials}
          </div>
          <div class="patient-info">
            <div class="patient-name">${p.name || p.email}</div>
            <div class="patient-sub">
              <span>${p.email}</span>
              ${p.weight ? `<span>• ${p.weight}kg</span>` : ''}
              ${p.height ? `<span>• ${p.height}cm</span>` : ''}
              ${p.body_fat_pct ? `<span>• %G: ${p.body_fat_pct}%</span>` : ''}
            </div>
          </div>
          <div class="patient-actions" style="display:flex;gap:0.4rem;align-items:center;flex-wrap:wrap;">
            <button class="btn-view-diary" onclick="openPatientDossier('${p.id}', '${(p.name || p.email).replace(/'/g, "&apos;")}')" style="background:linear-gradient(135deg,#5c6bc0,#3949ab);color:white;border:none;">
              <i class="fa-solid fa-folder-open"></i> Dossiê
            </button>
            <button class="btn-view-diary" onclick="openAiRecipeModal('${p.id}')" style="background:linear-gradient(135deg,var(--green-mid),#388e3c);color:white;border:none;">
              🤖 IA Receita
            </button>
            <button class="btn-view-diary" onclick="toggleRecipeForm('${p.id}')" style="background:var(--green-pale);color:var(--green-deep);">
              <i class="fa-solid fa-utensils"></i> Manual
            </button>
            <button class="btn-view-diary" onclick="viewPatientDiary('${p.id}', '${(p.name || p.email).replace(/'/g, "&apos;")}')">
              <i class="fa-solid fa-book"></i> Diário
            </button>
            <button class="btn-view-diary" onclick="openRecordModal('${p.id}', '${(p.name || p.email).replace(/'/g, "&apos;")}')" style="background:var(--yellow-pale);color:var(--orange-hot);">
              <i class="fa-solid fa-file-invoice"></i> Prontuário
            </button>
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error('[loadPatients] erro:', err);
    listEl.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:2rem;">Erro ao carregar pacientes.</p>';
  }
}

// ═══════════════════════════════════════
// DOSSIE DO PACIENTE
// ═══════════════════════════════════════
async function openPatientDossier(patientId, patientName) {
  // Create or find the modal
  let modal = document.getElementById('patientDossierModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'patientDossierModal';
    modal.className = 'modal-overlay';
    modal.style.cssText = 'z-index:99999;';
    modal.innerHTML = `
      <div class="modal-box" style="max-width:680px;width:95vw;max-height:90vh;overflow-y:auto;text-align:left;">
        <button class="modal-close" onclick="document.getElementById('patientDossierModal').classList.remove('show')">✕</button>
        <div class="modal-title" style="border-bottom:2px solid var(--border);padding-bottom:1rem;margin-bottom:1.2rem;">
          <i class="fa-solid fa-folder-open" style="color:#3949ab;"></i>
          <span id="dossierPatientTitle">Dossiê do Paciente</span>
        </div>
        <div id="dossierContent" style="font-size:0.88rem;line-height:1.7;color:var(--text-main);">Carregando...</div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  modal.classList.add('show');
  document.getElementById('dossierPatientTitle').textContent = `Dossiê — ${patientName}`;
  const contentEl = document.getElementById('dossierContent');
  contentEl.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:2rem;"><i class="fa-solid fa-spinner fa-spin"></i> Carregando dados...</p>';

  try {
    const [{ data: profile }, { data: anamnese }, { data: goalData }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', patientId).maybeSingle(),
      supabase.from('patient_anamnese').select('*').eq('patient_id', patientId).maybeSingle(),
      supabase.from('user_goals').select('daily_kcal,daily_water').eq('user_id', patientId).maybeSingle()
    ]);

    const p = profile || {};
    const a = anamnese || {};

    function row(label, value) {
      if (!value && value !== 0) return '';
      return `<tr><td style="padding:4px 12px 4px 0;color:var(--text-muted);white-space:nowrap;font-weight:600;">${label}</td><td style="padding:4px 0;">${value}</td></tr>`;
    }
    function section(title, rows) {
      const content = rows.filter(Boolean).join('');
      if (!content) return '';
      return `
        <div style="margin-bottom:1.4rem;">
          <div style="font-weight:700;font-size:0.95rem;color:var(--green-deep);border-left:3px solid var(--green-mid);padding-left:8px;margin-bottom:0.6rem;">${title}</div>
          <table style="width:100%;border-collapse:collapse;">${content}</table>
        </div>
      `;
    }

    const sexLabel = p.sex === 'm' ? 'Masculino' : p.sex === 'f' ? 'Feminino' : p.sex || '—';
    const arr = v => Array.isArray(v) && v.length > 0 ? v.join(', ') : null;

    contentEl.innerHTML = [
      section('📋 Dados Pessoais', [
        row('Nome', p.name || '—'),
        row('E-mail', p.email || '—'),
        row('Sexo', sexLabel),
        row('Idade', p.age ? p.age + ' anos' : null),
        row('Data de Nascimento', a.dob || p.dob || null),
        row('Telefone', a.phone || null),
        row('Profissão', a.profession || null),
        row('Escolaridade', a.education || null),
        row('Renda familiar', a.income || null),
        row('Nº pessoas no domicílio', a.household || null),
        row('Religião', a.religion || null),
        row('Endereço', a.address || null),
        row('Cartão SUS', a.sus_card || null),
        row('Raça/Cor', a.race || null),
      ]),
      section('⚖️ Dados Antropométricos', [
        row('Peso atual', p.weight ? p.weight + ' kg' : null),
        row('Altura', p.height ? p.height + ' cm' : null),
        row('Peso habitual', a.weight_usual ? a.weight_usual + ' kg' : null),
        row('Peso desejado', a.weight_desired ? a.weight_desired + ' kg' : null),
        row('Gordura corporal', p.body_fat_pct ? p.body_fat_pct + '%' : null),
        row('Massa muscular', a.muscle_mass_kg ? a.muscle_mass_kg + ' kg' : null),
        row('Massa óssea', a.bone_mass_kg ? a.bone_mass_kg + ' kg' : null),
        row('Água corporal', a.body_water_pct ? a.body_water_pct + '%' : null),
        row('Cintura', a.waist_cm ? a.waist_cm + ' cm' : null),
        row('Quadril', a.hip_cm ? a.hip_cm + ' cm' : null),
        row('Circunf. braço', a.arm_circ_cm ? a.arm_circ_cm + ' cm' : null),
        row('Circunf. panturrilha', a.calf_circ_cm ? a.calf_circ_cm + ' cm' : null),
        row('TMB medida', a.bmr_measured ? a.bmr_measured + ' kcal' : null),
        row('Meta calórica', goalData?.daily_kcal ? goalData.daily_kcal + ' kcal/dia' : null),
        row('Meta hídrica', goalData?.daily_water ? goalData.daily_water + ' mL/dia' : null),
      ]),
      section('🏃 Atividade Física', [
        row('Tipo de atividade', a.activity_type || null),
        row('Frequência semanal', a.activity_freq ? a.activity_freq + 'x/sem' : null),
        row('Duração por sessão', a.activity_duration ? a.activity_duration + ' min' : null),
      ]),
      section('🏥 Histórico Clínico', [
        row('Doenças gerais', arr(a.diseases_general)),
        row('Doenças crônicas/auto', arr(a.diseases_chronic_auto)),
        row('Outras doenças', a.diseases_other || null),
        row('Histórico familiar', arr(a.family_history)),
        row('Cirurgias', a.surgeries || null),
        row('Hospitalizações', a.hospitalizations || null),
      ]),
      section('💊 Medicamentos e Hábitos', [
        row('Medicamentos', a.medications || null),
        row('Suplementos', a.supplements || null),
        row('Adoçante', a.sweetener === 'yes' ? `Sim (${a.sweetener_type || '?'})` : a.sweetener === 'no' ? 'Não' : null),
        row('Tabagismo', a.smoking || null),
        row('Álcool', a.alcohol || null),
        row('Ingestão hídrica', a.water_intake || null),
        row('Tempo nas refeições', a.eating_time_min ? a.eating_time_min + ' min' : null),
        row('Hábito intestinal', a.bowel_habit || null),
        row('Local das refeições', a.meal_location || null),
        row('Companhia nas refeições', a.eating_company || null),
        row('Disfagia', a.dysphagia || null),
        row('Azia/refluxo', a.heartburn || null),
        row('Dietas anteriores', a.prev_diets || null),
        row('Aversões alimentares', a.food_aversions || null),
        row('Preferências alimentares', a.food_preferences || null),
        row('Alergias', arr(a.allergies)),
        row('Óleo/mês', a.oil_month_ml ? a.oil_month_ml + ' mL' : null),
        row('Açúcar/mês', a.sugar_month_g ? a.sugar_month_g + ' g' : null),
        row('Sal/mês', a.salt_month_g ? a.salt_month_g + ' g' : null),
      ]),
      section('🧪 Exames Laboratoriais', [
        row('Data dos exames', a.lab_date || null),
        row('Glicose', a.lab_glucose ? a.lab_glucose + ' mg/dL' : null),
        row('HbA1c', a.lab_hba1c ? a.lab_hba1c + '%' : null),
        row('Colesterol total', a.lab_chol_total ? a.lab_chol_total + ' mg/dL' : null),
        row('LDL', a.lab_ldl ? a.lab_ldl + ' mg/dL' : null),
        row('HDL', a.lab_hdl ? a.lab_hdl + ' mg/dL' : null),
        row('Triglicerídeos', a.lab_tg ? a.lab_tg + ' mg/dL' : null),
        row('Creatinina', a.lab_creatinine ? a.lab_creatinine + ' mg/dL' : null),
        row('Ureia', a.lab_urea ? a.lab_urea + ' mg/dL' : null),
        row('TSH', a.lab_tsh ? a.lab_tsh + ' µUI/mL' : null),
        row('Vitamina D', a.lab_vit_d ? a.lab_vit_d + ' ng/mL' : null),
        row('Ferritina', a.lab_ferritin ? a.lab_ferritin + ' ng/mL' : null),
        row('Hemoglobina', a.lab_hemoglobin ? a.lab_hemoglobin + ' g/dL' : null),
        row('PCR', a.lab_crp ? a.lab_crp + ' mg/L' : null),
        row('Insulina', a.lab_insulin ? a.lab_insulin + ' µU/mL' : null),
        row('Outros exames', a.lab_other || null),
      ]),
      section('♀️ Saúde Feminina', [
        row('Status menstrual', a.menstrual_status || null),
        row('Duração do ciclo', a.cycle_duration ? a.cycle_duration + ' dias' : null),
        row('Duração do período', a.period_duration ? a.period_duration + ' dias' : null),
        row('Última menstruação', a.last_period || null),
        row('Sintomas menstruais', a.menstrual_symptoms || null),
        row('Contraceptivo', a.contraceptive || null),
        row('Gestante', a.pregnant || null),
        row('Semana gestacional', a.gest_week || null),
        row('DPP', a.dpp || null),
        row('Amamentando', a.breastfeeding || null),
        row('Gestações anteriores', a.prev_pregnancies !== null && a.prev_pregnancies !== undefined ? a.prev_pregnancies : null),
        row('Tipo de parto anterior', a.prev_birth_type || null),
        row('Ganho de peso gestacional', a.gest_weight_gain ? a.gest_weight_gain + ' kg' : null),
        row('Complicações gestacionais', a.gest_complications || null),
      ]),
    ].join('') || '<p style="color:var(--text-muted);text-align:center;padding:1rem;">Nenhum dado de anamnese preenchido ainda.</p>';

  } catch(e) {
    console.error('[openPatientDossier]', e);
    contentEl.innerHTML = `<p style="color:#e53935;text-align:center;padding:1rem;"><i class="fa-solid fa-xmark"></i> Erro ao carregar dossiê: ${e.message}</p>`;
  }
}


// ═══════════════════════════════════════
// PHOTO LIGHTBOX
// ═══════════════════════════════════════
function openPhotoLightbox(url) {
  document.getElementById('photoLightboxImg').src = url;
  document.getElementById('photoLightbox').classList.add('show');
}
function closePhotoLightbox() {
  document.getElementById('photoLightbox').classList.remove('show');
}

async function loadLinkedNutritionist() {
  if (!currentProfile?.nutritionist_id) return;
  const { data } = await supabase.from('profiles').select('name').eq('id', currentProfile.nutritionist_id).single();
  if (data?.name) {
    document.getElementById('linkedNutritionistName').textContent = data.name;
    document.getElementById('nutritionistCard').style.display = 'flex';
  }
}

async function checkPatientNotifications() {
  // Check if any patient has diary entries today
  const { data: links } = await supabase.from('professional_patients').select('patient_id').eq('professional_id', currentUser.id);
  if (!links || links.length === 0) return;
  const patientIds = links.map(l => l.patient_id);
  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabase.from('diary_entries').select('user_id').in('user_id', patientIds).eq('date', today).limit(1);
  if (data && data.length > 0) {
    document.getElementById('patientNotifBadge').style.display = 'flex';
  }
}

// ═══════════════════════════════════════
// ADMIN
// ═══════════════════════════════════════
async function loadAdminPanel() {
  if (!isAdmin()) return;
  await refreshAdminUsers();
  await loadUpgradeRequests();
  await loadNutritionistRequests();
  await loadAdminNotices();
}

async function refreshAdminUsers() {
  const tbody = document.getElementById('adminTableBody');
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:2rem;">' + t('loading') + '</td></tr>';
  const { data, error } = await _getSb().rpc('get_all_profiles');
  if (error) {
    console.error('[Admin] Erro ao carregar usuários:', error);
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#e53935;padding:2rem;">
      <i class="fa-solid fa-xmark ic-alert"></i> Erro ${error.code}: ${error.message}<br>
      <small style="color:var(--text-muted);">Verifique as políticas RLS da tabela profiles no Supabase (admin deve ter SELECT em profiles).</small>
    </td></tr>`;
    return;
  }
  allAdminUsers = data || [];
  allAdminUsers.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
  const stTot = document.getElementById('statTotal'); if(stTot) stTot.textContent = allAdminUsers.length;
  const stProf = document.getElementById('statProf'); if(stProf) stProf.textContent = allAdminUsers.filter(u=>['nutritionist','personal_trainer'].includes(u.role)).length;
  const stPro = document.getElementById('statPro'); if(stPro) stPro.textContent = allAdminUsers.filter(u=>u.plan==='pro').length;
  const stClinic = document.getElementById('statClinic'); if(stClinic) stClinic.textContent = allAdminUsers.filter(u=>u.plan==='clinic').length;
  const stPat = document.getElementById('statPatients'); if(stPat) stPat.textContent = allAdminUsers.filter(u=>u.role==='patient').length;
  renderAdminTable(allAdminUsers);
}

function renderAdminTable(users) {
  const roleLabels = { standard:'Padrão', patient:'Paciente', nutricionist:'Nutricionista', personal_trainer:'Personal', admin:'Admin' };
  const planLabels = { 
    free:'Gratuito', pro:'Pro', clinic:'Clínica', admin:'Admin',
    patient_pro: 'Paciente+', patient_clinic: 'Paciente Clínica'
  };
  const planBadge = { 
    free:'badge-free', pro:'badge-pro', clinic:'badge-clinic', admin:'badge-admin',
     patient_pro:'badge-pro', patient_clinic:'badge-clinic'
  };
  const tbody = document.getElementById('adminTableBody');
  if (!tbody) return;
  if (!users.length) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:2rem;">Nenhum usuário.</td></tr>'; return; }
  tbody.innerHTML = users.map(u => {
    const initials = (u.name||'U').trim().split(' ').map(w=>w?w[0]:'U').slice(0,2).join('').toUpperCase();
    let date = '—';
    try { if (u.created_at) date = new Date(u.created_at).toLocaleDateString('pt-BR'); } catch(e){}
    if (date === 'Invalid Date' || date === 'Data Inválida') date = '—';
    const safePlan = u.plan || 'free';
    return `<tr>
      <td><div style="display:flex;align-items:center;gap:0.5rem;">
        <div style="width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,var(--green-mid),var(--green-deep));display:flex;align-items:center;justify-content:center;font-size:0.68rem;font-weight:700;color:white;flex-shrink:0;">${initials}</div>
        <span style="font-weight:600;font-size:0.85rem;">${u.name||'—'}</span>
      </div></td>
      <td style="color:var(--text-muted);font-size:0.8rem;">${u.email||'—'}</td>
      <td><select class="plan-select" id="roleSel-${u.id}" style="min-width:100px;">
        <option value="standard" ${(u.role||'standard')==='standard'?'selected':''}>Padrão</option>
        <option value="patient" ${u.role==='patient'?'selected':''}>Paciente</option>
        <option value="nutritionist" ${u.role==='nutritionist'?'selected':''}>Nutricionista</option>
        <option value="personal_trainer" ${u.role==='personal_trainer'?'selected':''}>Personal</option>
        <option value="admin" ${u.role==='admin'?'selected':''}>Admin</option>
      </select></td>
      <td><span class="plan-badge-inline ${planBadge[safePlan] || 'badge-free'}">${planLabels[safePlan] || safePlan}</span></td>
      <td style="color:var(--text-muted);font-size:0.78rem;">${date}</td>
      <td><div style="display:flex;gap:0.4rem;align-items:center;flex-wrap:wrap;">
        <select class="plan-select" id="planSel-${u.id}">
          <option value="free" ${safePlan==='free'?'selected':''}>Gratuito</option>
          <option value="patient_pro" ${safePlan==='patient_pro'?'selected':''}>Paciente+</option>
          <option value="patient_clinic" ${safePlan==='patient_clinic'?'selected':''}>Paciente Clínica</option>
          <option value="pro" ${safePlan==='pro'?'selected':''}>Pro</option>
          <option value="clinic" ${safePlan==='clinic'?'selected':''}>Clínica</option>
          <option value="admin" ${safePlan==='admin'?'selected':''}>Admin</option>
        </select>
        <button class="btn-save-plan" onclick="savePlan('${u.id}')">Salvar</button>
      </div></td>
    </tr>`;
  }).join('');
}

function filterAdminTable() {
  const q = document.getElementById('adminSearchInput').value.toLowerCase();
  renderAdminTable(allAdminUsers.filter(u => (u.name||'').toLowerCase().includes(q) || (u.email||'').toLowerCase().includes(q)));
}

async function savePlan(userId) {
  const planSel = document.getElementById('planSel-' + userId);
  const roleSel = document.getElementById('roleSel-' + userId);
  if (!planSel) return;
  const newPlan = planSel.value;
  const newRole = roleSel?.value;
  const updateData = { plan: newPlan };
  if (newRole) updateData.role = newRole;
  if (newPlan === 'admin') updateData.role = 'admin';

  const { error } = await supabase.from('profiles').update(updateData).eq('id', userId);
  if (error) {
    showToast('Erro ao salvar: ' + error.message, 'error');
    console.error('[CalorIA] savePlan error:', error);
    return;
  }

  showToast('<i class="fa-solid fa-circle-check ic-check"></i> Cargo e plano atualizados!');
  refreshAdminUsers();

  // Se o admin alterou o próprio perfil, recarregar imediatamente
  if (userId === currentUser?.id) {
    const { data: freshProfile } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (freshProfile) {
      currentProfile = freshProfile;
      setupRoleUI();
      applyPlanRestrictions();
      renderSidebarUser();
    }
  }
}

async function loadUpgradeRequests() {
  if (!isAdmin()) return;
  const el = document.getElementById('pendingUpgradesList');
  const countEl = document.getElementById('statPendingUpgrades');
  if (!el) return;
  el.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;">Carregando upgrades...</p>';

  const { data, error } = await _getSb()
    .from('upgrade_requests')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending:false });

  if (error || !data) {
    console.error('[Admin] upgrade_requests error:', error);
    el.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;">Tabela upgrade_requests nao encontrada ou sem permissao de leitura.</p>';
    if (countEl) countEl.textContent = '�';
    return;
  }

  allUpgradeRequests = data;
  if (countEl) countEl.textContent = data.length;
  if (!data.length) {
    el.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;">Nenhum upgrade pendente. <i class="fa-solid fa-circle-check ic-check"></i></p>';
    return;
  }

  const planLabels = { pro:'Pro', clinic:'Clinica' };
  el.innerHTML = data.map(req => {
    let created = '—';
    try { if (req.created_at) created = new Date(req.created_at).toLocaleString('pt-BR'); } catch(e){}
    if (created === 'Invalid Date' || created === 'Data Inválida') created = '—';
    const benefits = Array.isArray(req.benefits) ? req.benefits : [];
    return `
      <div class="queue-item">
        <div class="queue-info">
          <strong>${window.escapeHtml(req.user_name || 'Usuario sem nome')}</strong>
          <p>${window.escapeHtml(req.user_email || '')}</p>
          <p><strong>Plano atual:</strong> ${window.escapeHtml(req.current_plan || 'free')} | <strong>Solicitado:</strong> ${window.escapeHtml(planLabels[req.requested_plan] || req.requested_plan)}</p>
          ${benefits.length ? `<p><strong>Beneficios:</strong> ${benefits.map(window.escapeHtml).join(', ')}</p>` : ''}
          <p style="font-size:0.75rem;color:var(--text-muted);">Enviado em ${created}</p>
          <textarea id="upgradeRejectReason-${req.id}" class="form-input" rows="2" placeholder="Motivo se negar" style="margin-top:0.6rem;"></textarea>
        </div>
        <div class="queue-actions" style="align-self:flex-start;">
          <button class="btn-approve" onclick="reviewUpgradeRequest('${req.id}','approve')"><i class="fa-solid fa-check ic-check"></i> Aprovar</button>
          <button class="btn-reject" onclick="reviewUpgradeRequest('${req.id}','reject')"><i class="fa-solid fa-xmark ic-alert"></i> Negar</button>
        </div>
      </div>`;
  }).join('');
}

async function reviewUpgradeRequest(requestId, action) {
  const req = allUpgradeRequests.find(r => r.id === requestId);
  if (!req) return;

  if (action === 'approve') {
    const { error: profileError } = await supabase.from('profiles').update({ plan: req.requested_plan }).eq('id', req.user_id);
    if (profileError) {
      showToast('Erro ao aprovar upgrade: ' + profileError.message, 'error');
      return;
    }

    const { error: reqError } = await supabase.from('upgrade_requests').update({
      status: 'approved',
      reviewed_by: currentUser.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: null
    }).eq('id', requestId);
    if (reqError) {
      showToast('Plano atualizado, mas falhou ao atualizar solicitacao: ' + reqError.message, 'error');
      return;
    }

    showToast('<i class="fa-solid fa-circle-check ic-check"></i> Upgrade aprovado!');
    await refreshAdminUsers();
    await loadUpgradeRequests();
    return;
  }

  const reason = document.getElementById(`upgradeRejectReason-${requestId}`)?.value.trim() || 'Upgrade negado pelo administrador.';
  const { error } = await supabase.from('upgrade_requests').update({
    status: 'rejected',
    rejection_reason: reason,
    reviewed_by: currentUser.id,
    reviewed_at: new Date().toISOString()
  }).eq('id', requestId);

  if (error) {
    showToast('Erro ao negar upgrade: ' + error.message, 'error');
    return;
  }

  showToast('<i class="fa-solid fa-circle-check ic-check"></i> Upgrade negado e motivo registrado.');
  await loadUpgradeRequests();
}
async function loadNutritionistRequests() {
  if (!isAdmin()) return;
  const el = document.getElementById('pendingNutritionistsList');
  const countEl = document.getElementById('statPendingNutritionists');
  if (!el) return;
  el.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;">Carregando solicitacoes...</p>';

  const statusFilter = document.getElementById('nutritionistRequestStatusFilter')?.value || 'pending';
  let query = _getSb()
    .from('nutritionist_requests')
    .select('*')
    .order('created_at', { ascending:false });
  if (statusFilter !== 'all') query = query.eq('status', statusFilter);
  const { data, error } = await query;

  if (error || !data) {
    console.error('[Admin] nutritionist_requests error:', error);
    el.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;">Tabela nutritionist_requests nao encontrada ou sem permissao de leitura.</p>';
    if (countEl) countEl.textContent = '—';
    return;
  }

  allNutritionistRequests = data;
  if (countEl) countEl.textContent = data.length;
  if (!data.length) {
    el.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;">Nenhuma solicitacao encontrada. <i class="fa-solid fa-circle-check ic-check"></i></p>';
    return;
  }

  el.innerHTML = data.map(req => {
    let created = '—';
    try { if (req.created_at) created = new Date(req.created_at).toLocaleString('pt-BR'); } catch(e){}
    if (created === 'Invalid Date' || created === 'Data Inválida') created = '—';
    const fieldsId = `nutRejectFields-${req.id}`;
    const reasonId = `nutRejectReason-${req.id}`;
    return `
      <div class="queue-item">
        <div class="queue-info">
          <strong>${window.escapeHtml(req.user_name || 'Usuario sem nome')}</strong>
          <p>${window.escapeHtml(req.user_email || '')}</p>
          <p><strong>CRN:</strong> ${window.escapeHtml(req.crn || '—')} | <strong>Especialidade:</strong> ${window.escapeHtml(req.specialty || '—')}</p>
          <p><strong>Instituicao:</strong> ${window.escapeHtml(req.institution || '—')}</p>
          ${req.message ? `<p><strong>Mensagem:</strong> ${window.escapeHtml(req.message)}</p>` : ''}
          <p style="font-size:0.75rem;color:var(--text-muted);">Enviado em ${created}</p>
          <div style="margin-top:0.65rem;display:grid;gap:0.5rem;">
            <select id="${fieldsId}" class="form-select" multiple size="4" style="min-height:92px;">
              <option value="crn">CRN / registro profissional</option>
              <option value="specialty">Especialidade</option>
              <option value="institution">Instituicao de formacao</option>
              <option value="message">Mensagem / dados adicionais</option>
            </select>
            <select id="${reasonId}" class="form-select">
              <option value="dados_incorretos">Dados informados estao errados</option>
              <option value="dados_inconsistentes">Dados informados nao condizem com outros dados</option>
              <option value="documentacao_insuficiente">Documentacao ou informacoes insuficientes</option>
            </select>
          </div>
        </div>
        <div class="queue-actions" style="align-self:flex-start;">
          <button class="btn-approve" onclick="reviewNutritionistRequest('${req.id}','approve')"><i class="fa-solid fa-check ic-check"></i> Permitir</button>
          <button class="btn-reject" onclick="reviewNutritionistRequest('${req.id}','reject')"><i class="fa-solid fa-xmark ic-alert"></i> Negar</button>
        </div>
      </div>`;
  }).join('');
}

async function reviewNutritionistRequest(requestId, action) {
  const req = allNutritionistRequests.find(r => r.id === requestId);
  if (!req) return;

  if (action === 'approve') {
    const { error: profileError } = await supabase.from('profiles').update({
      role: 'nutritionist',
      plan: 'pro'
    }).eq('id', req.user_id);
    if (profileError) {
      showToast('Erro ao aprovar usuario: ' + profileError.message, 'error');
      return;
    }

    const { error: reqError } = await supabase.from('nutritionist_requests').update({
      status: 'approved',
      reviewed_by: currentUser.id,
      reviewed_at: new Date().toISOString()
    }).eq('id', requestId);
    if (reqError) {
      showToast('Usuario aprovado, mas falhou ao atualizar a solicitacao: ' + reqError.message, 'error');
      return;
    }

    showToast('<i class="fa-solid fa-circle-check ic-check"></i> Usuario aprovado como nutricionista!');
    await refreshAdminUsers();
    await loadNutritionistRequests();
    return;
  }

  const fieldsEl = document.getElementById(`nutRejectFields-${requestId}`);
  const reasonEl = document.getElementById(`nutRejectReason-${requestId}`);
  const selectedFields = fieldsEl ? Array.from(fieldsEl.selectedOptions).map(opt => opt.value) : [];
  const reason = reasonEl?.value || 'dados_incorretos';
  if (!selectedFields.length) {
    showToast('Selecione quais dados estao errados antes de negar.', 'error');
    return;
  }

  const { error } = await supabase.from('nutritionist_requests').update({
    status: 'rejected',
    rejection_reason: reason,
    rejection_fields: selectedFields,
    reviewed_by: currentUser.id,
    reviewed_at: new Date().toISOString()
  }).eq('id', requestId);

  if (error) {
    showToast('Erro ao negar solicitacao: ' + error.message, 'error');
    return;
  }

  showToast('<i class="fa-solid fa-circle-check ic-check"></i> Solicitacao negada e motivo registrado.');
  await loadNutritionistRequests();
}

async function loadPendingRecipes() {
  const { data, error } = await supabase.from('pending_recipes').select('*, profiles(name)').eq('approved', false);
  const el = document.getElementById('pendingRecipesList');
  const countEl = document.getElementById('statPendingRecipes');
  if (error || !data) { el.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;">Tabela pending_recipes não encontrada.</p>'; countEl.textContent = '—'; return; }
  countEl.textContent = data.length;
  if (data.length === 0) { el.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;">Nenhuma receita pendente. <i class="fa-solid fa-circle-check ic-check"></i></p>'; return; }
  el.innerHTML = data.map(r => `
    <div class="queue-item">
      <div>
        <div class="queue-item-title"><i class="fa-solid fa-utensils ic-recipes"></i> ${r.name}</div>
        <div class="queue-item-sub">Por: ${r.profiles?.name || 'Usuário'} • ${r.kcal} kcal • ${r.visibility}</div>
      </div>
      <div class="queue-actions">
        <button class="btn-approve" onclick="approveRecipe('${r.id}')">✓ Aprovar</button>
        <button class="btn-reject" onclick="rejectRecipe('${r.id}')">✗ Recusar</button>
      </div>
    </div>
  `).join('');
}

async function approveRecipe(id) {
  await supabase.from('pending_recipes').update({ approved:true }).eq('id', id);
  showToast('<i class="fa-solid fa-circle-check ic-check"></i> Receita aprovada!');
  loadPendingRecipes();
}

async function rejectRecipe(id) {
  await supabase.from('pending_recipes').delete().eq('id', id);
  showToast('🗑 Receita recusada', 'error');
  loadPendingRecipes();
}

// ═══════════════════════════════════════
// PROFILE / SETTINGS
// ═══════════════════════════════════════
async function saveProfile() {
  const name = document.getElementById('profileName').value.trim();
  const sex = document.getElementById('profileSex').value;
  const age = parseInt(document.getElementById('profileAge').value) || null;
  const weight = parseFloat(document.getElementById('profileWeight').value) || null;
  const height = parseFloat(document.getElementById('profileHeight').value) || null;

  const username = (document.getElementById('profileUsername')?.value || '').trim().toLowerCase();
  const { error } = await supabase.from('profiles').update({ name, username: username || null, sex, age, weight, height }).eq('id', currentUser.id);
  if (error) { showToast('Erro ao salvar: ' + error.message, 'error'); return; }

  // Sincroniza o nome também no auth.user_metadata para não reverter ao relogar
  try {
    await supabase.auth.updateUser({ data: { name, full_name: name } });
    // Atualiza o currentUser local para refletir imediatamente
    if (currentUser?.user_metadata) {
      currentUser.user_metadata.name = name;
      currentUser.user_metadata.full_name = name;
    }
  } catch(e) {
    console.warn('[CalorIA] Não foi possível atualizar user_metadata:', e);
  }

  currentProfile = { ...currentProfile, name, sex, age, weight, height };
  renderSidebarUser();
  updateHomePanel();
  if (typeof showSuccessAnimated === 'function') {
    showSuccessAnimated('Perfil Salvo!', 'Suas informações foram atualizadas com sucesso.');
  } else {
    showToast('<i class="fa-solid fa-circle-check ic-check"></i> Perfil salvo!');
  }
}


async function handleAvatarUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) { showToast('Imagem muito grande. Máximo 2MB.', 'error'); return; }
  showToast('<i class="fa-solid fa-hourglass-half ic-water"></i> Enviando foto...');
  try {
    const ext = file.name.split('.').pop();
    const path = currentUser.id + '/avatar.' + ext;
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) throw upErr;
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    const avatarUrl = urlData.publicUrl + '?t=' + Date.now();
    const { error: dbErr } = await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', currentUser.id);
    if (dbErr) throw dbErr;
    currentProfile.avatar_url = avatarUrl;
    renderSidebarUser();
    showToast('<i class="fa-solid fa-circle-check ic-check"></i> Foto atualizada!');
  } catch(err) {
    console.error('Avatar upload error:', err);
    showToast('<i class="fa-solid fa-xmark ic-alert"></i> Erro ao enviar foto: ' + (err.message||err), 'error');
  }
}
// ═══════════════════════════════════════
// UPGRADE MODAL
// ═══════════════════════════════════════
function openUpgradeModal() {
  document.getElementById('upgradeModal').classList.add('show');
  // Auto-switch para tab de nutricionista se já for nutricionista
  if (isProfessional()) switchUpgradeTab('nut');
  else switchUpgradeTab('user');
}
function closeUpgradeModal() { document.getElementById('upgradeModal').classList.remove('show'); }

function switchUpgradeTab(tab) {
  const isNut = tab === 'nut';
  document.getElementById('upgradePlansUser').style.display = isNut ? 'none' : 'grid';
  document.getElementById('upgradePlansNut').style.display  = isNut ? 'grid' : 'none';
  document.getElementById('upgradeTabUser').style.background = isNut ? 'transparent' : 'var(--green-deep)';
  document.getElementById('upgradeTabUser').style.color = isNut ? 'var(--text-muted)' : 'white';
  document.getElementById('upgradeTabNut').style.background  = isNut ? 'var(--green-deep)' : 'transparent';
  document.getElementById('upgradeTabNut').style.color  = isNut ? 'white' : 'var(--text-muted)';
}

async function requestUpgrade(plan) {
  const planNames = {
    pro: 'Standard Pro (R$25/mes)',
    nutritionist_pro: 'Nutricionista Pro (R$59/mes)',
    nutritionist_clinic: 'Nutricionista Clínica (R$99/mes)',
    clinic: 'Nutricionista Clínica (R$99/mes)'
  };
  const planFeatures = {
    pro: ['Diário alimentar completo','Câmera IA ilimitada','Receitas por objetivo','Criar receitas próprias','Relatório pessoal em PDF','Alertas de meta e macros','Histórico avançado'],
    nutritionist_pro: ['Tudo do Standard Pro','Painel de pacientes (até 15)','Cadastrar pacientes diretamente','Enviar receitas aos pacientes','Chat com pacientes','Metas personalizadas por paciente','Relatórios nutricionais em PDF'],
    nutritionist_clinic: ['Tudo do Nutricionista Pro','Pacientes ilimitados','Prontuário clínico do paciente','Relatório de evolução clínica','Paciente vê dados avançados','Planos alimentares personalizados','Assinatura de documentos','Perfil profissional público'],
    clinic: ['Tudo do Nutricionista Pro','Pacientes ilimitados','Prontuário clínico do paciente','Relatório de evolução clínica','Paciente vê dados avançados','Planos alimentares personalizados','Perfil profissional público']
  };
  closeUpgradeModal();
  showToast('<i class="fa-solid fa-hourglass-half ic-water"></i> Enviando solicitacao...');
  const benefits = planFeatures[plan] || [];
  const bodyText = `Solicitacao de Upgrade\n\nPlano: ${planNames[plan]||plan}\nNome: ${currentProfile?.name||''}\nE-mail: ${currentUser?.email}\n\nBeneficios solicitados:\n- ${benefits.join('\n- ')}\n\nAguardando aprovacao no painel admin.`;
  try {
    const { error: dbError } = await supabase.from('upgrade_requests').insert({
      user_id: currentUser.id,
      user_name: currentProfile?.name || '',
      user_email: currentUser?.email || '',
      requested_plan: plan,
      current_plan: currentProfile?.plan || 'free',
      benefits,
      status: 'pending',
      reviewed_by: null,
      reviewed_at: null,
      rejection_reason: null
    });
    if (dbError) throw dbError;

    try {
      await sendEmailViaAPI('nexy.corporationn@gmail.com', `Solicitacao de Upgrade - Plano ${planNames[plan]||plan}`, bodyText);
    } catch(emailError) {
      console.warn('[CalorIA] Upgrade email notification failed:', emailError);
    }

    showToast('<i class="fa-solid fa-circle-check ic-check"></i> Solicitacao enviada! O admin podera aprovar pelo painel.');
  } catch(e) {
    console.error('[CalorIA] upgrade request error:', e);
    showToast('<i class="fa-solid fa-triangle-exclamation ic-alert"></i> Erro ao salvar solicitacao de upgrade. Verifique a tabela upgrade_requests no Supabase.', 'error');
  }
}

// ═══════════════════════════════════════
// CHAT / CANAL NUTRICIONISTA-PACIENTE
// ═══════════════════════════════════════
let _chatChannel = null;
let _chatPatientId = null;
let _chatInitialized = false;

async function initChatPanel() {
  if (_chatInitialized) { await loadChatMessages(); return; }
  _chatInitialized = true;
  const isProf = isProfessional();

  document.getElementById('chatPdfArea').style.display = isProf ? 'flex' : 'none';

  if (isProf) {
    document.getElementById('chatPatientSelector').style.display = 'block';
    document.getElementById('chatSubtitle').textContent = t('chat_subtitle_prof');
    const nutBadge = document.getElementById('chatNutBadge');
    if (nutBadge) {
      if (isNutritionistClinic()) { nutBadge.innerHTML = t('chat_clinic_badge'); nutBadge.style.cssText += 'display:inline-block;background:#1de9b6;color:#004d40;'; }
      else { nutBadge.innerHTML = t('chat_pro_badge'); nutBadge.style.cssText += 'display:inline-block;background:#ffd54f;color:#333;'; }
    }
    const { data: links } = await supabase.from('professional_patients').select('patient_id').eq('professional_id', currentUser.id);
    if (links && links.length) {
      const ids = links.map(l => l.patient_id);
      const { data: pts } = await supabase.from('profiles').select('id,name,email').in('id', ids);
      const sel = document.getElementById('chatPatientSelect');
      sel.innerHTML = `<option value="">${t('chat_select_patient')}</option>` +
        (pts || []).map(p => `<option value="${p.id}">${p.name || p.email}</option>`).join('');
    }
  } else if (currentProfile?.role === 'patient' && currentProfile?.nutritionist_id) {
    _chatPatientId = currentUser.id;
    const { data: nut } = await supabase.from('profiles').select('name,plan').eq('id', currentProfile.nutritionist_id).single();
    document.getElementById('chatPartnerName').textContent = nut?.name || t('chat_default_partner');
    if (nut?.plan === 'clinic' || nut?.plan === 'nutritionist_clinic') {
      const b = document.getElementById('chatNutBadge');
      if (b) { b.innerHTML = t('chat_clinic_badge'); b.style.cssText+='display:inline-block;background:#1de9b6;color:#004d40;'; }
    }
    document.getElementById('chatSubtitle').textContent = t('chat_subtitle_patient');
    const photoArea = document.getElementById('chatPhotoArea');
    if (photoArea) photoArea.style.display = 'flex';
    await loadChatMessages();
    subscribeChat(currentProfile.nutritionist_id, currentUser.id);
  }
}

async function loadChatMessages() {
  const isProf = isProfessional();
  let nutId, patId;
  if (isProf) {
    const sel = document.getElementById('chatPatientSelect');
    patId = sel?.value;
    nutId = currentUser.id;
    if (!patId) { document.getElementById('chatMessages').innerHTML = `<p style="color:var(--text-muted);text-align:center;padding:2rem;font-size:0.85rem;">${t('chat_select_patient_prompt')}</p>`; return; }
    _chatPatientId = patId;
    document.getElementById('chatPartnerName').textContent = sel.options[sel.selectedIndex]?.text || t('chat_default_patient_name');
  } else {
    patId = currentUser.id;
    nutId = currentProfile?.nutritionist_id;
    if (!nutId) return;
  }
  const el = document.getElementById('chatMessages');
  el.innerHTML = `<p style="color:var(--text-muted);text-align:center;font-size:0.82rem;">${t('chat_loading')}</p>`;
  const { data, error } = await supabase.from('chat_messages')
    .select('*').eq('nutritionist_id', nutId).eq('patient_id', patId)
    .order('created_at', { ascending: true });
  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205' || error.message?.includes('chat_messages')) {
      el.innerHTML = `<div style="color:var(--text-muted);font-size:0.83rem;padding:1rem;text-align:center;"><i class="fa-solid fa-triangle-exclamation ic-alert"></i> ${t('chat_table_missing')}<br><span style="font-size:0.75rem;">${t('chat_see_sql')}</span></div>`;
      console.warn('SQL para criar o chat:\n\nCREATE TABLE chat_messages (\n  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,\n  nutritionist_id uuid REFERENCES profiles(id),\n  patient_id uuid REFERENCES profiles(id),\n  sender_id uuid REFERENCES profiles(id),\n  content text,\n  type text DEFAULT \'text\',\n  pdf_url text,\n  pdf_name text,\n  created_at timestamptz DEFAULT now()\n);\nALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;\nCREATE POLICY "Canal" ON chat_messages FOR ALL USING (\n  auth.uid() = nutritionist_id OR auth.uid() = patient_id\n);');
    } else { el.innerHTML = `<p style="color:#ef5350;font-size:0.83rem;">Erro: ${error.message}</p>`; }
    return;
  }
  renderChatMessages(data || []);
  subscribeChat(nutId, patId);
}

function renderChatMessages(msgs) {
  const el = document.getElementById('chatMessages');
  if (!msgs.length) { el.innerHTML = `<p style="color:var(--text-muted);text-align:center;padding:2rem;font-size:0.85rem;">${t('chat_no_messages')}</p>`; return; }
  el.innerHTML = msgs.map(m => {
    const isMine = m.sender_id === currentUser.id;
    const locale = currentLang === 'en' ? 'en-US' : 'pt-BR';
    const time = new Date(m.created_at).toLocaleTimeString(locale, { hour:'2-digit', minute:'2-digit' });
    const date = new Date(m.created_at).toLocaleDateString(locale, { day:'2-digit', month:'short' });
    let content = '';
    if (m.type === 'pdf' && m.pdf_url) {
      content = `<div style="display:flex;align-items:center;gap:0.6rem;background:rgba(0,0,0,0.1);border-radius:8px;padding:0.5rem 0.7rem;">
        <i class="fa-solid fa-file-pdf" style="color:#ef9a9a;font-size:1.3rem;flex-shrink:0;"></i>
        <div style="flex:1;min-width:0;"><div style="font-weight:600;font-size:0.82rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${m.pdf_name||t('chat_doc_default')}</div></div>
        <a href="${m.pdf_url}" target="_blank" download="${m.pdf_name||'arquivo.pdf'}" style="background:white;color:#388e3c;border:none;border-radius:50px;padding:0.3rem 0.7rem;font-size:0.73rem;font-weight:700;text-decoration:none;white-space:nowrap;flex-shrink:0;">
          <i class="fa-solid fa-download" style="color:#388e3c!important;margin-right:0.2rem;"></i>Baixar</a>
      </div>`;
    } else if (m.type === 'pdf') {
      content = `<div style="display:flex;align-items:center;gap:0.5rem;"><i class="fa-solid fa-file-pdf" style="color:#ef9a9a;"></i> <span style="font-size:0.85rem;">${m.pdf_name||'PDF'} ${t('chat_pdf_unavailable')}</span></div>`;
    } else if (m.type === 'image' && m.pdf_url) {
      content = `<img src="${m.pdf_url}" alt="${m.pdf_name||'image'}" style="max-width:100%;max-height:240px;border-radius:8px;display:block;cursor:pointer;" onclick="window.open('${m.pdf_url}','_blank')">`;
    } else if (m.type === 'recipe') {
      content = `<div style="background:rgba(0,0,0,0.1);border-radius:8px;padding:0.5rem 0.7rem;"><i class="fa-solid fa-utensils" style="color:${isMine?'white':'var(--green-mid)'}!important;margin-right:0.3rem;"></i><strong>${m.content}</strong><div style="font-size:0.72rem;opacity:0.7;margin-top:0.15rem;">${t('chat_shared_recipe')}</div></div>`;
    } else {
      content = `<span style="font-size:0.88rem;line-height:1.5;">${m.content}</span>`;
    }
    return `<div style="display:flex;flex-direction:column;align-items:${isMine?'flex-end':'flex-start'};gap:0.1rem;">
      <div style="max-width:82%;background:${isMine?'var(--green-mid)':'var(--bg-app)'};color:${isMine?'white':'var(--text-main)'};padding:0.55rem 0.9rem;border-radius:${isMine?'16px 16px 4px 16px':'16px 16px 16px 4px'};border:1px solid ${isMine?'transparent':'var(--border)'};">${content}</div>
      <span style="font-size:0.68rem;color:var(--text-muted);padding:0 4px;">${date} ${time}</span>
    </div>`;
  }).join('');
  el.scrollTop = el.scrollHeight;
}

async function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const content = input.value.trim();
  if (!content) return;
  const isProf = isProfessional();
  const nutId = isProf ? currentUser.id : currentProfile?.nutritionist_id;
  const patId = isProf ? _chatPatientId : currentUser.id;
  if (!nutId || !patId) { showToast(t('chat_select_patient_first'), 'error'); return; }
  if (isProf && !_chatPatientId) { showToast(t('chat_select_patient_first'), 'error'); return; }
  input.value = '';
  input.disabled = true;
  const { error } = await supabase.from('chat_messages').insert({
    nutritionist_id: nutId, patient_id: patId,
    sender_id: currentUser.id, content, type: 'text',
    created_at: new Date().toISOString()
  });
  input.disabled = false;
  input.focus();
  if (error) { showToast(t('chat_send_error') + error.message, 'error'); input.value = content; return; }
  await loadChatMessages();
}

async function uploadChatPdf(event) {
  const file = event.target.files[0];
  if (!file) return;
  const patId = _chatPatientId;
  if (!patId) { showToast(t('chat_select_patient_first'), 'error'); return; }
  showToast(t('chat_sending_pdf'));
  const path = `chat/${currentUser.id}/${patId}/${Date.now()}_${file.name}`;
  const { data: upData, error: upErr } = await supabase.storage.from('chat-files').upload(path, file, { contentType: 'application/pdf' });
  event.target.value = '';
  if (upErr || !upData) {
    console.warn('[uploadChatPdf] storage error:', upErr?.message);
    showToast(t('chat_pdf_upload_error') + (upErr?.message || ''), 'error');
    return;
  }
  const pdfUrl = supabase.storage.from('chat-files').getPublicUrl(path).data.publicUrl;
  const { error: insErr } = await supabase.from('chat_messages').insert({
    nutritionist_id: currentUser.id, patient_id: patId,
    sender_id: currentUser.id,
    content: file.name, type: 'pdf',
    pdf_url: pdfUrl, pdf_name: file.name,
    created_at: new Date().toISOString()
  });
  if (insErr) { showToast(t('chat_send_error') + insErr.message, 'error'); return; }
  showToast('<i class="fa-solid fa-circle-check ic-check"></i> ' + t('chat_pdf_sent'));
  await loadChatMessages();
}

async function uploadChatPhoto(event) {
  const file = event.target.files[0];
  if (!file) return;
  const isProf = isProfessional();
  const nutId = isProf ? currentUser.id : currentProfile?.nutritionist_id;
  const patId = isProf ? _chatPatientId : currentUser.id;
  if (!nutId || !patId) { showToast(t('chat_select_patient_first'), 'error'); return; }
  showToast(t('chat_sending_photo'));
  const path = `chat/${nutId}/${patId}/${Date.now()}_${file.name}`;
  const { data: upData, error: upErr } = await supabase.storage.from('chat-files').upload(path, file, { contentType: file.type });
  event.target.value = '';
  if (upErr || !upData) {
    console.warn('[uploadChatPhoto] storage error:', upErr?.message);
    showToast(t('chat_photo_upload_error') + (upErr?.message || ''), 'error');
    return;
  }
  const photoUrl = supabase.storage.from('chat-files').getPublicUrl(path).data.publicUrl;
  const { error: insErr } = await supabase.from('chat_messages').insert({
    nutritionist_id: nutId, patient_id: patId,
    sender_id: currentUser.id,
    content: file.name, type: 'image',
    pdf_url: photoUrl, pdf_name: file.name,
    created_at: new Date().toISOString()
  });
  if (insErr) { showToast(t('chat_send_error') + insErr.message, 'error'); return; }
  await loadChatMessages();
}

function subscribeChat(nutId, patId) {
  if (_chatChannel) { try { supabase.removeChannel(_chatChannel); } catch(e) {} }
  _chatChannel = supabase.channel('chat-' + nutId + '-' + patId)
    .on('postgres_changes', { event:'INSERT', schema:'public', table:'chat_messages' }, () => loadChatMessages())
    .subscribe();
}

// Expor funções para o escopo global
window.toLocalDateStr = toLocalDateStr;
window.viewPatientDiary = viewPatientDiary;
window.pdChangeDay = pdChangeDay;
window.pdSwitchTab = pdSwitchTab;
window.pdRender = pdRender;
window.pdRenderDay = pdRenderDay;
window.pdRenderChart = pdRenderChart;
window.closePatientDiary = closePatientDiary;
window.openRecordModal = openRecordModal;
window.closeRecordModal = closeRecordModal;
window.setRecordPeriod = setRecordPeriod;
window.generatePatientRecordPdf = generatePatientRecordPdf;
window.buildRecordHtml = buildRecordHtml;
window.loadLinkedNutritionist = loadLinkedNutritionist;
window.checkPatientNotifications = checkPatientNotifications;
window.loadAdminPanel = loadAdminPanel;
window.refreshAdminUsers = refreshAdminUsers;
window.renderAdminTable = renderAdminTable;
window.filterAdminTable = filterAdminTable;
window.savePlan = savePlan;
window.loadUpgradeRequests = loadUpgradeRequests;
window.reviewUpgradeRequest = reviewUpgradeRequest;
window.loadNutritionistRequests = loadNutritionistRequests;
window.reviewNutritionistRequest = reviewNutritionistRequest;
window.loadPendingRecipes = loadPendingRecipes;
window.approveRecipe = approveRecipe;
window.rejectRecipe = rejectRecipe;
window.saveProfile = saveProfile;
window.handleAvatarUpload = handleAvatarUpload;
window.openUpgradeModal = openUpgradeModal;
window.closeUpgradeModal = closeUpgradeModal;
window.switchUpgradeTab = switchUpgradeTab;
window.requestUpgrade = requestUpgrade;
window.initChatPanel = initChatPanel;
window.loadChatMessages = loadChatMessages;
window.renderChatMessages = renderChatMessages;
window.sendChatMessage = sendChatMessage;
window.uploadChatPdf = uploadChatPdf;
window.uploadChatPhoto = uploadChatPhoto;
window.subscribeChat = subscribeChat;
window.loadPatients = loadPatients;
window.openPatientDossier = openPatientDossier;


