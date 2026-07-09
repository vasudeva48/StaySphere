/* ─────────────────────────────────────────────────────────────────────────
   tenant-agreement.js – Read-only agreement view for the logged-in tenant.
   Uses TENANT_TOKEN / TENANT_API / showTenantToast from tenant-auth.js.
   Calls GET /api/agreements/my (tenant-safe endpoint added to agreementRoutes.js).
───────────────────────────────────────────────────────────────────────── */

const container    = document.getElementById('agreements-container');
const loadingState = document.getElementById('loading-state');

// ── Format helpers ────────────────────────────────────────────────────────────
function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
}

function statusBadge(s) {
  const colours = {
    Active:     { bg: 'rgba(34,197,94,0.12)',  fg: '#22c55e', border: 'rgba(34,197,94,0.25)'  },
    Expired:    { bg: 'rgba(239,68,68,0.12)',  fg: '#ef4444', border: 'rgba(239,68,68,0.25)'  },
    Terminated: { bg: 'rgba(245,158,11,0.12)', fg: '#f59e0b', border: 'rgba(245,158,11,0.25)' },
  };
  const c = colours[s] || colours.Terminated;
  return `<span style="display:inline-block;padding:0.25rem 0.8rem;border-radius:20px;font-size:0.78rem;font-weight:700;background:${c.bg};color:${c.fg};border:1px solid ${c.border};">${s}</span>`;
}

function daysRemaining(endDate) {
  if (!endDate) return null;
  const diff = new Date(endDate) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// ── Render agreements ─────────────────────────────────────────────────────────
function renderAgreements(agreements) {
  if (!agreements.length) {
    container.innerHTML = `
      <div class="no-agreement">
        <div class="icon">📜</div>
        <h2>No agreement found</h2>
        <p>Your rental agreement will appear here once the hostel owner creates it for you.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = agreements.map(a => {
    const days     = daysRemaining(a.endDate);
    const daysNote = a.agreementStatus === 'Active' && days !== null
      ? (days > 0
          ? `<span style="font-size:0.78rem;color:var(--clr-muted);">(${days} days remaining)</span>`
          : `<span style="font-size:0.78rem;color:var(--clr-danger);">(Expired ${Math.abs(days)} days ago)</span>`)
      : '';

    const roomInfo = a.room
      ? `Room ${a.room.roomNumber} · ${a.room.roomType} · Floor ${a.room.floorNumber}`
      : '—';

    const docLink = a.agreementFile
      ? `<a href="${a.agreementFile}" target="_blank" rel="noopener noreferrer" class="doc-link">📄 View Agreement Document</a>`
      : `<span style="font-size:0.85rem;color:var(--clr-muted);">No document attached</span>`;

    return `
      <div class="agreement-card">
        <div class="agreement-header">
          <div class="agreement-number">📜 ${a.agreementNumber}</div>
          ${statusBadge(a.agreementStatus)}
        </div>

        <div class="agreement-grid">
          <div>
            <div class="ag-field-label">Start Date</div>
            <div class="ag-field-value">${fmt(a.startDate)}</div>
          </div>
          <div>
            <div class="ag-field-label">End Date</div>
            <div class="ag-field-value">${fmt(a.endDate)} ${daysNote}</div>
          </div>

          <div>
            <div class="ag-field-label">Monthly Rent</div>
            <div class="ag-field-value" style="color:#22c55e;">₹${Number(a.monthlyRent || 0).toLocaleString('en-IN')}</div>
          </div>
          <div>
            <div class="ag-field-label">Security Deposit</div>
            <div class="ag-field-value">₹${Number(a.securityDeposit || 0).toLocaleString('en-IN')}</div>
          </div>

          <div>
            <div class="ag-field-label">Assigned Room</div>
            <div class="ag-field-value">${roomInfo}</div>
          </div>
          <div>
            <div class="ag-field-label">Agreement Created</div>
            <div class="ag-field-value">${fmt(a.createdAt)}</div>
          </div>

          ${a.notes ? `
          <div class="ag-block">
            <div class="ag-field-label">Notes &amp; Special Clauses</div>
            <div class="ag-field-value" style="font-weight:normal;font-size:0.875rem;margin-top:0.35rem;line-height:1.5;white-space:pre-wrap;">${a.notes}</div>
          </div>` : ''}

          <div class="ag-block" ${a.notes ? '' : ''}>
            <div class="ag-field-label">Agreement Document</div>
            <div style="margin-top:0.4rem;">${docLink}</div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ── Fetch ─────────────────────────────────────────────────────────────────────
async function loadAgreements() {
  try {
    const res  = await fetch(`${TENANT_API}/agreements/my`, {
      headers: { Authorization: `Bearer ${TENANT_TOKEN}` },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to load agreements');
    renderAgreements(json.data || []);
  } catch (err) {
    container.innerHTML = `
      <div class="no-agreement">
        <div class="icon">⚠️</div>
        <h2>Could not load agreement</h2>
        <p>${err.message}</p>
      </div>
    `;
    showTenantToast(err.message || 'Error loading agreement', true);
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────
loadAgreements();
