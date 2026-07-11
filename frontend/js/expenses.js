/* ──────────────────────────────────────────────────────────────────────────
   expenses.js — Expense & Operations Cost Management
   Handles authorization, API interaction, stats computation, and search/filtering.
   ─────────────────────────────────────────────────────────────────────────── */

const apiBase = typeof API_BASE !== 'undefined' ? API_BASE : 'http://localhost:5000/api';

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
const adminNameEl     = document.getElementById('admin-name');
const adminInitialEl  = document.getElementById('admin-initial');
const greetingEl      = document.getElementById('greeting-text');
const expenseTableBody= document.getElementById('expense-table-body');
const emptyState      = document.getElementById('empty-state');
const recordCountEl   = document.getElementById('record-count');
const toast           = document.getElementById('toast');

// Stats DOM Elements
const totalSumEl      = document.getElementById('sc-total');
const monthlySumEl    = document.getElementById('sc-monthly');
const countEl         = document.getElementById('sc-count');

// Search & Filter DOM Elements
const searchInput     = document.getElementById('search-input');
const categoryFilter  = document.getElementById('category-filter');
const monthFilter     = document.getElementById('month-filter');

// Modals
const expenseModal    = document.getElementById('expense-modal');
const expenseModalTitle= document.getElementById('expense-modal-title');
const expenseForm     = document.getElementById('expense-form');
const expenseIdInput  = document.getElementById('expense-id');

const deleteModal     = document.getElementById('delete-modal');
const deleteExpenseId = document.getElementById('delete-expense-id');

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

// Formats YYYY-MM to Month YYYY for dropdown filter UI
const formatYearMonth = (yearMonthStr) => {
  if (!yearMonthStr) return '';
  const [year, month] = yearMonthStr.split('-');
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
};

// ═══════════════════════════════════════════════════════════════════════════════
//  FETCH AND DISPLAY DATA
// ═══════════════════════════════════════════════════════════════════════════════

async function loadExpenseStats() {
  try {
    const res = await fetch(`${apiBase}/expenses/summary`, { headers: authHeaders() });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message);

    const data = json.data;
    totalSumEl.textContent = fmtRupees(data.totalExpenses || 0);
    monthlySumEl.textContent = fmtRupees(data.monthlyExpenses || 0);
    countEl.textContent = data.transactionCount || 0;
  } catch (err) {
    showToast(err.message || 'Error fetching expense stats', true);
  }
}

async function loadMonthFilter() {
  try {
    const res = await fetch(`${apiBase}/expenses/months`, { headers: authHeaders() });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message);

    const months = json.data || [];
    const currentValue = monthFilter.value;
    
    monthFilter.innerHTML = '<option value="">All Months</option>' +
      months.map(m => `<option value="${m}">${formatYearMonth(m)}</option>`).join('');
    
    if (months.includes(currentValue)) {
      monthFilter.value = currentValue;
    }
  } catch (err) {
    console.error('Error loading month options:', err);
  }
}

async function loadExpenseRecords() {
  const search = searchInput.value.trim();
  const category = categoryFilter.value;
  const month = monthFilter.value;

  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (category && category !== 'All') params.append('category', category);
  if (month) params.append('month', month);

  try {
    const res = await fetch(`${apiBase}/expenses?${params}`, { headers: authHeaders() });
    const json = await res.json();
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        localStorage.clear();
        window.location.href = 'index.html';
        return;
      }
      throw new Error(json.message);
    }

    renderExpenseRecords(json.data || []);
  } catch (err) {
    showToast(err.message || 'Error fetching expense records', true);
  }
}

