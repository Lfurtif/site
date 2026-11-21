/* GitHub data. No innerHTML with remote content, no decoration scripts. */
(() => {
  const USER = 'lfurtif';
  const API = `https://api.github.com/users/${USER}`;
  const CACHE_KEY = 'lfurtif-site-v3';
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

  function writeCache(data) {
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), ...data })); }
    catch { /* sessionStorage unavailable */ }
  }

  function renderStats(user) {
    for (const key of ['repositories', 'followers', 'following']) {
      const el = $(`[data-stat="${key}"]`);
      if (el && typeof user[key] === 'number') el.textContent = user[key].toLocaleString('fr-FR');
    }
  }

  function repoCard(repo) {
    const card = make('a', 'repo-card');
    card.href = /^https:\/\/github\.com\//i.test(repo.html_url || '') ? repo.html_url : '#';
    card.target = '_blank';
    card.rel = 'noopener noreferrer';
    card.setAttribute('aria-label', `Ouvrir ${repo.name} sur GitHub`);

    const top = make('div', 'repo-top');
    top.append(make('span', 'repo-name', repo.name));
    if (repo.fork) top.append(make('span', 'badge', 'fork'));
    card.append(top);
    card.append(make('p', 'repo-desc', repo.description || 'Pas encore de description'));

    const meta = make('div', 'repo-meta');
    if (repo.language) {
      const lang = make('span', 'lang');
      const dot = make('i', 'lang-dot');
      dot.style.background = LANG_COLORS[repo.language] || '#7a8296';
      lang.append(dot, document.createTextNode(repo.language));
      meta.append(lang);
    }
    meta.append(make('span', '', `★ ${repo.stargazers_count || 0}`));
    meta.append(make('span', '', `${repo.forks_count || 0} forks`));
    card.append(meta);
    return card;
  }

  function renderRepos(repos) {
    const list = $('#repo-list');
    if (!list) return;
    list.replaceChildren();
    if (!Array.isArray(repos) || repos.length === 0) {
      list.append(make('p', 'repo-error', 'Aucun projet public pour le moment'));
      return;
    }
    for (const repo of repos.slice(0, 6)) list.append(repoCard(repo));
  }

  function renderError(message) {
    const list = $('#repo-list');
    if (!list) return;
    list.replaceChildren();
    const box = make('div', 'repo-error', message);
    const retry = make('button', '', 'Réessayer');
    retry.type = 'button';
    retry.addEventListener('click', load);
    box.append(retry);
    list.append(box);
  }

  async function load() {
    const cached = readCache();
    if (cached) {
      renderStats(cached.user || {});
      if (cached.repos) renderRepos(cached.repos);
    }
    try {
      const [user, repos] = await Promise.all([
        getJSON(API),
        getJSON(`${API}/repos?sort=updated&per_page=6`),
      ]);
      renderStats(user);
      renderRepos(repos);
      writeCache({ user, repos });
    } catch (err) {
      console.warn(err);
      if (!cached) renderError('Impossible de charger les projets depuis GitHub');
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
  setupCalendar();
  load();
})();
