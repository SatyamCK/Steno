const TOKEN_KEY = 'steno_token';

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable – session will last only for this page load */
  }
}

/**
 * Small fetch wrapper.
 *   api('/tests?category=SHORTHAND')
 *   api('/auth/login', { method: 'POST', body: {...} })
 *   api('/register', { method: 'POST', form: formData })
 */
export async function api(path, { method = 'GET', body, form } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(`/api${path}`, { method, headers, body: payload });
  } catch {
    throw new Error('Cannot reach the server. Check your internet connection.');
  }
  const data = res.status === 204 ? null : await res.json().catch(() => ({}));

  if (res.status === 401 && token) {
    setToken(null);
    window.dispatchEvent(new Event('auth:expired'));
  }
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}
