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
    req.on('data', (chunk) => {
      body += chunk.toString();
      if (body.length > 1e6) {
        req.connection.destroy();
        reject(new Error('Request too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error('Invalid JSON body'));
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
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
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
    if (!name || !email || !password) {
      return sendJson(res, 400, { message: 'Name, email, and password are required.' });
    }
    const safeEmail = String(email).toLowerCase();
    const users = loadUsers();
    if (users.some((u) => u.email === safeEmail)) {
      return sendJson(res, 409, { message: 'An account with this email already exists.' });
    }
    const passwordRecord = hashPassword(password);
    const newUser = {
      id: generateId(),
      name: String(name).trim(),
      email: safeEmail,
      avatar: avatar || '',
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
    return sendJson(res, 400, { message: error.message || 'Invalid request.' });
  }
}

async function handleLogin(req, res) {
  try {
    const { email, password } = await parseBody(req);
    if (!email || !password) {
      return sendJson(res, 400, { message: 'Email and password are required.' });
    }
    const users = loadUsers();
    const user = users.find((u) => u.email === String(email).toLowerCase());
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
    return sendJson(res, 400, { message: error.message || 'Invalid request.' });
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
