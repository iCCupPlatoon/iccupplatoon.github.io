const grid = document.querySelector('.caliber-grid');
const searchInput = document.getElementById('caliberSearch');

fetch("data/calibers.json")
    .then(res => res.json())
    .then(data => {
        // Сохраняем данные для фильтра
        window.caliberData = data;
        renderCards(data);
    })
    .catch(err => console.error('Ошибка загрузки калибров:', err));

function renderCards(data) {
    grid.innerHTML = '';
    data.forEach(item => {
        const card = document.createElement('div');
        card.classList.add('caliber-card');
        if(item.rank) card.dataset.rank = item.rank; // для цвета свечения
        card.innerHTML = `
            <div class="caliber-name"><span class="label">Калибр:</span>${item.name}</div>
            <div class="caliber-damage"><span class="label">Урон:</span>${item.damage}</div>
        `;
        grid.appendChild(card);
    });
}

// Фильтр поиска
searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase();
    const filtered = window.caliberData.filter(c => c.name.toLowerCase().includes(query));
    renderCards(filtered);
});