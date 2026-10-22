// Thin fetch wrapper: same-origin cookies, CSRF header, consistent errors.

let csrfToken = null;

export class ApiError extends Error {
  constructor(message, status, code, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const setCsrfToken = (t) => {
  if (t) csrfToken = t;
};

/** Forget the token when the server session is gone (logout / expiry). */
export const clearCsrfToken = () => {
  csrfToken = null;
};

/** Parse a response body safely — non-JSON (proxy errors, HTML, empty) never throws. */
async function readBody(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function unexpectedResponse(res) {
  return new ApiError(
    `The API returned an unexpected response (HTTP ${res.status}). Check that the server is running and that the client proxy points to the right port.`,
    res.status,
    'BAD_RESPONSE'
  );
}

async function fetchCsrf() {
  let res;
  try {
    res = await fetch('/api/auth/csrf', { credentials: 'same-origin', headers: { Accept: 'application/json' } });
  } catch {
    throw new ApiError('Unable to reach the server. Check your connection.', 0, 'NETWORK_ERROR');
  }
  const data = await readBody(res);
  if (!res.ok || !data?.csrfToken) {
    if (data?.error) throw new ApiError(data.error.message, res.status, data.error.code);
    throw unexpectedResponse(res);
  }
  setCsrfToken(data.csrfToken);
}

async function request(method, path, body, { retry = true } = {}) {
  const isMutation = method !== 'GET';
  if (isMutation && !csrfToken) await fetchCsrf();

  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(isMutation ? { 'X-CSRF-Token': csrfToken } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Unable to reach the server. Check your connection.', 0, 'NETWORK_ERROR');
  }

  const data = await readBody(res);
  if (data === null && res.status !== 204) throw unexpectedResponse(res);
  if (data?.csrfToken) setCsrfToken(data.csrfToken);

  if (!res.ok) {
    const err = data?.error || {};
    // Token rotated (e.g. after login elsewhere) — refresh once and retry.
    if (err.code === 'CSRF_INVALID' && retry) {
      await fetchCsrf();
      return request(method, path, body, { retry: false });
    }
    if (res.status === 401 && ['UNAUTHENTICATED', 'SESSION_EXPIRED'].includes(err.code)) {
      clearCsrfToken();
      window.dispatchEvent(new CustomEvent('auth:expired', { detail: err }));
    }
    throw new ApiError(err.message || 'Request failed.', res.status, err.code, err.details);
  }

  window.dispatchEvent(new Event('api:activity'));
  return data;
}

export const api = {
  get: (p) => request('GET', p),
  post: (p, b) => request('POST', p, b),
  patch: (p, b) => request('PATCH', p, b),
  del: (p, b) => request('DELETE', p, b),
};

// ── Endpoint helpers ────────────────────────────────────────────
export const authApi = {
  session: () => api.get('/auth/session'),
  register: (body) => api.post('/auth/register', body),
  login: (body) => api.post('/auth/login', body),
  verifyMfa: (code) => api.post('/auth/2fa/verify', { code }),
  cancelMfa: () => api.post('/auth/2fa/cancel'),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

export const twoFactorApi = {
  status: () => api.get('/2fa/status'),
  setup: () => api.post('/2fa/setup'),
  enable: (code) => api.post('/2fa/enable', { code }),
  disable: (password, code) => api.post('/2fa/disable', { password, code }),
  regenerateBackupCodes: (code) => api.post('/2fa/backup-codes', { code }),
};

export const sessionApi = {
  list: () => api.get('/sessions'),
  revoke: (id) => api.del(`/sessions/${id}`),
  revokeOthers: () => api.del('/sessions'),
};

export const accountApi = {
  activity: (before) => api.get(`/account/activity?limit=25${before ? `&before=${encodeURIComponent(before)}` : ''}`),
  updateProfile: (name) => api.patch('/account/profile', { name }),
  changePassword: (currentPassword, newPassword) => api.post('/account/password', { currentPassword, newPassword }),
  deleteAccount: (password, code) => api.del('/account', { password, code: code || undefined }),
};
