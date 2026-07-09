/* ──────────────────────────────────────────────────────────────────────────
   rent.js — Rent & Payments Management
   Handles authorization, API interaction, stats computation, and search/filtering.
─────────────────────────────────────────────────────────────────────────── */

const API_BASE = 'http://localhost:5000/api';

// ── Auth guard ────────────────────────────────────────────────────────────────
const token = localStorage.getItem('ss_token');
const user  = JSON.parse(localStorage.getItem('ss_user') || 'null');
if (!token || !user) {
  window.location.href = 'index.html';
  throw new Error('Unauthenticated');
}

// ── DOM Elements ──────────────────────────────────────────────────────────────
const adminNameEl     = document.getElementById('admin-name');
const adminInitialEl  = document.getElementById('admin-initial');
const greetingEl      = document.getElementById('greeting-text');
const rentTableBody   = document.getElementById('rent-table-body');
const emptyState      = document.getElementById('empty-state');
const recordCountEl   = document.getElementById('record-count');
const toast           = document.getElementById('toast');

// Stats DOM Elements
const pendingCountEl  = document.getElementById('sc-pending');
const overdueCountEl  = document.getElementById('sc-overdue');
const collectedSumEl  = document.getElementById('sc-collected');

// Search & Filter DOM Elements
const searchInput     = document.getElementById('search-input');
const statusFilter    = document.getElementById('status-filter');
const monthFilter     = document.getElementById('month-filter');

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

// Format ISO date to DD-MM-YYYY format
const fmtDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// ═══════════════════════════════════════════════════════════════════════════════
//  FETCH AND DISPLAY DATA
// ═══════════════════════════════════════════════════════════════════════════════

// Globally cached list of active tenants for form drop-down
let tenantsCache = [];

async function loadRentStats() {
  try {
    const res = await fetch(`${API_BASE}/rent/summary`, { headers: authHeaders() });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message);

    const data = json.data;
    pendingCountEl.textContent = data.pendingCount || 0;
    overdueCountEl.textContent = data.overdueCount || 0;
    collectedSumEl.textContent = fmtRupees(data.collectedThisMonth || 0);
  } catch (err) {
    showToast(err.message || 'Error fetching rent stats', true);
  }
}

async function loadMonthFilter() {
  try {
    const res = await fetch(`${API_BASE}/rent/months`, { headers: authHeaders() });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message);

    const months = json.data || [];
    const currentValue = monthFilter.value;
    
    monthFilter.innerHTML = '<option value="">All Months</option>' +
      months.map(m => `<option value="${m}">${m}</option>`).join('');
    
    if (months.includes(currentValue)) {
      monthFilter.value = currentValue;
    }
  } catch (err) {
    console.error('Error loading month options:', err);
  }
}

async function loadTenantsList() {
  try {
    const res = await fetch(`${API_BASE}/tenants`, { headers: authHeaders() });
    const json = await res.json();
    if (res.ok) {
      // Filter Active tenants who have roomNumber assigned
      tenantsCache = (json.data || []).filter(t => t.status === 'Active');
      
      const select = document.getElementById('f-tenant');
      select.innerHTML = '<option value="">— Select Tenant —</option>' +
        tenantsCache.map(t => `<option value="${t._id}">${t.fullName} (${t.roomNumber ? 'Room ' + t.roomNumber : 'No Room Assigned'})</option>`).join('');
    }
  } catch (err) {
    console.error('Error loading tenants list:', err);
  }
}

async function loadRentRecords() {
  const search = searchInput.value.trim();
  const status = statusFilter.value;
  const month = monthFilter.value;

  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (status && status !== 'All') params.append('status', status);
  if (month) params.append('month', month);

  try {
    const res = await fetch(`${API_BASE}/rent?${params}`, { headers: authHeaders() });
    const json = await res.json();
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        localStorage.clear();
        window.location.href = 'index.html';
        return;
      }
      throw new Error(json.message);
    }

    renderRentRecords(json.data || []);
  } catch (err) {
    showToast(err.message || 'Error fetching rent records', true);
  }
}