function renderExpenseRecords(records) {
  recordCountEl.textContent = `${records.length} record${records.length === 1 ? '' : 's'}`;
  
  if (!records.length) {
    expenseTableBody.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }
  
  emptyState.style.display = 'none';

  expenseTableBody.innerHTML = records.map((record, index) => {
    return `
      <tr>
        <td>${index + 1}</td>
        <td>
          <div style="font-weight: 600; color: var(--clr-text);">${record.expenseTitle}</div>
          ${record.description ? `<div style="font-size: 0.78rem; color: var(--clr-muted); margin-top: 0.15rem;">${record.description}</div>` : ''}
        </td>
        <td style="font-weight: 700; color: var(--clr-danger);">₹${Number(record.amount || 0).toLocaleString('en-IN')}</td>
        <td>
          <span class="cat-badge cat-${record.category}">${record.category}</span>
        </td>
        <td>${fmtDate(record.expenseDate)}</td>
        <td>
          <div style="font-size:0.8rem;">
            <strong>Method:</strong> ${record.paymentMethod}<br>
            ${record.receiptNumber ? `<strong>Receipt:</strong> ${record.receiptNumber}` : ''}
          </div>
        </td>
        <td>
          <div class="action-cell">
            <button class="icon-btn edit" onclick="openEditModal('${record._id}')" title="Edit record" aria-label="Edit record">✏️</button>
            <button class="icon-btn delete" onclick="confirmDelete('${record._id}')" title="Delete record" aria-label="Delete record">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ── Debounce Search ──────────────────────────────────────────────────────────
let searchTimeout;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(loadExpenseRecords, 300);
});

// Filter Triggers
categoryFilter.addEventListener('change', loadExpenseRecords);
monthFilter.addEventListener('change', loadExpenseRecords);

// ═══════════════════════════════════════════════════════════════════════════════
//  RECORD MODAL ACTIONS
// ═══════════════════════════════════════════════════════════════════════════════

const btnAddExpense = document.getElementById('btn-add-expense');
const modalClose = document.getElementById('expense-modal-close');
const modalCancel = document.getElementById('expense-modal-cancel');

// Open Record Modal
btnAddExpense.addEventListener('click', () => {
  expenseForm.reset();
  expenseIdInput.value = '';
  expenseModalTitle.textContent = 'Record Expense';
  
  // Set default date to today
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('f-expenseDate').value = today;

  expenseModal.classList.add('open');
});

// Close Record Modal Helpers
const closeRecordModal = () => {
  expenseModal.classList.remove('open');
};
modalClose.addEventListener('click', closeRecordModal);
modalCancel.addEventListener('click', closeRecordModal);

// Submit Expense Handler
expenseForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const id = expenseIdInput.value;
  const isEdit = !!id;
  
  const payload = {
    expenseTitle: document.getElementById('f-title').value.trim(),
    category: document.getElementById('f-category').value,
    amount: Number(document.getElementById('f-amount').value),
    paymentMethod: document.getElementById('f-paymentMethod').value,
    expenseDate: document.getElementById('f-expenseDate').value,
    receiptNumber: document.getElementById('f-receiptNumber').value.trim(),
    description: document.getElementById('f-description').value.trim(),
  };

  const submitBtn = document.getElementById('expense-modal-submit');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving…';

  try {
    const url = isEdit ? `${apiBase}/expenses/${id}` : `${apiBase}/expenses`;
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });
    
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to save expense');

    showToast(isEdit ? 'Expense updated successfully' : 'Expense recorded successfully');
    closeRecordModal();
    
    // Refresh page data
    loadExpenseStats();
    loadMonthFilter();
    loadExpenseRecords();
  } catch (err) {
    showToast(err.message, true);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Save Expense';
  }
});

// Open Edit Modal (Global Scope for inline HTML onclick)
window.openEditModal = async (id) => {
  try {
    const res = await fetch(`${apiBase}/expenses/${id}`, { headers: authHeaders() });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message);

    const record = json.data;
    expenseIdInput.value = record._id;
    expenseModalTitle.textContent = 'Edit Expense Record';

    document.getElementById('f-title').value = record.expenseTitle || '';
    document.getElementById('f-category').value = record.category || '';
    document.getElementById('f-amount').value = record.amount || 0;
    document.getElementById('f-paymentMethod').value = record.paymentMethod || '';
    document.getElementById('f-receiptNumber').value = record.receiptNumber || '';
    document.getElementById('f-description').value = record.description || '';

    if (record.expenseDate) {
      document.getElementById('f-expenseDate').value = record.expenseDate.split('T')[0];
    }

    expenseModal.classList.add('open');
  } catch (err) {
    showToast(err.message || 'Error fetching expense details', true);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  DELETE ACTION
// ═══════════════════════════════════════════════════════════════════════════════

const deleteCancel = document.getElementById('delete-cancel');
const deleteConfirm = document.getElementById('delete-confirm');

window.confirmDelete = (id) => {
  deleteExpenseId.value = id;
  deleteModal.classList.add('open');
};

const closeDeleteModal = () => {
  deleteModal.classList.remove('open');
};
deleteCancel.addEventListener('click', closeDeleteModal);

deleteConfirm.addEventListener('click', async () => {
  const id = deleteExpenseId.value;
  if (!id) return;

  deleteConfirm.disabled = true;
  deleteConfirm.textContent = 'Deleting…';

  try {
    const res = await fetch(`${apiBase}/expenses/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message);

    showToast('Expense deleted successfully');
    closeDeleteModal();
    
    // Refresh page data
    loadExpenseStats();
    loadMonthFilter();
    loadExpenseRecords();
  } catch (err) {
    showToast(err.message || 'Error deleting expense', true);
  } finally {
    deleteConfirm.disabled = false;
    deleteConfirm.textContent = 'Yes, Delete';
  }
});

// ── Initializer ───────────────────────────────────────────────────────────────
loadExpenseStats();
loadMonthFilter();
loadExpenseRecords();
