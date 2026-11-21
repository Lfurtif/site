/* GitHub repos + two horizontal scrollers. No innerHTML with remote content. */
(() => {
  const USER = 'lfurtif';
  const API = `https://api.github.com/users/${USER}`;
  const CACHE_KEY = 'lfurtif-site-v5';
  const CACHE_MS = 10 * 60 * 1000;

  const LANG_COLORS = {
    JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5',
    Kotlin: '#a97bff', Java: '#b07219', Rust: '#dea584', Go: '#00add8',
    HTML: '#e34c26', CSS: '#563d7c', Shell: '#89e051', Ruby: '#701516',
    C: '#8b8b8b', 'C++': '#f34b7d', Dart: '#00b4ab', PHP: '#4f5d95',
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const make = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  };

  async function getJSON(url) {
    const res = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } });
    if (!res.ok) throw new Error(`GitHub ${res.status}`);
    return res.json();
  }

  function readCache() {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      return Date.now() - data.t < CACHE_MS ? data : null;
    } catch { return null; }
  }

  function writeCache(repos) {
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), repos })); }
    catch { /* sessionStorage unavailable */ }
  }

  function repoCard(repo) {
    const card = make('a', 'repo-card');
    card.href = /^https:\/\/github\.com\//i.test(repo.html_url || '') ? repo.html_url : '#';
    card.target = '_blank';
    card.rel = 'noopener noreferrer';
    card.setAttribute('aria-label', `Open ${repo.name} on GitHub`);

    const top = make('div', 'repo-top');
    top.append(make('span', 'repo-name', repo.name));
    if (repo.fork) top.append(make('span', 'badge', 'fork'));
    card.append(top);
    card.append(make('p', 'repo-desc', repo.description || 'No description yet'));

    const meta = make('div', 'repo-meta');
    if (repo.language) {
      const lang = make('span', 'lang');
      const dot = make('i', 'lang-dot');
      dot.style.background = LANG_COLORS[repo.language] || '#7d8599';
      lang.append(dot, document.createTextNode(repo.language));
      meta.append(lang);
    }
    meta.append(make('span', '', `${repo.stargazers_count || 0} stars`));
    meta.append(make('span', '', `${repo.forks_count || 0} forks`));
    card.append(meta);
    return card;
  }

  function renderRepos(repos) {
    const track = $('#repo-list');
    if (!track) return;
    track.replaceChildren();
    if (!Array.isArray(repos) || repos.length === 0) {
      track.append(make('p', 'repo-error', 'No public projects yet'));
    } else {
      for (const repo of repos.slice(0, 6)) track.append(repoCard(repo));
    }
    refresh('repos');
  }

  function renderError(message) {
    const track = $('#repo-list');
    if (!track) return;
    track.replaceChildren();
    const box = make('div', 'repo-error', message);
    const retry = make('button', '', 'Retry');
    retry.type = 'button';
    retry.addEventListener('click', load);
    box.append(retry);
    track.append(box);
    refresh('repos');
  }

  /* --- Scroller wiring (arrows, progress, keyboard, drag) --- */
  const SCROLLERS = {
    repos: { track: '#repo-list', prev: '#prev-projects', next: '#next-projects', progress: '#repo-progress' },
    activity: { track: '#calendar-body', prev: '#prev-activity', next: '#next-activity', progress: '#cal-progress' },
  };
  const state = {};

  function elements(key) {
    const s = SCROLLERS[key];
    return {
      track: $(s.track), prev: $(s.prev), next: $(s.next), progress: $(s.progress),
    };
  }

  function refresh(key) {
    const { track, prev, next, progress } = elements(key);
    if (!track) return;
    const max = Math.max(0, track.scrollWidth - track.clientWidth);
    const x = track.scrollLeft;
    if (prev) prev.disabled = x <= 2;
    if (next) next.disabled = x >= max - 2;
    if (progress) {
      const ratio = track.clientWidth / Math.max(1, track.scrollWidth);
      const pct = Math.min(100, Math.max(12, ratio * 100));
      const maxShift = (100 - pct) / pct * 100; // translateX % is relative to the thumb's own width
      progress.style.width = `${pct}%`;
      progress.style.transform = `translateX(${(x / Math.max(1, max)) * maxShift}%)`;
    }
  }

  function scrollByPage(track, dir) {
    const first = track.querySelector('.repo-card, .skeleton-card');
    const amount = first
      ? first.getBoundingClientRect().width + (parseFloat(getComputedStyle(track).gap) || 16)
      : track.clientWidth * 0.85;
    track.scrollBy({ left: dir * amount, behavior: 'smooth' });
  }

  function enableDrag(track, key) {
    let down = false, startX = 0, startScroll = 0, moved = false;
    track.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      down = true; moved = false;
      startX = e.clientX; startScroll = track.scrollLeft;
      track.classList.add('dragging');
    });
    track.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 3) moved = true;
      track.scrollLeft = startScroll - dx;
    });
    const end = () => { if (!down) return; down = false; track.classList.remove('dragging'); };
    track.addEventListener('pointerup', end);
    track.addEventListener('pointercancel', end);
    track.addEventListener('pointerleave', end);
    // Prevent the native image drag from fighting the pointer drag.
    track.addEventListener('dragstart', (e) => e.preventDefault());
    track.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
    state[key] = track;
  }

  function setupScroller(key) {
    const { track, prev, next } = elements(key);
    if (!track) return;
    if (prev) prev.addEventListener('click', () => scrollByPage(track, -1));
    if (next) next.addEventListener('click', () => scrollByPage(track, 1));
    track.addEventListener('scroll', () => refresh(key), { passive: true });
    if (key === 'activity') enableDrag(track, key);
    refresh(key);
  }

  async function load() {
    const cached = readCache();
    if (cached && cached.repos) renderRepos(cached.repos);
    try {
      const repos = await getJSON(`${API}/repos?sort=updated&per_page=6`);
      renderRepos(repos);
      writeCache(repos);
    } catch (err) {
      console.warn(err);
      if (!cached) renderError('Could not load projects from GitHub');
    }
  }

  function setupCalendar() {
    const img = $('#github-calendar');
    if (!img) return;
    img.src = `https://ghchart.rshah.org/a78bfa/${USER}`;
    img.addEventListener('error', () => {
      img.hidden = true;
      const fallback = $('.calendar-fallback');
      if (fallback) fallback.hidden = false;
    }, { once: true });
  }

  $('#year').textContent = new Date().getFullYear();
  setupScroller('repos');
  setupScroller('activity');
  addEventListener('resize', () => { refresh('repos'); refresh('activity'); }, { passive: true });
  setupCalendar();
  load();
})();
