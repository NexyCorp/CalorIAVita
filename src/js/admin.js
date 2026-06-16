// ═══════════════════════════════════════
// ANNOUNCEMENTS / AVISOS
// ═══════════════════════════════════════
async function openAnnouncementModal(patientId, patientName) {
  const sel = document.getElementById('announcementRecipient');
  sel.innerHTML = `<option value="all">${t('announcement_all_patients')}</option>`;
  const { data: links } = await supabase.from('professional_patients').select('patient_id').eq('professional_id', currentUser.id);
  if (links && links.length) {
    const ids = links.map(l => l.patient_id);
    const { data: pts } = await supabase.from('profiles').select('id,name,email').in('id', ids);
    (pts || []).forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name || p.email;
      sel.appendChild(opt);
    });
  }
  if (patientId) sel.value = patientId;
  document.getElementById('announcementMessage').value = '';
  document.getElementById('announcementModal').classList.add('show');
}

function closeAnnouncementModal() {
  document.getElementById('announcementModal').classList.remove('show');
}

async function sendAnnouncement() {
  const recipient = document.getElementById('announcementRecipient').value;
  const message = document.getElementById('announcementMessage').value.trim();
  if (!message) { showToast(t('announcement_empty_error'), 'error'); return; }

  let patientIds = [];
  if (recipient === 'all') {
    const { data: links, error: linksErr } = await supabase.from('professional_patients').select('patient_id').eq('professional_id', currentUser.id);
    if (linksErr) { showToast(t('chat_send_error') + linksErr.message, 'error'); return; }
    patientIds = (links || []).map(l => l.patient_id).filter(Boolean);
  } else {
    patientIds = [recipient];
  }
  if (!patientIds.length) { showToast(t('announcement_no_patients_error'), 'error'); return; }

  const rows = patientIds.map(pid => ({
    nutritionist_id: currentUser.id,
    patient_id: pid,
    message,
    created_at: new Date().toISOString()
  }));
  const { error } = await supabase.from('announcements').insert(rows);
  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205' || error.message?.includes('announcements')) {
      console.warn('SQL para criar a tabela de avisos:\n\nCREATE TABLE announcements (\n  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,\n  nutritionist_id uuid REFERENCES profiles(id),\n  patient_id uuid REFERENCES profiles(id),\n  message text NOT NULL,\n  created_at timestamptz DEFAULT now(),\n  read_at timestamptz\n);\nALTER TABLE announcements ENABLE ROW LEVEL SECURITY;\nCREATE POLICY "Avisos" ON announcements FOR ALL USING (\n  auth.uid() = nutritionist_id OR auth.uid() = patient_id\n);');
      showToast(t('announcement_table_missing'), 'error');
    } else {
      showToast(t('chat_send_error') + error.message, 'error');
    }
    return;
  }
  showToast('<i class="fa-solid fa-circle-check ic-check"></i> ' + t('announcement_sent'));
  closeAnnouncementModal();
}

// ═══════════════════════════════════════
// ADMIN NOTICES (admin → qualquer usuário)
// ═══════════════════════════════════════
let _adminNoticeAllUsers = [];

