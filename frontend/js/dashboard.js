const API_BASE = 'https://staysphere-backend-cdg7.onrender.com/api';

// ── Auth guard ────────────────────────────────────────────────────────
const token = localStorage.getItem('ss_token');
const user  = JSON.parse(localStorage.getItem('ss_user') || 'null');

if (!token || !user) {
  window.location.href = 'index.html';
  throw new Error('Unauthenticated – redirecting');
}
if (user.role !== 'Admin') {
  window.location.href = 'tenant-dashboard.html';
  throw new Error('Unauthorised – redirecting');
}

// ── DOM refs ──────────────────────────────────────────────────────────
const adminNameEl    = document.getElementById('admin-name');
const adminInitialEl = document.getElementById('admin-initial');
const greetingEl     = document.getElementById('greeting-text');
const toast          = document.getElementById('toast');
const sidebar        = document.getElementById('sidebar');
const overlay        = document.getElementById('sidebar-overlay');
const hamburger      = document.getElementById('hamburger');

// ── Greeting ──────────────────────────────────────────────────────────
const hour = new Date().getHours();
const greetWord = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

if (user) {
  const firstName = user.fullName?.split(' ')[0] || 'Admin';
  adminNameEl.textContent    = user.fullName || 'Admin';
  adminInitialEl.textContent = firstName[0].toUpperCase();
  greetingEl.textContent     = `${greetWord}, ${firstName} 👋`;
}

// ── Sidebar toggle (mobile) ───────────────────────────────────────────
hamburger.addEventListener('click', () => {
  sidebar.classList.toggle('open');
  overlay.classList.toggle('show');
});

overlay.addEventListener('click', () => {
  sidebar.classList.remove('open');
  overlay.classList.remove('show');
});

// ── Logout ────────────────────────────────────────────────────────────
document.getElementById('logout-btn').addEventListener('click', () => {
  localStorage.removeItem('ss_token');
  localStorage.removeItem('ss_user');
  window.location.href = 'index.html';
});

// ── Toast helper ──────────────────────────────────────────────────────
let toastTimer;
function showToast(msg, isError = false) {
  toast.querySelector('.toast-msg').textContent = msg;
  toast.classList.toggle('error', isError);
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
}

