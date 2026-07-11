// StaySphere – Homepage Entry Point
const API_BASE = 'https://staysphere-backend-cdg7.onrender.com/api';

// ── Homepage auth awareness ───────────────────────────────────────────────────
// If a valid session exists, swap the nav Sign In / Register links for a
// "Go to Dashboard" button and a "Logout" link so the user never ends up in
// a redirect loop.
(async () => {
  const token = localStorage.getItem('ss_token');
  if (!token) return; // not logged in – show normal homepage nav

  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      // Stale / expired token – clean up silently
      localStorage.removeItem('ss_token');
      localStorage.removeItem('ss_user');
      return;
    }

    const json = await res.json();
    const user = json.data;

    // ── Choose the correct dashboard URL based on role ────────────────
    const dashboardUrl = user?.role === 'Tenant' ? 'tenant-dashboard.html' : 'dashboard.html';

    // ── Swap nav links ────────────────────────────────────────
    const nav = document.querySelector('nav');
    if (!nav) return;

    // Remove Sign In + Register links
    nav.querySelectorAll('a[href="login.html"], a[href="register.html"]').forEach(el => el.remove());

    // Add dashboard + logout links
    const dashLink = document.createElement('a');
    dashLink.href = dashboardUrl;
    dashLink.textContent = '📊 Dashboard';
    dashLink.style.cssText = 'color:var(--clr-accent);font-weight:600;';

    const logoutLink = document.createElement('a');
    logoutLink.href = '#';
    logoutLink.textContent = 'Logout';
    logoutLink.style.cssText = 'color:var(--clr-muted);';
    logoutLink.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('ss_token');
      localStorage.removeItem('ss_user');
      window.location.reload();
    });

    nav.appendChild(dashLink);
    nav.appendChild(logoutLink);

    // Show a role-aware greeting in the hero if element exists
    const heroP = document.querySelector('.hero-content p');
    if (heroP) {
      const firstName = user.fullName?.split(' ')[0] || 'there';
      const context = user?.role === 'Tenant'
        ? 'Head to your portal to manage your stay.'
        : 'Head to your dashboard to manage your hostel.';
      heroP.textContent = `Welcome back, ${firstName}! ${context}`;
    }

  } catch (_) {
    // Backend not reachable — leave nav as-is
  }
})();

// ── Global logout utility (used by dashboard, tenants, rooms pages) ──────────
window.ssLogout = function () {
  localStorage.removeItem('ss_token');
  localStorage.removeItem('ss_user');
  window.location.href = 'index.html';
};
