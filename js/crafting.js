/*
  Copyright (c) 2025 Vanish7667 and bartholomewlaw
  All Rights Reserved
*/

document.addEventListener("DOMContentLoaded", function () {

    let allRecipes = [];
    let displayedRecipes = [];

    const categories = [
        "Auto_chargers",
        "Laser_sights",
        "Ammunition",
        "Miscellaneous",
        "Containers",
        "Belts",
        "Detectors",
        "NVG",
        "Weapons_and_magazines",
        "Exoskeletons",
        "Damage_Boost_Modules"
    ];

    // =========================
    // Загрузка всех категорий
    // =========================
    async function loadAllData() {
        allRecipes = [];

        for (let category of categories) {
            try {
                const res = await fetch(`data/crafting/${category}.json`);
                const data = await res.json();

                data.forEach(item => {
                    item.category = category;
                });

                allRecipes.push(...data);

            } catch (e) {
                console.error(`Ошибка загрузки категории ${category}:`, e);
            }
        }

        displayedRecipes = allRecipes;
        displayRecipes(displayedRecipes);
    }

    // =========================
    // Отрисовка карточек
    // =========================
    function displayRecipes(recipes) {
        const container = document.getElementById('crafting-recipes');

        if (!container) {
            console.error("Контейнер #crafting-recipes не найден");
            return;
        }

        container.innerHTML = '';

        if (recipes.length === 0) {
            container.innerHTML = "<p>Ничего не найдено.</p>";
            return;
        }

        recipes.forEach(recipe => {
            const div = document.createElement('div');
            div.classList.add('recipe');

            div.innerHTML = `
                <img src="images/crafting/${recipe.image || "noimage.png"}" alt="${recipe.item_name}">
                <h3>${recipe.item_name}</h3>
            `;

            div.addEventListener("click", () => openModal(recipe));

            container.appendChild(div);
        });
    }

    // =========================
    // Форматирование имени ресурса
    // =========================
    function formatName(name) {
        return name
            .replaceAll("_", " ")
            .replace("NewCJ Materials", "")
            .trim();
    }

    // =========================
    // Получение количества
    // =========================
    function getAmount(item) {
        if (item.quantity && item.quantity > 0) return item.quantity;
        if (item.count && item.count > 0) return item.count;
        return 0;
    }

    // =========================
    // МОДАЛКА
    // =========================
    function openModal(recipe) {
        const overlay = document.getElementById("modalOverlay");
        const content = document.getElementById("modalContent");

        if (!overlay || !content) {
            console.error("Модалка не найдена");
            return;
        }

        const assemble = recipe.assemble || [];

        // КРАФТ
        const assembleHTML = assemble.map(item => {
            const amount = getAmount(item);
            return `<li>${formatName(item.class_name)}: ${amount}</li>`;
        }).join('');

        // РАЗБОРКА (50%)
        const disassembleHTML = assemble.map(item => {
            const amount = getAmount(item);
            const half = Math.floor(amount * 0.5);
            return `<li>${formatName(item.class_name)}: ${half}</li>`;
        }).join('');

        // --- СТРУКТУРА МОДАЛКИ ---
        content.innerHTML = `
            <button class="close-button" onclick="closeModal()">Закрыть</button>

            <div class="modal-title">${recipe.item_name}</div>

            <div class="modal-description">
                ${recipe.description || "Нет описания"}
            </div>

            <div class="modal-grid">
                <div class="modal-column">
                    <h3>Крафт</h3>
                    <ul>${assembleHTML}</ul>
                </div>

                <div class="modal-column">
                    <h3>Разборка (50%)</h3>
                    <ul>${disassembleHTML}</ul>
                </div>
            </div>
        `;

        overlay.classList.add("active");
        document.body.style.overflow = "hidden";  // блокируем прокрутку основной страницы
    }

    // =========================
    // Закрытие модалки
    // =========================
    window.closeModal = function () {
        const overlay = document.getElementById("modalOverlay");

        if (!overlay) return;

        overlay.classList.remove("active");
        document.body.style.overflow = "";
    };

    // Клик вне модалки
    const overlay = document.getElementById("modalOverlay");
    if (overlay) {
        overlay.addEventListener("click", function (e) {
            if (e.target === overlay) closeModal();
        });
    }

    // =========================
    // ПОИСК
    // =========================
    const searchInput = document.getElementById("craftingSearch");

    searchInput.addEventListener("input", function () {
        const query = this.value.toLowerCase();

        displayedRecipes = allRecipes.filter(r =>
            r.item_name.toLowerCase().includes(query)
        );

        displayRecipes(displayedRecipes);
    });

    // =========================
    // ФИЛЬТР КАТЕГОРИЙ
    // =========================
    window.filterCategory = function (category) {
        const query = searchInput.value.toLowerCase();

        displayedRecipes = allRecipes.filter(r => {
            const matchCategory = r.category === category;
            const matchSearch = r.item_name.toLowerCase().includes(query);
            return matchCategory && matchSearch;
        });

        displayRecipes(displayedRecipes);
    };

    // =========================
    // СТАРТ
    // =========================
    loadAllData();

});