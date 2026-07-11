/* ──────────────────────────────────────────────────────────────────────────
   agreements.js — Digital Agreements Management
   Handles authorization, API interaction, stats computation, dynamic dropdown
   population, auto-prefill integrations, and CRUD operations.
─────────────────────────────────────────────────────────────────────────── */

window.API_BASE = window.API_BASE || 'https://staysphere-backend-cdg7.onrender.com/api';

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
const agreementsTableBody= document.getElementById('agreements-table-body');
const emptyState         = document.getElementById('empty-state');
const recordCountEl      = document.getElementById('record-count');
const toast              = document.getElementById('toast');

// Stats DOM Elements
const totalCountEl       = document.getElementById('sc-total');
const activeCountEl      = document.getElementById('sc-active');
const expiredCountEl     = document.getElementById('sc-expired');
const terminatedCountEl  = document.getElementById('sc-terminated');

// Search & Filter DOM Elements
const searchInput        = document.getElementById('search-input');
const statusFilter       = document.getElementById('status-filter');

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

const fmtRupees = (num) => `₹${Number(num).toLocaleString('en-IN')}`;

// Format ISO date to DD-MM-YYYY
const fmtDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// ═══════════════════════════════════════════════════════════════════════════════
//  FETCH AND DISPLAY DATA
// ═══════════════════════════════════════════════════════════════════════════════

// Globally cached lists for select inputs and pre-fill triggers
let tenantsCache = [];
let roomsCache = [];

async function loadDropdownData() {
  try {
    const [tenantsRes, roomsRes] = await Promise.all([
      fetch(`${API_BASE}/tenants`, { headers: authHeaders() }),
      fetch(`${API_BASE}/rooms`, { headers: authHeaders() })
    ]);

    if (tenantsRes.ok) {
      const json = await tenantsRes.json();
      tenantsCache = json.data || [];
      const activeTenants = tenantsCache.filter(t => t.status === 'Active');
      
      const selectTenant = document.getElementById('f-tenant');
      selectTenant.innerHTML = '<option value="">— Select Tenant —</option>' +
        activeTenants.map(t => `<option value="${t._id}">${t.fullName} (${t.phoneNumber})</option>`).join('');
    }

    if (roomsRes.ok) {
      const json = await roomsRes.json();
      roomsCache = json.data || [];
      const activeRooms = roomsCache.filter(r => r.status !== 'Maintenance');
      
      const selectRoom = document.getElementById('f-room');
      selectRoom.innerHTML = '<option value="">— Select Room —</option>' +
        activeRooms.map(r => `<option value="${r._id}">Room ${r.roomNumber} (${r.roomType} · ${fmtRupees(r.monthlyRent)})</option>`).join('');
    }
  } catch (err) {
    console.error('Error loading select options:', err);
  }
}

async function loadAgreementRecords() {
  const search = searchInput.value.trim();
  const status = statusFilter.value;

  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (status && status !== 'All') params.append('status', status);

  try {
    const res = await fetch(`${API_BASE}/agreements?${params}`, { headers: authHeaders() });
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
    renderAgreements(records);
    calculateStats(records);
  } catch (err) {
    showToast(err.message || 'Error fetching agreements', true);
  }
}

