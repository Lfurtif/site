const GITHUB_USERNAME = 'lfurtif';

document.addEventListener('DOMContentLoaded', () => {
    const calendar = document.getElementById('github-calendar');
    if (calendar) calendar.src = `https://ghchart.rshah.org/${GITHUB_USERNAME}`;

    const viewport = document.getElementById('carousel-viewport');
    const track = document.getElementById('repo-list');
    if (!viewport || !track) return;

    const SPEED = 0.035;          // Auto speed
    const RAMP_MS = 1200;         // Time to go back to auto speed
    const MAX_FLICK = 0.80;       // Max momentum kept in a release

    let setWidth = 0;
    let allRepos = [];
    let cardWidth = 0;
    let cardGap = 15;
    let activeIndex = -1;
    let offset = 0;
    let dragging = false;
    let moved = false;
    let startX = 0;
    let startOffset = 0;
    let resumeStart = -Infinity;
    let releaseSpeed = 0;
    let dragSpeed = 0;
    let lastMoveX = 0;
    let lastMoveTime = 0;
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

    // Highlights the repo that is closer to the center of the card
    const SWITCH_MARGIN = 10;
    function updateActive() {
        if (!cardWidth || !track.children.length) return;
        const centre = offset + viewport.clientWidth / 2;
        const step = cardWidth + cardGap;
        const count = track.children.length;
        const index = Math.max(0, Math.min(count - 1,
            Math.floor((centre - cardWidth / 2) / step + 0.5)));
        if (index === activeIndex) return;
        if (activeIndex >= 0 && activeIndex < count) {
            const currentGap = Math.abs(activeIndex * step + cardWidth / 2 - centre);
            const nextGap = Math.abs(index * step + cardWidth / 2 - centre);
            if (currentGap - nextGap < SWITCH_MARGIN) return;
        }
        if (activeIndex >= 0) track.children[activeIndex]?.classList.remove('active');
        track.children[index].classList.add('active');
        activeIndex = index;
    }

    function fill(repos) {
        allRepos = repos;
        track.classList.toggle('few', repos.length < 3);
        const gap = parseFloat(getComputedStyle(track).gap) || 15;
        repos.forEach(repo => track.appendChild(makeCard(repo)));
        cardGap = gap;
        cardWidth = track.firstElementChild.getBoundingClientRect().width;
        setWidth = track.scrollWidth + gap;

        let guard = 0;
        while (track.scrollWidth < viewport.clientWidth + setWidth && guard < 12) {
            repos.forEach(repo => track.appendChild(makeCard(repo)));
            guard++;
        }
        normalize();
        updateActive();
    }

    function currentSpeed(time) {
        if (dragging) return 0;
        const t = time - resumeStart;
        if (t >= RAMP_MS) return SPEED;
        const p = Math.max(0, t) / RAMP_MS;
        return releaseSpeed + (SPEED - releaseSpeed) * (1 - Math.pow(1 - p, 3));
    }

    function tick(time) {
        if (!lastTime) lastTime = time;
        const dt = Math.min(64, time - lastTime);
        lastTime = time;
        if (setWidth > 0) offset += currentSpeed(time) * dt;
        normalize();
        updateActive();
        requestAnimationFrame(tick);
    }

    viewport.addEventListener('pointerdown', (event) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        dragging = true;
        moved = false;
        startX = event.clientX;
        startOffset = offset;
        dragSpeed = 0;
        lastMoveX = event.clientX;
        lastMoveTime = performance.now();
        viewport.classList.add('dragging');
        try { viewport.setPointerCapture(event.pointerId); }
        catch { /* synthetic or already-released pointer: drag still works */ }
    });

    viewport.addEventListener('pointermove', (event) => {
        if (!dragging) return;
        const now = performance.now();
        const elapsed = now - lastMoveTime;
        if (elapsed > 0) {
            // Offset moves opposite to the pointer; smooth the samples so a
            // single jittery event cannot dictate the release momentum.
            const instant = -(event.clientX - lastMoveX) / elapsed;
            dragSpeed = dragSpeed * 0.6 + instant * 0.4;
            lastMoveX = event.clientX;
            lastMoveTime = now;
        }
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
        // Holding without moving stops the carrousel
        const idle = performance.now() - lastMoveTime;
        releaseSpeed = idle > 120 ? 0 : Math.max(-MAX_FLICK, Math.min(MAX_FLICK, dragSpeed));
        resumeStart = performance.now();
    }
    viewport.addEventListener('pointerup', endDrag);
    viewport.addEventListener('pointercancel', endDrag);

    // A hold and drag doesn't open the repo
    viewport.addEventListener('click', (event) => {
        if (moved) { event.preventDefault(); event.stopPropagation(); moved = false; }
    }, true);
    viewport.addEventListener('dragstart', (event) => event.preventDefault());

    
    addEventListener('resize', () => {
        if (!setWidth || !allRepos.length) return;
        let guard = 0;
        while (track.scrollWidth < viewport.clientWidth + setWidth && guard < 12) {
            allRepos.forEach(repo => track.appendChild(makeCard(repo)));
            guard++;
        }
        cardGap = parseFloat(getComputedStyle(track).gap) || 15;
        cardWidth = track.firstElementChild.getBoundingClientRect().width;
        updateActive();
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
