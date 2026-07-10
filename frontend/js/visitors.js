/* ──────────────────────────────────────────────────────────────────────────
   visitors.js — Visitor Management Logic
   Handles authorization, active tenant fetching, live room auto-prefill,
   CRUD operations, Check-In/Check-Out flow, and statistics updates.
─────────────────────────────────────────────────────────────────────────── */


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
const adminNameEl         = document.getElementById('admin-name');
const adminInitialEl      = document.getElementById('admin-initial');
const greetingEl          = document.getElementById('greeting-text');
const visitorsTableBody   = document.getElementById('visitors-table-body');
const emptyState          = document.getElementById('empty-state');
const recordCountEl       = document.getElementById('record-count');
const toast               = document.getElementById('toast');

// Stats DOM Elements
const totalCountEl        = document.getElementById('sc-total');
const checkedInCountEl    = document.getElementById('sc-checkedin');
const checkedOutCountEl   = document.getElementById('sc-checkedout');

// Search & Filter DOM Elements
const searchInput         = document.getElementById('search-input');
const statusFilter        = document.getElementById('status-filter');

// Modals & Forms
const visitorModal        = document.getElementById('visitor-modal');
const visitorModalTitle   = document.getElementById('visitor-modal-title');
const visitorModalSubmit  = document.getElementById('visitor-modal-submit');
const visitorForm         = document.getElementById('visitor-form');
const deleteModal         = document.getElementById('delete-modal');

// Form Fields
const inputId             = document.getElementById('visitor-id');
const inputVisitorName    = document.getElementById('f-visitorName');
const inputPhoneNumber    = document.getElementById('f-phoneNumber');
const inputTenant         = document.getElementById('f-tenant');
const inputRoomNumber     = document.getElementById('f-roomNumber');
const inputRelationship   = document.getElementById('f-relationship');
const inputPurpose        = document.getElementById('f-purpose');
const inputIdProofType    = document.getElementById('f-idProofType');
const inputIdProofNumber  = document.getElementById('f-idProofNumber');
const inputRemarks        = document.getElementById('f-remarks');

// ── Cache for Tenants ────────────────────────────────────────────────────────
let tenantsCache = [];
let visitorsCache = [];

// ── Topbar Info ──────────────────────────────────────────────────────────────
if (user) {
  const firstName = user.fullName?.split(' ')[0] || 'Admin';
  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  adminNameEl.textContent    = user.fullName || 'Admin';
  adminInitialEl.textContent = firstName[0].toUpperCase();
  greetingEl.textContent     = `${greeting}, ${firstName} 👋`;
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

// Format datetime beautifully
const fmtDateTime = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

// ═══════════════════════════════════════════════════════════════════════════════
//  FETCH AND DISPLAY DATA
// ═══════════════════════════════════════════════════════════════════════════════

// 1. Fetch dropdown data (Tenants)
async function loadDropdownData() {
  try {
    const res = await fetch(`${API_BASE}/tenants`, { headers: authHeaders() });
    if (res.ok) {
      const json = await res.json();
      tenantsCache = json.data || [];
      const activeTenants = tenantsCache.filter(t => t.status === 'Active');
      inputTenant.innerHTML = '<option value="">— Select Tenant —</option>' +
        activeTenants.map(t => `<option value="${t._id}">${t.fullName} (${t.phoneNumber})</option>`).join('');
    }
  } catch (err) {
    console.error('Error loading tenants list:', err);
  }
}

// 2. Fetch Visitor statistics and logs
async function loadVisitorsData() {
  try {
    // Load Stats
    const statsRes = await fetch(`${API_BASE}/visitors/stats`, { headers: authHeaders() });
    if (statsRes.ok) {
      const statsJson = await statsRes.json();
      const stats = statsJson.data || {};
      totalCountEl.textContent = stats.todayTotal ?? 0;
      checkedInCountEl.textContent = stats.checkedIn ?? 0;
      checkedOutCountEl.textContent = stats.checkedOutToday ?? 0;
    }

    // Load Logs
    const res = await fetch(`${API_BASE}/visitors`, { headers: authHeaders() });
    const json = await res.json();
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        localStorage.clear();
        window.location.href = 'index.html';
        return;
      }
      throw new Error(json.message);
    }
    visitorsCache = json.data || [];
    applyFiltersAndSearch();
  } catch (err) {
    showToast(err.message || 'Error fetching visitors data', true);
  }
}

