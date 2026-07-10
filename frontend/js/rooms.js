/* ──────────────────────────────────────────────────────────────────────────
   rooms.js — Room & Bed Management  (CRUD + Assign / Unassign)
   Reads ss_token and ss_user from localStorage (set on login).
─────────────────────────────────────────────────────────────────────────── */

const API_BASE = 'http://localhost:5000/api';

// ── Auth guard ────────────────────────────────────────────────────────────────
const token = localStorage.getItem('ss_token');
const user  = JSON.parse(localStorage.getItem('ss_user') || 'null');
if (!token || !user) { window.location.href = 'index.html'; throw new Error('Unauthenticated'); }
if (user.role !== 'Admin') { window.location.href = 'tenant-dashboard.html'; throw new Error('Unauthorised'); }

// ── DOM refs ──────────────────────────────────────────────────────────────────
const adminNameEl    = document.getElementById('admin-name');
const adminInitialEl = document.getElementById('admin-initial');
const greetingEl     = document.getElementById('greeting-text');
const roomsGrid      = document.getElementById('rooms-grid');
const emptyState     = document.getElementById('empty-state');
const toast          = document.getElementById('toast');

// ── Topbar ────────────────────────────────────────────────────────────────────
if (user) {
  const firstName = user.fullName?.split(' ')[0] || 'Admin';
  const hour      = new Date().getHours();
  const greet     = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  adminNameEl.textContent    = user.fullName || 'Admin';
  adminInitialEl.textContent = firstName[0].toUpperCase();
  greetingEl.textContent     = `${greet}, ${firstName} 👋`;
}

// ── Sidebar toggle ────────────────────────────────────────────────────────────
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebar-overlay');
document.getElementById('hamburger').addEventListener('click', () => {
  sidebar.classList.toggle('open'); overlay.classList.toggle('show');
});
overlay.addEventListener('click', () => {
  sidebar.classList.remove('open'); overlay.classList.remove('show');
});
document.getElementById('logout-btn').addEventListener('click', () => {
  localStorage.removeItem('ss_token'); localStorage.removeItem('ss_user');
  window.location.href = 'index.html';
});

// ── Toast ─────────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg, isError = false) {
  document.getElementById('toast-icon').textContent = isError ? '❌' : '✅';
  toast.querySelector('.toast-msg').textContent = msg;
  toast.classList.toggle('error', isError);
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
}

