/*
  Copyright (c) 2025 Vanish7667 and bartholomewlaw
  All Rights Reserved
*/

// Подсветка активной вкладки
document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('nav ul li a');
    tabs.forEach(tab => {
        if (tab.href === window.location.href) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
});
