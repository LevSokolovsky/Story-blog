import { signup, login, guestLogin } from './api.js';

const view = document.getElementById('view');
const navButtons = Array.from(document.querySelectorAll('[data-route]'));
const navTrigger = document.getElementById('navTrigger');
const topNav = document.getElementById('topNav');
const authChip = document.getElementById('authChip');

const catImage = 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=900&q=80';
const avatarChoices = [
  'https://api.dicebear.com/8.x/identicon/svg?seed=Story',
  'https://api.dicebear.com/8.x/shapes/svg?seed=Writer',
  'https://api.dicebear.com/8.x/thumbs/svg?seed=Dreamer',
  'https://api.dicebear.com/8.x/bottts-neutral/svg?seed=Inkling',
];

let state = {
  user: JSON.parse(localStorage.getItem('story_user') || 'null'),
  token: localStorage.getItem('story_token'),
  route: 'home',
  message: '',
  messageType: 'info',
};

function setState(updates) {
  state = { ...state, ...updates };
  if (updates.user !== undefined || updates.token !== undefined) {
    if (state.user && state.token) {
      localStorage.setItem('story_user', JSON.stringify(state.user));
      localStorage.setItem('story_token', state.token);
    } else {
      localStorage.removeItem('story_user');
      localStorage.removeItem('story_token');
    }
  }
  render();
}

function setRoute(route) {
  setState({ route, message: '' });
  window.history.pushState({ route }, '', `#${route}`);
}

function handleNavClick(e) {
  const route = e.target.dataset.route;
  if (route) {
    setRoute(route);
  }
}

navButtons.forEach((btn) => btn.addEventListener('click', handleNavClick));

navTrigger.addEventListener('click', () => {
  topNav.classList.toggle('open');
});

window.addEventListener('popstate', (event) => {
  const route = event.state?.route || 'home';
  setState({ route });
});

