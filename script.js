/* GitHub repos, carousel controls. No innerHTML with remote content. */
(() => {
  const USER = 'lfurtif';
  const API = `https://api.github.com/users/${USER}`;
  const CACHE_KEY = 'lfurtif-site-v4';
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
      dot.style.background = LANG_COLORS[repo.language] || '#7a8296';
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
      updateControls();
      return;
    }
    for (const repo of repos.slice(0, 6)) track.append(repoCard(repo));
    updateControls();
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
    updateControls();
  }

  function step() {
    const track = $('#repo-list');
    const card = track && track.querySelector('.repo-card, .skeleton-card');
    if (!card) return 280;
    const gap = parseFloat(getComputedStyle(track).gap) || 16;
    return card.getBoundingClientRect().width + gap;
  }

  function updateControls() {
    const track = $('#repo-list');
    const prev = $('#prev-projects');
    const next = $('#next-projects');
    if (!track || !prev || !next) return;
    const max = Math.max(0, track.scrollWidth - track.clientWidth - 2);
    prev.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft >= max;
  }

  function setupCarousel() {
    const track = $('#repo-list');
    const prev = $('#prev-projects');
    const next = $('#next-projects');
    if (!track || !prev || !next) return;
    prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
    next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
    track.addEventListener('scroll', updateControls, { passive: true });
    addEventListener('resize', updateControls, { passive: true });
    updateControls();
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
  setupCarousel();
  setupCalendar();
  load();
})();
