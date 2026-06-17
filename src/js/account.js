// ═══════════════════════════════════════
async function loadMyNutritionistRequestStatus() {
  if (!currentUser) return;
  const statusEl = document.getElementById('nutritionistRequestStatus');
  const btn = document.getElementById('nutritionistRequestBtn');
  if (!statusEl) return;

  const { data, error } = await supabase
    .from('nutritionist_requests')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending:false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    statusEl.style.display = 'none';
    if (btn) btn.style.display = 'inline-flex';
    window._myNutReq = null;
    return;
  }

  window._myNutReq = data;
  const statusLabels = { pending:'Em análise', approved:'Aprovado', rejected:'Negado' };
  const fields = Array.isArray(data.rejection_fields) && data.rejection_fields.length ? '<br>Dados marcados: ' + data.rejection_fields.join(', ') : '';
  const reason = data.status === 'rejected' ? '<br>Motivo: ' + escapeHtml(data.rejection_reason || 'Não informado') + fields : '';
  statusEl.innerHTML = '<strong>Status da solicitação:</strong> ' + (statusLabels[data.status] || data.status) + reason;
  statusEl.style.display = 'block';
  
  if (btn) {
    btn.style.display = 'inline-flex';
    btn.innerHTML = data.status === 'rejected' ? 'Enviar Nova Solicitação' : 'Ver Solicitação';
  }
}
function openNutritionistRequest() {
  document.getElementById('nutritionistModal').classList.add('show');
  const req = window._myNutReq;
  const isReadOnly = req && (req.status === 'pending' || req.status === 'approved');
  
  if (req && req.status !== 'rejected') {
    document.getElementById('nutCRN').value = req.crn || '';
    document.getElementById('nutInstitution').value = req.institution || '';
    document.getElementById('nutMessage').value = req.message || '';
    
    // Check specialties
    const specStr = req.specialty || '';
    document.querySelectorAll('input[name="nutSpecialty"]').forEach(cb => {
      if (specStr.includes(cb.value)) cb.checked = true;
      else cb.checked = false;
    });
    
    // Handle 'Outra'
    const predefined = ['Clínica', 'Esportiva', 'Pediatria', 'Gestante', 'Oncologia', 'Renal', 'Cardiologia', 'Outra'];
    const customSpecs = specStr.split(', ').filter(s => !predefined.includes(s));
    if (customSpecs.length > 0 || specStr.includes('Outra')) {
      const otherCb = document.querySelector('input[name="nutSpecialty"][value="Outra"]');
      if (otherCb) otherCb.checked = true;
      document.getElementById('nutSpecialtyOtherContainer').style.display = 'block';
      document.getElementById('nutSpecialtyOther').value = customSpecs.join(', ');
    }
  }

  const inputs = ['nutCRN', 'nutInstitution', 'nutMessage', 'nutSpecialtyOther'];
  inputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = isReadOnly;
  });
  document.querySelectorAll('input[name="nutSpecialty"]').forEach(cb => cb.disabled = isReadOnly);
  
  const submitBtn = document.querySelector('#nutritionistModal .btn-primary');
  if (submitBtn) submitBtn.style.display = isReadOnly ? 'none' : 'block';
}
function closeNutritionistModal() { document.getElementById('nutritionistModal').classList.remove('show'); }

async function sendNutritionistRequest() {
  const crn = document.getElementById('nutCRN').value.trim();
  const checkboxes = document.querySelectorAll('input[name="nutSpecialty"]:checked');
  let specialtyList = Array.from(checkboxes).map(c => c.value);
  if (specialtyList.includes('Outra')) {
    const otherVal = document.getElementById('nutSpecialtyOther').value.trim();
    if (otherVal) specialtyList = specialtyList.filter(v => v !== 'Outra').concat(otherVal);
  }
  const specialty = specialtyList.join(', ');
  const institution = document.getElementById('nutInstitution').value.trim();
  const message = document.getElementById('nutMessage').value.trim();
  if (!crn) { showToast('Informe o CRN', 'error'); return; }
  closeNutritionistModal();
  showToast('<i class="fa-solid fa-hourglass-half ic-water"></i> Enviando solicitação...');
  const bodyText =
    'Solicitação de Nutricionista\n\n' +
    'Nome: ' + (currentProfile?.name||'') + '\n' +
    'E-mail: ' + (currentUser?.email||'') + '\n' +
    'CRN: ' + crn + '\n' +
    'Especialidade: ' + specialty + '\n' +
    'Instituição: ' + institution + '\n\n' +
    'Mensagem: ' + message;
  try {
    const { error: dbError } = await supabase.from('nutritionist_requests').upsert({
      user_id: currentUser.id,
      user_name: currentProfile?.name || '',
      user_email: currentUser?.email || '',
      crn,
      specialty,
      institution,
      message,
      status: 'pending',
      rejection_reason: null,
      rejection_fields: null,
      reviewed_by: null,
      reviewed_at: null
    }, { onConflict: 'user_id' });
    if (dbError) throw dbError;
    try {
      await sendEmailViaAPI('nexy.corporationn@gmail.com', 'Solicitacao de Nutricionista - CalorIA', bodyText);
    } catch(emailError) {
      console.warn('[CalorIA] Email notification failed:', emailError);
    }
    const crnInput = document.getElementById('nutCRN'); if (crnInput) crnInput.value = '';
    const otherInput = document.getElementById('nutSpecialtyOther'); if (otherInput) otherInput.value = '';
    const instInput = document.getElementById('nutInstitution'); if (instInput) instInput.value = '';
    const msgInput = document.getElementById('nutMessage'); if (msgInput) msgInput.value = '';
    document.querySelectorAll('input[name="nutSpecialty"]').forEach(cb => cb.checked = false);
    const otherContainer = document.getElementById('nutSpecialtyOtherContainer');
    if (otherContainer) otherContainer.style.display = 'none';
    showToast('<i class="fa-solid fa-circle-check ic-check"></i> Solicitação enviada! O admin poderá aprovar pelo painel.');
  } catch(e) {
    console.error('[CalorIA] nutritionist request error:', e);
    showToast('<i class="fa-solid fa-triangle-exclamation ic-alert"></i> Erro ao salvar solicitacao. Verifique a tabela nutritionist_requests no Supabase.', 'error');
  }
}

async function sendEmailViaAPI(to, subject, bodyText) {
  // EmailJS — funciona direto do browser, sem backend, sem CORS
  // Configuração OBRIGATÓRIA (gratuita, 200 emails/mês):
  //   1. Acesse https://www.emailjs.com e crie uma conta
  //   2. Em "Email Services" conecte o Gmail (nexy.corporationn@gmail.com)
  //   3. Em "Email Templates" crie um template com variáveis: {{subject}}, {{message}}, {{from_name}}, {{from_email}}
  //   4. Substitua as 3 constantes abaixo com seus IDs reais
  const EMAILJS_SERVICE_ID  = 'SEU_SERVICE_ID';   // ex: service_abc123
  const EMAILJS_TEMPLATE_ID = 'SEU_TEMPLATE_ID';  // ex: template_xyz789
  const EMAILJS_PUBLIC_KEY  = 'SUA_PUBLIC_KEY';   // ex: user_AbCdEfGhIj

  if (EMAILJS_SERVICE_ID === 'SEU_SERVICE_ID') {
    throw new Error('EmailJS nao configurado');
  }

  if (!window.emailjs) {
    await new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
    window.emailjs.init(EMAILJS_PUBLIC_KEY);
  }

  await window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
    to_email:   to,
    subject:    subject,
    message:    bodyText,
    from_name:  currentProfile?.name || 'Usuário CalorIA',
    from_email: currentUser?.email   || ''
  });
}

// ═══════════════════════════════════════
// PLAN RESTRICTIONS
// ═══════════════════════════════════════
function showPaywall(containerId, feature) {
  const container = document.getElementById(containerId);
  if (!container || container.querySelector('.paywall-overlay')) return;
  container.classList.add('paywall-locked');
  const pw = document.createElement('div');
  pw.className = 'paywall-overlay';
  pw.innerHTML = `
    <div class="paywall-icon"><i class="fa-solid fa-lock ic-lock"></i></div>
    <div class="paywall-title">${feature}</div>
    <div class="paywall-sub">Disponível no plano <strong>Pro (R$25/mês)</strong></div>
    <button onclick="openUpgradeModal()" style="background:var(--green-deep);color:white;border:none;border-radius:50px;padding:0.65rem 1.5rem;font-family:'Syne',sans-serif;font-weight:700;cursor:pointer;margin-top:0.5rem;">Ver Planos</button>
  `;
  container.appendChild(pw);
}

function removePaywall(containerId) {
  const pw = document.querySelector('#' + containerId + ' .paywall-overlay');
  if (pw) pw.remove();
  document.getElementById(containerId)?.classList.remove('paywall-locked');
}


// ═══════════════════════════════════════
// CREATE PATIENT DIRECTLY (nutricionista)
// ═══════════════════════════════════════
let _cpAvatarFile = null;
let _cpGoalDelta = -500;

function selectCpGoal(btn) {
  document.querySelectorAll('#cpGoalBtns .goal-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  _cpGoalDelta = parseInt(btn.dataset.goal);
}

function openCreatePatientModal() {
  // Reset form
  ['cpName','cpEmail','cpPassword','cpAge','cpWeight','cpHeight'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('cpSex').value = 'f';
  _cpGoalDelta = -500;
  document.querySelectorAll('#cpGoalBtns .goal-btn').forEach((b,i) => b.classList.toggle('active', i===0));
  document.getElementById('cpAvatarInitial').textContent = '?';
  document.getElementById('cpAvatarPreview').querySelector('span') && (document.getElementById('cpAvatarInitial').style.display = '');
  const preview = document.getElementById('cpAvatarPreview');
  preview.style.background = 'var(--green-pale)';
  preview.querySelector('span') && (preview.querySelector('span').style.display = '');
  _cpAvatarFile = null;
  document.getElementById('cpAvatarFile').value = '';
  const imgEl = preview.querySelector('img');
  if (imgEl) imgEl.remove();
  document.getElementById('cpError').style.display = 'none';
  // Reset patient type panel and disease form suggestions
  const typePanel = document.getElementById('cpPatientTypePanel');
  if (typePanel) typePanel.style.display = 'none';
  const suggDiv = document.getElementById('cpDiseaseFormSuggestions');
  if (suggDiv) suggDiv.style.display = 'none';
  const listDiv = document.getElementById('cpDiseaseFormList');
  if (listDiv) listDiv.innerHTML = '';
  // Reset all disease checkboxes
  document.querySelectorAll('#cpDiseasesGeneral input[type=checkbox], #cpDiseasesChronicAuto input[type=checkbox]').forEach(cb => { cb.checked = false; });
  // Reset female section
  cpToggleFemFields();
  document.getElementById('createPatientModal').classList.add('show');
  // Attach disease checkbox listeners (after DOM is shown)
  setTimeout(() => attachDiseaseCheckboxListeners(), 50);
}

function closeCreatePatientModal() {
  document.getElementById('createPatientModal').classList.remove('show');
}

function updateCpInitial() {
  const name = document.getElementById('cpName').value.trim();
  const initial = name ? name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() : '?';
  if (!_cpAvatarFile) {
    document.getElementById('cpAvatarInitial').textContent = initial;
  }
}

function handleCpAvatarUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) { showToast('Imagem muito grande. Máximo 2MB.', 'error'); return; }
  _cpAvatarFile = file;
  const reader = new FileReader();
  reader.onload = e => {
    const preview = document.getElementById('cpAvatarPreview');
    const initSpan = document.getElementById('cpAvatarInitial');
    initSpan.style.display = 'none';
    let img = preview.querySelector('img');
    if (!img) { img = document.createElement('img'); img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;'; preview.insertBefore(img, preview.firstChild); }
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function toggleCpPasswordVisibility() {
  const inp = document.getElementById('cpPassword');
  const eye = document.getElementById('cpPasswordEye');
  if (inp.type === 'password') { inp.type = 'text'; eye.textContent = '🙈'; }
  else { inp.type = 'password'; eye.textContent = '👁'; }
}

function showCpError(msg) {
  const el = document.getElementById('cpError');
  el.textContent = msg;
  el.style.display = 'block';
}

async function _createPatientDirectBase() {
  const name     = document.getElementById('cpName').value.trim();
  const email    = document.getElementById('cpEmail').value.trim();
  const password = document.getElementById('cpPassword').value;
  const sex      = document.getElementById('cpSex').value;
  const age      = parseInt(document.getElementById('cpAge').value) || null;
  const weight   = parseFloat(document.getElementById('cpWeight').value) || null;
  const height   = parseFloat(document.getElementById('cpHeight').value) || null;

  document.getElementById('cpError').style.display = 'none';
  if (!name)     { showCpError('Informe o nome completo.'); return; }
  if (!email)    { showCpError('Informe o e-mail.'); return; }
  if (!password) { showCpError('Defina uma senha temporária.'); return; }
  if (password.length < 6) { showCpError('A senha deve ter pelo menos 6 caracteres.'); return; }

  showToast('<i class="fa-solid fa-hourglass-half ic-water"></i> Criando paciente...');

  // Usa um client Supabase isolado (sem persistir sessão) para o signUp do paciente,
  // assim a sessão da nutricionista logada NÃO é substituída.
  const tempClient = window._createSupabaseClient(window._SUPABASE_URL, window._SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken:false, persistSession:false, detectSessionInUrl:false }
  });

  const { data, error } = await tempClient.auth.signUp({
    email,
    password,
    options: { data: { name, role: 'patient', created_by_nutritionist: currentUser.id, must_change_password: true } }
  });

  if (error) {
    console.error('[createPatientDirect] erro no signUp:', error);
    if (error.message?.includes('already registered') || (data && data.user && data.user.identities && data.user.identities.length === 0)) {
      showCpError('Este e-mail já está cadastrado no sistema.');
    } else {
      showCpError('Erro ao criar conta: ' + error.message);
    }
    return;
  }
  if (data?.user?.identities?.length === 0) {
    showCpError('Este e-mail já está cadastrado no sistema.');
    return;
  }

  const patientId = data.user?.id;
  if (!patientId) { showCpError('Erro inesperado. Tente novamente.'); return; }

  // Imediatamente encerra a sessão do client temporário (caso tenha sido criada)
  // e garante que a sessão atual continua sendo a da nutricionista.
  try { await tempClient.auth.signOut(); } catch(e) {}

  // Upload avatar if provided
  let avatarUrl = null;
  if (_cpAvatarFile) {
    const ext = _cpAvatarFile.name.split('.').pop() || 'jpg';
    const path = patientId + '/avatar.' + ext;
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, _cpAvatarFile, { upsert: true, contentType: _cpAvatarFile.type });
    if (!upErr) {
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      avatarUrl = urlData.publicUrl + '?t=' + Date.now();
    }
  }

  // Create/update profile
  const { error: profErr } = await supabase.from('profiles').upsert({
    id: patientId,
    name,
    email,
    role: 'patient',
    plan: 'pro',
    sex,
    age,
    weight,
    height,
    avatar_url: avatarUrl,
    nutritionist_id: currentUser.id,
    updated_at: new Date().toISOString()
  }, { onConflict: 'id' });

  if (profErr) {
    console.error('[createPatientDirect] erro ao salvar perfil:', profErr);
    if (profErr.code === '42501' || profErr.message?.includes('policy') || profErr.message?.includes('row-level')) {
      showCpError('Conta criada, mas o perfil não pôde ser salvo por restrição de permissão (RLS) na tabela "profiles". É necessário permitir que nutricionistas façam upsert no perfil de seus pacientes.');
    } else {
      showCpError('Conta criada, mas houve erro ao salvar o perfil: ' + profErr.message);
    }
    return;
  }

  // Link patient to nutritionist
  const { error: linkErr } = await supabase.from('professional_patients').insert({
    professional_id: currentUser.id,
    patient_id: patientId
  });

  if (linkErr) {
    console.error('[createPatientDirect] erro ao vincular paciente:', linkErr);
    if (linkErr.code === '42501' || linkErr.message?.includes('policy') || linkErr.message?.includes('row-level')) {
      showCpError('Perfil criado, mas o vínculo com a nutricionista falhou por restrição de permissão (RLS) na tabela "professional_patients".');
    } else if (linkErr.code !== '23505') { // ignore duplicate link
      showCpError('Perfil criado, mas houve erro ao vincular o paciente: ' + linkErr.message);
    }
    if (linkErr.code !== '23505') return;
  }

  // Calcula e salva a meta calórica diária com base no objetivo escolhido
  if (sex && age && weight && height) {
    const tmb = sex === 'm'
      ? 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age)
      : 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
    const suggestedGoal = Math.round(tmb * 1.375) + _cpGoalDelta;
    await supabase.from('user_goals').upsert({ user_id: patientId, daily_kcal: suggestedGoal, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  }

  showToast('<i class="fa-solid fa-circle-check ic-check"></i> Paciente cadastrado com sucesso!');
  closeCreatePatientModal();
  loadPatients();
}

// ═══════════════════════════════════════
// FIRST LOGIN — FORCE PASSWORD CHANGE
// ═══════════════════════════════════════
function openChangePasswordModal() {
  document.getElementById('fcpNew').value = '';
  document.getElementById('fcpConfirm').value = '';
  document.getElementById('fcpError').style.display = 'none';
  document.getElementById('forceChangePasswordModal').classList.add('show');
}

async function submitForcePasswordChange() {
  const newPwd  = document.getElementById('fcpNew').value;
  const confirm = document.getElementById('fcpConfirm').value;
  const errEl   = document.getElementById('fcpError');
  errEl.style.display = 'none';

  if (newPwd.length < 6) { errEl.textContent = 'A nova senha deve ter pelo menos 6 caracteres.'; errEl.style.display = 'block'; return; }
  if (newPwd !== confirm) { errEl.textContent = 'As senhas não coincidem.'; errEl.style.display = 'block'; return; }

  // Check that new password differs from the temp one (we can't verify client-side, but we flag it)
  showToast('<i class="fa-solid fa-hourglass-half ic-water"></i> Atualizando senha...');
  const { error } = await supabase.auth.updateUser({ password: newPwd });
  if (error) { errEl.textContent = 'Erro: ' + error.message; errEl.style.display = 'block'; return; }

  // Clear the must_change_password flag in auth metadata
  const { data: updData, error: updErr } = await supabase.auth.updateUser({ data: { must_change_password: false } });
  if (!updErr && updData?.user) currentUser = updData.user;

  document.getElementById('forceChangePasswordModal').classList.remove('show');
  showToast('<i class="fa-solid fa-circle-check ic-check"></i> Senha atualizada com sucesso!');
}

applyLanguage();

// Handle invite link on page load
(function checkInviteLink() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('invite') && urlParams.get('nid')) {
    // Switch to register tab automatically
    setTimeout(() => {
      if (document.getElementById('authStep1')) {
        switchAuthTab('register');
        const note = document.querySelector('#formRegister .auth-note');
        if (note) note.innerHTML = '<i class="fa-solid fa-circle-check ic-check"></i> Convite detectado! Crie sua conta com o e-mail do convite e você já ficará vinculado à sua nutricionista com acesso Pro.';
      }
    }, 500);
  }
})();

