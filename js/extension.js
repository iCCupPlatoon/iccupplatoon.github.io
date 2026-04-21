/*
  Copyright (c) 2025 Vanish7667 and bartholomewlaw
  All Rights Reserved
*/

document.addEventListener("DOMContentLoaded", () => {

    // Создаём тултип
    const tooltip = document.createElement("div");
    tooltip.className = "coin-tooltip";
    document.body.appendChild(tooltip);

    Object.assign(tooltip.style, {
        position: "absolute",
        display: "none",
        background: "rgba(0,0,0,0.92)",
        color: "#fff",
        padding: "8px 12px",
        borderRadius: "6px",
        fontSize: "14px",
        maxWidth: "260px",
        textAlign: "center",
        zIndex: "10000",
        boxShadow: "0 0 12px rgba(0,0,0,0.7)"
    });

    // Функция замены маркера [COIN]
    function replaceCoinMarker(text) {
        return text.replace(/\[COIN\]/gi, `
            <span class="coin-tooltip-trigger">🪙</span>
        `);
    }

    // Применяем замену
    document.querySelectorAll("p, li, span, div").forEach(el => {
        if (el.innerHTML.includes("[COIN]")) {
            el.innerHTML = replaceCoinMarker(el.innerHTML);
        }
    });

    // Показ тултипа
    function showTooltip(target) {
        tooltip.textContent =
            "Золотые монетки выдаются за голосование на WarGM. " +
            "Используются для расширения и улучшений.";

        const rect = target.getBoundingClientRect();
        tooltip.style.top = (window.scrollY + rect.top - tooltip.offsetHeight - 8) + "px";
        tooltip.style.left = (window.scrollX + rect.left + rect.width / 2 - tooltip.offsetWidth / 2) + "px";
        tooltip.style.display = "block";
    }

    function hideTooltip() {
        tooltip.style.display = "none";
    }

    // Клик по монетке
    document.addEventListener("click", (e) => {
        const trigger = e.target.closest(".coin-tooltip-trigger");

        if (trigger) {
            e.stopPropagation();
            if (tooltip.style.display === "block") {
                hideTooltip();
            } else {
                showTooltip(trigger);
            }
        } else {
            hideTooltip();
        }
    });

});