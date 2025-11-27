const API_BASE = `${window.location.origin}`;

async function post(path, payload) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Request failed');
  }
  return data;
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
