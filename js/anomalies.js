/*
  Copyright (c) 2025 Vanish7667 and bartholomewlaw
  All Rights Reserved
*/

document.addEventListener("DOMContentLoaded", () => {
    const listContainer = document.getElementById("anomalies-list");

    const detailName = document.querySelector("#anomaly-detail h2");
    const detailImage = document.getElementById("anomaly-image");
    const detailVideo = document.getElementById("anomaly-video");
    const detailVideoSource = document.getElementById("anomaly-video-source");
    const detailDescription = document.getElementById("anomaly-description");

    // Функция для замены маркера [BOLT] на тултип с вопросиком
    function replaceBoltMarker(text) {
        const tooltipHTML = `<span class="tooltip-wrapper">
            <span class="tooltip-icon">❓</span>
            <span class="tooltip-text">Болт можно получить зажав клавишу X, предварительно уберите все из рук.</span>
        </span>`;
        return text.replace(/\[BOLT\]/gi, tooltipHTML);
    }

    // Загружаем JSON с аномалиями
    fetch("data/anomalies.json")
        .then(res => {
            if (!res.ok) throw new Error("Не удалось загрузить JSON");
            return res.json();
        })
        .then(data => {
            data.forEach((anomaly) => {
                const li = document.createElement("li");
                li.textContent = anomaly.name;

                li.addEventListener("click", () => {
                    // Снимаем активный класс со всех элементов
                    document.querySelectorAll(".anomaly-list li")
                        .forEach(el => el.classList.remove("active"));
                    li.classList.add("active");

                    // Заголовок
                    detailName.textContent = anomaly.name;

                    // Подставляем описание с тултипами
                    detailDescription.innerHTML = replaceBoltMarker(anomaly.description);

                    // Скрываем изображение и видео перед отображением
                    detailImage.style.display = "none";
                    detailVideo.style.display = "none";

                    // Если есть видео
                    if (anomaly.video) {
                        let videoPath = anomaly.video.replace(/^image\//, "images/");
                        detailVideoSource.src = videoPath;
                        detailVideo.load();
                        detailVideo.style.display = "block";
                        return;
                    }

                    // Если есть изображение
                    if (anomaly.image) {
                        let imagePath = anomaly.image.replace(/^image\//, "images/");
                        detailImage.src = imagePath;
                        detailImage.alt = anomaly.name;
                        detailImage.style.display = "block";
                    }
                });

                listContainer.appendChild(li);
            });

            // ✅ Автоклик по первой аномалии при загрузке страницы
            const firstLi = listContainer.querySelector("li");
            if (firstLi) firstLi.click();
        })
        .catch(err => console.error("Ошибка загрузки JSON:", err));

    // Делегируем клик на вопросик внутри описания
    detailDescription.addEventListener("click", (e) => {
        if (e.target.classList.contains("tooltip-icon")) {
            e.stopPropagation(); // клик не уйдет на document
            const wrapper = e.target.parentElement;
            wrapper.classList.toggle("active");
        }
    });

    // Закрываем все тултипы при клике вне
    document.addEventListener("click", () => {
        document.querySelectorAll(".tooltip-wrapper.active").forEach(el => {
            el.classList.remove("active");
        });
    });
});