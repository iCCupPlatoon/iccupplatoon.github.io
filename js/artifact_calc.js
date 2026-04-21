/*
  Copyright (c) 2025 Vanish7667 and bartholomewlaw
  All Rights Reserved
*/

let artifactActive = null;

const artifactListEl = document.getElementById("artifact-list");
const artifactSearch = document.getElementById("artifact-search");
const selectedArtifactsList = document.getElementById("selected-artifacts");
const resultDiv = document.getElementById("calculation-result");
const artifactPropertiesDiv = document.getElementById("artifact-properties");

const saveButton = document.getElementById("save-build");
const loadButton = document.getElementById("load-build");
const clearButton = document.getElementById("clear-build");
const shareButton = document.getElementById("share-build");

const artifactModal = document.getElementById("artifact-modal");
const openModalBtn = document.getElementById("confirm-artifact");
const modalCloseBtn = document.querySelector(".modal-content .close");

const tierValueEl = document.getElementById("tier-value");
const copiesValueEl = document.getElementById("copies-value");
const tierUpBtn = document.getElementById("tier-up");
const tierDownBtn = document.getElementById("tier-down");
const copiesUpBtn = document.getElementById("copies-up");
const copiesDownBtn = document.getElementById("copies-down");

let selectedArtifacts = [];
let allArtifacts = [];

const maxTier = 4;
const minTier = 1;

// ------------------ Загрузка JSON ------------------
fetch("data/artefact/art.json")
  .then(res => res.json())
  .then(data => { 
    allArtifacts = data;
    populateArtifactModal(allArtifacts);

    // Если в URL есть сборка, загружаем её после JSON
    const params = new URLSearchParams(window.location.search);
    const buildStr = params.get("b");
    if(buildStr) deserializeBuild(buildStr);
  });

// ------------------ Модальное окно ------------------
openModalBtn.onclick = () => artifactModal.style.display = "flex";
modalCloseBtn.onclick = () => artifactModal.style.display = "none";
window.onclick = e => { if(e.target === artifactModal) artifactModal.style.display = "none"; };

// ------------------ Поиск артефактов ------------------
artifactSearch.addEventListener("input", () => {
  const query = artifactSearch.value.toLowerCase();
  Array.from(artifactListEl.children).forEach(item => {
    const name = item.dataset.name.toLowerCase();
    item.style.display = name.includes(query) ? "flex" : "none";
  });
});

// ------------------ Очистка сборки ------------------
clearButton.addEventListener("click", () => {
  selectedArtifacts = [];
  artifactActive = null;
  updateSelectedList();
});

// ------------------ Сохранение / Загрузка ------------------
saveButton.addEventListener("click", () => {
  if(selectedArtifacts.length){
    localStorage.setItem("savedBuild", JSON.stringify(selectedArtifacts));
    alert("Сборка сохранена!");
  } else alert("Нет артефактов для сохранения.");
});

loadButton.addEventListener("click", () => {
  const saved = localStorage.getItem("savedBuild");
  if(saved){
    deserializeBuildFromLocal(saved);
    alert("Сборка загружена!");
  } else alert("Нет сохранённых сборок.");
});

// ------------------ Добавление артефакта ------------------
function addArtifact(name){
  const artifactData = allArtifacts.find(a => a["Имя"] === name);
  if(!artifactData) return;
  const art = {id: Date.now() + Math.random(), name, tier: 1, copies: 1};
  selectedArtifacts.push(art);
  artifactActive = art;
  updateSelectedList();
}

