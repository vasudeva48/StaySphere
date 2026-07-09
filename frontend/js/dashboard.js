const API_BASE = 'http://localhost:5000/api';

// ── Auth guard ────────────────────────────────────────────────────────
const token = localStorage.getItem('ss_token');
const user  = JSON.parse(localStorage.getItem('ss_user') || 'null');

if (!token || !user) {
  window.location.href = 'index.html';
  throw new Error('Unauthenticated – redirecting');
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
  { id: 'stat-tenants',     key: 'totalTenants',           label: 'Total Tenants',           icon: '👥', accent: '#6c63ff', iconBg: 'rgba(108,99,255,0.12)' },
  { id: 'stat-rooms',       key: 'totalRooms',             label: 'Total Rooms',             icon: '🏠', accent: '#00d4ff', iconBg: 'rgba(0,212,255,0.12)'   },
  { id: 'stat-occupied',    key: 'occupiedRooms',          label: 'Occupied Rooms',          icon: '🔒', accent: '#f59e0b', iconBg: 'rgba(245,158,11,0.12)'  },
  { id: 'stat-vacant',      key: 'vacantRooms',            label: 'Vacant Rooms',            icon: '✅', accent: '#22c55e', iconBg: 'rgba(34,197,94,0.12)'   },
  { id: 'stat-rent',        key: 'pendingRentPayments',    label: 'Pending Rent',            icon: '💳', accent: '#ef4444', iconBg: 'rgba(239,68,68,0.12)'   },
  { id: 'stat-maintenance', key: 'openMaintenanceRequests',label: 'Maintenance Requests',    icon: '🔧', accent: '#f59e0b', iconBg: 'rgba(245,158,11,0.12)'  },
  { id: 'stat-visitors',    key: 'todaysVisitorCheckIns',  label: "Today's Check-ins",       icon: '🚪', accent: '#00d4ff', iconBg: 'rgba(0,212,255,0.12)'   },
  { id: 'stat-expenses',    key: 'monthlyExpenses',        label: 'Monthly Expenses (₹)',    icon: '📊', accent: '#a855f7', iconBg: 'rgba(168,85,247,0.12)'  },
];

// ── Render skeleton cards ──────────────────────────────────────────────
function renderSkeletonCards() {
  const grid = document.getElementById('stats-grid');
  grid.innerHTML = statMap.map(s => `
    <div class="stat-card" style="--card-accent:${s.accent}; --card-icon-bg:${s.iconBg}">
      <div class="stat-icon-wrap">${s.icon}</div>
      <div class="stat-label">${s.label}</div>
      <div class="stat-value loading">—</div>
    </div>
  `).join('');
}

// ── Populate stat values ───────────────────────────────────────────────
function populateStats(data) {
  statMap.forEach(s => {
    const card = document.getElementById('stats-grid')
      .querySelectorAll('.stat-card')[statMap.indexOf(s)];
    if (!card) return;
    const valueEl = card.querySelector('.stat-value');
    const raw = data[s.key];
    valueEl.textContent = s.key === 'monthlyExpenses'
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
  } catch (err) {
    showToast(err.message || 'Could not reach server', true);
    // Show dashes on failure
    document.querySelectorAll('.stat-value.loading').forEach(el => {
      el.textContent = '—';
      el.classList.remove('loading');
    });
  }
}

// ── Init ──────────────────────────────────────────────────────────────
fetchStats();
