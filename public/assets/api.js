const API_BASE = `${window.location.origin}`;

async function post(path, payload) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    throw new Error(`Network error: ${error.message}`);
  }

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (_) {
    data = null;
  }

  if (!res.ok) {
    const message = data?.message || text || res.statusText || 'Request failed';
    const statusSuffix = res.status ? ` (HTTP ${res.status})` : '';
    throw new Error(`${message}${statusSuffix}`);
  }

  return data || {};
}

export async function signup(form) {
  return post('/api/auth/signup', form);
}

export async function login(form) {
  return post('/api/auth/login', form);
}

export async function guestLogin() {
  return post('/api/auth/guest', {});
}