// 3. Render visitors to the table
function renderVisitors(records) {
  recordCountEl.textContent = `${records.length} log${records.length === 1 ? '' : 's'}`;

  if (!records.length) {
    visitorsTableBody.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';

  visitorsTableBody.innerHTML = records.map((record, index) => {
    let statusClass = 'status-registered';
    if (record.status === 'Checked In') statusClass = 'status-checkedin';
    if (record.status === 'Checked Out') statusClass = 'status-checkedout';

    const checkInStr = record.checkInTime ? fmtDateTime(record.checkInTime) : '—';
    const checkOutStr = record.checkOutTime ? fmtDateTime(record.checkOutTime) : '—';

    // Conditionally show Check-In / Check-Out buttons
    let statusActionBtn = '';
    if (record.status === 'Registered') {
      statusActionBtn = `<button class="icon-btn checkin" title="Check In" onclick="handleCheckIn('${record._id}')">🚪 Check In</button>`;
    } else if (record.status === 'Checked In') {
      statusActionBtn = `<button class="icon-btn checkout" title="Check Out" onclick="handleCheckOut('${record._id}')">🏃 Check Out</button>`;
    }

    return `
      <tr>
        <td>${index + 1}</td>
        <td>
          <div class="td-visitor-title">${record.visitorName}</div>
          <div class="td-sub-info">📞 ${record.phoneNumber}</div>
          ${record.idProofType ? `<div class="td-sub-info">🪪 ${record.idProofType}: ${record.idProofNumber || '—'}</div>` : ''}
        </td>
        <td>
          <div style="font-weight:600;">${record.tenantName || '—'}</div>
          <div class="td-sub-info">🚪 Room ${record.roomNumber || '—'}</div>
        </td>
        <td>
          <div style="font-weight:500;">${record.relationshipToTenant}</div>
          <div class="td-sub-info">${record.purposeOfVisit}</div>
        </td>
        <td>
          <div style="font-size:0.8rem; color:var(--clr-success);">In: ${checkInStr}</div>
          <div style="font-size:0.8rem; color:var(--clr-primary); margin-top:0.15rem;">Out: ${checkOutStr}</div>
        </td>
        <td><span class="status-badge ${statusClass}">${record.status}</span></td>
        <td>
          <div class="action-cell">
            ${statusActionBtn}
            <button class="icon-btn" title="Edit" onclick="openEditModal('${record._id}')">✏️</button>
            <button class="icon-btn delete" title="Delete" onclick="openDeleteConfirm('${record._id}', '${record.visitorName}')">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// 4. Handle live filters & search
function applyFiltersAndSearch() {
  const query = searchInput.value.toLowerCase().trim();
  const status = statusFilter.value;

  const filtered = visitorsCache.filter(v => {
    // Search filter
    const matchesSearch = !query || 
      (v.visitorName || '').toLowerCase().includes(query) ||
      (v.tenantName || '').toLowerCase().includes(query) ||
      (v.phoneNumber || '').toLowerCase().includes(query) ||
      (v.roomNumber || '').toLowerCase().includes(query);

    // Status filter
    const matchesStatus = status === 'All' || v.status === status;

    return matchesSearch && matchesStatus;
  });

  renderVisitors(filtered);
}

searchInput.addEventListener('input', applyFiltersAndSearch);
statusFilter.addEventListener('change', applyFiltersAndSearch);

// ═══════════════════════════════════════════════════════════════════════════════
//  AUTO-PREFILL INTERACTIVE LOGIC
// ═══════════════════════════════════════════════════════════════════════════════
inputTenant.addEventListener('change', () => {
  const selectedTenantId = inputTenant.value;
  if (!selectedTenantId) {
    inputRoomNumber.value = '';
    return;
  }
  const tenant = tenantsCache.find(t => t._id === selectedTenantId);
  if (tenant) {
    inputRoomNumber.value = tenant.roomNumber || 'Not assigned';
  } else {
    inputRoomNumber.value = '';
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  CHECK-IN / CHECK-OUT ACTIONS
// ═══════════════════════════════════════════════════════════════════════════════
window.handleCheckIn = async (id) => {
  try {
    const res = await fetch(`${API_BASE}/visitors/${id}/checkin`, {
      method: 'POST',
      headers: authHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message);
    showToast(json.message || 'Checked in successfully');
    loadVisitorsData();
  } catch (err) {
    showToast(err.message || 'Error checking in', true);
  }
};

window.handleCheckOut = async (id) => {
  try {
    const res = await fetch(`${API_BASE}/visitors/${id}/checkout`, {
      method: 'POST',
      headers: authHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message);
    showToast(json.message || 'Checked out successfully');
    loadVisitorsData();
  } catch (err) {
    showToast(err.message || 'Error checking out', true);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  ADD / EDIT VISITOR MODAL
// ═══════════════════════════════════════════════════════════════════════════════
document.getElementById('btn-add-visitor').addEventListener('click', openAddModal);
document.getElementById('visitor-modal-close').addEventListener('click', closeVisitorModal);
document.getElementById('visitor-modal-cancel').addEventListener('click', closeVisitorModal);

function openAddModal() {
  visitorForm.reset();
  inputId.value = '';
  inputRoomNumber.value = '';
  visitorModalTitle.textContent = 'Register Visitor';
  visitorModalSubmit.textContent = 'Save Visitor';
  visitorModal.classList.add('open');
}

function closeVisitorModal() {
  visitorModal.classList.remove('open');
}

window.openEditModal = async (id) => {
  try {
    const res = await fetch(`${API_BASE}/visitors/${id}`, { headers: authHeaders() });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message);
    
    const record = json.data;
    if (!record) return;

    // Prefill form
    inputId.value = record._id;
    inputVisitorName.value = record.visitorName || '';
    inputPhoneNumber.value = record.phoneNumber || '';
    inputTenant.value = record.tenant ? (record.tenant._id || record.tenant) : '';
    inputRoomNumber.value = record.roomNumber || '';
    inputRelationship.value = record.relationshipToTenant || '';
    inputPurpose.value = record.purposeOfVisit || '';
    inputIdProofType.value = record.idProofType || '';
    inputIdProofNumber.value = record.idProofNumber || '';
    inputRemarks.value = record.remarks || '';

    visitorModalTitle.textContent = 'Edit Visitor Details';
    visitorModalSubmit.textContent = 'Save Changes';
    visitorModal.classList.add('open');
  } catch (err) {
    showToast(err.message || 'Error loading visitor details', true);
  }
};

// Handle Form Submission (Create/Edit)
visitorForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = inputId.value;
  const isEdit = !!id;

  const payload = {
    visitorName: inputVisitorName.value.trim(),
    phoneNumber: inputPhoneNumber.value.trim(),
    tenant: inputTenant.value,
    relationshipToTenant: inputRelationship.value.trim(),
    purposeOfVisit: inputPurpose.value.trim(),
    idProofType: inputIdProofType.value,
    idProofNumber: inputIdProofNumber.value.trim(),
    remarks: inputRemarks.value.trim()
  };

  try {
    const url = isEdit ? `${API_BASE}/visitors/${id}` : `${API_BASE}/visitors`;
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method: method,
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message);

    showToast(isEdit ? 'Visitor details updated' : 'Visitor registered successfully');
    closeVisitorModal();
    loadVisitorsData();
  } catch (err) {
    showToast(err.message || 'Error saving visitor record', true);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  DELETE CONFIRMATION FLOW
// ═══════════════════════════════════════════════════════════════════════════════
const deleteVisitorIdInput = document.getElementById('delete-visitor-id');
const deleteMsg = document.getElementById('delete-msg');

window.openDeleteConfirm = (id, name) => {
  deleteVisitorIdInput.value = id;
  deleteMsg.textContent = `Are you sure you want to delete the visitor record for "${name}"? This action cannot be undone.`;
  deleteModal.classList.add('open');
};

document.getElementById('delete-cancel').addEventListener('click', () => {
  deleteModal.classList.remove('open');
});

document.getElementById('delete-confirm').addEventListener('click', async () => {
  const id = deleteVisitorIdInput.value;
  if (!id) return;

  try {
    const res = await fetch(`${API_BASE}/visitors/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message);

    showToast('Visitor record deleted successfully');
    deleteModal.classList.remove('open');
    loadVisitorsData();
  } catch (err) {
    showToast(err.message || 'Error deleting visitor record', true);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════
(async () => {
  await loadDropdownData();
  await loadVisitorsData();
})();
