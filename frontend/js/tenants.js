/* ─────────────────────────────────────────────────────────────────────────
   tenants.js — Full CRUD for the Tenant Management page
   Relies on ss_token and ss_user being set in localStorage by the login flow.
───────────────────────────────────────────────────────────────────────────── */


// ── Auth guard ────────────────────────────────────────────────────────────────
const token = localStorage.getItem('ss_token');
const user  = JSON.parse(localStorage.getItem('ss_user') || 'null');
if (!token || !user) { window.location.href = 'index.html'; throw new Error('Unauthenticated'); }
if (user.role !== 'Admin') { window.location.href = 'tenant-dashboard.html'; throw new Error('Unauthorised'); }

// ── DOM refs ──────────────────────────────────────────────────────────────────
const adminNameEl    = document.getElementById('admin-name');
const adminInitialEl = document.getElementById('admin-initial');
const greetingEl     = document.getElementById('greeting-text');
const tbody          = document.getElementById('tenants-tbody');
const countBadge     = document.getElementById('tenant-count');
const emptyState     = document.getElementById('empty-state');
const searchInput    = document.getElementById('search-input');
const statusFilter   = document.getElementById('status-filter');

// Modal refs
const tenantModal  = document.getElementById('tenant-modal');
const confirmModal = document.getElementById('confirm-modal');
const modalTitle   = document.getElementById('modal-title');
const modalSubmit  = document.getElementById('modal-submit');
const tenantForm   = document.getElementById('tenant-form');
const tenantIdEl   = document.getElementById('tenant-id');

// Toast
const toast        = document.getElementById('toast');

// ── Topbar setup ──────────────────────────────────────────────────────────────
if (user) {
  const firstName = user.fullName?.split(' ')[0] || 'Admin';
  const hour      = new Date().getHours();
  const greet     = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  adminNameEl.textContent    = user.fullName || 'Admin';
  adminInitialEl.textContent = firstName[0].toUpperCase();
  greetingEl.textContent     = `${greet}, ${firstName} 👋`;
}

// ── Sidebar (mobile) ──────────────────────────────────────────────────────────
const sidebar  = document.getElementById('sidebar');
const overlay  = document.getElementById('sidebar-overlay');
document.getElementById('hamburger').addEventListener('click', () => {
  sidebar.classList.toggle('open');
  overlay.classList.toggle('show');
});
overlay.addEventListener('click', () => {
  sidebar.classList.remove('open');
  overlay.classList.remove('show');
});

// ── Logout ────────────────────────────────────────────────────────────────────
document.getElementById('logout-btn').addEventListener('click', () => {
  localStorage.removeItem('ss_token');
  localStorage.removeItem('ss_user');
  window.location.href = 'index.html';
});

// ── Toast helper ──────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg, isError = false) {
  const icon     = toast.querySelector('span:first-child');
  icon.textContent = isError ? '❌' : '✅';
  toast.querySelector('.toast-msg').textContent = msg;
  toast.classList.toggle('error', isError);
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
}

// ── Auth header ───────────────────────────────────────────────────────────────
const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});

// ── Format helpers ─────────────────────────────────────────────────────────────
const fmtDate   = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—';
const fmtRupees = (n) => n != null ? `₹${Number(n).toLocaleString('en-IN')}` : '—';
const initials  = (name) => name?.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase() || '?';

// ── Fetch & render all tenants ────────────────────────────────────────────────
async function loadTenants() {
  const search = searchInput.value.trim();
  const status = statusFilter.value;

  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (status) params.append('status', status);

  try {
    const res  = await fetch(`${API_BASE}/tenants?${params}`, { headers: authHeaders() });
    const json = await res.json();

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('ss_token');
        localStorage.removeItem('ss_user');
        window.location.href = 'index.html';
        return;
      }
      throw new Error(json.message || 'Failed to load tenants');
    }

    renderTable(json.data);
  } catch (err) {
    showToast(err.message, true);
  }
}

