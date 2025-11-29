const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const crypto = require('crypto');

const HOST = process.env.HOST || '0.0.0.0';
const PORT = process.env.PORT || 4000;
const DATA_DIR = path.join(__dirname, 'data');
const USERS_PATH = path.join(DATA_DIR, 'users.json');
const STATIC_DIR = path.join(__dirname, 'public');
const TOKEN_SECRET = process.env.STORY_TOKEN_SECRET || crypto.randomBytes(32).toString('hex');
const BODY_LIMIT = 2.5 * 1024 * 1024; // 2.5MB

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(USERS_PATH)) {
  fs.writeFileSync(USERS_PATH, '[]', 'utf8');
}

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
};

function setCommonHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'no-referrer');
}

function loadUsers() {
  try {
    const raw = fs.readFileSync(USERS_PATH, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (error) {
    console.error('Failed to read users file', error);
    return [];
  }
}

function saveUsers(users) {
  fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2));
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

function verifyPassword(password, { salt, hash }) {
  const check = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(check, 'hex'));
}

function generateId() {
  return crypto.randomUUID();
}

function signToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const data = `${header}.${body}`;
  const signature = crypto.createHmac('sha256', TOKEN_SECRET).update(data).digest('base64url');
  return `${data}.${signature}`;
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    let rejected = false;

    const rejectOnce = (error) => {
      if (rejected) return;
      rejected = true;
      req.removeAllListeners('data');
      req.removeAllListeners('end');
      req.on('data', () => {});
      req.resume();
      reject(error);
    };

    req.on('data', (chunk) => {
      if (rejected) return;
      body += chunk.toString();
      if (body.length > BODY_LIMIT) {
        rejectOnce(createHttpError(413, 'Request too large. Please keep requests under 2.5MB.'));
      }
    });
    req.on('end', () => {
      if (rejected) return;
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        rejectOnce(createHttpError(400, 'Invalid JSON body. Please send valid JSON.'));
      }
    });
  });
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function serveStatic(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      const escapedPath = String(filePath || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const catUrl =
        'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=1200&q=80&sat=-30&blend=000&sat=-15&exp=-10&blend-mode=soft-light';
      const html = `<!doctype html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Story | 404</title>
            <style>
              body { margin: 0; font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif; background: #f6fbff; color: #0b2b36; display: grid; place-items: center; min-height: 100vh; padding: 32px; }
              .card { max-width: 640px; width: 100%; background: #ffffff; border-radius: 18px; padding: 28px; box-shadow: 0 18px 60px rgba(5, 67, 96, 0.12); border: 1px solid rgba(11, 43, 54, 0.08); display: grid; gap: 14px; text-align: center; }
              img { max-width: 100%; border-radius: 16px; border: 1px solid rgba(11, 43, 54, 0.08); box-shadow: 0 12px 42px rgba(5, 67, 96, 0.1); }
              .pill { display: inline-flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 999px; background: rgba(115, 188, 231, 0.16); color: #0b2b36; font-weight: 700; }
              .pill span { font-weight: 600; color: #5e7b89; }
              .path { color: #5e7b89; font-size: 14px; }
              .actions { display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; }
              .button { padding: 12px 16px; border-radius: 12px; border: 1px solid rgba(78, 198, 162, 0.4); background: linear-gradient(120deg, #4ec6a2, #73bce7); color: #0b2b36; font-weight: 700; text-decoration: none; box-shadow: 0 12px 34px rgba(115, 188, 231, 0.35); }
              .ghost { border-color: rgba(11, 43, 54, 0.12); background: #ffffff; box-shadow: none; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="pill">😿 Lost page <span>We couldn't open ${escapedPath || 'that path'}.</span></div>
              <h1>Our cringe cat knocked this page offline.</h1>
              <p class="path">The link you followed doesn't exist. Let's get you back to writing.</p>
              <img src="${catUrl}" alt="Sleepy cat illustration" />
              <div class="actions">
                <a class="button" href="/#home">Return home</a>
                <a class="button ghost" href="/">Reload Story</a>
              </div>
            </div>
          </body>
        </html>`;
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }
    const ext = path.extname(filePath);
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
}

