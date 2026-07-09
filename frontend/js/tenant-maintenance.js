/* ─────────────────────────────────────────────────────────────────────────
   tenant-maintenance.js – Tenant maintenance request portal
   Uses TENANT_TOKEN / TENANT_API globals injected by tenant-auth.js
───────────────────────────────────────────────────────────────────────── */

let allRequests = [];

// ── DOM refs ──────────────────────────────────────────────────────────────────
const tableBody    = document.getElementById('maintenance-table-body');
const emptyState   = document.getElementById('empty-state');
const recordCount  = document.getElementById('record-count');
const searchInput  = document.getElementById('search-input');
const statusFilter = document.getElementById('status-filter');
const catFilter    = document.getElementById('category-filter');
const btnAdd       = document.getElementById('btn-add-request');

// Stats
const scTotal      = document.getElementById('sc-total');
const scPending    = document.getElementById('sc-pending');
const scInProgress = document.getElementById('sc-inprogress');
const scResolved   = document.getElementById('sc-resolved');

// Modals
const requestModal  = document.getElementById('request-modal');
const detailModal   = document.getElementById('detail-modal');
const deleteModal   = document.getElementById('delete-modal');

// ── Priority / Status badge helpers ──────────────────────────────────────────
const priorityClass = { High: 'priority-high', Medium: 'priority-medium', Low: 'priority-low' };
const statusClass   = { Pending: 'status-pending', 'In Progress': 'status-inprogress', Resolved: 'status-resolved' };