const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` });
const fmtRupees   = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

// ═══════════════════════════════════════════════════════════════════════════════
//  LOAD & RENDER ROOMS
// ═══════════════════════════════════════════════════════════════════════════════

async function loadRooms() {
  const search   = document.getElementById('search-input').value.trim();
  const roomType = document.getElementById('type-filter').value;
  const status   = document.getElementById('status-filter').value;

  const params = new URLSearchParams();
  if (search)   params.append('search',   search);
  if (roomType) params.append('roomType', roomType);
  if (status)   params.append('status',   status);

  try {
    const res  = await fetch(`${API_BASE}/rooms?${params}`, { headers: authHeaders() });
    const json = await res.json();
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) { localStorage.clear(); window.location.href = 'index.html'; return; }
      throw new Error(json.message);
    }
    renderRooms(json.data);
    updateStatsBar(json.data);
  } catch (err) {
    showToast(err.message, true);
  }
}

function updateStatsBar(rooms) {
  document.getElementById('sc-total').textContent       = rooms.length;
  document.getElementById('sc-available').textContent   = rooms.filter(r => r.status === 'Available').length;
  document.getElementById('sc-full').textContent        = rooms.filter(r => r.status === 'Full').length;
  document.getElementById('sc-maintenance').textContent = rooms.filter(r => r.status === 'Maintenance').length;
}

function renderRooms(rooms) {
  if (!rooms.length) {
    roomsGrid.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';

  roomsGrid.innerHTML = rooms.map((room) => {
    const pct  = room.totalBeds ? Math.round((room.occupiedBeds / room.totalBeds) * 100) : 0;
    const full = pct === 100;
    const statusClass = {
      Available:   'status-available',
      Full:        'status-full',
      Maintenance: 'status-maintenance',
    }[room.status] || 'status-available';

    const bedsHtml = room.beds.map((bed) => {
      const tenant    = bed.tenantId;
      const occupied  = bed.isOccupied && tenant;
      const tenantName = occupied ? (tenant.fullName || 'Tenant') : '';
      return `
        <div class="bed-slot ${occupied ? 'occupied' : ''}"
             data-room-id="${room._id}"
             data-bed-label="${bed.bedLabel}"
             data-tenant-id="${occupied ? tenant._id : ''}"
             data-tenant-name="${tenantName}"
             title="${occupied ? `${tenantName} — click to unassign` : `Bed ${bed.bedLabel} — click to assign`}"
             role="button" tabindex="0"
             onclick="handleBedClick(this)">
          <span class="bed-label">${bed.bedLabel}</span>
          <span class="bed-name">${occupied ? tenantName : 'Empty'}</span>
        </div>`;
    }).join('');

    return `
      <div class="room-card" id="room-card-${room._id}">
        <div class="room-card-top">
          <div>
            <div class="room-number">Room ${room.roomNumber}</div>
            <div class="room-type">${room.roomType} · ${room.floorNumber ? `Floor ${room.floorNumber}` : 'Ground Floor'}</div>
          </div>
          <span class="status-pill ${statusClass}">${room.status}</span>
        </div>
        <div class="room-card-body">
          <div class="occupancy-label">
            <span>Occupancy</span>
            <span>${room.occupiedBeds} / ${room.totalBeds} beds</span>
          </div>
          <div class="occupancy-bar">
            <div class="occupancy-fill ${full ? 'full' : ''}" style="width:${pct}%"></div>
          </div>
          <div class="room-rent">Monthly Rent: <strong>${fmtRupees(room.monthlyRent || 0)}</strong></div>
          <div class="beds-wrap">${bedsHtml}</div>
        </div>
        <div class="room-card-footer">
          <button class="btn btn-ghost btn-sm" onclick="openEditModal('${room._id}')">✏️ Edit</button>
          <button class="btn btn-danger btn-sm" onclick="openDeleteConfirm('${room._id}', '${room.roomNumber}')">🗑️ Delete</button>
        </div>
      </div>`;
  }).join('');
}

// ── Handle bed slot click ─────────────────────────────────────────────────────
function handleBedClick(el) {
  const roomId     = el.dataset.roomId;
  const bedLabel   = el.dataset.bedLabel;
  const tenantId   = el.dataset.tenantId;
  const tenantName = el.dataset.tenantName;

  if (tenantId) {
    // Occupied → offer unassign
    openUnassignConfirm(roomId, tenantId, tenantName, bedLabel);
  } else {
    // Empty → open assign modal
    openAssignModal(roomId, bedLabel);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ADD / EDIT ROOM MODAL
// ═══════════════════════════════════════════════════════════════════════════════

const roomModal    = document.getElementById('room-modal');
const roomModalTitle  = document.getElementById('room-modal-title');
const roomModalSubmit = document.getElementById('room-modal-submit');

function openAddModal() {
  document.getElementById('room-form').reset();
  document.getElementById('room-id').value = '';
  roomModalTitle.textContent  = 'Add Room';
  roomModalSubmit.textContent = 'Save Room';
  roomModal.classList.add('open');
  document.getElementById('f-roomNumber').focus();
}

async function openEditModal(id) {
  try {
    const res  = await fetch(`${API_BASE}/rooms/${id}`, { headers: authHeaders() });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message);
    const r = json.data;
    document.getElementById('room-id').value       = r._id;
    document.getElementById('f-roomNumber').value  = r.roomNumber || '';
    document.getElementById('f-roomType').value    = r.roomType   || '';
    document.getElementById('f-floorNumber').value = r.floorNumber|| '';
    document.getElementById('f-totalBeds').value   = r.totalBeds  || '';
    document.getElementById('f-monthlyRent').value = r.monthlyRent|| '';
    document.getElementById('f-roomStatus').value  = r.status     || 'Available';
    document.getElementById('f-description').value = r.description|| '';
    roomModalTitle.textContent  = 'Edit Room';
    roomModalSubmit.textContent = 'Update Room';
    roomModal.classList.add('open');
  } catch (err) { showToast(err.message, true); }
}

function closeRoomModal() { roomModal.classList.remove('open'); }

document.getElementById('btn-add-room').addEventListener('click', openAddModal);
document.getElementById('room-modal-close').addEventListener('click',  closeRoomModal);
document.getElementById('room-modal-cancel').addEventListener('click', closeRoomModal);
roomModal.addEventListener('click', (e) => { if (e.target === roomModal) closeRoomModal(); });

roomModalSubmit.addEventListener('click', async () => {
  const id = document.getElementById('room-id').value;
  const payload = {
    roomNumber:  document.getElementById('f-roomNumber').value.trim(),
    roomType:    document.getElementById('f-roomType').value,
    floorNumber: document.getElementById('f-floorNumber').value.trim() || undefined,
    totalBeds:   Number(document.getElementById('f-totalBeds').value),
    monthlyRent: Number(document.getElementById('f-monthlyRent').value) || 0,
    status:      document.getElementById('f-roomStatus').value,
    description: document.getElementById('f-description').value.trim() || undefined,
  };

  if (!payload.roomNumber || !payload.roomType || !payload.totalBeds) {
    showToast('Room number, type, and total beds are required', true); return;
  }

  const url    = id ? `${API_BASE}/rooms/${id}` : `${API_BASE}/rooms`;
  const method = id ? 'PUT' : 'POST';

  roomModalSubmit.disabled    = true;
  roomModalSubmit.textContent = 'Saving…';

  try {
    const res  = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(payload) });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message);
    showToast(json.message || (id ? 'Room updated' : 'Room created'));
    closeRoomModal();
    loadRooms();
  } catch (err) {
    showToast(err.message, true);
  } finally {
    roomModalSubmit.disabled    = false;
    roomModalSubmit.textContent = id ? 'Update Room' : 'Save Room';
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  ASSIGN TENANT MODAL
// ═══════════════════════════════════════════════════════════════════════════════

const assignModal = document.getElementById('assign-modal');

async function openAssignModal(roomId, preselectedBed = null) {
  document.getElementById('assign-room-id').value   = roomId;
  document.getElementById('selected-bed-label').value = preselectedBed || '';
  assignModal.classList.add('open');

  // Load the room's beds for the picker
  try {
    const [roomRes, tenantsRes] = await Promise.all([
      fetch(`${API_BASE}/rooms/${roomId}`, { headers: authHeaders() }),
      fetch(`${API_BASE}/rooms/unassigned-tenants`, { headers: authHeaders() }),
    ]);
    const roomJson    = await roomRes.json();
    const tenantsJson = await tenantsRes.json();

    if (!roomRes.ok)    throw new Error(roomJson.message);
    if (!tenantsRes.ok) throw new Error(tenantsJson.message);

    // Render bed picker
    const picker = document.getElementById('beds-picker');
    picker.innerHTML = roomJson.data.beds.map((bed) => `
      <button type="button"
        class="bed-pick-btn ${preselectedBed === bed.bedLabel ? 'selected' : ''} ${bed.isOccupied ? 'occupied-btn' : ''}"
        data-label="${bed.bedLabel}"
        ${bed.isOccupied ? 'disabled title="Bed already occupied"' : ''}
        onclick="selectBed(this)">
        Bed ${bed.bedLabel}
      </button>
    `).join('');

    // Render tenant dropdown
    const sel = document.getElementById('assign-tenant-select');
    if (!tenantsJson.data.length) {
      sel.innerHTML = '<option value="">No unassigned tenants available</option>';
    } else {
      sel.innerHTML = `<option value="">— Select tenant —</option>` +
        tenantsJson.data.map((t) => `<option value="${t._id}">${t.fullName} (${t.phoneNumber})</option>`).join('');
    }
  } catch (err) {
    showToast(err.message, true);
    closeAssignModal();
  }
}

function selectBed(btn) {
  document.querySelectorAll('.bed-pick-btn').forEach((b) => b.classList.remove('selected'));
  btn.classList.add('selected');
  document.getElementById('selected-bed-label').value = btn.dataset.label;
}

function closeAssignModal() { assignModal.classList.remove('open'); }
document.getElementById('assign-modal-close').addEventListener('click',  closeAssignModal);
document.getElementById('assign-modal-cancel').addEventListener('click', closeAssignModal);
assignModal.addEventListener('click', (e) => { if (e.target === assignModal) closeAssignModal(); });

document.getElementById('assign-modal-submit').addEventListener('click', async () => {
  const roomId    = document.getElementById('assign-room-id').value;
  const bedLabel  = document.getElementById('selected-bed-label').value;
  const tenantId  = document.getElementById('assign-tenant-select').value;

  if (!bedLabel)  { showToast('Please select a bed', true);   return; }
  if (!tenantId)  { showToast('Please select a tenant', true); return; }

  const btn = document.getElementById('assign-modal-submit');
  btn.disabled = true; btn.textContent = 'Assigning…';

  try {
    const res  = await fetch(`${API_BASE}/rooms/${roomId}/assign`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ tenantId, bedLabel }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message);
    showToast(json.message || 'Tenant assigned successfully');
    closeAssignModal();
    loadRooms();
  } catch (err) {
    showToast(err.message, true);
  } finally {
    btn.disabled = false; btn.textContent = 'Assign Tenant';
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  UNASSIGN CONFIRM
// ═══════════════════════════════════════════════════════════════════════════════

const unassignModal = document.getElementById('unassign-modal');

function openUnassignConfirm(roomId, tenantId, tenantName, bedLabel) {
  document.getElementById('unassign-room-id').value   = roomId;
  document.getElementById('unassign-tenant-id').value = tenantId;
  document.getElementById('unassign-msg').textContent =
    `Remove "${tenantName}" from Bed ${bedLabel}? Their room/bed assignment will be cleared.`;
  unassignModal.classList.add('open');
}

function closeUnassignModal() { unassignModal.classList.remove('open'); }
document.getElementById('unassign-cancel').addEventListener('click',  closeUnassignModal);
unassignModal.addEventListener('click', (e) => { if (e.target === unassignModal) closeUnassignModal(); });

document.getElementById('unassign-confirm').addEventListener('click', async () => {
  const roomId   = document.getElementById('unassign-room-id').value;
  const tenantId = document.getElementById('unassign-tenant-id').value;
  const btn = document.getElementById('unassign-confirm');
  btn.disabled = true; btn.textContent = 'Removing…';

  try {
    const res  = await fetch(`${API_BASE}/rooms/${roomId}/unassign`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ tenantId }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message);
    showToast(json.message || 'Tenant unassigned');
    closeUnassignModal();
    loadRooms();
  } catch (err) {
    showToast(err.message, true);
  } finally {
    btn.disabled = false; btn.textContent = 'Yes, Unassign';
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  DELETE CONFIRM
// ═══════════════════════════════════════════════════════════════════════════════

const deleteModal = document.getElementById('delete-modal');

function openDeleteConfirm(id, roomNum) {
  document.getElementById('delete-room-id').value = id;
  document.getElementById('delete-msg').textContent =
    `Permanently delete Room ${roomNum}? This cannot be undone. (Rooms with tenants cannot be deleted.)`;
  deleteModal.classList.add('open');
}

function closeDeleteModal() { deleteModal.classList.remove('open'); }
document.getElementById('delete-cancel').addEventListener('click',  closeDeleteModal);
deleteModal.addEventListener('click', (e) => { if (e.target === deleteModal) closeDeleteModal(); });

document.getElementById('delete-confirm').addEventListener('click', async () => {
  const id  = document.getElementById('delete-room-id').value;
  const btn = document.getElementById('delete-confirm');
  btn.disabled = true; btn.textContent = 'Deleting…';

  try {
    const res  = await fetch(`${API_BASE}/rooms/${id}`, { method: 'DELETE', headers: authHeaders() });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message);
    showToast('Room deleted successfully');
    closeDeleteModal();
    loadRooms();
  } catch (err) {
    showToast(err.message, true);
  } finally {
    btn.disabled = false; btn.textContent = 'Yes, Delete';
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  SEARCH / FILTER (debounced)
// ═══════════════════════════════════════════════════════════════════════════════

let debounceTimer;
const debounce = (fn, ms = 350) => { clearTimeout(debounceTimer); debounceTimer = setTimeout(fn, ms); };

document.getElementById('search-input').addEventListener('input', () => debounce(loadRooms));
document.getElementById('type-filter').addEventListener('change', loadRooms);
document.getElementById('status-filter').addEventListener('change', loadRooms);

// ── Init ──────────────────────────────────────────────────────────────────────
const urlParams = new URLSearchParams(window.location.search);
const queryStatus = urlParams.get('status');
if (queryStatus) {
  document.getElementById('status-filter').value = queryStatus;
}
loadRooms();