// ── Stat cards mapping ────────────────────────────────────────────────
const statMap = [
  { id: 'stat-tenants',     key: 'totalTenants',            label: 'Total Tenants',            icon: '👥', accent: '#6c63ff', iconBg: 'rgba(108,99,255,0.12)', rupees: false, link: 'tenants.html' },
  { id: 'stat-rooms',       key: 'totalRooms',              label: 'Total Rooms',              icon: '🏠', accent: '#00d4ff', iconBg: 'rgba(0,212,255,0.12)',   rupees: false, link: 'rooms.html' },
  { id: 'stat-occupied',    key: 'occupiedRooms',           label: 'Occupied Rooms',           icon: '🔒', accent: '#f59e0b', iconBg: 'rgba(245,158,11,0.12)',  rupees: false, link: 'rooms.html?status=Occupied' },
  { id: 'stat-vacant',      key: 'vacantRooms',             label: 'Vacant Rooms',             icon: '✅', accent: '#22c55e', iconBg: 'rgba(34,197,94,0.12)',   rupees: false, link: 'rooms.html?status=Vacant' },
  { id: 'stat-rent-pend',   key: 'pendingRentPayments',     label: 'Pending / Overdue Rent',   icon: '💳', accent: '#ef4444', iconBg: 'rgba(239,68,68,0.12)',   rupees: false, link: 'rent.html' },
  { id: 'stat-rent-coll',   key: 'monthlyRentCollected',    label: 'Rent Collected (Month)',    icon: '💰', accent: '#22c55e', iconBg: 'rgba(34,197,94,0.12)',   rupees: true , link: 'rent.html' },
  { id: 'stat-agreements',  key: 'activeAgreements',        label: 'Active Agreements',        icon: '📜', accent: '#00d4ff', iconBg: 'rgba(0,212,255,0.12)',   rupees: false, link: 'agreements.html' },
  { id: 'stat-maintenance-open', key: 'openMaintenanceRequests', label: 'Open Maintenance Requests',  icon: '🔧', accent: '#f59e0b', iconBg: 'rgba(245,158,11,0.12)',  rupees: false, link: 'maintenance.html?status=Open' },
  { id: 'stat-maintenance-res',  key: 'resolvedMaintenanceRequests', label: 'Resolved Maintenance Requests',icon: '✅', accent: '#22c55e', iconBg: 'rgba(34,197,94,0.12)',  rupees: false, link: 'maintenance.html?status=Resolved' },
  { id: 'stat-visitors',         key: 'todaysVisitorCheckIns',  label: "Today's Visitors",          icon: '🚪', accent: '#00d4ff', iconBg: 'rgba(0,212,255,0.12)',   rupees: false, link: 'visitors.html' },
  { id: 'stat-visitors-in',      key: 'currentlyCheckedIn',     label: 'Currently Checked In',      icon: '✅', accent: '#22c55e', iconBg: 'rgba(34,197,94,0.12)',   rupees: false, link: 'visitors.html' },
  { id: 'stat-visitors-out',     key: 'checkedOutToday',        label: 'Checked Out Today',         icon: '🏃', accent: '#a855f7', iconBg: 'rgba(168,85,247,0.12)',  rupees: false, link: 'visitors.html' },
  { id: 'stat-monthly-expenses', key: 'monthlyExpenses',        label: 'Current Month Expenses (₹)', icon: '📊', accent: '#a855f7', iconBg: 'rgba(168,85,247,0.12)',  rupees: true , link: 'expenses.html' },
  { id: 'stat-total-expenses',   key: 'totalExpenses',          label: 'Total Expenses (₹)',        icon: '💸', accent: '#ef4444', iconBg: 'rgba(239,68,68,0.12)',   rupees: true , link: 'expenses.html' },
  { id: 'stat-attendance-in',  key: 'todaysCheckIns',          label: "Today's Check-ins",        icon: '📅', accent: '#f59e0b', iconBg: 'rgba(245,158,11,0.12)',  rupees: false, link: 'attendance.html?status=Checked In' },
  { id: 'stat-attendance-out', key: 'todaysCheckOuts',         label: "Today's Check-outs",       icon: '🏃', accent: '#a855f7', iconBg: 'rgba(168,85,247,0.12)',  rupees: false, link: 'attendance.html?status=Checked Out' },
  { id: 'stat-attendance-pres',key: 'currentlyPresent',        label: "Currently Present Tenants",icon: '✅', accent: '#22c55e', iconBg: 'rgba(34,197,94,0.12)',   rupees: false, link: 'attendance.html?status=Present' },
  { id: 'stat-active-notices', key: 'activeNoticesCount',       label: "Total Active Notices",     icon: '📢', accent: '#6c63ff', iconBg: 'rgba(108,99,255,0.12)', rupees: false, link: 'notices.html' },
];


// ── Render skeleton cards ──────────────────────────────────────────────
function renderSkeletonCards() {
  const grid = document.getElementById('stats-grid');
  grid.innerHTML = statMap.map(s => `
    <a href="${s.link}" class="stat-card" style="--card-accent:${s.accent}; --card-icon-bg:${s.iconBg}; text-decoration:none; display:flex;">
      <div class="stat-icon-wrap">${s.icon}</div>
      <div class="stat-label">${s.label}</div>
      <div class="stat-value loading">—</div>
    </a>
  `).join('');
}

