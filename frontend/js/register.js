/* ─────────────────────────────────────────────────────────────────────────
   register.js – Handles registration form validation and POST /api/auth/register
───────────────────────────────────────────────────────────────────────── */

const API_BASE = 'http://localhost:5000/api';

// Redirect if already logged in
if (localStorage.getItem('ss_token') && localStorage.getItem('ss_user')) {
  const u = JSON.parse(localStorage.getItem('ss_user'));
  window.location.href = u?.role === 'Admin' ? 'dashboard.html' : 'index.html';
}

// ── DOM refs ──────────────────────────────────────────────────────────────
const form           = document.getElementById('register-form');
const fullNameEl     = document.getElementById('fullName');
const phoneEl        = document.getElementById('phoneNumber');
const emailEl        = document.getElementById('email');
const roleEl         = document.getElementById('role');
const passwordEl     = document.getElementById('password');
const confirmPwEl    = document.getElementById('confirmPassword');
const submitBtn      = document.getElementById('submit-btn');
const btnText        = document.getElementById('btn-text');
const errorAlert     = document.getElementById('error-alert');
const errorMsg       = document.getElementById('error-msg');
const successAlert   = document.getElementById('success-alert');
const successMsg     = document.getElementById('success-msg');

// ── Password toggles ──────────────────────────────────────────────────────
function makeToggle(btnId, inputEl) {
  document.getElementById(btnId).addEventListener('click', () => {
    const isText    = inputEl.type === 'text';
    inputEl.type    = isText ? 'password' : 'text';
    document.getElementById(btnId).textContent = isText ? '👁️' : '🙈';
  });
}
makeToggle('toggle-pw',  passwordEl);
makeToggle('toggle-cpw', confirmPwEl);

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

// ── Field error helper ────────────────────────────────────────────────────
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

  // Full name
  const nameOk = fullNameEl.value.trim().length >= 2;
  setFieldError(fullNameEl, 'fullName-error', !nameOk);
  if (!nameOk) valid = false;

  // Phone
  const phoneOk = /^\d{7,15}$/.test(phoneEl.value.trim());
  setFieldError(phoneEl, 'phoneNumber-error', !phoneOk);
  if (!phoneOk) { document.getElementById('phoneNumber-error').textContent = 'Enter a valid phone number (7–15 digits).'; valid = false; }

  // Email
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEl.value.trim());
  setFieldError(emailEl, 'email-error', !emailOk);
  if (!emailOk) valid = false;

  // Password length
  const pwOk = passwordEl.value.length >= 6;
  setFieldError(passwordEl, 'password-error', !pwOk);
  if (!pwOk) valid = false;

  // Confirm password
  const cpwOk = confirmPwEl.value === passwordEl.value && confirmPwEl.value.length > 0;
  setFieldError(confirmPwEl, 'confirmPassword-error', !cpwOk);
  if (!cpwOk) valid = false;

  return valid;
}

// ── Loading state ─────────────────────────────────────────────────────────
function setLoading(loading) {
  submitBtn.disabled = loading;
  btnText.innerHTML  = loading
    ? '<span class="spinner"></span> Creating account…'
    : 'Create Account';
}

// ── Form submit ───────────────────────────────────────────────────────────
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validate()) return;

  setLoading(true);

  try {
    const res  = await fetch(`${API_BASE}/auth/register`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName:    fullNameEl.value.trim(),
        email:       emailEl.value.trim().toLowerCase(),
        password:    passwordEl.value,
        role:        roleEl.value,
        phoneNumber: phoneEl.value.trim(),
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      showError(json.message || 'Registration failed. Please try again.');
      setLoading(false);
      return;
    }

    showSuccess('Account created successfully! Redirecting to login…');

    // Redirect to login after short delay
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 1500);

  } catch (err) {
    showError('Unable to reach the server. Make sure the backend is running.');
    setLoading(false);
  }
});

// ── Clear field errors on input ───────────────────────────────────────────
fullNameEl.addEventListener('input',  () => setFieldError(fullNameEl,  'fullName-error',      false));
phoneEl.addEventListener('input',     () => setFieldError(phoneEl,     'phoneNumber-error',   false));
emailEl.addEventListener('input',     () => setFieldError(emailEl,     'email-error',         false));
passwordEl.addEventListener('input',  () => setFieldError(passwordEl,  'password-error',      false));
confirmPwEl.addEventListener('input', () => setFieldError(confirmPwEl, 'confirmPassword-error', false));
