/**
 * script.js - v13.7 (Modified for Navigation Fix)
 */

const units = [
    { name: "総大将", type: "soudaisho", rows: 2 },
    { name: "第1軍", type: "army", rows: 2 },
    { name: "第2軍", type: "army", rows: 2 },
    { name: "第3軍", type: "army", rows: 2 },
    { name: "第4軍", type: "army", rows: 2 },
    { name: "軍師", type: "gunshi", rows: 1 },
    { name: "援軍", type: "army", rows: 2 }
];

const strategyOptions = ["要所防衛", "要所優先", "全武将撃破", "全部隊撃破", "部隊優先", "部隊停止", "オフ"];
const autoOptions = ["オン　交戦時", "オン　士気最大時", "オフ"];
const countryOrder = ["秦国", "趙国", "魏国", "楚国", "韓国", "斉国", "燕国", "山の民", "毐国"];

let bushoData = [];
let currentFormationIndex = 0;
let formations = Array.from({ length: 5 }, () => ({
    name: "", limit: "none", slots: {}, memos: {}, strategies: {}, autos: {}
}));

let currentSlotId = "";
let currentBusho = null;
let lastSelectedCountry = ""; 
let copiedFormationData = null;
let isCopying = false;

const STORAGE_KEY = 'kinran_final_v13_7';

window.onload = () => {
    if (window.bushosData) bushoData = window.bushosData;
    loadFromStorage();
    renderGrid();
    updateUI();
};

function renderGrid() {
    const container = document.getElementById('unit-group-container');
    container.innerHTML = '';
    units.forEach(unit => {
        const col = document.createElement('div');
        col.className = 'unit-column';
        const label = document.createElement('div');
        label.className = `column-label label-${unit.type}`;
        label.innerText = unit.name;
        col.appendChild(label);
        for (let i = 0; i < unit.rows; i++) {
            const slotId = `slot-${unit.name}-${i}`;
            const slot = document.createElement('div');
            slot.className = 'slot';
            slot.id = slotId;
            slot.onclick = () => onBushoClick(slotId);
            slot.innerHTML = `<div class="plus-mark">+</div>`;
            col.appendChild(slot);
        }
        const settings = document.createElement('div');
        settings.className = 'extra-settings';
        if (unit.type !== "gunshi") {
            settings.innerHTML = `
                <div class="config-row"><span class="config-label">進軍方針</span><select class="config-select strategy-sel" data-unit="${unit.name}"></select></div>
                <div class="config-row"><span class="config-label">オート武技</span><select class="config-select auto-sel" data-unit="${unit.name}"></select></div>
            `;
            const sSel = settings.querySelector('.strategy-sel');
            strategyOptions.forEach(opt => sSel.add(new Option(opt, opt)));
            sSel.onchange = (e) => {
                formations[currentFormationIndex].strategies[unit.name] = e.target.value;
                applyConfigStyles(e.target);
                saveToStorage();
            };
            const aSel = settings.querySelector('.auto-sel');
            autoOptions.forEach(opt => aSel.add(new Option(opt, opt)));
            aSel.onchange = (e) => {
                formations[currentFormationIndex].autos[unit.name] = e.target.value;
                applyConfigStyles(e.target);
                saveToStorage();
            };
        }
        const memo = document.createElement('textarea');
        memo.className = 'memo-input';
        memo.placeholder = 'メモ';
        memo.id = `memo-${unit.name}`;
        memo.oninput = () => {
            formations[currentFormationIndex].memos[unit.name] = memo.value;
            saveToStorage();
        };
        settings.appendChild(memo);
        col.appendChild(settings);
        container.appendChild(col);
    });
}

function applyConfigStyles(select) {
    const val = select.value;
    if (val === "オフ" || val === "部隊停止") {
        select.style.backgroundColor = "#462507";
    } else if (val === "オン　士気最大時") {
        select.style.backgroundColor = "#23A300";
    } else {
        select.style.backgroundColor = "#41B1A8";
    }
}

