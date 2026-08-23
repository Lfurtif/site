const GITHUB_USERNAME = 'lfurtif';
document.getElementById('github-calendar').src = `https://rshah.org{GITHUB_USERNAME}`;


async function fetchGitHubRepos() {
    try {

        const response = await fetch(`https://github.com{GITHUB_USERNAME}/repos?sort=updated&per_page=6`);
        if (!response.ok) {
            console.error("Erreur API GitHub Status:", response.status);
            return;
        }
        const repos = await response.json();
        render3DCarousel(repos);
    } catch (error) {
        console.error("Impossible de joindre l'API GitHub :", error);
    }
}



function render3DCarousel(repos) {
    const carousel = document.getElementById('carousel');
    if (!carousel || repos.length === 0) return;

    const totalItems = repos.length;
    const radius = Math.round(150 / Math.tan(Math.PI / totalItems)); 
    let currentIndex = 0;

    repos.forEach((repo, index) => {
        const angle = (360 / totalItems) * index;
        const card = document.createElement('div');
        card.className = 'repo-card-3d';
        card.style.transform = `rotateY(${angle}deg) translateZ(${radius}px)`;
        
        card.innerHTML = `
            <div>
                <h4>${repo.name}</h4>
                <p>${repo.description || 'Aucune description.'}</p>
            </div>
            <a href="${repo.html_url}" target="_blank" class="repo-link">Voir →</a>
        `;
        carousel.appendChild(card);
    });

    setInterval(() => {
        currentIndex++;
        carousel.style.transform = `rotateY(${- (360 / totalItems) * currentIndex}deg)`;
    }, 3000);
}

fetchGitHubRepos();

