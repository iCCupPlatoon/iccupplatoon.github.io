/*
  Copyright (c) 2025 Vanish7667 and bartholomewlaw
  All Rights Reserved
*/

const grid = document.getElementById("artefactGrid");
const overlay = document.getElementById("modalOverlay");
const modalContent = document.getElementById("modalContent");
const modalClose = document.getElementById("modalClose");

let currentArtefact = null;
let currentTier = 0;
let selectedCard = null;

/* Загрузка JSON */
fetch("data/artefact/art.json")
    .then(res => res.json())
    .then(data => {
        data.forEach(artefact => {
            if (!artefact.Варианты || !artefact.Варианты.length) return;
            const base = artefact.Варианты[0];

            const card = document.createElement("div");
            card.className = "artefact-card";
            card.innerHTML = `
                <img src="${base.images[0]}" alt="${artefact.Имя}">
                <span>${artefact.Имя}</span>
            `;

            // Выбор карточки и радужное свечение
            card.addEventListener("click", () => {
                if (selectedCard) selectedCard.classList.remove("selected");
                card.classList.add("selected");
                selectedCard = card;

                openModal(artefact);
            });

            grid.appendChild(card);
        });
    })
    .catch(err => console.error("Ошибка загрузки JSON:", err));

/* Открытие модалки */
function openModal(artefact) {
    currentArtefact = artefact;
    currentTier = 0;
    renderModalTier();
    overlay.classList.add("active");
    document.body.style.overflow = "hidden";
}

/* Отрисовка текущего тира */
function renderModalTier() {
    if (!currentArtefact || !currentArtefact.Варианты.length) return;

    const v = currentArtefact.Варианты[currentTier];

    let html = `
        <h2>${currentArtefact.Имя}</h2>
        <div class="tier-buttons">
    `;

    currentArtefact.Варианты.forEach((_, i) => {
        html += `<button class="tier-btn ${i === currentTier ? 'active' : ''}" data-tier="${i}">Тир ${i + 1}</button>`;
    });

    html += `</div>`;

    html += `
        <div class="tier-content">
            <img src="${v.images[0]}" alt="${currentArtefact.Имя}">
            <div class="stats">
    `;
    Object.entries(v).forEach(([key, value]) => {
        if (["Имя","Тир","images"].includes(key)) return;
        html += `<div class="stat"><b>${key}:</b> ${value}</div>`;
    });
    html += `</div></div>`;

    modalContent.innerHTML = html;

    // Слушатели для кнопок тира
    document.querySelectorAll(".tier-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            currentTier = parseInt(btn.dataset.tier);
            renderModalTier();
        });
    });
}

/* Закрытие модалки */
modalClose.addEventListener("click", closeModal);
overlay.addEventListener("click", e => {
    if (e.target === overlay) closeModal();
});

function closeModal() {
    overlay.classList.remove("active");
    document.body.style.overflow = "";
}