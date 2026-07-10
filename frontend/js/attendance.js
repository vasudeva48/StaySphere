/* ──────────────────────────────────────────────────────────────────────────
   attendance.js — Attendance & Check-In Module Logic
   Handles authorization, active tenant dropdowns, live prefill,
   Check-In / Check-Out operations, stats summary, log history, search and filters.
   ─────────────────────────────────────────────────────────────────────────── */

const API_BASE = 'http://localhost:5000/api';

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
const attendanceTableBody = document.getElementById('attendance-table-body');
const emptyState          = document.getElementById('empty-state');
const recordCountEl       = document.getElementById('record-count');
const toast               = document.getElementById('toast');

// Stats DOM Elements
const scCheckinsEl        = document.getElementById('sc-checkins');
const scCurrentlyInEl     = document.getElementById('sc-currently-in');
const scCheckoutsEl       = document.getElementById('sc-checkouts');
const scAbsentEl          = document.getElementById('sc-absent');

// Search & Filter DOM Elements
const searchInput         = document.getElementById('search-input');
const statusFilter        = document.getElementById('status-filter');
const dateFilter          = document.getElementById('date-filter');

// Modals & Forms
const attendanceModal       = document.getElementById('attendance-modal');
const attendanceModalTitle  = document.getElementById('attendance-modal-title');
const attendanceModalSubmit = document.getElementById('attendance-modal-submit');
const attendanceForm        = document.getElementById('attendance-form');
const deleteModal           = document.getElementById('delete-modal');

// Form Fields
const actionModeInput       = document.getElementById('attendance-action-mode');
const recordIdInput         = document.getElementById('attendance-record-id');
const inputTenant           = document.getElementById('f-tenant');
const inputRoomNumber       = document.getElementById('f-roomNumber');
const inputBedNumber         = document.getElementById('f-bedNumber');
const inputDate             = document.getElementById('f-date');
const inputStatus           = document.getElementById('f-status');
const inputRemarks          = document.getElementById('f-remarks');

const fStatusGroup          = document.getElementById('f-status-group');
const formRowExtraOptions   = document.getElementById('form-row-extra-options');

// Delete modal fields
const deleteRecordIdInput   = document.getElementById('delete-record-id');
const deleteMsgEl           = document.getElementById('delete-msg');

// ── Cache arrays ─────────────────────────────────────────────────────────────
let tenantsCache = [];
let attendanceLogs = [];

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

// Format date nicely
const fmtDateOnly = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

// Format datetime beautifully
const fmtTimeOnly = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

// Set default date filter to today
dateFilter.value = new Date().toISOString().split('T')[0];

// ═══════════════════════════════════════════════════════════════════════════════
//  FETCH AND DISPLAY DATA
// ═══════════════════════════════════════════════════════════════════════════════

// 1. Fetch dropdown data (Active Tenants)
async function loadDropdownData() {
  try {
    const res = await fetch(`${API_BASE}/tenants`, { headers: authHeaders() });
    if (res.ok) {
      const json = await res.json();
      tenantsCache = json.data || [];
      const activeTenants = tenantsCache.filter(t => t.status === 'Active');
      inputTenant.innerHTML = '<option value="">— Select Tenant —</option>' +
        activeTenants.map(t => `<option value="${t._id}">${t.fullName} (${t.roomNumber ? 'Room ' + t.roomNumber : 'No Room'})</option>`).join('');
    }
  } catch (err) {
    console.error('Error loading tenants list:', err);
  }
}

// Auto-populate room and bed on tenant select
inputTenant.addEventListener('change', (e) => {
  const selectedId = e.target.value;
  const tenant = tenantsCache.find(t => t._id === selectedId);
  inputRoomNumber.value = tenant ? (tenant.roomNumber || '') : '';
  inputBedNumber.value  = tenant ? (tenant.bedNumber || '') : '';
});

// 2. Fetch Attendance stats summary
async function loadStatsSummary() {
  try {
    const res = await fetch(`${API_BASE}/attendance/summary`, { headers: authHeaders() });
    if (res.ok) {
      const json = await res.json();
      const stats = json.data || {};
      scCheckinsEl.textContent    = stats.checkedIn ?? 0;
      scCurrentlyInEl.textContent = (stats.checkedIn ?? 0) + (stats.present ?? 0);
      scCheckoutsEl.textContent   = stats.checkedOut ?? 0;
      scAbsentEl.textContent      = stats.absent ?? 0;
    }
  } catch (err) {
    console.error('Error fetching attendance summary:', err);
  }
}