function updateUI() {
    const data = formations[currentFormationIndex];
    document.getElementById('formation-name').value = data.name || "";
    document.getElementById('limit-type').value = data.limit || "none";
    document.getElementById('page-indicator').innerText = `Page ${currentFormationIndex + 1} / 5`;
    updateLimitStyle();

    units.forEach(u => {
        const m = document.getElementById(`memo-${u.name}`);
        if (m) { m.value = data.memos[u.name] || ""; m.disabled = isCopying; }
        if (u.type !== "gunshi") {
            const sSel = document.querySelector(`.strategy-sel[data-unit="${u.name}"]`);
            const aSel = document.querySelector(`.auto-sel[data-unit="${u.name}"]`);
            if (sSel) { sSel.value = data.strategies[u.name] || "オフ"; applyConfigStyles(sSel); sSel.disabled = isCopying; }
            if (aSel) { aSel.value = data.autos[u.name] || "オフ"; applyConfigStyles(aSel); aSel.disabled = isCopying; }
        }
    });

    document.querySelectorAll('.slot').forEach(s => {
        s.innerHTML = `<div class="plus-mark">+</div>`;
        s.removeAttribute('data-busho-name');
        if (isCopying) s.classList.add('locked'); else s.classList.remove('locked');
    });

    for (let id in data.slots) {
        const el = document.getElementById(id);
        const bushoEntry = data.slots[id];
        if (el && bushoEntry) {
            el.innerHTML = `<img src="${bushoEntry.src}">`;
            el.setAttribute('data-busho-name', bushoEntry.name);
        }
    }
    document.getElementById('formation-name').disabled = isCopying;
    document.getElementById('limit-type').disabled = isCopying;
}

function onBushoClick(slotId) {
    if (isCopying) return;
    currentSlotId = slotId;
    const bushoName = $(`#${slotId}`).attr('data-busho-name');
    if (!bushoName) {
        openPopup();
    } else {
        currentBusho = bushoData.find(b => b.name === bushoName);
        if (currentBusho) {
            $('#menu-name').text(currentBusho.name);
            $('#menu-overlay, #menu-modal').fadeIn(200);
        }
    }
}

function copyCurrentFormation() {
    saveToStorage();
    copiedFormationData = JSON.parse(JSON.stringify(formations[currentFormationIndex]));
    isCopying = true;
    document.getElementById('normal-controls').style.display = 'none';
    document.getElementById('copy-controls').style.display = 'flex';
    updateUI();
}

function pasteFormation() {
    if (!copiedFormationData) return;
    formations[currentFormationIndex] = JSON.parse(JSON.stringify(copiedFormationData));
    saveToStorage();
    cancelCopy();
}

function cancelCopy() {
    isCopying = false;
    copiedFormationData = null;
    document.getElementById('normal-controls').style.display = 'flex';
    document.getElementById('copy-controls').style.display = 'none';
    updateUI();
}

function handleMenuSelection(action) {
    closeMenu();
    switch (action) {
        case 'change-busho': openPopup(); break;
        case 'change-img': 
            lastSelectedCountry = currentBusho.country; 
            renderImageList(currentBusho); 
            document.getElementById('modal').style.display = "block"; 
            break;
        case 'delete-img': 
            delete formations[currentFormationIndex].slots[currentSlotId]; 
            updateUI(); saveToStorage(); 
            break;
        case 'detail': 
            const detailUrl = `https://kinran.work.gd/k/${currentBusho.country}/${currentBusho.name}`;
            window.open(detailUrl, '_blank'); 
            break;
    }
}

function closeMenu() { $('#menu-overlay, #menu-modal').fadeOut(200); }
function openPopup() { 
    document.getElementById('modal').style.display = "block"; 
    document.getElementById('busho-search').value = ""; 
    // 初期状態は常に国別を表示（タブのスタイルも国別に合わせる）
    switchTab('country');
}
function closePopup() { document.getElementById('modal').style.display = "none"; }

// タブ切り替えロジック
function switchTab(type) {
    const btnCountry = document.getElementById('tab-country');
    const btnBelongs = document.getElementById('tab-belongs');
    
    // 検索窓をリセット
    document.getElementById('busho-search').value = "";

    if (type === 'country') {
        btnCountry.style.background = "#444";
        btnCountry.style.border = "1px solid var(--border-gold)";
        btnBelongs.style.background = "#222";
        btnBelongs.style.border = "1px solid #666";
        renderCountryList(); 
    } else {
        btnBelongs.style.background = "#444";
        btnBelongs.style.border = "1px solid var(--border-gold)";
        btnCountry.style.background = "#222";
        btnCountry.style.border = "1px solid #666";
        renderBelongsList();
    }
}

// 所属一覧を表示する
function renderBelongsList() {
    const body = document.getElementById('modal-body');
    body.innerHTML = '';
    
    const grid = document.createElement('div');
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "1fr 1fr";
    grid.style.gap = "5px";

    if (typeof belongsMap !== 'undefined') {
        Object.keys(belongsMap).forEach(group => {
            const btn = document.createElement('button');
            btn.className = 'choice-btn';
            btn.style.margin = "0";
            btn.innerHTML = `${group} <span style="font-size:0.8em; opacity:0.7;">(${belongsMap[group].length})</span>`;
            btn.onclick = () => renderBushoListByBelongs(group);
            grid.appendChild(btn);
        });
    }
    body.appendChild(grid);
}

