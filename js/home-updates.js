/*
  Copyright (c) 2025 Vanish7667 and bartholomewlaw
  All Rights Reserved
*/

document.addEventListener('DOMContentLoaded', () => {
    const content = document.getElementById('content');

    // Восстановление сохранённого контента
    const savedContent = localStorage.getItem('wikiContent');
    if (savedContent && content) content.innerHTML = savedContent;

    // Загрузка основной новости
    fetch('data/home/main.json')
        .then(res => res.json())
        .then(data => {
            const mainNews = document.getElementById('mainNews');
            if (mainNews && data && data.text && data.date) {
                mainNews.innerHTML = `<strong>${data.date}:</strong> ${data.text}`;
            }
        })
        .catch(err => console.error("Ошибка загрузки main.json:", err));

    // Загрузка обновлений
    fetch('data/home/updates.json')
        .then(res => res.json())
        .then(data => {
            const updatesList = document.getElementById('updatesList');
            if (updatesList && Array.isArray(data)) {
                data.forEach(update => {
                    const li = document.createElement('li');
                    li.innerHTML = `<strong>${update.date}:</strong> ${update.text}`;
                    updatesList.appendChild(li);
                });
            }
        })
        .catch(err => console.error("Ошибка загрузки updates.json:", err));
});