/* ──────────────────────────────────────────────────────────────────────────
   maintenance.js — Maintenance Requests Management
   Handles authorization, role separation (Admin vs Tenant views), stats,
   dynamic dropdown pre-fills, and CRUD API calls.
─────────────────────────────────────────────────────────────────────────── */

window.API_BASE = window.API_BASE || 'https://staysphere-backend-1lyo.onrender.com/api';

// ── Auth guard ────────────────────────────────────────────────────────────────
const token = localStorage.getItem('ss_token');
const user  = JSON.parse(localStorage.getItem('ss_user') || 'null');
if (!token || !user) {
  window.location.href = 'index.html';
  throw new Error('Unauthenticated');
}
if (user.role !== 'Admin') {
  window.location.href = 'tenant-dashboard.html';
  throw new Error('Unauthorised');
}

// ── DOM Elements ──────────────────────────────────────────────────────────────
const adminNameEl        = document.getElementById('admin-name');
const adminInitialEl     = document.getElementById('admin-initial');
const greetingEl         = document.getElementById('greeting-text');
const userRoleBadge      = document.getElementById('user-role-badge');
const maintenanceTableBody = document.getElementById('maintenance-table-body');
const emptyState         = document.getElementById('empty-state');
const recordCountEl      = document.getElementById('record-count');
const toast              = document.getElementById('toast');

// Stats DOM Elements
const totalCountEl       = document.getElementById('sc-total');
const pendingCountEl     = document.getElementById('sc-pending');
const inprogressCountEl  = document.getElementById('sc-inprogress');
const resolvedCountEl    = document.getElementById('sc-resolved');

// Search & Filter DOM Elements
const searchInput        = document.getElementById('search-input');
const statusFilter       = document.getElementById('status-filter');
const categoryFilter     = document.getElementById('category-filter');
const priorityFilter     = document.getElementById('priority-filter');

// ── Topbar Info & Role Check ──────────────────────────────────────────────────
if (user) {
  const firstName = user.fullName?.split(' ')[0] || 'User';
  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  adminNameEl.textContent    = user.fullName || 'User';
  adminInitialEl.textContent = firstName[0].toUpperCase();
  greetingEl.textContent     = `${greeting}, ${firstName} 👋`;
  userRoleBadge.textContent  = user.role || 'User';

  // If user is a Tenant, adjust sidebar links (hide Admin specific ones)
  if (user.role === 'Tenant') {
    document.querySelectorAll('.sidebar-nav a[href="rooms.html"], .sidebar-nav a[href="agreements.html"]').forEach(el => el.remove());
  }
}

// ── Mobile Sidebar Toggle ─────────────────────────────────────────────────────
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebar-overlay');
document.getElementById('hamburger').addEventListener('click', () => {
  sidebar.classList.toggle('open');
  overlay.classList.toggle('show');
});
overlay.addEventListener('click', () => {
  sidebar.classList.remove('open');
  overlay.classList.remove('show');
});

// Logout Action
document.getElementById('logout-btn').addEventListener('click', () => {
  localStorage.removeItem('ss_token');
  localStorage.removeItem('ss_user');
  window.location.href = 'index.html';
});

// ── Toast Helper ──────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg, isError = false) {
  document.getElementById('toast-icon').textContent = isError ? '❌' : '✅';
  toast.querySelector('.toast-msg').textContent = msg;
  toast.classList.toggle('error', isError);
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
}