function renderRentRecords(records) {
  recordCountEl.textContent = `${records.length} record${records.length === 1 ? '' : 's'}`;
  
  if (!records.length) {
    rentTableBody.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }
  
  emptyState.style.display = 'none';

  rentTableBody.innerHTML = records.map((record, index) => {
    const statusClass = {
      Paid: 'status-paid',
      Pending: 'status-pending',
      Overdue: 'status-overdue'
    }[record.status] || 'status-pending';

    let paymentInfo = '—';
    if (record.status === 'Paid') {
      paymentInfo = `
        <div style="font-size:0.8rem;">
          <strong>Date:</strong> ${fmtDate(record.paymentDate)}<br>
          <strong>Method:</strong> ${record.paymentMethod}<br>
          ${record.transactionId ? `<strong>Txn ID:</strong> ${record.transactionId}` : ''}
        </div>
      `;
    }

    // Actions depending on status
    const payButton = record.status !== 'Paid' 
      ? `<button class="icon-btn pay" title="Mark as Paid" onclick="openPayModal('${record._id}', '${record.tenantName || 'Tenant'}', ${record.amount})">💰</button>` 
      : '';

    return `
      <tr>
        <td>${index + 1}</td>
        <td>
          <div class="td-tenant-name">${record.tenantName || 'N/A'}</div>
          <div class="td-room-bed">${record.roomNumber ? 'Room ' + record.roomNumber : 'No Room'}</div>
        </td>
        <td style="font-weight: 600;">${fmtRupees(record.amount || 0)}</td>
        <td>${record.rentMonth || '—'}</td>
        <td style="white-space: nowrap;">${fmtDate(record.dueDate)}</td>
        <td><span class="status-badge ${statusClass}">${record.status}</span></td>
        <td>${paymentInfo}</td>
        <td>
          <div class="action-cell">
            ${payButton}
            <button class="icon-btn" title="Edit" onclick="openEditModal('${record._id}')">✏️</button>
            <button class="icon-btn delete" title="Delete" onclick="openDeleteConfirm('${record._id}', '${record.tenantName || 'Record'}', '${record.rentMonth}')">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ADD / EDIT INVOICE MODAL
// ═══════════════════════════════════════════════════════════════════════════════

const rentModal = document.getElementById('rent-modal');
const rentModalTitle = document.getElementById('rent-modal-title');
const rentModalSubmit = document.getElementById('rent-modal-submit');
const rentForm = document.getElementById('rent-form');
const tenantSelectGroup = document.getElementById('tenant-select-group');
const tenantSelect = document.getElementById('f-tenant');
const statusGroup = document.getElementById('status-group');

// Form inputs
const inputId = document.getElementById('rent-id');
const inputAmount = document.getElementById('f-amount');
const inputRentMonth = document.getElementById('f-rentMonth');
const inputDueDate = document.getElementById('f-dueDate');
const inputStatus = document.getElementById('f-status');
const inputRemarks = document.getElementById('f-remarks');

// Auto pre-fill rent month and rentAmount on tenant selection change
tenantSelect.addEventListener('change', () => {
  const tenantId = tenantSelect.value;
  if (!tenantId) return;
  
  const tenant = tenantsCache.find(t => t._id === tenantId);
  if (tenant) {
    if (tenant.rentAmount) {
      inputAmount.value = tenant.rentAmount;
    }
  }
});

// Helper to pre-populate current month/year and a default due date
function setDefaultsForNewRecord() {
  const today = new Date();
  
  // Format Month Year (e.g. "July 2026")
  const currentMonthStr = today.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  inputRentMonth.value = currentMonthStr;
  
  // Default due date: 5th of current month
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  inputDueDate.value = `${year}-${month}-05`;
}

function openAddModal() {
  rentForm.reset();
  inputId.value = '';
  tenantSelectGroup.style.display = 'block';
  statusGroup.style.display = 'none';
  rentModalTitle.textContent = 'Record Rent';
  rentModalSubmit.textContent = 'Save Record';
  
  setDefaultsForNewRecord();
  
  rentModal.classList.add('open');
  tenantSelect.focus();
}

async function openEditModal(id) {
  try {
    const res = await fetch(`${API_BASE}/rent/${id}`, { headers: authHeaders() });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message);

    const record = json.data;
    inputId.value = record._id;
    
    // In edit mode, hide tenant selection (tenant shouldn't change)
    tenantSelectGroup.style.display = 'none';
    statusGroup.style.display = 'block';
    
    inputAmount.value = record.amount || 0;
    inputRentMonth.value = record.rentMonth || '';
    
    if (record.dueDate) {
      inputDueDate.value = record.dueDate.split('T')[0];
    }
    
    inputStatus.value = record.status || 'Pending';
    inputRemarks.value = record.remarks || '';
    
    rentModalTitle.textContent = 'Edit Rent Record';
    rentModalSubmit.textContent = 'Update Record';
    
    rentModal.classList.add('open');
  } catch (err) {
    showToast(err.message || 'Error fetching invoice data', true);
  }
}

function closeRentModal() {
  rentModal.classList.remove('open');
}

document.getElementById('btn-add-rent').addEventListener('click', openAddModal);
document.getElementById('rent-modal-close').addEventListener('click', closeRentModal);
document.getElementById('rent-modal-cancel').addEventListener('click', closeRentModal);
rentModal.addEventListener('click', (e) => { if (e.target === rentModal) closeRentModal(); });

rentForm.addEventListener('submit', async () => {
  const id = inputId.value;
  
  const payload = {
    amount: Number(inputAmount.value),
    rentMonth: inputRentMonth.value.trim(),
    dueDate: inputDueDate.value,
    remarks: inputRemarks.value.trim()
  };

  if (!id) {
    payload.tenant = tenantSelect.value;
    if (!payload.tenant) {
      showToast('Please select a tenant', true);
      return;
    }
  } else {
    payload.status = inputStatus.value;
  }

  const url = id ? `${API_BASE}/rent/${id}` : `${API_BASE}/rent`;
  const method = id ? 'PUT' : 'POST';

  rentModalSubmit.disabled = true;
  rentModalSubmit.textContent = 'Saving...';

  try {
    const res = await fetch(url, {
      method,
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message);

    showToast(id ? 'Rent record updated successfully' : 'Rent invoice recorded successfully');
    closeRentModal();
    
    // Refresh page data
    await loadRentStats();
    await loadMonthFilter();
    await loadRentRecords();
  } catch (err) {
    showToast(err.message || 'Error saving invoice record', true);
  } finally {
    rentModalSubmit.disabled = false;
    rentModalSubmit.textContent = id ? 'Update Record' : 'Save Record';
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  PAY RENT CONFIRM MODAL
// ═══════════════════════════════════════════════════════════════════════════════

const payModal = document.getElementById('pay-modal');
const payForm = document.getElementById('pay-form');
const payRentId = document.getElementById('pay-rent-id');
const payInvoiceDetails = document.getElementById('pay-invoice-details');
const payModalSubmit = document.getElementById('pay-modal-submit');

// Inputs
const payDateInput = document.getElementById('p-paymentDate');
const payMethodInput = document.getElementById('p-paymentMethod');
const payTxnIdInput = document.getElementById('p-transactionId');
const payRemarksInput = document.getElementById('p-remarks');

function openPayModal(id, tenantName, amount) {
  payForm.reset();
  payRentId.value = id;
  payInvoiceDetails.innerHTML = `Recording payment for <strong>${tenantName}</strong> of amount <strong>${fmtRupees(amount)}</strong>.`;
  
  // Default payment date is today
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  payDateInput.value = `${yyyy}-${mm}-${dd}`;
  
  payModal.classList.add('open');
  payDateInput.focus();
}

function closePayModal() {
  payModal.classList.remove('open');
}

document.getElementById('pay-modal-close').addEventListener('click', closePayModal);
document.getElementById('pay-modal-cancel').addEventListener('click', closePayModal);
payModal.addEventListener('click', (e) => { if (e.target === payModal) closePayModal(); });

payForm.addEventListener('submit', async () => {
  const id = payRentId.value;
  const payload = {
    paymentDate: payDateInput.value,
    paymentMethod: payMethodInput.value,
    transactionId: payTxnIdInput.value.trim(),
    remarks: payRemarksInput.value.trim()
  };

  payModalSubmit.disabled = true;
  payModalSubmit.textContent = 'Processing...';

  try {
    const res = await fetch(`${API_BASE}/rent/${id}/pay`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message);

    showToast('Payment successfully recorded');
    closePayModal();

    // Refresh view
    await loadRentStats();
    await loadMonthFilter();
    await loadRentRecords();
  } catch (err) {
    showToast(err.message || 'Error recording payment details', true);
  } finally {
    payModalSubmit.disabled = false;
    payModalSubmit.textContent = 'Mark as Paid';
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  DELETE CONFIRM MODAL
// ═══════════════════════════════════════════════════════════════════════════════

const deleteModal = document.getElementById('delete-modal');
const deleteRentId = document.getElementById('delete-rent-id');
const deleteMsg = document.getElementById('delete-msg');
const deleteConfirmBtn = document.getElementById('delete-confirm');

function openDeleteConfirm(id, tenantName, month) {
  deleteRentId.value = id;
  deleteMsg.innerHTML = `Are you sure you want to permanently delete the rent record for <strong>${tenantName}</strong> for month <strong>${month}</strong>? This action cannot be undone.`;
  deleteModal.classList.add('open');
}

function closeDeleteModal() {
  deleteModal.classList.remove('open');
}

document.getElementById('delete-cancel').addEventListener('click', closeDeleteModal);
deleteModal.addEventListener('click', (e) => { if (e.target === deleteModal) closeDeleteModal(); });

deleteConfirmBtn.addEventListener('click', async () => {
  const id = deleteRentId.value;
  deleteConfirmBtn.disabled = true;
  deleteConfirmBtn.textContent = 'Deleting...';

  try {
    const res = await fetch(`${API_BASE}/rent/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message);

    showToast('Rent record successfully deleted');
    closeDeleteModal();

    // Refresh view
    await loadRentStats();
    await loadMonthFilter();
    await loadRentRecords();
  } catch (err) {
    showToast(err.message || 'Error deleting rent record', true);
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
    loadRentRecords();
  }, 350);
});

statusFilter.addEventListener('change', loadRentRecords);
monthFilter.addEventListener('change', loadRentRecords);

// ═══════════════════════════════════════════════════════════════════════════════
//  INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════
async function init() {
  await Promise.all([
    loadRentStats(),
    loadMonthFilter(),
    loadTenantsList(),
    loadRentRecords()
  ]);
}

init();

// Export helper triggers for inline HTML callbacks
window.openPayModal = openPayModal;
window.openEditModal = openEditModal;
window.openDeleteConfirm = openDeleteConfirm;
