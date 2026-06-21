// ═══════════════════════════════════════
// ROLE / PLAN SETUP
// ═══════════════════════════════════════
function getUserPlan() { return currentProfile?.plan || 'free'; }
function getUserRole() { return currentProfile?.role || 'standard'; }

// ── Hierarquia de planos ──────────────────────────────────
// standard free   → plan:'free',  role:'standard'
// standard pro    → plan:'pro',   role:'standard'
// nutritionist pro  → plan:'pro',   role:'nutritionist'
// nutritionist clinic → plan:'clinic', role:'nutritionist'
// patient vinculado a nut_pro   → plan:'patient_pro',  role:'patient'
// patient vinculado a nut_clinic → plan:'patient_clinic', role:'patient'
// (legado: patients criados antes ainda usam plan:'pro' — tratado como patient_pro)

function isStandardFree()       { return getUserRole()==='standard' && getUserPlan()==='free'; }
function isStandardPro()        { return getUserRole()==='standard' && (getUserPlan()==='pro'||getUserPlan()==='standard_pro'); }
function isPatient()            { return getUserRole()==='patient'; }
function isPatientClinic()      { return getUserRole()==='patient' && (getUserPlan()==='patient_clinic'||getUserPlan()==='clinic'); }
function isNutritionistPro()    { return getUserRole()==='nutritionist' && (getUserPlan()==='pro'||getUserPlan()==='nutritionist_pro') && !isNutritionistClinic(); }
function isNutritionistClinic() { return getUserRole()==='nutritionist' && (getUserPlan()==='clinic'||getUserPlan()==='nutritionist_clinic'||getUserPlan()==='admin'); }
function isProfessional()       { return ['nutritionist','personal_trainer','admin'].includes(getUserRole()); }
function isAdmin()              { return getUserRole()==='admin' || getUserPlan()==='admin'; }
function isClinic()             { return isNutritionistClinic() || isAdmin(); }

// isPro() = tem pelo menos o plano standard pro (ou superior)
function isPro() {
  if (isAdmin()) return true;
  if (isProfessional()) return true;     // nutricionistas sempre têm acesso pro ao menos
  if (isPatient()) return true;          // pacientes vinculados têm acesso ao app
  const p = getUserPlan();
  return p==='pro'||p==='clinic'||p==='standard_pro'||p==='nutritionist_pro'||p==='nutritionist_clinic';
}

// Funções de acesso por feature
function canUseDiary()         { return !isStandardFree(); }
function canUseCamera()        { return !isStandardFree(); }
function canUseRecipes()       { return !isStandardFree(); }
function canAddRecipe()        { return isStandardPro()||isProfessional()||isAdmin(); }
function canUseCompare()       { return true; } // todos
function canUsePatientPanel()  { return isProfessional()||isAdmin(); }
function canUseClinicFeatures(){ return isNutritionistClinic()||isAdmin(); } // prontuário, relatórios clínicos
function canUsePdfReport()     { return isStandardPro()||isProfessional()||isAdmin(); }
function canSeeNutritionistReports() { return isPatientClinic(); } // paciente clinic vê mais dados

const PLAN_LIMITS = {
  free:              { patients:0,  cameraMonth:3,   label:'Gratuito' },
  pro:               { patients:15, cameraMonth:999, label:'Pro' },
  standard_pro:      { patients:0,  cameraMonth:999, label:'Pro' },
  nutritionist_pro:  { patients:15, cameraMonth:999, label:'Nutricionista Pro' },
  nutritionist_clinic:{ patients:999,cameraMonth:999,label:'Nutricionista Clínica' },
  clinic:            { patients:999,cameraMonth:999, label:'Clínica' },
  admin:             { patients:999,cameraMonth:999, label:'Admin' }
};

