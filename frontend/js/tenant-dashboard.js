/* ─────────────────────────────────────────────────────────────────────────
   tenant-dashboard.js – Tenant portal dashboard.

   Auth guard, sidebar init, logout and showTenantToast are all handled
   by tenant-auth.js which is loaded first in the HTML.
───────────────────────────────────────────────────────────────────────── */

// Wait for tenant-auth.js to finish DOM setup, then run dashboard logic
// Wait for tenant-auth.js to finish DOM setup, then run dashboard logic
document.addEventListener('DOMContentLoaded', () => {
  fetchTenantProfile();
  fetchMaintenance();
  fetchRentSummary();
  fetchAgreementSummary();
});

async function fetchTenantProfile() {
  try {
    const res  = await fetch(`${TENANT_API}/auth/me`, {
      headers: { Authorization: `Bearer ${TENANT_TOKEN}` },
    });
    if (!res.ok) return;
    const json = await res.json();
    const t = json.data;
    const roomEl = document.getElementById('card-room');
    const bedEl  = document.getElementById('card-bed');
    if (roomEl) roomEl.textContent = t.roomNumber ? `Room ${t.roomNumber}` : 'No Room';
    if (bedEl)  bedEl.textContent  = t.bedNumber ? `Bed: ${t.bedNumber}` : 'Bed: —';
  } catch (_) { /* silently fail */ }
}

async function fetchMaintenance() {
  try {
    const res  = await fetch(`${TENANT_API}/maintenance`, {
      headers: { Authorization: `Bearer ${TENANT_TOKEN}` },
    });
    if (!res.ok) return;
    const json = await res.json();
    const open = (json.data || []).filter(r => r.status !== 'Resolved').length;
    const el   = document.getElementById('card-maintenance');
    if (el) el.textContent = open;
  } catch (_) { /* silently fail */ }
}

async function fetchRentSummary() {
  try {
    const res  = await fetch(`${TENANT_API}/rent/my`, {
      headers: { Authorization: `Bearer ${TENANT_TOKEN}` },
    });
    if (!res.ok) return;
    const json    = await res.json();
    const records = json.data || [];
    const latest  = records[0];
    const rentEl  = document.getElementById('card-rent');
    const subEl   = document.getElementById('card-rent-sub');

    if (rentEl) {
      rentEl.textContent = latest ? latest.status : 'No records';
      if (latest) {
        const cls = { Paid: '#22c55e', Pending: '#f59e0b', Overdue: '#ef4444' };
        rentEl.style.color = cls[latest.status] || '';
      }
    }
    if (subEl && latest) subEl.textContent = latest.rentMonth || 'This month';
  } catch (_) { /* silently fail */ }
}

async function fetchAgreementSummary() {
  try {
    const res  = await fetch(`${TENANT_API}/agreements/my`, {
      headers: { Authorization: `Bearer ${TENANT_TOKEN}` },
    });
    if (!res.ok) return;
    const json       = await res.json();
    const agreements = json.data || [];
    const active     = agreements.find(a => a.agreementStatus === 'Active') || agreements[0];

    const agEl    = document.getElementById('card-agreement');
    const datesEl = document.getElementById('card-agreement-dates');

    if (agEl) {
      agEl.textContent = active ? active.agreementStatus : '—';
      if (active) {
        const cols = { Active: '#22c55e', Expired: '#ef4444', Terminated: '#f59e0b' };
        agEl.style.color = cols[active.agreementStatus] || '';
      }
    }
    if (datesEl && active) {
      const fmt = d => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      datesEl.textContent = `${fmt(active.startDate)} – ${fmt(active.endDate)}`;
    }
  } catch (_) { /* silently fail */ }
}
