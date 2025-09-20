// File: js/api.js (fixed)
const API_BASE = 'http://127.0.0.1:8000/api';
const TOKEN_KEY = 'token';

export function getToken() { return localStorage.getItem(TOKEN_KEY); }
export function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
export function clearToken() { localStorage.removeItem(TOKEN_KEY); }

export async function authFetch(path, options = {}) {
  const token = getToken();

  const headers = {
    'Accept': 'application/json',
    ...(options.headers || {}),
    ...(options.body && !(options.headers && options.headers['Content-Type']) ? {'Content-Type': 'application/json'} : {}),
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    mode: 'cors',
    credentials: 'omit'
  });

  if (res.status === 401) {
    clearToken();
    if (!/login\.html$/.test(window.location.pathname)) {
      window.location.href = 'login.html';
    }
    throw new Error('Unauthorized');
  }

  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return await res.json();
  return await res.text();
}

export async function apiLogin({ email, password }) {
  const res = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ email, password }),
    mode: 'cors',
    credentials: 'omit'
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.message || 'Login failed');
  if (!data.token) throw new Error('No token returned');
  setToken(data.token);
  return data;
}

export async function apiLogout() {
  try {
    await authFetch('/logout', { method: 'POST' });
  } finally {
    clearToken();
  }
}
//update

async function apiFetch(path, opts = {}) {
  const token = getToken();
  opts.headers = opts.headers || {};
  // do not override Content-Type for FormData
  if (!opts.body || !(opts.body instanceof FormData)) {
    opts.headers['Content-Type'] = 'application/json';
  }
  opts.headers['Accept'] = 'application/json';
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(API_BASE + path, opts);
  // return response and helper methods in callers (so they can read res.status/res.json())
  return res;
}

async function apiGet(url) {
  const token = localStorage.getItem('token');
  const res = await fetch('http://127.0.0.1:8000/api' + url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  return res;
}

// expose globally
window.apiGet = apiGet;

async function apiPostJson(url, payload) {
  const token = localStorage.getItem('token');
  return fetch(url, { method:'POST', headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer ' + token }, body: JSON.stringify(payload) });
}
async function apiPostForm(path, formData) {
  // content-type omitted so browser sets boundary
  return apiFetch(path, { method: 'POST', body: formData });
}