function renderAgreements(records) {
  recordCountEl.textContent = `${records.length} agreement${records.length === 1 ? '' : 's'}`;
  
  if (!records.length) {
    agreementsTableBody.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }
  
  emptyState.style.display = 'none';

  agreementsTableBody.innerHTML = records.map((record, index) => {
    const statusClass = {
      Active: 'status-active',
      Expired: 'status-expired',
      Terminated: 'status-terminated'
    }[record.agreementStatus] || 'status-active';

    const tenantName = record.tenant ? record.tenant.fullName : 'N/A';
    const roomNumber = record.room ? 'Room ' + record.room.roomNumber : 'N/A';

    return `
      <tr>
        <td>${index + 1}</td>
        <td style="font-weight:600; color:var(--clr-accent);">${record.agreementNumber}</td>
        <td>
          <div class="td-tenant-name">${tenantName}</div>
          <div class="td-room-bed">${roomNumber}</div>
        </td>
        <td>
          <div style="font-weight:600;">Rent: ${fmtRupees(record.monthlyRent || 0)}</div>
          <div style="font-size:0.75rem; color:var(--clr-muted); margin-top:0.15rem;">Deposit: ${fmtRupees(record.securityDeposit || 0)}</div>
        </td>
        <td>${fmtDate(record.startDate)}</td>
        <td>${fmtDate(record.endDate)}</td>
        <td><span class="status-badge ${statusClass}">${record.agreementStatus}</span></td>
        <td>
          <div class="action-cell">
            <button class="icon-btn" title="View Details" onclick="openDetailModal('${record._id}')">👁️</button>
            <button class="icon-btn" title="Edit" onclick="openEditModal('${record._id}')">✏️</button>
            <button class="icon-btn delete" title="Delete" onclick="openDeleteConfirm('${record._id}', '${record.agreementNumber}')">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function calculateStats(records) {
  totalCountEl.textContent = records.length;
  activeCountEl.textContent = records.filter(r => r.agreementStatus === 'Active').length;
  expiredCountEl.textContent = records.filter(r => r.agreementStatus === 'Expired').length;
  terminatedCountEl.textContent = records.filter(r => r.agreementStatus === 'Terminated').length;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  AUTO-PREFILL INTERACTIVE LOGIC
// ═══════════════════════════════════════════════════════════════════════════════

const tenantSelect = document.getElementById('f-tenant');
const roomSelect = document.getElementById('f-room');
const inputRent = document.getElementById('f-monthlyRent');
const inputDeposit = document.getElementById('f-securityDeposit');

// 1. When tenant changes: Pre-fill rent/deposit from profile and select room if matching
tenantSelect.addEventListener('change', () => {
  const tenantId = tenantSelect.value;
  if (!tenantId) return;

  const tenant = tenantsCache.find(t => t._id === tenantId);
  if (tenant) {
    if (tenant.rentAmount) inputRent.value = tenant.rentAmount;
    if (tenant.depositAmount) inputDeposit.value = tenant.depositAmount;

    // Prefill matching room in selection dropdown
    if (tenant.roomNumber) {
      const room = roomsCache.find(r => String(r.roomNumber).trim().toLowerCase() === String(tenant.roomNumber).trim().toLowerCase());
      if (room) {
        roomSelect.value = room._id;
      }
    }
  }
});

// 2. When room changes: Prefill monthlyRent from room configuration if input is empty
roomSelect.addEventListener('change', () => {
  const roomId = roomSelect.value;
  if (!roomId) return;

  const room = roomsCache.find(r => r._id === roomId);
  if (room && (!inputRent.value || Number(inputRent.value) === 0)) {
    inputRent.value = room.monthlyRent || 0;
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  ADD / EDIT AGREEMENT MODAL
// ═══════════════════════════════════════════════════════════════════════════════

const agreementModal = document.getElementById('agreement-modal');
const agreementModalTitle = document.getElementById('agreement-modal-title');
const agreementModalSubmit = document.getElementById('agreement-modal-submit');
const agreementForm = document.getElementById('agreement-form');
const selectGroups = document.getElementById('select-groups');
const statusGroup = document.getElementById('status-group');

// Form inputs
const inputId = document.getElementById('agreement-id');
const inputNumber = document.getElementById('f-agreementNumber');
const inputStartDate = document.getElementById('f-startDate');
const inputEndDate = document.getElementById('f-endDate');
const inputStatus = document.getElementById('f-agreementStatus');
const inputNotes = document.getElementById('f-notes');
const inputFile = document.getElementById('f-agreementFile');

// Generate random code for new agreement
function generateAgreementNumber() {
  const code = Math.floor(1000 + Math.random() * 9000);
  const year = new Date().getFullYear();
  inputNumber.value = `AGR-${year}-${code}`;
}

function openAddModal() {
  agreementForm.reset();
  inputId.value = '';
  
  selectGroups.style.display = 'grid';
  statusGroup.style.display = 'none';
  agreementModalTitle.textContent = 'Create Rental Agreement';
  agreementModalSubmit.textContent = 'Save Agreement';
  
  // Set defaults
  generateAgreementNumber();
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  inputStartDate.value = `${yyyy}-${mm}-${dd}`;
  
  // End date default: 11 months from start date
  const future = new Date();
  future.setMonth(future.getMonth() + 11);
  const fY = future.getFullYear();
  const fM = String(future.getMonth() + 1).padStart(2, '0');
  const fD = String(future.getDate()).padStart(2, '0');
  inputEndDate.value = `${fY}-${fM}-${fD}`;

  agreementModal.classList.add('open');
  inputNumber.focus();
}

async function openEditModal(id) {
  try {
    const res = await fetch(`${API_BASE}/agreements/${id}`, { headers: authHeaders() });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message);

    const record = json.data;
    inputId.value = record._id;
    
    // In edit mode, hide tenant and room selection (contract immutable reference details)
    selectGroups.style.display = 'none';
    statusGroup.style.display = 'block';

    inputNumber.value = record.agreementNumber || '';
    if (record.startDate) inputStartDate.value = record.startDate.split('T')[0];
    if (record.endDate) inputEndDate.value = record.endDate.split('T')[0];
    
    inputRent.value = record.monthlyRent || 0;
    inputDeposit.value = record.securityDeposit || 0;
    inputStatus.value = record.agreementStatus || 'Active';
    inputFile.value = record.agreementFile || '';
    inputNotes.value = record.notes || '';

    agreementModalTitle.textContent = 'Edit Rental Agreement';
    agreementModalSubmit.textContent = 'Update Agreement';
    agreementModal.classList.add('open');
  } catch (err) {
    showToast(err.message || 'Error loading agreement record data', true);
  }
}

function closeAgreementModal() {
  agreementModal.classList.remove('open');
}

document.getElementById('btn-add-agreement').addEventListener('click', openAddModal);
document.getElementById('agreement-modal-close').addEventListener('click', closeAgreementModal);
document.getElementById('agreement-modal-cancel').addEventListener('click', closeAgreementModal);
agreementModal.addEventListener('click', (e) => { if (e.target === agreementModal) closeAgreementModal(); });

agreementForm.addEventListener('submit', async () => {
  const id = inputId.value;
  
  const payload = {
    startDate: inputStartDate.value,
    endDate: inputEndDate.value,
    monthlyRent: Number(inputRent.value),
    securityDeposit: Number(inputDeposit.value),
    agreementFile: inputFile.value.trim(),
    notes: inputNotes.value.trim()
  };

  if (!id) {
    payload.agreementNumber = inputNumber.value.trim();
    payload.tenant = tenantSelect.value;
    payload.room = roomSelect.value;

    if (!payload.tenant || !payload.room || !payload.agreementNumber) {
      showToast('Agreement Number, Tenant, and Room are required', true);
      return;
    }
  } else {
    payload.agreementStatus = inputStatus.value;
  }

  const url = id ? `${API_BASE}/agreements/${id}` : `${API_BASE}/agreements`;
  const method = id ? 'PUT' : 'POST';

  agreementModalSubmit.disabled = true;
  agreementModalSubmit.textContent = 'Saving...';

  try {
    const res = await fetch(url, {
      method,
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message);

    showToast(id ? 'Agreement updated successfully' : 'Agreement registered successfully');
    closeAgreementModal();
    loadAgreementRecords();
  } catch (err) {
    showToast(err.message || 'Error processing agreement submission', true);
  } finally {
    agreementModalSubmit.disabled = false;
    agreementModalSubmit.textContent = id ? 'Update Agreement' : 'Save Agreement';
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  DETAIL VIEW MODAL
// ═══════════════════════════════════════════════════════════════════════════════

const detailModal = document.getElementById('detail-modal');

async function openDetailModal(id) {
  try {
    const res = await fetch(`${API_BASE}/agreements/${id}`, { headers: authHeaders() });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message);

    const record = json.data;
    
    document.getElementById('d-number').textContent = record.agreementNumber || '—';
    document.getElementById('d-status').innerHTML = `<span class="status-badge status-${record.agreementStatus?.toLowerCase()}">${record.agreementStatus}</span>`;
    
    if (record.tenant) {
      document.getElementById('d-tenantName').textContent = record.tenant.fullName || '—';
      document.getElementById('d-tenantContact').innerHTML = `
        📧 ${record.tenant.email || '—'}<br>
        📱 ${record.tenant.phoneNumber || '—'}<br>
        🆔 Proof: ${record.tenant.idProofType || '—'} (${record.tenant.idProofNumber || '—'})
      `;
    } else {
      document.getElementById('d-tenantName').textContent = 'N/A';
      document.getElementById('d-tenantContact').textContent = 'No tenant associated.';
    }

    if (record.room) {
      document.getElementById('d-roomName').textContent = `Room ${record.room.roomNumber || '—'}`;
      document.getElementById('d-roomType').textContent = `${record.room.roomType || '—'} Room (Floor ${record.room.floorNumber || '—'})`;
    } else {
      document.getElementById('d-roomName').textContent = 'N/A';
      document.getElementById('d-roomType').textContent = 'No room details available.';
    }

    document.getElementById('d-period').innerHTML = `
      <strong>Start Date:</strong> ${fmtDate(record.startDate)}<br>
      <strong>End Date:</strong> ${fmtDate(record.endDate)}
    `;

    document.getElementById('d-financials').innerHTML = `
      <strong>Monthly Rent:</strong> ${fmtRupees(record.monthlyRent || 0)}<br>
      <strong>Security Deposit:</strong> ${fmtRupees(record.securityDeposit || 0)}
    `;

    if (record.agreementFile) {
      document.getElementById('d-fileLink').innerHTML = `<a href="${record.agreementFile}" target="_blank" style="color:var(--clr-accent); text-decoration:none; font-weight:600;">View Signed Agreement Document Link ↗</a>`;
    } else {
      document.getElementById('d-fileLink').textContent = 'No document uploaded.';
    }

    document.getElementById('d-notes').textContent = record.notes || 'No special clauses or notes specified.';

    detailModal.classList.add('open');
  } catch (err) {
    showToast(err.message || 'Error retrieving agreement details', true);
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
const deleteAgreementId = document.getElementById('delete-agreement-id');
const deleteMsg = document.getElementById('delete-msg');
const deleteConfirmBtn = document.getElementById('delete-confirm');

function openDeleteConfirm(id, agNum) {
  deleteAgreementId.value = id;
  deleteMsg.innerHTML = `Are you sure you want to permanently delete Agreement <strong>${agNum}</strong>? This action cannot be undone.`;
  deleteModal.classList.add('open');
}

function closeDeleteModal() {
  deleteModal.classList.remove('open');
}

document.getElementById('delete-cancel').addEventListener('click', closeDeleteModal);
deleteModal.addEventListener('click', (e) => { if (e.target === deleteModal) closeDeleteModal(); });

deleteConfirmBtn.addEventListener('click', async () => {
  const id = deleteAgreementId.value;
  deleteConfirmBtn.disabled = true;
  deleteConfirmBtn.textContent = 'Deleting...';

  try {
    const res = await fetch(`${API_BASE}/agreements/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message);

    showToast('Agreement successfully deleted');
    closeDeleteModal();
    loadAgreementRecords();
  } catch (err) {
    showToast(err.message || 'Error deleting agreement record', true);
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
    loadAgreementRecords();
  }, 350);
});

statusFilter.addEventListener('change', loadAgreementRecords);

// ═══════════════════════════════════════════════════════════════════════════════
//  INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════
async function init() {
  await Promise.all([
    loadDropdownData(),
    loadAgreementRecords()
  ]);
}

init();

// Export helper triggers for inline HTML callbacks
window.openDetailModal = openDetailModal;
window.openEditModal = openEditModal;
window.openDeleteConfirm = openDeleteConfirm;
