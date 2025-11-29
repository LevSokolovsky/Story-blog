import { signup, login, guestLogin, AuthUnavailableError } from './api.js';

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

const demoStories = [
  {
    id: 'story-1',
    title: 'Morning runs',
    img: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=160&q=80',
  },
  {
    id: 'story-2',
    title: 'Café notes',
    img: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=160&q=80',
  },
  {
    id: 'story-3',
    title: 'Book club',
    img: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?auto=format&fit=crop&w=160&q=80',
  },
  {
    id: 'story-4',
    title: 'City snaps',
    img: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=160&q=80',
  },
  {
    id: 'story-5',
    title: 'Weekend build',
    img: 'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=160&q=80',
  },
  {
    id: 'story-6',
    title: 'Sketchbook',
    img: 'https://images.unsplash.com/photo-1481277542470-605612bd2d61?auto=format&fit=crop&w=160&q=80',
  },
];

const demoPosts = [
  {
    id: 'demo-1',
    title: 'A calm Sunday post: hiking above the city',
    summary: 'Photo essay on finding quiet views after a busy week, with captions and a short route.',
    author: 'Efrat Azulay',
    tag: 'Lifestyle',
    time: '4 min read',
    image: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=360&q=80',
  },
  {
    id: 'demo-2',
    title: 'One-pot pasta nights that save your energy',
    summary: 'A breezy recipe breakdown with market swaps, plating tips, and a tiny shopping list.',
    author: 'Nadav Klein',
    tag: 'Food',
    time: '3 min read',
    image: 'https://images.unsplash.com/photo-1481399078051-3a0b5bf365ba?auto=format&fit=crop&w=360&q=80',
  },
  {
    id: 'demo-3',
    title: 'Sketching light: 10-minute prompts after work',
    summary: 'Simple daily prompts with a quick photo of the finished sketch to keep the streak going.',
    author: 'Adi Ben-Ami',
    tag: 'Creativity',
    time: '5 min read',
    image: 'https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=360&q=80',
  },
  {
    id: 'demo-4',
    title: 'Studio playlist for late-night writing',
    summary: 'Curated tracks with short notes on mood, tempo, and the best scenes to pair with them.',
    author: 'Lina Morales',
    tag: 'Sound',
    time: '6 min read',
    image: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=360&q=80',
  },
];

const catImage = 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=900&q=80';
const crashCat = 'https://images.unsplash.com/photo-1511044568932-338cba0ad803?auto=format&fit=crop&w=1200&q=80&sat=-40&blend=000&blend-mode=screen&exp=-12';
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

