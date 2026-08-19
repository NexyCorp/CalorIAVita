/**
 * Módulo: Sistema de Inbox de Notificação Flutuante (Popover) — NutrIA
 * Caixinha de notificações suspensa acoplada ao sino da Topbar.
 */

let notificationsState = [
  {
    id: 'notif_1',
    title: 'Inbox de notificação',
    description: 'Acompanhamento do desenvolvimento e progresso do sistema.',
    type: 'NutrIA',
    labels: ['Back-end', 'Front-End', 'NutrIA', 'Desenvolvimento'],
    timestamp: new Date().toISOString(),
    read: false,
    archived: false,
    pendingResponse: true,
    checklist: [
      { id: 'c1', text: 'Verificar novas notificações', done: false },
      { id: 'c2', text: 'Responder às notificações pendentes', done: false },
      { id: 'c3', text: 'Arquivar mensagens resolvidas', done: false },
      { id: 'c4', text: 'Acompanhar alertas importantes', done: false }
    ]
  },
  {
    id: 'notif_2',
    title: 'Alerta de Metas Diárias',
    description: 'Você atingiu 85% da sua meta de proteínas hoje! Falta pouco para bater o objetivo.',
    type: 'Alerta',
    labels: ['NutrIA', 'Desenvolvimento'],
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    read: false,
    archived: false,
    pendingResponse: false,
    checklist: []
  },
  {
    id: 'notif_3',
    title: 'Lembrete de Hidratação',
    description: 'Hora de beber água! Registre seu consumo no diário.',
    type: 'Sistema',
    labels: ['Back-end'],
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    read: true,
    archived: false,
    pendingResponse: false,
    checklist: []
  }
];

let activeFilter = 'all'; // 'all', 'unread', 'pending', 'archived'

export function initInbox() {
  loadInboxFromStorage();
  renderInboxUI();
  updateInboxBadge();
  setupClickOutside();
}

function loadInboxFromStorage() {
  try {
    const saved = localStorage.getItem('nutria_inbox_data');
    if (saved) {
      notificationsState = JSON.parse(saved);
    }
  } catch (e) {
    console.warn('[Inbox] Erro ao carregar do storage:', e);
  }
}

function saveInboxToStorage() {
  try {
    localStorage.setItem('nutria_inbox_data', JSON.stringify(notificationsState));
  } catch (e) {
    console.warn('[Inbox] Erro ao salvar no storage:', e);
  }
}

export function updateInboxBadge() {
  const topbarBadgeEl = document.getElementById('inboxTopbarBadge');
  const popoverCountEl = document.getElementById('inboxPopoverCount');
  const unreadCount = notificationsState.filter(n => !n.read && !n.archived).length;
  
  if (topbarBadgeEl) {
    topbarBadgeEl.style.display = unreadCount > 0 ? 'block' : 'none';
  }

  if (popoverCountEl) {
    popoverCountEl.textContent = unreadCount;
    popoverCountEl.style.display = unreadCount > 0 ? 'inline-block' : 'none';
  }
}

export function toggleInboxPopover(e) {
  if (e) e.stopPropagation();
  const popover = document.getElementById('inboxPopover');
  if (!popover) return;

  const isVisible = popover.style.display === 'block';
  popover.style.display = isVisible ? 'none' : 'block';

  if (!isVisible) {
    renderInboxUI();
  }
}

function setupClickOutside() {
  document.addEventListener('click', (e) => {
    const popover = document.getElementById('inboxPopover');
    const btn = document.getElementById('inboxTopbarBtn');
    if (popover && popover.style.display === 'block') {
      if (!popover.contains(e.target) && !btn.contains(e.target)) {
        popover.style.display = 'none';
      }
    }
  });
}

