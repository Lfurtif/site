const GITHUB_USERNAME = 'lfurtif';

document.addEventListener('DOMContentLoaded', () => {
    const calendar = document.getElementById('github-calendar');
    if (calendar) calendar.src = `https://ghchart.rshah.org/${GITHUB_USERNAME}`;

    const viewport = document.getElementById('carousel-viewport');
    const track = document.getElementById('repo-list');
    if (!viewport || !track) return;

    const SPEED = 0.035;          // pixels per millisecond, ~35 px/s
    const RESUME_DELAY = 1200;    // pause after a drag before autoplay resumes

    let setWidth = 0;
    let allRepos = [];
    let offset = 0;
    let dragging = false;
    let moved = false;
    let startX = 0;
    let startOffset = 0;
    let resumeAt = 0;
    let lastTime = 0;

    function makeCard(repo) {
        const card = document.createElement('a');
        card.className = 'repo-item';
        card.href = /^https:\/\/github\.com\//i.test(repo.html_url || '') ? repo.html_url : `https://github.com/${GITHUB_USERNAME}`;
        card.target = '_blank';
        card.rel = 'noopener noreferrer';
        card.draggable = false;

        const title = document.createElement('h4');
        title.textContent = repo.name || 'Untitled';
        const desc = document.createElement('p');
        desc.textContent = repo.description || 'No description.';
        card.append(title, desc);
        return card;
    }

    function normalize() {
        if (setWidth > 0) offset = ((offset % setWidth) + setWidth) % setWidth;
        track.style.transform = `translateX(${-offset}px)`;
    }

    function fill(repos) {
        // One set defines the loop length. Clone it until the track is wider
        // than the viewport plus one set, so the wrap is never visible.
        allRepos = repos;
        const gap = parseFloat(getComputedStyle(track).gap) || 15;
        repos.forEach(repo => track.appendChild(makeCard(repo)));
        setWidth = track.scrollWidth + gap;

        let guard = 0;
        while (track.scrollWidth < viewport.clientWidth + setWidth && guard < 12) {
            repos.forEach(repo => track.appendChild(makeCard(repo)));
            guard++;
        }
        normalize();
    }

    function tick(time) {
        if (!lastTime) lastTime = time;
        const dt = Math.min(64, time - lastTime);
        lastTime = time;
        if (!dragging && time >= resumeAt && setWidth > 0) offset += SPEED * dt;
        normalize();
        requestAnimationFrame(tick);
    }

    viewport.addEventListener('pointerdown', (event) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        dragging = true;
        moved = false;
        startX = event.clientX;
        startOffset = offset;
        viewport.classList.add('dragging');
        try { viewport.setPointerCapture(event.pointerId); }
        catch { /* synthetic or already-released pointer: drag still works */ }
    });

    viewport.addEventListener('pointermove', (event) => {
        if (!dragging) return;
        const dx = event.clientX - startX;
        if (Math.abs(dx) > 4) moved = true;
        offset = startOffset - dx;
        normalize();
    });

    function endDrag(event) {
        if (!dragging) return;
        dragging = false;
        viewport.classList.remove('dragging');
        if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
        resumeAt = performance.now() + RESUME_DELAY;
    }
    viewport.addEventListener('pointerup', endDrag);
    viewport.addEventListener('pointercancel', endDrag);

    // A hold-and-drag must not open the repo link when released.
    viewport.addEventListener('click', (event) => {
        if (moved) { event.preventDefault(); event.stopPropagation(); moved = false; }
    }, true);
    viewport.addEventListener('dragstart', (event) => event.preventDefault());

    // Re-evaluate the number of copies if the viewport grows a lot (rotation).
    addEventListener('resize', () => {
        if (!setWidth || !allRepos.length) return;
        let guard = 0;
        while (track.scrollWidth < viewport.clientWidth + setWidth && guard < 12) {
            allRepos.forEach(repo => track.appendChild(makeCard(repo)));
            guard++;
        }
    }, { passive: true });

    fetch(`https://api.github.com/users/${GITHUB_USERNAME}/repos?sort=updated&per_page=6`)
        .then(res => { if (!res.ok) throw new Error(`GitHub ${res.status}`); return res.json(); })
        .then(repos => {
            if (!Array.isArray(repos) || repos.length === 0) throw new Error('No repos');
            fill(repos);
            requestAnimationFrame(tick);
        })
        .catch(err => {
            console.error(err);
            const message = document.createElement('p');
            message.className = 'repo-empty';
            message.textContent = 'Could not load projects from GitHub.';
            track.appendChild(message);
        });
});
