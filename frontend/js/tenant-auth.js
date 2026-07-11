/* ─────────────────────────────────────────────────────────────────────────
   tenant-auth.js  –  Shared auth guard for ALL tenant portal pages.

   Rules:
   ✅  Valid token + Tenant role  → stay on page
   ⛔  Valid token + Admin role   → redirect to dashboard.html
   ⛔  Invalid / expired JWT (401) → clear tokens → login.html
   ⚠️  Backend unreachable         → stay, do NOT clear tokens
   ⛔  No token at all             → login.html immediately
───────────────────────────────────────────────────────────────────────── */

const API_BASE = 'https://staysphere-backend-cdg7.onrender.com/api';

const _token = localStorage.getItem('ss_token');
const _user  = JSON.parse(localStorage.getItem('ss_user') || 'null');

// Fast path: no token → login now
if (!_token || !_user) {
  window.location.href = 'login.html';
  throw new Error('No session – redirecting');
}

// Expose globals so page scripts can use them
window.TENANT_TOKEN = _token;
window.TENANT_USER  = _user;
window.TENANT_API   = API_BASE;

// ── Sidebar / topbar init (runs after DOM is ready) ───────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Topbar user info
  const nameEl    = document.getElementById('tenant-name');
  const initEl    = document.getElementById('tenant-initial');
  const greetEl   = document.getElementById('greeting-text');
  const hour      = new Date().getHours();
  const greetWord = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = _user.fullName?.split(' ')[0] || 'Tenant';

  if (nameEl)  nameEl.textContent  = _user.fullName || 'Tenant';
  if (initEl)  initEl.textContent  = firstName[0].toUpperCase();
  if (greetEl) greetEl.textContent = `${greetWord}, ${firstName} 👋`;

  // Sidebar toggle (mobile)
  const hamburger = document.getElementById('hamburger');
  const sidebar   = document.getElementById('sidebar');
  const overlay   = document.getElementById('sidebar-overlay');

  hamburger?.addEventListener('click', () => {
    sidebar?.classList.toggle('open');
    overlay?.classList.toggle('show');
  });
  overlay?.addEventListener('click', () => {
    sidebar?.classList.remove('open');
    overlay?.classList.remove('show');
  });

  // Logout
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    localStorage.removeItem('ss_token');
    localStorage.removeItem('ss_user');
    window.location.href = 'index.html';
  });
});

// ── Async JWT validation ──────────────────────────────────────────────────────
(async () => {
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${_token}` },
    });

    if (res.status === 401) {
      localStorage.removeItem('ss_token');
      localStorage.removeItem('ss_user');
      window.location.href = 'login.html';
      return;
    }

    if (!res.ok) return; // Any other server error – stay, don't clear

    const json = await res.json();
    const serverUser = json.data;

    // Mis-routed admin → correct dashboard
    if (serverUser?.role === 'Admin') {
      window.location.href = 'dashboard.html';
      return;
    }

    // Keep ss_user in sync
    localStorage.setItem('ss_user', JSON.stringify(serverUser));

  } catch (_) {
    // Backend unreachable – do NOT clear tokens
  }
})();

// ── Toast helper (available to all tenant pages) ──────────────────────────────
let _toastTimer;
window.showTenantToast = function (msg, isError = false) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.querySelector('.toast-msg').textContent = msg;
  toast.classList.toggle('error', isError);
  toast.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
};