function renderAuthChip() {
  if (state.user) {
    authChip.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;justify-content:flex-end;">
        ${state.user.avatar ? `<img src="${state.user.avatar}" alt="avatar" style="width:32px;height:32px;border-radius:50%;object-fit:cover;" />` : ''}
        <div>
          <div style="font-weight:700;">${state.user.name}</div>
          <button id="logoutBtn">Log out</button>
        </div>
      </div>
    `;
    document.getElementById('logoutBtn').addEventListener('click', () => setState({ user: null, token: null }));
  } else {
    authChip.innerHTML = `<button id="loginChip">Sign in</button>`;
    document.getElementById('loginChip').addEventListener('click', () => setRoute('login'));
  }
}

function renderHome() {
  view.innerHTML = `
    <div class="hero">
      <div>
        <p class="helper-text">Welcome to Story</p>
        <h1>Shape thoughtful blogs with calm, secure sign-in.</h1>
        <p class="helper-text">Create an account, pick a friendly avatar, and explore as a guest before you commit.</p>
        <div class="actions">
          <button class="primary-btn" id="startWriting">Get started</button>
          <button class="secondary-btn" id="exploreBtn">Browse drafts</button>
        </div>
      </div>
      <div class="card">
        <div class="section-header">
          <div>
            <h2>Security first</h2>
            <p class="helper-text">Passwords are hashed with PBKDF2 + unique salt, and tokens are signed server-side.</p>
          </div>
          <span class="success">Live demo ready</span>
        </div>
        <ul class="helper-text">
          <li>Full signup & login with avatar selection</li>
          <li>Guest access for quick previews</li>
          <li>Modern light-green & light-blue palette</li>
          <li>API served locally for Netlify-friendly deployment</li>
        </ul>
      </div>
    </div>
  `;
  document.getElementById('startWriting').onclick = () => setRoute('signup');
  document.getElementById('exploreBtn').onclick = () => setRoute('explore');
}

function renderAuthForm(type) {
  const isSignup = type === 'signup';
  const title = isSignup ? 'Create your Story account' : 'Welcome back';
  const submitLabel = isSignup ? 'Sign up securely' : 'Log in';
  const avatarSection = isSignup
    ? `<div class="card">
        <div class="section-header">
          <h3>Choose an avatar</h3>
          <p class="helper-text">Pick a ready-made avatar or paste an image URL.</p>
        </div>
        <div class="avatar-grid" id="avatarGrid"></div>
        <div class="form-grid">
          <label for="avatarUrl">Custom image link (optional)</label>
          <input class="input" id="avatarUrl" name="avatar" placeholder="https://..." />
        </div>
      </div>`
    : '';

  view.innerHTML = `
    <div class="form-grid">
      <div>
        <div class="section-header">
          <h2>${title}</h2>
          <p class="helper-text">${isSignup ? 'Build your profile with a few details' : 'Authenticate to continue writing'}</p>
        </div>
        ${state.message ? `<div class="${state.messageType === 'error' ? 'alert' : 'success'}">${state.message}</div>` : ''}
        <form id="authForm" class="form-grid">
          ${isSignup ? '<label>Full name<input class="input" required name="name" placeholder="Alex Writer" /></label>' : ''}
          <label>Email<input class="input" required type="email" name="email" placeholder="you@story.app" /></label>
          <label>Password<input class="input" required type="password" name="password" placeholder="••••••••" /></label>
          ${isSignup ? '<label>Confirm password<input class="input" required type="password" name="confirm" placeholder="Repeat password" /></label>' : ''}
          <button type="submit" class="primary-btn">${submitLabel}</button>
          <button type="button" class="secondary-btn" id="guestBtn">Continue as guest</button>
          <p class="helper-text">
            ${isSignup ? 'Already have an account? ' : "Don't have an account? "}
            <button type="button" class="link-btn" id="switchAuth">${isSignup ? 'Log in' : 'Create one'}</button>
          </p>
        </form>
      </div>
      ${avatarSection}
    </div>
  `;

  if (isSignup) {
    const grid = document.getElementById('avatarGrid');
    avatarChoices.forEach((src, index) => {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'avatar-option';
      option.innerHTML = `<img src="${src}" alt="avatar ${index + 1}" /><span class="helper-text">${index === 0 ? 'Fresh' : index === 1 ? 'Bold' : index === 2 ? 'Playful' : 'Calm'}</span>`;
      option.addEventListener('click', () => {
        document.querySelectorAll('.avatar-option').forEach((el) => el.classList.remove('selected'));
        option.classList.add('selected');
        document.getElementById('avatarUrl').value = src;
      });
      grid.appendChild(option);
    });
  }

  document.getElementById('switchAuth').onclick = () => setRoute(isSignup ? 'login' : 'signup');
  document.getElementById('guestBtn').onclick = handleGuestLogin;
  document.getElementById('authForm').onsubmit = (event) => handleAuthSubmit(event, isSignup);
}

async function handleGuestLogin() {
  try {
    const data = await guestLogin();
    setState({ user: data.user, token: data.token, message: 'Signed in as guest.', messageType: 'success' });
    setRoute('home');
  } catch (error) {
    setState({ message: error.message, messageType: 'error' });
  }
}

async function handleAuthSubmit(event, isSignup) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const payload = Object.fromEntries(formData.entries());

  if (isSignup && payload.password !== payload.confirm) {
    setState({ message: 'Passwords do not match.', messageType: 'error' });
    return;
  }

  try {
    const apiCall = isSignup ? signup : login;
    const data = await apiCall({
      name: payload.name,
      email: payload.email,
      password: payload.password,
      avatar: payload.avatar,
    });
    setState({ user: data.user, token: data.token, message: isSignup ? 'Welcome to Story!' : 'Logged in successfully.', messageType: 'success' });
    setRoute('home');
  } catch (error) {
    setState({ message: error.message, messageType: 'error' });
  }
}

function renderGuarded(title) {
  view.innerHTML = `
    <div class="placeholder">
      <h2>403 | ${title} is locked for now</h2>
      <p class="helper-text">We're still crafting this space. Come back soon!</p>
      <img src="${catImage}" alt="Sleeping cat" />
    </div>
  `;
}

function render() {
  navButtons.forEach((btn) => {
    const isActive = btn.dataset.route === state.route;
    btn.classList.toggle('active', isActive);
  });

  renderAuthChip();

  switch (state.route) {
    case 'login':
      renderAuthForm('login');
      break;
    case 'signup':
      renderAuthForm('signup');
      break;
    case 'explore':
      renderGuarded('Explore');
      break;
    case 'drafts':
      renderGuarded('Drafts');
      break;
    case 'profile':
      renderGuarded('Profile');
      break;
    default:
      renderHome();
  }
}

const initialRoute = window.location.hash.replace('#', '') || 'home';
setState({ route: initialRoute });
