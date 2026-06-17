// ═══════════════════════════════════════
// STATE
// ═══════════════════════════════════════
// Variáveis de estado globais declaradas em globals.js


function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[ch]));
}

// ═══════════════════════════════════════
// i18n
// ═══════════════════════════════════════
const i18n = {
  pt: {
    nav_tools:'Ferramentas', nav_search:'Pesquisar', nav_diary:'Diário', nav_goal:'Meta & Calc.',
    nav_camera:'Câmera IA', nav_compare:'Comparar', nav_recipes:'Receitas',
    nav_professional:'Profissional', nav_patients:'Pacientes', nav_more:'Mais',
    menu_profile:'Meu Perfil', menu_upgrade:'Planos & Upgrade', menu_become_nut:'Ser Nutricionista', menu_logout:'Sair',
    search_title:'Busca Nutricional', search_sub:'Pesquise qualquer alimento e veja informações nutricionais completas',
    search_ph:'Ex: arroz branco, banana, frango...', search_btn:'Buscar', qty_label:'Quantidade:',
    add_to_diary:'Adicionar ao Diário', nav_goal:'Meta & Calculadora',
    calc_title:'Calculadora Calórica', calc_sub:'Calcule seu metabolismo e meta diária',
    sex:'Sexo', male:'Masculino', female:'Feminino', age:'Idade (anos)', weight:'Peso (kg)', height:'Altura (cm)',
    activity:'Nível de Atividade', objective:'Objetivo', lose:'Emagrecer', maintain:'Manter', gain:'Ganhar',
    weekly_goal:'Meta Semanal', weekly_goal_sub:'Acompanhe seu progresso ao longo da semana',
    daily_goal_kcal:'Meta diária (kcal)',
    camera_title:'Análise por Câmera IA', camera_sub:'Tire uma foto e a IA identifica as calorias',
    camera_tap:'Toque para tirar foto', analyze:'Analisar com IA', analyzing:'Analisando...',
    compare_title:'Comparar Alimentos', compare_sub:'Compare dois alimentos por 100g', compare_btn:'Comparar', comparing:'Comparando...',
    recipes_title:'Receitas', recipes_sub:'Receitas saudáveis com informações nutricionais',
    add_recipe:'Nova Receita', recipe_name:'Nome da Receita', ingredients:'Ingredientes',
    steps:'Modo de preparo', visibility:'Visibilidade', public:'Pública', private:'Privada',
    for_patient:'Para Paciente', select_patient:'Selecionar Paciente', category:'Categoria',
    my_recipes:'Minhas Receitas', all:'Todos',
    patients_title:'Meus Pacientes', patients_sub:'Gerencie pacientes e acompanhe o progresso',
    invite_patient:'Convidar Paciente por E-mail',
    invite_patient_desc:'O paciente receberá um e-mail com instruções para criar conta e ficará vinculado a você com acesso Pro.',
    patients_list:'Lista', loading:'Carregando...',
    choose_plan:'Escolha seu plano', choose_plan_sub:'Desbloqueie mais funcionalidades',
    profile_title:'Meu Perfil', full_name:'Nome completo', language:'Idioma',
    become_nut_title:'Quero ser Nutricionista', become_nut_desc:'Envie suas credenciais profissionais para análise.',
    linked_nutritionist:'Nutricionista responsável',
    kcal_consumed:'kcal consumidas', goal_label:'meta:', breakfast:'Café da manhã',
    lunch:'Almoço', snack:'Lanche', dinner:'Jantar', carbs:'Carboidratos', protein:'Proteínas', fat:'Gorduras',
    no_food:'Nenhum alimento adicionado', add:'Adicionar', clear:'Limpar',
    diary_add_ph:'Pesquisar alimento...', protein:'Proteínas',
    change_password_title:'Trocar Senha', change_password_desc:'Para continuar, você precisa criar uma senha pessoal diferente da senha temporária que recebeu.',
    new_password:'Nova Senha *', confirm_new_password:'Confirmar Nova Senha *', confirm_pwd_ph:'Repita a senha',
    save_new_password:'Salvar Nova Senha',
    create_patient_title:'Cadastrar Paciente', create_patient_desc:'Crie a conta do paciente diretamente. Na primeira entrada ele deverá trocar a senha.',
    click_add_photo:'Clique para adicionar foto', full_name_req:'Nome Completo *', patient_name_ph:'Nome do paciente',
    email_req:'E-mail *', other_sex:'Outro', goal_objective:'Objetivo',
    temp_password:'Senha Temporária *', temp_password_hint:'(mín. 6 caracteres — paciente irá trocar no 1º login)',
    temp_password_ph:'Senha temporária', create_patient_btn:'Criar Paciente', create_patient_btn_2:'Cadastrar Novo Paciente',
    // Chat / Canal
    chat_subtitle_prof:'Converse com seus pacientes, envie receitas e PDFs',
    chat_subtitle_patient:'Receba receitas, PDFs e mensagens da sua nutricionista',
    chat_select_patient:'Selecionar paciente...',
    chat_select_patient_prompt:'Selecione um paciente para ver o canal.',
    chat_loading:'Carregando...',
    chat_table_missing:'Tabela <code>chat_messages</code> nao existe.',
    chat_see_sql:'Veja o SQL no console (F12).',
    chat_no_messages:'Nenhuma mensagem ainda. Diga ola! 👋',
    chat_select_patient_first:'Selecione um paciente primeiro',
    chat_sending_pdf:'Enviando PDF...',
    chat_pdf_sent:'PDF enviado!',
    chat_send_error:'Erro ao enviar: ',
    chat_default_partner:'sua Nutricionista',
    chat_default_patient_name:'Paciente',
    chat_doc_default:'Documento.pdf',
    chat_pdf_unavailable:'(link indisponivel)',
    chat_shared_recipe:'Receita compartilhada',
    chat_pdf_input_placeholder:'Anexar PDF',
    chat_input_placeholder:'Escreva uma mensagem...',
    chat_clinic_badge:'🏥 Clínica', chat_pro_badge:'⭐ Pro', chat_title_prefix:'Canal com',
    chat_photo_input_placeholder:'Enviar Foto',
    chat_sending_photo:'Enviando foto...',
    chat_photo_upload_error:'Erro ao enviar foto: ',
    chat_pdf_upload_error:'Erro ao enviar PDF: ',
    send_announcement_btn:'Enviar Aviso',
    announcement_title:'Enviar Aviso',
    announcement_sub:'Este aviso aparecerá como um popup na tela inicial do(s) paciente(s).',
    announcement_recipient:'Destinatário',
    announcement_all_patients:'Todos os meus pacientes',
    announcement_message_label:'Mensagem',
    announcement_message_ph:'Escreva o aviso...',
    announcement_send_btn:'Enviar Aviso',
    announcement_popup_title:'Aviso da sua Nutricionista',
    announcement_popup_ok:'Entendi',
    announcement_empty_error:'Escreva uma mensagem.',
    announcement_no_patients_error:'Nenhum paciente vinculado.',
    announcement_sent:'Aviso enviado!',
    announcement_table_missing:'Tabela de avisos nao existe. Veja o SQL no console (F12).',
    ai_recipe_btn:'🤖 IA Cria Receita',
  },
  en: {
    nav_tools:'Tools', nav_search:'Search', nav_diary:'Diary', nav_goal:'Goal & Calc.',
    nav_camera:'AI Camera', nav_compare:'Compare', nav_recipes:'Recipes',
    nav_professional:'Professional', nav_patients:'Patients', nav_more:'More',
    menu_profile:'My Profile', menu_upgrade:'Plans & Upgrade', menu_become_nut:'Become Nutritionist', menu_logout:'Sign out',
    search_title:'Nutrition Search', search_sub:'Search any food and see full nutritional info',
    search_ph:'E.g.: white rice, banana, chicken...', search_btn:'Search', qty_label:'Quantity:',
    add_to_diary:'Add to Diary', nav_goal:'Goal & Calculator',
    calc_title:'Calorie Calculator', calc_sub:'Calculate your metabolism and daily calorie goal',
    sex:'Sex', male:'Male', female:'Female', age:'Age (years)', weight:'Weight (kg)', height:'Height (cm)',
    activity:'Activity Level', objective:'Goal', lose:'Lose weight', maintain:'Maintain', gain:'Gain mass',
    weekly_goal:'Weekly Goal', weekly_goal_sub:'Track your progress throughout the week',
    daily_goal_kcal:'Daily goal (kcal)',
    camera_title:'AI Camera Analysis', camera_sub:'Take a photo and AI identifies calories',
    camera_tap:'Tap to take a photo', analyze:'Analyze with AI', analyzing:'Analyzing...',
    compare_title:'Compare Foods', compare_sub:'Compare two foods side by side per 100g', compare_btn:'Compare', comparing:'Comparing...',
    recipes_title:'Recipes', recipes_sub:'Healthy recipes with nutritional info',
    add_recipe:'New Recipe', recipe_name:'Recipe Name', ingredients:'Ingredients',
    steps:'Instructions', visibility:'Visibility', public:'Public', private:'Private',
    for_patient:'For Patient', select_patient:'Select Patient', category:'Category',
    my_recipes:'My Recipes', all:'All',
    patients_title:'My Patients', patients_sub:'Manage patients and track their progress',
    invite_patient:'Invite Patient by Email',
    invite_patient_desc:'The patient will receive an email with instructions to create an account and will be linked to you with free Pro access.',
    patients_list:'List', loading:'Loading...',
    choose_plan:'Choose your plan', choose_plan_sub:'Unlock more features',
    profile_title:'My Profile', full_name:'Full name', language:'Language',
    become_nut_title:'Become a Nutritionist', become_nut_desc:'Send your professional credentials for review.',
    linked_nutritionist:'Your nutritionist',
    kcal_consumed:'kcal consumed', goal_label:'goal:', breakfast:'Breakfast',
    lunch:'Lunch', snack:'Snack', dinner:'Dinner', carbs:'Carbs', protein:'Protein', fat:'Fat',
    no_food:'No food added yet', add:'Add', clear:'Clear',
    diary_add_ph:'Search food...', protein:'Protein',
    change_password_title:'Change Password', change_password_desc:'To continue, you need to set a personal password different from the temporary one you received.',
    new_password:'New Password *', confirm_new_password:'Confirm New Password *', confirm_pwd_ph:'Repeat the password',
    save_new_password:'Save New Password',
    create_patient_title:'Register Patient', create_patient_desc:'Create the patient account directly. On first login they will need to change their password.',
    click_add_photo:'Click to add a photo', full_name_req:'Full Name *', patient_name_ph:'Patient name',
    email_req:'Email *', other_sex:'Other', goal_objective:'Goal',
    temp_password:'Temporary Password *', temp_password_hint:'(min. 6 characters — patient will change it on first login)',
    temp_password_ph:'Temporary password', create_patient_btn:'Create Patient', create_patient_btn_2:'Register New Patient',
    // Extra UI strings for full EN support
    upgrade_btn:'⬆ Upgrade Plan', become_nutritionist_btn:'🩺 Become Nutritionist',
    ai_recipe_btn:'🤖 AI Recipe Suggestion', share_recipe:'Share Recipe (PDF)',
    recipe_total_weight:'Total weight', notify_nutritionist:'Your nutritionist was notified!',
    recipe_photos:'Recipe Photos', add_photos:'Add Photos',
    set_patient_goal:'Set Patient Goals', calorie_goal:'Calorie Goal (kcal)',
    protein_goal:'Protein Goal (g)', carbs_goal:'Carbs Goal (g)', fat_goal:'Fat Goal (g)',
    save_goals:'Save Goals', goals_saved:'Goals saved!',
    craving_title:'What are you craving?', craving_desc:'Tell us what you want and the AI will create a recipe for you.',
    craving_food:'What are you craving?', craving_kcal:'Max calories', craving_prot:'Min protein (g)',
    craving_btn:'Create AI Recipe', craving_generating:'Generating recipe...',
    send_to_all:'Available to all my patients', send_to_patient:'Send to specific patient',
    recipe_private:'Private (only you)', recipe_visibility:'Who can see this recipe?',
    // Chat / Canal
    chat_subtitle_prof:'Chat with your patients, send recipes and PDFs',
    chat_subtitle_patient:'Receive recipes, PDFs and messages from your nutritionist',
    chat_select_patient:'Select a patient...',
    chat_select_patient_prompt:'Select a patient to view the channel.',
    chat_loading:'Loading...',
    chat_table_missing:'Table <code>chat_messages</code> does not exist.',
    chat_see_sql:'See the SQL in the console (F12).',
    chat_no_messages:'No messages yet. Say hi! 👋',
    chat_select_patient_first:'Select a patient first',
    chat_sending_pdf:'Sending PDF...',
    chat_pdf_sent:'PDF sent!',
    chat_send_error:'Error sending: ',
    chat_default_partner:'your Nutritionist',
    chat_default_patient_name:'Patient',
    chat_doc_default:'Document.pdf',
    chat_pdf_unavailable:'(link unavailable)',
    chat_shared_recipe:'Shared recipe',
    chat_pdf_input_placeholder:'Attach PDF',
    chat_input_placeholder:'Write a message...',
    chat_clinic_badge:'🏥 Clinic', chat_pro_badge:'⭐ Pro', chat_title_prefix:'Channel with',
    chat_photo_input_placeholder:'Send Photo',
    chat_sending_photo:'Sending photo...',
    chat_photo_upload_error:'Error sending photo: ',
    chat_pdf_upload_error:'Error sending PDF: ',
    send_announcement_btn:'Send Announcement',
    announcement_title:'Send Announcement',
    announcement_sub:'This message will appear as a popup on the patient\'s home screen.',
    announcement_recipient:'Recipient',
    announcement_all_patients:'All my patients',
    announcement_message_label:'Message',
    announcement_message_ph:'Write the announcement...',
    announcement_send_btn:'Send Announcement',
    announcement_popup_title:'Message from your Nutritionist',
    announcement_popup_ok:'Got it',
    announcement_empty_error:'Write a message.',
    announcement_no_patients_error:'No linked patients.',
    announcement_sent:'Announcement sent!',
    announcement_table_missing:'Announcements table does not exist. See SQL in console (F12).',
  }
};

