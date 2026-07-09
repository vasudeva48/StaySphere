// StaySphere – Frontend Entry Point
console.log('StaySphere frontend loaded.');

// ── Global logout utility ────────────────────────────────────────────────────
// Called from any page that has a logout button wired to this function.
window.ssLogout = function () {
  localStorage.removeItem('ss_token');
  localStorage.removeItem('ss_user');
  window.location.href = 'index.html';
};

// ── Example: ping backend health check (uncomment when backend is running) ──
// fetch('http://localhost:5000/')
//   .then(res => res.text())
//   .then(data => console.log('Backend says:', data))
//   .catch(err => console.error('Backend not reachable:', err));