// ═══════════════════════════════════════
// FORGOT PASSWORD & EMAIL CONFIRMATION
// ═══════════════════════════════════════
function openForgotPassword() {
  document.getElementById('forgotEmail').value = document.getElementById('loginEmail')?.value || '';
  document.getElementById('forgotMsg').style.display = 'none';
  document.getElementById('forgotSubmitBtn').disabled = false;
  document.getElementById('forgotPasswordModal').classList.add('show');
}
function closeForgotPassword() {
  document.getElementById('forgotPasswordModal').classList.remove('show');
}
async function sendPasswordReset() {
  const email = document.getElementById('forgotEmail').value.trim();
  const msgEl = document.getElementById('forgotMsg');
  if (!email) {
    msgEl.style.cssText = 'display:block;background:#fdecea;color:#c62828;border-radius:var(--radius-sm);padding:0.7rem 1rem;font-size:0.85rem;';
    msgEl.textContent = 'Informe o seu e-mail.'; return;
  }
  document.getElementById('forgotSubmitBtn').disabled = true;
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + window.location.pathname + '?reset=1'
  });
  if (error) {
    msgEl.style.cssText = 'display:block;background:#fdecea;color:#c62828;border-radius:var(--radius-sm);padding:0.7rem 1rem;font-size:0.85rem;';
    msgEl.textContent = 'Erro: ' + error.message;
    document.getElementById('forgotSubmitBtn').disabled = false;
  } else {
    msgEl.style.cssText = 'display:block;background:#e8f5e9;color:#1a4a1f;border:1px solid #a5d6a7;border-radius:var(--radius-sm);padding:0.7rem 1rem;font-size:0.85rem;text-align:center;';
    msgEl.innerHTML = '<i class="fa-solid fa-envelope-circle-check" style="color:#2d7a35;"></i> Link enviado! Verifique sua caixa de entrada (e a pasta de spam).';
  }
}

async function resendConfirmEmail() {
  const email = document.getElementById('regEmail')?.value.trim();
  if (!email) return;
  const { error } = await supabase.auth.resend({ type: 'signup', email });
  if (error) showToast('Erro ao reenviar: ' + error.message, 'error');
  else showToast('<i class="fa-solid fa-envelope ic-check"></i> E-mail de confirmação reenviado!');
}

// Handle password recovery redirect
(window.getSupabase?.() || window._db).auth.onAuthStateChange(async (event2, session2) => {
  if (event2 === 'PASSWORD_RECOVERY') {
    setTimeout(() => {
      document.getElementById('authOverlay').classList.add('hidden');
      document.getElementById('appShell').classList.add('visible');
      document.getElementById('appShell').style.display = 'flex';
      openChangePasswordModal();
    }, 500);
  }
});

// ═══════════════════════════════════════
// PATIENT FORM — MISSING FUNCTIONS
// ═══════════════════════════════════════

// Calcula idade a partir da data de nascimento
function cpUpdateAgeFromDob() {
  const dob = document.getElementById('cpDob')?.value;
  if (!dob) return;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  const ageEl = document.getElementById('cpAge');
  if (ageEl) ageEl.value = age >= 0 ? age : '';
}

// Mostra/oculta campos específicos para sexo feminino
function cpToggleFemFields() {
  const sex = document.getElementById('cpSex')?.value;
  const femSection = document.getElementById('cpFemSection');
  if (femSection) {
    femSection.style.display = sex === 'm' ? 'none' : 'block';
  }
}

// Mostra/oculta campos de gestação
function cpTogglePregnancyFields(show) {
  const fields = document.getElementById('cpPregnancyFields');
  if (fields) fields.style.display = show ? 'block' : 'none';
}

// Calcula % de gordura corporal pela fórmula de Deurenberg
// % BF = (1.20 × IMC) + (0.23 × idade) − (10.8 × sexo) − 5.4
// sexo: 1 = masculino, 0 = feminino
function cpCalcBodyFat() {
  const weight = parseFloat(document.getElementById('cpWeight')?.value);
  const height = parseFloat(document.getElementById('cpHeight')?.value);
  const age    = parseInt(document.getElementById('cpAge')?.value);
  const sex    = document.getElementById('cpSex')?.value;

  if (!weight || !height || !age) {
    showToast('Preencha peso, altura e idade para calcular o % de gordura.', 'error');
    return;
  }

  const heightM = height / 100;
  const bmi = weight / (heightM * heightM);
  const sexFactor = sex === 'm' ? 1 : 0;
  const bf = (1.20 * bmi) + (0.23 * age) - (10.8 * sexFactor) - 5.4;
  const bfRounded = Math.max(3, Math.min(60, Math.round(bf * 10) / 10));

  const bfInput = document.getElementById('cpBodyFat');
  if (bfInput) bfInput.value = bfRounded;

  // Classificação de referência
  let classification = '';
  if (sex === 'm') {
    if (bfRounded < 6)       classification = 'Essencial';
    else if (bfRounded < 14) classification = 'Atleta';
    else if (bfRounded < 18) classification = 'Boa forma';
    else if (bfRounded < 25) classification = 'Aceitável';
    else                      classification = 'Obesidade';
  } else {
    if (bfRounded < 14)      classification = 'Essencial';
    else if (bfRounded < 21) classification = 'Atleta';
    else if (bfRounded < 25) classification = 'Boa forma';
    else if (bfRounded < 32) classification = 'Aceitável';
    else                      classification = 'Obesidade';
  }

  showToast(`<i class="fa-solid fa-calculator"></i> % Gordura estimado: ${bfRounded}% — ${classification} (Deurenberg)`);
}

// ═══════════════════════════════════════
// PATIENT FORM — SAVE EXTENDED ANAMNESE
// ═══════════════════════════════════════

// Coleta todos os campos do formulário complexo de cadastro de paciente
function collectPatientAnamneseData() {
  // Doenças gerais (checkboxes)
  const diseasesGeneral = Array.from(
    document.querySelectorAll('#cpDiseasesGeneral input[type=checkbox]:checked')
  ).map(cb => cb.value);

  // Doenças crônicas/autoimunes
  const diseasesChronicAuto = Array.from(
    document.querySelectorAll('#cpDiseasesChronicAuto input[type=checkbox]:checked')
  ).map(cb => cb.value);

  // Histórico familiar
  const familyHistory = [];
  ['cpFamObesidade','cpFamDiabetes','cpFamHipertensao','cpFamDislipidemia','cpFamCancer','cpFamCardio'].forEach(id => {
    if (document.getElementById(id)?.checked) {
      familyHistory.push(id.replace('cpFam','').toLowerCase());
    }
  });

  // Alergias
  const allergies = [];
  ['cpAllergyGluten','cpAllergyLactose','cpAllergyNuts','cpAllergyEgg','cpAllergySeafood','cpAllergySoy'].forEach(id => {
    if (document.getElementById(id)?.checked) {
      allergies.push(id.replace('cpAllergy','').toLowerCase());
    }
  });
  const allergyOther = document.getElementById('cpAllergyOther')?.value.trim();
  if (allergyOther) allergies.push('outro: ' + allergyOther);

  // Radio buttons
  const getRadio = name => document.querySelector(`input[name="${name}"]:checked`)?.value || null;

  return {
    // Dados básicos
    dob:               document.getElementById('cpDob')?.value || null,
    race:              document.getElementById('cpRace')?.value || null,
    phone:             document.getElementById('cpPhone')?.value.trim() || null,
    profession:        document.getElementById('cpProfession')?.value.trim() || null,
    sus_card:          document.getElementById('cpSusCard')?.value.trim() || null,
    education:         document.getElementById('cpEducation')?.value || null,
    income:            document.getElementById('cpIncome')?.value || null,
    household:         parseInt(document.getElementById('cpHousehold')?.value) || null,
    address:           document.getElementById('cpAddress')?.value.trim() || null,
    religion:          document.getElementById('cpReligion')?.value.trim() || null,

    // Antropometria
    weight_usual:      parseFloat(document.getElementById('cpWeightUsual')?.value) || null,
    weight_desired:    parseFloat(document.getElementById('cpWeightDesired')?.value) || null,
    waist_cm:          parseFloat(document.getElementById('cpWaist')?.value) || null,
    hip_cm:            parseFloat(document.getElementById('cpHip')?.value) || null,
    arm_circ_cm:       parseFloat(document.getElementById('cpArmCirc')?.value) || null,
    calf_circ_cm:      parseFloat(document.getElementById('cpCalfCirc')?.value) || null,
    body_fat_pct:      parseFloat(document.getElementById('cpBodyFat')?.value) || null,
    muscle_mass_kg:    parseFloat(document.getElementById('cpMuscleMass')?.value) || null,
    bone_mass_kg:      parseFloat(document.getElementById('cpBoneMass')?.value) || null,
    body_water_pct:    parseFloat(document.getElementById('cpBodyWater')?.value) || null,
    bmr_measured:      parseFloat(document.getElementById('cpBmrMeasured')?.value) || null,

    // Atividade física
    activity_type:     document.getElementById('cpActivityType')?.value.trim() || null,
    activity_freq:     parseInt(document.getElementById('cpActivityFreq')?.value) || null,
    activity_duration: parseInt(document.getElementById('cpActivityDuration')?.value) || null,

    // Histórico clínico
    diseases_general:        diseasesGeneral,
    diseases_chronic_auto:   diseasesChronicAuto,
    diseases_other:          document.getElementById('cpDiseasesOther')?.value.trim() || null,
    family_history:          familyHistory,
    surgeries:               document.getElementById('cpSurgeries')?.value.trim() || null,
    hospitalizations:        document.getElementById('cpHospitalizations')?.value.trim() || null,

    // Medicamentos e suplementos
    medications:       document.getElementById('cpMedications')?.value.trim() || null,
    supplements:       document.getElementById('cpSupplements')?.value.trim() || null,
    sweetener:         getRadio('cpSweetener'),
    sweetener_type:    document.getElementById('cpSweetenerType')?.value.trim() || null,
    smoking:           getRadio('cpSmoking'),
    alcohol:           getRadio('cpAlcohol'),

    // Hábitos alimentares
    water_intake:      document.getElementById('cpWaterIntake')?.value || null,
    eating_time_min:   parseInt(document.getElementById('cpEatingTime')?.value) || null,
    bowel_habit:       document.getElementById('cpBowelHabit')?.value || null,
    meal_location:     document.getElementById('cpMealLocation')?.value || null,
    eating_company:    getRadio('cpEatingCompany'),
    dysphagia:         getRadio('cpDysphagia'),
    heartburn:         getRadio('cpHeartburn'),
    prev_diets:        getRadio('cpPrevDiets'),
    food_aversions:    document.getElementById('cpFoodAversions')?.value.trim() || null,
    food_preferences:  document.getElementById('cpFoodPreferences')?.value.trim() || null,
    allergies,
    oil_month_ml:      parseFloat(document.getElementById('cpOilMonth')?.value) || null,
    sugar_month_g:     parseFloat(document.getElementById('cpSugarMonth')?.value) || null,
    salt_month_g:      parseFloat(document.getElementById('cpSaltMonth')?.value) || null,
    food_meaning:      document.getElementById('cpFoodMeaning')?.value.trim() || null,
    psychological:     document.getElementById('cpPsychological')?.value.trim() || null,

    // Exames laboratoriais
    lab_glucose:       parseFloat(document.getElementById('cpLabGlucose')?.value) || null,
    lab_hba1c:         parseFloat(document.getElementById('cpLabHba1c')?.value) || null,
    lab_chol_total:    parseFloat(document.getElementById('cpLabCholTotal')?.value) || null,
    lab_ldl:           parseFloat(document.getElementById('cpLabLdl')?.value) || null,
    lab_hdl:           parseFloat(document.getElementById('cpLabHdl')?.value) || null,
    lab_tg:            parseFloat(document.getElementById('cpLabTg')?.value) || null,
    lab_creatinine:    parseFloat(document.getElementById('cpLabCreatinine')?.value) || null,
    lab_urea:          parseFloat(document.getElementById('cpLabUrea')?.value) || null,
    lab_tsh:           parseFloat(document.getElementById('cpLabTsh')?.value) || null,
    lab_vit_d:         parseFloat(document.getElementById('cpLabVitD')?.value) || null,
    lab_ferritin:      parseFloat(document.getElementById('cpLabFerritin')?.value) || null,
    lab_hemoglobin:    parseFloat(document.getElementById('cpLabHemoglobin')?.value) || null,
    lab_crp:           parseFloat(document.getElementById('cpLabCrp')?.value) || null,
    lab_insulin:       parseFloat(document.getElementById('cpLabInsulin')?.value) || null,
    lab_other:         document.getElementById('cpLabOther')?.value.trim() || null,
    lab_date:          document.getElementById('cpLabDate')?.value || null,

    // Dados femininos
    menstrual_status:     document.getElementById('cpMenstrualStatus')?.value || null,
    cycle_duration:       parseInt(document.getElementById('cpCycleDuration')?.value) || null,
    period_duration:      parseInt(document.getElementById('cpPeriodDuration')?.value) || null,
    last_period:          document.getElementById('cpLastPeriod')?.value || null,
    menstrual_symptoms:   document.getElementById('cpMenstrualSymptoms')?.value.trim() || null,
    contraceptive:        document.getElementById('cpContraceptive')?.value.trim() || null,
    pregnant:             getRadio('cpPregnant'),
    breastfeeding:        getRadio('cpBreastfeeding'),
    gest_week:            parseInt(document.getElementById('cpGestWeek')?.value) || null,
    dpp:                  document.getElementById('cpDpp')?.value || null,
    prev_pregnancies:     parseInt(document.getElementById('cpPreviousPregnancies')?.value) || null,
    prev_birth_type:      document.getElementById('cpPreviousBirth')?.value || null,
    gest_weight_gain:     parseFloat(document.getElementById('cpGestWeightGain')?.value) || null,
    gest_complications:   document.getElementById('cpGestComplications')?.value.trim() || null,
  };
}

