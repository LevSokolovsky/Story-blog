import { signup, login, guestLogin } from './api.js';

const view = document.getElementById('view');
const appRoot = document.getElementById('app');
const navButtons = Array.from(document.querySelectorAll('[data-route]'));
const navTrigger = document.getElementById('navTrigger');
const topNav = document.getElementById('topNav');
const authChip = document.getElementById('authChip');
const brandPanel = document.querySelector('.brand-panel');

const restrictedRoutes = ['explore', 'drafts', 'profile'];

const writingBenefits = [
  'Turn fleeting thoughts into a searchable library of ideas.',
  'Share consistent updates with the people who care most.',
  'Build a portfolio of writing samples you can proudly link anywhere.',
  'Reflect on your growth with lightweight drafting and publishing habits.',
];

const sampleFollowedPosts = [
  {
    id: 'p1',
    title: 'How a 10-minute writing ritual unlocked a year of publishing',
    author: 'Lina Morales',
    summary: 'A practical, repeatable cadence for keeping momentum without feeling rushed.',
    time: '6 min read',
    tag: 'Writing craft',
  },
  {
    id: 'p2',
    title: 'Finding your narrative voice without losing authenticity',
    author: 'Dex Harper',
    summary: 'Exercises to surface tone, rhythm, and a perspective readers remember.',
    time: '5 min read',
    tag: 'Voice',
  },
  {
    id: 'p3',
    title: 'The simple research system behind my story ideas',
    author: 'Samira Bloom',
    summary: 'Capture notes, connect themes, and turn sparks into outlines you can draft anywhere.',
    time: '7 min read',
    tag: 'Process',
  },
];

const catImage = 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=900&q=80';
const crashCat = 'https://images.unsplash.com/photo-1511044568932-338cba0ad803?auto=format&fit=crop&w=1200&q=80&sat=-40&blend=000&blend-mode=screen&exp=-12';
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
  following: JSON.parse(localStorage.getItem('story_following') || '[]'),
};

let crashOverlayShown = false;

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
  if (updates.following !== undefined) {
    localStorage.setItem('story_following', JSON.stringify(state.following));
  }
  try {
    render();
  } catch (error) {
    console.error('Render failed', error);
    showCrashOverlay(error?.message || 'Something went wrong while updating the page.');
  }
}