function openAdminNoticeModal() {
  if (!isAdmin()) return;
  document.getElementById('adminNoticeTarget').value = 'all';
  document.getElementById('adminNoticeUserField').style.display = 'none';
  document.getElementById('adminNoticeTitle').value = '';
  document.getElementById('adminNoticeMessage').value = '';
  document.getElementById('adminNoticeUserId').value = '';
  document.getElementById('adminNoticeUserSearch').value = '';
  document.getElementById('adminNoticeUserChosen').style.display = 'none';
  document.getElementById('adminNoticeUserResults').style.display = 'none';
  _adminNoticeAllUsers = allAdminUsers || [];
  document.getElementById('adminNoticeModal').classList.add('show');
}
function closeAdminNoticeModal() {
  document.getElementById('adminNoticeModal').classList.remove('show');
}
function onAdminNoticeTargetChange() {
  const v = document.getElementById('adminNoticeTarget').value;
  document.getElementById('adminNoticeUserField').style.display = v === 'specific' ? 'block' : 'none';
  document.getElementById('adminNoticeUserId').value = '';
  document.getElementById('adminNoticeUserChosen').style.display = 'none';
  document.getElementById('adminNoticeUserResults').style.display = 'none';
  document.getElementById('adminNoticeUserSearch').value = '';
}
function filterAdminNoticeUsers() {
  const q = document.getElementById('adminNoticeUserSearch').value.toLowerCase().trim();
  const results = document.getElementById('adminNoticeUserResults');
  if (!q) { results.style.display = 'none'; return; }
  const matches = _adminNoticeAllUsers.filter(u =>
    (u.name||'').toLowerCase().includes(q) || (u.email||'').toLowerCase().includes(q)
  ).slice(0, 8);
  if (!matches.length) {
    results.innerHTML = '<div style="padding:0.6rem 1rem;color:var(--text-muted);font-size:0.85rem;">Nenhum usuário encontrado</div>';
    results.style.display = 'block'; return;
  }
  results.innerHTML = matches.map(u => `
    <div onclick="selectAdminNoticeUser('${u.id}','${(u.name||u.email||'').replace(/'/g,"\\'")}','${(u.email||'').replace(/'/g,"\\'")}') "
      style="padding:0.65rem 1rem;cursor:pointer;border-bottom:1px solid var(--border);font-size:0.88rem;transition:background 0.15s;"
      onmouseover="this.style.background='var(--green-pale)'" onmouseout="this.style.background=''">
      <span style="font-weight:600;">${u.name||'—'}</span>
      <span style="color:var(--text-muted);margin-left:0.4rem;font-size:0.78rem;">${u.email||''}</span>
    </div>`).join('');
  results.style.display = 'block';
}
function selectAdminNoticeUser(id, name, email) {
  document.getElementById('adminNoticeUserId').value = id;
  document.getElementById('adminNoticeUserSearch').value = '';
  document.getElementById('adminNoticeUserResults').style.display = 'none';
  const chosen = document.getElementById('adminNoticeUserChosen');
  chosen.textContent = '✓ ' + (name || email);
  chosen.style.display = 'block';
}

async function sendAdminNotice() {
  const target = document.getElementById('adminNoticeTarget').value;
  const title = document.getElementById('adminNoticeTitle').value.trim();
  const message = document.getElementById('adminNoticeMessage').value.trim();
  if (!message) { showToast('Escreva a mensagem do aviso.', 'error'); return; }

  let userIds = [];
  if (target === 'all') {
    if (!_adminNoticeAllUsers.length) {
      const { data } = await supabase.from('profiles').select('id');
      userIds = (data||[]).map(u => u.id).filter(id => id !== currentUser?.id);
    } else {
      userIds = _adminNoticeAllUsers.map(u => u.id).filter(id => id !== currentUser?.id);
    }
  } else {
    const uid = document.getElementById('adminNoticeUserId').value;
    if (!uid) { showToast('Selecione um usuário.', 'error'); return; }
    userIds = [uid];
  }
  if (!userIds.length) { showToast('Nenhum usuário encontrado.', 'error'); return; }

  showToast('📤 Enviando aviso...');

  const rows = userIds.map(uid => ({
    admin_id: currentUser.id,
    user_id: uid,
    title: title || 'Aviso do Sistema',
    message,
    created_at: new Date().toISOString()
  }));

  // Tenta na tabela admin_notices; se não existir, cria orientação no console
  const { error } = await supabase.from('admin_notices').insert(rows);
  if (error) {
    if (error.code === '42P01' || error.message?.includes('admin_notices') || error.message?.includes('relation')) {
      console.warn('[AdminNotice] Crie a tabela no Supabase:\n\nCREATE TABLE admin_notices (\n  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,\n  admin_id uuid REFERENCES profiles(id),\n  user_id uuid REFERENCES profiles(id),\n  title text DEFAULT \'Aviso do Sistema\',\n  message text NOT NULL,\n  created_at timestamptz DEFAULT now(),\n  read_at timestamptz\n);\nALTER TABLE admin_notices ENABLE ROW LEVEL SECURITY;\nCREATE POLICY "Admin notices" ON admin_notices FOR ALL\n  USING (auth.uid() = admin_id OR auth.uid() = user_id);');
      showToast('⚠️ Tabela "admin_notices" não existe. SQL gerado no console (F12).', 'error');
    } else {
      showToast('Erro ao enviar aviso: ' + error.message, 'error');
    }
    return;
  }

  showToast('<i class="fa-solid fa-circle-check ic-check"></i> Aviso enviado para ' + userIds.length + ' usuário(s)!');
  closeAdminNoticeModal();
  loadAdminNotices();
}

