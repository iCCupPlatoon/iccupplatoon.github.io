/*
  Copyright (c) 2025 Vanish7667 and bartholomewlaw
  All Rights Reserved
*/

const grid = document.getElementById("detectorGrid");

fetch("data/detectors/detectors.json")
    .then(res => res.json())
    .then(data => {
        data.forEach(item => {
            const card = document.createElement("div");
            card.className = "furniture-card"; // используем те же стили, рамки и свечение

            card.innerHTML = `
                <img src="${item.image}" alt="${item.name}">
                <h3>${item.name}</h3>
                <p class="description">${item.description}</p>
            `;

            grid.appendChild(card);
        });
    })
    .catch(err => console.error("Ошибка загрузки детекторов:", err));