// 所属内の武将一覧を表示する
function renderBushoListByBelongs(groupName) {
    const body = document.getElementById('modal-body');
    body.innerHTML = `
        <button class="choice-btn" style="background:#555; margin-bottom:10px;" onclick="renderBelongsList()">
            ← 所属一覧に戻る
        </button>`;
    
    const filtered = window.bushosData.filter(b => b.belongs && b.belongs.includes(groupName));
    filtered.forEach(b => {
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.innerText = b.name;
        // 所属名を引数として渡す
        btn.onclick = () => renderImageList(b, groupName); 
        body.appendChild(btn);
    });
}

function renderCountryList() {
    const body = document.getElementById('modal-body');
    body.innerHTML = '<p style="color:#B59153; margin-bottom:10px;">国を選択</p>';
    countryOrder.forEach(c => {
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.innerText = c;
        btn.onclick = () => renderBushoList(c);
        body.appendChild(btn);
    });
}

function renderBushoList(country) {
    lastSelectedCountry = country; 
    const body = document.getElementById('modal-body');
    body.innerHTML = `<button class="choice-btn" style="background:#444;" onclick="renderCountryList()">← 国選択に戻る</button>`;
    bushoData.filter(b => b.country === country).forEach(b => {
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.innerText = b.name;
        btn.onclick = () => renderImageList(b);
        body.appendChild(btn);
    });
}

// 画像一覧を表示する（修正箇所：originGroupを受け取る）
function renderImageList(busho, originGroup = null) {
    const body = document.getElementById('modal-body');
    
    // 戻るボタンの分岐ロジック
    const backBtn = document.createElement('button');
    backBtn.className = 'choice-btn';
    backBtn.style.background = "#444";
    backBtn.innerText = "← 武将選択に戻る";
    backBtn.onclick = () => {
        if (originGroup) {
            renderBushoListByBelongs(originGroup);
        } else {
            renderBushoList(busho.country || lastSelectedCountry);
        }
    };

    body.innerHTML = `<h3>${busho.name}</h3>`;
    body.appendChild(backBtn);

    const grid = document.createElement('div');
    grid.className = 'image-grid';
    busho.imgs.forEach(src => {
        const img = document.createElement('img');
        img.src = src;
        img.className = 'image-item';
        img.onclick = () => {
            formations[currentFormationIndex].slots[currentSlotId] = { src: src, name: busho.name };
            updateUI(); closePopup(); saveToStorage();
        };
        grid.appendChild(img);
    });
    body.appendChild(grid);
}

function filterBushos() {
    const q = document.getElementById('busho-search').value.trim();
    if (!q) { 
        // 検索が空になったら現在のタブに合わせてリストを戻す
        const isBelongsActive = document.getElementById('tab-belongs').style.background === "rgb(68, 68, 68)";
        if (isBelongsActive) renderBelongsList(); else renderCountryList();
        return; 
    }
    const body = document.getElementById('modal-body');
    body.innerHTML = "";
    bushoData.filter(b => b.name.includes(q) || (b.kana && b.kana.includes(q))).forEach(b => {
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.innerText = `${b.name} (${b.country})`;
        btn.onclick = () => renderImageList(b);
        body.appendChild(btn);
    });
}

function changeFormation(dir) {
    saveToStorage();
    currentFormationIndex = (currentFormationIndex + dir + 5) % 5;
    updateUI();
}

function updateLimitStyle() {
    const select = document.getElementById('limit-type');
    const colors = { "none": "#6299FF", "soldier": "#CB9118", "auto-none": "#14CB9F", "auto-soldier": "#CC4815" };
    const color = colors[select.value];
    select.style.backgroundColor = color;
    select.parentElement.style.backgroundColor = "#333"; 
    formations[currentFormationIndex].limit = select.value;
}

function saveToStorage() {
    if (isCopying) return;
    const input = document.getElementById('formation-name');
    if (input) formations[currentFormationIndex].name = input.value;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(formations));
}

function loadFromStorage() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) formations = JSON.parse(saved);
}

function resetCurrentFormation() {
    if(confirm("編成をリセットしますか？")) {
        formations[currentFormationIndex] = { name: "", limit: "none", slots: {}, memos: {}, strategies: {}, autos: {} };
        updateUI(); saveToStorage();
    }
}