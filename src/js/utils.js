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
    sex:'Sexo', male:'Masculino', female:'Feminino', age:'Idade (anos)', weight:'Peso (kg)', height:'Altura (cm)', DOB:'Data de Nascimento',
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
    profile_title:'Meu Perfil', full_name:'Nome completo', display_name:'Nome de Usuário', language:'Idioma',
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
    detected_profile: 'Perfil Nutricional Detectado',
    diabetes_label: 'Tenho Diabetes ou Pré-Diabetes',
    save_changes: 'Salvar alterações',
    submit_request: 'Enviar Solicitação',
    nav_dietaia: 'Dieta IA',
    home_hello: 'Olá',
    home_summary: 'Aqui está o seu resumo de hoje',
    kcal_today: 'kcal hoje',
    search_food: 'Buscar Alimento',
    search_food_desc: 'Tabela nutricional',
    my_diary: 'Meu Diário',
    my_diary_desc: 'Registrar refeições',
    camera_ai: 'Câmera IA',
    camera_ai_desc: 'Analisar foto do prato',
    water: 'Água',
    water_desc: 'Acompanhar hidratação',
    generate_diet: 'Gerar Dieta com IA',
    generate_diet_desc: 'Plano alimentar personalizado baseado na sua anamnese',
    macros_today: 'Macros de Hoje',
    previous_diets: 'Dietas anteriores?',
    dietaia_sub: 'Gere um plano alimentar personalizado com IA e acompanhe o seu consumo.',
    dietaia_modal_sub: 'A IA cria um plano alimentar completo baseado nos seus dados.',
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
    sex:'Sex', male:'Male', female:'Female', age:'Age (years)', weight:'Weight (kg)', height:'Height (cm)', DOB:'Date of Birth',
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
    profile_title:'My Profile', full_name:'Full name', display_name:'Display Name', language:'Language',
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
    detected_profile: 'Detected Nutritional Profile',
    diabetes_label: 'I have Diabetes or Prediabetes',
    save_changes: 'Save changes',
    submit_request: 'Submit Request',
    nav_dietaia: 'AI Diet',
    home_hello: 'Hello',
    home_summary: 'Here is your daily summary',
    kcal_today: 'kcal today',
    search_food: 'Search Food',
    search_food_desc: 'Nutritional facts',
    my_diary: 'My Diary',
    my_diary_desc: 'Log your meals',
    camera_ai: 'AI Camera',
    camera_ai_desc: 'Analyze food photos',
    water: 'Water',
    water_desc: 'Track hydration',
    generate_diet: 'Generate AI Diet',
    generate_diet_desc: 'Personalized meal plan based on your profile',
    macros_today: 'Macros Today',
    previous_diets: 'Previous diets?',
    dietaia_sub: 'Generate a personalized meal plan with AI and track your consumption.',
    dietaia_modal_sub: 'AI creates a complete meal plan based on your data.',
  },
  es: {
    nav_tools:'Herramientas', nav_search:'Buscar', nav_diary:'Diario', nav_goal:'Meta & Calc.',
    nav_camera:'Cámara IA', nav_compare:'Comparar', nav_recipes:'Recetas',
    nav_professional:'Profesional', nav_patients:'Pacientes', nav_more:'Más',
    menu_profile:'Mi Perfil', menu_upgrade:'Planes & Upgrade', menu_become_nut:'Ser Nutricionista', menu_logout:'Salir',
    search_title:'Búsqueda Nutricional', search_sub:'Busca cualquier alimento y mira su info nutricional',
    search_ph:'Ej: arroz blanco, plátano, pollo...', search_btn:'Buscar', qty_label:'Cantidad:',
    add_to_diary:'Añadir al Diario', nav_goal:'Meta & Calculadora',
    calc_title:'Calculadora de Calorías', calc_sub:'Calcula tu metabolismo y meta diaria',
    sex:'Sexo', male:'Masculino', female:'Femenino', age:'Edad (años)', weight:'Peso (kg)', height:'Altura (cm)', DOB:'Fecha de Nacimiento',
    activity:'Nivel de Actividad', objective:'Objetivo', lose:'Adelgazar', maintain:'Mantener', gain:'Ganar masa',
    weekly_goal:'Meta Semanal', weekly_goal_sub:'Sigue tu progreso en la semana',
    daily_goal_kcal:'Meta diaria (kcal)',
    camera_title:'Análisis por Cámara IA', camera_sub:'Toma una foto y la IA identifica las calorías',
    camera_tap:'Toca para tomar foto', analyze:'Analizar con IA', analyzing:'Analizando...',
    compare_title:'Comparar Alimentos', compare_sub:'Compara dos alimentos por 100g', compare_btn:'Comparar', comparing:'Comparando...',
    recipes_title:'Recetas', recipes_sub:'Recetas saludables con información nutricional',
    add_recipe:'Nueva Receta', recipe_name:'Nombre de la Receta', ingredients:'Ingredientes',
    steps:'Instrucciones', visibility:'Visibilidad', public:'Pública', private:'Privada',
    for_patient:'Para Paciente', select_patient:'Seleccionar Paciente', category:'Categoría',
    my_recipes:'Mis Recetas', all:'Todos',
    patients_title:'Mis Pacientes', patients_sub:'Gestiona pacientes y sigue su progreso',
    invite_patient:'Invitar Paciente por Correo',
    invite_patient_desc:'El paciente recibirá un correo con instrucciones para crear su cuenta y se vinculará a ti con acceso Pro.',
    patients_list:'Lista', loading:'Cargando...',
    choose_plan:'Elige tu plan', choose_plan_sub:'Desbloquea más funciones',
    profile_title:'Mi Perfil', full_name:'Nombre completo', display_name:'Nombre de Usuario', language:'Idioma',
    become_nut_title:'Quiero ser Nutricionista', become_nut_desc:'Envía tus credenciales profesionales para revisión.',
    linked_nutritionist:'Nutricionista responsable',
    kcal_consumed:'kcal consumidas', goal_label:'meta:', breakfast:'Desayuno',
    lunch:'Almuerzo', snack:'Merienda', dinner:'Cena', carbs:'Carbohidratos', protein:'Proteínas', fat:'Grasas',
    no_food:'Ningún alimento añadido', add:'Añadir', clear:'Limpiar',
    diary_add_ph:'Buscar alimento...', protein:'Proteínas',
    change_password_title:'Cambiar Contraseña', change_password_desc:'Para continuar, necesitas crear una contraseña personal distinta a la temporal que recibiste.',
    new_password:'Nueva Contraseña *', confirm_new_password:'Confirmar Nueva Contraseña *', confirm_pwd_ph:'Repite la contraseña',
    save_new_password:'Guardar Nueva Contraseña',
    create_patient_title:'Registrar Paciente', create_patient_desc:'Crea la cuenta del paciente. Deberá cambiar su contraseña en el primer inicio de sesión.',
    click_add_photo:'Clic para añadir foto', full_name_req:'Nombre Completo *', patient_name_ph:'Nombre del paciente',
    email_req:'Correo electrónico *', other_sex:'Otro', goal_objective:'Objetivo',
    temp_password:'Contraseña Temporal *', temp_password_hint:'(mín. 6 caracteres — el paciente la cambiará en el 1º login)',
    temp_password_ph:'Contraseña temporal', create_patient_btn:'Crear Paciente', create_patient_btn_2:'Registrar Nuevo Paciente',
    upgrade_btn:'⬆ Mejorar Plan', become_nutritionist_btn:'🩺 Ser Nutricionista',
    ai_recipe_btn:'🤖 IA Crea Receta', share_recipe:'Compartir Receta (PDF)',
    recipe_total_weight:'Peso total', notify_nutritionist:'¡Tu nutricionista fue notificado!',
    recipe_photos:'Fotos de la receta', add_photos:'Añadir fotos',
    set_patient_goal:'Definir Metas del Paciente', calorie_goal:'Meta de Calorías (kcal)',
    protein_goal:'Meta de Proteínas (g)', carbs_goal:'Meta de Carbohidratos (g)', fat_goal:'Meta de Grasas (g)',
    save_goals:'Guardar Metas', goals_saved:'¡Metas guardadas!',
    craving_title:'¿Qué se te antoja?', craving_desc:'Dinos qué quieres comer y la IA creará una receta.',
    craving_food:'¿Qué se te antoja?', craving_kcal:'Calorías máx', craving_prot:'Proteína mín (g)',
    craving_btn:'Crear Receta con IA', craving_generating:'Generando receta...',
    send_to_all:'Disponible para todos mis pacientes', send_to_patient:'Enviar a un paciente específico',
    recipe_private:'Privada (solo tú)', recipe_visibility:'¿Quién puede ver esta receta?',
    chat_subtitle_prof:'Habla con tus pacientes, envía recetas y PDFs',
    chat_subtitle_patient:'Recibe recetas, PDFs y mensajes de tu nutricionista',
    chat_select_patient:'Seleccionar paciente...',
    chat_select_patient_prompt:'Selecciona un paciente para ver el canal.',
    chat_loading:'Cargando...',
    chat_table_missing:'La tabla <code>chat_messages</code> no existe.',
    chat_see_sql:'Mira el SQL en la consola (F12).',
    chat_no_messages:'No hay mensajes aún. ¡Di hola! 👋',
    chat_select_patient_first:'Selecciona un paciente primero',
    chat_sending_pdf:'Enviando PDF...',
    chat_pdf_sent:'¡PDF enviado!',
    chat_send_error:'Error al enviar: ',
    chat_default_partner:'tu Nutricionista',
    chat_default_patient_name:'Paciente',
    chat_doc_default:'Documento.pdf',
    chat_pdf_unavailable:'(enlace no disponible)',
    chat_shared_recipe:'Receta compartida',
    chat_pdf_input_placeholder:'Adjuntar PDF',
    chat_input_placeholder:'Escribe un mensaje...',
    chat_clinic_badge:'🏥 Clínica', chat_pro_badge:'⭐ Pro', chat_title_prefix:'Canal con',
    chat_photo_input_placeholder:'Enviar Foto',
    chat_sending_photo:'Enviando foto...',
    chat_photo_upload_error:'Error al enviar foto: ',
    chat_pdf_upload_error:'Error al enviar PDF: ',
    send_announcement_btn:'Enviar Aviso',
    announcement_title:'Enviar Aviso',
    announcement_sub:'Este aviso aparecerá como popup en la pantalla de inicio del paciente.',
    announcement_recipient:'Destinatario',
    announcement_all_patients:'Todos mis pacientes',
    announcement_message_label:'Mensaje',
    announcement_message_ph:'Escribe el aviso...',
    announcement_send_btn:'Enviar Aviso',
    announcement_popup_title:'Aviso de tu Nutricionista',
    announcement_popup_ok:'Entendido',
    announcement_empty_error:'Escribe un mensaje.',
    announcement_no_patients_error:'No hay pacientes vinculados.',
    announcement_sent:'¡Aviso enviado!',
    announcement_table_missing:'La tabla de avisos no existe. Mira el SQL en consola (F12).',
    detected_profile: 'Perfil Nutricional Detectado',
    diabetes_label: 'Tengo Diabetes o Prediabetes',
    save_changes: 'Guardar cambios',
    submit_request: 'Enviar Solicitud',
    nav_dietaia: 'Dieta IA',
    home_hello: 'Hola',
    home_summary: 'Aquí tienes tu resumen de hoy',
    kcal_today: 'kcal hoy',
    search_food: 'Buscar Alimento',
    search_food_desc: 'Tabla nutricional',
    my_diary: 'Mi Diario',
    my_diary_desc: 'Registrar comidas',
    camera_ai: 'Cámara IA',
    camera_ai_desc: 'Analizar fotos de comida',
    water: 'Agua',
    water_desc: 'Seguimiento de hidratación',
    generate_diet: 'Generar Dieta con IA',
    generate_diet_desc: 'Plan de alimentación basado en tu historial',
    macros_today: 'Macros de Hoy',
    previous_diets: '¿Dietas anteriores?',
    dietaia_sub: 'Genera un plan de alimentación personalizado con IA y haz seguimiento.',
    dietaia_modal_sub: 'La IA crea un plan completo basado en tus datos.',
  },
  de: {
    nav_tools:'Werkzeuge', nav_search:'Suche', nav_diary:'Tagebuch', nav_goal:'Ziel & Rechner',
    nav_camera:'KI Kamera', nav_compare:'Vergleichen', nav_recipes:'Rezepte',
    nav_professional:'Profi', nav_patients:'Patienten', nav_more:'Mehr',
    menu_profile:'Mein Profil', menu_upgrade:'Pläne & Upgrade', menu_become_nut:'Ernährungsberater werden', menu_logout:'Abmelden',
    search_title:'Nahrungssuche', search_sub:'Suche nach Lebensmitteln und sehe Nährwertangaben',
    search_ph:'Z.B.: weißer Reis, Banane, Huhn...', search_btn:'Suchen', qty_label:'Menge:',
    add_to_diary:'Zum Tagebuch hinzufügen', nav_goal:'Ziel & Rechner',
    calc_title:'Kalorienrechner', calc_sub:'Berechne deinen Stoffwechsel und dein tägliches Ziel',
    sex:'Geschlecht', male:'Männlich', female:'Weiblich', age:'Alter (Jahre)', weight:'Gewicht (kg)', height:'Größe (cm)', DOB:'Geburtsdatum',
    activity:'Aktivitätslevel', objective:'Ziel', lose:'Abnehmen', maintain:'Gewicht halten', gain:'Zunehmen',
    weekly_goal:'Wöchentliches Ziel', weekly_goal_sub:'Verfolge deinen Fortschritt im Laufe der Woche',
    daily_goal_kcal:'Tägliches Ziel (kcal)',
    camera_title:'KI Kamera-Analyse', camera_sub:'Mach ein Foto und die KI erkennt die Kalorien',
    camera_tap:'Tippen, um ein Foto zu machen', analyze:'Mit KI analysieren', analyzing:'Analysiere...',
    compare_title:'Lebensmittel vergleichen', compare_sub:'Vergleiche zwei Lebensmittel pro 100g', compare_btn:'Vergleichen', comparing:'Vergleiche...',
    recipes_title:'Rezepte', recipes_sub:'Gesunde Rezepte mit Nährwertangaben',
    add_recipe:'Neues Rezept', recipe_name:'Rezeptname', ingredients:'Zutaten',
    steps:'Zubereitung', visibility:'Sichtbarkeit', public:'Öffentlich', private:'Privat',
    for_patient:'Für Patient', select_patient:'Patient auswählen', category:'Kategorie',
    my_recipes:'Meine Rezepte', all:'Alle',
    patients_title:'Meine Patienten', patients_sub:'Verwalte Patienten und verfolge ihren Fortschritt',
    invite_patient:'Patient per E-Mail einladen',
    invite_patient_desc:'Der Patient erhält eine E-Mail mit Anweisungen zur Kontoerstellung und wird mit dir verbunden (mit kostenlosem Pro-Zugang).',
    patients_list:'Liste', loading:'Laden...',
    choose_plan:'Wähle deinen Plan', choose_plan_sub:'Schalte mehr Funktionen frei',
    profile_title:'Mein Profil', full_name:'Vollständiger Name', display_name:'Benutzername', language:'Sprache',
    become_nut_title:'Ernährungsberater werden', become_nut_desc:'Sende deine beruflichen Qualifikationen zur Überprüfung ein.',
    linked_nutritionist:'Dein Ernährungsberater',
    kcal_consumed:'kcal verbraucht', goal_label:'Ziel:', breakfast:'Frühstück',
    lunch:'Mittagessen', snack:'Snack', dinner:'Abendessen', carbs:'Kohlenhydrate', protein:'Proteine', fat:'Fette',
    no_food:'Noch keine Lebensmittel hinzugefügt', add:'Hinzufügen', clear:'Leeren',
    diary_add_ph:'Lebensmittel suchen...', protein:'Proteine',
    change_password_title:'Passwort ändern', change_password_desc:'Um fortzufahren, musst du ein persönliches Passwort erstellen, das sich vom temporären unterscheidet.',
    new_password:'Neues Passwort *', confirm_new_password:'Neues Passwort bestätigen *', confirm_pwd_ph:'Passwort wiederholen',
    save_new_password:'Neues Passwort speichern',
    create_patient_title:'Patient registrieren', create_patient_desc:'Erstelle das Patientenkonto direkt. Beim ersten Login müssen sie ihr Passwort ändern.',
    click_add_photo:'Klicken, um ein Foto hinzuzufügen', full_name_req:'Vollständiger Name *', patient_name_ph:'Name des Patienten',
    email_req:'E-Mail *', other_sex:'Andere', goal_objective:'Ziel',
    temp_password:'Temporäres Passwort *', temp_password_hint:'(min. 6 Zeichen — Patient wird es beim 1. Login ändern)',
    temp_password_ph:'Temporäres Passwort', create_patient_btn:'Patient erstellen', create_patient_btn_2:'Neuen Patienten registrieren',
    upgrade_btn:'⬆ Plan upgraden', become_nutritionist_btn:'🩺 Ernährungsberater werden',
    ai_recipe_btn:'🤖 KI Rezeptvorschlag', share_recipe:'Rezept teilen (PDF)',
    recipe_total_weight:'Gesamtgewicht', notify_nutritionist:'Dein Ernährungsberater wurde benachrichtigt!',
    recipe_photos:'Rezeptfotos', add_photos:'Fotos hinzufügen',
    set_patient_goal:'Patientenziele festlegen', calorie_goal:'Kalorienziel (kcal)',
    protein_goal:'Protein-Ziel (g)', carbs_goal:'Kohlenhydrate-Ziel (g)', fat_goal:'Fett-Ziel (g)',
    save_goals:'Ziele speichern', goals_saved:'Ziele gespeichert!',
    craving_title:'Worauf hast du Lust?', craving_desc:'Sag uns, was du möchtest, und die KI erstellt ein Rezept für dich.',
    craving_food:'Worauf hast du Lust?', craving_kcal:'Max. Kalorien', craving_prot:'Min. Protein (g)',
    craving_btn:'KI Rezept erstellen', craving_generating:'Rezept wird generiert...',
    send_to_all:'Für alle meine Patienten verfügbar', send_to_patient:'An bestimmten Patienten senden',
    recipe_private:'Privat (nur du)', recipe_visibility:'Wer kann dieses Rezept sehen?',
    chat_subtitle_prof:'Chatte mit deinen Patienten, sende Rezepte und PDFs',
    chat_subtitle_patient:'Erhalte Rezepte, PDFs und Nachrichten von deinem Ernährungsberater',
    chat_select_patient:'Patient auswählen...',
    chat_select_patient_prompt:'Wähle einen Patienten aus, um den Kanal zu sehen.',
    chat_loading:'Laden...',
    chat_table_missing:'Tabelle <code>chat_messages</code> existiert nicht.',
    chat_see_sql:'Siehe SQL in der Konsole (F12).',
    chat_no_messages:'Noch keine Nachrichten. Sag hallo! 👋',
    chat_select_patient_first:'Wähle zuerst einen Patienten aus',
    chat_sending_pdf:'PDF wird gesendet...',
    chat_pdf_sent:'PDF gesendet!',
    chat_send_error:'Fehler beim Senden: ',
    chat_default_partner:'dein Ernährungsberater',
    chat_default_patient_name:'Patient',
    chat_doc_default:'Dokument.pdf',
    chat_pdf_unavailable:'(Link nicht verfügbar)',
    chat_shared_recipe:'Geteiltes Rezept',
    chat_pdf_input_placeholder:'PDF anhängen',
    chat_input_placeholder:'Schreibe eine Nachricht...',
    chat_clinic_badge:'🏥 Klinik', chat_pro_badge:'⭐ Pro', chat_title_prefix:'Kanal mit',
    chat_photo_input_placeholder:'Foto senden',
    chat_sending_photo:'Foto wird gesendet...',
    chat_photo_upload_error:'Fehler beim Senden des Fotos: ',
    chat_pdf_upload_error:'Fehler beim Senden der PDF: ',
    send_announcement_btn:'Ankündigung senden',
    announcement_title:'Ankündigung senden',
    announcement_sub:'Diese Nachricht wird als Popup auf der Startseite des Patienten angezeigt.',
    announcement_recipient:'Empfänger',
    announcement_all_patients:'Alle meine Patienten',
    announcement_message_label:'Nachricht',
    announcement_message_ph:'Schreibe die Ankündigung...',
    announcement_send_btn:'Ankündigung senden',
    announcement_popup_title:'Nachricht von deinem Ernährungsberater',
    announcement_popup_ok:'Verstanden',
    announcement_empty_error:'Schreibe eine Nachricht.',
    announcement_no_patients_error:'Keine verbundenen Patienten.',
    announcement_sent:'Ankündigung gesendet!',
    announcement_table_missing:'Die Ankündigungstabelle existiert nicht. Siehe SQL in der Konsole (F12).',
    detected_profile: 'Erkanntes Ernährungsprofil',
    diabetes_label: 'Ich habe Diabetes oder Prädiabetes',
    save_changes: 'Änderungen speichern',
    submit_request: 'Anfrage senden',
    nav_dietaia: 'KI-Diät',
    home_hello: 'Hallo',
    home_summary: 'Hier ist deine Tagesübersicht',
    kcal_today: 'kcal heute',
    search_food: 'Lebensmittel suchen',
    search_food_desc: 'Nährwertangaben',
    my_diary: 'Mein Tagebuch',
    my_diary_desc: 'Mahlzeiten protokollieren',
    camera_ai: 'KI-Kamera',
    camera_ai_desc: 'Lebensmittelfotos analysieren',
    water: 'Wasser',
    water_desc: 'Hydratation verfolgen',
    generate_diet: 'KI-Diät erstellen',
    generate_diet_desc: 'Personalisierter Speiseplan basierend auf deinem Profil',
    macros_today: 'Makros Heute',
    previous_diets: 'Vorherige Diäten?',
    dietaia_sub: 'Erstelle einen personalisierten Speiseplan mit KI und verfolge deinen Konsum.',
    dietaia_modal_sub: 'Die KI erstellt einen vollständigen Speiseplan basierend auf deinen Daten.',
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


