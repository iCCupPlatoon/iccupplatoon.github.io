/*
  Copyright (c) 2025 Vanish7667 and bartholomewlaw
  All Rights Reserved
*/

document.addEventListener('DOMContentLoaded', () => {

    const loadComponent = (selector, url, callback) => {
        const el = document.querySelector(selector);
        if (!el) return;

        fetch(url)
            .then(res => {
                if (!res.ok) throw new Error(res.status);
                return res.text();
            })
            .then(html => {
                el.innerHTML = html;
                if (callback) callback();
            })
            .catch(err => console.error(`Ошибка загрузки ${url}:`, err));
    };

    // ВАЖНО: относительные пути от КОРНЯ ПРОЕКТА
    loadComponent('#nav', 'components/nav.html', highlightActiveTab);
    loadComponent('#footer', 'components/footer.html');
    loadComponent('#garland', 'components/garland.html');

    function highlightActiveTab() {
        const current = location.pathname.split('/').pop() || 'index.html';

        document.querySelectorAll('#nav a[href]').forEach(link => {
            if (link.getAttribute('href') === current) {
                link.classList.add('active');

                const parent = link.closest('.dropdown');
                if (parent) {
                    parent.querySelector('a').classList.add('active');
                }
            }
        });
    }
});