function t(key) { return (i18n[currentLang] || i18n.pt)[key] || key; }

function applyLanguage() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (i18n[currentLang][key]) el.textContent = i18n[currentLang][key];
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    const key = el.dataset.i18nPh;
    if (i18n[currentLang][key]) el.placeholder = i18n[currentLang][key];
  });
  document.getElementById('langBtnPT').classList.toggle('active', currentLang === 'pt');
  document.getElementById('langBtnEN').classList.toggle('active', currentLang === 'en');

  // Bottom nav labels
  const bnavMap = { 'bnav-home': 'home', 'bnav-search': 'nav_search', 'bnav-diary': 'nav_diary', 'bnav-camera': 'nav_camera', 'bnav-more': 'nav_more' };
  Object.entries(bnavMap).forEach(([id, key]) => {
    const btn = document.getElementById(id);
    const span = btn?.querySelector('.bottom-nav-label');
    const label = key === 'home' ? (currentLang === 'en' ? 'Home' : 'Início') : i18n[currentLang][key];
    if (span && label) span.textContent = label;
  });

  // Sidebar nav labels with data-i18n already handled; fix hardcoded ones
  document.querySelectorAll('.nav-item span[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (i18n[currentLang][key]) el.textContent = i18n[currentLang][key];
  });

  // AI recipe button
  const aiRecipeBtn = document.getElementById('aiRecipeBtn');
  if (aiRecipeBtn && i18n[currentLang].ai_recipe_btn) aiRecipeBtn.textContent = i18n[currentLang].ai_recipe_btn;

  // Specialty dropdown button
  const nutSpecBtn = document.getElementById('dropdownNutSpecialtyBtn');
  if (nutSpecBtn) {
    const label = nutSpecBtn.querySelector('span:last-child');
    if (label) label.textContent = currentLang === 'en' ? 'My Specialty' : 'Minha Especialidade';
  }

  // Refresh topbar title for active panel
  const activePanel = document.querySelector('.panel.active');
  if (activePanel) {
    const name = activePanel.id.replace('panel-', '');
    const title = panelTitles[name];
    if (title) document.getElementById('topbarTitle').textContent = typeof title === 'function' ? title() : title;
  }

  // Translate static hardcoded strings when in English
  if (currentLang === 'en') {
    // Sidebar footer upgrade btn label (re-set based on role)
    const sidebarUpgradeBtn = document.getElementById('sidebarUpgradeBtn');
    if (sidebarUpgradeBtn && sidebarUpgradeBtn.style.display !== 'none') {
      if (isStandardPro()) sidebarUpgradeBtn.textContent = '🩺 Become Nutritionist';
      else sidebarUpgradeBtn.textContent = '⬆ Upgrade Plan';
    }
    // Nav label "Canal" → "Channel"
    const navChat = document.getElementById('nav-chat');
    if (navChat) { const span = navChat.querySelector('span:not(.nav-icon):not(.nav-badge)'); if(span) span.textContent = 'Channel'; }
    // Topbar title if currently on a panel
    const chatSubtitle = document.getElementById('chatSubtitle');
    if (chatSubtitle && chatSubtitle.textContent.includes('Converse')) {
      chatSubtitle.textContent = 'Chat with your patients, send recipes and PDFs';
    }
  } else {
    const navChat = document.getElementById('nav-chat');
    if (navChat) { const span = navChat.querySelector('span:not(.nav-icon):not(.nav-badge)'); if(span) span.textContent = 'Canal'; }
  }
}