// ── Populate stat values ───────────────────────────────────────────────
function populateStats(data) {
  statMap.forEach(s => {
    const card = document.getElementById('stats-grid')
      .querySelectorAll('.stat-card')[statMap.indexOf(s)];
    if (!card) return;
    const valueEl = card.querySelector('.stat-value');
    const raw = data[s.key] ?? 0;
    valueEl.textContent = s.rupees
      ? `₹${Number(raw).toLocaleString('en-IN')}`
      : raw;
    valueEl.classList.remove('loading');
  });
}

// ── Fetch dashboard stats ─────────────────────────────────────────────
async function fetchStats() {
  renderSkeletonCards();
  try {
    const res  = await fetch(`${API_BASE}/dashboard/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        showToast('Session expired. Redirecting…', true);
        setTimeout(() => {
          localStorage.removeItem('ss_token');
          localStorage.removeItem('ss_user');
          window.location.href = 'index.html';
        }, 1800);
        return;
      }
      throw new Error(json.message || 'Failed to load stats');
    }

    populateStats(json.data);
    loadRecentPendingRent();
    loadRecentMaintenanceRequests();
    loadRecentVisitors();
    loadRecentExpenses();
    renderRecentAttendance(json.data.recentAttendance || []);
    renderRecentNotices(json.data.recentNotices || []);
    renderLatestNotice(json.data.latestNotice || null);
  } catch (err) {
    showToast(err.message || 'Could not reach server', true);
    // Show dashes on failure
    document.querySelectorAll('.stat-value.loading').forEach(el => {
      el.textContent = '—';
      el.classList.remove('loading');
    });
  }
}

// ── Fetch and display recent pending rent records ──────────────────────
async function loadRecentPendingRent() {
  const listEl = document.getElementById('pending-rent-list');
  if (!listEl) return;

  try {
    const res = await fetch(`${API_BASE}/rent?status=Pending`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message);

    const records = (json.data || []).slice(0, 3); // Take top 3
    if (!records.length) {
      listEl.innerHTML = '<div style="text-align:center; color:var(--clr-muted); font-size:0.85rem; padding:1.5rem 0;">🎉 All rent payments are up to date!</div>';
      return;
    }

    listEl.innerHTML = records.map(r => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:0.6rem 0.8rem; background:var(--clr-surface-2); border-radius:var(--radius-sm); border:1px solid var(--clr-border);">
        <div>
          <div style="font-weight:600; font-size:0.875rem; color:var(--clr-text);">${r.tenantName || 'Tenant'}</div>
          <div style="font-size:0.75rem; color:var(--clr-muted); margin-top:0.15rem;">
            ${r.roomNumber ? 'Room ' + r.roomNumber : 'No Room'} · ${r.rentMonth}
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-weight:700; color:var(--clr-danger); font-size:0.875rem;">₹${(r.amount || 0).toLocaleString('en-IN')}</div>
          <div style="font-size:0.7rem; color:var(--clr-muted); margin-top:0.15rem;">
            Due: ${r.dueDate ? new Date(r.dueDate).toLocaleDateString('en-IN', {day:'2-digit', month:'2-digit'}) : '—'}
          </div>
        </div>
      </div>
    `).join('');

  } catch (err) {
    console.error('Error loading pending rent list on dashboard:', err);
    listEl.innerHTML = '<div style="text-align:center; color:var(--clr-danger); font-size:0.85rem; padding:1rem 0;">Could not load pending rent records</div>';
  }
}

