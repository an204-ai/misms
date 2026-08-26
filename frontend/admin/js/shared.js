/**
 * CloudSms Admin - Shared Utilities & API Client
 * Centralized helpers for Authentication, Networking, Formatting, and UI
 */

// Dynamic API Base URL resolution (works on local port 5000, Laragon Apache port 80, and production domain)
const API_BASE = (function() {
  if (typeof window === 'undefined') return 'http://localhost:5000/api';
  const hostname = window.location.hostname;
  const port = window.location.port;

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return port === '5000' ? '/api' : 'http://localhost:5000/api';
  }
  return '/api';
})();

/**
 * HTML Escaper to prevent Cross-Site Scripting (XSS)
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Token and Auth management
 */
function getAuthToken() {
  return localStorage.getItem('cloudsms_admin_token') || '';
}

function setAuthSession(token, user) {
  if (token) localStorage.setItem('cloudsms_admin_token', token);
  if (user) localStorage.setItem('cloudsms_admin_user', JSON.stringify(user));
}

function clearAuthSession() {
  localStorage.removeItem('cloudsms_admin_token');
  localStorage.removeItem('cloudsms_admin_user');
}

function getAuthHeaders(extraHeaders = {}) {
  const token = getAuthToken();
  const headers = { ...extraHeaders };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Authenticated fetch wrapper with automatic JWT injection and 401 handling
 */
async function authFetch(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  
  const headers = getAuthHeaders(options.headers || {});
  // Don't set Content-Type if sending FormData (let browser set boundary)
  if (!(options.body instanceof FormData) && !headers['Content-Type'] && options.method && options.method !== 'GET') {
    headers['Content-Type'] = 'application/json';
  }

  const fetchOptions = {
    ...options,
    headers
  };

  try {
    const response = await fetch(url, fetchOptions);

    if (response.status === 401) {
      // Unauthorized or expired token
      clearAuthSession();
      if (typeof handleSessionExpired === 'function') {
        handleSessionExpired();
      } else {
        window.location.replace('login.html');
      }
      throw new Error('Unauthorized');
    }

    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, data };
  } catch (err) {
    if (err.message !== 'Unauthorized') {
      console.error(`API Fetch Error [${url}]:`, err);
    }
    throw err;
  }
}

/**
 * Unified Toast Notification (Safe from XSS)
 */
function showToast(message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  let icon = 'fa-info-circle';
  if (type === 'success') icon = 'fa-check-circle';
  if (type === 'error') icon = 'fa-exclamation-circle';
  if (type === 'warning') icon = 'fa-exclamation-triangle';

  const iconEl = document.createElement('i');
  iconEl.className = `fa ${icon} toast-icon`;

  const msgEl = document.createElement('div');
  msgEl.className = 'toast-msg';
  msgEl.textContent = message; // Safe textContent prevents XSS injection

  toast.appendChild(iconEl);
  toast.appendChild(msgEl);
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

/**
 * Modern Clipboard Copy Helper
 */
function copyTextToClipboard(text, successMessage = 'Đã sao chép vào bộ nhớ tạm!') {
  if (!text) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => showToast(successMessage, 'success'))
      .catch(() => showToast('Không thể sao chép!', 'error'));
  } else {
    // Fallback using textarea
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      showToast(successMessage, 'success');
    } catch (e) {
      showToast('Không thể sao chép!', 'error');
    }
    document.body.removeChild(textarea);
  }
}

/**
 * Date & Time formatters
 */
function formatDate(isoStr) {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (e) {
    return isoStr;
  }
}

function formatShortDate(isoStr) {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  } catch (e) {
    return isoStr;
  }
}

function getTimeStr(isoStr) {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return '';
  }
}

function getDateStr(isoStr) {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch (e) {
    return '';
  }
}