function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('cv_lang', lang);
  applyLanguage();
}

// ═══════════════════════════════════════
// THEME
// ═══════════════════════════════════════
function initTheme() {
  const saved = localStorage.getItem('cv_theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  document.getElementById('themeBtn').innerHTML = saved === 'dark' ? '<i class="fa-solid fa-sun ic-sun"></i>' : '<i class="fa-solid fa-moon ic-moon"></i>';
  setTimeout(updateLogos, 50);
}
function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('cv_theme', next);
  document.getElementById('themeBtn').innerHTML = next === 'dark' ? '<i class="fa-solid fa-sun ic-sun"></i>' : '<i class="fa-solid fa-moon ic-moon"></i>';
  updateLogos();
}
initTheme();

// ═══════════════════════════════════════
// TOAST
// ═══════════════════════════════════════
let _toastTimer = null;
function showToast(msg, type='success', duration=2500) {
  const t = document.getElementById('toast');
  t.innerHTML = msg;
  t.className = 'show ' + type;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { t.className = ''; }, duration);
}

// ═══════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════
const panelTitles = {
  home: () => currentLang === 'en' ? 'Home' : 'Início',
  search: () => t('search_title'), diary: () => t('nav_diary'),
  goal: () => t('nav_goal'), camera: () => t('camera_title'),
  compare: () => t('compare_title'), recipes: () => t('recipes_title'),
  prof: () => t('patients_title'), admin: () => currentLang === 'en' ? 'Admin' : 'Admin',
  profile: () => t('profile_title'),
  water: () => currentLang === 'en' ? 'Water' : 'Água'
};