function renderTable(tenants) {
  countBadge.textContent = `${tenants.length} tenant${tenants.length !== 1 ? 's' : ''}`;

  if (!tenants.length) {
    tbody.innerHTML  = '';
    emptyState.style.display = 'block';
    document.getElementById('tenants-table').style.display = 'none';
    return;
  }

  emptyState.style.display = 'none';
  document.getElementById('tenants-table').style.display = 'table';

  tbody.innerHTML = tenants.map((t, i) => `
    <tr data-id="${t._id}">
      <td>${i + 1}</td>
      <td>
        <div class="td-name-wrap">
          <span class="td-avatar">${initials(t.fullName)}</span>
          <div>
            <div class="td-name">${t.fullName}</div>
            <div style="font-size:0.75rem;color:var(--clr-muted)">${t.gender || ''}</div>
          </div>
        </div>
      </td>
      <td>${t.email}</td>
      <td>${t.phoneNumber}</td>
      <td>${t.roomNumber || '—'} ${t.bedNumber ? `/ ${t.bedNumber}` : ''}</td>
      <td>${fmtRupees(t.rentAmount)}</td>
      <td>${fmtDate(t.joiningDate)}</td>
      <td>
        <span class="status-badge ${t.status === 'Active' ? 'status-active' : 'status-vacated'}">
          ${t.status}
        </span>
      </td>
      <td>
        <div class="action-cell">
          <button class="icon-btn edit-btn" data-id="${t._id}" title="Edit tenant" aria-label="Edit ${t.fullName}">✏️</button>
          <button class="icon-btn delete delete-btn" data-id="${t._id}" title="Delete tenant" aria-label="Delete ${t.fullName}">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');

  // Attach row-level listeners
  tbody.querySelectorAll('.edit-btn').forEach(btn =>
    btn.addEventListener('click', () => openEditModal(btn.dataset.id))
  );
  tbody.querySelectorAll('.delete-btn').forEach(btn =>
    btn.addEventListener('click', () => openConfirmDelete(btn.dataset.id))
  );
}

// ── Form field getters / setters ──────────────────────────────────────────────
const fields = {
  fullName:   () => document.getElementById('f-fullName'),
  email:      () => document.getElementById('f-email'),
  phone:      () => document.getElementById('f-phone'),
  gender:     () => document.getElementById('f-gender'),
  dob:        () => document.getElementById('f-dob'),
  address:    () => document.getElementById('f-address'),
  ecName:     () => document.getElementById('f-ec-name'),
  ecPhone:    () => document.getElementById('f-ec-phone'),
  idType:     () => document.getElementById('f-id-type'),
  idNumber:   () => document.getElementById('f-id-number'),
  room:       () => document.getElementById('f-room'),
  bed:        () => document.getElementById('f-bed'),
  joining:    () => document.getElementById('f-joining'),
  rent:       () => document.getElementById('f-rent'),
  deposit:    () => document.getElementById('f-deposit'),
  status:     () => document.getElementById('f-status'),
};

function resetForm() {
  tenantForm.reset();
  tenantIdEl.value = '';
}

function populateForm(t) {
  tenantIdEl.value          = t._id;
  fields.fullName().value   = t.fullName  || '';
  fields.email().value      = t.email     || '';
  fields.phone().value      = t.phoneNumber || '';
  fields.gender().value     = t.gender    || '';
  fields.dob().value        = t.dateOfBirth ? t.dateOfBirth.slice(0, 10) : '';
  fields.address().value    = t.address   || '';
  fields.ecName().value     = t.emergencyContact?.name  || '';
  fields.ecPhone().value    = t.emergencyContact?.phone || '';
  fields.idType().value     = t.idProofType   || '';
  fields.idNumber().value   = t.idProofNumber || '';
  fields.room().value       = t.roomNumber    || '';
  fields.bed().value        = t.bedNumber     || '';
  fields.joining().value    = t.joiningDate ? t.joiningDate.slice(0, 10) : '';
  fields.rent().value       = t.rentAmount    ?? '';
  fields.deposit().value    = t.depositAmount ?? '';
  fields.status().value     = t.status        || 'Active';
}

function buildPayload() {
  return {
    fullName:    fields.fullName().value.trim(),
    email:       fields.email().value.trim(),
    phoneNumber: fields.phone().value.trim(),
    gender:      fields.gender().value,
    dateOfBirth: fields.dob().value      || undefined,
    address:     fields.address().value.trim() || undefined,
    emergencyContact: {
      name:  fields.ecName().value.trim()  || undefined,
      phone: fields.ecPhone().value.trim() || undefined,
    },
    idProofType:   fields.idType().value   || undefined,
    idProofNumber: fields.idNumber().value.trim() || undefined,
    roomNumber:    fields.room().value.trim()   || undefined,
    bedNumber:     fields.bed().value.trim()    || undefined,
    joiningDate:   fields.joining().value       || undefined,
    rentAmount:    fields.rent().value    !== '' ? Number(fields.rent().value)    : undefined,
    depositAmount: fields.deposit().value !== '' ? Number(fields.deposit().value) : undefined,
    status:        fields.status().value,
  };
}

// ── Add Modal ─────────────────────────────────────────────────────────────────
document.getElementById('btn-add-tenant').addEventListener('click', () => {
  resetForm();
  modalTitle.textContent  = 'Add Tenant';
  modalSubmit.textContent = 'Save Tenant';
  tenantModal.classList.add('open');
  fields.fullName().focus();
});

// ── Edit Modal ────────────────────────────────────────────────────────────────
async function openEditModal(id) {
  try {
    const res  = await fetch(`${API_BASE}/tenants/${id}`, { headers: authHeaders() });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message);

    populateForm(json.data);
    modalTitle.textContent  = 'Edit Tenant';
    modalSubmit.textContent = 'Update Tenant';
    tenantModal.classList.add('open');
    fields.fullName().focus();
  } catch (err) {
    showToast(err.message, true);
  }
}

// ── Close Modal ───────────────────────────────────────────────────────────────
function closeModal() { tenantModal.classList.remove('open'); }
document.getElementById('modal-close').addEventListener('click',  closeModal);
document.getElementById('modal-cancel').addEventListener('click', closeModal);
tenantModal.addEventListener('click', (e) => { if (e.target === tenantModal) closeModal(); });

// ── Submit (Create / Update) ──────────────────────────────────────────────────
modalSubmit.addEventListener('click', async () => {
  const id      = tenantIdEl.value;
  const payload = buildPayload();

  if (!payload.fullName || !payload.email || !payload.phoneNumber || !payload.gender) {
    showToast('Full name, email, phone and gender are required', true);
    return;
  }

  const url    = id ? `${API_BASE}/tenants/${id}` : `${API_BASE}/tenants`;
  const method = id ? 'PUT' : 'POST';

  modalSubmit.disabled     = true;
  modalSubmit.textContent  = 'Saving…';

  try {
    const res  = await fetch(url, {
      method,
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    const json = await res.json();

    if (!res.ok) throw new Error(json.message);

    showToast(json.message || (id ? 'Tenant updated' : 'Tenant added'));
    closeModal();
    loadTenants();
  } catch (err) {
    showToast(err.message, true);
  } finally {
    modalSubmit.disabled    = false;
    modalSubmit.textContent = id ? 'Update Tenant' : 'Save Tenant';
  }
});

// ── Delete Confirm ────────────────────────────────────────────────────────────
let pendingDeleteId = null;

function openConfirmDelete(id) {
  pendingDeleteId = id;
  confirmModal.classList.add('open');
}

function closeConfirm() { confirmModal.classList.remove('open'); pendingDeleteId = null; }
document.getElementById('confirm-cancel').addEventListener('click', closeConfirm);
confirmModal.addEventListener('click', (e) => { if (e.target === confirmModal) closeConfirm(); });

document.getElementById('confirm-delete').addEventListener('click', async () => {
  if (!pendingDeleteId) return;

  const btn = document.getElementById('confirm-delete');
  btn.disabled    = true;
  btn.textContent = 'Deleting…';

  try {
    const res  = await fetch(`${API_BASE}/tenants/${pendingDeleteId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const json = await res.json();

    if (!res.ok) throw new Error(json.message);

    showToast('Tenant deleted successfully');
    closeConfirm();
    loadTenants();
  } catch (err) {
    showToast(err.message, true);
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Yes, Delete';
  }
});

// ── Search & Filter (debounced) ───────────────────────────────────────────────
let debounceTimer;
function debounce(fn, ms = 350) {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(fn, ms);
}

searchInput.addEventListener('input',  () => debounce(loadTenants));
statusFilter.addEventListener('change', loadTenants);

// ── Init ──────────────────────────────────────────────────────────────────────
loadTenants();
