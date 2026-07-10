/* ──────────────────────────────────────────────────────────────────────────
   tenant-notices.js — Tenant notices controller
   Auth guard, sidebar, and showTenantToast are all handled by tenant-auth.js.
   ─────────────────────────────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('search-input');
  const categoryFilter = document.getElementById('filter-category');

  // Load notices initially
  fetchActiveNotices();

  // Search filter debouncing
  let debounceTimer;
  searchInput?.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(fetchActiveNotices, 400);
  });

  // Category filter
  categoryFilter?.addEventListener('change', fetchActiveNotices);
});

// ── Fetch Active Notices from Backend ───────────────────────────────────────
async function fetchActiveNotices() {
  const searchInput = document.getElementById('search-input');
  const categoryFilter = document.getElementById('filter-category');
  const noticesListEl = document.getElementById('tenant-notices-list');
  const emptyStateEl = document.getElementById('empty-state');

  if (!noticesListEl) return;

  const searchVal = searchInput?.value.trim() || '';
  const categoryVal = categoryFilter?.value || 'All';

  let url = `${TENANT_API}/notices/active?category=${encodeURIComponent(categoryVal)}`;
  if (searchVal) {
    url += `&search=${encodeURIComponent(searchVal)}`;
  }

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${TENANT_TOKEN}` }
    });

    if (res.status === 401) {
      showTenantToast('Session expired. Redirecting...', true);
      setTimeout(() => {
        localStorage.clear();
        window.location.href = 'login.html';
      }, 1500);
      return;
    }

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Could not fetch notices');

    const notices = json.data || [];
    renderActiveNotices(notices);

  } catch (error) {
    showTenantToast(error.message, true);
  }
}

// ── Render Active Notices Cards ──────────────────────────────────────────────
function renderActiveNotices(notices) {
  const noticesListEl = document.getElementById('tenant-notices-list');
  const emptyStateEl = document.getElementById('empty-state');

  if (!noticesListEl) return;

  noticesListEl.innerHTML = '';

  if (notices.length === 0) {
    emptyStateEl.style.display = 'block';
    return;
  }
  emptyStateEl.style.display = 'grid';

  const fmtDate = dateStr => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  notices.forEach(n => {
    const card = document.createElement('div');
    card.className = 'tenant-notice-card';

    // Accent color based on priority
    let accentColor = '#6c63ff'; // Default primary
    let prioClass = 'Low';
    if (n.priority === 'High') {
      accentColor = '#ef4444';
      prioClass = 'High';
    } else if (n.priority === 'Medium') {
      accentColor = '#f59e0b';
      prioClass = 'Medium';
    } else if (n.priority === 'Low') {
      accentColor = '#00d4ff';
      prioClass = 'Low';
    }

    card.style.setProperty('--card-accent', accentColor);

    card.innerHTML = `
      <div class="tenant-notice-card-header">
        <span style="font-size:0.75rem; font-weight:700; background:rgba(0,212,255,0.08); color:#00d4ff; border:1px solid rgba(0,212,255,0.18); padding:0.25rem 0.65rem; border-radius:6px;">
          ${n.category}
        </span>
        <span class="prio-badge ${prioClass}">
          ${n.priority}
        </span>
      </div>
      <h3 class="tenant-notice-card-title">${n.title}</h3>
      <p class="tenant-notice-card-desc">${n.description}</p>
      <div class="tenant-notice-card-footer">
        <div>✍️ By: <strong>${n.createdBy?.fullName || 'Admin'}</strong></div>
        <div>📅 Published: <strong>${fmtDate(n.publishDate)}</strong></div>
      </div>
    `;

    noticesListEl.appendChild(card);
  });
}
