const GITHUB_USERNAME = 'lfurtif';

// 1. Fixed the Calendar URL
document.getElementById('github-calendar').src = `https://ghchart.rshah.org/${GITHUB_USERNAME}`;

async function fetchGitHubRepos() {
    try {
        // 2. Switched to API endpoint and fixed template literal
        const response = await fetch(`https://api.github.com/users/${GITHUB_USERNAME}/repos?sort=updated&per_page=6`);
        if (!response.ok) {
            console.error("API error:", response.status);
            return;
        }
        const repos = await response.json();
        render3DCarousel(repos);
    } catch (error) {
        console.error("Fetch failed:", error);
    }
}

function render3DCarousel(repos) {
    const carousel = document.getElementById('carousel');
    if (!carousel || repos.length === 0) return;

    const totalItems = repos.length;
    // Use Math.PI correctly
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
                <p>${repo.description || 'No description.'}</p>
            </div>
            <a href="${repo.html_url}" target="_blank" class="repo-link">View →</a>
        `;
        carousel.appendChild(card);
    });

    setInterval(() => {
        currentIndex++;
        carousel.style.transform = `rotateY(${- (360 / totalItems) * currentIndex}deg)`;
    }, 3000);
}

fetchGitHubRepos();