// ------------------ Обновление списка выбранных артефактов ------------------
function updateSelectedList(){
  selectedArtifactsList.innerHTML = "";
  selectedArtifacts.forEach(art => {
    const li = document.createElement("li");
    li.classList.add("artifact-item");
    if(artifactActive && art.id === artifactActive.id) li.classList.add("active");

    const container = document.createElement("div");
    container.classList.add("artifact-container");
    container.style.display = "flex";
    container.style.alignItems = "center";
    container.onclick = () => {
      artifactActive = art;
      showArtifactProperties(art);
      updateSelectedList();
    };

    const artData = allArtifacts.find(a => a["Имя"] === art.name);
    const variant = artData ? (artData["Варианты"].find(v => v["Тир"] === art.tier) || artData["Варианты"][0]) : null;

    const imgSmall = document.createElement("img");
    imgSmall.src = variant?.images?.[0] || "";
    imgSmall.style.width = "32px";
    imgSmall.style.height = "32px";
    imgSmall.style.borderRadius = "4px";
    imgSmall.style.marginRight = "6px";

    const nameSpan = document.createElement("span");
    nameSpan.textContent = `${art.name} x${art.copies}`;
    nameSpan.style.flexGrow = "1";

    const deleteBtn = document.createElement("span");
    deleteBtn.textContent = "✖";
    deleteBtn.classList.add("delete-artifact-btn");
    deleteBtn.onclick = e => {
      e.stopPropagation();
      selectedArtifacts = selectedArtifacts.filter(a => a.id !== art.id);
      if(artifactActive && artifactActive.id === art.id) artifactActive = null;
      updateSelectedList();
    };

    container.appendChild(imgSmall);
    container.appendChild(nameSpan);
    container.appendChild(deleteBtn);
    li.appendChild(container);
    selectedArtifactsList.appendChild(li);
  });

  document.getElementById("artifact-count").textContent = `Количество артефактов: ${selectedArtifacts.reduce((sum,a)=>sum+a.copies,0)}`;

  if(artifactActive) showArtifactProperties(artifactActive);
  else artifactPropertiesDiv.innerHTML = "Выберите артефакт";

  calculateStats();
  updateControls();
}

// ------------------ Показ свойств артефакта ------------------
function showArtifactProperties(art){
  const data = allArtifacts.find(a => a["Имя"] === art.name);
  if(!data) return;
  const variant = data["Варианты"].find(v => v["Тир"] === art.tier) || data["Варианты"][0];

  artifactPropertiesDiv.innerHTML = "";

  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.justifyContent = "space-between";
  container.style.alignItems = "flex-start";

  const textDiv = document.createElement("div");
  const h4 = document.createElement("h4");
  h4.textContent = `${art.name} (Тир ${art.tier})`;
  textDiv.appendChild(h4);

  for(let key in variant){
    if(key !== "Имя" && key !== "Тир" && key !== "images"){
      const p = document.createElement("p");
      p.textContent = `${key}: ${variant[key]}`;
      const value = Number(variant[key]) || 0;
      p.style.color = value>0 ? "green" : value<0 ? "red" : "gray";
      textDiv.appendChild(p);
    }
  }

  const imgBig = document.createElement("img");
  imgBig.src = variant?.images?.[0] || "";
  imgBig.style.width = "124px";
  imgBig.style.height = "124px";
  imgBig.style.borderRadius = "6px";

  container.appendChild(textDiv);
  container.appendChild(imgBig);
  artifactPropertiesDiv.appendChild(container);
  updateControls();
}

// ------------------ Управление тир/копиями ------------------
function updateControls(){
  const controls = [tierUpBtn, tierDownBtn, copiesUpBtn, copiesDownBtn];
  if(!artifactActive){
    controls.forEach(btn => btn.style.display="none");
    artifactPropertiesDiv.innerHTML="Выберите артефакт";
  } else {
    controls.forEach(btn => btn.style.display="inline-block");
    tierValueEl.textContent = artifactActive.tier;
    copiesValueEl.textContent = artifactActive.copies;
  }
}

tierUpBtn.onclick = ()=>{ if(artifactActive && artifactActive.tier<maxTier) artifactActive.tier++; updateSelectedList(); };
tierDownBtn.onclick = ()=>{ if(artifactActive && artifactActive.tier>minTier) artifactActive.tier--; updateSelectedList(); };
copiesUpBtn.onclick = ()=>{ if(artifactActive) artifactActive.copies++; updateSelectedList(); };
copiesDownBtn.onclick = ()=>{ if(artifactActive && artifactActive.copies>1) artifactActive.copies--; updateSelectedList(); };

// ------------------ Расчёт характеристик ------------------
function calculateStats(){
  const result = {};
  let radiationOutput = 0, radiationAccum = 0;

  selectedArtifacts.forEach(art=>{
    const data = allArtifacts.find(a=>a["Имя"]===art.name);
    if(!data) return;
    const variant = data["Варианты"].find(v=>v["Тир"]===art.tier) || data["Варианты"][0];

    for(let key in variant){
      if(key!=="Имя" && key!=="Тир" && key!=="images"){
        const value = Number(variant[key])||0;
        const total = value*art.copies;
        if(key==="Вывод радиации") radiationOutput+=total;
        else if(key==="Накопление радиации") radiationAccum+=total;
        else result[key]=(result[key]||0)+total;
      }
    }
  });

  result["Радиация"]=radiationAccum-radiationOutput;
  displayResults(result);
}

