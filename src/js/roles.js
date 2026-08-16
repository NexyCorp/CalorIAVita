// ═══════════════════════════════════════
// ROLE / PLAN SETUP
// ═══════════════════════════════════════
function getUserPlan() { return currentProfile?.plan || 'free'; }
function getUserRole() { return currentProfile?.role || 'standard'; }

// ── Hierarquia de planos ──────────────────────────────────
// standard free      → plan:'free',  role:'standard'
// standard pro       → plan:'pro',   role:'standard'
// Professional Basic → plan:'pro',   role:'professional'
// Professional Gold  → plan:'gold',  role:'professional'
// patient vinculado a Professional Basic → plan:'patient_basic',   role:'patient'
// patient vinculado a Professional Gold  → plan:'patient_gold', role:'patient'

// ── Nota: legado (patient_clinic, nutritionist role, clinic plan) mantido como fallback ──
function isStandardFree()       { return getUserRole()==='standard' && getUserPlan()==='free'; }
function isStandardPro()        { return getUserRole()==='standard' && (getUserPlan()==='pro'||getUserPlan()==='standard_pro'); }
function isPatient()            { return getUserRole()==='patient'; }
function isPatientBasic()       { return getUserRole()==='patient' && (getUserPlan()==='patient_basic'||getUserPlan()==='patient_pro'); } // basic = vinculado a Prof. Basic
function isPatientGold()        { return getUserRole()==='patient' && (getUserPlan()==='patient_gold'||getUserPlan()==='patient_clinic'||getUserPlan()==='gold'); } // gold = vinculado a Prof. Gold
function isProfessionalGold()   { return (getUserRole()==='professional'||getUserRole()==='nutritionist') && (getUserPlan()==='gold'||getUserPlan()==='clinic'||getUserPlan()==='admin'); }
function isProfessionalBasic()  { return (getUserRole()==='professional'||getUserRole()==='nutritionist') && getUserPlan()==='pro'; }
function isProfessional()       { return ['professional','nutritionist','admin'].includes(getUserRole()); }
function isAdmin()              { return getUserRole()==='admin' || getUserPlan()==='admin'; }
function isGold()               { return isProfessionalGold() || isAdmin(); }
// Aliases de compatibilidade (isNutritionistClinic = Professional Gold, isNutritionistPro = Professional Basic)
function isNutritionistClinic() { return isProfessionalGold(); }
function isNutritionistPro()    { return isProfessionalBasic(); }
function isPatientClinic()      { return isPatientGold(); }

// isPro() = tem pelo menos o plano standard pro (ou superior)
function isPro() {
  if (isAdmin()) return true;
  if (isProfessional()) return true;     // profissionais sempre têm acesso pro ao menos
  if (isPatient()) return true;          // pacientes vinculados têm acesso ao app
  const p = getUserPlan();
  return p==='pro'||p==='gold'||p==='clinic'||p==='standard_pro'||p==='nutritionist_pro'||p==='nutritionist_clinic';
}

// Funções de acesso por feature
function canUseDiary()         { return !isStandardFree(); }
function canUseCamera()        { return !isStandardFree(); }
function canUseRecipes()       { return !isStandardFree(); }
function canAddRecipe()        { return isStandardPro()||isProfessional()||isAdmin(); }
function canUseCompare()       { return true; } // todos
function canUsePatientPanel()  { return isProfessional()||isAdmin(); }
function canUseClinicFeatures(){ return isProfessionalGold()||isAdmin(); } // prontuário, relatórios clínicos
function canUsePdfReport()     { return isStandardPro()||isProfessional()||isAdmin(); }
function canSeeNutritionistReports() { return isPatientGold(); } // paciente gold vê mais dados

