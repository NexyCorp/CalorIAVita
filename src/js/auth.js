// ═══════════════════════════════════════
// AUTH
// ═══════════════════════════════════════
function switchAuthTab(tab) {
  document.getElementById('formLogin').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('formRegister').style.display = tab === 'register' ? 'block' : 'none';
  document.getElementById('tabLoginBtn').classList.toggle('active', tab === 'login');
  document.getElementById('tabRegisterBtn').classList.toggle('active', tab === 'register');
  document.getElementById('authError').style.display = 'none';
}

function showAuthError(msg) {
  const el = document.getElementById('authError');
  el.textContent = msg; el.style.display = 'block';
}
function setAuthLoading(on) {
  document.getElementById('authLoading').style.display = on ? 'block' : 'none';
  const btns = document.querySelectorAll('#authOverlay .btn-primary');
  btns.forEach(b => b.disabled = on);
}

async function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  if (!email || !password) { showAuthError('Preencha e-mail e senha.'); return; }
  setAuthLoading(true);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    setAuthLoading(false);
    if (error.message?.toLowerCase().includes('email not confirmed')) showAuthError('Confirme seu e-mail antes de entrar.');
    else showAuthError('E-mail ou senha incorretos.');
    return;
  }
  if (data?.user) await initApp(data.user);
}

// ─── Register avatar logic ───────────────────────────────────────────────────
const REG_AVATARS = [
  { emoji: '🐱', bg: '#fde8d8' }, { emoji: '🐶', bg: '#dff0e8' },
  { emoji: '🦊', bg: '#fce4c8' }, { emoji: '🐸', bg: '#d8f0d8' },
  { emoji: '🐼', bg: '#e8e8e8' }, { emoji: '🦁', bg: '#fdf0d0' },
  { emoji: '🐨', bg: '#dce8f0' }, { emoji: '🐯', bg: '#fce8c8' },
  { emoji: '🦋', bg: '#ead8f8' }, { emoji: '🌸', bg: '#f8dce8' },
  { emoji: '🌿', bg: '#d8f0dc' }, { emoji: '🍀', bg: '#d8f0dc' },
  { emoji: '⭐', bg: '#fdf8d0' }, { emoji: '🌙', bg: '#dce0f8' },
  { emoji: '🍎', bg: '#fcdcdc' },
];
let regAvatarData = null; // base64 string OR emoji key OR null

function buildRegAvatarGrid() {
  const grid = document.getElementById('regAvatarGrid');
  if (!grid || grid.children.length > 0) return;
  REG_AVATARS.forEach((av, i) => {
    const tile = document.createElement('div');
    tile.className = 'reg-avatar-tile';
    tile.title = av.emoji;
    tile.style.background = av.bg;
    tile.style.fontFamily = "'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif";
    tile.style.fontSize = '1.5rem';
    tile.style.lineHeight = '1';
    tile.innerHTML = `<span style="font-family:'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif;font-size:1.5rem;line-height:1;">${av.emoji}</span>`;
    tile.dataset.idx = i;
    tile.onclick = () => selectRegEmoji(i);
    grid.appendChild(tile);
  });
}

function toggleRegAvatarPicker() {
  buildRegAvatarGrid();
  const picker = document.getElementById('regAvatarPicker');
  picker.style.display = picker.style.display === 'none' ? 'block' : 'none';
  setRegAvatarOptActive('regOptAvatars', picker.style.display !== 'none');
}

function selectRegEmoji(idx) {
  const av = REG_AVATARS[idx];
  regAvatarData = { type: 'emoji', emoji: av.emoji, bg: av.bg };
  // Update preview
  const preview = document.getElementById('regAvatarPreview');
  preview.style.background = av.bg;
  preview.innerHTML = `<span style="font-size:2rem;">${av.emoji}</span>`;
  // Mark selected tile
  document.querySelectorAll('.reg-avatar-tile').forEach(t => t.classList.remove('selected'));
  document.querySelector(`.reg-avatar-tile[data-idx="${idx}"]`)?.classList.add('selected');
  setRegAvatarOptActive('regOptAvatars', true);
}

function handleRegAvatarUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    regAvatarData = { type: 'upload', dataUrl: e.target.result, file };
    const preview = document.getElementById('regAvatarPreview');
    preview.style.background = '';
    preview.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    document.getElementById('regAvatarPicker').style.display = 'none';
    setRegAvatarOptActive('regOptPhoto', true);
  };
  reader.readAsDataURL(file);
}

function clearRegAvatar() {
  regAvatarData = null;
  document.querySelectorAll('.reg-avatar-tile').forEach(t => t.classList.remove('selected'));
  document.getElementById('regAvatarFile').value = '';
  document.getElementById('regAvatarPicker').style.display = 'none';
  updateRegInitial();
  setRegAvatarOptActive('regOptInitial', true);
}

