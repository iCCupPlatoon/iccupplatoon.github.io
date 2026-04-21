// -------------------------------------------------
//  Copyright (c) 2026 Vanish7667 and bartholomewlaw
//  All Rights Reserved
// -------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    // ---------- Элементы DOM ----------
    const palette = document.getElementById('artifact-palette');
    const buildZone = document.getElementById('build-zone');
    const statsPanel = document.getElementById('calculation-result');
    const searchInput = document.getElementById('palette-search');
    const countDisplay = document.getElementById('artifact-count-display');
    const selectBuilds = document.getElementById('saved-builds-select');
    const deleteBuildBtn = document.getElementById('delete-build');
    const loadFromUrlInput = document.getElementById('load-from-url');
    const loadUrlBtn = document.getElementById('load-url-btn');
    
    // ---------- Тултип ----------
    let tooltip = null;
    let currentTooltipArtifact = null;

    // ---------- Переменные состояния ----------
    let allArtifacts = [];
    let buildList = [];
    let currentLoadedBuildName = null;
    const STORAGE_KEY = 'grotesk_artifact_builds_dnd';

    // ---------- Системная модалка ----------
    const modalOverlay = document.getElementById('modalOverlay');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const modalActions = document.getElementById('modalActions');
    const modalClose = document.querySelector('.modal-close');

    function showModal(title, bodyHtml, buttons) {
        modalTitle.textContent = title;
        modalBody.innerHTML = bodyHtml;
        modalActions.innerHTML = '';
        buttons.forEach(btn => {
            const b = document.createElement('button');
            b.textContent = btn.label;
            if (btn.danger) b.classList.add('danger');
            b.onclick = () => { if (btn.action) btn.action(); hideModal(); };
            modalActions.appendChild(b);
        });
        modalOverlay.classList.add('active');
    }
    function hideModal() { modalOverlay.classList.remove('active'); }
    modalClose.onclick = hideModal;
    modalOverlay.onclick = (e) => { if (e.target === modalOverlay) hideModal(); };
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideModal(); });

    // ---------- Автоскролл зоны сборки ----------
    function scrollToBuildBottom() {
        requestAnimationFrame(() => { buildZone.scrollTop = buildZone.scrollHeight; });
    }

    // ---------- Показ тултипа ----------
    function createTooltip() {
        if (tooltip) return;
        tooltip = document.createElement('div');
        tooltip.className = 'artifact-tooltip';
        document.body.appendChild(tooltip);
    }

    function showTooltip(e, artifactId, tier) {
        if (!allArtifacts.length) return;
        
        const artifact = allArtifacts.find(a => a.id === artifactId);
        if (!artifact) return;
        
        const tierData = artifact.tiers.find(t => t.tier === tier) || artifact.tiers[0];
        if (!tierData) return;
        
        createTooltip();
        currentTooltipArtifact = { artifact, tier: tierData };
        
        // Формируем HTML
        let statsHtml = '';
        const skipKeys = ['Имя', 'Тир', 'images', 'name', 'level', 'tier'];
        
        Object.entries(tierData.stats).forEach(([key, value]) => {
            if (skipKeys.includes(key)) return;
            
            const numValue = parseFloat(value) || 0;
            let valueClass = 'neutral';
            if (numValue > 0) valueClass = 'positive';
            else if (numValue < 0) valueClass = 'negative';
            
            const formattedValue = numValue > 0 ? `+${numValue}` : `${numValue}`;
            
            statsHtml += `<span class="stat-name">${key}</span><span class="stat-value ${valueClass}">${formattedValue}</span>`;
        });
        
        tooltip.innerHTML = `
            <div class="tooltip-header">
                <span class="tooltip-name">${artifact.name}</span>
                <span class="tooltip-tier">T${tier}</span>
            </div>
            <div class="tooltip-stats">${statsHtml}</div>
        `;
        
        updateTooltipPosition(e);
        tooltip.classList.add('visible');
    }

    function updateTooltipPosition(e) {
        if (!tooltip) return;
        
        const rect = tooltip.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        let x = e.clientX + 15;
        let y = e.clientY + 15;
        
        if (x + rect.width > viewportWidth) x = e.clientX - rect.width - 10;
        if (y + rect.height > viewportHeight) y = e.clientY - rect.height - 10;
        if (x < 10) x = 10;
        if (y < 10) y = 10;
        
        tooltip.style.left = x + 'px';
        tooltip.style.top = y + 'px';
    }

    function hideTooltip() {
        if (tooltip) {
            tooltip.classList.remove('visible');
            setTimeout(() => {
                if (tooltip && !tooltip.matches('.visible')) {
                    tooltip.remove();
                    tooltip = null;
                }
            }, 150);
        }
        currentTooltipArtifact = null;
    }

    // ---------- Парсер обратной совместимости ----------
    function normalizeSharedBuild(rawData) {
        try {
            const data = JSON.parse(rawData);
            
            // Старый формат: { v: 1, a: [ [name, tier, copies], ... ] }
            if (data && data.a && Array.isArray(data.a)) {
                return data.a.map(item => {
                    if (Array.isArray(item) && item.length >= 3) {
                        const [rawName, rawTier, rawCopies] = item;
                        const name = String(rawName).trim();
                        const tier = parseInt(rawTier) || 1;
                        const copies = parseInt(rawCopies) || 1;
                        
                        const match = allArtifacts.find(a => a.name === name);
                        if (match) {
                            const tData = match.tiers.find(t => t.tier === tier) || match.tiers[0];
                            return {
                                id: match.id,
                                name: match.name,
                                tier: tier,
                                copies: copies,
                                img: tData ? tData.img : ''
                            };
                        }
                    }
                    return null;
                }).filter(i => i !== null && i.name);
            }
            
            // Новый формат: массив объектов
            if (Array.isArray(data)) {
                return data.map(item => {
                    const name = item.name || item['Имя'] || item.title || item.artifact || '';
                    const tier = parseInt(item.tier || item['Тир'] || item.level || item.rank || 1) || 1;
                    const copies = parseInt(item.copies || item.count || item['Копии'] || item.quantity || 1) || 1;
                    let id = item.id || item['Имя'] || name;
                    let img = item.img || item['images'] || item.icon || '';

                    if (!id || !img) {
                        const match = allArtifacts.find(a => a.name === name || a.id === id);
                        if (match) {
                            id = match.id;
                            if (!img) {
                                const tData = match.tiers.find(t => t.tier === tier) || match.tiers[0];
                                img = tData ? tData.img : '';
                            }
                        }
                    }
                    return { id, name, tier, img, copies };
                }).filter(i => i.name && i.id);
            }
            
            return [];
        } catch (e) {
            console.warn('Не удалось распарсить сборку:', e);
            return [];
        }
    }

    // ---------- Загрузка данных ----------
    fetch('data/artefact/art.json')
        .then(res => { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
        .then(data => {
            allArtifacts = data.map(art => ({
                id: art['Имя'] || art.name || 'unknown',
                name: art['Имя'] || art.name || 'Без названия',
                tiers: (art['Варианты'] || []).map((v, i) => ({
                    tier: i + 1,
                    img: (v.images || v['images'] || [])[0] || '',
                    stats: parseStats(v)
                }))
            }));
            renderPalette(allArtifacts);
            updateStats();
            updateBuildsDropdown();
            tryLoadFromUrl();
        })
        .catch(err => {
            console.error('Ошибка загрузки art.json:', err);
            palette.innerHTML = '<p class="loading">Ошибка загрузки данных</p>';
        });

    function parseStats(obj) {
        const res = {};
        const skipKeys = ['Имя', 'Тир', 'images', 'name'];
        for (const [k, v] of Object.entries(obj)) {
            if (skipKeys.includes(k)) continue;
            const num = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : Number(v);
            if (!isNaN(num) && num !== 0) res[k] = num;
        }
        return res;
    }

    // ---------- Рендер палитры (ИСПРАВЛЕНО) ----------
    function renderPalette(arts) {
        palette.innerHTML = '';
        if (arts.length === 0) {
            palette.innerHTML = '<div class="loading">Ничего не найдено</div>';
            return;
        }
        
        arts.forEach(art => {
            const row = document.createElement('div');
            row.className = 'artifact-row';
            
            const nameCell = document.createElement('div');
            nameCell.className = 'artifact-name';
            nameCell.textContent = art.name;
            row.appendChild(nameCell);
            
            art.tiers.forEach(t => {
                const cell = document.createElement('div');
                cell.className = 'tier-cell';
                cell.draggable = true;
                cell.innerHTML = '<img src="' + t.img + '" alt="T' + t.tier + '" loading="lazy"><span class="tier-label">T' + t.tier + '</span>';
                cell.dataset.artifactId = art.id;
                cell.dataset.tier = t.tier;
                
                // Тултип события
                cell.addEventListener('mouseenter', (e) => { showTooltip(e, art.id, t.tier); });
                cell.addEventListener('mousemove', (e) => {
                    if (currentTooltipArtifact && currentTooltipArtifact.artifact.id === art.id) {
                        updateTooltipPosition(e);
                    }
                });
                cell.addEventListener('mouseleave', () => { hideTooltip(); });
                
                cell.addEventListener('dragstart', e => {
                    e.dataTransfer.setData('text/plain', JSON.stringify({ id: art.id, name: art.name, tier: t.tier, img: t.img }));
                    e.dataTransfer.effectAllowed = 'copy';
                });
                row.appendChild(cell);
            });
            palette.appendChild(row);
        });
    }

    searchInput.addEventListener('input', e => {
        const q = e.target.value.toLowerCase().trim();
        const filtered = allArtifacts.filter(a => a.name.toLowerCase().includes(q));
        renderPalette(filtered);
    });

    buildZone.addEventListener('dragover', e => { e.preventDefault(); buildZone.classList.add('drag-over'); e.dataTransfer.dropEffect = 'copy'; });
    buildZone.addEventListener('dragleave', e => { if (!buildZone.contains(e.relatedTarget)) buildZone.classList.remove('drag-over'); });
    buildZone.addEventListener('drop', e => {
        e.preventDefault();
        buildZone.classList.remove('drag-over');
        try {
            const rawData = e.dataTransfer.getData('text/plain');
            if (!rawData || rawData.trim() === '') {
                console.warn('Drop: пустые данные');
                return;
            }
            const data = JSON.parse(rawData);
            if (!data.id || !data.name) throw new Error('Некорректная структура');
            addArtifactToBuild(data);
        } catch (err) {
            console.error('Drop error:', err);
        }
    });

    function addArtifactToBuild(data) {
        const existing = buildList.find(b => b.id === data.id && b.tier === data.tier);
        if (existing) existing.copies++; else buildList.push({ ...data, copies: 1 });
        renderBuild(); updateStats(); setCurrentLoadedBuild(null);
        scrollToBuildBottom();
    }

    // ---------- Рендер сборки ----------
    function renderBuild() {
        buildZone.innerHTML = '';
        countDisplay.textContent = 'Артефактов в сборке: ' + buildList.reduce((a, b) => a + b.copies, 0);
        
        if (buildList.length === 0) {
            buildZone.innerHTML = '<div class="drop-placeholder">Перетащите артефакты сюда</div>';
            return;
        }
        
        buildList.forEach((item, idx) => {
            const slot = document.createElement('div');
            slot.className = 'build-slot';
            slot.innerHTML = '<button class="remove">&times;</button><img src="' + item.img + '"><div class="name-tier">' + item.name + ' <span>T' + item.tier + '</span></div><div class="qty-controls"><button class="qty-btn dec">&minus;</button><span class="qty-val">' + item.copies + '</span><button class="qty-btn inc">&plus;</button></div><div class="tier-btns"><button class="tier-btn" data-t="1">1</button><button class="tier-btn" data-t="2">2</button><button class="tier-btn" data-t="3">3</button><button class="tier-btn" data-t="4">4</button></div>';
            
            // Тултип для картинки в сборке
            const img = slot.querySelector('img');
            img.addEventListener('mouseenter', (e) => { showTooltip(e, item.id, item.tier); });
            img.addEventListener('mousemove', (e) => {
                if (currentTooltipArtifact && currentTooltipArtifact.artifact.id === item.id) {
                    updateTooltipPosition(e);
                }
            });
            img.addEventListener('mouseleave', () => { hideTooltip(); });
            
            slot.querySelector('.remove').onclick = () => { buildList.splice(idx, 1); renderBuild(); updateStats(); setCurrentLoadedBuild(null); scrollToBuildBottom(); };
            slot.querySelector('.dec').onclick = () => { item.copies > 1 ? item.copies-- : buildList.splice(idx, 1); renderBuild(); updateStats(); setCurrentLoadedBuild(null); scrollToBuildBottom(); };
            slot.querySelector('.inc').onclick = () => { item.copies++; renderBuild(); updateStats(); setCurrentLoadedBuild(null); scrollToBuildBottom(); };
            slot.querySelectorAll('.tier-btn').forEach(btn => {
                const t = parseInt(btn.dataset.t);
                if (t === item.tier) btn.classList.add('active');
                btn.onclick = () => {
                    const artData = allArtifacts.find(a => a.id === item.id);
                    if (artData && artData.tiers[t-1]) { item.tier = t; item.img = artData.tiers[t-1].img; renderBuild(); updateStats(); setCurrentLoadedBuild(null); scrollToBuildBottom(); }
                };
            });
            buildZone.appendChild(slot);
        });
    }

    function updateStats() {
        const totals = {};
        let rawAccumulation = 0;
        let rawOutput = 0;

        // ---------- Сбор данных ----------
        buildList.forEach(item => {
            const artData = allArtifacts.find(a => a.id === item.id);
            if (!artData) return;
            const tierStats = artData.tiers[item.tier - 1]?.stats || {};

            for (const [key, value] of Object.entries(tierStats)) {
                const numVal = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : Number(value);
                if (isNaN(numVal)) continue;

                const k = key.toLowerCase();

                if (k.includes('накопление') && k.includes('радиации')) {
                    rawAccumulation += numVal * item.copies;
                } else if ((k.includes('вывод') || k.includes('защита') || k.includes('сопротивление')) && k.includes('радиации')) {
                    rawOutput += numVal * item.copies;
                } else {
                    totals[key] = (totals[key] || 0) + numVal * item.copies;
                }
            }
        });

        totals['Радиация'] = rawAccumulation - rawOutput;

        // ---------- Группировка статов ----------
        const groups = {
            '• Радиация': ['Радиация'],
            '• Защита': ['Защита от ударов', 'Защита от пуль', 'Защита от аномалий', 'Стойкость'],
            '• Еда и Вода': ['Еда', 'Вода'],
            '• Лечение': ['Лечение переломов', 'Лечение порезов', 'Кровь', 'Здоровье'],
            '• Параметры': ['Выносливость', 'Высота прыжка', 'Температура', 'Шанс на порез', 'Шанс перелома']
        };

        // Распределяем статы по группам
        const grouped = {};
        const ungrouped = {};

        for (const [key, value] of Object.entries(totals)) {
            if (Math.abs(value) < 0.01) continue; // Скрываем нули

            let placed = false;
            for (const [groupName, members] of Object.entries(groups)) {
                if (members.includes(key)) {
                    if (!grouped[groupName]) grouped[groupName] = [];
                    grouped[groupName].push({ key, value });
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                ungrouped[key] = value;
            }
        }

        // ---------- Логика цветов ----------
        const goodPositive = [
            'Вода', 'Выносливость', 'Высота прыжка', 'Еда',
            'Защита от аномалий', 'Защита от пуль', 'Защита от ударов',
            'Здоровье', 'Кровь', 'Лечение переломов', 'Лечение порезов', 'Стойкость'
        ];
        const badPositive = ['Шанс на порез', 'Шанс перелома'];

        function getColorClass(key, value) {
            if (key === 'Радиация') return value < 0 ? 'positive' : (value > 0 ? 'negative' : '');
            if (key === 'Температура') return (value >= -20 && value <= 40) ? '' : 'negative';
            if (goodPositive.includes(key)) return value > 0 ? 'positive' : (value < 0 ? 'negative' : '');
            if (badPositive.includes(key)) return value < 0 ? 'positive' : (value > 0 ? 'negative' : '');
            return value > 0 ? 'positive' : (value < 0 ? 'negative' : '');
        }

        // ---------- Рендер ----------
        statsPanel.innerHTML = '';

        // Рендерим группы в заданном порядке
        const groupOrder = ['• Радиация', '• Защита', '• Еда и Вода', '• Лечение', '• Параметры'];
        
        groupOrder.forEach(groupName => {
            if (!grouped[groupName] || grouped[groupName].length === 0) return;
            
            const groupDiv = document.createElement('div');
            groupDiv.className = 'stat-group';
            
            const header = document.createElement('div');
            header.className = 'stat-group-header';
            header.textContent = groupName;
            groupDiv.appendChild(header);
            
            grouped[groupName].sort((a, b) => a.key.localeCompare(b.key)).forEach(({ key, value }) => {
                const row = document.createElement('div');
                row.className = `stat-row ${getColorClass(key, value)}`.trim();
                row.innerHTML = `<span>${key}</span><span>${value > 0 ? '+' : ''}${parseFloat(value.toFixed(2))}</span>`;
                groupDiv.appendChild(row);
            });
            
            statsPanel.appendChild(groupDiv);
        });

        // Рендерим негруппированные статы (если есть)
        if (Object.keys(ungrouped).length > 0) {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'stat-group';
            
            const header = document.createElement('div');
            header.className = 'stat-group-header';
            header.textContent = '• Остальное';
            groupDiv.appendChild(header);
            
            Object.keys(ungrouped).sort().forEach(key => {
                const value = ungrouped[key];
                const row = document.createElement('div');
                row.className = `stat-row ${getColorClass(key, value)}`.trim();
                row.innerHTML = `<span>${key}</span><span>${value > 0 ? '+' : ''}${parseFloat(value.toFixed(2))}</span>`;
                groupDiv.appendChild(row);
            });
            
            statsPanel.appendChild(groupDiv);
        }
    }

    function getSavedBuilds() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; } }
    function saveBuilds(builds) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(builds)); updateBuildsDropdown(); } catch { showModal('Ошибка', 'Не удалось сохранить.', [{ label: 'OK' }]); } }
    
    function updateBuildsDropdown() {
        const builds = getSavedBuilds();
        selectBuilds.innerHTML = '<option value="">Загрузить сборку...</option>';
        Object.keys(builds).sort().forEach(name => {
            const opt = document.createElement('option'); opt.value = name; opt.textContent = name; selectBuilds.appendChild(opt);
        });
        if (currentLoadedBuildName && !builds[currentLoadedBuildName]) setCurrentLoadedBuild(null);
    }
    
    function setCurrentLoadedBuild(name) { currentLoadedBuildName = name; selectBuilds.value = name || ''; deleteBuildBtn.disabled = !name; }

    document.getElementById('save-build').onclick = () => {
        if (!buildList.length) return showModal('Внимание', 'Сборка пуста.', [{ label: 'OK' }]);
        showModal('Сохранить сборку', '<input type="text" id="save-build-name" placeholder="Название..." autofocus>', [
            { label: 'Отмена' }, { label: 'Сохранить', action: () => {
                const name = document.getElementById('save-build-name').value.trim();
                if (!name) return showModal('Ошибка', 'Введите название.', [{ label: 'OK' }]);
                const builds = getSavedBuilds(); builds[name] = JSON.parse(JSON.stringify(buildList));
                saveBuilds(builds); setCurrentLoadedBuild(name);
                showModal('Успех', 'Сборка сохранена.', [{ label: 'OK' }]);
            }}
        ]);
        setTimeout(() => { const inp = document.getElementById('save-build-name'); if (inp) inp.focus(); }, 50);
    };

    selectBuilds.onchange = () => {
        const name = selectBuilds.value; if (!name) return;
        const builds = getSavedBuilds();
        if (builds[name]) { buildList = JSON.parse(JSON.stringify(builds[name])); renderBuild(); updateStats(); setCurrentLoadedBuild(name); scrollToBuildBottom(); }
    };

    deleteBuildBtn.onclick = () => {
        if (!currentLoadedBuildName) return;
        showModal('Удалить сборку?', 'Удалить "' + currentLoadedBuildName + '"?', [
            { label: 'Отмена' }, { label: 'Удалить', danger: true, action: () => {
                const builds = getSavedBuilds(); delete builds[currentLoadedBuildName];
                saveBuilds(builds); setCurrentLoadedBuild(null);
                showModal('Готово', 'Сборка удалена.', [{ label: 'OK' }]);
            }}
        ]);
    };

    function loadBuildFromUrlField() {
        const url = loadFromUrlInput.value.trim(); if (!url) return;
        try {
            let b64 = url.includes('?b=') ? new URLSearchParams(url.split('?')[1]).get('b') : url;
            if (!b64) throw new Error('Нет параметра ?b=');
            let base64 = b64.replace(/-/g, '+').replace(/_/g, '/');
            while (base64.length % 4) base64 += '=';
            const rawJson = decodeURIComponent(escape(atob(base64)));
            const normalized = normalizeSharedBuild(rawJson);
            if (normalized.length > 0) {
                buildList = normalized;
                renderBuild(); updateStats(); setCurrentLoadedBuild(null);
                loadFromUrlInput.value = ''; scrollToBuildBottom();
                showModal('Успех', 'Сборка загружена (формат адаптирован).', [{ label: 'OK' }]);
            } else {
                showModal('Ошибка', 'Не удалось распознать данные сборки.', [{ label: 'OK' }]);
            }
        } catch (e) {
            console.error(e); showModal('Ошибка', 'Некорректная ссылка.', [{ label: 'OK' }]);
        }
    }
    loadUrlBtn.onclick = loadBuildFromUrlField;
    loadFromUrlInput.addEventListener('keypress', e => { if (e.key === 'Enter') loadBuildFromUrlField(); });

    function tryLoadFromUrl() {
        const b64 = new URLSearchParams(window.location.search).get('b'); if (!b64) return;
        try {
            let base64 = b64.replace(/-/g, '+').replace(/_/g, '/');
            while (base64.length % 4) base64 += '=';
            const rawJson = decodeURIComponent(escape(atob(base64)));
            const normalized = normalizeSharedBuild(rawJson);
            if (normalized.length > 0) {
                buildList = normalized; renderBuild(); updateStats(); setCurrentLoadedBuild(null);
                history.replaceState(null, '', window.location.pathname); scrollToBuildBottom();
            }
        } catch (e) { console.warn('Ошибка автозагрузки из URL:', e); }
    }

    document.getElementById('clear-build').onclick = () => {
        if (!buildList.length) return;
        showModal('Очистить?', 'Удалить все артефакты?', [
            { label: 'Отмена' }, { label: 'Очистить', danger: true, action: () => { buildList = []; renderBuild(); updateStats(); setCurrentLoadedBuild(null); } }
        ]);
    };

    document.getElementById('share-build').onclick = () => {
        if (!buildList.length) return showModal('Внимание', 'Сборка пуста.', [{ label: 'OK' }]);
        let b64 = btoa(unescape(encodeURIComponent(JSON.stringify(buildList)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        const url = window.location.origin + window.location.pathname + '?b=' + b64;
        showModal('Ссылка на сборку', '<input type="text" id="share-url" value="' + url + '" readonly>', [
            { label: 'Закрыть' }, { label: 'Копировать', action: async () => {
                try { await navigator.clipboard.writeText(url); showModal('Готово', 'Скопировано.', [{ label: 'OK' }]); }
                catch { showModal('Внимание', 'Скопируйте вручную.', [{ label: 'Понял' }]); }
            }}
        ]);
    };
});