// Override da função createPatientDirect para incluir anamnese completa
const _origCreatePatientDirect = _createPatientDirectBase;
async function createPatientDirect() {
  // Chama a função original — ela cria o usuário e o vínculo
  // Depois salva a anamnese estendida
  const name     = document.getElementById('cpName')?.value.trim();
  const email    = document.getElementById('cpEmail')?.value.trim();
  const password = document.getElementById('cpPassword')?.value;
  const sex      = document.getElementById('cpSex')?.value;
  const age      = parseInt(document.getElementById('cpAge')?.value) || null;
  const weight   = parseFloat(document.getElementById('cpWeight')?.value) || null;
  const height   = parseFloat(document.getElementById('cpHeight')?.value) || null;

  document.getElementById('cpError').style.display = 'none';
  if (!name)     { document.getElementById('cpError').textContent='Informe o nome completo.'; document.getElementById('cpError').style.display='block'; return; }
  if (!email)    { document.getElementById('cpError').textContent='Informe o e-mail.'; document.getElementById('cpError').style.display='block'; return; }
  if (!password) { document.getElementById('cpError').textContent='Defina uma senha temporária.'; document.getElementById('cpError').style.display='block'; return; }
  if (password.length < 6) { document.getElementById('cpError').textContent='A senha deve ter pelo menos 6 caracteres.'; document.getElementById('cpError').style.display='block'; return; }

  showToast('<i class="fa-solid fa-hourglass-half ic-water"></i> Criando paciente...');

  const tempClient = window._createSupabaseClient(window._SUPABASE_URL, window._SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken:false, persistSession:false, detectSessionInUrl:false }
  });

  const { data, error } = await tempClient.auth.signUp({
    email, password,
    options: { data: { name, role:'patient', created_by_nutritionist: currentUser.id, must_change_password:true } }
  });

  if (error) {
    const errEl = document.getElementById('cpError');
    if (error.message?.includes('already registered') || (data?.user?.identities?.length === 0)) {
      errEl.textContent = 'Este e-mail já está cadastrado no sistema.';
    } else {
      errEl.textContent = 'Erro ao criar conta: ' + error.message;
    }
    errEl.style.display = 'block'; return;
  }
  if (data?.user?.identities?.length === 0) {
    document.getElementById('cpError').textContent='Este e-mail já está cadastrado.'; document.getElementById('cpError').style.display='block'; return;
  }

  const patientId = data.user?.id;
  if (!patientId) { document.getElementById('cpError').textContent='Erro inesperado. Tente novamente.'; document.getElementById('cpError').style.display='block'; return; }

  try { await tempClient.auth.signOut(); } catch(e) {}

  // Upload avatar
  let avatarUrl = null;
  if (_cpAvatarFile) {
    const ext = _cpAvatarFile.name.split('.').pop() || 'jpg';
    const path = patientId + '/avatar.' + ext;
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, _cpAvatarFile, { upsert:true, contentType:_cpAvatarFile.type });
    if (!upErr) {
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      avatarUrl = urlData.publicUrl + '?t=' + Date.now();
    }
  }

  // Salva perfil básico
  const { error: profErr } = await supabase.from('profiles').upsert({
    id: patientId, name, email, role:'patient', plan:'pro',
    sex, age, weight, height, avatar_url: avatarUrl,
    nutritionist_id: currentUser.id,
    updated_at: new Date().toISOString()
  }, { onConflict:'id' });

  if (profErr) {
    console.error('[createPatientDirect]', profErr);
    document.getElementById('cpError').textContent = 'Conta criada, mas erro ao salvar perfil: ' + profErr.message;
    document.getElementById('cpError').style.display='block'; return;
  }

  // Vincula ao nutricionista
  const { error: linkErr } = await supabase.from('professional_patients').insert({
    professional_id: currentUser.id, patient_id: patientId
  });
  if (linkErr && linkErr.code !== '23505') {
    console.warn('[createPatientDirect] link error:', linkErr);
  }

  // Calcula e salva meta calórica
  if (sex && age && weight && height) {
    const tmb = sex === 'm'
      ? 88.362 + (13.397*weight) + (4.799*height) - (5.677*age)
      : 447.593 + (9.247*weight) + (3.098*height) - (4.330*age);
    const suggestedGoal = Math.round(tmb * 1.375) + _cpGoalDelta;
    await supabase.from('user_goals').upsert({ user_id:patientId, daily_kcal:suggestedGoal, updated_at:new Date().toISOString() }, { onConflict:'user_id' });
  }

  // Coleta e salva anamnese estendida
  const anamnese = collectPatientAnamneseData();
  if (Object.values(anamnese).some(v => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0))) {
    const { error: anamneseErr } = await supabase.from('patient_anamnese').upsert({
      patient_id: patientId,
      nutritionist_id: currentUser.id,
      ...anamnese,
      updated_at: new Date().toISOString()
    }, { onConflict: 'patient_id' });

    if (anamneseErr) {
      // Tabela pode não existir ainda — log SQL de criação
      if (anamneseErr.code === '42P01' || anamneseErr.message?.includes('patient_anamnese')) {
        console.warn('[CalorIA] Crie a tabela patient_anamnese:\n\nCREATE TABLE patient_anamnese (\n  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,\n  patient_id uuid REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,\n  nutritionist_id uuid REFERENCES profiles(id),\n  -- dados demográficos\n  dob date, race text, phone text, profession text, sus_card text,\n  education text, income text, household int, address text, religion text,\n  -- antropometria\n  weight_usual numeric, weight_desired numeric, waist_cm numeric,\n  hip_cm numeric, arm_circ_cm numeric, calf_circ_cm numeric,\n  body_fat_pct numeric, muscle_mass_kg numeric, bone_mass_kg numeric,\n  body_water_pct numeric, bmr_measured numeric,\n  -- atividade física\n  activity_type text, activity_freq int, activity_duration int,\n  -- histórico clínico\n  diseases_general jsonb DEFAULT \'[]\',\n  diseases_chronic_auto jsonb DEFAULT \'[]\',\n  diseases_other text, family_history jsonb DEFAULT \'[]\',\n  surgeries text, hospitalizations text,\n  -- medicamentos\n  medications text, supplements text, sweetener text, sweetener_type text,\n  smoking text, alcohol text,\n  -- hábitos\n  water_intake text, eating_time_min int, bowel_habit text, meal_location text,\n  eating_company text, dysphagia text, heartburn text, prev_diets text,\n  food_aversions text, food_preferences text, allergies jsonb DEFAULT \'[]\',\n  oil_month_ml numeric, sugar_month_g numeric, salt_month_g numeric,\n  food_meaning text, psychological text,\n  -- exames\n  lab_glucose numeric, lab_hba1c numeric, lab_chol_total numeric,\n  lab_ldl numeric, lab_hdl numeric, lab_tg numeric, lab_creatinine numeric,\n  lab_urea numeric, lab_tsh numeric, lab_vit_d numeric,\n  lab_ferritin numeric, lab_hemoglobin numeric, lab_crp numeric,\n  lab_insulin numeric, lab_other text, lab_date date,\n  -- dados femininos\n  menstrual_status text, cycle_duration int, period_duration int,\n  last_period date, menstrual_symptoms text, contraceptive text,\n  pregnant text, breastfeeding text, gest_week int, dpp date,\n  prev_pregnancies int, prev_birth_type text, gest_weight_gain numeric,\n  gest_complications text,\n  updated_at timestamptz DEFAULT now()\n);\nALTER TABLE patient_anamnese ENABLE ROW LEVEL SECURITY;\nCREATE POLICY "Anamnese access" ON patient_anamnese FOR ALL\n  USING (auth.uid() = patient_id OR auth.uid() = nutritionist_id\n    OR EXISTS (SELECT 1 FROM professional_patients WHERE professional_id = auth.uid() AND patient_id = patient_anamnese.patient_id));');
      } else {
        console.warn('[createPatientDirect] anamnese save error:', anamneseErr);
      }
      // Não bloqueia — dados básicos já foram salvos
    }
  }

  showToast('<i class="fa-solid fa-circle-check ic-check"></i> Paciente cadastrado com sucesso!');
  closeCreatePatientModal();
  loadPatients();
}

// ═══════════════════════════════════════
// PATIENT ANAMNESE — PRINT / PDF
// ═══════════════════════════════════════