function updateRegInitial() {
  const name = document.getElementById('regName')?.value.trim() || '';
  const initial = name ? name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() : '?';
  const span = document.getElementById('regAvatarInitial');
  const preview = document.getElementById('regAvatarPreview');
  if (!regAvatarData) {
    preview.style.background = '';
    if (span) span.textContent = initial;
  }
}

function setRegAvatarOptActive(activeId, on) {
  ['regOptPhoto','regOptAvatars','regOptInitial'].forEach(id => {
    document.getElementById(id)?.classList.toggle('active', id === activeId && on);
  });
}
// ─────────────────────────────────────────────────────────────────────────────

async function doRegister() {
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  if (!name || !email || !password) { showAuthError('Preencha todos os campos.'); return; }
  if (password.length < 6) { showAuthError('Senha deve ter pelo menos 6 caracteres.'); return; }
  setAuthLoading(true);

  // Check invite token in URL
  const urlParams = new URLSearchParams(window.location.search);
  const inviteToken = urlParams.get('invite');
  const nutritionistId = urlParams.get('nid');

  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { name, role: 'standard' } }
  });
  if (error) { setAuthLoading(false); showAuthError(error.message); return; }
  if (data.user?.identities?.length === 0) {
    setAuthLoading(false); showAuthError('Este e-mail já está cadastrado.'); switchAuthTab('login'); return;
  }

  if (data.user) {
    const isInvited = inviteToken && nutritionistId;

    // Handle avatar: upload file OR store emoji as data-URI OR nothing
    let avatarUrl = null;
    if (regAvatarData?.type === 'upload') {
      const ext = regAvatarData.file.name.split('.').pop() || 'jpg';
      const path = data.user.id + '/avatar.' + ext;
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, regAvatarData.file, { upsert: true, contentType: regAvatarData.file.type });
      if (!upErr) {
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
        avatarUrl = urlData.publicUrl + '?t=' + Date.now();
      }
    } else if (regAvatarData?.type === 'emoji') {
      // Store emoji as a special marker; rendered client-side
      avatarUrl = '__emoji__' + regAvatarData.emoji + '__' + regAvatarData.bg;
    }
    await supabase.from('profiles').upsert(
      { id: data.user.id, name: name || null, email, role: isInvited ? 'patient' : 'standard', plan: isInvited ? 'pro' : 'free',
        nutritionist_id: isInvited ? nutritionistId : null, avatar_url: avatarUrl, updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    );
    // If invited, link patient to nutritionist
    if (isInvited) {
      await supabase.from('professional_patients').insert({
        professional_id: nutritionistId, patient_id: data.user.id
      });
      // Mark invite token used
      await supabase.from('patient_invites').update({ accepted: true, patient_id: data.user.id })
        .eq('token', inviteToken);
    }

    // Show onboarding for new users
    if (!isInvited) {
      document.getElementById('authStep1').style.display = 'none';
      document.getElementById('onboardingStep').style.display = 'block';
      // Store user temporarily
      window._pendingUser = data.user;
      window._pendingFreshProfile = null;
      regAvatarData = null;
      setAuthLoading(false);
    } else {
      // Invited user — show email confirmation banner
      const banner = document.getElementById('emailConfirmBanner');
      if (banner) banner.style.display = 'block';
      showAuthError('');
      setAuthLoading(false);
    }
  }
  setTimeout(() => setAuthLoading(false), 8000);
}

let _onbGoalDelta = -500;
function selectOnbGoal(btn) {
  document.querySelectorAll('#onboardingStep .goal-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  _onbGoalDelta = parseInt(btn.dataset.goal);
}

async function completeOnboarding() {
  const sex = document.getElementById('onbSex').value;
  const age = document.getElementById('onbAge').value;
  const weight = document.getElementById('onbWeight').value;
  const height = document.getElementById('onbHeight').value;

  const bodyFatUnknown = document.getElementById('onbBodyFatUnknown')?.checked;
  const body_fat_pct = bodyFatUnknown ? null : (parseFloat(document.getElementById('onbBodyFat')?.value) || null);

  if (window._pendingUser) {
    await supabase.from('profiles').update({
      sex,
      age: parseInt(age)||null,
      weight: parseFloat(weight)||null,
      height: parseFloat(height)||null,
      body_fat_pct
    }).eq('id', window._pendingUser.id);
    // Calculate suggested goal
    if (weight && height && age) {
      const tmb = sex === 'm'
        ? 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age)
        : 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
      const suggestedGoal = Math.round(tmb * 1.375) + _onbGoalDelta;
      await supabase.from('user_goals').upsert({ user_id: window._pendingUser.id, daily_kcal: suggestedGoal }, { onConflict: 'user_id' });
    }
    // Reload fresh profile before launching app
    const { data: freshP } = await supabase.from('profiles').select('*').eq('id', window._pendingUser.id).single();
    if (freshP) window._pendingFreshProfile = freshP;

    // Check if user needs email confirmation before accessing the app
    const needsConfirm = window._pendingUser && !window._pendingUser.email_confirmed_at && !window._pendingUser.confirmed_at;
    if (needsConfirm) {
      document.getElementById('onboardingStep').style.display = 'none';
      document.getElementById('authStep1').style.display = 'block';
      switchAuthTab('register');
      document.getElementById('emailConfirmBanner').style.display = 'block';
      document.getElementById('regEmail').value = window._pendingUser.email || '';
      return;
    }

    await initApp(window._pendingUser);
  }
}

