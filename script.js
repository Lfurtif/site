/* GitHub data + small UI behaviours. No innerHTML with remote data. */
(() => {
  const USER = 'lfurtif';
  const API = `https://api.github.com/users/${USER}`;
  const CACHE_KEY = `lfurtif-site-v2`;
  const CACHE_MS = 10 * 60 * 1000;

  const LANG_COLORS = {
    JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5',
    Kotlin: '#a97bff', Java: '#b07219', Rust: '#dea584', Go: '#00add8',
    HTML: '#e34c26', CSS: '#563d7c', Shell: '#89e051', Ruby: '#701516',
    C: '#555555', 'C++': '#f34b7d', Dart: '#00b4ab', PHP: '#4f5d95',
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const make = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  };
  const safeUrl = (value) => /^https:\/\/github\.com\//i.test(value || '') ? value : '#';

  async function json(url) {
    const res = await fetch(url, {
      headers: { Accept: 'application/vnd.github+json' },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`GitHub responded ${res.status}`);
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
    catch { /* private mode — ignore */ }
  }

  function renderProfile(user) {
    for (const key of ['repositories', 'followers', 'following']) {
      const el = $(`[data-stat="${key}"]`);
      if (el && typeof user[key] === 'number') el.textContent = user[key].toLocaleString();
    }
    const bio = $('[data-field="bio"]');
    if (bio && user.bio) bio.textContent = user.bio;

    const location = $('[data-field="location"]');
    if (location && user.location) { location.textContent = user.location; location.hidden = false; }

    const blog = $('[data-field="blog"]');
    if (blog && user.blog) {
      const url = /^https?:\/\//i.test(user.blog) ? user.blog : `https://${user.blog}`;
      blog.textContent = user.blog.replace(/^https?:\/\//, '');
      blog.href = url;
      blog.hidden = false;
    }
  }

  function repoCard(repo) {
    const card = make('a', 'repo-card');
    card.href = safeUrl(repo.html_url);
    card.target = '_blank';
    card.rel = 'noopener noreferrer';
    card.setAttribute('aria-label', `Open ${repo.name} on GitHub`);

    const top = make('div', 'repo-top');
    top.append(make('span', 'repo-name', repo.name));
    if (repo.fork) top.append(make('span', 'badge', 'fork'));
    top.append(make('span', 'arrow', '↗'));
    card.append(top);

    card.append(make('p', 'repo-desc', repo.description || 'Pas encore de description.'));

    const meta = make('div', 'repo-meta');
    if (repo.language) {
      const lang = make('span', 'lang');
      const dot = make('i', 'lang-dot');
      dot.style.background = LANG_COLORS[repo.language] || '#b6ff3c';
      lang.append(dot, document.createTextNode(repo.language));
      meta.append(lang);
    }
    const stars = make('span', 'metric', `★ ${repo.stargazers_count || 0}`);
    const forks = make('span', 'metric', `⑂ ${repo.forks_count || 0}`);
    const date = repo.updated_at
      ? make('span', 'metric', new Date(repo.updated_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }))
      : null;
    meta.append(stars, forks);
    if (date) meta.append(date);
    card.append(meta);
    return card;
  }

  function renderRepos(repos) {
    const list = $('#repo-list');
    if (!list) return;
    list.replaceChildren();
    if (!Array.isArray(repos) || !repos.length) {
      list.append(make('p', 'repo-error', 'Aucun projet public pour le moment.'));
      return;
    }
    for (const repo of repos.slice(0, 6)) list.append(repoCard(repo));
  }

  function renderError(message, retry) {
    const list = $('#repo-list');
    if (!list) return;
    list.replaceChildren();
    const box = make('div', 'repo-error', message);
    if (retry) {
      const btn = make('button', '', 'Réessayer');
      btn.type = 'button';
      btn.addEventListener('click', load);
      box.append(btn);
    }
    list.append(box);
  }

  async function load() {
    const cached = readCache();
    if (cached) {
      renderProfile(cached.user || {});
      if (cached.repos) renderRepos(cached.repos);
    }
    try {
      const [user, repos] = await Promise.all([
        json(API),
        json(`${API}/repos?sort=updated&per_page=6`),
      ]);
      renderProfile(user);
      renderRepos(repos);
      writeCache({ user, repos });
    } catch (err) {
      console.warn(err);
      if (!cached) renderError('Impossible de charger les projets depuis GitHub.', true);
    }
  }

  function setupCalendar() {
    const img = $('#github-calendar');
    if (!img) return;
    img.src = `https://ghchart.rshah.org/b6ff3c/${USER}`;
    img.addEventListener('error', () => {
      const card = $('#calendar');
      img.hidden = true;
      const fallback = $('.calendar-fallback', card);
      if (fallback) fallback.hidden = false;
    }, { once: true });
  }

  function setupReveal() {
    const items = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      items.forEach((el) => el.classList.add('in'));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) { entry.target.classList.add('in'); observer.unobserve(entry.target); }
      }
    }, { threshold: 0.08, rootMargin: '0px 0px -40px' });
    items.forEach((el) => observer.observe(el));
  }

  function setupNav() {
    const links = [...document.querySelectorAll('.nav a[href^="#"]')];
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        links.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === `#${entry.target.id}`));
      }
    }, { rootMargin: '-45% 0px -50%' });
    ['about', 'projects', 'activity'].forEach((id) => {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    });
  }

  $('#year').textContent = new Date().getFullYear();
  setupReveal();
  setupNav();
  setupCalendar();
  load();
})();