function setupRoleUI() {
  const role = getUserRole();
  const isProf = isProfessional();
  const isAdm = isAdmin();

  if (isProf) {
    if (document.getElementById('dropdownBecomeNut')) document.getElementById('dropdownBecomeNut').style.display = 'none';
  } else {
    if (document.getElementById('dropdownBecomeNut')) document.getElementById('dropdownBecomeNut').style.display = 'block';
  }

  // Ensure specialty button is hidden for non-professionals
  const nutSpecBtn = document.getElementById('dropdownNutSpecialtyBtn');
  if (nutSpecBtn) nutSpecBtn.style.display = isProf ? 'block' : 'none';

  document.getElementById('nav-prof').style.display = isProf ? 'flex' : 'none';
  document.getElementById('navGroupPro').style.display = isProf ? 'block' : 'none';
  // Chat nav: visible for CLINIC nutritionists AND patients linked to a clinic nutritionist (not for Pro nutritionists)
  const showChat = isNutritionistClinic() || isPatientClinic();
  document.getElementById('nav-chat').style.display = showChat ? 'flex' : 'none';

  // Nutritionist type badge in sidebar
  const planChip = document.getElementById('sidebarPlanChip');
  if (planChip && role === 'nutritionist') {
    if (isNutritionistClinic()) {
      planChip.style.outline = '2px solid #4db6ac';
      planChip.title = 'Nutricionista Clínica — acesso completo';
    } else {
      planChip.style.outline = '2px solid #ffd54f';
      planChip.title = 'Nutricionista Pro — até 15 pacientes';
    }
  } else {
    if (planChip) planChip.style.outline = '';
  }

  document.getElementById('nav-admin').style.display = isAdm ? 'flex' : 'none';
  document.getElementById('navGroupAdmin').style.display = isAdm ? 'block' : 'none';

  // Adicionar receita: apenas standard pro, nutricionistas e admin
  document.getElementById('addRecipeBtn').style.display = canAddRecipe() ? 'flex' : 'none';
  document.getElementById('myRecipesBtn').style.display = canAddRecipe() ? 'flex' : 'none';
  // AI recipe button: visible to all who can use recipes
  const aiRecipeBtn = document.getElementById('aiRecipeBtn');
  if (aiRecipeBtn) aiRecipeBtn.style.display = canUseRecipes() ? 'inline-flex' : 'none';

  // Patient-specific: show nutritionist card in diary
  if (role === 'patient' && currentProfile?.nutritionist_id) {
    document.getElementById('nutritionistCard').style.display = 'flex';
  }

  // Show "for patient" visibility option for professionals
  if (isProf) {
    document.getElementById('visPatient').style.display = 'flex';
  }

  // Hide upgrade button for high plans / show become nutritionist for pro standard
  const plan = getUserPlan();
  const hideUpgrade = plan === 'clinic' || plan === 'admin' || isNutritionistClinic() || isNutritionistPro() || isPatient();
  const sidebarUpgradeBtn = document.getElementById('sidebarUpgradeBtn');
  if (hideUpgrade) {
    sidebarUpgradeBtn.style.display = 'none';
  } else if (isStandardPro()) {
    // Standard Pro user sees "Become Nutritionist" button
    sidebarUpgradeBtn.style.display = 'block';
    sidebarUpgradeBtn.textContent = '🩺 Virar Nutricionista';
    sidebarUpgradeBtn.onclick = () => openNutritionistRequest();
  } else {
    sidebarUpgradeBtn.style.display = 'block';
    sidebarUpgradeBtn.textContent = currentLang === 'en' ? '⬆ Upgrade Plan' : '⬆ Fazer Upgrade';
    sidebarUpgradeBtn.onclick = () => openUpgradeModal();
  }

  // Hide upgrade item in dropdown for users who don't need it
  const dropdownUpgradeBtn = document.getElementById('dropdownUpgradeBtn');
  if (dropdownUpgradeBtn) {
    if (hideUpgrade) {
      dropdownUpgradeBtn.style.display = 'none';
    } else if (isStandardPro()) {
      dropdownUpgradeBtn.style.display = 'flex';
      dropdownUpgradeBtn.querySelector('span:last-child').textContent = currentLang === 'en' ? 'Become Nutritionist' : 'Virar Nutricionista';
      dropdownUpgradeBtn.onclick = () => { openNutritionistRequest(); closeDropdown(); };
    } else {
      dropdownUpgradeBtn.style.display = 'flex';
      dropdownUpgradeBtn.querySelector('span:last-child').textContent = t('menu_upgrade');
      dropdownUpgradeBtn.onclick = () => { openUpgradeModal(); closeDropdown(); };
    }
  }
}

function applyPlanRestrictions() {
  if (isAdmin()) return;
  // Paywall visual: oculta botões pro-only para free
  const showDiary   = canUseDiary();
  const showCamera  = canUseCamera();
  const showRecipes = canUseRecipes();

  // Badge de plano na sidebar
  const plan = getUserPlan();
  const role = getUserRole();
  let planLabel = 'Gratuito';
  if (isAdmin()) planLabel = 'Admin';
  else if (isNutritionistClinic()) planLabel = 'Nutricionista Clínica';
  else if (isNutritionistPro()) planLabel = 'Nutricionista Pro';
  else if (isPatientClinic()) planLabel = 'Paciente Clínica';
  else if (isPatient()) planLabel = 'Paciente Pro';
  else if (isStandardPro()) planLabel = 'Standard Pro';

  // Mostrar paywall nos panels se free
  const bottomCamera = document.getElementById('bnav-camera');
  const bottomDiary  = document.getElementById('bnav-diary');
  const bottomRecipes= document.getElementById('bnav-recipes');
  if (bottomCamera) bottomCamera.style.opacity = showCamera ? '1' : '0.45';
  if (bottomDiary)  bottomDiary.style.opacity  = showDiary  ? '1' : '0.45';
  if (bottomRecipes)bottomRecipes.style.opacity= showRecipes? '1' : '0.45';
}