export function renderInboxUI() {
  const container = document.getElementById('inboxListContainer');
  if (!container) return;

  let filtered = notificationsState.filter(n => {
    if (activeFilter === 'unread') return !n.read && !n.archived;
    if (activeFilter === 'pending') return n.pendingResponse && !n.archived;
    if (activeFilter === 'archived') return n.archived;
    return !n.archived;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="inbox-empty">
        <i class="fa-solid fa-inbox empty-icon"></i>
        <p>Nenhuma notificação encontrada.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(notif => {
    const timeAgo = formatTimeAgo(notif.timestamp);
    const labelBadges = (notif.labels || []).map(l => `<span class="inbox-tag tag-${l.toLowerCase().replace(/[^a-z0-9]/g, '')}">${l}</span>`).join(' ');
    
    let checklistHtml = '';
    if (notif.checklist && notif.checklist.length > 0) {
      const total = notif.checklist.length;
      const completed = notif.checklist.filter(c => c.done).length;
      const pct = Math.round((completed / total) * 100);

      const itemsHtml = notif.checklist.map(item => `
        <label class="checklist-item ${item.done ? 'completed' : ''}">
          <input type="checkbox" data-notif="${notif.id}" data-item="${item.id}" ${item.done ? 'checked' : ''} onchange="window.toggleChecklistItem('${notif.id}', '${item.id}')">
          <span>${escapeHtml(item.text)}</span>
        </label>
      `).join('');

      checklistHtml = `
        <div class="inbox-checklist-block">
          <div class="checklist-header">
            <span class="checklist-title"><i class="fa-solid fa-square-check"></i> Checklist</span>
            <span class="checklist-pct">${pct}%</span>
          </div>
          <div class="checklist-bar-bg">
            <div class="checklist-bar-fill" style="width: ${pct}%"></div>
          </div>
          <div class="checklist-items">
            ${itemsHtml}
          </div>
        </div>
      `;
    }

    return `
      <div class="inbox-card ${notif.read ? 'read' : 'unread'} ${notif.archived ? 'archived' : ''}" id="card_${notif.id}">
        <div class="inbox-card-header">
          <div class="inbox-card-title-group">
            <span class="status-indicator ${notif.read ? 'read' : 'unread'}"></span>
            <h4 class="inbox-card-title">${escapeHtml(notif.title)}</h4>
          </div>
          <span class="inbox-time">${timeAgo}</span>
        </div>
        
        <p class="inbox-description">${escapeHtml(notif.description)}</p>
        
        <div class="inbox-labels">
          ${labelBadges}
        </div>

        ${checklistHtml}

        <div class="inbox-actions">
          ${!notif.read ? `<button class="btn-inbox-action" onclick="window.markNotifRead('${notif.id}')"><i class="fa-solid fa-check"></i> Marcar Lida</button>` : ''}
          ${notif.pendingResponse ? `<button class="btn-inbox-action btn-reply" onclick="window.openReplyModal('${notif.id}')"><i class="fa-solid fa-reply"></i> Responder</button>` : ''}
          <button class="btn-inbox-action" onclick="window.toggleArchiveNotif('${notif.id}')">
            <i class="fa-solid ${notif.archived ? 'fa-box-open' : 'fa-box-archive'}"></i> ${notif.archived ? 'Desarquivar' : 'Arquivar'}
          </button>
        </div>
      </div>
    `;
  }).join('');
}

window.setInboxFilter = function(filter) {
  activeFilter = filter;
  document.querySelectorAll('.inbox-popover-tabs .inbox-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });
  renderInboxUI();
};

window.markNotifRead = function(id) {
  const notif = notificationsState.find(n => n.id === id);
  if (notif) {
    notif.read = true;
    saveInboxToStorage();
    renderInboxUI();
    updateInboxBadge();
  }
};

window.toggleArchiveNotif = function(id) {
  const notif = notificationsState.find(n => n.id === id);
  if (notif) {
    notif.archived = !notif.archived;
    if (notif.archived) notif.read = true;
    saveInboxToStorage();
    renderInboxUI();
    updateInboxBadge();
  }
};

window.toggleChecklistItem = function(notifId, itemId) {
  const notif = notificationsState.find(n => n.id === notifId);
  if (notif && notif.checklist) {
    const item = notif.checklist.find(c => c.id === itemId);
    if (item) {
      item.done = !item.done;
      saveInboxToStorage();
      renderInboxUI();
    }
  }
};

window.openReplyModal = function(notifId) {
  const notif = notificationsState.find(n => n.id === notifId);
  if (!notif) return;
  
  const replyText = prompt(`Responder a: "${notif.title}"`);
  if (replyText && replyText.trim()) {
    notif.pendingResponse = false;
    notif.read = true;
    saveInboxToStorage();
    renderInboxUI();
    updateInboxBadge();
    if (window.showToast) window.showToast('Resposta enviada com sucesso!', 'success');
  }
};

function formatTimeAgo(isoString) {
  try {
    const date = new Date(isoString);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}m atrás`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h atrás`;
    return `${Math.floor(diffHours / 24)}d atrás`;
  } catch (e) {
    return '';
  }
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

window.initInbox = initInbox;
window.renderInboxUI = renderInboxUI;
window.updateInboxBadge = updateInboxBadge;
window.toggleInboxPopover = toggleInboxPopover;
