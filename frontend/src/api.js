// Base URL for the FastAPI backend in ../backend (api/main.py). Empty by
// default so requests go to same-origin `/api/...`, which nginx reverse-
// proxies to the backend container. For local dev without Docker, set
// VITE_API_URL=http://localhost:8000 in .env — matches `uvicorn api.main:app
// --port 8000`.
export const API_URL = import.meta.env.VITE_API_URL || '';

/**
 * Wraps fetch with JSON/multipart handling and consistent error surfacing.
 * @param {string} path - API path, e.g. '/enroll'.
 * @param {RequestInit} options
 * @returns {Promise<any>} Parsed JSON response body.
 * @throws {Error} With a human-readable message on network or non-2xx errors.
 */
async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, options);
  } catch (networkErr) {
    throw new Error('Could not reach the server. Check your connection and try again.');
  }

  let body = null;
  try {
    body = await res.json();
  } catch {
    // Non-JSON or empty body is fine for some responses; ignore parse errors.
  }

  if (!res.ok) {
    const message = body?.detail || body?.message || `Request failed (${res.status})`;
    throw new Error(message);
  }

  return body;
}

/**
 * Enroll a new identity.
 * @param {File} imageFile
 * @param {string} name
 */
export function enrollIdentity(imageFile, name) {
  const formData = new FormData();
  formData.append('file', imageFile);
  formData.append('name', name);
  return request('/enroll', { method: 'POST', body: formData });
}

/**
 * Recognize faces in an image against enrolled identities.
 * @param {File|Blob} imageFile
 * @param {number} threshold - Confidence threshold between 0 and 1.
 */
export function recognizeFaces(imageFile, threshold) {
  const formData = new FormData();
  formData.append('file', imageFile);
  formData.append('threshold', String(threshold));
  return request('/recognize', { method: 'POST', body: formData });
}

// ── Auth ─────────────────────────────────────────────────────────────
/**
 * @param {string} username
 * @param {string} password
 * @returns {Promise<{token:string, user:{name:string, role:string}}>}
 */
export function login(username, password) {
  return request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
}

/**
 * @param {string} username
 * @param {string} password
 * @param {string} [role='admin']
 * @returns {Promise<{token:string, user:{name:string, role:string}}>}
 */
export function signup(username, password, role = 'admin') {
  return request('/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, role }),
  });
}

// ── System logs (dashboard data grid) ──────────────────────────────────
/**
 * @param {{page?:number, pageSize?:number, status?:'all'|'known'|'unknown', search?:string}} params
 */
export function fetchLogs(params = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
  ).toString();
  return request(`/logs${qs ? `?${qs}` : ''}`);
}

// ── Identity / entity management ───────────────────────────────────────
export function listIdentities() {
  return request('/identities');
}

/** @param {string} name */
export function deleteIdentity(name) {
  return request(`/identities/${encodeURIComponent(name)}`, { method: 'DELETE' });
}

export function fetchAuditLog() {
  return request('/audit-log');
}

// ── Bulk enrollment ─────────────────────────────────────────────────────
/**
 * Enroll one identity from a batch, reporting upload progress via XHR
 * (fetch has no upload-progress event).
 * @param {File} file
 * @param {string} name
 * @param {(pct:number)=>void} onProgress
 */
export function enrollIdentityWithProgress(file, name, onProgress) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}/enroll`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let body = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        // non-JSON body is fine
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve(body);
      } else {
        reject(new Error(body?.detail || body?.message || `Request failed (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error('Could not reach the server. Check your connection.'));
    xhr.send(formData);
  });
}