// Garante que o painel de perfil sempre reflita os dados mais recentes salvos
function fillProfilePanel() {
  renderSidebarUser();
  loadMyNutritionistRequestStatus();
}

// Preenche a Calculadora Calórica com os dados já salvos no perfil do usuário
function fillCalcFromProfile() {
  if (!currentProfile) return;
  if (currentProfile.sex)    document.getElementById('calcSex').value = currentProfile.sex;
  if (currentProfile.age)    document.getElementById('calcAge').value = currentProfile.age;
  if (currentProfile.weight) document.getElementById('calcWeight').value = currentProfile.weight;
  if (currentProfile.height) document.getElementById('calcHeight').value = currentProfile.height;
  
  const bfInput = document.getElementById('calcBodyFat');
  const bfUnknown = document.getElementById('calcBodyFatUnknown');
  if (bfInput && bfUnknown) {
    if (currentProfile.body_fat_pct !== undefined && currentProfile.body_fat_pct !== null) {
      bfInput.value = currentProfile.body_fat_pct;
      bfInput.disabled = false;
      bfUnknown.checked = false;
    } else {
      bfInput.value = '';
      bfInput.disabled = true;
      bfUnknown.checked = true;
    }
  }
}

function renderSidebarUser() {
  const plan = getUserPlan();
  const metaName = currentUser?.user_metadata?.name || currentUser?.user_metadata?.full_name || '';
  const name = (currentProfile?.name && currentProfile.name.trim()) ? currentProfile.name.trim() : (metaName || currentUser?.email?.split('@')[0] || '');
  const initials = name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase() || '?';
  // Gera label do plano baseado no role + plan
  function _getPlanLabel() {
    if (isAdmin()) return '<i class="fa-solid fa-gear ic-admin"></i> Admin';
    if (isNutritionistClinic()) return '<i class="fa-solid fa-hospital ic-stethoscope"></i> Nut. Clínica';
    if (isNutritionistPro()) return '<i class="fa-solid fa-user-doctor ic-stethoscope"></i> Nut. Pro';
    if (isPatientClinic()) return '<i class="fa-solid fa-star ic-star"></i> Paciente+';
    if (isPatient()) return '<i class="fa-solid fa-star ic-star"></i> Paciente';
    if (isStandardPro()) return '<i class="fa-solid fa-star ic-star"></i> Pro';
    return '<i class="fa-solid fa-seedling ic-leaf"></i> Gratuito';
  }
  function _getPlanClass() {
    if (isAdmin()) return 'chip-admin';
    if (isNutritionistClinic()) return 'chip-clinic';
    if (isNutritionistPro()) return 'chip-pro';
    if (isPatient()) return 'chip-pro';
    if (isStandardPro()) return 'chip-pro';
    return 'chip-free';
  }
  function _getPlanBadgeText() {
    if (isAdmin()) return 'Admin';
    if (isNutritionistClinic()) return 'Nut. Clínica';
    if (isNutritionistPro()) return 'Nut. Pro';
    if (isPatientClinic()) return 'Paciente+';
    if (isPatient()) return 'Paciente';
    if (isStandardPro()) return 'Pro';
    return 'Gratuito';
  }
  function _getPlanBadgeClass() {
    if (isAdmin()) return 'badge-admin';
    if (isNutritionistClinic()||isNutritionistPro()) return 'badge-clinic';
    if (isPatient()||isStandardPro()) return 'badge-pro';
    return 'badge-free';
  }

  // Sidebar
  const sidebarPlanChip = document.getElementById('sidebarPlanChip');
  if (sidebarPlanChip) {
    sidebarPlanChip.innerHTML = _getPlanLabel();
    sidebarPlanChip.className = 'plan-chip-sidebar ' + _getPlanClass();
  }
  const sidebarUserName = document.getElementById('sidebarUserName');
  if (sidebarUserName) sidebarUserName.textContent = name;

  // Avatar
  const avatarBtn = document.getElementById('userAvatarBtn');
  if (currentProfile?.avatar_url) {
    if (currentProfile.avatar_url.startsWith('__emoji__')) {
      const parts = currentProfile.avatar_url.split('__').filter(Boolean); // ['emoji', '🐱', 'bg', '#fff']
      const emoji = parts[1]; const bg = parts[2];
      avatarBtn.innerHTML = `<span style="font-size:1.1rem;line-height:1;">${emoji}</span>`;
      avatarBtn.style.background = bg;
    } else {
      avatarBtn.innerHTML = `<img src="${currentProfile.avatar_url}" alt="${name}">`;
      avatarBtn.style.background = '';
    }
  } else {
    document.getElementById('userInitials').textContent = initials;
    avatarBtn.style.background = '';
  }

  // Dropdown
  document.getElementById('dropdownName').textContent = name || currentUser?.email?.split('@')[0] || '—';
  document.getElementById('dropdownEmail').textContent = currentUser?.email || '—';
  const badge = document.getElementById('dropdownPlanBadge');
  badge.textContent = _getPlanBadgeText();
  badge.className = 'plan-badge-inline ' + _getPlanBadgeClass();

  // Profile panel
  // Exibe @username e plano abaixo do avatar
  const uname = currentProfile?.username || '';
  const udisp = document.getElementById('profileUsernameDisplay');
  if (udisp) udisp.textContent = uname ? '@' + uname : '';
  const pbadge = document.getElementById('profilePlanBadgeDisplay');
  if (pbadge) pbadge.innerHTML = _getPlanLabel().replace('ic-admin','ic-stethoscope').replace('ic-search','ic-leaf') || '';

  document.getElementById('profileUsername') && (document.getElementById('profileUsername').value = uname);
  document.getElementById('profileName').value = currentProfile?.name || '';
  document.getElementById('profileEmail').value = currentUser?.email || '';
  document.getElementById('profileSex').value = currentProfile?.sex || 'f';
  document.getElementById('profileAge').value = currentProfile?.age || '';
  document.getElementById('profileWeight').value = currentProfile?.weight || '';
  document.getElementById('profileHeight').value = currentProfile?.height || '';
  document.getElementById('profileInitialsBig').textContent = initials;
  if (currentProfile?.avatar_url) {
    const bigDiv = document.getElementById('profileAvatarBig');
    if (currentProfile.avatar_url.startsWith('__emoji__')) {
      const parts = currentProfile.avatar_url.split('__').filter(Boolean);
      const emoji = parts[1]; const bg = parts[2];
      bigDiv.style.background = bg;
      bigDiv.innerHTML = `<span style="font-size:2.2rem;">${emoji}</span><div class="avatar-upload-overlay"><i class="fa-solid fa-camera ic-camera"></i></div>`;
    } else {
      bigDiv.innerHTML = `<img src="${currentProfile.avatar_url}" alt="${name}"><div class="avatar-upload-overlay"><i class="fa-solid fa-camera ic-camera"></i></div>`;
      bigDiv.style.background = '';
    }
    bigDiv.onclick = () => document.getElementById('avatarInput').click();
  }

  // Hide become nutritionist if already one
  if (isProfessional() || isAdmin()) {
    document.getElementById('becomeNutritionistCard').style.display = 'none';
    const dbn = document.getElementById('dropdownBecomeNut');
    if (dbn) dbn.style.display = 'none';
  }
}

