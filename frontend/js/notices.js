/* ──────────────────────────────────────────────────────────────────────────
   notices.js — Notice Board Management Logic (Admin Panel)
   ─────────────────────────────────────────────────────────────────────────── */


// ── Auth Guard ────────────────────────────────────────────────────────────────
const token = localStorage.getItem('ss_token');
const user  = JSON.parse(localStorage.getItem('ss_user') || 'null');

if (!token || !user) {
  window.location.href = 'index.html';
  throw new Error('Unauthenticated – redirecting');
}

// Ensure Admin role
if (user.role !== 'Admin') {
  window.location.href = 'tenant-dashboard.html';
  throw new Error('Unauthorized – redirecting to tenant portal');
}

// ── DOM References ────────────────────────────────────────────────────────────
const adminNameEl     = document.getElementById('admin-name');
const adminInitialEl  = document.getElementById('admin-initial');
const greetingEl      = document.getElementById('greeting-text');
const toast           = document.getElementById('toast');
const sidebar         = document.getElementById('sidebar');
const overlay         = document.getElementById('sidebar-overlay');
const hamburger       = document.getElementById('hamburger');

const noticesTableBody = document.getElementById('notices-table-body');
const emptyState       = document.getElementById('empty-state');

// Filter references
const searchInput     = document.getElementById('search-input');
const categoryFilter   = document.getElementById('filter-category');
const audienceFilter   = document.getElementById('filter-audience');

// Modals & Buttons
const btnAddNotice     = document.getElementById('btn-add-notice');
const noticeModal      = document.getElementById('notice-modal');
const noticeModalTitle = document.getElementById('notice-modal-title');
const noticeModalClose = document.getElementById('notice-modal-close');
const noticeModalCancel= document.getElementById('notice-modal-cancel');
const noticeModalSubmit= document.getElementById('notice-modal-submit');
const noticeForm       = document.getElementById('notice-form');

const deleteModal      = document.getElementById('delete-modal');
const deleteModalClose = document.getElementById('delete-modal-close');
const deleteModalCancel= document.getElementById('delete-modal-cancel');
const deleteModalConfirm=document.getElementById('delete-modal-confirm');

// Stat DOMs
const statTotal       = document.getElementById('stat-total');
const statActive      = document.getElementById('stat-active');
const statExpired     = document.getElementById('stat-expired');

let noticesList = [];
let deleteTargetId = null;

// ── Header / Greet Initialisation ──────────────────────────────────────────────
if (user) {
  const firstName = user.fullName?.split(' ')[0] || 'Admin';
  adminNameEl.textContent    = user.fullName || 'Admin';
  adminInitialEl.textContent = firstName[0].toUpperCase();
  const hour = new Date().getHours();
  const greetWord = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  greetingEl.textContent     = `${greetWord}, ${firstName} 👋`;
}

// ── Mobile Sidebar Navigation ─────────────────────────────────────────────────
hamburger?.addEventListener('click', () => {
  sidebar?.classList.toggle('open');
  overlay?.classList.toggle('show');
});

overlay?.addEventListener('click', () => {
  sidebar?.classList.remove('open');
  overlay?.classList.remove('show');
});

document.getElementById('logout-btn')?.addEventListener('click', () => {
  localStorage.removeItem('ss_token');
  localStorage.removeItem('ss_user');
  window.location.href = 'index.html';
});

// ── Toast Helper ──────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg, isError = false) {
  if (!toast) return;
  toast.querySelector('.toast-msg').textContent = msg;
  toast.classList.toggle('error', isError);
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
}

// ── Date Formatter Helpers ────────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function formatDateForInput(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const month = '' + (d.getMonth() + 1);
  const day = '' + d.getDate();
  const year = d.getFullYear();
  return [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
}

// ── API Operations ────────────────────────────────────────────────────────────
async function fetchNotices() {
  const searchVal = searchInput.value.trim();
  const categoryVal = categoryFilter.value;
  const audienceVal = audienceFilter.value;

  let url = `${API_BASE}/notices?category=${encodeURIComponent(categoryVal)}&audience=${encodeURIComponent(audienceVal)}`;
  if (searchVal) {
    url += `&search=${encodeURIComponent(searchVal)}`;
  }

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.status === 401 || res.status === 403) {
      showToast('Session expired. Redirecting...', true);
      setTimeout(() => {
        localStorage.clear();
        window.location.href = 'index.html';
      }, 1500);
      return;
    }

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Could not fetch notices');

    noticesList = json.data || [];
    renderNotices(noticesList);
    updateStats(noticesList);

  } catch (error) {
    showToast(error.message, true);
  }
}