function showPanel(name, navEl) {
  // Paywall check para usuários free
  if (currentProfile && isStandardFree()) {
    const paywalled = ['diary','camera','recipes'];
    if (paywalled.includes(name)) { openUpgradeModal(); return; }
  }
  // Paywall para painel profissional
  if (name === 'prof' && !isProfessional() && !isAdmin()) return;

  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));

  const panel = document.getElementById('panel-' + name);
  if (panel) panel.classList.add('active');
  if (name === 'home') updateHomePanel();
  if (name === 'goal') fillCalcFromProfile();
  if (name === 'profile') fillProfilePanel();
  if (name === 'prof') {
    if (typeof loadPatients === 'function') loadPatients();
  }
  if (name === 'water') {
    if (typeof window.updateWaterDisplay === 'function') window.updateWaterDisplay();
    if (typeof window.loadWaterForDate === 'function' && currentUser) window.loadWaterForDate(diaryDate);
  }

  // Update topbar title
  const title = panelTitles[name];
  document.getElementById('topbarTitle').textContent = typeof title === 'function' ? title() : (title || name);

  // Highlight nav
  const navBtn = navEl || document.getElementById('nav-' + name);
  if (navBtn) navBtn.classList.add('active');

  // Close sidebar on mobile
  if (window.innerWidth < 768) closeSidebar();
}

function setBottomNav(name) {
  document.querySelectorAll('.bottom-nav-item').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('bnav-' + name);
  if (btn) btn.classList.add('active');
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('show');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('show');
}

// ═══════════════════════════════════════
// USER DROPDOWN
// ═══════════════════════════════════════
function toggleDropdown() {
  const d = document.getElementById('userDropdown');
  d.style.display = d.style.display === 'none' ? 'block' : 'none';
}
function closeDropdown() { document.getElementById('userDropdown').style.display = 'none'; }
document.addEventListener('click', e => {
  if (!e.target.closest('#userAvatarBtn') && !e.target.closest('#userDropdown')) closeDropdown();
});

// Expor funções e configurações para o escopo global
window.escapeHtml = escapeHtml;
window.i18n = i18n;
window.t = t;
window.applyLanguage = applyLanguage;
window.setLanguage = setLanguage;
window.initTheme = initTheme;
window.toggleTheme = toggleTheme;
window.showToast = showToast;
window.panelTitles = panelTitles;
window.showPanel = showPanel;
window.setBottomNav = setBottomNav;
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;
window.toggleDropdown = toggleDropdown;
window.closeDropdown = closeDropdown;