async function doLogout() {
  _appInitialized = false; _initAppRunning = false;
  try { await supabase.auth.signOut({ scope:'global' }); } catch(e) {}
  try { Object.keys(localStorage).forEach(k => { if (k.startsWith('sb-') || k.includes('supabase') || k === 'caloria-verde-auth') localStorage.removeItem(k); }); } catch(e) {}
  _cookieDel(_CV_COOKIE);
  await new Promise(r => setTimeout(r, 200));
  window.location.reload();
}

// ═══════════════════════════════════════
// INIT APP
// ═══════════════════════════════════════
async function fetchUserProfile(user) {
  const metaName = user.user_metadata?.name || user.user_metadata?.full_name || '';
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (data) return data;
      if (attempt === 0) {
        await supabase.from('profiles').upsert({
          id: user.id, email: user.email, name: metaName || null,
          role: 'standard', plan: 'free', updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
      }
    } catch(e) {}
    await new Promise(r => setTimeout(r, 600 * (attempt + 1)));
  }
  if (window._pendingFreshProfile) {
    const fresh = window._pendingFreshProfile;
    window._pendingFreshProfile = null;
    return fresh;
  }
  return {
    id: user.id, email: user.email, role: 'standard', plan: 'free',
    name: metaName || user.email?.split('@')[0] || ''
  };
}

async function initApp(user) {
  if (_initAppRunning) return;
  if (_appInitialized && currentUser?.id === user.id) {
    if (typeof window.renderSidebarUser === 'function') window.renderSidebarUser();
    if (typeof window.updateHomePanel === 'function') window.updateHomePanel();
    return;
  }
  _initAppRunning = true;

  try {
    currentUser = user;
    currentProfile = await fetchUserProfile(user);
    if (window._pendingFreshProfile) {
      currentProfile = { ...currentProfile, ...window._pendingFreshProfile };
      window._pendingFreshProfile = null;
    }

    setAuthLoading(false);
    showApp(user);

    setupRoleUI();
    applyPlanRestrictions();
    renderSidebarUser();

    try { if (window.loadGoalFromDB) await window.loadGoalFromDB(); } catch(e) { console.warn('[CalorIA] loadGoal:', e); }
    try { if (window.loadDiaryForDate) await window.loadDiaryForDate(diaryDate); } catch(e) { console.warn('[CalorIA] loadDiary:', e); }
    initDiaryDate();
    renderRecipes('all');
    try { await loadRecipesFromDB(); } catch(e) {}
    showPanel('home', document.getElementById('nav-home'));

    // Check if patient needs to change password on first login
    // NUNCA mostra para nutricionistas/admins/professionals — só para pacientes
    const isPatientRole = currentProfile?.role === 'patient';
    const mustChange = currentUser?.user_metadata?.must_change_password === true;
    if (isPatientRole && mustChange) {
      setTimeout(() => openChangePasswordModal(), 800);
    }

    // Check if patient — show nutritionist info
    if (currentProfile.nutritionist_id) loadLinkedNutritionist();

    // Show pending announcements for patients
    if (isPatient()) setTimeout(() => checkAnnouncements(), 1000);
    // Show pending admin notices for any user (admin broadcasts)
    setTimeout(() => checkAdminNotices(), 1500);

    // Load patients if professional
    if (isProfessional()) loadPatients();

    // Load admin
    if (isAdmin()) { loadAdminPanel(); loadPendingRecipes(); }

    // Notifications for professionals
    if (isProfessional()) checkPatientNotifications();

    applyLanguage();
    renderSidebarUser();
    if (typeof window.updateHomePanel === 'function') window.updateHomePanel();
    _appInitialized = true;
  } catch(e) {
    console.error('[CalorIA] initApp error:', e);
    setAuthLoading(false);
    showApp(user);
    _appInitialized = true;
  } finally {
    _initAppRunning = false;
  }
}

