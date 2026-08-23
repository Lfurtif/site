const GITHUB_USERNAME = 'lfurtif';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Calendrier
    document.getElementById('github-calendar').src = `https://ghchart.rshah.org/${GITHUB_USERNAME}`;

    // 2. Fetch Repos
    fetch(`https://api.github.com/users/${GITHUB_USERNAME}/repos?sort=updated&per_page=6`)
        .then(res => res.json())
        .then(repos => render3DCarousel(repos))
        .catch(err => console.error("Erreur API GitHub:", err));
});

function render3DCarousel(repos) {
    const carousel = document.getElementById('carousel');
    if (!carousel || repos.length === 0) return;

    const totalItems = repos.length;
    const radius = Math.round(150 / Math.tan(Math.PI / totalItems)); 
    
    repos.forEach((repo, index) => {
        const angle = (360 / totalItems) * index;
        const card = document.createElement('div');
        card.className = 'repo-card-3d';
        card.style.transform = `rotateY(${angle}deg) translateZ(${radius}px)`;
        card.innerHTML = `<h4>${repo.name}</h4><p>${repo.description || '...'}</p><a href="${repo.html_url}" class="repo-link" target="_blank">Voir →</a>`;
        carousel.appendChild(card);
    });

    let i = 0;
    setInterval(() => {
        i++;
        carousel.style.transform = `rotateY(${- (360 / totalItems) * i}deg)`;
    }, 3000);
}