function setRoute(route, options = {}) {
  const { preserveMessage = false } = options;
  const needsAuth = restrictedRoutes.includes(route);
  if (needsAuth && !state.user) {
    setState({ route: 'home', message: 'Sign in to access writing areas like Explore and Drafts.', messageType: 'info' });
    window.history.pushState({ route: 'home' }, '', '#home');
    return;
  }
  const updates = preserveMessage ? { route } : { route, message: '' };
  setState(updates);
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

function updateNavigationVisibility() {
  navButtons.forEach((btn) => {
    const isRestricted = restrictedRoutes.includes(btn.dataset.route);
    btn.classList.toggle('hidden', isRestricted && !state.user);
  });
}

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

function renderPostCard(post) {
  return `
    <article class="post-card" aria-label="${post.title}">
      <div class="post-meta">
        <span class="pill">${post.tag}</span>
        <span class="helper-text">${post.time}</span>
      </div>
      <h3>${post.title}</h3>
      <p class="helper-text">${post.summary}</p>
      <div class="post-footer">
        <span class="author">${post.author}</span>
        <button class="link-btn" type="button">Open</button>
      </div>
    </article>
  `;
}

function renderHome() {
  if (state.user) {
    const hasFollowing = (state.following || []).length > 0;
    const feed = hasFollowing ? sampleFollowedPosts : [];
    view.innerHTML = `
      <div class="feed">
        ${state.message ? `<div class="${state.messageType === 'error' ? 'alert' : 'success'}">${state.message}</div>` : ''}
        <div class="section-header">
          <div>
            <p class="helper-text">Welcome back, ${state.user.name}.</p>
            <h2>Your home feed</h2>
            <p class="helper-text">See updates from people you follow. We keep it focused so you can read quickly on any device.</p>
          </div>
          <button class="secondary-btn" data-action="open-explore">Search writers</button>
        </div>
        ${hasFollowing
          ? `<div class="feed-grid">${feed.map(renderPostCard).join('')}</div>`
          : `<div class="empty-feed card">
              <h3>No follows yet</h3>
              <p class="helper-text">Follow a few writers to see their posts here. Start in Explore to discover topics you love.</p>
              <div class="actions">
                <button class="primary-btn" data-action="open-explore">Go to Explore</button>
                <button class="secondary-btn" type="button" data-action="open-explore">Search stories</button>
              </div>
            </div>`}
      </div>
    `;

    view.querySelectorAll('[data-action="open-explore"]').forEach((btn) => {
      btn.onclick = () => setRoute('explore');
    });
    return;
  }

  const benefitsList = writingBenefits.map((item) => `<li>${item}</li>`).join('');

  view.innerHTML = `
    <div class="hero">
      <div class="hero-intro">
        <p class="helper-text">Welcome to Story</p>
        <h1>Write the posts that move your ideas forward.</h1>
        <p class="helper-text">Story keeps drafting calm, publishing fast, and reading joyful on mobile or desktop.</p>
        <div class="actions">
          <button class="primary-btn" id="startWriting">Start your blog</button>
          <button class="secondary-btn" id="readSamples">See how it looks</button>
        </div>
      </div>
      <div class="card value-card">
        <div class="section-header">
          <div>
            <h2>Why blogging here feels great</h2>
            <p class="helper-text">Capture drafts, publish confidently, and grow an archive you can revisit anywhere.</p>
          </div>
          <span class="pill">Mobile friendly</span>
        </div>
        <ul class="benefits-list">${benefitsList}</ul>
      </div>
    </div>
  `;
  document.getElementById('startWriting').onclick = () => setRoute('signup');
  document.getElementById('readSamples').onclick = () => setRoute('login');
}

function renderAuthForm(type) {
  const isSignup = type === 'signup';
  const title = isSignup ? 'Create your Story account' : 'Welcome back';
  const submitLabel = isSignup ? 'Sign up securely' : 'Log in';
  const avatarSection = isSignup
    ? `<div class="card">
        <div class="section-header">
          <h3>Choose an avatar</h3>
          <p class="helper-text">Pick a ready-made avatar, paste a link, or upload a photo from your device.</p>
        </div>
        <div class="upload-block">
          <label class="file-label">
            Upload from your device
            <input class="input" type="file" id="avatarFile" accept="image/*" />
          </label>
          <p class="helper-text" id="avatarHint">Images under 500KB keep things speedy.</p>
          <div id="avatarPreview" class="avatar-preview muted-panel">No image selected yet.</div>
        </div>
        <div class="avatar-grid" id="avatarGrid"></div>
        <div class="form-grid">
          <label for="avatarUrl">Image link or uploaded image</label>
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

    bindAvatarTools();
  }

  document.getElementById('switchAuth').onclick = () => setRoute(isSignup ? 'login' : 'signup');
  document.getElementById('guestBtn').onclick = handleGuestLogin;
  document.getElementById('authForm').onsubmit = (event) => handleAuthSubmit(event, isSignup);
}

function bindAvatarTools() {
  const avatarUrlInput = document.getElementById('avatarUrl');
  const avatarPreview = document.getElementById('avatarPreview');
  const avatarFile = document.getElementById('avatarFile');
  const avatarHint = document.getElementById('avatarHint');

  const updatePreview = (value) => {
    if (!avatarPreview) return;
    if (value) {
      avatarPreview.innerHTML = `<img src="${value}" alt="Avatar preview" />`;
    } else {
      avatarPreview.textContent = 'No image selected yet.';
    }
  };

  avatarUrlInput?.addEventListener('input', () => updatePreview(avatarUrlInput.value.trim()));

  avatarFile?.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setState({ message: 'Please upload an image file.', messageType: 'error' });
      event.target.value = '';
      return;
    }
    if (file.size > 500 * 1024) {
      setState({ message: 'Please choose an image under 500KB.', messageType: 'error' });
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      avatarUrlInput.value = reader.result;
      updatePreview(reader.result);
      if (avatarHint) {
        avatarHint.textContent = 'Uploaded securely from your device.';
      }
    };
    reader.readAsDataURL(file);
  });

  updatePreview(avatarUrlInput?.value);
}

async function handleGuestLogin() {
  try {
    const data = await guestLogin();
    setState({ user: data.user, token: data.token, message: 'Signed in as guest.', messageType: 'success' });
    setRoute('home', { preserveMessage: true });
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
    payload.name = (payload.name || '').trim();
    payload.email = (payload.email || '').trim();
    payload.avatar = (payload.avatar || '').trim();
    const apiCall = isSignup ? signup : login;
    const data = await apiCall({
      name: payload.name,
      email: payload.email,
      password: payload.password,
      avatar: payload.avatar,
    });
    setState({ user: data.user, token: data.token, message: isSignup ? 'Welcome to Story!' : 'Logged in successfully.', messageType: 'success' });
    setRoute('home', { preserveMessage: true });
  } catch (error) {
    setState({ message: error.message, messageType: 'error' });
  }
}

function showCrashOverlay(reason) {
  if (crashOverlayShown) return;
  crashOverlayShown = true;

  const overlay = document.createElement('div');
  overlay.className = 'crash-overlay';
  overlay.innerHTML = `
    <div class="crash-card">
      <p class="pill">😿 Story hit a snag</p>
      <h2>Our cringe cat tripped over this page.</h2>
      <p class="helper-text">${reason || 'Something went wrong loading Story. Please try again.'}</p>
      <img src="${crashCat}" alt="Cat with a dramatic face" />
      <div class="actions">
        <button class="primary-btn" id="crashHome">Return home</button>
        <button class="secondary-btn" id="crashReload">Reload</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector('#crashHome').onclick = () => {
    window.location.hash = '#home';
    window.location.reload();
  };
  overlay.querySelector('#crashReload').onclick = () => window.location.reload();
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

  updateNavigationVisibility();
  if (brandPanel) {
    brandPanel.classList.toggle('is-hidden', Boolean(state.user));
  }
  if (appRoot) {
    appRoot.classList.toggle('single-column', Boolean(state.user));
  }
  topNav.classList.remove('open');

  renderAuthChip();

  if (!state.user && restrictedRoutes.includes(state.route)) {
    setState({ route: 'home' });
    return;
  }

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

window.addEventListener('error', (event) => {
  showCrashOverlay(event?.error?.message || event?.message || 'A page error occurred.');
});

window.addEventListener('unhandledrejection', (event) => {
  const message = event?.reason?.message || event?.reason || 'A network request failed in an unexpected way.';
  showCrashOverlay(message);
});