// ── Render Notices ────────────────────────────────────────────────────────────
function renderNotices(notices) {
  noticesTableBody.innerHTML = '';

  if (notices.length === 0) {
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';

  const now = new Date();

  notices.forEach(n => {
    const tr = document.createElement('tr');

    const isExpired = n.expiryDate && new Date(n.expiryDate) <= now;
    let statusLabel = 'Active';
    if (!n.isActive) statusLabel = 'Inactive';
    else if (isExpired) statusLabel = 'Expired';

    tr.innerHTML = `
      <td style="max-width: 250px;">
        <div style="font-weight: 600; color: var(--clr-text); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;" title="${n.title}">
          ${n.title}
        </div>
        <div style="font-size: 0.75rem; color: var(--clr-muted); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;" title="${n.description}">
          ${n.description}
        </div>
      </td>
      <td>
        <span style="font-size: 0.78rem; font-weight:500; background:rgba(108,99,255,0.1); color:var(--clr-primary); padding:0.2rem 0.5rem; border-radius:6px;">
          ${n.category}
        </span>
      </td>
      <td>
        <span style="font-size:0.75rem; color:var(--clr-muted); font-weight:500;">
          👥 ${n.audience}
        </span>
      </td>
      <td>
        <span class="prio-badge ${n.priority}">${n.priority}</span>
      </td>
      <td style="font-size:0.8rem; color:var(--clr-text);">${formatDate(n.publishDate)}</td>
      <td style="font-size:0.8rem; color:var(--clr-muted);">${formatDate(n.expiryDate)}</td>
      <td>
        <span class="status-badge ${statusLabel}">${statusLabel}</span>
      </td>
      <td>
        <div style="display:flex; gap:0.5rem;">
          <button class="btn btn-ghost" onclick="openEditNotice('${n._id}')" style="padding:0.35rem 0.65rem; font-size:0.75rem;">✏️ Edit</button>
          <button class="btn btn-danger" onclick="openDeleteNotice('${n._id}')" style="padding:0.35rem 0.65rem; font-size:0.75rem;">🗑️ Delete</button>
        </div>
      </td>
    `;
    noticesTableBody.appendChild(tr);
  });
}

// ── Update Statistics ─────────────────────────────────────────────────────────
function updateStats(notices) {
  const now = new Date();
  const total = notices.length;
  
  const active = notices.filter(n => {
    const expired = n.expiryDate && new Date(n.expiryDate) <= now;
    return n.isActive && !expired;
  }).length;

  const expiredOrInactive = total - active;

  statTotal.textContent = total;
  statActive.textContent = active;
  statExpired.textContent = expiredOrInactive;
}

// ── Modal Actions ─────────────────────────────────────────────────────────────
function resetForm() {
  document.getElementById('notice-id').value = '';
  noticeForm.reset();
  
  // Set default publish date to today
  document.getElementById('form-publishDate').value = formatDateForInput(new Date());
  document.getElementById('form-isActive').checked = true;
  
  noticeModalTitle.textContent = 'Create Notice';
  noticeModalSubmit.textContent = 'Publish Notice';
}

function openAddNotice() {
  resetForm();
  noticeModal.style.display = 'flex';
}

window.openEditNotice = function(id) {
  const notice = noticesList.find(n => n._id === id);
  if (!notice) return;

  resetForm();
  document.getElementById('notice-id').value = notice._id;
  document.getElementById('form-title').value = notice.title;
  document.getElementById('form-category').value = notice.category;
  document.getElementById('form-priority').value = notice.priority;
  document.getElementById('form-audience').value = notice.audience;
  document.getElementById('form-publishDate').value = formatDateForInput(notice.publishDate);
  document.getElementById('form-expiryDate').value = formatDateForInput(notice.expiryDate);
  document.getElementById('form-isActive').checked = notice.isActive;
  document.getElementById('form-description').value = notice.description;

  noticeModalTitle.textContent = 'Edit Notice';
  noticeModalSubmit.textContent = 'Update Notice';
  noticeModal.style.display = 'flex';
};

window.openDeleteNotice = function(id) {
  deleteTargetId = id;
  deleteModal.style.display = 'flex';
};

// Modal Close Handlers
function closeNoticeModal() {
  noticeModal.style.display = 'none';
}

function closeDeleteModal() {
  deleteTargetId = null;
  deleteModal.style.display = 'none';
}

// Submit Notice Form (Add / Edit)
noticeForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = document.getElementById('notice-id').value;
  const title = document.getElementById('form-title').value.trim();
  const category = document.getElementById('form-category').value;
  const priority = document.getElementById('form-priority').value;
  const audience = document.getElementById('form-audience').value;
  const publishDate = document.getElementById('form-publishDate').value;
  const expiryDate = document.getElementById('form-expiryDate').value || undefined;
  const isActive = document.getElementById('form-isActive').checked;
  const description = document.getElementById('form-description').value.trim();

  const payload = {
    title,
    category,
    priority,
    audience,
    publishDate,
    expiryDate,
    isActive,
    description
  };

  const isEdit = !!id;
  const url = isEdit ? `${API_BASE}/notices/${id}` : `${API_BASE}/notices`;
  const method = isEdit ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to submit notice form');

    showToast(isEdit ? 'Notice updated successfully' : 'Notice posted successfully');
    closeNoticeModal();
    fetchNotices();

  } catch (error) {
    showToast(error.message, true);
  }
});

// Confirm Delete Operations
deleteModalConfirm.addEventListener('click', async () => {
  if (!deleteTargetId) return;

  try {
    const res = await fetch(`${API_BASE}/notices/${deleteTargetId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to delete notice');

    showToast('Notice deleted successfully');
    closeDeleteModal();
    fetchNotices();

  } catch (error) {
    showToast(error.message, true);
  }
});

// Event Listeners
btnAddNotice.addEventListener('click', openAddNotice);
noticeModalClose.addEventListener('click', closeNoticeModal);
noticeModalCancel.addEventListener('click', closeNoticeModal);
deleteModalClose.addEventListener('click', closeDeleteModal);
deleteModalCancel.addEventListener('click', closeDeleteModal);

// Search & Filter listeners
let debounceTimer;
searchInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(fetchNotices, 400);
});

categoryFilter.addEventListener('change', fetchNotices);
audienceFilter.addEventListener('change', fetchNotices);

// Initial Load
fetchNotices();