// Helper headers
const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`
});

// Format ISO date to readable string
const fmtDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// ═══════════════════════════════════════════════════════════════════════════════
//  FETCH AND DISPLAY DATA
// ═══════════════════════════════════════════════════════════════════════════════

// Cache for dropdown references in Admin mode
let tenantsCache = [];
let roomsCache = [];

async function loadAdminSelections() {
  if (user.role !== 'Admin') return;

  try {
    const [tenantsRes, roomsRes] = await Promise.all([
      fetch(`${API_BASE}/tenants`, { headers: authHeaders() }),
      fetch(`${API_BASE}/rooms`, { headers: authHeaders() })
    ]);

    if (tenantsRes.ok) {
      const json = await tenantsRes.json();
      tenantsCache = (json.data || []).filter(t => t.status === 'Active');
      
      const selectTenant = document.getElementById('f-tenant');
      selectTenant.innerHTML = '<option value="">— Select Tenant —</option>' +
        tenantsCache.map(t => `<option value="${t._id}">${t.fullName} (${t.roomNumber ? 'Room ' + t.roomNumber : 'No Room'})</option>`).join('');
    }

    if (roomsRes.ok) {
      const json = await roomsRes.json();
      roomsCache = (json.data || []).filter(r => r.status !== 'Maintenance');
      
      const selectRoom = document.getElementById('f-room');
      selectRoom.innerHTML = '<option value="">— Select Room —</option>' +
        roomsCache.map(r => `<option value="${r._id}">Room ${r.roomNumber} (${r.roomType})</option>`).join('');
    }
  } catch (err) {
    console.error('Error loading dropdown lists:', err);
  }
}

async function loadRequests() {
  const search   = searchInput.value.trim();
  const status   = statusFilter.value;
  const category = categoryFilter.value;
  const priority = priorityFilter.value;

  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (status && status !== 'All') params.append('status', status);
  if (category && category !== 'All') params.append('category', category);
  if (priority && priority !== 'All') params.append('priority', priority);

  try {
    const res = await fetch(`${API_BASE}/maintenance?${params}`, { headers: authHeaders() });
    const json = await res.json();
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        localStorage.clear();
        window.location.href = 'index.html';
        return;
      }
      throw new Error(json.message);
    }

    const records = json.data || [];
    renderRequests(records);
    calculateStats(records);
  } catch (err) {
    showToast(err.message || 'Error fetching requests', true);
  }
}

function renderRequests(records) {
  recordCountEl.textContent = `${records.length} request${records.length === 1 ? '' : 's'}`;
  
  if (!records.length) {
    maintenanceTableBody.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }
  
  emptyState.style.display = 'none';

  maintenanceTableBody.innerHTML = records.map((record, index) => {
    const statusClass = {
      Pending: 'status-pending',
      'In Progress': 'status-inprogress',
      Resolved: 'status-resolved'
    }[record.status] || 'status-pending';

    const priorityClass = {
      Low: 'priority-low',
      Medium: 'priority-medium',
      High: 'priority-high'
    }[record.priority] || 'priority-low';

    const tenantName = record.tenant ? record.tenant.fullName : 'N/A';
    const roomNumber = record.room ? 'Room ' + record.room.roomNumber : 'N/A';

    // Tenant action conditions (can only edit/delete if Pending)
    const isPending = record.status === 'Pending';
    const showActions = user.role === 'Admin' || isPending;

    const editBtn = showActions
      ? `<button class="icon-btn" title="Edit" onclick="openEditModal('${record._id}')">✏️</button>`
      : '';
    const deleteBtn = showActions
      ? `<button class="icon-btn delete" title="Delete" onclick="openDeleteConfirm('${record._id}', '${record.requestTitle}')">🗑️</button>`
      : '';

    return `
      <tr>
        <td>${index + 1}</td>
        <td>
          <div class="td-request-title">${record.requestTitle}</div>
          <div style="font-size:0.78rem; color:var(--clr-muted); text-overflow:ellipsis; overflow:hidden; white-space:nowrap; max-width:200px; margin-top:0.15rem;">
            ${record.description}
          </div>
        </td>
        <td>
          <div class="td-tenant-name">${tenantName}</div>
          <div class="td-room-bed">${roomNumber}</div>
        </td>
        <td>${record.category}</td>
        <td><span class="priority-badge ${priorityClass}">${record.priority}</span></td>
        <td><span class="status-badge ${statusClass}">${record.status}</span></td>
        <td style="white-space:nowrap;">${fmtDate(record.requestedAt || record.createdAt)}</td>
        <td>
          <div class="action-cell">
            <button class="icon-btn" title="View Details" onclick="openDetailModal('${record._id}')">👁️</button>
            ${editBtn}
            ${deleteBtn}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function calculateStats(records) {
  totalCountEl.textContent = records.length;
  pendingCountEl.textContent = records.filter(r => r.status === 'Pending').length;
  inprogressCountEl.textContent = records.filter(r => r.status === 'In Progress').length;
  resolvedCountEl.textContent = records.filter(r => r.status === 'Resolved').length;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  INTEGRATIONS AUTO-PREFILL (ADMIN MODE ONLY)
// ═══════════════════════════════════════════════════════════════════════════════

const tenantSelect = document.getElementById('f-tenant');
const roomSelect = document.getElementById('f-room');

if (tenantSelect) {
  tenantSelect.addEventListener('change', () => {
    const tenantId = tenantSelect.value;
    if (!tenantId) return;

    const tenant = tenantsCache.find(t => t._id === tenantId);
    if (tenant && tenant.roomNumber) {
      const room = roomsCache.find(r => String(r.roomNumber).trim().toLowerCase() === String(tenant.roomNumber).trim().toLowerCase());
      if (room) {
        roomSelect.value = room._id;
      }
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ADD / EDIT REQUEST MODAL
// ═══════════════════════════════════════════════════════════════════════════════

const requestModal = document.getElementById('request-modal');
const requestModalTitle = document.getElementById('request-modal-title');
const requestModalSubmit = document.getElementById('request-modal-submit');
const requestForm = document.getElementById('request-form');
const adminSelectGroups = document.getElementById('admin-select-groups');
const adminUpdateFields = document.getElementById('admin-update-fields');
const adminNotesField = document.getElementById('admin-notes-field');

// Form inputs
const inputId = document.getElementById('request-id');
const inputTitle = document.getElementById('f-requestTitle');
const inputCategory = document.getElementById('f-category');
const inputPriority = document.getElementById('f-priority');
const inputDescription = document.getElementById('f-description');
const inputStatus = document.getElementById('f-status');
const inputAssignedTo = document.getElementById('f-assignedTo');
const inputNotes = document.getElementById('f-resolutionNotes');

function openAddModal() {
  requestForm.reset();
  inputId.value = '';

  if (user.role === 'Admin') {
    adminSelectGroups.style.display = 'grid';
    tenantSelect.required = true;
    roomSelect.required = true;
  } else {
    adminSelectGroups.style.display = 'none';
    tenantSelect.required = false;
    roomSelect.required = false;
  }

  adminUpdateFields.style.display = 'none';
  adminNotesField.style.display = 'none';

  requestModalTitle.textContent = 'Submit Maintenance Request';
  requestModalSubmit.textContent = 'Submit Request';
  requestModal.classList.add('open');
  inputTitle.focus();
}

async function openEditModal(id) {
  try {
    const res = await fetch(`${API_BASE}/maintenance/${id}`, { headers: authHeaders() });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message);

    const record = json.data;
    inputId.value = record._id;

    // Prefill fields
    inputTitle.value = record.requestTitle || '';
    inputCategory.value = record.category || '';
    inputPriority.value = record.priority || 'Low';
    inputDescription.value = record.description || '';

    // Selection dropdowns hidden during edit mode
    adminSelectGroups.style.display = 'none';
    tenantSelect.required = false;
    roomSelect.required = false;

    if (user.role === 'Admin') {
      adminUpdateFields.style.display = 'grid';
      adminNotesField.style.display = 'block';

      inputStatus.value = record.status || 'Pending';
      inputAssignedTo.value = record.assignedTo || '';
      inputNotes.value = record.resolutionNotes || '';
    } else {
      adminUpdateFields.style.display = 'none';
      adminNotesField.style.display = 'none';
    }

    requestModalTitle.textContent = user.role === 'Admin' ? 'Update Maintenance Request' : 'Edit Request Info';
    requestModalSubmit.textContent = 'Save Changes';
    requestModal.classList.add('open');
  } catch (err) {
    showToast(err.message || 'Error loading request data', true);
  }
}

function closeRequestModal() {
  requestModal.classList.remove('open');
}

document.getElementById('btn-add-request').addEventListener('click', openAddModal);
document.getElementById('request-modal-close').addEventListener('click', closeRequestModal);
document.getElementById('request-modal-cancel').addEventListener('click', closeRequestModal);
requestModal.addEventListener('click', (e) => { if (e.target === requestModal) closeRequestModal(); });

requestForm.addEventListener('submit', async () => {
  const id = inputId.value;

  const payload = {
    requestTitle: inputTitle.value.trim(),
    category: inputCategory.value,
    priority: inputPriority.value,
    description: inputDescription.value.trim()
  };

  if (!id) {
    if (user.role === 'Admin') {
      payload.tenantId = tenantSelect.value;
      payload.roomId = roomSelect.value;
      if (!payload.tenantId || !payload.roomId) {
        showToast('Please select both tenant and room', true);
        return;
      }
    }
  } else {
    if (user.role === 'Admin') {
      payload.status = inputStatus.value;
      payload.assignedTo = inputAssignedTo.value.trim();
      payload.resolutionNotes = inputNotes.value.trim();
    }
  }

  const url = id ? `${API_BASE}/maintenance/${id}` : `${API_BASE}/maintenance`;
  const method = id ? 'PUT' : 'POST';

  requestModalSubmit.disabled = true;
  requestModalSubmit.textContent = 'Saving...';

  try {
    const res = await fetch(url, {
      method,
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message);

    showToast(id ? 'Request updated successfully' : 'Request submitted successfully');
    closeRequestModal();
    loadRequests();
  } catch (err) {
    showToast(err.message || 'Error saving request details', true);
  } finally {
    requestModalSubmit.disabled = false;
    requestModalSubmit.textContent = id ? 'Save Changes' : 'Submit Request';
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  DETAIL VIEW MODAL
// ═══════════════════════════════════════════════════════════════════════════════

const detailModal = document.getElementById('detail-modal');

async function openDetailModal(id) {
  try {
    const res = await fetch(`${API_BASE}/maintenance/${id}`, { headers: authHeaders() });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message);

    const record = json.data;

    document.getElementById('d-title').textContent = record.requestTitle || '—';
    document.getElementById('d-status-priority').innerHTML = `
      <span class="status-badge status-${record.status?.toLowerCase().replace(' ', '')}">${record.status}</span>
      <span class="priority-badge priority-${record.priority?.toLowerCase()}" style="margin-left:0.5rem;">${record.priority}</span>
    `;

    document.getElementById('d-category').textContent = record.category || '—';
    
    const tName = record.tenant ? record.tenant.fullName : 'N/A';
    const rNum  = record.room ? 'Room ' + record.room.roomNumber : 'N/A';
    document.getElementById('d-tenantName').textContent = `${tName} (${rNum})`;

    document.getElementById('d-submittedOn').textContent = fmtDate(record.requestedAt || record.createdAt);
    document.getElementById('d-resolvedOn').textContent  = fmtDate(record.resolvedAt);

    document.getElementById('d-assignedTo').textContent = record.assignedTo || 'Unassigned (No technician assigned)';
    document.getElementById('d-description').textContent = record.description || '—';
    document.getElementById('d-resolutionNotes').textContent = record.resolutionNotes || 'No notes yet.';

    detailModal.classList.add('open');
  } catch (err) {
    showToast(err.message || 'Error loading details', true);
  }
}

function closeDetailModal() {
  detailModal.classList.remove('open');
}

document.getElementById('detail-modal-close').addEventListener('click', closeDetailModal);
document.getElementById('detail-modal-close-btn').addEventListener('click', closeDetailModal);
detailModal.addEventListener('click', (e) => { if (e.target === detailModal) closeDetailModal(); });

// ═══════════════════════════════════════════════════════════════════════════════
//  DELETE CONFIRM MODAL
// ═══════════════════════════════════════════════════════════════════════════════

const deleteModal = document.getElementById('delete-modal');
const deleteRequestId = document.getElementById('delete-request-id');
const deleteMsg = document.getElementById('delete-msg');
const deleteConfirmBtn = document.getElementById('delete-confirm');

function openDeleteConfirm(id, title) {
  deleteRequestId.value = id;
  deleteMsg.innerHTML = `Are you sure you want to permanently delete request <strong>"${title}"</strong>? This action cannot be undone.`;
  deleteModal.classList.add('open');
}

function closeDeleteModal() {
  deleteModal.classList.remove('open');
}

document.getElementById('delete-cancel').addEventListener('click', closeDeleteModal);
deleteModal.addEventListener('click', (e) => { if (e.target === deleteModal) closeDeleteModal(); });

deleteConfirmBtn.addEventListener('click', async () => {
  const id = deleteRequestId.value;
  deleteConfirmBtn.disabled = true;
  deleteConfirmBtn.textContent = 'Deleting...';

  try {
    const res = await fetch(`${API_BASE}/maintenance/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message);

    showToast('Maintenance request deleted successfully');
    closeDeleteModal();
    loadRequests();
  } catch (err) {
    showToast(err.message || 'Error deleting request', true);
  } finally {
    deleteConfirmBtn.disabled = false;
    deleteConfirmBtn.textContent = 'Yes, Delete';
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  SEARCH & FILTER DEBOUNCING
// ═══════════════════════════════════════════════════════════════════════════════
let searchTimeout;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    loadRequests();
  }, 350);
});

statusFilter.addEventListener('change', loadRequests);
categoryFilter.addEventListener('change', loadRequests);
priorityFilter.addEventListener('change', loadRequests);

// ═══════════════════════════════════════════════════════════════════════════════
//  INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════
async function init() {
  const urlParams = new URLSearchParams(window.location.search);
  const queryStatus = urlParams.get('status');
  if (queryStatus) {
    statusFilter.value = queryStatus;
  }
  await Promise.all([
    loadAdminSelections(),
    loadRequests()
  ]);
}

init();

// Export helper triggers for inline HTML callbacks
window.openDetailModal = openDetailModal;
window.openEditModal = openEditModal;
window.openDeleteConfirm = openDeleteConfirm;