const PLAN_LIMITS = {
  free:              { patients:0,  cameraMonth:3,   label:'Gratuito' },
  pro:               { patients:15, cameraMonth:999, label:'Pro' },
  standard_pro:      { patients:0,  cameraMonth:999, label:'Pro' },
  professional_basic:  { patients:15, cameraMonth:999, label:'Professional Basic' },
  professional_gold:{ patients:999,cameraMonth:999,label:'Professional Gold' },
  gold:              { patients:999,cameraMonth:999, label:'Gold' },
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
  // Chat nav: visible for Professional Gold AND patients linked to a Gold nutritionist
  const showChat = isProfessionalGold() || isPatientGold();
  document.getElementById('nav-chat').style.display = showChat ? 'flex' : 'none';

  // Professional plan badge in sidebar
  const planChip = document.getElementById('sidebarPlanChip');
  if (planChip && role === 'professional') {
    if (isProfessionalGold()) {
      planChip.style.outline = '2px solid #4db6ac';
      planChip.title = 'Professional Gold — acesso completo';
    } else {
      planChip.style.outline = '2px solid #ffd54f';
      planChip.title = 'Professional Basic — painel de pacientes';
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
  const hideUpgrade = plan === 'gold' || plan === 'admin' || isProfessionalGold() || isProfessionalBasic() || isPatient();
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
  else if (isProfessionalGold()) planLabel = 'Professional Gold';
  else if (isProfessionalBasic()) planLabel = 'Professional Basic';
  else if (isPatientGold()) planLabel = 'Paciente+';
  else if (isPatient()) planLabel = 'Paciente';
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
    if (isProfessionalGold()) return '<i class="fa-solid fa-hospital ic-stethoscope"></i> Prof. Gold';
    if (isProfessionalBasic()) return '<i class="fa-solid fa-user-doctor ic-stethoscope"></i> Prof. Basic';
    if (isPatientGold()) return '<i class="fa-solid fa-star ic-star"></i> Paciente Gold';
    if (isPatient()) return '<i class="fa-solid fa-star ic-star"></i> Paciente';
    if (isStandardPro()) return '<i class="fa-solid fa-star ic-star"></i> Standard Pro';
    return '<i class="fa-solid fa-seedling ic-leaf"></i> Gratuito';
  }
  function _getPlanClass() {
    if (isAdmin()) return 'chip-admin';
    if (isProfessionalGold()) return 'chip-clinic';
    if (isProfessionalBasic()) return 'chip-pro';
    if (isPatient()) return 'chip-pro';
    if (isStandardPro()) return 'chip-pro';
    return 'chip-free';
  }
  function _getPlanBadgeText() {
    if (isAdmin()) return 'Admin';
    if (isProfessionalGold()) return 'Prof. Gold';
    if (isProfessionalBasic()) return 'Prof. Basic';
    if (isPatientGold()) return 'Paciente Gold';
    if (isPatient()) return 'Paciente';
    if (isStandardPro()) return 'Standard Pro';
    return 'Gratuito';
  }
  function _getPlanBadgeClass() {
    if (isAdmin()) return 'badge-admin';
    if (isProfessionalGold()||isProfessionalBasic()) return 'badge-clinic';
    if (isPatientGold()||isPatient()||isStandardPro()) return 'badge-pro';
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
  const ddName = document.getElementById('dropdownName');
  if (ddName) ddName.textContent = name || currentUser?.email?.split('@')[0] || '—';
  const ddEmail = document.getElementById('dropdownEmail');
  if (ddEmail) ddEmail.textContent = currentUser?.email || '—';
  const badge = document.getElementById('dropdownPlanBadge');
  if (badge) {
    badge.textContent = _getPlanBadgeText();
    badge.className = 'plan-badge-inline ' + _getPlanBadgeClass();
  }

  // Profile panel
  // Exibe @username e plano abaixo do avatar
  const uname = currentProfile?.username || '';
  const udisp = document.getElementById('profileUsernameDisplay');
  if (udisp) udisp.textContent = uname ? '@' + uname : '';
  const pbadge = document.getElementById('profilePlanBadgeDisplay');
  if (pbadge) pbadge.innerHTML = _getPlanLabel().replace('ic-admin','ic-stethoscope').replace('ic-search','ic-leaf') || '';

  const elPName = document.getElementById('profileUsername'); if (elPName) elPName.value = uname;
  const elPFullName = document.getElementById('profileName'); if (elPFullName) elPFullName.value = currentProfile?.name || '';
  const elPEmail = document.getElementById('profileEmail'); if (elPEmail) elPEmail.value = currentUser?.email || '';
  const elPSex = document.getElementById('profileSex'); if (elPSex) elPSex.value = currentProfile?.sex || 'f';
  const elPAge = document.getElementById('profileAge'); if (elPAge) elPAge.value = currentProfile?.age || '';
  const elPWeight = document.getElementById('profileWeight'); if (elPWeight) elPWeight.value = currentProfile?.weight || '';
  const elPHeight = document.getElementById('profileHeight'); if (elPHeight) elPHeight.value = currentProfile?.height || '';
  
  const pInitials = document.getElementById('profileInitialsBig');
  if (pInitials) pInitials.textContent = initials;

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

  // Apply patient-specific UI restrictions (Items 17, 18, 19)
  if (typeof window._applyPatientUIRestrictions === 'function') window._applyPatientUIRestrictions();
}

// Helper for plan naming
function getPlanLabel(role, plan) {
  if (plan === 'admin' || role === 'admin') return 'Admin';
  if (role === 'professional') {
    return plan === 'gold' || plan === 'clinic' ? 'Professional Gold' : 'Professional Basic';
  }
  if (role === 'patient') {
    return plan === 'patient_gold' || plan === 'patient_clinic' ? 'Paciente Gold' : 'Paciente';
  }
  if (plan === 'pro' || plan === 'standard_pro') return 'Standard Pro';
  return 'Gratuito';
}
window.getPlanLabel = getPlanLabel;

// Expor funções e limites para o escopo global
window.getUserPlan = getUserPlan;
window.getUserRole = getUserRole;
window.isStandardFree = isStandardFree;
window.isStandardPro = isStandardPro;
window.isPatient = isPatient;
window.isPatientGold = isPatientGold;
window.isPatientClinic = isPatientClinic;
window.isProfessionalBasic = isProfessionalBasic;
window.isProfessionalGold = isProfessionalGold;
window.isNutritionistPro = isNutritionistPro;       // alias → isProfessionalBasic
window.isNutritionistClinic = isNutritionistClinic; // alias → isProfessionalGold
window.isProfessional = isProfessional;
window.isAdmin = isAdmin;
window.isGold = isGold;
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