function renderDemoPost(post) {
  return `
    <article class="demo-card" aria-label="${post.title}">
      <div class="demo-body">
        <div class="demo-text">
          <div class="demo-meta">
            <span class="pill">${post.tag}</span>
            <span class="helper-text">${post.time}</span>
          </div>
          <h3>${post.title}</h3>
          <p class="helper-text">${post.summary}</p>
          <div class="post-footer">
            <span class="author">${post.author}</span>
            <button class="link-btn" type="button">Read sample</button>
          </div>
        </div>
        <img class="demo-thumb" src="${post.image}" alt="Preview for ${post.title}" />
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
  document.getElementById('readSamples').onclick = () => setRoute('demo');
}

function renderDemo() {
  const stories = demoStories
    .map(
      (story) => `
        <button class="story-chip" type="button" aria-label="${story.title}">
          <span class="story-ring">
            <img src="${story.img}" alt="${story.title}" />
          </span>
          <span class="story-label">${story.title}</span>
        </button>
      `
    )
    .join('');

  view.innerHTML = `
    <div class="demo-page">
      <div class="section-header">
        <div>
          <p class="helper-text">See how Story feels in action</p>
          <h2>Sample home feed</h2>
          <p class="helper-text">Stacked posts with right-aligned images, short briefs, and titles—just like an Instagram-style scroll.</p>
        </div>
        <button class="secondary-btn" id="backHome" type="button">Back to home</button>
      </div>

      <div class="story-rail" aria-label="Sample stories">
        ${stories}
      </div>

      <div class="demo-feed">
        ${demoPosts.map(renderDemoPost).join('')}
      </div>
    </div>
  `;

  const backHome = document.getElementById('backHome');
  if (backHome) {
    backHome.onclick = () => setRoute('home');
  }
}

function renderAuthForm(type) {
  const isSignup = type === 'signup';
  const title = isSignup ? 'Create your Story account' : 'Welcome back';
  const submitLabel = isSignup ? 'Sign up securely' : 'Log in';
  const passwordAutocomplete = isSignup ? 'new-password' : 'current-password';
  const highlights = isSignup
    ? `<ul class="benefits-list">
        <li>Keep drafts and published posts together in one place.</li>
        <li>Pick up writing on any device without losing context.</li>
        <li>Share links confidently with a clean, distraction-free reader.</li>
      </ul>`
    : `<ul class="benefits-list">
        <li>Return to your saved drafts and keep your streak going.</li>
        <li>Browse writers you follow for quick inspiration.</li>
        <li>Switch devices without re-entering your credentials.</li>
      </ul>`;

  view.innerHTML = `
    <div class="auth-layout">
      <div class="card auth-panel">
        <div class="section-header">
          <h2>${title}</h2>
          <p class="helper-text">${isSignup ? 'Build your profile with a few details' : 'Authenticate to continue writing'}</p>
        </div>
        ${state.message ? `<div class="${state.messageType === 'error' ? 'alert' : 'success'}">${state.message}</div>` : ''}
        <form id="authForm" class="form-stack">
          ${isSignup ? '<label>Full name<input class="input" required name="name" placeholder="Alex Writer" autocomplete="name" /></label>' : ''}
          <label>Email<input class="input" required type="email" name="email" placeholder="you@story.app" autocomplete="email" /></label>
          <label>Password<input class="input" required type="password" name="password" placeholder="••••••••" autocomplete="${passwordAutocomplete}" /></label>
          ${isSignup ? '<label>Confirm password<input class="input" required type="password" name="confirm" placeholder="Repeat password" autocomplete="new-password" /></label>' : ''}
          <div class="form-actions">
            <button type="submit" class="primary-btn">${submitLabel}</button>
            <button type="button" class="secondary-btn" id="guestBtn">Continue as guest</button>
          </div>
          <p class="helper-text switcher">
            ${isSignup ? 'Already have an account? ' : "Don't have an account? "}
            <button type="button" class="link-btn" id="switchAuth">${isSignup ? 'Log in' : 'Create one'}</button>
          </p>
        </form>
      </div>
      <div class="card auth-side">
        <p class="pill">Friendly onboarding</p>
        <h3>${isSignup ? 'Set up once, write often' : 'Welcome back to Story'}</h3>
        <p class="helper-text">No profile photos needed—just the essentials to start writing and exploring.</p>
        ${highlights}
      </div>
    </div>
  `;

  document.getElementById('switchAuth').onclick = () => setRoute(isSignup ? 'login' : 'signup');
  document.getElementById('guestBtn').onclick = handleGuestLogin;
  document.getElementById('authForm').onsubmit = (event) => handleAuthSubmit(event, isSignup);
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
    const apiCall = isSignup ? signup : login;
    const data = await apiCall({
      name: payload.name,
      email: payload.email,
      password: payload.password,
    });
    setState({ user: data.user, token: data.token, message: isSignup ? 'Welcome to Story!' : 'Logged in successfully.', messageType: 'success' });
    setRoute('home', { preserveMessage: true });
  } catch (error) {
    if (error instanceof AuthUnavailableError) {
      setState({
        message: 'Accounts require the Story server. On static hosting (like Netlify previews), please use guest access.',
        messageType: 'error',
      });
      return;
    }
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
    case 'demo':
      renderDemo();
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