// 3. Fetch logs and render
async function loadAttendanceLogs() {
  try {
    // Get status and search values
    const dateVal = dateFilter.value;
    const statusVal = statusFilter.value;

    let url = `${API_BASE}/attendance`;
    const params = [];
    if (dateVal) params.push(`date=${dateVal}`);
    if (statusVal && statusVal !== 'All') params.push(`status=${statusVal}`);
    if (params.length) url += '?' + params.join('&');

    const res = await fetch(url, { headers: authHeaders() });
    const json = await res.json();
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        localStorage.clear();
        window.location.href = 'index.html';
        return;
      }
      throw new Error(json.message);
    }
    attendanceLogs = json.data || [];
    applyClientFilteringAndSearch();
  } catch (err) {
    showToast(err.message || 'Error fetching attendance logs', true);
  }
}

// 4. Render to the table
function renderAttendance(records) {
  recordCountEl.textContent = `${records.length} record${records.length === 1 ? '' : 's'}`;

  if (!records.length) {
    attendanceTableBody.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';

  attendanceTableBody.innerHTML = records.map((record, index) => {
    let statusClass = 'status-present';
    if (record.status === 'Checked In') statusClass = 'status-checkedin';
    if (record.status === 'Checked Out') statusClass = 'status-checkedout';
    if (record.status === 'Absent') statusClass = 'status-absent';

    const checkInStr = record.checkInTime ? fmtTimeOnly(record.checkInTime) : '—';
    const checkOutStr = record.checkOutTime ? fmtTimeOnly(record.checkOutTime) : '—';

    // Check-out quick button if status is 'Checked In' or 'Present'
    let checkoutActionBtn = '';
    if (record.status === 'Checked In' || record.status === 'Present') {
      checkoutActionBtn = `<button class="icon-btn checkout" title="Check Out Tenant" onclick="handleQuickCheckout('${record.tenant._id}')">🏃 Check-Out</button>`;
    }

    return `
      <tr>
        <td>${index + 1}</td>
        <td>
          <div class="td-tenant-title">${record.tenantName}</div>
          <div class="td-sub-info">📞 ${record.tenant?.phoneNumber || '—'}</div>
        </td>
        <td>
          <div style="font-weight:600;">🚪 Room ${record.roomNumber || '—'}</div>
          <div class="td-sub-info">🛏️ Bed ${record.bedNumber || '—'}</div>
        </td>
        <td>${fmtDateOnly(record.date)}</td>
        <td style="color:var(--clr-success); font-weight:500;">${checkInStr}</td>
        <td style="color:var(--clr-accent); font-weight:500;">${checkOutStr}</td>
        <td><span class="status-badge ${statusClass}">${record.status}</span></td>
        <td style="max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${record.remarks || ''}">
          ${record.remarks || '—'}
        </td>
        <td>
          <div class="action-cell">
            ${checkoutActionBtn}
            <button class="icon-btn" title="Edit" onclick="openEditModal('${record._id}')">✏️</button>
            <button class="icon-btn delete" title="Delete" onclick="openDeleteConfirm('${record._id}', '${record.tenantName}')">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Client filtering and search logic
function applyClientFilteringAndSearch() {
  const query = searchInput.value.toLowerCase().trim();
  const records = attendanceLogs.filter(r => {
    const matchesSearch = !query ||
      (r.tenantName || '').toLowerCase().includes(query) ||
      (r.roomNumber || '').toLowerCase().includes(query) ||
      (r.bedNumber || '').toLowerCase().includes(query) ||
      (r.remarks || '').toLowerCase().includes(query);
    return matchesSearch;
  });
  renderAttendance(records);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  EVENT LISTENERS & FILTER HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════
searchInput.addEventListener('input', applyClientFilteringAndSearch);
dateFilter.addEventListener('change', () => {
  loadAttendanceLogs();
});
statusFilter.addEventListener('change', () => {
  loadAttendanceLogs();
});

// ═══════════════════════════════════════════════════════════════════════════════
//  MODALS & ACTIONS FLOW
// ═══════════════════════════════════════════════════════════════════════════════

// Trigger modal for Check-In
document.getElementById('btn-checkin-trigger').addEventListener('click', () => {
  attendanceModalTitle.textContent = 'Tenant Check-In';
  actionModeInput.value = 'checkin';
  recordIdInput.value = '';
  attendanceForm.reset();

  // Show status & date selection for check-in
  formRowExtraOptions.style.display = 'grid';
  fStatusGroup.style.display = 'flex';
  inputDate.value = new Date().toISOString().split('T')[0];
  inputStatus.value = 'Checked In';

  // Enable tenant selection dropdown
  inputTenant.disabled = false;

  attendanceModal.classList.add('open');
});

// Trigger modal for Check-Out
document.getElementById('btn-checkout-trigger').addEventListener('click', () => {
  attendanceModalTitle.textContent = 'Tenant Check-Out';
  actionModeInput.value = 'checkout';
  recordIdInput.value = '';
  attendanceForm.reset();

  // Hide extra status options and date input for simple quick check-out
  formRowExtraOptions.style.display = 'none';
  fStatusGroup.style.display = 'none';

  // Enable tenant selection dropdown
  inputTenant.disabled = false;

  attendanceModal.classList.add('open');
});

// Open edit modal
async function openEditModal(id) {
  try {
    const res = await fetch(`${API_BASE}/attendance/${id}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Could not load record details');
    const json = await res.json();
    const record = json.data;

    attendanceModalTitle.textContent = 'Edit Attendance Record';
    actionModeInput.value = 'edit';
    recordIdInput.value = record._id;

    // Populating dropdowns
    inputTenant.value = record.tenant?._id || '';
    inputTenant.disabled = true; // Cannot change tenant on existing log

    inputRoomNumber.value = record.roomNumber || '';
    inputBedNumber.value  = record.bedNumber || '';
    inputRemarks.value    = record.remarks || '';

    // Show date & status
    formRowExtraOptions.style.display = 'grid';
    fStatusGroup.style.display = 'flex';

    if (record.date) {
      inputDate.value = new Date(record.date).toISOString().split('T')[0];
    }
    inputStatus.value = record.status;

    attendanceModal.classList.add('open');
  } catch (err) {
    showToast(err.message, true);
  }
}

// Handle Form Submit (Checkin / Checkout / Edit)
attendanceForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const mode = actionModeInput.value;
  const tenantId = inputTenant.value;
  const remarks = inputRemarks.value;
  const dateVal = inputDate.value;
  const statusVal = inputStatus.value;

  if (!tenantId) {
    showToast('Please select a tenant', true);
    return;
  }

  let url = '';
  let method = 'POST';
  let body = {};

  if (mode === 'checkin') {
    url = `${API_BASE}/attendance/checkin`;
    body = { tenant: tenantId, remarks, date: dateVal, status: statusVal };
  } else if (mode === 'checkout') {
    url = `${API_BASE}/attendance/checkout`;
    body = { tenant: tenantId, remarks };
  } else if (mode === 'edit') {
    const editId = recordIdInput.value;
    url = `${API_BASE}/attendance/${editId}`;
    method = 'PUT';
    body = { status: statusVal, remarks, date: dateVal, roomNumber: inputRoomNumber.value, bedNumber: inputBedNumber.value };
  }

  try {
    const res = await fetch(url, {
      method,
      headers: authHeaders(),
      body: JSON.stringify(body)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Operation failed');

    showToast(json.message || 'Record saved successfully');
    attendanceModal.classList.remove('open');

    // Reload lists and counts
    loadStatsSummary();
    loadAttendanceLogs();
  } catch (err) {
    showToast(err.message, true);
  }
});

// Quick Check-out button action directly on the table
async function handleQuickCheckout(tenantId) {
  try {
    const res = await fetch(`${API_BASE}/attendance/checkout`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ tenant: tenantId })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message);

    showToast(json.message);
    loadStatsSummary();
    loadAttendanceLogs();
  } catch (err) {
    showToast(err.message, true);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  DELETE RECORD ACTION
// ═══════════════════════════════════════════════════════════════════════════════
function openDeleteConfirm(id, tenantName) {
  deleteRecordIdInput.value = id;
  deleteMsgEl.textContent = `Are you sure you want to delete the attendance log for "${tenantName}"? This action cannot be undone.`;
  deleteModal.classList.add('open');
}

document.getElementById('delete-confirm').addEventListener('click', async () => {
  const id = deleteRecordIdInput.value;
  try {
    const res = await fetch(`${API_BASE}/attendance/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message);

    showToast('Attendance log deleted successfully');
    deleteModal.classList.remove('open');
    loadStatsSummary();
    loadAttendanceLogs();
  } catch (err) {
    showToast(err.message, true);
  }
});

// Cancel Delete
document.getElementById('delete-cancel').addEventListener('click', () => {
  deleteModal.classList.remove('open');
});

// Cancel/Close Modal listeners
document.getElementById('attendance-modal-cancel').addEventListener('click', () => {
  attendanceModal.classList.remove('open');
});
document.getElementById('attendance-modal-close').addEventListener('click', () => {
  attendanceModal.classList.remove('open');
});

// ═══════════════════════════════════════════════════════════════════════════════
//  INIT PAGE LOADS
// ═══════════════════════════════════════════════════════════════════════════════
async function init() {
  const urlParams = new URLSearchParams(window.location.search);
  const queryStatus = urlParams.get('status');
  if (queryStatus) {
    statusFilter.value = queryStatus;
  }
  await loadDropdownData();
  await loadStatsSummary();
  await loadAttendanceLogs();
}

init();
