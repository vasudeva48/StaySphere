/* ─────────────────────────────────────────────────────────────────────────
   login.js – Handles login form validation and POST /api/auth/login
   
   Auth-aware early check:
   If ss_token exists in localStorage we verify it against GET /api/auth/me.
   - Valid token  → redirect to dashboard.html (always — prevents silent loop)
   - Invalid/expired token → clear localStorage and show the login form
───────────────────────────────────────────────────────────────────────── */

const API_BASE = 'http://localhost:5000/api';

// ── Async token validation (runs before showing form) ────────────────────────
(async () => {
  const token = localStorage.getItem('ss_token');
  if (!token) return; // no token → show form immediately

  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      // Token is still valid → go to dashboard
      window.location.href = 'dashboard.html';
      return;
    }
    // Token invalid / expired → clear stale data and show the form
    localStorage.removeItem('ss_token');
    localStorage.removeItem('ss_user');
  } catch (_) {
    // Backend unreachable → clear token, show the form anyway
    localStorage.removeItem('ss_token');
    localStorage.removeItem('ss_user');
  }
})();

// ── DOM refs ──────────────────────────────────────────────────────────────
const form          = document.getElementById('login-form');
const emailEl       = document.getElementById('email');
const passwordEl    = document.getElementById('password');
const submitBtn     = document.getElementById('submit-btn');
const btnText       = document.getElementById('btn-text');
const errorAlert    = document.getElementById('error-alert');
const errorMsg      = document.getElementById('error-msg');
const successAlert  = document.getElementById('success-alert');
const successMsg    = document.getElementById('success-msg');

// ── Password toggle ───────────────────────────────────────────────────────
document.getElementById('toggle-pw').addEventListener('click', () => {
  const isText     = passwordEl.type === 'text';
  passwordEl.type  = isText ? 'password' : 'text';
  document.getElementById('toggle-pw').textContent = isText ? '👁️' : '🙈';
});

// ── Alert helpers ─────────────────────────────────────────────────────────
function showError(msg) {
  errorMsg.textContent = msg;
  errorAlert.classList.add('show');
  successAlert.classList.remove('show');
}

function showSuccess(msg) {
  successMsg.textContent = msg;
  successAlert.classList.add('show');
  errorAlert.classList.remove('show');
}

function clearAlerts() {
  errorAlert.classList.remove('show');
  successAlert.classList.remove('show');
}

// ── Field validation helpers ──────────────────────────────────────────────
function setFieldError(inputEl, errorElId, show) {
  const errEl = document.getElementById(errorElId);
  if (show) {
    inputEl.classList.add('invalid');
    errEl.classList.add('show');
  } else {
    inputEl.classList.remove('invalid');
    errEl.classList.remove('show');
  }
}

// ── Client-side validation ────────────────────────────────────────────────
function validate() {
  let valid = true;
  clearAlerts();

  const email    = emailEl.value.trim();
  const password = passwordEl.value;

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  setFieldError(emailEl, 'email-error', !emailOk);
  if (!emailOk) valid = false;

  const passwordOk = password.length > 0;
  setFieldError(passwordEl, 'password-error', !passwordOk);
  if (!passwordOk) valid = false;

  return valid;
}

// ── Loading state ─────────────────────────────────────────────────────────
function setLoading(loading) {
  submitBtn.disabled = loading;
  btnText.innerHTML  = loading
    ? '<span class="spinner"></span> Signing in…'
    : 'Sign In';
}

// ── Form submit ───────────────────────────────────────────────────────────
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validate()) return;

  setLoading(true);

  try {
    const res  = await fetch(`${API_BASE}/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email:    emailEl.value.trim().toLowerCase(),
        password: passwordEl.value,
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      showError(json.message || 'Login failed. Please check your credentials.');
      setLoading(false);
      return;
    }

    // ── Success: persist to localStorage ─────────────────────
    localStorage.setItem('ss_token', json.token);
    localStorage.setItem('ss_user',  JSON.stringify(json.data));

    showSuccess('Login successful! Redirecting…');

    // ── All roles go to dashboard – dashboard handles role display ──
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 900);

  } catch (err) {
    showError('Unable to reach the server. Make sure the backend is running.');
    setLoading(false);
  }
});

// Clear field errors on input
emailEl.addEventListener('input',    () => setFieldError(emailEl,    'email-error',    false));
passwordEl.addEventListener('input', () => setFieldError(passwordEl, 'password-error', false));