// Imprime o formulário de anamnese como PDF para o paciente especificado
async function printPatientAnamnese(patientId, patientName) {
  showToast('<i class="fa-solid fa-hourglass-half ic-water"></i> Preparando anamnese...');

  let anamnese = null;
  let profile = null;
  try {
    const [{ data: a }, { data: p }] = await Promise.all([
      supabase.from('patient_anamnese').select('*').eq('patient_id', patientId).maybeSingle(),
      supabase.from('profiles').select('*').eq('id', patientId).maybeSingle()
    ]);
    anamnese = a;
    profile = p;
  } catch(e) { /* silently continue with empty */ }

  const name   = profile?.name || patientName || '—';
  const age    = profile?.age  || '—';
  const sex    = profile?.sex === 'm' ? 'Masculino' : profile?.sex === 'f' ? 'Feminino' : '—';
  const weight = profile?.weight ? profile.weight + ' kg' : '—';
  const height = profile?.height ? profile.height + ' cm' : '—';
  const bmi    = (profile?.weight && profile?.height)
    ? (profile.weight / ((profile.height/100)**2)).toFixed(1)
    : '—';

  const logoSvg = `<img src="${LOGO_LIGHT_B64}" width="48" height="48" style="border-radius:8px;vertical-align:middle;">`;

  // Helper: formata valor ou traço
  const v = (val, unit='') => (val !== null && val !== undefined && val !== '') ? `${val}${unit}` : '—';
  const arr2str = (arr) => Array.isArray(arr) && arr.length ? arr.join(', ') : '—';

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
  <title>Anamnese Nutricional — ${name}</title>
  <style>
    @media print { body{margin:0} .no-print{display:none!important} section{page-break-inside:avoid} }
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',Arial,sans-serif;max-width:820px;margin:0 auto;padding:28px 24px;color:#1a2e1b;background:#fff;font-size:13px}
    .header{display:flex;align-items:center;gap:12px;border-bottom:3px solid #2a5c30;padding-bottom:14px;margin-bottom:20px}
    .brand{font-size:1.4rem;font-weight:900;color:#2a5c30;letter-spacing:-0.5px}
    .brand span{color:#f5a623}
    h1{font-size:1.4rem;font-weight:900;color:#1a4a1f;margin-bottom:2px}
    .subtitle{font-size:0.78rem;color:#888;margin-bottom:16px}
    section{margin-bottom:18px}
    h3{font-size:0.85rem;font-weight:800;color:#2a5c30;text-transform:uppercase;letter-spacing:0.8px;border-bottom:1.5px solid #e8f5e9;padding-bottom:4px;margin-bottom:10px}
    .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:6px 12px}
    .field{padding:5px 0;border-bottom:1px dotted #ddd}
    .label{font-size:0.7rem;color:#888;text-transform:uppercase;letter-spacing:0.4px;font-weight:700;display:block;margin-bottom:1px}
    .val{font-size:0.88rem;color:#1a2e1b;font-weight:500}
    .val.empty{color:#ccc}
    .tags{display:flex;flex-wrap:wrap;gap:4px;margin-top:2px}
    .tag{background:#e8f5e9;color:#1a4a1f;padding:2px 8px;border-radius:20px;font-size:0.72rem;font-weight:600;border:1px solid #c8e6c9}
    .tag.red{background:#fdecea;color:#c62828;border-color:#f5c6c6}
    .tag.yellow{background:#fff8e1;color:#7a5200;border-color:#ffe082}
    .text-block{font-size:0.88rem;color:#1a2e1b;line-height:1.5;background:#f5f7f5;padding:6px 10px;border-radius:6px;white-space:pre-wrap;border:1px solid #e0e0e0}
    .btn-print{display:block;margin:14px auto 22px;padding:10px 28px;background:#2a5c30;color:white;border:none;border-radius:50px;font-size:0.95rem;font-weight:700;cursor:pointer;font-family:inherit}
    .write-line{border:none;border-bottom:1px solid #ccc;width:100%;margin-bottom:2px;height:20px;display:block}
    .write-block{border:1px solid #ccc;border-radius:4px;width:100%;min-height:48px;display:block;margin-top:2px}
    .footer{margin-top:24px;font-size:0.68rem;color:#aaa;border-top:1px solid #ddd;padding-top:10px;display:flex;justify-content:space-between}
    table{width:100%;border-collapse:collapse;font-size:0.82rem}
    th{background:#e8f5e9;color:#1a4a1f;padding:5px 8px;text-align:left;font-size:0.72rem;text-transform:uppercase;letter-spacing:0.4px}
    td{padding:5px 8px;border-bottom:1px solid #f0f0f0}
    tr:nth-child(even) td{background:#fafbfa}
  </style>
  </head><body>
  <div class="header">
    ${logoSvg}
    <div><div class="brand">Calor<span>IA</span></div><div style="font-size:0.72rem;color:#888;">Plataforma de Nutrição Inteligente</div></div>
  </div>
  <button class="btn-print no-print" onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>
  <h1>Anamnese Nutricional</h1>
  <p class="subtitle">Paciente: <strong>${name}</strong> • Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</p>

  <section>
    <h3>1. Identificação</h3>
    <div class="grid">
      <div class="field"><span class="label">Nome completo</span><span class="val">${v(name)}</span></div>
      <div class="field"><span class="label">Data de Nascimento</span><span class="val">${v(anamnese?.dob ? new Date(anamnese.dob+'T00:00:00').toLocaleDateString('pt-BR') : profile?.age ? '—' : '—')}</span></div>
      <div class="field"><span class="label">Idade</span><span class="val">${v(age)} anos</span></div>
      <div class="field"><span class="label">Sexo</span><span class="val">${v(sex)}</span></div>
      <div class="field"><span class="label">Raça / Etnia</span><span class="val">${v(anamnese?.race)}</span></div>
      <div class="field"><span class="label">Telefone</span><span class="val">${v(anamnese?.phone)}</span></div>
      <div class="field"><span class="label">Profissão</span><span class="val">${v(anamnese?.profession)}</span></div>
      <div class="field"><span class="label">Cartão SUS</span><span class="val">${v(anamnese?.sus_card)}</span></div>
      <div class="field"><span class="label">Escolaridade</span><span class="val">${v(anamnese?.education)}</span></div>
      <div class="field"><span class="label">Renda Familiar</span><span class="val">${v(anamnese?.income)}</span></div>
      <div class="field"><span class="label">Pessoas na residência</span><span class="val">${v(anamnese?.household)}</span></div>
      <div class="field"><span class="label">Religião</span><span class="val">${v(anamnese?.religion)}</span></div>
      <div class="field" style="grid-column:1/-1"><span class="label">Endereço</span><span class="val">${v(anamnese?.address)}</span></div>
    </div>
  </section>

  <section>
    <h3>2. Dados Antropométricos</h3>
    <div class="grid">
      <div class="field"><span class="label">Peso atual</span><span class="val">${v(weight)}</span></div>
      <div class="field"><span class="label">Altura</span><span class="val">${v(height)}</span></div>
      <div class="field"><span class="label">IMC</span><span class="val">${bmi}</span></div>
      <div class="field"><span class="label">Peso habitual</span><span class="val">${v(anamnese?.weight_usual,'kg')}</span></div>
      <div class="field"><span class="label">Peso desejado</span><span class="val">${v(anamnese?.weight_desired,'kg')}</span></div>
      <div class="field"><span class="label">Circ. Abdominal</span><span class="val">${v(anamnese?.waist_cm,'cm')}</span></div>
      <div class="field"><span class="label">Circ. Quadril</span><span class="val">${v(anamnese?.hip_cm,'cm')}</span></div>
      <div class="field"><span class="label">Circ. Braço</span><span class="val">${v(anamnese?.arm_circ_cm,'cm')}</span></div>
      <div class="field"><span class="label">Circ. Panturrilha</span><span class="val">${v(anamnese?.calf_circ_cm,'cm')}</span></div>
      <div class="field"><span class="label">% Gordura corporal</span><span class="val">${v(anamnese?.body_fat_pct,'%')}</span></div>
      <div class="field"><span class="label">Massa muscular</span><span class="val">${v(anamnese?.muscle_mass_kg,'kg')}</span></div>
      <div class="field"><span class="label">Massa óssea</span><span class="val">${v(anamnese?.bone_mass_kg,'kg')}</span></div>
      <div class="field"><span class="label">Água corporal</span><span class="val">${v(anamnese?.body_water_pct,'%')}</span></div>
      <div class="field"><span class="label">TMB medida</span><span class="val">${v(anamnese?.bmr_measured,'kcal')}</span></div>
    </div>
  </section>

  <section>
    <h3>3. Objetivo e Atividade Física</h3>
    <div class="grid">
      <div class="field"><span class="label">Tipo de atividade</span><span class="val">${v(anamnese?.activity_type)}</span></div>
      <div class="field"><span class="label">Frequência</span><span class="val">${v(anamnese?.activity_freq,'x/sem')}</span></div>
      <div class="field"><span class="label">Duração/sessão</span><span class="val">${v(anamnese?.activity_duration,'min')}</span></div>
    </div>
  </section>

  <section>
    <h3>4. Histórico Clínico</h3>
    <div class="field" style="margin-bottom:8px">
      <span class="label">Doenças gerais</span>
      <div class="tags">${arr2str(anamnese?.diseases_general) !== '—' ? (anamnese.diseases_general||[]).map(d=>`<span class="tag red">${d}</span>`).join('') : '<span class="val empty">Nenhuma informada</span>'}</div>
    </div>
    <div class="field" style="margin-bottom:8px">
      <span class="label">Doenças crônicas / autoimunes</span>
      <div class="tags">${arr2str(anamnese?.diseases_chronic_auto) !== '—' ? (anamnese.diseases_chronic_auto||[]).map(d=>`<span class="tag red">${d}</span>`).join('') : '<span class="val empty">Nenhuma informada</span>'}</div>
    </div>
    <div class="field" style="margin-bottom:8px">
      <span class="label">Outras condições</span>
      <div class="text-block">${v(anamnese?.diseases_other)}</div>
    </div>
    <div class="field" style="margin-bottom:8px">
      <span class="label">Histórico familiar</span>
      <div class="tags">${arr2str(anamnese?.family_history) !== '—' ? (anamnese.family_history||[]).map(d=>`<span class="tag yellow">${d}</span>`).join('') : '<span class="val empty">Não informado</span>'}</div>
    </div>
    <div class="grid">
      <div class="field"><span class="label">Cirurgias</span><span class="val">${v(anamnese?.surgeries)}</span></div>
      <div class="field"><span class="label">Internações</span><span class="val">${v(anamnese?.hospitalizations)}</span></div>
    </div>
  </section>

  <section>
    <h3>5. Medicamentos e Suplementos</h3>
    <div class="field" style="margin-bottom:8px"><span class="label">Medicamentos</span><div class="text-block">${v(anamnese?.medications)}</div></div>
    <div class="field" style="margin-bottom:8px"><span class="label">Suplementos</span><div class="text-block">${v(anamnese?.supplements)}</div></div>
    <div class="grid">
      <div class="field"><span class="label">Adoçante</span><span class="val">${v(anamnese?.sweetener)} ${anamnese?.sweetener_type ? '('+anamnese.sweetener_type+')':''}</span></div>
      <div class="field"><span class="label">Tabagismo</span><span class="val">${v(anamnese?.smoking)}</span></div>
      <div class="field"><span class="label">Etilismo</span><span class="val">${v(anamnese?.alcohol)}</span></div>
    </div>
  </section>

  <section>
    <h3>6. Hábitos Alimentares</h3>
    <div class="grid">
      <div class="field"><span class="label">Ingestão hídrica</span><span class="val">${v(anamnese?.water_intake)}</span></div>
      <div class="field"><span class="label">Tempo p/ se alimentar</span><span class="val">${v(anamnese?.eating_time_min,'min')}</span></div>
      <div class="field"><span class="label">Hábito intestinal</span><span class="val">${v(anamnese?.bowel_habit)}</span></div>
      <div class="field"><span class="label">Local das refeições</span><span class="val">${v(anamnese?.meal_location)}</span></div>
      <div class="field"><span class="label">Come</span><span class="val">${v(anamnese?.eating_company)}</span></div>
      <div class="field"><span class="label">Disfagia</span><span class="val">${v(anamnese?.dysphagia)}</span></div>
      <div class="field"><span class="label">Pirose (azia)</span><span class="val">${v(anamnese?.heartburn)}</span></div>
      <div class="field"><span class="label">Dietas anteriores</span><span class="val">${v(anamnese?.prev_diets)}</span></div>
      <div class="field"><span class="label">Óleo/mês</span><span class="val">${v(anamnese?.oil_month_ml,'mL')}</span></div>
      <div class="field"><span class="label">Açúcar/mês</span><span class="val">${v(anamnese?.sugar_month_g,'g')}</span></div>
      <div class="field"><span class="label">Sal/mês</span><span class="val">${v(anamnese?.salt_month_g,'g')}</span></div>
    </div>
    <div class="field" style="margin-top:6px"><span class="label">Alergias / Intolerâncias</span>
      <div class="tags">${(anamnese?.allergies||[]).length ? anamnese.allergies.map(a=>`<span class="tag red">${a}</span>`).join('') : '<span class="val empty">Nenhuma informada</span>'}</div>
    </div>
    <div class="field" style="margin-top:6px"><span class="label">Aversões alimentares</span><div class="text-block">${v(anamnese?.food_aversions)}</div></div>
    <div class="field" style="margin-top:6px"><span class="label">Preferências alimentares</span><div class="text-block">${v(anamnese?.food_preferences)}</div></div>
    <div class="field" style="margin-top:6px"><span class="label">Significado do alimento</span><div class="text-block">${v(anamnese?.food_meaning)}</div></div>
    <div class="field" style="margin-top:6px"><span class="label">Aspectos psicológicos</span><div class="text-block">${v(anamnese?.psychological)}</div></div>
  </section>

  <section>
    <h3>7. Exames Laboratoriais ${anamnese?.lab_date ? '— '+new Date(anamnese.lab_date+'T00:00:00').toLocaleDateString('pt-BR') : ''}</h3>
    <table>
      <thead><tr><th>Exame</th><th>Resultado</th><th>Referência</th><th>Exame</th><th>Resultado</th><th>Referência</th></tr></thead>
      <tbody>
        <tr><td>Glicemia jejum</td><td>${v(anamnese?.lab_glucose,'mg/dL')}</td><td>70–99</td><td>Colesterol total</td><td>${v(anamnese?.lab_chol_total,'mg/dL')}</td><td>&lt;200</td></tr>
        <tr><td>HbA1c</td><td>${v(anamnese?.lab_hba1c,'%')}</td><td>&lt;5.7%</td><td>LDL</td><td>${v(anamnese?.lab_ldl,'mg/dL')}</td><td>&lt;130</td></tr>
        <tr><td>Insulina jejum</td><td>${v(anamnese?.lab_insulin,'µUI/mL')}</td><td>&lt;25</td><td>HDL</td><td>${v(anamnese?.lab_hdl,'mg/dL')}</td><td>H:&gt;40 M:&gt;50</td></tr>
        <tr><td>TSH</td><td>${v(anamnese?.lab_tsh,'mUI/L')}</td><td>0.4–4.0</td><td>Triglicerídeos</td><td>${v(anamnese?.lab_tg,'mg/dL')}</td><td>&lt;150</td></tr>
        <tr><td>Creatinina</td><td>${v(anamnese?.lab_creatinine,'mg/dL')}</td><td>H:0.7–1.2 M:0.5–1.1</td><td>Ureia</td><td>${v(anamnese?.lab_urea,'mg/dL')}</td><td>15–45</td></tr>
        <tr><td>Vitamina D</td><td>${v(anamnese?.lab_vit_d,'ng/mL')}</td><td>30–100</td><td>Ferritina</td><td>${v(anamnese?.lab_ferritin,'ng/mL')}</td><td>H:30–400 M:13–150</td></tr>
        <tr><td>Hemoglobina</td><td>${v(anamnese?.lab_hemoglobin,'g/dL')}</td><td>H:13.5–17.5 M:12–15.5</td><td>PCR</td><td>${v(anamnese?.lab_crp,'mg/L')}</td><td>&lt;3.0</td></tr>
      </tbody>
    </table>
    ${anamnese?.lab_other ? `<div class="field" style="margin-top:8px"><span class="label">Outros exames</span><div class="text-block">${anamnese.lab_other}</div></div>` : ''}
  </section>

  ${sex !== 'Masculino' ? `
  <section>
    <h3>8. Dados Ginecológicos e Obstétricos</h3>
    <div class="grid">
      <div class="field"><span class="label">Status menstrual</span><span class="val">${v(anamnese?.menstrual_status)}</span></div>
      <div class="field"><span class="label">Duração ciclo</span><span class="val">${v(anamnese?.cycle_duration,'dias')}</span></div>
      <div class="field"><span class="label">Duração menstruação</span><span class="val">${v(anamnese?.period_duration,'dias')}</span></div>
      <div class="field"><span class="label">DUM</span><span class="val">${v(anamnese?.last_period ? new Date(anamnese.last_period+'T00:00:00').toLocaleDateString('pt-BR') : null)}</span></div>
      <div class="field"><span class="label">Anticoncepcional/TRH</span><span class="val">${v(anamnese?.contraceptive)}</span></div>
      <div class="field"><span class="label">Gestante</span><span class="val">${v(anamnese?.pregnant)}</span></div>
      <div class="field"><span class="label">Amamentando</span><span class="val">${v(anamnese?.breastfeeding)}</span></div>
      ${anamnese?.pregnant === 'sim' ? `
      <div class="field"><span class="label">Semana gestacional</span><span class="val">${v(anamnese?.gest_week)}</span></div>
      <div class="field"><span class="label">DPP</span><span class="val">${v(anamnese?.dpp ? new Date(anamnese.dpp+'T00:00:00').toLocaleDateString('pt-BR') : null)}</span></div>
      <div class="field"><span class="label">Gestações anteriores</span><span class="val">${v(anamnese?.prev_pregnancies)}</span></div>
      <div class="field"><span class="label">Ganho de peso gest.</span><span class="val">${v(anamnese?.gest_weight_gain,'kg')}</span></div>
      ` : ''}
    </div>
    ${anamnese?.menstrual_symptoms ? `<div class="field" style="margin-top:6px"><span class="label">Sintomas do ciclo</span><div class="text-block">${anamnese.menstrual_symptoms}</div></div>` : ''}
    ${anamnese?.gest_complications ? `<div class="field" style="margin-top:6px"><span class="label">Intercorrências gestacionais</span><div class="text-block">${anamnese.gest_complications}</div></div>` : ''}
  </section>` : ''}

  <section>
    <h3>Diagnóstico Nutricional e Plano</h3>
    <div class="grid">
      <div class="field"><span class="label">TMB</span><span class="write-line"></span></div>
      <div class="field"><span class="label">VET</span><span class="write-line"></span></div>
      <div class="field"><span class="label">Objetivo</span><span class="write-line"></span></div>
      <div class="field"><span class="label">Plano Alimentar</span><span class="write-line"></span></div>
    </div>
    <div style="margin-top:8px"><span class="label">Relatório / Observações</span><span class="write-block"></span></div>
  </section>

  <div class="footer">
    <span>Gerado pelo CalorIA — ${new Date().toLocaleDateString('pt-BR')}</span>
    <span>🔒 Documento protegido pela LGPD (Lei 13.709/2018)</span>
  </div>
  <script>window.onload=function(){window.print();}<\/script>
  </body></html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (!win) {
    const a = document.createElement('a');
    a.href = url; a.download = 'anamnese_' + name.replace(/\s+/g,'_') + '.html';
    a.click();
  }
  setTimeout(() => URL.revokeObjectURL(url), 15000);
  showToast('<i class="fa-solid fa-file-pdf ic-alert"></i> Abrindo anamnese para salvar como PDF!');
}

// Bloco de wrappers removido — lógica de scroll integrada diretamente
// em toggleNutritionPanel() e botão de anamnese já incluído em loadPatients()

// ═══════════════════════════════════════
// MELHORIA 3: % GORDURA CORPORAL NO PERFIL DO USUÁRIO
// ═══════════════════════════════════════

function profileUpdateAgeFromDob() {
  const dob = document.getElementById('profileDob')?.value;
  if (!dob) return;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  const ageEl = document.getElementById('profileAge');
  if (ageEl && age >= 0) ageEl.value = age;
}

// Detecta o estágio de vida do usuário no painel de perfil (Feature 4 — versão perfil)
function profileDetectLifeStage() {
  const dob = document.getElementById('profileDob')?.value;
  const sex = document.getElementById('profileSex')?.value;
  const panel = document.getElementById('profilePatientTypePanel');
  const content = document.getElementById('profilePatientTypeContent');
  if (!panel || !content) return;
  if (!dob) { panel.style.display = 'none'; return; }

  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  if (age < 0 || age > 120) { panel.style.display = 'none'; return; }

  // Reutiliza a lógica de cpDetectPatientType, mas popula o painel do perfil
  let lifeStage = '', stageColor = '#2a5c30', recommendations = [];
  if (age < 2)        { lifeStage = '👶 Lactente (0–2 anos)'; stageColor='#1565c0'; recommendations=['Acompanhar curva de crescimento OMS','Aleitamento materno / fórmula infantil','Vitamina D profilática']; }
  else if (age < 6)   { lifeStage = '🧒 Pré-escolar (2–5 anos)'; stageColor='#1b5e20'; recommendations=['Formação de hábitos alimentares saudáveis','Diversificação da dieta','Prevenir anemia ferropriva']; }
  else if (age < 10)  { lifeStage = '🎒 Escolar (6–9 anos)'; stageColor='#1b5e20'; recommendations=['Café da manhã obrigatório','Reduzir ultraprocessados','Incentivar atividade física']; }
  else if (age < 13)  { lifeStage = '🌱 Pré-adolescente (10–12 anos)'; stageColor='#4a148c'; recommendations=['Monitorar início da puberdade','Cálcio e ferro essenciais','Avaliar imagem corporal']; }
  else if (age < 20)  { lifeStage = '🧑 Adolescente (13–19 anos)'; stageColor='#4a148c'; recommendations=['Alta demanda calórica — pico de crescimento','Risco de transtornos alimentares','Anemia ferropriva comum em meninas']; }
  else if (age < 30)  { lifeStage = '💪 Adulto jovem (20–29 anos)'; stageColor='#1b5e20'; recommendations=['Estabelecer hábitos duradouros','Avaliar composição corporal','Gestão do peso e estilo de vida']; }
  else if (age < 40)  { lifeStage = '🏃 Adulto (30–39 anos)'; stageColor='#1b5e20'; recommendations=['Prevenção de doenças crônicas','Exames periódicos','Equilíbrio trabalho e alimentação']; }
  else if (age < 50)  { lifeStage = '⚖️ Adulto maduro (40–49 anos)'; stageColor='#e65100'; recommendations=['Rastreio de DM2, HAS e dislipidemia','Manutenção de massa muscular','Saúde cardiovascular']; }
  else if (age < 60)  { lifeStage = '🌿 Meia-idade (50–59 anos)'; stageColor='#bf360c'; recommendations=['Gestão de doenças crônicas','Menopausa/andropausa — ajuste calórico','Osteoporose: cálcio e vitamina D']; }
  else if (age < 70)  { lifeStage = '🌼 Idoso jovem (60–69 anos)'; stageColor='#4e342e'; recommendations=['Prevenção de sarcopenia e desnutrição','Mini Avaliação Nutricional (MAN)','Hidratação adequada']; }
  else if (age < 80)  { lifeStage = '👴 Idoso (70–79 anos)'; stageColor='#4e342e'; recommendations=['Adaptação de textura dos alimentos','Monitorar deglutição (disfagia)','Suplementação proteica e vitamina D']; }
  else                { lifeStage = '🌟 Idoso muito idoso (80+ anos)'; stageColor='#37474f'; recommendations=['Qualidade de vida como prioridade','Risco máximo de desnutrição','Texture Modified Diet se necessário']; }

  let sexNote = '';
  if (sex === 'f' && age >= 12 && age < 55) sexNote = '<div style="margin-top:0.5rem;font-size:0.78rem;color:#880e4f;"><i class="fa-solid fa-venus"></i> Atenção especial: saúde reprodutiva, ciclo menstrual e ferro</div>';
  else if (sex === 'f' && age >= 45) sexNote = '<div style="margin-top:0.5rem;font-size:0.78rem;color:#4a148c;"><i class="fa-solid fa-venus"></i> Atenção especial: perimenopausa/menopausa, osteoporose</div>';
  else if (sex === 'm' && age >= 45) sexNote = '<div style="margin-top:0.5rem;font-size:0.78rem;color:#0d47a1;"><i class="fa-solid fa-mars"></i> Atenção especial: saúde cardiovascular e risco metabólico</div>';

  content.innerHTML = `
    <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;flex-wrap:wrap;">
      <span style="font-size:0.85rem;font-weight:700;color:${stageColor};">${lifeStage}</span>
      <span style="font-size:0.72rem;color:var(--text-muted);">— ${age} anos</span>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:0.35rem;margin-bottom:0.35rem;">
      ${recommendations.map(r=>`<span style="font-size:0.75rem;background:white;border:1px solid ${stageColor}30;color:${stageColor};border-radius:50px;padding:2px 10px;font-weight:600;">${r}</span>`).join('')}
    </div>
    ${sexNote}
  `;
  panel.style.display = 'block';
}

function profileCalcBodyFat() {
  const weight = parseFloat(document.getElementById('profileWeight')?.value);
  const height = parseFloat(document.getElementById('profileHeight')?.value);
  const age    = parseInt(document.getElementById('profileAge')?.value);
  const sex    = document.getElementById('profileSex')?.value;
  if (!weight || !height || !age) {
    showToast('Preencha peso, altura e idade para calcular o % de gordura.', 'error');
    return;
  }
  const heightM = height / 100;
  const bmi = weight / (heightM * heightM);
  const sexFactor = sex === 'm' ? 1 : 0;
  const bf = (1.20 * bmi) + (0.23 * age) - (10.8 * sexFactor) - 5.4;
  const bfRounded = Math.max(3, Math.min(60, Math.round(bf * 10) / 10));
  const bfEl = document.getElementById('profileBodyFat');
  if (bfEl) { bfEl.value = bfRounded; profileUpdateFatClassification(); }
  showToast('<i class="fa-solid fa-calculator"></i> % Gordura calculado pela fórmula de Deurenberg!');
}

function profileUpdateFatClassification() {
  const bfEl = document.getElementById('profileBodyFat');
  const classEl = document.getElementById('profileFatClassification');
  const sex = document.getElementById('profileSex')?.value;
  if (!bfEl || !classEl) return;
  const val = parseFloat(bfEl.value);
  if (isNaN(val) || val <= 0) { classEl.style.display = 'none'; return; }

  let label = '', color = '', bg = '', icon = '';
  if (sex === 'm') {
    if (val < 6)        { label = 'Gordura essencial'; color = '#1565c0'; bg = '#e3f2fd'; icon = '⚡'; }
    else if (val < 14)  { label = 'Nível de atleta'; color = '#2e7d32'; bg = '#e8f5e9'; icon = '🏆'; }
    else if (val < 18)  { label = 'Boa forma física'; color = '#388e3c'; bg = '#f1f8e9'; icon = '✅'; }
    else if (val < 25)  { label = 'Aceitável'; color = '#f57f17'; bg = '#fff8e1'; icon = '⚠️'; }
    else if (val < 30)  { label = 'Excesso de gordura'; color = '#e65100'; bg = '#fff3e0'; icon = '⚠️'; }
    else                { label = 'Obesidade'; color = '#c62828'; bg = '#fdecea'; icon = '🔴'; }
  } else {
    if (val < 14)       { label = 'Gordura essencial'; color = '#1565c0'; bg = '#e3f2fd'; icon = '⚡'; }
    else if (val < 21)  { label = 'Nível de atleta'; color = '#2e7d32'; bg = '#e8f5e9'; icon = '🏆'; }
    else if (val < 25)  { label = 'Boa forma física'; color = '#388e3c'; bg = '#f1f8e9'; icon = '✅'; }
    else if (val < 32)  { label = 'Aceitável'; color = '#f57f17'; bg = '#fff8e1'; icon = '⚠️'; }
    else if (val < 38)  { label = 'Excesso de gordura'; color = '#e65100'; bg = '#fff3e0'; icon = '⚠️'; }
    else                { label = 'Obesidade'; color = '#c62828'; bg = '#fdecea'; icon = '🔴'; }
  }
  classEl.style.cssText = `display:block;background:${bg};color:${color};border:1px solid ${color}40;border-radius:var(--radius-sm);padding:0.4rem 0.75rem;font-size:0.78rem;font-weight:700;`;
  classEl.innerHTML = `${icon} ${val}% — ${label}`;
}

// ═══════════════════════════════════════
// MELHORIA 4: CLASSIFICAÇÃO DE TIPO DE PACIENTE POR DATA DE NASCIMENTO
// ═══════════════════════════════════════

function cpDetectPatientType() {
  const dob = document.getElementById('cpDob')?.value;
  const sex = document.getElementById('cpSex')?.value;
  const panel = document.getElementById('cpPatientTypePanel');
  const badge = document.getElementById('cpPatientTypeBadge');
  const content = document.getElementById('cpPatientTypeContent');
  if (!panel || !dob) { if(panel) panel.style.display='none'; return; }

  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;

  if (age < 0 || age > 120) { panel.style.display='none'; return; }

  // Determinar ciclo de vida
  let lifeStage = '', stageColor = '', stageBg = '', recommendations = [], prontuarioFocus = [];
  if (age < 2) {
    lifeStage = '👶 Lactente (0–2 anos)';
    stageColor = '#1565c0'; stageBg = '#e3f2fd';
    recommendations = ['Aleitamento materno / fórmula infantil', 'Introdução alimentar após 6 meses', 'Monitorar ganho de peso e comprimento', 'Vitamina D profilática'];
    prontuarioFocus = ['Curva de crescimento OMS', 'Aleitamento materno', 'Introdução alimentar', 'Desenvolvimento neuromotor'];
  } else if (age < 6) {
    lifeStage = '🧒 Pré-escolar (2–5 anos)';
    stageColor = '#1b5e20'; stageBg = '#e8f5e9';
    recommendations = ['Formação de hábitos alimentares saudáveis', 'Diversificação da dieta', 'Monitorar crescimento e IMC/idade', 'Prevenção de deficiências de ferro e vitamina D'];
    prontuarioFocus = ['Curva de crescimento', 'IMC/idade', 'Neofobia alimentar', 'Hábitos familiares'];
  } else if (age < 10) {
    lifeStage = '🎒 Escolar (6–9 anos)';
    stageColor = '#1b5e20'; stageBg = '#f1f8e9';
    recommendations = ['Café da manhã obrigatório', 'Reduzir ultraprocessados', 'Incentivar atividade física', 'Avaliar merenda escolar'];
    prontuarioFocus = ['Alimentação escolar', 'IMC/idade', 'Atividade física', 'Hábitos familiares'];
  } else if (age < 13) {
    lifeStage = '🌱 Pré-adolescente (10–12 anos)';
    stageColor = '#4a148c'; stageBg = '#ede7f6';
    recommendations = ['Monitorar início da puberdade', 'Calcário e ferro essenciais', 'Avaliar imagem corporal', 'Hábitos alimentares na família'];
    prontuarioFocus = ['Estágio de Tanner', 'Cálcio e ferro', 'Imagem corporal', 'Hábitos na escola'];
  } else if (age < 20) {
    lifeStage = '🧑 Adolescente (13–19 anos)';
    stageColor = '#4a148c'; stageBg = '#f3e5f5';
    recommendations = ['Pico de crescimento e demanda calórica alta', 'Risco de transtornos alimentares', 'Anemia ferropriva comum', 'Saúde mental e imagem corporal'];
    prontuarioFocus = ['Estágio de Tanner', 'Saúde mental', 'Imagem corporal', 'Atividade física', 'Gestação precoce (se feminino)'];
  } else if (age < 30) {
    lifeStage = '💪 Adulto jovem (20–29 anos)';
    stageColor = '#1b5e20'; stageBg = '#e8f5e9';
    recommendations = ['Estabelecer hábitos duradouros', 'Avaliar composição corporal', 'Gestão do peso universitário / trabalho', 'Planejamento familiar (feminino)'];
    prontuarioFocus = ['IMC e composição corporal', 'Estilo de vida', 'Saúde reprodutiva'];
  } else if (age < 40) {
    lifeStage = '🏃 Adulto (30–39 anos)';
    stageColor = '#1b5e20'; stageBg = '#f1f8e9';
    recommendations = ['Prevenção de doenças crônicas', 'Avaliar exames periódicos', 'Equilíbrio entre trabalho e alimentação', 'Risco metabólico crescente'];
    prontuarioFocus = ['Exames bioquímicos', 'Risco metabólico', 'Composição corporal'];
  } else if (age < 50) {
    lifeStage = '⚖️ Adulto maduro (40–49 anos)';
    stageColor = '#e65100'; stageBg = '#fff3e0';
    recommendations = ['Rastreio de DM2, HAS, dislipidemia', 'Perimenopausa (feminino) — ajuste calórico', 'Manutenção de massa muscular', 'Saúde cardiovascular'];
    prontuarioFocus = ['Risco cardiovascular', 'Glicemia', 'Massa muscular', 'Perimenopausa (F)'];
  } else if (age < 60) {
    lifeStage = '🌿 Meia-idade (50–59 anos)';
    stageColor = '#bf360c'; stageBg = '#fbe9e7';
    recommendations = ['Gestão de doenças crônicas estabelecidas', 'Menopausa / andropausa', 'Osteoporose: cálcio e vit. D', 'Sarcopenia: proteína e exercício'];
    prontuarioFocus = ['Osteoporose', 'Sarcopenia', 'DM2/HAS', 'Menopausa', 'Saúde cardiovascular'];
  } else if (age < 70) {
    lifeStage = '🌼 Idoso jovem (60–69 anos)';
    stageColor = '#4e342e'; stageBg = '#efebe9';
    recommendations = ['Desnutrição e sarcopenia como prioridade', 'Mini Avaliação Nutricional (MAN)', 'Ajuste de medicamentos com alimentação', 'Hidratação adequada'];
    prontuarioFocus = ['Mini Avaliação Nutricional', 'Sarcopenia', 'Polifarmácia', 'Capacidade mastigatória', 'Autonomia'];
  } else if (age < 80) {
    lifeStage = '👴 Idoso (70–79 anos)';
    stageColor = '#4e342e'; stageBg = '#f5f5f5';
    recommendations = ['Risco de desnutrição elevado', 'Adaptação de textura', 'Monitorar deglutição (disfagia)', 'Suplementação proteica', 'Avaliação funcional'];
    prontuarioFocus = ['Mini Avaliação Nutricional', 'Disfagia', 'Adaptação de textura', 'Autonomia funcional', 'Suporte familiar'];
  } else {
    lifeStage = '🌟 Idoso muito idoso (80+ anos)';
    stageColor = '#37474f'; stageBg = '#eceff1';
    recommendations = ['Cuidados paliativos se aplicável', 'Risco máximo de desnutrição', 'Texture Modified Diet', 'Suporte nutricional enteral se necessário', 'Qualidade de vida como prioridade'];
    prontuarioFocus = ['Avaliação paliativa', 'Disfagia grave', 'Suporte enteral/parenteral', 'Qualidade de vida'];
  }

  // Considerações específicas por sexo
  let sexNote = '';
  if (sex === 'f' && age >= 12 && age < 55) sexNote = '<div style="margin-top:0.4rem;padding:0.3rem 0.6rem;background:rgba(233,30,99,0.08);border-radius:6px;font-size:0.78rem;color:#880e4f;"><i class="fa-solid fa-venus"></i> Atenção: saúde reprodutiva, ciclo menstrual e ferro</div>';
  else if (sex === 'f' && age >= 45) sexNote = '<div style="margin-top:0.4rem;padding:0.3rem 0.6rem;background:rgba(156,39,176,0.08);border-radius:6px;font-size:0.78rem;color:#4a148c;"><i class="fa-solid fa-venus"></i> Atenção: perimenopausa/menopausa, osteoporose e saúde cardiovascular</div>';
  else if (sex === 'm' && age >= 45) sexNote = '<div style="margin-top:0.4rem;padding:0.3rem 0.6rem;background:rgba(25,118,210,0.08);border-radius:6px;font-size:0.78rem;color:#0d47a1;"><i class="fa-solid fa-mars"></i> Atenção: andropausa, risco cardiovascular e próstata</div>';

  badge.textContent = lifeStage;
  badge.style.background = stageColor;
  content.innerHTML = `
    <div style="display:flex;flex-wrap:wrap;gap:0.4rem;margin-bottom:0.5rem;">
      ${recommendations.map(r => `<span style="font-size:0.75rem;background:white;border:1px solid ${stageColor}40;color:${stageColor};border-radius:50px;padding:2px 9px;font-weight:600;">${r}</span>`).join('')}
    </div>
    <div style="font-size:0.78rem;color:var(--text-muted);font-family:'Syne',sans-serif;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:0.3rem;">Foco do Prontuário:</div>
    <div style="display:flex;flex-wrap:wrap;gap:0.3rem;">
      ${prontuarioFocus.map(f => `<span style="font-size:0.72rem;background:${stageBg};color:${stageColor};border:1px solid ${stageColor}30;border-radius:50px;padding:2px 8px;font-weight:600;">${f}</span>`).join('')}
    </div>
    ${sexNote}
  `;
  panel.style.display = 'block';

  // Store current patient type for use in disease form suggestions
  panel.dataset.age = age;
  panel.dataset.lifeStage = lifeStage;
}

// ═══════════════════════════════════════
// MELHORIA 5: FORMULÁRIOS ESPECÍFICOS POR DOENÇA (IA)
// ═══════════════════════════════════════

const _diseaseFormState = { disease: null, patientId: null, patientName: null, formData: {} };

// Called when diseases are checked in the create patient form
function cpCheckDiseaseFormSuggestions() {
  const checked = Array.from(document.querySelectorAll('#cpDiseasesGeneral input:checked, #cpDiseasesChronicAuto input:checked')).map(cb => cb.value);
  const suggDiv = document.getElementById('cpDiseaseFormSuggestions');
  const listDiv = document.getElementById('cpDiseaseFormList');
  if (!suggDiv || !listDiv) return;

  const diseaseFormMap = {
    'diabetes_t2':    { label: '📋 Diabetes T2',        key: 'diabetes_t2',     name: 'Diabetes Tipo 2' },
    'diabetes_t1':    { label: '📋 Diabetes T1',        key: 'diabetes_t1',     name: 'Diabetes Tipo 1' },
    'hipertensao':    { label: '📋 Hipertensão',        key: 'hipertensao',     name: 'Hipertensão Arterial' },
    'obesidade':      { label: '📋 Obesidade',          key: 'obesidade',       name: 'Obesidade' },
    'dislipidemia':   { label: '📋 Dislipidemia',       key: 'dislipidemia',    name: 'Dislipidemia' },
    'insuf_renal':    { label: '📋 Doença Renal',       key: 'insuf_renal',     name: 'Insuficiência Renal' },
    'celiaquia':      { label: '📋 Doença Celíaca',     key: 'celiaquia',       name: 'Doença Celíaca' },
    'crohn':          { label: '📋 Crohn/Retocolite',   key: 'crohn',           name: 'Doença de Crohn / Retocolite' },
    'retocolite':     { label: '📋 Crohn/Retocolite',   key: 'crohn',           name: 'Doença de Crohn / Retocolite' },
    'sop':            { label: '📋 SOP',                key: 'sop',             name: 'Síndrome do Ovário Policístico' },
    'cancer':         { label: '📋 Oncologia',          key: 'cancer',          name: 'Oncologia Nutricional' },
    'steatose':       { label: '📋 Esteatose Hepática', key: 'steatose',        name: 'Esteatose Hepática' },
    'hipotireoidismo':{ label: '📋 Hipotireoidismo',    key: 'hipotireoidismo', name: 'Hipotireoidismo' },
    'sarcopenia':     { label: '📋 Sarcopenia',         key: 'sarcopenia',      name: 'Sarcopenia' },
    'anemia':         { label: '📋 Anemia',             key: 'anemia',          name: 'Anemia' },
  };

  const relevant = checked.filter(d => diseaseFormMap[d]);
  if (!relevant.length) { suggDiv.style.display = 'none'; return; }

  // Deduplicate (crohn/retocolite → same form)
  const seen = new Set();
  listDiv.innerHTML = '';
  relevant.forEach(d => {
    const entry = diseaseFormMap[d];
    if (seen.has(entry.key)) return;
    seen.add(entry.key);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.style.cssText = 'background:white;border:1px solid var(--green-mid);color:var(--green-deep);border-radius:50px;padding:0.3rem 0.8rem;font-size:0.75rem;font-family:"Syne",sans-serif;font-weight:700;cursor:pointer;transition:all 0.15s;';
    btn.innerHTML = entry.label;
    const capturedKey = entry.key, capturedName = entry.name;
    btn.onclick = function() { openDiseaseForm(capturedKey, capturedName); };
    btn.onmouseover = () => { btn.style.background = 'var(--green-pale)'; };
    btn.onmouseout = () => { btn.style.background = 'white'; };
    listDiv.appendChild(btn);
  });
  suggDiv.style.display = 'block';
}

// Attach disease checkbox listeners when modal opens
function attachDiseaseCheckboxListeners() {
  const checkboxes = document.querySelectorAll('#cpDiseasesGeneral input[type=checkbox], #cpDiseasesChronicAuto input[type=checkbox]');
  checkboxes.forEach(cb => {
    cb.removeEventListener('change', cpCheckDiseaseFormSuggestions);
    cb.addEventListener('change', cpCheckDiseaseFormSuggestions);
  });
}

// NOTE: openCreatePatientModal already attaches disease listeners directly (via attachDiseaseCheckboxListeners).
// No additional event delegation needed here.

// Static disease-specific question banks
const _diseaseQuestionBanks = {
  diabetes_t2: {
    title: 'Diabetes Tipo 2 — Avaliação Específica',
    sections: [
      { title: 'Controle Glicêmico', questions: [
        { id: 'dm_tempo_diagnostico', label: 'Tempo desde o diagnóstico (anos)', type: 'number', ph: 'Ex: 5' },
        { id: 'dm_glicemia_jejum_atual', label: 'Glicemia de jejum atual (mg/dL)', type: 'number', ph: 'Ex: 130' },
        { id: 'dm_hba1c_atual', label: 'HbA1c mais recente (%)', type: 'number', ph: 'Ex: 7.2', step: '0.1' },
        { id: 'dm_monitoramento', label: 'Realiza monitoramento glicêmico em casa?', type: 'select', options: ['Não','Sim — esporádico','Sim — diariamente','Sim — múltiplas vezes/dia'] },
        { id: 'dm_hipoglicemia', label: 'Episódios de hipoglicemia?', type: 'select', options: ['Nunca','Raramente','Frequentemente','Muito frequentemente'] },
      ]},
      { title: 'Medicação e Insulina', questions: [
        { id: 'dm_insulina', label: 'Usa insulina?', type: 'select', options: ['Não','Insulina basal','Insulina basal + rápida','Bomba de insulina'] },
        { id: 'dm_medicamentos_dm', label: 'Medicamentos hipoglicemiantes orais em uso', type: 'textarea', ph: 'Ex: Metformina 850mg 2x/dia, Jardiance 10mg...' },
      ]},
      { title: 'Complicações', questions: [
        { id: 'dm_neuropatia', label: 'Neuropatia diabética?', type: 'select', options: ['Não','Suspeita','Confirmada'] },
        { id: 'dm_nefropatia', label: 'Nefropatia?', type: 'select', options: ['Não','Microalbuminúria','Nefropatia confirmada','Diálise'] },
        { id: 'dm_retinopatia', label: 'Retinopatia?', type: 'select', options: ['Não','Leve','Moderada','Proliferativa'] },
        { id: 'dm_pe_diabetico', label: 'Pé diabético / úlceras?', type: 'select', options: ['Não','Risco','Úlcera ativa'] },
      ]},
      { title: 'Dieta e Comportamento', questions: [
        { id: 'dm_contagem_carboidratos', label: 'Faz contagem de carboidratos?', type: 'select', options: ['Não','Parcialmente','Sim, regularmente'] },
        { id: 'dm_refeicoes_dia', label: 'Número de refeições por dia', type: 'number', ph: 'Ex: 5' },
        { id: 'dm_jejum', label: 'Faz jejum intermitente?', type: 'select', options: ['Não','Eventualmente','Regularmente'] },
        { id: 'dm_obs', label: 'Observações adicionais', type: 'textarea', ph: 'Outras informações relevantes...' },
      ]},
    ]
  },
  hipertensao: {
    title: 'Hipertensão Arterial — Avaliação Específica',
    sections: [
      { title: 'Dados da Pressão', questions: [
        { id: 'has_pa_sistolica', label: 'PA Sistólica habitual (mmHg)', type: 'number', ph: 'Ex: 145' },
        { id: 'has_pa_diastolica', label: 'PA Diastólica habitual (mmHg)', type: 'number', ph: 'Ex: 90' },
        { id: 'has_monitoramento', label: 'Monitora a pressão em casa?', type: 'select', options: ['Não','Às vezes','Sim, regularmente'] },
        { id: 'has_controle', label: 'PA está controlada?', type: 'select', options: ['Sim, bem controlada','Parcialmente controlada','Não controlada'] },
      ]},
      { title: 'Dieta DASH e Sódio', questions: [
        { id: 'has_sal_dia', label: 'Estimativa de sal/dia (g)', type: 'number', ph: 'Ex: 8', step: '0.5' },
        { id: 'has_ultraprocessados', label: 'Consumo de ultraprocessados (embutidos, enlatados, fast food)', type: 'select', options: ['Raramente','1–2x/semana','3–5x/semana','Diariamente'] },
        { id: 'has_alcool_semana', label: 'Doses de álcool por semana', type: 'number', ph: 'Ex: 3' },
        { id: 'has_cafeina', label: 'Xícaras de café/dia', type: 'number', ph: 'Ex: 3' },
      ]},
      { title: 'Fatores de Risco', questions: [
        { id: 'has_estresse', label: 'Nível de estresse percebido', type: 'select', options: ['Baixo','Moderado','Alto','Muito alto'] },
        { id: 'has_sono', label: 'Qualidade do sono', type: 'select', options: ['Boa','Regular','Ruim','Insônia frequente'] },
        { id: 'has_obs', label: 'Observações', type: 'textarea', ph: 'Histórico de AVC, IAM, outras complicações...' },
      ]},
    ]
  },
  obesidade: {
    title: 'Obesidade — Avaliação Específica',
    sections: [
      { title: 'Histórico do Peso', questions: [
        { id: 'ob_peso_maximo', label: 'Maior peso na vida adulta (kg)', type: 'number', ph: 'Ex: 120', step: '0.1' },
        { id: 'ob_peso_min_adulto', label: 'Menor peso na vida adulta (kg)', type: 'number', ph: 'Ex: 75', step: '0.1' },
        { id: 'ob_ganho_inicio', label: 'Quando iniciou o ganho de peso?', type: 'text', ph: 'Ex: após segunda gravidez, após cirurgia...' },
        { id: 'ob_tentativas', label: 'Quantas tentativas de emagrecimento já fez?', type: 'number', ph: 'Ex: 5' },
        { id: 'ob_maior_perda', label: 'Maior perda de peso já conseguida (kg)', type: 'number', ph: 'Ex: 15' },
      ]},
      { title: 'Comportamento Alimentar', questions: [
        { id: 'ob_compulsao', label: 'Episódios de compulsão alimentar?', type: 'select', options: ['Nunca','Raramente','1–2x/semana','3+ vezes/semana'] },
        { id: 'ob_comer_noturno', label: 'Come muito à noite / comer noturno?', type: 'select', options: ['Não','Às vezes','Frequentemente'] },
        { id: 'ob_gatilhos', label: 'Gatilhos emocionais para comer', type: 'textarea', ph: 'Ex: ansiedade, tédio, tristeza...' },
        { id: 'ob_saciedade', label: 'Sente saciedade após refeições?', type: 'select', options: ['Sim, rapidamente','Demorada','Raramente sinto saciedade'] },
      ]},
      { title: 'Tratamentos Anteriores', questions: [
        { id: 'ob_tratamentos', label: 'Tratamentos já realizados', type: 'textarea', ph: 'Dietas, medicamentos, cirurgia bariátrica...' },
        { id: 'ob_bariatrica', label: 'Já realizou ou planeja cirurgia bariátrica?', type: 'select', options: ['Não','Planeja','Já realizou — Sleeve','Já realizou — Bypass','Já realizou — outra'] },
        { id: 'ob_psicoterapia', label: 'Realiza acompanhamento psicológico?', type: 'select', options: ['Não','Sim, em andamento','Já realizei no passado'] },
      ]},
    ]
  },
  dislipidemia: {
    title: 'Dislipidemia — Avaliação Específica',
    sections: [
      { title: 'Perfil Lipídico', questions: [
        { id: 'dis_ldl', label: 'LDL atual (mg/dL)', type: 'number', ph: 'Ex: 150' },
        { id: 'dis_hdl', label: 'HDL atual (mg/dL)', type: 'number', ph: 'Ex: 42' },
        { id: 'dis_tg', label: 'Triglicerídeos (mg/dL)', type: 'number', ph: 'Ex: 250' },
        { id: 'dis_chol_total', label: 'Colesterol total (mg/dL)', type: 'number', ph: 'Ex: 240' },
        { id: 'dis_pcr', label: 'PCR ultrassensível (mg/L)', type: 'number', ph: 'Ex: 2.1', step: '0.1' },
      ]},
      { title: 'Dieta e Hábitos', questions: [
        { id: 'dis_gordura_saturada', label: 'Consumo de carnes gordas/processadas', type: 'select', options: ['Raramente','1–2x/semana','Quase diariamente','Diariamente'] },
        { id: 'dis_ovos_semana', label: 'Ovos inteiros por semana', type: 'number', ph: 'Ex: 7' },
        { id: 'dis_fibras', label: 'Consumo de aveia, legumes e frutas', type: 'select', options: ['Raramente','Às vezes','Regularmente'] },
        { id: 'dis_omega3', label: 'Peixes ricos em ômega-3 por semana', type: 'number', ph: 'Ex: 2 (porções)' },
      ]},
    ]
  },
  insuf_renal: {
    title: 'Doença Renal — Avaliação Específica',
    sections: [
      { title: 'Função Renal', questions: [
        { id: 'ren_estadio', label: 'Estágio da DRC', type: 'select', options: ['1 (TFG ≥ 90)','2 (TFG 60–89)','3a (TFG 45–59)','3b (TFG 30–44)','4 (TFG 15–29)','5 (TFG < 15)','Diálise (HD)','Diálise Peritoneal','Transplantado'] },
        { id: 'ren_tfg', label: 'TFG mais recente (mL/min)', type: 'number', ph: 'Ex: 35' },
        { id: 'ren_creatinina', label: 'Creatinina sérica (mg/dL)', type: 'number', ph: 'Ex: 2.3', step: '0.01' },
        { id: 'ren_ureia', label: 'Ureia (mg/dL)', type: 'number', ph: 'Ex: 80' },
        { id: 'ren_potassio', label: 'Potássio sérico (mEq/L)', type: 'number', ph: 'Ex: 5.2', step: '0.1' },
        { id: 'ren_fosforo', label: 'Fósforo sérico (mg/dL)', type: 'number', ph: 'Ex: 5.8', step: '0.1' },
      ]},
      { title: 'Dieta Renal', questions: [
        { id: 'ren_restricao_proteina', label: 'Restrição de proteína prescrita?', type: 'select', options: ['Não','Sim — 0.6g/kg/dia','Sim — 0.8g/kg/dia','Sim — outra'] },
        { id: 'ren_restricao_potassio', label: 'Restrição de potássio?', type: 'select', options: ['Não','Sim — leve','Sim — moderada','Sim — severa'] },
        { id: 'ren_restricao_fosforo', label: 'Restrição de fósforo?', type: 'select', options: ['Não','Sim'] },
        { id: 'ren_dieta_obs', label: 'Observações sobre a dieta renal', type: 'textarea', ph: 'Quelantes de fósforo, suplementação...' },
      ]},
    ]
  },
  celiaquia: {
    title: 'Doença Celíaca — Avaliação Específica',
    sections: [
      { title: 'Diagnóstico e Controle', questions: [
        { id: 'cel_diagnostico_ano', label: 'Ano do diagnóstico', type: 'number', ph: 'Ex: 2018' },
        { id: 'cel_anticorpo', label: 'Anticorpo usado no diagnóstico', type: 'select', options: ['Anti-tTG IgA','Anti-endomísio','Biópsia duodenal','Todos','Não sei'] },
        { id: 'cel_dieta_gluten', label: 'Adere à dieta sem glúten?', type: 'select', options: ['Sim, rigorosamente','Parcialmente','Dificuldade de adesão','Não adere'] },
        { id: 'cel_sintomas_atual', label: 'Sintomas atuais', type: 'textarea', ph: 'Diarreia, distensão, dor abdominal...' },
      ]},
      { title: 'Nutrição e Deficiências', questions: [
        { id: 'cel_deficiencias', label: 'Deficiências diagnosticadas', type: 'textarea', ph: 'Ex: Ferro, B12, D, Cálcio, Zinco...' },
        { id: 'cel_rotulagem', label: 'Lê rótulos de alimentos?', type: 'select', options: ['Sim, sempre','Às vezes','Raramente','Não sabe o que verificar'] },
      ]},
    ]
  },
  sop: {
    title: 'Síndrome do Ovário Policístico — Avaliação Específica',
    sections: [
      { title: 'Diagnóstico SOP', questions: [
        { id: 'sop_criterio', label: 'Critério diagnóstico principal', type: 'select', options: ['Oligo/anovulação','Ovários policísticos no USG','Hiperandrogenismo clínico','Hiperandrogenismo laboratorial','Todos os critérios Rotterdam','Não sei'] },
        { id: 'sop_ciclo_menstrual', label: 'Ciclos menstruais', type: 'select', options: ['Regulares (21–35 dias)','Irregulares','Ausentes (amenorreia)','Oligomenorreia (> 35 dias)'] },
        { id: 'sop_hiperandrogenismo', label: 'Sinais de hiperandrogenismo', type: 'textarea', ph: 'Acne, hirsutismo, alopecia...' },
      ]},
      { title: 'Resistência Insulínica', questions: [
        { id: 'sop_homa', label: 'HOMA-IR (se disponível)', type: 'number', ph: 'Ex: 3.2', step: '0.1' },
        { id: 'sop_insulina', label: 'Insulina de jejum (µUI/mL)', type: 'number', ph: 'Ex: 18', step: '0.1' },
        { id: 'sop_metformina', label: 'Usa Metformina?', type: 'select', options: ['Não','Sim — 500mg/dia','Sim — 850mg 2x/dia','Sim — 1g 2x/dia','Sim — dose diferente'] },
      ]},
      { title: 'Reprodução e Estilo de Vida', questions: [
        { id: 'sop_desejo_gestacao', label: 'Desejo gestacional atual?', type: 'select', options: ['Não','Sim, em breve','Sim, no futuro'] },
        { id: 'sop_dieta_low_ig', label: 'Conhece e tenta seguir dieta de baixo índice glicêmico?', type: 'select', options: ['Não','Parcialmente','Sim'] },
      ]},
    ]
  },
  cancer: {
    title: 'Oncologia Nutricional — Avaliação Específica',
    sections: [
      { title: 'Diagnóstico Oncológico', questions: [
        { id: 'onco_tipo', label: 'Tipo / localização do câncer', type: 'text', ph: 'Ex: Mama HER2+, Colorretal estágio II...' },
        { id: 'onco_estagio', label: 'Estágio', type: 'select', options: ['I','II','III','IV','Remissão','Não informado'] },
        { id: 'onco_tratamento_atual', label: 'Tratamento em andamento', type: 'select', options: ['Nenhum (remissão)','Quimioterapia','Radioterapia','Imunoterapia','Hormonioterapia','Cirurgia recente','Combinado'] },
      ]},
      { title: 'Estado Nutricional Oncológico', questions: [
        { id: 'onco_perda_peso', label: 'Perda de peso nos últimos 3 meses (kg)', type: 'number', ph: 'Ex: 5', step: '0.5' },
        { id: 'onco_ipa', label: 'Avaliação NRS-2002 ou PG-SGA realizada?', type: 'select', options: ['Não','NRS-2002 — pontuação: ___','PG-SGA — pontuação: ___'] },
        { id: 'onco_efeitos_colateria', label: 'Efeitos colaterais da terapia que afetam a alimentação', type: 'textarea', ph: 'Náusea, mucosite, xerostomia, diarreia, constipação, alteração de paladar...' },
        { id: 'onco_suporte_nutri', label: 'Recebe suporte nutricional especializado?', type: 'select', options: ['Não','Sim, no hospital','Sim, ambulatorial'] },
      ]},
    ]
  },
  steatose: {
    title: 'Esteatose Hepática (DHGNA) — Avaliação Específica',
    sections: [
      { title: 'Avaliação Hepática', questions: [
        { id: 'hep_grau', label: 'Grau de esteatose (se disponível)', type: 'select', options: ['Não avaliado','Leve (grau I)','Moderada (grau II)','Acentuada (grau III)','Esteato-hepatite (NASH)','Cirrose'] },
        { id: 'hep_fibroscan', label: 'FibroScan (kPa, se disponível)', type: 'number', ph: 'Ex: 7.5', step: '0.1' },
        { id: 'hep_alt', label: 'ALT (TGP) mais recente (U/L)', type: 'number', ph: 'Ex: 65' },
        { id: 'hep_ast', label: 'AST (TGO) mais recente (U/L)', type: 'number', ph: 'Ex: 52' },
        { id: 'hep_ggt', label: 'GGT (U/L)', type: 'number', ph: 'Ex: 85' },
      ]},
      { title: 'Hábitos e Dieta', questions: [
        { id: 'hep_alcool', label: 'Consumo de álcool (doses/semana)', type: 'number', ph: 'Ex: 5' },
        { id: 'hep_frutose', label: 'Consumo de bebidas açucaradas / refrigerantes', type: 'select', options: ['Raramente','1–3x/semana','Diariamente','Várias vezes ao dia'] },
        { id: 'hep_dieta_obs', label: 'Observações sobre alimentação', type: 'textarea', ph: 'Padrão alimentar, consumo de frutos do mar, suplementos hepatotóxicos...' },
      ]},
    ]
  },
  sarcopenia: {
    title: 'Sarcopenia — Avaliação Específica',
    sections: [
      { title: 'Força e Massa Muscular', questions: [
        { id: 'sarc_handgrip', label: 'Dinamometria (kg-força)', type: 'number', ph: 'Ex: 22', step: '0.5' },
        { id: 'sarc_dxa', label: 'DXA — massa muscular esquelética (kg, se disponível)', type: 'number', ph: 'Ex: 18.5', step: '0.1' },
        { id: 'sarc_velocidade_marcha', label: 'Teste de velocidade de marcha (m/s)', type: 'number', ph: 'Ex: 0.8', step: '0.1' },
        { id: 'sarc_tug', label: 'Timed Up & Go Test (segundos)', type: 'number', ph: 'Ex: 14', step: '0.5' },
        { id: 'sarc_sppb', label: 'Score SPPB', type: 'number', ph: 'Ex: 8', min: '0', max: '12' },
      ]},
      { title: 'Proteína e Exercício', questions: [
        { id: 'sarc_proteina_dia', label: 'Estimativa de ingestão proteica (g/kg/dia)', type: 'number', ph: 'Ex: 0.8', step: '0.1' },
        { id: 'sarc_exercicio_resistencia', label: 'Realiza exercício de resistência / musculação?', type: 'select', options: ['Não','Ocasionalmente','1–2x/semana','3+ vezes/semana'] },
        { id: 'sarc_quedas', label: 'Histórico de quedas no último ano?', type: 'select', options: ['Nenhuma','1 queda','2 quedas','3 ou mais quedas'] },
      ]},
    ]
  },
  hipotireoidismo: {
    title: 'Hipotireoidismo — Avaliação Específica',
    sections: [
      { title: 'Função Tireoidiana', questions: [
        { id: 'hipo_tsh', label: 'TSH atual (mUI/L)', type: 'number', ph: 'Ex: 6.5', step: '0.01' },
        { id: 'hipo_t4_livre', label: 'T4 Livre (ng/dL)', type: 'number', ph: 'Ex: 0.8', step: '0.01' },
        { id: 'hipo_t3', label: 'T3 total (ng/dL, se disponível)', type: 'number', ph: 'Ex: 90', step: '0.1' },
        { id: 'hipo_anticorpos', label: 'Anticorpos (Hashimoto?)', type: 'select', options: ['Não dosado','Anti-TPO negativo','Anti-TPO positivo','Anti-Tg positivo','Ambos positivos'] },
        { id: 'hipo_medicacao', label: 'Medicação tireoidiana', type: 'text', ph: 'Ex: Levotiroxina 75mcg em jejum' },
      ]},
      { title: 'Sintomas e Nutrição', questions: [
        { id: 'hipo_sintomas', label: 'Sintomas predominantes', type: 'textarea', ph: 'Cansaço, ganho de peso, queda de cabelo, constipação, frio...' },
        { id: 'hipo_selenio', label: 'Suplementação de selênio?', type: 'select', options: ['Não','Sim — 55 mcg/dia','Sim — 200 mcg/dia','Outra dose'] },
        { id: 'hipo_gluten_sensib', label: 'Sensibilidade ao glúten (sem diagnóstico de Celíaca)?', type: 'select', options: ['Não','Possível','Sim — evita glúten'] },
      ]},
    ]
  },
  anemia: {
    title: 'Anemia — Avaliação Específica',
    sections: [
      { title: 'Tipo de Anemia', questions: [
        { id: 'anemia_tipo', label: 'Tipo de anemia diagnosticada', type: 'select', options: ['Ferropriva','Por deficiência de B12','Por deficiência de Folato','Anemia de doença crônica','Hemolítica','Falciforme','Não confirmada'] },
        { id: 'anemia_hb', label: 'Hemoglobina atual (g/dL)', type: 'number', ph: 'Ex: 9.5', step: '0.1' },
        { id: 'anemia_ferritina', label: 'Ferritina (ng/mL)', type: 'number', ph: 'Ex: 8', step: '0.1' },
        { id: 'anemia_vit_b12', label: 'Vitamina B12 (pg/mL)', type: 'number', ph: 'Ex: 180' },
        { id: 'anemia_folato', label: 'Folato sérico (ng/mL)', type: 'number', ph: 'Ex: 4.2', step: '0.1' },
      ]},
      { title: 'Causa e Tratamento', questions: [
        { id: 'anemia_causa', label: 'Causa identificada', type: 'textarea', ph: 'Ex: menstruação intensa, baixo consumo de carne, gastrite...' },
        { id: 'anemia_suplemento', label: 'Suplementação em uso', type: 'text', ph: 'Ex: Sulfato ferroso 300mg 2x/dia' },
        { id: 'anemia_vitamina_c', label: 'Consome vitamina C junto com ferro?', type: 'select', options: ['Não sabe','Não','Às vezes','Sim, regularmente'] },
      ]},
    ]
  },
  crohn: {
    title: 'Doença de Crohn / Retocolite Ulcerativa — Avaliação',
    sections: [
      { title: 'Diagnóstico e Atividade', questions: [
        { id: 'dii_tipo', label: 'Diagnóstico', type: 'select', options: ['Doença de Crohn','Retocolite Ulcerativa','Colite Indeterminada'] },
        { id: 'dii_atividade', label: 'Atividade atual da doença', type: 'select', options: ['Remissão','Atividade leve','Atividade moderada','Atividade grave','Surto'] },
        { id: 'dii_extensao', label: 'Extensão / localização', type: 'text', ph: 'Ex: Ileocolite, pancolite, proctite...' },
        { id: 'dii_cirurgias', label: 'Cirurgias intestinais realizadas', type: 'textarea', ph: 'Ex: ressecção de íleo terminal, colostomia...' },
      ]},
      { title: 'Nutrição e Sintomas', questions: [
        { id: 'dii_ostomia', label: 'Possui ostomia?', type: 'select', options: ['Não','Colostomia','Ileostomia'] },
        { id: 'dii_evacuacoes_dia', label: 'Evacuações/dia em surto', type: 'number', ph: 'Ex: 8' },
        { id: 'dii_deficiencias', label: 'Deficiências nutricionais diagnosticadas', type: 'textarea', ph: 'B12, D, ferro, zinco, folato...' },
        { id: 'dii_terapia_nutri', label: 'Já usou nutrição enteral exclusiva?', type: 'select', options: ['Não','Sim, como indução de remissão','Sim, como suporte'] },
        { id: 'dii_alimentos_gatilho', label: 'Alimentos que pioram os sintomas', type: 'textarea', ph: 'Lactose, fibras insolúveis, gordura...' },
      ]},
    ]
  },
};

let _diseaseFormCurrentPatientId = null;

function openDiseaseForm(diseaseKey, diseaseName) {
  const questions = _diseaseQuestionBanks[diseaseKey];
  if (!questions) { showToast('Formulário não disponível para esta condição.', 'error'); return; }

  _diseaseFormState.disease = diseaseKey;
  _diseaseFormState.patientId = _diseaseFormCurrentPatientId;

  document.getElementById('diseaseFormTitle').innerHTML = `<i class="fa-solid fa-file-medical ic-stethoscope"></i> ${questions.title}`;
  document.getElementById('diseaseFormSubtitle').textContent = 'Perguntas específicas para ' + diseaseName + ' — recomendadas para um prontuário completo';
  document.getElementById('diseaseFormLoading').style.display = 'none';
  document.getElementById('diseaseFormContent').style.display = 'block';
  document.getElementById('diseaseFormActions').style.display = 'flex';

  // Build form HTML
  const content = document.getElementById('diseaseFormContent');
  content.innerHTML = questions.sections.map(section => `
    <div class="patient-form-section" style="margin-bottom:0.75rem;">
      <div class="patient-form-section-title"><i class="fa-solid fa-circle-dot ic-goal"></i> ${section.title}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.65rem;">
        ${section.questions.map(q => {
          let input = '';
          if (q.type === 'select') {
            input = `<select id="${q.id}" class="form-select">${q.options.map(o => `<option>${o}</option>`).join('')}</select>`;
          } else if (q.type === 'textarea') {
            input = `<textarea id="${q.id}" class="form-input" rows="2" placeholder="${q.ph||''}"></textarea>`;
          } else {
            input = `<input type="${q.type||'text'}" id="${q.id}" class="form-input" placeholder="${q.ph||''}" ${q.step?`step="${q.step}"`:''}${q.min?` min="${q.min}"`:''}${q.max?` max="${q.max}"`:''}>`; 
          }
          const fullWidth = q.type === 'textarea' || (q.label && q.label.length > 40);
          return `<div class="form-field" ${fullWidth?'style="grid-column:1/-1;"':''}><label class="form-label">${q.label}</label>${input}</div>`;
        }).join('')}
      </div>
    </div>
  `).join('');

  document.getElementById('diseaseFormModal').classList.add('show');
}

function closeDiseaseFormModal() {
  document.getElementById('diseaseFormModal').classList.remove('show');
}

async function saveDiseaseFormData() {
  const disease = _diseaseFormState.disease;
  const patientId = _diseaseFormState.patientId;
  const questions = _diseaseQuestionBanks[disease];
  if (!questions) return;

  // Collect all form data
  const data = {};
  questions.sections.forEach(section => {
    section.questions.forEach(q => {
      const el = document.getElementById(q.id);
      if (el) data[q.id] = el.value;
    });
  });

  showToast('<i class="fa-solid fa-hourglass-half ic-water"></i> Salvando dados específicos...');

  if (patientId) {
    // Save to patient_anamnese as a JSON blob in a special field
    const { error } = await supabase.from('patient_anamnese').upsert({
      patient_id: patientId,
      nutritionist_id: currentUser?.id,
      diseases_other: (document.getElementById('cpDiseasesOther')?.value || '') + '\n\n[' + disease.toUpperCase() + ' FORM]\n' + JSON.stringify(data, null, 2),
      updated_at: new Date().toISOString()
    }, { onConflict: 'patient_id' });
    if (error) console.warn('[saveDiseaseFormData]', error);
  }

  closeDiseaseFormModal();
  showToast('<i class="fa-solid fa-circle-check ic-check"></i> Dados do formulário específico salvos!');
}

// _diseaseFormCurrentPatientId is reset in openCreatePatientModal directly above.
// No additional override needed here.

// ── Extend saveProfile to save body fat % ──────────────────────────────────
const _origSaveProfile = window.saveProfile;
window.saveProfile = async function() {
  const name = document.getElementById('profileName')?.value.trim();
  const sex = document.getElementById('profileSex')?.value;
  const age = parseInt(document.getElementById('profileAge')?.value) || null;
  const weight = parseFloat(document.getElementById('profileWeight')?.value) || null;
  const height = parseFloat(document.getElementById('profileHeight')?.value) || null;
  const body_fat_pct = parseFloat(document.getElementById('profileBodyFat')?.value) || null;
  const dob = document.getElementById('profileDob')?.value || null;
  const username = (document.getElementById('profileUsername')?.value || '').trim().toLowerCase();

  const payload = { name, username: username || null, sex, age, weight, height, body_fat_pct, dob };
  let { error } = await (window.getSupabase?.() || window._db).from('profiles').update(payload).eq('id', currentUser.id);
  if (error && error.code === '42703') {
    if (error.message?.includes('dob')) delete payload.dob;
    if (error.message?.includes('body_fat_pct')) delete payload.body_fat_pct;
    const retry = await (window.getSupabase?.() || window._db).from('profiles').update(payload).eq('id', currentUser.id);
    error = retry.error;
  }
  if (error) { showToast('Erro ao salvar: ' + error.message, 'error'); return; }

  try {
    await (window.getSupabase?.() || window._db).auth.updateUser({ data: { name, full_name: name } });
    if (currentUser?.user_metadata) { currentUser.user_metadata.name = name; currentUser.user_metadata.full_name = name; }
  } catch(e) { console.warn('[CalorIA] Não foi possível atualizar user_metadata:', e); }

  currentProfile = { ...currentProfile, name, sex, age, weight, height, body_fat_pct, dob };
  renderSidebarUser();
  updateHomePanel();
  profileUpdateFatClassification();
  showToast('<i class="fa-solid fa-circle-check ic-check"></i> Perfil salvo!');
};

// ── Extend renderSidebarUser to populate new profile fields ─────────────────
const _origRenderSidebarUser = window.renderSidebarUser;
window.renderSidebarUser = function() {
  _origRenderSidebarUser();
  if (currentProfile?.dob) {
    const dobEl = document.getElementById('profileDob');
    if (dobEl) dobEl.value = currentProfile.dob;
    profileUpdateAgeFromDob();
    profileDetectLifeStage();
  }
  if (currentProfile?.body_fat_pct) {
    const bfEl = document.getElementById('profileBodyFat');
    if (bfEl) { bfEl.value = currentProfile.body_fat_pct; profileUpdateFatClassification(); }
  }
  const isDiabetic = localStorage.getItem('cv_is_diabetic') === 'true';
  const profileDiabEl = document.getElementById('profileDiabetes');
  if (profileDiabEl) profileDiabEl.checked = isDiabetic;
  const calcDiabEl = document.getElementById('calcDiabetes');
  if (calcDiabEl) calcDiabEl.checked = isDiabetic;
};

// Expor funções para o escopo global
window.openNutritionistRequest = openNutritionistRequest;
window.closeNutritionistModal = closeNutritionistModal;
window.showPaywall = showPaywall;
window.removePaywall = removePaywall;
window.selectCpGoal = selectCpGoal;
window.openCreatePatientModal = openCreatePatientModal;
window.closeCreatePatientModal = closeCreatePatientModal;
window.updateCpInitial = updateCpInitial;
window.handleCpAvatarUpload = handleCpAvatarUpload;
window.toggleCpPasswordVisibility = toggleCpPasswordVisibility;
window.showCpError = showCpError;
window.openChangePasswordModal = openChangePasswordModal;
window.openForgotPassword = openForgotPassword;
window.closeForgotPassword = closeForgotPassword;
window.cpUpdateAgeFromDob = cpUpdateAgeFromDob;
window.cpToggleFemFields = cpToggleFemFields;
window.cpTogglePregnancyFields = cpTogglePregnancyFields;
window.cpCalcBodyFat = cpCalcBodyFat;
window.collectPatientAnamneseData = collectPatientAnamneseData;
window.profileUpdateAgeFromDob = profileUpdateAgeFromDob;
window.profileDetectLifeStage = profileDetectLifeStage;
window.profileCalcBodyFat = profileCalcBodyFat;
window.profileUpdateFatClassification = profileUpdateFatClassification;
window.cpDetectPatientType = cpDetectPatientType;
window.cpCheckDiseaseFormSuggestions = cpCheckDiseaseFormSuggestions;
window.attachDiseaseCheckboxListeners = attachDiseaseCheckboxListeners;
window.openDiseaseForm = openDiseaseForm;
window.closeDiseaseFormModal = closeDiseaseFormModal;
window.loadMyNutritionistRequestStatus = loadMyNutritionistRequestStatus;
window.sendNutritionistRequest = sendNutritionistRequest;
window.sendEmailViaAPI = sendEmailViaAPI;
window.createPatientDirect = createPatientDirect;
window.submitForcePasswordChange = submitForcePasswordChange;
window.sendPasswordReset = sendPasswordReset;
window.resendConfirmEmail = resendConfirmEmail;
window.printPatientAnamnese = printPatientAnamnese;
window.saveDiseaseFormData = saveDiseaseFormData;
// saveProfile and renderSidebarUser extended above — do not overwrite