async function loadAdminNotices() {
  if (!isAdmin()) return;
  const el = document.getElementById('adminNoticesList');
  if (!el) return;
  const { data, error } = await supabase.from('admin_notices')
    .select('id,title,message,created_at,user_id,profiles!admin_notices_user_id_fkey(name,email)')
    .eq('admin_id', currentUser.id)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) {
    if (error.code === '42P01' || error.message?.includes('admin_notices')) {
      el.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;">Tabela "admin_notices" ainda não criada. Clique em "Novo Aviso" e veja o console (F12) para o SQL.</p>';
    } else {
      el.innerHTML = '<p style="color:#e53935;font-size:0.85rem;">Erro ao carregar avisos: ' + error.message + '</p>';
    }
    return;
  }
  if (!data || !data.length) { el.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;">Nenhum aviso enviado ainda.</p>'; return; }
  el.innerHTML = data.map(n => {
    const to = n.profiles?.name || n.profiles?.email || n.user_id;
    const dt = new Date(n.created_at).toLocaleString('pt-BR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
    return `<div style="padding:0.8rem 1rem;border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:0.6rem;background:var(--bg-card);">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:0.5rem;margin-bottom:0.3rem;">
        <span style="font-weight:700;font-size:0.88rem;color:var(--text-main);">${n.title||'Aviso do Sistema'}</span>
        <span style="font-size:0.72rem;color:var(--text-muted);white-space:nowrap;">${dt}</span>
      </div>
      <p style="font-size:0.83rem;color:var(--text-muted);margin-bottom:0.3rem;">Para: <strong>${to}</strong></p>
      <p style="font-size:0.85rem;color:var(--text-main);line-height:1.5;">${n.message}</p>
    </div>`;
  }).join('');
}

async function checkAdminNotices() {
  if (!currentUser) return;
  const { data, error } = await supabase.from('admin_notices')
    .select('id,title,message,created_at')
    .eq('user_id', currentUser.id)
    .is('read_at', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error || !data) return;
  const popup = document.getElementById('adminNoticePopup');
  document.getElementById('adminNoticePopupTitle').textContent = data.title || 'Aviso do Sistema';
  document.getElementById('adminNoticePopupContent').textContent = data.message;
  document.getElementById('adminNoticePopupDate').textContent = new Date(data.created_at).toLocaleString('pt-BR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
  popup.dataset.id = data.id;
  popup.classList.add('show');
}
async function dismissAdminNoticePopup() {
  const popup = document.getElementById('adminNoticePopup');
  const id = popup.dataset.id;
  popup.classList.remove('show');
  if (id) {
    await supabase.from('admin_notices').update({ read_at: new Date().toISOString() }).eq('id', id);
    delete popup.dataset.id;
  }
  setTimeout(() => checkAdminNotices(), 400);
}

async function checkAnnouncements() {
  if (!currentUser || !isPatient()) return;
  const { data, error } = await supabase.from('announcements')
    .select('id,message,created_at,nutritionist_id')
    .eq('patient_id', currentUser.id)
    .is('read_at', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error || !data) return;

  let fromName = t('chat_default_partner');
  try {
    const { data: nut } = await supabase.from('profiles').select('name').eq('id', data.nutritionist_id).single();
    if (nut?.name) fromName = nut.name;
  } catch(e) {}

  document.getElementById('announcementPopupFrom').textContent = (currentLang === 'en' ? 'Message from ' : 'Aviso de ') + fromName;
  document.getElementById('announcementPopupContent').textContent = data.message;
  const locale = currentLang === 'en' ? 'en-US' : 'pt-BR';
  document.getElementById('announcementPopupDate').textContent = new Date(data.created_at).toLocaleString(locale, { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
  document.getElementById('announcementPopup').dataset.id = data.id;
  document.getElementById('announcementPopup').classList.add('show');
}

async function dismissAnnouncementPopup() {
  const popup = document.getElementById('announcementPopup');
  const id = popup.dataset.id;
  popup.classList.remove('show');
  if (id) {
    await supabase.from('announcements').update({ read_at: new Date().toISOString() }).eq('id', id);
    delete popup.dataset.id;
  }
  // Check for more unread announcements
  setTimeout(() => checkAnnouncements(), 400);
}

// ---------------------------------------
// NUTRITIONIST REQUEST

// Expor funções para o escopo global
window.openAnnouncementModal = openAnnouncementModal;
window.closeAnnouncementModal = closeAnnouncementModal;
window.sendAnnouncement = sendAnnouncement;
window.openAdminNoticeModal = openAdminNoticeModal;
window.closeAdminNoticeModal = closeAdminNoticeModal;
window.onAdminNoticeTargetChange = onAdminNoticeTargetChange;
window.filterAdminNoticeUsers = filterAdminNoticeUsers;
window.selectAdminNoticeUser = selectAdminNoticeUser;
window.sendAdminNotice = sendAdminNotice;
window.loadAdminNotices = loadAdminNotices;
window.checkAdminNotices = checkAdminNotices;
window.dismissAdminNoticePopup = dismissAdminNoticePopup;
window.checkAnnouncements = checkAnnouncements;
window.dismissAnnouncementPopup = dismissAnnouncementPopup;

