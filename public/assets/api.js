const API_BASE = `${window.location.origin}`;

export class AuthUnavailableError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthUnavailableError';
  }
}

function buildGuestSession() {
  const id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `guest-${Date.now()}`;
  const token = btoa(`${id}-${Date.now()}`);
  return {
    token,
    user: {
      id,
      name: 'Guest Explorer',
      email: 'guest@story.app',
      avatar:
        'https://images.unsplash.com/photo-1517840545244-4a1c5c9c79ef?auto=format&fit=crop&w=200&q=80',
    },
  };
}

async function post(path, payload) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    throw new AuthUnavailableError('Authentication service is unavailable in this hosting environment.');
  }

  const contentType = res.headers.get('content-type') || '';
  const text = await res.text();
  let data = null;
  if (contentType.includes('application/json')) {
    try {
      data = text ? JSON.parse(text) : null;
    } catch (_) {
      data = null;
    }
  }

  if (!res.ok) {
    const message = data?.message || text || res.statusText || 'Request failed';
    const statusSuffix = res.status ? ` (HTTP ${res.status})` : '';
    if (!contentType.includes('application/json')) {
      throw new AuthUnavailableError('Authentication service is unavailable in this hosting environment.');
    }
    throw new Error(`${message}${statusSuffix}`);
  }

  if (!data) {
    throw new AuthUnavailableError('Authentication service is unavailable in this hosting environment.');
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
  try {
    return await post('/api/auth/guest', {});
  } catch (error) {
    if (error instanceof AuthUnavailableError) {
      return buildGuestSession();
    }
    throw error;
  }
}