// ------------------ Показ результатов ------------------
function displayResults(stats){
  resultDiv.innerHTML="";
  for(let key in stats){
    const p=document.createElement("p");
    let color = stats[key]>0?"green":stats[key]<0?"red":"gray";
    if(key==="Температура") color=stats[key]<0?"blue":stats[key]>0?"red":"green";
    if(key==="Радиация") color=stats[key]>0?"red":stats[key]<0?"green":"gray";
    p.style.color=color;
    p.textContent=`${key}: ${stats[key]}`;
    resultDiv.appendChild(p);
  }
}

// ------------------ Заполнение модалки ------------------
function populateArtifactModal(artifacts){
  artifactListEl.innerHTML="";
  artifacts.forEach(a=>{
    const div=document.createElement("div");
    div.classList.add("artifact-item");
    div.dataset.name=a["Имя"];
    div.style.display="flex";
    div.style.alignItems="center";
    div.style.padding="4px 6px";

    const img=document.createElement("img");
    img.src=a["Варианты"]?.[0]?.images?.[0]||"";
    img.style.width="48px";
    img.style.height="48px";
    img.style.borderRadius="4px";
    img.style.marginRight="8px";

    const nameDiv=document.createElement("div");
    nameDiv.style.flexGrow="1";
    nameDiv.style.textAlign="center";
    nameDiv.textContent=a["Имя"];

    div.appendChild(img);
    div.appendChild(nameDiv);
    div.onclick=()=>{ addArtifact(a["Имя"]); artifactModal.style.display="none"; };
    artifactListEl.appendChild(div);
  });
}

// ------------------ URL-сборка / Поделиться ------------------
// Кодирование сборки в Base64URL
function serializeBuild() {
    const buildData = {
        v: 1,
        a: selectedArtifacts.map(a => [a.name, a.tier, a.copies])
    };
    const json = JSON.stringify(buildData);
    return btoa(unescape(encodeURIComponent(json)))
           .replace(/\+/g, "-")
           .replace(/\//g, "_")
           .replace(/=+$/, "");
}

// Декодирование сборки из Base64URL
function deserializeBuild(str) {
    try {
        const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
        const json = decodeURIComponent(escape(atob(base64)));
        const data = JSON.parse(json);

        if(!data.a || !Array.isArray(data.a)) throw "Некорректные данные сборки";

        selectedArtifacts = data.a.map(([name,tier,copies]) => {
            const artData = allArtifacts.find(a => a["Имя"] === name);
            if(!artData){
                console.warn(`Артефакт "${name}" не найден, пропущен`);
                return null;
            }
            const variant = artData["Варианты"].find(v => v["Тир"]===tier) || artData["Варианты"][0];
            return {id: Date.now()+Math.random(), name, tier: variant["Тир"], copies};
        }).filter(a => a!==null);

        artifactActive = selectedArtifacts[selectedArtifacts.length-1] || null;
        updateSelectedList();
    } catch(e){
        alert("Ошибка импорта сборки!");
        console.error(e);
    }
}

// Декодирование локальной сборки
function deserializeBuildFromLocal(str){
    try {
        const data = JSON.parse(str);
        selectedArtifacts = data.map(a => {
            const artData = allArtifacts.find(x => x["Имя"] === a.name);
            if(!artData) return null;
            const variant = artData["Варианты"].find(v=>v["Тир"]===a.tier)||artData["Варианты"][0];
            return {id: Date.now()+Math.random(), name:a.name, tier: variant["Тир"], copies:a.copies};
        }).filter(a=>a!==null);
        artifactActive = selectedArtifacts[selectedArtifacts.length-1]||null;
        updateSelectedList();
    } catch(e){
        alert("Ошибка загрузки сборки из локального хранилища!");
        console.error(e);
    }
}

// Генерация ссылки для обмена
function generateShareLink() {
    const buildStr = serializeBuild();
    return `${window.location.origin}${window.location.pathname}?b=${buildStr}`;
}

shareButton.onclick = () => {
    const url = generateShareLink();
    navigator.clipboard.writeText(url).then(() => {
        alert("Ссылка скопирована в буфер обмена!");
    });
};