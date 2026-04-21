/*
  Copyright (c) 2025 Vanish7667 and bartholomewlaw
  All Rights Reserved
*/

document.addEventListener("DOMContentLoaded", () => {

  /* ================== НАСТРОЙКИ ================== */

  const jsonFiles = {
    "Combat": "data/weapons/Combat.json",
    "Sniper": "data/weapons/Sniper.json",
    "Pistol": "data/weapons/Pistol.json",
    "Shotgun": "data/weapons/Shotgun.json",
    "Melee": "data/weapons/Melee.json"
  };

  const categoryNames = {
    "Combat": "Автоматическое оружие",
    "Sniper": "Снайперское оружие",
    "Pistol": "Пистолеты",
    "Shotgun": "Дробовики",
    "Melee": "Холодное оружие",
    "all": "Все"
  };

  /* ================== DOM ================== */

  const kitsGrid = document.getElementById("kits-grid");
  const categoryBtns = document.querySelectorAll(".category-btn");

  const modal = document.getElementById("kitModal");
  const modalClose = document.getElementById("modalClose");
  const modalKitName = document.getElementById("modalKitName");
  const modalKitCategory = document.getElementById("modalKitCategory");
  const modalRanks = document.getElementById("modalRankButtons");
  const modalMainImage = document.getElementById("modalMainImage");
  const modalDesc = document.getElementById("modalDesc");
  const modalObtain = document.getElementById("modalObtain");
  const modalStats = document.getElementById("modalStats");
  const modalSlots = document.getElementById("modalSlots");

  /* ================== СОСТОЯНИЯ ================== */

  let allKits = {};
  let currentCategory = "all";
  let currentKit = null;
  let currentVariant = null;
  let currentImageIndex = 0;

  /* ================== TOOLTIP СЛОТОВ ================== */

  const slotTooltip = document.createElement("div");
  slotTooltip.className = "slot-tooltip";
  document.body.appendChild(slotTooltip);

  Object.assign(slotTooltip.style, {
    position: "absolute",
    display: "none",
    background: "rgba(0,0,0,0.9)",
    color: "#fff",
    padding: "6px 10px",
    borderRadius: "6px",
    fontSize: "14px",
    pointerEvents: "none",
    zIndex: "10000",
    maxWidth: "240px",
    textAlign: "center"
  });

  function showSlotTooltip(target, text) {
    slotTooltip.textContent = text;
    const rect = target.getBoundingClientRect();
    slotTooltip.style.top =
      window.scrollY + rect.top - slotTooltip.offsetHeight - 8 + "px";
    slotTooltip.style.left =
      window.scrollX + rect.left + rect.width / 2 - slotTooltip.offsetWidth / 2 + "px";
    slotTooltip.style.display = "block";
  }

  function hideSlotTooltip() {
    slotTooltip.style.display = "none";
  }

  /* ================== КАТЕГОРИИ ================== */

  categoryBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      categoryBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentCategory = btn.dataset.cat;
      renderKits();
    });
  });

  /* ================== ЗАГРУЗКА JSON ================== */

  function loadAllKits() {
    const promises = Object.entries(jsonFiles).map(([cat, file]) =>
      fetch(file)
        .then(r => r.json())
        .then(data => allKits[cat] = data)
        .catch(err => {
          console.error(`Ошибка загрузки ${file}`, err);
          allKits[cat] = [];
        })
    );
    Promise.all(promises).then(renderKits);
  }

  /* ================== РЕНДЕР КАРТОЧЕК ================== */

  function renderKits() {
    kitsGrid.innerHTML = "";

    Object.entries(allKits).forEach(([cat, kits]) => {
      if (currentCategory !== "all" && currentCategory !== cat) return;

      kits.forEach(kit => {
        const card = document.createElement("div");
        card.className = "kit-card";
        card.innerHTML = `
          <img src="${kit.variants?.[0]?.images?.[0] || ""}" alt="${kit.name}">
          <h3>${kit.name}</h3>
        `;
        card.addEventListener("click", () => openModal(kit, cat));
        kitsGrid.appendChild(card);
      });
    });
  }

  /* ================== МОДАЛКА ================== */

  function openModal(kit, cat) {
    currentKit = kit;
    currentImageIndex = 0;

    modalKitName.textContent = kit.name;
    modalKitCategory.textContent = categoryNames[cat] || cat;

    modalRanks.innerHTML = "";
    modalSlots.innerHTML = "";
    hideSlotTooltip();

    kit.variants.forEach((variant, idx) => {
      const btn = document.createElement("button");
      btn.textContent = variant.rank || `Вариант ${idx + 1}`;
      btn.addEventListener("click", () => selectVariant(variant, btn));
      if (idx === 0) btn.classList.add("active");
      modalRanks.appendChild(btn);
    });

    selectVariant(kit.variants[0], modalRanks.children[0]);
    modal.classList.remove("hidden");
  }

  function selectVariant(variant, btn) {
    currentVariant = variant;
    currentImageIndex = 0;

    Array.from(modalRanks.children).forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    modalMainImage.src = variant.images?.[0] || "";

    modalDesc.innerHTML = variant.description
      ? `<h3>Описание:</h3><p>${variant.description}</p>`
      : "";

    modalObtain.innerHTML = variant.obtain
      ? `<h3>Способ получения:</h3><p>${variant.obtain}</p>`
      : "";

    /* ===== ХАРАКТЕРИСТИКИ ===== */

    modalStats.innerHTML = "<h3>Характеристики:</h3>";
    const ul = document.createElement("ul");
    Object.entries(variant.stats || {}).forEach(([k, v]) => {
      const li = document.createElement("li");
      li.textContent = `${k}: ${v}`;
      ul.appendChild(li);
    });
    modalStats.appendChild(ul);

    /* ===== СЛОТЫ ===== */

    modalSlots.innerHTML = "";
    hideSlotTooltip();

    (variant.slots || []).forEach(slot => {
      Object.keys(slot)
        .filter(k => k !== "description" && k !== "images")
        .forEach(key => {
          if (slot[key] === 1) {
            const wrap = document.createElement("div");
            wrap.className = "slot-circle";

            const img = document.createElement("img");
            img.src = slot.images?.[0] || "";
            img.alt = key;

            wrap.appendChild(img);

            wrap.addEventListener("click", e => {
              e.stopPropagation();
              if (slotTooltip.style.display === "block") hideSlotTooltip();
              else showSlotTooltip(wrap, slot.description || key);
            });

            modalSlots.appendChild(wrap);
          }
        });
    });

    createImageNavigation();
    updateMainImage();
  }

  /* ================== НАВИГАЦИЯ ПО ФОТО ================== */

  function createImageNavigation() {
    let nav = document.getElementById("modalImgNavContainer");
    if (!nav) {
      nav = document.createElement("div");
      nav.id = "modalImgNavContainer";
      nav.className = "modal-img-nav-container";
      modalMainImage.parentNode.appendChild(nav);
    }
    nav.innerHTML = "";

    const prev = document.createElement("button");
    const next = document.createElement("button");
    prev.textContent = "‹";
    next.textContent = "›";
    prev.className = next.className = "modal-img-nav";

    prev.addEventListener("click", e => {
      e.stopPropagation();
      currentImageIndex--;
      updateMainImage();
    });

    next.addEventListener("click", e => {
      e.stopPropagation();
      currentImageIndex++;
      updateMainImage();
    });

    nav.appendChild(prev);
    nav.appendChild(next);
  }

  function updateMainImage() {
    if (!currentVariant?.images?.length) return;
    if (currentImageIndex < 0) currentImageIndex = currentVariant.images.length - 1;
    if (currentImageIndex >= currentVariant.images.length) currentImageIndex = 0;
    modalMainImage.src = currentVariant.images[currentImageIndex];
  }

  /* ================== ПОЛНОЭКРАННЫЙ ЗУМ ================== */

  modalMainImage.addEventListener("click", () => {
    if (!modalMainImage.src) return;

    const overlay = document.createElement("div");
    Object.assign(overlay.style, {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      background: "rgba(0,0,0,0.92)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 9999,
      cursor: "zoom-out"
    });

    const img = document.createElement("img");
    img.src = modalMainImage.src;
    Object.assign(img.style, {
      maxWidth: "94%",
      maxHeight: "94%",
      borderRadius: "8px",
      transition: "transform 0.1s"
    });

    let scale = 1;
    overlay.addEventListener("wheel", e => {
      e.preventDefault();
      scale *= e.deltaY < 0 ? 1.1 : 0.9;
      scale = Math.min(Math.max(scale, 0.2), 5);
      img.style.transform = `scale(${scale})`;
    });

    overlay.appendChild(img);
    overlay.addEventListener("click", () => overlay.remove());
    document.body.appendChild(overlay);
  });

  /* ================== ЗАКРЫТИЕ ================== */

  modalClose.addEventListener("click", () => modal.classList.add("hidden"));
  modal.addEventListener("click", e => {
    if (e.target === modal) modal.classList.add("hidden");
  });

  document.addEventListener("click", hideSlotTooltip);

  /* ================== START ================== */

  loadAllKits();
});