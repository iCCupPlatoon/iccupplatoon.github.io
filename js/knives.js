/*
  Copyright (c) 2025 Vanish7667 and bartholomewlaw
  All Rights Reserved
*/

const grid = document.getElementById("knifeGrid");
const overlay = document.getElementById("modalOverlay");
const modalWindow = document.getElementById("modalWindow");
const modalClose = document.getElementById("modalClose");
const modalImage = document.getElementById("modalImage");
const modalTitle = document.getElementById("modalTitle");
const modalDesc = document.getElementById("modalDesc");

fetch("data/knives.json")
    .then(res => res.json())
    .then(knives => {
        knives.forEach(knife => {
            const card = document.createElement("div");
            card.className = "furniture-card"; // карточки фурнитуры

            card.innerHTML = `
                <img src="${knife.image}" alt="${knife.name}">
                <h3>${knife.name}</h3>
                <p class="description">${knife.description}</p>
            `;

            // Открытие модального окна по клику на картинку
            card.querySelector("img").addEventListener("click", () => {
                modalImage.src = knife.image;
                modalTitle.textContent = knife.name;
                modalDesc.textContent = knife.description;
                overlay.classList.add("active");
                document.body.style.overflow = "hidden";
            });

            grid.appendChild(card);
        });
    })
    .catch(err => console.error("Ошибка загрузки ножей:", err));

// Закрытие модалки
modalClose.addEventListener("click", () => {
    overlay.classList.remove("active");
    document.body.style.overflow = "";
});

overlay.addEventListener("click", e => {
    if (e.target === overlay) {
        overlay.classList.remove("active");
        document.body.style.overflow = "";
    }
});