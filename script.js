const GITHUB_USERNAME = 'lfurtif';

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('github-calendar').src = `https://ghchart.rshah.org/${GITHUB_USERNAME}`;
    
    fetch(`https://api.github.com/users/${GITHUB_USERNAME}/repos?sort=updated&per_page=6`)
        .then(res => res.json())
        .then(repos => {
            const container = document.getElementById('repo-list');
            container.innerHTML = repos.map(repo => `
                <a href="${repo.html_url}" target="_blank" class="repo-item">
                    <h4>${repo.name}</h4>
                    <p>${repo.description ? repo.description.substring(0, 60) + '...' : 'Pas de description.'}</p>
                </a>
            `).join('');
        })
        .catch(err => console.error(err));
});