// ── Fetch and display recent open maintenance requests ─────────────────
async function loadRecentMaintenanceRequests() {
  const listEl = document.getElementById('maintenance-requests-list');
  if (!listEl) return;

  try {
    const res = await fetch(`${API_BASE}/maintenance?status=Pending`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message);

    // Get up to 3 pending or in progress requests
    const records = (json.data || []).filter(r => r.status !== 'Resolved').slice(0, 3);
    
    if (!records.length) {
      listEl.innerHTML = '<div style="text-align:center; color:var(--clr-muted); font-size:0.85rem; padding:1.2rem 0;">🎉 No open maintenance requests!</div>';
      return;
    }

    listEl.innerHTML = records.map(r => {
      const priorityColors = {
        High: '#ef4444',
        Medium: '#f59e0b',
        Low: '#22c55e'
      };
      const pColor = priorityColors[r.priority] || '#fff';
      const tenantName = r.tenant ? r.tenant.fullName : 'Tenant';
      const roomNum = r.tenant ? r.tenant.roomNumber : '—';

      return `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:0.6rem 0.8rem; background:var(--clr-surface-2); border-radius:var(--radius-sm); border:1px solid var(--clr-border);">
          <div>
            <div style="font-weight:600; font-size:0.875rem; color:var(--clr-text);">${r.requestTitle}</div>
            <div style="font-size:0.75rem; color:var(--clr-muted); margin-top:0.15rem;">
              by ${tenantName} (Room ${roomNum}) · ${r.category}
            </div>
          </div>
          <div style="text-align:right;">
            <span style="font-size:0.7rem; font-weight:700; color:${pColor}; border:1px solid ${pColor}40; background:${pColor}10; padding:0.15rem 0.4rem; border-radius:10px; display:inline-block;">
              ${r.priority}
            </span>
            <div style="font-size:0.68rem; color:var(--clr-muted); margin-top:0.25rem;">
              Status: <span style="font-weight:600; color:var(--clr-accent);">${r.status}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error('Error loading maintenance list on dashboard:', err);
    listEl.innerHTML = '<div style="text-align:center; color:var(--clr-danger); font-size:0.85rem; padding:1rem 0;">Could not load maintenance requests</div>';
  }
}

// ── Fetch and display today's recent visitor activity ────────────────────
async function loadRecentVisitors() {
  const listEl = document.getElementById('todays-visitors-list');
  if (!listEl) return;

  try {
    const res  = await fetch(`${API_BASE}/visitors/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message);

    const visitors = json.data?.recent || [];
    if (!visitors.length) {
      listEl.innerHTML = '<div style="text-align:center; color:var(--clr-muted); font-size:0.85rem; padding:1.2rem 0;">No visitors registered today.</div>';
      return;
    }

    const statusColors = { 'Checked In': '#22c55e', 'Checked Out': '#a855f7', 'Registered': '#f59e0b' };
    listEl.innerHTML = visitors.map(v => {
      const col = statusColors[v.status] || '#fff';
      const time = v.checkInTime ? new Date(v.checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';
      return `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:0.6rem 0.8rem; background:var(--clr-surface-2); border-radius:var(--radius-sm); border:1px solid var(--clr-border);">
          <div>
            <div style="font-weight:600; font-size:0.875rem; color:var(--clr-text);">${v.visitorName}</div>
            <div style="font-size:0.75rem; color:var(--clr-muted); margin-top:0.15rem;">
              Visiting ${v.tenantName || '—'} · Room ${v.roomNumber || '—'}
            </div>
          </div>
          <div style="text-align:right;">
            <span style="font-size:0.7rem; font-weight:700; color:${col}; border:1px solid ${col}40; background:${col}10; padding:0.15rem 0.4rem; border-radius:10px; display:inline-block;">${v.status}</span>
            <div style="font-size:0.68rem; color:var(--clr-muted); margin-top:0.25rem;">In: ${time}</div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Error loading visitors:', err);
    listEl.innerHTML = '<div style="text-align:center; color:var(--clr-danger); font-size:0.85rem; padding:1rem 0;">Could not load visitor data</div>';
  }
}

// ── Fetch and display recent operations expenses ──────────────────────
async function loadRecentExpenses() {
  const listEl = document.getElementById('recent-expenses-list');
  if (!listEl) return;

  try {
    const res = await fetch(`${API_BASE}/expenses?limit=3`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message);

    const records = (json.data || []).slice(0, 3);
    if (!records.length) {
      listEl.innerHTML = '<div style="text-align:center; color:var(--clr-muted); font-size:0.85rem; padding:1.5rem 0;">🎉 No operations expenses logged yet!</div>';
      return;
    }

    listEl.innerHTML = records.map(r => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:0.6rem 0.8rem; background:var(--clr-surface-2); border-radius:var(--radius-sm); border:1px solid var(--clr-border);">
        <div>
          <div style="font-weight:600; font-size:0.875rem; color:var(--clr-text);">${r.expenseTitle || 'Expense'}</div>
          <div style="font-size:0.75rem; color:var(--clr-muted); margin-top:0.15rem;">
            ${r.category} · ${r.paymentMethod}
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-weight:700; color:var(--clr-danger); font-size:0.875rem;">₹${(r.amount || 0).toLocaleString('en-IN')}</div>
          <div style="font-size:0.7rem; color:var(--clr-muted); margin-top:0.15rem;">
            ${r.expenseDate ? new Date(r.expenseDate).toLocaleDateString('en-IN', {day:'2-digit', month:'2-digit'}) : '—'}
          </div>
        </div>
      </div>
    `).join('');

  } catch (err) {
    console.error('Error loading expenses list on dashboard:', err);
    listEl.innerHTML = '<div style="text-align:center; color:var(--clr-danger); font-size:0.85rem; padding:1rem 0;">Could not load recent expenses</div>';
  }
}

// ── Render recent attendance activity ──────────────────────────────────
function renderRecentAttendance(records) {
  const listEl = document.getElementById('recent-attendance-list');
  if (!listEl) return;

  if (!records.length) {
    listEl.innerHTML = '<div style="text-align:center; color:var(--clr-muted); font-size:0.85rem; padding:1.2rem 0;">No attendance activity logged today.</div>';
    return;
  }

  const statusColors = {
    'Checked In': '#f59e0b',
    'Checked Out': '#a855f7',
    'Present': '#22c55e',
    'Absent': '#ef4444'
  };

  listEl.innerHTML = records.map(r => {
    const col = statusColors[r.status] || '#fff';
    const dateStr = r.date ? new Date(r.date).toLocaleDateString('en-IN', {day:'2-digit', month:'2-digit'}) : '';
    
    let timeInfo = '';
    if (r.status === 'Checked In') {
      timeInfo = r.checkInTime ? 'In: ' + new Date(r.checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';
    } else if (r.status === 'Checked Out') {
      timeInfo = r.checkOutTime ? 'Out: ' + new Date(r.checkOutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';
    } else if (r.status === 'Present') {
      timeInfo = r.checkInTime ? 'Present at ' + new Date(r.checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Present';
    } else {
      timeInfo = 'Absent';
    }

    return `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:0.6rem 0.8rem; background:var(--clr-surface-2); border-radius:var(--radius-sm); border:1px solid var(--clr-border);">
        <div>
          <div style="font-weight:600; font-size:0.875rem; color:var(--clr-text);">${r.tenantName}</div>
          <div style="font-size:0.75rem; color:var(--clr-muted); margin-top:0.15rem;">
            Room ${r.roomNumber || '—'} · Bed ${r.bedNumber || '—'}
          </div>
        </div>
        <div style="text-align:right;">
          <span style="font-size:0.7rem; font-weight:700; color:${col}; border:1px solid ${col}40; background:${col}10; padding:0.15rem 0.4rem; border-radius:10px; display:inline-block;">
            ${r.status}
          </span>
          <div style="font-size:0.68rem; color:var(--clr-muted); margin-top:0.25rem;">
            ${dateStr} ${timeInfo ? '· ' + timeInfo : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderRecentNotices(notices) {
  const listEl = document.getElementById('recent-notices-list');
  if (!listEl) return;

  if (notices.length === 0) {
    listEl.innerHTML = '<div style="color:var(--clr-muted); font-size:0.875rem; text-align:center; padding:1rem;">No recent notice activity</div>';
    return;
  }

  listEl.innerHTML = notices.map(n => {
    const pubDate = n.publishDate ? new Date(n.publishDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—';
    const isExpired = n.expiryDate && new Date(n.expiryDate) < new Date();
    const statusText = !n.isActive ? 'Inactive' : (isExpired ? 'Expired' : 'Active');
    const statusColor = statusText === 'Active' ? 'var(--clr-success)' : 'var(--clr-danger)';
    
    const prioColor = n.priority === 'High' ? 'var(--clr-danger)' : (n.priority === 'Medium' ? 'var(--clr-warning)' : 'var(--clr-accent)');

    return `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:0.6rem 0.8rem; background:var(--clr-surface-2); border-radius:var(--radius-sm); border:1px solid var(--clr-border);">
        <div>
          <div style="font-weight:600; font-size:0.875rem; color:var(--clr-text);">${n.title}</div>
          <div style="font-size:0.75rem; color:var(--clr-muted); margin-top:0.15rem;">
            ${n.category} · Audience: ${n.audience}
          </div>
        </div>
        <div style="text-align:right; display:flex; flex-direction:column; align-items:flex-end; gap:0.25rem;">
          <span style="font-size:0.68rem; font-weight:700; color:${prioColor}; border:1px solid ${prioColor}40; background:${prioColor}10; padding:0.15rem 0.4rem; border-radius:10px; display:inline-block;">
            ${n.priority}
          </span>
          <div style="font-size:0.68rem; color:var(--clr-muted);">
            Published: ${pubDate} · <span style="color:${statusColor}; font-weight:600;">${statusText}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderLatestNotice(notice) {
  const bodyEl = document.getElementById('latest-notice-body');
  if (!bodyEl) return;

  if (!notice) {
    bodyEl.innerHTML = '<div style="color:var(--clr-muted); font-size:0.875rem; text-align:center; padding:1rem;">No active notices published</div>';
    return;
  }

  const pubDate = notice.publishDate ? new Date(notice.publishDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';
  const expDate = notice.expiryDate ? new Date(notice.expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Never';
  const creator = notice.createdBy?.fullName || 'Admin';

  const prioColor = notice.priority === 'High' ? 'var(--clr-danger)' : (notice.priority === 'Medium' ? 'var(--clr-warning)' : 'var(--clr-accent)');

  bodyEl.innerHTML = `
    <div style="padding:1rem; background:var(--clr-surface-2); border-radius:var(--radius-sm); border:1px solid var(--clr-border); display:flex; flex-direction:column; gap:0.6rem;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size:0.75rem; font-weight:700; background:rgba(0,212,255,0.12); color:var(--clr-accent); padding:0.2rem 0.6rem; border-radius:8px; border:1px solid rgba(0,212,255,0.25);">
          ${notice.category}
        </span>
        <span style="font-size:0.75rem; font-weight:700; color:${prioColor}; border:1px solid ${prioColor}40; background:${prioColor}10; padding:0.2rem 0.6rem; border-radius:8px;">
          ${notice.priority} Priority
        </span>
      </div>
      <h3 style="font-size:1.05rem; font-weight:700; color:var(--clr-text); margin-top:0.2rem;">${notice.title}</h3>
      <p style="font-size:0.85rem; color:var(--clr-muted); line-height:1.5; white-space:pre-wrap;">${notice.description}</p>
      <div style="border-top:1px solid var(--clr-border); margin-top:0.4rem; padding-top:0.6rem; font-size:0.72rem; color:var(--clr-muted); display:flex; justify-content:space-between; flex-wrap:wrap; gap:0.4rem;">
        <div>Published by: <strong>${creator}</strong></div>
        <div>Date: <strong>${pubDate}</strong></div>
        <div>Expires: <strong>${expDate}</strong></div>
      </div>
    </div>
  `;
}

// ── Init ──────────────────────────────────────────────────────────────
fetchStats();
