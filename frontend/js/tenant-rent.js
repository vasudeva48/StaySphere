/* ─────────────────────────────────────────────────────────────────────────
   tenant-rent.js – Read-only rent history for the logged-in tenant.
   Uses TENANT_TOKEN / TENANT_API / showTenantToast from tenant-auth.js.
   Calls GET /api/rent/my  (tenant-safe endpoint added to rentRoutes.js).
───────────────────────────────────────────────────────────────────────── */

let allRecords = [];

// ── DOM refs ──────────────────────────────────────────────────────────────────
const tableBody    = document.getElementById('rent-table-body');
const emptyState   = document.getElementById('empty-state');
const recordCount  = document.getElementById('record-count');
const searchInput  = document.getElementById('search-input');
const statusFilter = document.getElementById('status-filter');

const scTotal   = document.getElementById('sc-total');
const scPending = document.getElementById('sc-pending');
const scOverdue = document.getElementById('sc-overdue');
const scPaid    = document.getElementById('sc-paid');

// ── Format helpers ────────────────────────────────────────────────────────────
function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function statusBadge(s) {
  const cls = { Paid: 'status-paid', Pending: 'status-pending', Overdue: 'status-overdue' };
  return `<span class="status-badge ${cls[s] || ''}">${s}</span>`;
}

function amountClass(s) {
  return s === 'Paid' ? 'amount-paid' : s === 'Overdue' ? 'amount-overdue' : 'amount-pending';
}

// ── Fetch ─────────────────────────────────────────────────────────────────────
async function loadRecords() {
  try {
    const res  = await fetch(`${TENANT_API}/rent/my`, {
      headers: { Authorization: `Bearer ${TENANT_TOKEN}` },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to load rent records');
    allRecords = json.data || [];
    updateStats();
    renderTable(allRecords);
  } catch (err) {
    showTenantToast(err.message || 'Could not load rent records', true);
    renderTable([]);
  }
}

// ── Stats ─────────────────────────────────────────────────────────────────────
function updateStats() {
  scTotal.textContent   = allRecords.length;
  scPending.textContent = allRecords.filter(r => r.status === 'Pending').length;
  scOverdue.textContent = allRecords.filter(r => r.status === 'Overdue').length;
  scPaid.textContent    = allRecords.filter(r => r.status === 'Paid').length;
}

// ── Render ────────────────────────────────────────────────────────────────────
function renderTable(rows) {
  recordCount.textContent = `${rows.length} record${rows.length !== 1 ? 's' : ''}`;

  if (!rows.length) {
    tableBody.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';

  tableBody.innerHTML = rows.map((r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${r.rentMonth || '—'}</td>
      <td class="amount-cell ${amountClass(r.status)}">₹${Number(r.amount || 0).toLocaleString('en-IN')}</td>
      <td>${fmt(r.dueDate)}</td>
      <td>${statusBadge(r.status)}</td>
      <td>${fmt(r.paymentDate)}</td>
      <td>${r.paymentMethod || '—'}</td>
      <td style="font-size:0.82rem;color:var(--clr-muted);">${r.remarks || '—'}</td>
    </tr>
  `).join('');
}

// ── Filters ───────────────────────────────────────────────────────────────────
function applyFilters() {
  const q  = searchInput.value.trim().toLowerCase();
  const st = statusFilter.value;
  const filtered = allRecords.filter(r => {
    const matchSearch = !q || (r.rentMonth || '').toLowerCase().includes(q);
    const matchStatus = st === 'All' || r.status === st;
    return matchSearch && matchStatus;
  });
  renderTable(filtered);
}

searchInput.addEventListener('input', applyFilters);
statusFilter.addEventListener('change', applyFilters);

// ── Init ──────────────────────────────────────────────────────────────────────
loadRecords();