// Expor funções e limites para o escopo global
window.getUserPlan = getUserPlan;
window.getUserRole = getUserRole;
window.isStandardFree = isStandardFree;
window.isStandardPro = isStandardPro;
window.isPatient = isPatient;
window.isPatientClinic = isPatientClinic;
window.isNutritionistPro = isNutritionistPro;
window.isNutritionistClinic = isNutritionistClinic;
window.isProfessional = isProfessional;
window.isAdmin = isAdmin;
window.isClinic = isClinic;
window.isPro = isPro;
window.canUseDiary = canUseDiary;
window.canUseCamera = canUseCamera;
window.canUseRecipes = canUseRecipes;
window.canAddRecipe = canAddRecipe;
window.canUseCompare = canUseCompare;
window.canUsePatientPanel = canUsePatientPanel;
window.canUseClinicFeatures = canUseClinicFeatures;
window.canUsePdfReport = canUsePdfReport;
window.canSeeNutritionistReports = canSeeNutritionistReports;
window.PLAN_LIMITS = PLAN_LIMITS;
window.setupRoleUI = setupRoleUI;
window.applyPlanRestrictions = applyPlanRestrictions;
window.fillProfilePanel = fillProfilePanel;
window.fillCalcFromProfile = fillCalcFromProfile;
window.renderSidebarUser = renderSidebarUser;


