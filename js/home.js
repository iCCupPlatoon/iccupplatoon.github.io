/*
  Copyright (c) 2025 Vanish7667 and bartholomewlaw
  All Rights Reserved
*/

const content = document.getElementById('content');

document.addEventListener('DOMContentLoaded', () => {
    // Восстанавливаем сохранённый контент, если есть
    const savedContent = localStorage.getItem('wikiContent');
    if (savedContent && content) {
        content.innerHTML = savedContent;
    }
});