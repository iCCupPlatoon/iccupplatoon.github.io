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

    // ---------- Глобальные переменные для фильтров ----------
    let activeFilterMode = 'category';
    let currentFilterValue = 'all';
    let availableStats = new Set();

    // ---------- Системная модалка ----------
    const modalOverlay = document.getElementById('modalOverlay');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const modalActions = document.getElementById('modalActions');
    const modalClose = document.querySelector('.modal-close');
	
	// ---------- Сжатое кодирование сборок ----------
    // Формат: [[artifactIndex, tier, copies], ...]
    const ARTIFACT_INDEX = {}; // Заполняется при загрузке art.json

    function buildToCompact(buildList) {
        return buildList.map(item => {
            const idx = ARTIFACT_INDEX[item.id] ?? ARTIFACT_INDEX[item.name];
            if (idx === undefined) return null;
            return [idx, item.tier, item.copies];
        }).filter(i => i !== null);
    }

    function compactToBuild(compact) {
        return compact.map(([idx, tier, copies]) => {
            const art = allArtifacts[idx];
            if (!art) return null;
            return {
                id: art.id,
                name: art.name,
                tier: tier,
                copies: copies,
                img: art.tiers[tier - 1]?.img || art.tiers[0]?.img || ''
            };
        }).filter(i => i !== null);
    }

    function encodeBuild(buildList) {
        const compact = buildToCompact(buildList);
        const json = JSON.stringify(compact);
        
        // Сжатие gzip через pako
        if (typeof pako !== 'undefined') {
            const compressed = pako.deflate(json, { level: 9 });
            let binary = '';
            for (let i = 0; i < compressed.length; i++) {
                binary += String.fromCharCode(compressed[i]);
            }
            return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        }
        // Фоллбэк без сжатия
        return btoa(unescape(encodeURIComponent(json)))
            .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

    function decodeBuild(b64) {
        try {
            let base64 = b64.replace(/-/g, '+').replace(/_/g, '/');
            while (base64.length % 4) base64 += '=';
            
            let json;
            // Пробуем распаковать как gzip
            if (typeof pako !== 'undefined') {
                try {
                    const binary = atob(base64);
                    const compressed = new Uint8Array(binary.length);
                    for (let i = 0; i < binary.length; i++) {
                        compressed[i] = binary.charCodeAt(i);
                    }
                    json = pako.inflate(compressed, { to: 'string' });
                } catch {
                    // Если не gzip — декодируем как обычный JSON
                    json = decodeURIComponent(escape(atob(base64)));
                }
            } else {
                json = decodeURIComponent(escape(atob(base64)));
            }
            
            const compact = JSON.parse(json);
            return Array.isArray(compact) ? compactToBuild(compact) : [];
        } catch (e) {
            console.warn('Decode error:', e);
            return [];
        }
    }

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
    if (modalClose) modalClose.onclick = hideModal;
    if (modalOverlay) modalOverlay.onclick = (e) => { if (e.target === modalOverlay) hideModal(); };
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideModal(); });

    // ---------- Автоскролл зоны сборки ----------
    function scrollToBuildBottom() {
        requestAnimationFrame(() => { if (buildZone) buildZone.scrollTop = buildZone.scrollHeight; });
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

        let statsHtml = '';
        const skipKeys = ['Имя', 'Тир', 'images', 'name', 'level', 'tier'];

        function getTooltipColor(key, val) {
            const k = key.toLowerCase();
            if (k.includes('накопление радиации') || k.includes('шанс') || k.includes('заражение')) return 'negative';
            if (k.includes('защита') || k.includes('лечение') || k.includes('вывод радиации') ||
                k.includes('выносливость') || k.includes('стойкость') || k.includes('здоровье') ||
                k.includes('кровь') || k.includes('вода') || k.includes('еда') || k.includes('высота прыжка')) {
                return val > 0 ? 'positive' : (val < 0 ? 'negative' : '');
            }
            if (k === 'температура') return (val >= -20 && val <= 40) ? '' : 'negative';
            return val > 0 ? 'positive' : (val < 0 ? 'negative' : '');
        }

        Object.entries(tierData.stats).forEach(([key, value]) => {
            if (skipKeys.includes(key)) return;
            const numValue = parseFloat(value) || 0;
            const formattedValue = numValue > 0 ? `+${numValue}` : `${numValue}`;
            const colorClass = getTooltipColor(key, numValue);
            statsHtml += `<span class="stat-name">${key}</span><span class="stat-value ${colorClass}">${formattedValue}</span>`;
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
                            return { id: match.id, name: match.name, tier, copies, img: tData ? tData.img : '' };
                        }
                    }
                    return null;
                }).filter(i => i !== null && i.name);
            }
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
            
			// Заполняем индекс артефактов для компактного кодирования
            allArtifacts.forEach((art, idx) => {
                ARTIFACT_INDEX[art.id] = idx;
                ARTIFACT_INDEX[art.name] = idx;
            });
			
            extractStats();
            renderFilters();
            renderPalette(allArtifacts);
            updateStats();
            updateBuildsDropdown();
            tryLoadFromUrl();
        })
        .catch(err => {
            console.error('Ошибка загрузки art.json:', err);
            if (palette) palette.innerHTML = '<p class="loading">Ошибка загрузки данных</p>';
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

    function extractStats() {
        availableStats.clear();
        allArtifacts.forEach(art => {
            art.tiers.forEach(t => {
                if (t.stats) Object.keys(t.stats).forEach(k => availableStats.add(k));
            });
        });
    }

    // ---------- Рендер палитры ----------
    function renderPalette(arts) {
        if (!palette) return;
        palette.innerHTML = '';
        if (!arts || arts.length === 0) {
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

                // --- Логика подсветки фильтров ---
                let isMatch = false, isGood = false, isBad = false;

                if (currentFilterValue !== 'all' && t.stats) {
                    Object.entries(t.stats).forEach(([key, val]) => {
                        const k = key.toLowerCase();
                        const v = parseFloat(val) || 0;
                        let relevant = false;

                        if (activeFilterMode === 'category') {
                            if (currentFilterValue === 'radiation' && k.includes('радиации')) relevant = true;
                            if (currentFilterValue === 'protection' && (k.includes('защита') || k === 'стойкость')) relevant = true;
                            if (currentFilterValue === 'food' && (k === 'еда' || k === 'вода')) relevant = true;
                            if (currentFilterValue === 'healing' && (k.includes('лечение') || k.includes('здоровье') || k.includes('кровь'))) relevant = true;
                            if (currentFilterValue === 'healing' && k.includes('шанс')) relevant = true;
                            if (currentFilterValue === 'stats' && (k.includes('выносливость') || k.includes('прыжка') || k === 'температура')) relevant = true;
                        }

                        if (activeFilterMode === 'detailed' && k === currentFilterValue.toLowerCase()) relevant = true;

                        if (relevant) {
                            isMatch = true;
                            if (k.includes('шанс') || k.includes('накопление')) {
                                if (v > 0) isBad = true; else isGood = true;
                            } else if (k === 'температура') {
                                if (v < -20 || v > 40) isBad = true; else isGood = true;
                            } else {
                                if (k.includes('накопление') && k.includes('радиации')) {
                                    if (v > 0) isBad = true; else isGood = true;
                                } else if (k.includes('вывод') || k.includes('защита') || k === 'стойкость') {
                                    if (v > 0) isGood = true; else isBad = true; // Стойкость: минус = плохо
                                } else {
                                    if (v > 0) isGood = true; else isBad = true;
                                }
                            }
                        }
                    });
                }

                // Применение классов подсветки
                cell.classList.remove('highlight-good', 'highlight-bad', 'highlight-mixed');
                if (isMatch) {
                    if (isGood && isBad) cell.classList.add('highlight-mixed');
                    else if (isBad) cell.classList.add('highlight-bad');
                    else if (isGood) cell.classList.add('highlight-good');
                }

                // Двойной клик
                cell.addEventListener('dblclick', () => {
                    addArtifactToBuild({ id: art.id, name: art.name, tier: t.tier, img: t.img });
                    cell.style.transform = 'scale(0.9)';
                    setTimeout(() => cell.style.transform = '', 100);
                });

                // Тултип
                cell.addEventListener('mouseenter', (e) => { showTooltip(e, art.id, t.tier); });
                cell.addEventListener('mousemove', (e) => {
                    if (currentTooltipArtifact && currentTooltipArtifact.artifact.id === art.id) updateTooltipPosition(e);
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

    // ---------- Управление фильтрами ----------
    const filterContainer = document.getElementById('filters');
    const modeCategoryBtn = document.getElementById('mode-category');
    const modeDetailedBtn = document.getElementById('mode-detailed');

    const categories = [
        { id: 'all', label: 'Все' },
        { id: 'radiation', label: 'Радиация' },
        { id: 'protection', label: 'Защита' },
        { id: 'food', label: 'Пища' },
        { id: 'healing', label: 'Лечение' },
        { id: 'stats', label: 'Параметры' }
    ];

    function renderFilters() {
        if (!filterContainer) return;
        filterContainer.innerHTML = '';

        const categoryEmojis = { 'all': '🔄', 'radiation': '☢️', 'protection': '🛡️', 'food': '🍽️', 'healing': '❤️', 'stats': '⚡' };
        const statEmojis = {
            'вода': '💧', 'вывод радиации': '🔻☢️', 'выносливость': '💪', 'высота прыжка': '🦘', 'еда': '🍖',
            'защита от аномалий': '🛡🌀', 'защита от пуль': '🛡🔫', 'защита от ударов': '🛡👊',
            'здоровье': '💊❤️', 'кровь': '💊🩸', 'лечение переломов': '💊🦴', 'лечение порезов': '💊🩹',
            'накопление радиации': '🔺☢️', 'стойкость': '🧱', 'температура': '🌡️',
            'шанс на порез': '⚠️🩹', 'шанс перелома': '⚠️🦴'
        };

        const resetBtn = document.createElement('button');
        resetBtn.className = 'filter-btn ' + (currentFilterValue === 'all' ? 'active' : '');
        resetBtn.textContent = categoryEmojis['all'];
        resetBtn.title = 'Все';
        resetBtn.onclick = () => { currentFilterValue = 'all'; renderFilters(); renderPalette(allArtifacts); };
        filterContainer.appendChild(resetBtn);

        if (activeFilterMode === 'category') {
            categories.forEach(cat => {
                if (cat.id === 'all') return;
                const btn = document.createElement('button');
                btn.className = 'filter-btn ' + (currentFilterValue === cat.id ? 'active' : '');
                btn.textContent = categoryEmojis[cat.id] || '❓';
                btn.title = cat.label;
                btn.onclick = () => { currentFilterValue = cat.id; renderFilters(); renderPalette(allArtifacts); };
                filterContainer.appendChild(btn);
            });
        } else {
            Array.from(availableStats).sort().forEach(stat => {
                const btn = document.createElement('button');
                const statLower = stat.toLowerCase();
                btn.className = 'filter-btn ' + (currentFilterValue === stat ? 'active' : '');
                btn.textContent = statEmojis[statLower] || '📦';
                btn.title = stat;
                btn.onclick = () => { currentFilterValue = stat; renderFilters(); renderPalette(allArtifacts); };
                filterContainer.appendChild(btn);
            });
        }
    }

    if (modeCategoryBtn) modeCategoryBtn.onclick = () => {
        activeFilterMode = 'category'; currentFilterValue = 'all';
        modeCategoryBtn.classList.add('active');
        if (modeDetailedBtn) modeDetailedBtn.classList.remove('active');
        renderFilters(); renderPalette(allArtifacts);
    };

    if (modeDetailedBtn) modeDetailedBtn.onclick = () => {
        activeFilterMode = 'detailed'; currentFilterValue = 'all';
        modeDetailedBtn.classList.add('active');
        if (modeCategoryBtn) modeCategoryBtn.classList.remove('active');
        renderFilters(); renderPalette(allArtifacts);
    };

    if (searchInput) searchInput.addEventListener('input', e => {
        const q = e.target.value.toLowerCase().trim();
        const filtered = allArtifacts.filter(a => a.name.toLowerCase().includes(q));
        renderPalette(filtered);
    });

    if (buildZone) {
        buildZone.addEventListener('dragover', e => { e.preventDefault(); buildZone.classList.add('drag-over'); e.dataTransfer.dropEffect = 'copy'; });
        buildZone.addEventListener('dragleave', e => { if (!buildZone.contains(e.relatedTarget)) buildZone.classList.remove('drag-over'); });
        buildZone.addEventListener('drop', e => {
            e.preventDefault(); buildZone.classList.remove('drag-over');
            try {
                const rawData = e.dataTransfer.getData('text/plain');
                if (!rawData || rawData.trim() === '') { console.warn('Drop: пустые данные'); return; }
                const data = JSON.parse(rawData);
                if (!data.id || !data.name) throw new Error('Некорректная структура');
                addArtifactToBuild(data);
            } catch (err) { console.error('Drop error:', err); }
        });
    }

    function addArtifactToBuild(data) {
        const existing = buildList.find(b => b.id === data.id && b.tier === data.tier);
        if (existing) existing.copies++; else buildList.push({ ...data, copies: 1 });
        renderBuild(); updateStats(); setCurrentLoadedBuild(null); scrollToBuildBottom();
    }

    function renderBuild() {
        if (!buildZone) return;
        buildZone.innerHTML = '';
        if (countDisplay) countDisplay.textContent = 'Артефактов в сборке: ' + buildList.reduce((a, b) => a + b.copies, 0);
        
        if (buildList.length === 0) {
            buildZone.innerHTML = '<div class="drop-placeholder">Перетащите артефакты сюда</div>';
            return;
        }
        
        buildList.forEach((item, idx) => {
            const slot = document.createElement('div');
            slot.className = 'build-slot';
            slot.innerHTML = '<button class="remove">&times;</button><img src="' + item.img + '"><div class="name-tier">' + item.name + ' <span>T' + item.tier + '</span></div><div class="qty-controls"><button class="qty-btn dec">&minus;</button><span class="qty-val">' + item.copies + '</span><button class="qty-btn inc">&plus;</button></div><div class="tier-btns"><button class="tier-btn" data-t="1">1</button><button class="tier-btn" data-t="2">2</button><button class="tier-btn" data-t="3">3</button><button class="tier-btn" data-t="4">4</button></div>';

            const img = slot.querySelector('img');
            if (img) {
                img.addEventListener('mouseenter', (e) => { showTooltip(e, item.id, item.tier); });
                img.addEventListener('mousemove', (e) => { if (currentTooltipArtifact && currentTooltipArtifact.artifact.id === item.id) updateTooltipPosition(e); });
                img.addEventListener('mouseleave', () => { hideTooltip(); });
            }

            const removeBtn = slot.querySelector('.remove');
            if (removeBtn) removeBtn.onclick = () => { buildList.splice(idx, 1); renderBuild(); updateStats(); setCurrentLoadedBuild(null); scrollToBuildBottom(); };
            
            const decBtn = slot.querySelector('.dec');
            if (decBtn) decBtn.onclick = () => { item.copies > 1 ? item.copies-- : buildList.splice(idx, 1); renderBuild(); updateStats(); setCurrentLoadedBuild(null); scrollToBuildBottom(); };
            
            const incBtn = slot.querySelector('.inc');
            if (incBtn) incBtn.onclick = () => { item.copies++; renderBuild(); updateStats(); setCurrentLoadedBuild(null); scrollToBuildBottom(); };
            
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
        if (!statsPanel) return;
        let radGood = 0, radBad = 0, cutGood = 0, cutBad = 0, fracGood = 0, fracBad = 0;
        const totals = {};

        function isBadKey(k) { return k.includes('шанс') || k.includes('накопление') || k.includes('заражение'); }

        buildList.forEach(item => {
            const artData = allArtifacts.find(a => a.id === item.id);
            if (!artData) return;
            const tierStats = artData.tiers[item.tier - 1]?.stats || {};
            for (const [key, value] of Object.entries(tierStats)) {
                const num = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : Number(value);
                if (isNaN(num)) continue;
                const k = key.toLowerCase();
                if (k.includes('радиации')) { if (isBadKey(k)) radBad += num * item.copies; else radGood += num * item.copies; }
                else if (k.includes('порез')) { if (isBadKey(k)) cutBad += num * item.copies; else cutGood += num * item.copies; }
                else if (k.includes('перелом')) { if (isBadKey(k)) fracBad += num * item.copies; else fracGood += num * item.copies; }
                else totals[key] = (totals[key] || 0) + num * item.copies;
            }
        });

        const radNet = radGood - radBad;
        if (radNet > 0) totals['Вывод радиации'] = radNet;
        else if (radNet < 0) totals['Накопление радиации'] = Math.abs(radNet);

        const cutNet = cutGood - cutBad;
        if (cutNet > 0) totals['Лечение порезов'] = cutNet;
        else if (cutNet < 0) totals['Шанс пореза'] = Math.abs(cutNet);

        const fracNet = fracGood - fracBad;
        if (fracNet > 0) totals['Лечение переломов'] = fracNet;
        else if (fracNet < 0) totals['Шанс перелома'] = Math.abs(fracNet);

        const groups = {
            'Радиация': ['Вывод радиации', 'Накопление радиации'],
            'Защита': ['Защита от ударов', 'Защита от пуль', 'Защита от аномалий', 'Стойкость'],
            'Еда и Вода': ['Еда', 'Вода'],
            'Лечение и Травмы': ['Лечение порезов', 'Шанс пореза', 'Лечение переломов', 'Шанс перелома', 'Кровь', 'Здоровье'],
            'Параметры': ['Выносливость', 'Высота прыжка', 'Температура']
        };

        const grouped = {}, ungrouped = {};
        for (const [key, value] of Object.entries(totals)) {
            if (Math.abs(value) < 0.01) continue;
            let placed = false;
            for (const [groupName, members] of Object.entries(groups)) {
                if (members.includes(key)) {
                    if (!grouped[groupName]) grouped[groupName] = [];
                    grouped[groupName].push({ key, value });
                    placed = true; break;
                }
            }
            if (!placed) ungrouped[key] = value;
        }

        function getColorClass(key, value) {
            const k = key.toLowerCase();
            if (k.includes('накопление радиации') || k.includes('шанс')) return 'negative';
            if (k.includes('вывод радиации') || k.includes('лечение')) return 'positive';
            if (k === 'температура') return (value >= -20 && value <= 40) ? '' : 'negative';
            const goodPos = ['Вода', 'Выносливость', 'Высота прыжка', 'Еда', 'Защита от аномалий', 'Защита от пуль', 'Защита от ударов', 'Здоровье', 'Кровь', 'Стойкость'];
            if (goodPos.includes(key)) return value > 0 ? 'positive' : (value < 0 ? 'negative' : '');
            return value > 0 ? 'positive' : (value < 0 ? 'negative' : '');
        }

        statsPanel.innerHTML = '';
        ['Радиация', 'Защита', 'Еда и Вода', 'Лечение и Травмы', 'Параметры'].forEach(name => {
            if (!grouped[name] || !grouped[name].length) return;
            const groupDiv = document.createElement('div');
            groupDiv.className = 'stat-group';
            grouped[name].sort((a, b) => a.key.localeCompare(b.key)).forEach(({ key, value }) => {
                const row = document.createElement('div');
                row.className = ('stat-row ' + getColorClass(key, value)).trim();
                row.innerHTML = `<span>${key}</span><span>${value > 0 ? '+' : ''}${parseFloat(value.toFixed(2))}</span>`;
                groupDiv.appendChild(row);
            });
            statsPanel.appendChild(groupDiv);
        });

        if (Object.keys(ungrouped).length > 0) {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'stat-group';
            Object.keys(ungrouped).sort().forEach(key => {
                const value = ungrouped[key];
                const row = document.createElement('div');
                row.className = ('stat-row ' + getColorClass(key, value)).trim();
                row.innerHTML = `<span>${key}</span><span>${value > 0 ? '+' : ''}${parseFloat(value.toFixed(2))}</span>`;
                groupDiv.appendChild(row);
            });
            statsPanel.appendChild(groupDiv);
        }
    }

    function getSavedBuilds() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; } }
    function saveBuilds(builds) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(builds)); updateBuildsDropdown(); } catch { showModal('Ошибка', 'Не удалось сохранить.', [{ label: 'OK' }]); } }

    function updateBuildsDropdown() {
        if (!selectBuilds) return;
        const builds = getSavedBuilds();
        selectBuilds.innerHTML = '<option value="">Загрузить сборку...</option>';
        Object.keys(builds).sort().forEach(name => {
            const opt = document.createElement('option'); opt.value = name; opt.textContent = name; selectBuilds.appendChild(opt);
        });
        if (currentLoadedBuildName && !builds[currentLoadedBuildName]) setCurrentLoadedBuild(null);
    }

    function setCurrentLoadedBuild(name) { currentLoadedBuildName = name; if (selectBuilds) selectBuilds.value = name || ''; if (deleteBuildBtn) deleteBuildBtn.disabled = !name; }

    const saveBtn = document.getElementById('save-build');
    if (saveBtn) saveBtn.onclick = () => {
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

    if (selectBuilds) selectBuilds.onchange = () => {
        const name = selectBuilds.value; if (!name) return;
        const builds = getSavedBuilds();
        if (builds[name]) { buildList = JSON.parse(JSON.stringify(builds[name])); renderBuild(); updateStats(); setCurrentLoadedBuild(name); scrollToBuildBottom(); }
    };

    if (deleteBuildBtn) deleteBuildBtn.onclick = () => {
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
        const url = loadFromUrlInput ? loadFromUrlInput.value.trim() : '';
        if (!url) return;
        try {
            let b64 = url.includes('?b=') ? new URLSearchParams(url.split('?')[1]).get('b') : url;
            if (!b64) throw new Error('Нет параметра ?b=');
            let base64 = b64.replace(/-/g, '+').replace(/_/g, '/');
            while (base64.length % 4) base64 += '=';
            let normalized = decodeBuild(b64);

            // Если не распарсилось — пробуем старый формат для обратной совместимости
            if (normalized.length === 0 && buildList.length === 0) {
                try {
                    let base64 = b64.replace(/-/g, '+').replace(/_/g, '/');
                    while (base64.length % 4) base64 += '=';
                    const rawJson = decodeURIComponent(escape(atob(base64)));
                    normalized = normalizeSharedBuild(rawJson);
                } catch (e) {
                    console.warn('Fallback decode error:', e);
                }
            }
			
            if (normalized.length > 0) {
                buildList = normalized; renderBuild(); updateStats(); setCurrentLoadedBuild(null);
                if (loadFromUrlInput) loadFromUrlInput.value = ''; scrollToBuildBottom();
                showModal('Успех', 'Сборка загружена (формат адаптирован).', [{ label: 'OK' }]);
            } else { showModal('Ошибка', 'Не удалось распознать данные сборки.', [{ label: 'OK' }]); }
        } catch (e) { console.error(e); showModal('Ошибка', 'Некорректная ссылка.', [{ label: 'OK' }]); }
    }
    if (loadUrlBtn) loadUrlBtn.onclick = loadBuildFromUrlField;
    if (loadFromUrlInput) loadFromUrlInput.addEventListener('keypress', e => { if (e.key === 'Enter') loadBuildFromUrlField(); });

    function tryLoadFromUrl() {
        const b64 = new URLSearchParams(window.location.search).get('b');
        if (!b64) return;
        
        try {
            // Пробуем новый формат (сжатый)
            let normalized = decodeBuild(b64);
            
            // Если не распарсилось — пробуем старый формат для обратной совместимости
            if (normalized.length === 0) {
                try {
                    let base64 = b64.replace(/-/g, '+').replace(/_/g, '/');
                    while (base64.length % 4) base64 += '=';
                    const rawJson = decodeURIComponent(escape(atob(base64)));
                    normalized = normalizeSharedBuild(rawJson);
                } catch (e) {
                    console.warn('Fallback decode error:', e);
                }
            }
            
            if (normalized.length > 0) {
                buildList = normalized;
                renderBuild();
                updateStats();
                setCurrentLoadedBuild(null);
                history.replaceState(null, '', window.location.pathname);
                scrollToBuildBottom();
            }
        } catch (e) {
            console.warn('Ошибка автозагрузки из URL:', e);
        }
    }

    const clearBtn = document.getElementById('clear-build');
    if (clearBtn) clearBtn.onclick = () => {
        if (!buildList.length) return;
        showModal('Очистить?', 'Удалить все артефакты?', [
            { label: 'Отмена' }, { label: 'Очистить', danger: true, action: () => { buildList = []; renderBuild(); updateStats(); setCurrentLoadedBuild(null); } }
        ]);
    };

    const shareBtn = document.getElementById('share-build');
    if (shareBtn) shareBtn.onclick = () => {
        if (!buildList.length) return showModal('Внимание', 'Сборка пуста.', [{ label: 'OK' }]);
        let b64 = encodeBuild(buildList);
        const url = window.location.origin + window.location.pathname + '?b=' + b64;
        showModal('Ссылка на сборку', '<input type="text" id="share-url" value="' + url + '" readonly>', [
            { label: 'Закрыть' }, { label: 'Копировать', action: async () => {
                try { await navigator.clipboard.writeText(url); showModal('Готово', 'Скопировано.', [{ label: 'OK' }]); }
                catch { showModal('Внимание', 'Скопируйте вручную.', [{ label: 'Понял' }]); }
            }}
        ]);
    };
});