function prioBadge(p) {
  return `<span class="priority-badge ${priorityClass[p] || ''}">${p}</span>`;
}
function statusBadge(s) {
  return `<span class="status-badge ${statusClass[s] || ''}">${s}</span>`;
}
function fmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Fetch all maintenance requests (auto-scoped to tenant by backend) ─────────
async function loadRequests() {
  try {
    const res  = await fetch(`${TENANT_API}/maintenance`, {
      headers: { Authorization: `Bearer ${TENANT_TOKEN}` },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to load');
    allRequests = json.data || [];
    updateStats();
    renderTable(allRequests);
  } catch (err) {
    showTenantToast(err.message || 'Could not load requests', true);
    renderTable([]);
  }
}

// ── Stats ─────────────────────────────────────────────────────────────────────
function updateStats() {
  scTotal.textContent      = allRequests.length;
  scPending.textContent    = allRequests.filter(r => r.status === 'Pending').length;
  scInProgress.textContent = allRequests.filter(r => r.status === 'In Progress').length;
  scResolved.textContent   = allRequests.filter(r => r.status === 'Resolved').length;
}

// ── Render table ──────────────────────────────────────────────────────────────
function renderTable(rows) {
  recordCount.textContent = `${rows.length} request${rows.length !== 1 ? 's' : ''}`;

  if (!rows.length) {
    tableBody.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';

  tableBody.innerHTML = rows.map((r, i) => {
    const isPending = r.status === 'Pending';
    return `
      <tr>
        <td>${i + 1}</td>
        <td>
          <div class="td-request-title">${r.requestTitle}</div>
          <div class="td-room-bed">${r.description?.slice(0, 60)}${r.description?.length > 60 ? '…' : ''}</div>
        </td>
        <td>${r.category}</td>
        <td>${prioBadge(r.priority)}</td>
        <td>${statusBadge(r.status)}</td>
        <td>${fmt(r.createdAt)}</td>
        <td>
          <div class="action-cell">
            <button class="icon-btn" title="View details" onclick="openDetail('${r._id}')">👁️</button>
            ${isPending ? `<button class="icon-btn" title="Edit request" onclick="openEdit('${r._id}')">✏️</button>` : ''}
            ${isPending ? `<button class="icon-btn delete" title="Delete request" onclick="openDelete('${r._id}', '${r.requestTitle.replace(/'/g, "\\'")}')">🗑️</button>` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ── Filter logic ──────────────────────────────────────────────────────────────
function applyFilters() {
  const q   = searchInput.value.trim().toLowerCase();
  const st  = statusFilter.value;
  const cat = catFilter.value;

  const filtered = allRequests.filter(r => {
    const matchSearch = !q || r.requestTitle.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q);
    const matchStatus = st === 'All' || r.status === st;
    const matchCat    = cat === 'All' || r.category === cat;
    return matchSearch && matchStatus && matchCat;
  });
  renderTable(filtered);
}

searchInput.addEventListener('input', applyFilters);
statusFilter.addEventListener('change', applyFilters);
catFilter.addEventListener('change', applyFilters);

// ── Open Submit Modal ─────────────────────────────────────────────────────────
btnAdd.addEventListener('click', () => {
  document.getElementById('request-modal-title').textContent = 'Submit Maintenance Request';
  document.getElementById('request-modal-submit').textContent = 'Submit Request';
  document.getElementById('request-id').value = '';
  document.getElementById('request-form').reset();
  requestModal.classList.add('open');
});

// ── Open Edit Modal ───────────────────────────────────────────────────────────
window.openEdit = function (id) {
  const r = allRequests.find(x => x._id === id);
  if (!r) return;
  document.getElementById('request-modal-title').textContent = 'Edit Maintenance Request';
  document.getElementById('request-modal-submit').textContent = 'Save Changes';
  document.getElementById('request-id').value         = r._id;
  document.getElementById('f-requestTitle').value     = r.requestTitle;
  document.getElementById('f-category').value         = r.category;
  document.getElementById('f-priority').value         = r.priority;
  document.getElementById('f-description').value      = r.description;
  requestModal.classList.add('open');
};

// ── Close Submit / Edit Modal ─────────────────────────────────────────────────
document.getElementById('request-modal-close').addEventListener('click',  () => requestModal.classList.remove('open'));
document.getElementById('request-modal-cancel').addEventListener('click', () => requestModal.classList.remove('open'));

// ── Submit form ───────────────────────────────────────────────────────────────
document.getElementById('request-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id       = document.getElementById('request-id').value;
  const isEdit   = Boolean(id);
  const payload  = {
    requestTitle: document.getElementById('f-requestTitle').value.trim(),
    category:     document.getElementById('f-category').value,
    priority:     document.getElementById('f-priority').value,
    description:  document.getElementById('f-description').value.trim(),
  };

  const submitBtn = document.getElementById('request-modal-submit');
  submitBtn.disabled = true;
  submitBtn.textContent = isEdit ? 'Saving…' : 'Submitting…';

  try {
    const res  = await fetch(`${TENANT_API}/maintenance${isEdit ? `/${id}` : ''}`, {
      method:  isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TENANT_TOKEN}` },
      body:    JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Request failed');

    requestModal.classList.remove('open');
    showTenantToast(isEdit ? 'Request updated!' : 'Request submitted!');
    loadRequests();
  } catch (err) {
    showTenantToast(err.message || 'Could not save request', true);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = isEdit ? 'Save Changes' : 'Submit Request';
  }
});

// ── Detail modal ──────────────────────────────────────────────────────────────
window.openDetail = async function (id) {
  try {
    const res  = await fetch(`${TENANT_API}/maintenance/${id}`, {
      headers: { Authorization: `Bearer ${TENANT_TOKEN}` },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message);
    const r = json.data;

    document.getElementById('d-title').textContent          = r.requestTitle;
    document.getElementById('d-status-priority').innerHTML  = `${statusBadge(r.status)} ${prioBadge(r.priority)}`;
    document.getElementById('d-category').textContent       = r.category;
    document.getElementById('d-submittedOn').textContent    = fmt(r.createdAt);
    document.getElementById('d-resolvedOn').textContent     = r.resolvedAt ? fmt(r.resolvedAt) : 'Not yet resolved';
    document.getElementById('d-assignedTo').textContent     = r.assignedTo || 'Not yet assigned';
    document.getElementById('d-description').textContent    = r.description || '—';
    document.getElementById('d-resolutionNotes').textContent = r.resolutionNotes || '—';

    detailModal.classList.add('open');
  } catch (err) {
    showTenantToast(err.message || 'Could not load details', true);
  }
};

document.getElementById('detail-modal-close').addEventListener('click',     () => detailModal.classList.remove('open'));
document.getElementById('detail-modal-close-btn').addEventListener('click', () => detailModal.classList.remove('open'));

// ── Delete modal ──────────────────────────────────────────────────────────────
window.openDelete = function (id, title) {
  document.getElementById('delete-request-id').value = id;
  document.getElementById('delete-msg').textContent = `Are you sure you want to delete "${title}"? This cannot be undone.`;
  deleteModal.classList.add('open');
};

document.getElementById('delete-cancel').addEventListener('click', () => deleteModal.classList.remove('open'));
document.getElementById('delete-confirm').addEventListener('click', async () => {
  const id = document.getElementById('delete-request-id').value;
  try {
    const res = await fetch(`${TENANT_API}/maintenance/${id}`, {
      method:  'DELETE',
      headers: { Authorization: `Bearer ${TENANT_TOKEN}` },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message);
    deleteModal.classList.remove('open');
    showTenantToast('Request deleted.');
    loadRequests();
  } catch (err) {
    showTenantToast(err.message || 'Could not delete request', true);
  }
});

// ── Init ──────────────────────────────────────────────────────────────────────
loadRequests();