async function handleSignup(req, res) {
  try {
    const { name, email, password, avatar } = await parseBody(req);
    const safeEmail = String(email || '').toLowerCase().trim();
    const safeName = String(name || '').trim();
    const safeAvatar = typeof avatar === 'string' ? avatar.trim() : '';

    if (!safeName || !safeEmail || !password) {
      return sendJson(res, 400, { message: 'Name, email, and password are required.' });
    }

    if (safeName.length < 2 || safeName.length > 50) {
      return sendJson(res, 400, { message: 'Name must be between 2 and 50 characters.' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safeEmail)) {
      return sendJson(res, 400, { message: 'Please provide a valid email address.' });
    }

    if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
      return sendJson(res, 400, { message: 'Password must be between 8 and 128 characters.' });
    }

    if (safeAvatar && safeAvatar.length > 500000) {
      return sendJson(res, 413, { message: 'Avatar is too large. Please upload an image under 500KB.' });
    }

    if (
      safeAvatar &&
      !safeAvatar.startsWith('http') &&
      !safeAvatar.startsWith('data:image/png;base64,') &&
      !safeAvatar.startsWith('data:image/jpeg;base64,') &&
      !safeAvatar.startsWith('data:image/jpg;base64,') &&
      !safeAvatar.startsWith('data:image/webp;base64,')
    ) {
      return sendJson(res, 400, { message: 'Avatar must be a valid image URL or data URL.' });
    }

    const users = loadUsers();
    if (users.some((u) => u.email === safeEmail)) {
      return sendJson(res, 409, { message: 'An account with this email already exists.' });
    }

    if (users.some((u) => u.name.toLowerCase() === safeName.toLowerCase())) {
      return sendJson(res, 409, { message: 'This username is already taken. Please choose another.' });
    }

    const passwordRecord = hashPassword(password);
    const newUser = {
      id: generateId(),
      name: safeName,
      email: safeEmail,
      avatar: safeAvatar,
      password: passwordRecord,
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    saveUsers(users);
    const token = signToken({ sub: newUser.id, email: safeEmail, exp: Date.now() + 1000 * 60 * 60 * 24 * 7 });
    return sendJson(res, 201, {
      token,
      user: { id: newUser.id, name: newUser.name, email: newUser.email, avatar: newUser.avatar },
    });
  } catch (error) {
    console.error('Signup error', error);
    const status = typeof error.status === 'number' ? error.status : 500;
    return sendJson(res, status, { message: error.message || 'Invalid request.' });
  }
}

async function handleLogin(req, res) {
  try {
    const { email, password } = await parseBody(req);
    const safeEmail = String(email || '').toLowerCase().trim();
    if (!safeEmail || typeof password !== 'string' || !password) {
      return sendJson(res, 400, { message: 'Email and password are required.' });
    }
    const users = loadUsers();
    const user = users.find((u) => u.email === safeEmail);
    if (!user || !verifyPassword(password, user.password)) {
      return sendJson(res, 401, { message: 'Invalid credentials.' });
    }
    const token = signToken({ sub: user.id, email: user.email, exp: Date.now() + 1000 * 60 * 60 * 24 * 7 });
    return sendJson(res, 200, {
      token,
      user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar },
    });
  } catch (error) {
    console.error('Login error', error);
    const status = typeof error.status === 'number' ? error.status : 500;
    return sendJson(res, status, { message: error.message || 'Invalid request.' });
  }
}

async function handleGuest(req, res) {
  const guestId = `guest-${crypto.randomBytes(6).toString('hex')}`;
  const token = signToken({ sub: guestId, email: 'guest@story.app', exp: Date.now() + 1000 * 60 * 60 * 24 });
  return sendJson(res, 200, {
    token,
    user: { id: guestId, name: 'Guest Explorer', email: 'guest@story.app', avatar: 'https://images.unsplash.com/photo-1517840545244-4a1c5c9c79ef?auto=format&fit=crop&w=200&q=80' },
  });
}

function handleApi(req, res, url) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return true;
  }

  if (url.pathname === '/api/auth/signup' && req.method === 'POST') {
    handleSignup(req, res);
    return true;
  }
  if (url.pathname === '/api/auth/login' && req.method === 'POST') {
    handleLogin(req, res);
    return true;
  }
  if (url.pathname === '/api/auth/guest' && req.method === 'POST') {
    handleGuest(req, res);
    return true;
  }
  return false;
}

const server = http.createServer((req, res) => {
  setCommonHeaders(res);
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname.startsWith('/api/')) {
    const handled = handleApi(req, res, url);
    if (!handled) {
      sendJson(res, 404, { message: 'API route not found.' });
    }
    return;
  }

  let filePath = path.join(STATIC_DIR, url.pathname === '/' ? '/index.html' : url.pathname);
  if (!filePath.startsWith(STATIC_DIR)) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Bad Request');
    return;
  }
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }
  serveStatic(res, filePath);
});

server.listen(PORT, HOST, () => {
  console.log(`Story server running at http://${HOST}:${PORT}`);
});