function showApp(user) {
  document.getElementById('authOverlay').classList.add('hidden');
  document.getElementById('appShell').classList.add('visible');
  document.getElementById('appShell').style.display = 'flex';
  startProfileRealtime(user.id);
}

// Escuta mudanças de role/plan no perfil do usuário (Realtime + polling de fallback)
let _realtimeChannel = null;
let _profilePollInterval = null;
function startProfileRealtime(userId) {
  if (_realtimeChannel) supabase.removeChannel(_realtimeChannel);
  _realtimeChannel = supabase
    .channel('profile-changes-' + userId)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'profiles',
      filter: 'id=eq.' + userId
    }, payload => {
      if (payload.new) {
        applyProfileUpdate(payload.new);
        console.log('[CalorIA] Perfil atualizado em tempo real:', payload.new.role, payload.new.plan);
      }
    })
    .subscribe();

  // Fallback por polling (caso Realtime não esteja disponível no plano do Supabase)
  if (_profilePollInterval) clearInterval(_profilePollInterval);
  _profilePollInterval = setInterval(async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      if (!error && data) {
        const changed = data.role !== currentProfile?.role || data.plan !== currentProfile?.plan;
        if (changed) {
          applyProfileUpdate(data);
          console.log('[CalorIA] Perfil atualizado via polling:', data.role, data.plan);
        }
      }
    } catch(e) {}
  }, 8000); // verifica a cada 8 segundos
}

async function forceRefreshProfile() {
  if (!currentUser) return;
  showToast('<i class="fa-solid fa-arrows-rotate ic-water"></i> Atualizando perfil...');
  try {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
    if (error) throw error;
    applyProfileUpdate(data);
    showToast('<i class="fa-solid fa-circle-check ic-check"></i> Perfil atualizado! Cargo: ' + (data.role || '?') + ' | Plano: ' + (data.plan || '?'));
  } catch(e) {
    showToast('<i class="fa-solid fa-xmark ic-alert"></i> Erro ao atualizar perfil', 'error');
  }
}

function applyProfileUpdate(newData) {
  const oldRole = currentProfile?.role;
  const oldPlan = currentProfile?.plan;
  currentProfile = { ...currentProfile, ...newData };
  setupRoleUI();
  applyPlanRestrictions();
  renderSidebarUser();
  // Se cargo ou plano mudou, volta para o painel inicial para evitar tela errada
  if (oldRole !== newData.role || oldPlan !== newData.plan) {
    showPanel('home', document.getElementById('nav-home'));
    if (newData.role !== oldRole) {
      showToast('<i class="fa-solid fa-arrows-rotate ic-water"></i> Cargo atualizado: ' + (newData.role || 'padrão'));
    }
  }
}

// ═══════════════════════════════════════
// AUTH STATE
// ═══════════════════════════════════════
supabase.auth.onAuthStateChange(async (event, session) => {
  if (_suppressAuthChange) return;
  if (session?.user) {
    if (session.refresh_token) _cookieSet(_CV_COOKIE, session.refresh_token, 7);
    if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
      if (_initAppRunning) return;
      if (_appInitialized && currentUser?.id === session.user.id) return;
      await initApp(session.user);
    } else if (event === 'TOKEN_REFRESHED' && !_appInitialized && !_initAppRunning) {
      await initApp(session.user);
    }
  } else {
    if (event === 'INITIAL_SESSION') {
      const rt = _cookieGet(_CV_COOKIE);
      if (rt) {
        try {
          const { data } = await supabase.auth.refreshSession({ refresh_token: rt });
          if (data?.user) return;
          _cookieDel(_CV_COOKIE);
        } catch(e) { _cookieDel(_CV_COOKIE); }
      }
    }
    _cookieDel(_CV_COOKIE);
    _appInitialized = false; _initAppRunning = false;
    currentUser = null; currentProfile = null;
    document.getElementById('authOverlay').classList.remove('hidden');
    document.getElementById('appShell').classList.remove('visible');
    document.getElementById('appShell').style.display = 'none';
  }
});

// Expor funções e variáveis para o escopo global
window.switchAuthTab = switchAuthTab;
window.showAuthError = showAuthError;
window.setAuthLoading = setAuthLoading;
window.doLogin = doLogin;
window.buildRegAvatarGrid = buildRegAvatarGrid;
window.toggleRegAvatarPicker = toggleRegAvatarPicker;
window.selectRegEmoji = selectRegEmoji;
window.handleRegAvatarUpload = handleRegAvatarUpload;
window.clearRegAvatar = clearRegAvatar;
window.updateRegInitial = updateRegInitial;
window.doRegister = doRegister;
window.selectOnbGoal = selectOnbGoal;
window.completeOnboarding = completeOnboarding;
window.doLogout = doLogout;
window.initApp = initApp;


