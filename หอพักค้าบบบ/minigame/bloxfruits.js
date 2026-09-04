// ================= FIREBASE CONFIGURATION =================
const firebaseConfig = {
  apiKey: "AIzaSyCAWZipu2Nlhrm8AQrW_JaDmyohB3DycAs",
  authDomain: "hopaknaksuksa.firebaseapp.com",
  projectId: "hopaknaksuksa",
  storageBucket: "hopaknaksuksa.firebasestorage.app",
  messagingSenderId: "121076275174",
  appId: "1:121076275174:web:bcc362d36cb7feb242a827"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const userId = "superadmin_player_1";

// PLAYER DATA
let playerData = {
    level: 1,
    exp: 0,
    maxExp: 100,
    gold: 100,
    statPoints: 0,
    stats: { melee: 1, sword: 1, fruit: 1, def: 1 },
    hp: 100,
    maxHp: 100,
    stamina: 100,
    maxStamina: 100,
    selectedWeapon: 'Combat',
    hasSword: false,
    fruit: null,
    hasArmHaki: false,
    hasObsHaki: false,
    quest: null
};

// WEAPON INDEPENDENT COOLDOWNS & STAMINA COST
const cooldowns = {
    Combat: { Z: 0, X: 0, C: 0 },
    Sword: { Z: 0, X: 0, C: 0 },
    Fruit: { Z: 0, X: 0, C: 0 }
};

const skillConfig = {
    Z: { cd: 3000, stamina: 15 },
    X: { cd: 6000, stamina: 30 },
    C: { cd: 10000, stamina: 45 },
    Dash: { cd: 1000, stamina: 20 }
};

let dashCooldown = false;

// 10 FRUITS DATABASE
const FRUITS_DATABASE = [
    { name: "Bomb 💣", color: 0x555555, skills: { Z: "Bomb Rush", X: "Explosive Land", C: "Self Destruct" } },
    { name: "Flame 🔥", color: 0xff4500, skills: { Z: "Fire Bullet", X: "Flame Pillar", C: "Fire Emperor" } },
    { name: "Ice 🧊", color: 0x00ffff, skills: { Z: "Ice Dagger", X: "Ice Surge", C: "Glacial Age" } },
    { name: "Light ⚡", color: 0xffff00, skills: { Z: "Light Beam", X: "Mirror Kick", C: "Wrath of God" } },
    { name: "Dark 🕳️", color: 0x330066, skills: { Z: "Dark Rocks", X: "Black Hole", C: "Dark Bomb" } },
    { name: "Magma 🌋", color: 0x8b0000, skills: { Z: "Magma Fist", X: "Volcano Erupt", C: "Magma Rain" } },
    { name: "Quake 🫨", color: 0xd2691e, skills: { Z: "Punch Shock", X: "Tsunami Wave", C: "Severing World" } },
    { name: "Buddha 🧘", color: 0xffd700, skills: { Z: "Golden Palm", X: "Buddha Smash", C: "Heavenly Light" } },
    { name: "Dragon 🐉", color: 0x800080, skills: { Z: "Dragon Breath", X: "Fire Blast", C: "Roar of Sea" } },
    { name: "Dough 🍩", color: 0xffe4e1, skills: { Z: "Dough Fist", X: "Mochi Roll", C: "Buzzsaw" } }
];

let isArmHakiActive = false;
let isObsHakiActive = false;
let playerVelocityY = 0;
let isGrounded = false;
let inSafeZone = false;
let particles = [];

async function loadData() {
    try {
        const docSnap = await db.collection("bloxfruits_save").doc(userId).get();
        if (docSnap.exists) {
            playerData = Object.assign(playerData, docSnap.data());
            showToast("☁️ โหลดข้อมูลสำเร็จ!", "quest");
        } else saveData();
    } catch (e) {
        const saved = localStorage.getItem('blox_fruits_3d_data');
        if (saved) playerData = Object.assign(playerData, JSON.parse(saved));
    }
    recalcStats();
    updateUI();
}

async function saveData() {
    try {
        await db.collection("bloxfruits_save").doc(userId).set(playerData);
    } catch (e) {
        localStorage.setItem('blox_fruits_3d_data', JSON.stringify(playerData));
    }
}

function recalcStats() {
    playerData.maxHp = 100 + playerData.stats.def * 25;
    playerData.maxStamina = 100 + playerData.stats.melee * 15;
    if (playerData.hp > playerData.maxHp) playerData.hp = playerData.maxHp;
    if (playerData.stamina > playerData.maxStamina) playerData.stamina = playerData.maxStamina;
}

function showToast(text, type = '') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = text;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
}

// THREE.JS SETUP
const container = document.getElementById('canvasContainer');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x3a9bdc);
scene.fog = new THREE.FogExp2(0x3a9bdc, 0.005);

const camera = new THREE.PerspectiveCamera(60, 400 / 260, 0.1, 2000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(400, 260);
container.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.8));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(100, 200, 100);
scene.add(dirLight);

// OCEAN
const oceanMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(3000, 3000),
    new THREE.MeshLambertMaterial({ color: 0x0055aa, transparent: true, opacity: 0.85 })
);
oceanMesh.rotation.x = -Math.PI / 2;
scene.add(oceanMesh);

// 8 ISLANDS DEFINITION
const islandsData = [
    { name: "Starter Island", minLv: 1, color: 0x2e8b57, pos: { x: 0, z: 0 }, radius: 70, height: 10, m1: { name: "Bandit", color: 0x8b4513 }, m2: { name: "Bandit Boss", color: 0x5c2e0b } },
    { name: "Jungle Island", minLv: 30, color: 0x006400, pos: { x: 250, z: 0 }, radius: 65, height: 12, m1: { name: "Monkey", color: 0x663300 }, m2: { name: "Gorilla King", color: 0x331a00 } },
    { name: "Pirate Island", minLv: 80, color: 0x8b4513, pos: { x: 500, z: 180 }, radius: 70, height: 10, m1: { name: "Pirate Recruit", color: 0x990000 }, m2: { name: "Bobby Captain", color: 0x4d0000 } },
    { name: "Desert Island", minLv: 150, color: 0xedc9af, pos: { x: 500, z: -180 }, radius: 70, height: 8, m1: { name: "Desert Bandit", color: 0xcc9900 }, m2: { name: "Desert Officer", color: 0x806000 } },
    { name: "Snow Island", minLv: 230, color: 0xf0f8ff, pos: { x: 750, z: 250 }, radius: 70, height: 15, m1: { name: "Snow Bandit", color: 0xb0c4de }, m2: { name: "Yeti Boss", color: 0x4682b4 } },
    { name: "Marine Fortress", minLv: 320, color: 0x708090, pos: { x: 750, z: -250 }, radius: 70, height: 16, m1: { name: "Marine Officer", color: 0x000080 }, m2: { name: "Vice Admiral", color: 0x000033 } },
    { name: "Skypiea", minLv: 400, color: 0xffffff, pos: { x: 1000, z: 0 }, radius: 70, height: 35, m1: { name: "Sky Bandit", color: 0xffe4b5 }, m2: { name: "God Guard", color: 0xdaa520 } },
    { name: "Dark Arena", minLv: 480, color: 0x111111, pos: { x: 1250, z: 0 }, radius: 80, height: 12, m1: { name: "Dark Skeleton", color: 0x333333 }, m2: { name: "Dark Master", color: 0x000000 } }
];

let npcs = [];
let safeZones = [];
let monsters = [];

function createTextBoard(text, colorHex) {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = "#000000"; ctx.fillRect(0, 0, 256, 64);
    ctx.strokeStyle = colorHex; ctx.lineWidth = 6; ctx.strokeRect(0, 0, 256, 64);
    ctx.fillStyle = colorHex; ctx.font = "bold 18px Kanit"; ctx.textAlign = "center";
    ctx.fillText(text, 128, 40);

    const texture = new THREE.CanvasTexture(canvas);
    return new THREE.Mesh(new THREE.PlaneGeometry(7, 1.8), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }));
}

// BUILD WORLD & INITIAL SPAWN MONSTERS
islandsData.forEach(isl => {
    const geo = new THREE.CylinderGeometry(isl.radius, isl.radius + 5, isl.height, 32);
    const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: isl.color }));
    mesh.position.set(isl.pos.x, isl.height / 2, isl.pos.z);
    scene.add(mesh);

    const szGeo = new THREE.RingGeometry(0, 20, 32);
    const szMesh = new THREE.Mesh(szGeo, new THREE.MeshBasicMaterial({ color: 0x00ff66, transparent: true, opacity: 0.25, side: THREE.DoubleSide }));
    szMesh.rotation.x = -Math.PI / 2;
    szMesh.position.set(isl.pos.x, isl.height + 0.05, isl.pos.z);
    scene.add(szMesh);

    safeZones.push({ x: isl.pos.x, z: isl.pos.z, radius: 20 });
    createNPC(isl.pos.x - 10, isl.height, isl.pos.z - 10, 0xffcc00, `Quest_${isl.name}`, 'quest', isl, "📜 เควส");

    if (isl.name === "Starter Island") createNPC(isl.pos.x + 10, isl.height, isl.pos.z + 10, 0x0000ff, "NPC_Sword", 'sword', null, "🗡️ ร้านดาบ");
    if (isl.name === "Jungle Island") createNPC(isl.pos.x + 10, isl.height, isl.pos.z + 10, 0x9900cc, "NPC_Fruit", 'fruit', null, "🎰 สุ่มผลไม้");
    if (isl.name === "Pirate Island") createNPC(isl.pos.x + 10, isl.height, isl.pos.z - 10, 0x00ffff, "NPC_Haki", 'haki', null, "🔮 ร้านฮาคิ");

    // Immediately spawn 3 monsters per island
    for (let i = 0; i < 3; i++) {
        spawnSingleMonster(isl);
    }
});

function createNPC(x, surfaceY, z, color, id, type, islandData = null, boardLabel = "") {
    const npcGroup = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.5, 1), new THREE.MeshLambertMaterial({ color }));
    body.position.y = 1.25;
    npcGroup.add(body);

    if (boardLabel) {
        const board = createTextBoard(boardLabel, "#ffcc00");
        board.position.set(0, 4, 0);
        npcGroup.add(board);
    }

    npcGroup.position.set(x, surfaceY, z);
    scene.add(npcGroup);
    npcs.push({ group: npcGroup, id, type, islandData, pos: new THREE.Vector3(x, surfaceY, z) });
}

function spawnSingleMonster(isl) {
    const isBoss = Math.random() < 0.25;
    const monsterType = isBoss ? isl.m2 : isl.m1;
    const scale = isBoss ? 2.0 : 1.1;

    const mGroup = new THREE.Group();
    const mBody = new THREE.Mesh(new THREE.BoxGeometry(1.4 * scale, 1.8 * scale, 0.8 * scale), new THREE.MeshLambertMaterial({ color: monsterType.color }));
    mBody.position.y = 0.9 * scale;
    mGroup.add(mBody);

    const label = createTextBoard(`${isBoss ? '👑' : '👾'} ${monsterType.name}`, isBoss ? "#ff0000" : "#ffffff");
    label.position.set(0, 3.5 * scale, 0);
    mGroup.add(label);

    const angle = Math.random() * Math.PI * 2;
    const dist = 25 + Math.random() * (isl.radius - 35);
    const x = isl.pos.x + Math.cos(angle) * dist;
    const z = isl.pos.z + Math.sin(angle) * dist;

    mGroup.position.set(x, isl.height, z);
    scene.add(mGroup);

    const baseHp = (40 + isl.minLv * 15) * (isBoss ? 3.5 : 1);
    monsters.push({
        mesh: mGroup,
        hp: baseHp,
        maxHp: baseHp,
        isBoss,
        name: monsterType.name,
        islandData: isl,
        exp: (30 + isl.minLv * 6) * (isBoss ? 3 : 1),
        gold: (25 + isl.minLv * 5) * (isBoss ? 3 : 1)
    });
}

// PLAYER MESH
const playerGroup = new THREE.Group();
const torsoMat = new THREE.MeshLambertMaterial({ color: 0xff1a1a });

const head = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0xffcc99 }));
head.position.y = 2.2;
playerGroup.add(head);

const torso = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.6, 0.8), torsoMat);
torso.position.y = 1.0;
playerGroup.add(torso);

const swordMesh = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.2, 0.3), new THREE.MeshLambertMaterial({ color: 0xcccccc }));
swordMesh.position.set(1.0, 1.0, 0.4);
playerGroup.add(swordMesh);

const fruitMeshMat = new THREE.MeshLambertMaterial({ color: 0x9900cc });
const fruitMesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), fruitMeshMat);
fruitMesh.position.set(-1.0, 1.0, 0.4);
playerGroup.add(fruitMesh);

playerGroup.position.set(0, 10, 0);
scene.add(playerGroup);

// ADVANCED VISUAL PARTICLES SYSTEM
function createAdvancedEffect(pos, colorHex = 0xffa500, count = 25, isBurst = false) {
    for (let i = 0; i < count; i++) {
        const size = isBurst ? (0.3 + Math.random() * 0.4) : (0.15 + Math.random() * 0.2);
        const pGeo = new THREE.SphereGeometry(size, 8, 8);
        const pMat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 1 });
        const pMesh = new THREE.Mesh(pGeo, pMat);
        pMesh.position.copy(pos);

        const speed = isBurst ? 1.2 : 0.6;
        const vel = new THREE.Vector3(
            (Math.random() - 0.5) * speed,
            Math.random() * speed * 0.8,
            (Math.random() - 0.5) * speed
        );

        scene.add(pMesh);
        particles.push({ mesh: pMesh, vel, life: 1.0, fade: 0.03 + Math.random() * 0.02 });
    }
}

// KEYBOARD CONTROLS
const keys = {};
window.addEventListener('keydown', e => {
    keys[e.code] = true;

    if (e.code === 'Digit1') selectWeapon('Combat');
    if (e.code === 'Digit2') selectWeapon('Sword');
    if (e.code === 'Digit3') selectWeapon('Fruit');

    if (e.code === 'Space' && isGrounded) {
        playerVelocityY = 0.45;
        isGrounded = false;
    }

    if (e.code === 'KeyQ') performDash();

    if (e.code === 'KeyJ') {
        if (!playerData.hasArmHaki) return showToast("❌ คุณยังไม่มีฮาคิเกราะ!", "item");
        isArmHakiActive = !isArmHakiActive;
        torsoMat.color.setHex(isArmHakiActive ? 0x111111 : 0xff1a1a);
        showToast(isArmHakiActive ? "🖤 เปิดฮาคิเกราะ" : "⚪ ปิดฮาคิเกราะ", "level-up");
        updateUI();
    }

    if (e.code === 'KeyK') {
        if (!playerData.hasObsHaki) return showToast("❌ คุณยังไม่มีฮาคิสังเกต!", "item");
        isObsHakiActive = !isObsHakiActive;
        scene.background.setHex(isObsHakiActive ? 0x001122 : 0x3a9bdc);
        showToast(isObsHakiActive ? "👁️ เปิดฮาคิสังเกต" : "👁️ ปิดฮาคิสังเกต", "level-up");
        updateUI();
    }

    if (e.code === 'KeyZ') triggerSkill('Z');
    if (e.code === 'KeyX') triggerSkill('X');
    if (e.code === 'KeyC') triggerSkill('C');
});
window.addEventListener('keyup', e => keys[e.code] = false);

// STAMINA DASH (Q)
function performDash() {
    if (dashCooldown) return;
    if (playerData.stamina < skillConfig.Dash.stamina) return showToast("❌ Stamina ไม่พอ!", "item");

    playerData.stamina -= skillConfig.Dash.stamina;
    dashCooldown = true;

    // Dash Impulse
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(playerGroup.quaternion);
    playerGroup.position.addScaledVector(dir, 12);

    createAdvancedEffect(playerGroup.position, 0x00ffff, 20, true);
    showToast("⚡ DASH!", "quest");

    setTimeout(() => { dashCooldown = false; }, skillConfig.Dash.cd);
    updateUI();
}

// WEAPON SKILL SYSTEM
function triggerSkill(key) {
    const w = playerData.selectedWeapon;
    const now = Date.now();

    if (cooldowns[w][key] > now) {
        const left = Math.ceil((cooldowns[w][key] - now) / 1000);
        return showToast(`⏳ สกิล [${key}] (${w}) รออีก ${left}s`, 'item');
    }

    const cfg = skillConfig[key];
    if (playerData.stamina < cfg.stamina) return showToast("❌ Stamina ไม่พอ!", "item");

    playerData.stamina -= cfg.stamina;
    cooldowns[w][key] = now + cfg.cd;

    let skillMultiplier = key === 'Z' ? 2.2 : key === 'X' ? 3.8 : 5.5;
    let baseDmg = 20;

    if (w === 'Combat') baseDmg += playerData.stats.melee * 6;
    else if (w === 'Sword') baseDmg += playerData.stats.sword * 8;
    else if (w === 'Fruit') baseDmg += playerData.stats.fruit * 10;

    let totalDmg = baseDmg * skillMultiplier;
    if (isArmHakiActive) totalDmg *= 1.5;

    let effColor = w === 'Combat' ? 0xffcc00 : w === 'Sword' ? 0x00ffff : 0x9900cc;
    if (w === 'Fruit' && playerData.fruit) {
        const fruitObj = FRUITS_DATABASE.find(f => f.name === playerData.fruit);
        if (fruitObj) effColor = fruitObj.color;
    }

    monsters.forEach((m, idx) => {
        if (playerGroup.position.distanceTo(m.mesh.position) < 16) {
            m.hp -= totalDmg;
            createAdvancedEffect(m.mesh.position, effColor, 25, true);

            if (m.hp <= 0) {
                scene.remove(m.mesh);
                const isl = m.islandData;
                monsters.splice(idx, 1);
                addExp(m.exp);
                playerData.gold += m.gold;

                if (playerData.quest && playerData.quest.targetIsland === isl.name) {
                    playerData.quest.count++;
                    if (playerData.quest.count >= playerData.quest.max) {
                        showToast(`✨ เควสสำเร็จ! รับ +${playerData.quest.expReward} EXP`, 'quest');
                        addExp(playerData.quest.expReward);
                        playerData.gold += playerData.quest.goldReward;
                        playerData.quest = null;
                    }
                }
                setTimeout(() => spawnSingleMonster(isl), 4000);
            }
        }
    });

    createAdvancedEffect(playerGroup.position, effColor, 35, true);
    showToast(`💥 ใช้สกิล [${key}]! (-${cfg.stamina} Stamina)`, 'level-up');

    startVisualCooldown(key, cfg.cd);
    updateUI();
    saveData();
}

function startVisualCooldown(key, duration) {
    const overlay = document.getElementById(`cd${key}`);
    let start = Date.now();

    const interval = setInterval(() => {
        let elapsed = Date.now() - start;
        let percent = 100 - (elapsed / duration) * 100;

        if (overlay) overlay.style.height = `${Math.max(0, percent)}%`;

        if (elapsed >= duration) {
            clearInterval(interval);
            if (overlay) overlay.style.height = '0%';
        }
    }, 50);
}

// WEAPON SELECTION
function selectWeapon(type) {
    if (type === 'Sword' && !playerData.hasSword) return showToast("❌ คุณยังไม่มีดาบ!", "item");
    if (type === 'Fruit' && !playerData.fruit) return showToast("❌ คุณยังไม่มีผลปีศาจ!", "item");

    playerData.selectedWeapon = type;
    swordMesh.visible = (type === 'Sword');
    fruitMesh.visible = (type === 'Fruit');

    if (type === 'Fruit' && playerData.fruit) {
        const fruitObj = FRUITS_DATABASE.find(f => f.name === playerData.fruit);
        if (fruitObj) fruitMeshMat.color.setHex(fruitObj.color);
    }

    document.querySelectorAll('.hotbar-slot').forEach(el => el.classList.remove('active'));
    if (type === 'Combat') document.getElementById('slot1')?.classList.add('active');
    if (type === 'Sword') document.getElementById('slot2')?.classList.add('active');
    if (type === 'Fruit') document.getElementById('slot3')?.classList.add('active');

    updateSkillNames();
    refreshCooldownUI();
}

function refreshCooldownUI() {
    const w = playerData.selectedWeapon;
    const now = Date.now();

    ['Z', 'X', 'C'].forEach(key => {
        const overlay = document.getElementById(`cd${key}`);
        if (cooldowns[w][key] > now) {
            const left = cooldowns[w][key] - now;
            const maxCd = skillConfig[key].cd;
            if (overlay) overlay.style.height = `${(left / maxCd) * 100}%`;
        } else {
            if (overlay) overlay.style.height = '0%';
        }
    });
}

function updateSkillNames() {
    let z = "Punch Rush", x = "Smash", c = "Heavy Strike";

    if (playerData.selectedWeapon === 'Sword') {
        z = "Slash", x = "Air Blade", c = "Dragon Slash";
    } else if (playerData.selectedWeapon === 'Fruit' && playerData.fruit) {
        const f = FRUITS_DATABASE.find(item => item.name === playerData.fruit);
        if (f) { z = f.skills.Z; x = f.skills.X; c = f.skills.C; }
    }

    document.getElementById('nameZ').innerText = z;
    document.getElementById('nameX').innerText = x;
    document.getElementById('nameC').innerText = c;
}

// ATTACK
let isAttacking = false;
renderer.domElement.addEventListener('click', () => {
    if (isAttacking) return;
    isAttacking = true;

    let count = 0;
    const anim = setInterval(() => {
        if (playerData.selectedWeapon === 'Sword') swordMesh.rotation.x -= 0.3;
        else playerGroup.rotation.y += 0.1;
        count++;
        if (count > 5) {
            clearInterval(anim);
            swordMesh.rotation.x = 0;
            isAttacking = false;
        }
    }, 20);

    let dmg = 12;
    const w = playerData.selectedWeapon;
    if (w === 'Combat') dmg += playerData.stats.melee * 4;
    else if (w === 'Sword') dmg += playerData.stats.sword * 7;
    else if (w === 'Fruit') dmg += playerData.stats.fruit * 9;

    if (isArmHakiActive) dmg *= 1.8;

    monsters.forEach((m, idx) => {
        if (playerGroup.position.distanceTo(m.mesh.position) < 7) {
            m.hp -= dmg;
            createAdvancedEffect(m.mesh.position, 0xff0000, 8);
            if (m.hp <= 0) {
                scene.remove(m.mesh);
                const isl = m.islandData;
                monsters.splice(idx, 1);
                addExp(m.exp);
                playerData.gold += m.gold;

                if (playerData.quest && playerData.quest.targetIsland === isl.name) {
                    playerData.quest.count++;
                    if (playerData.quest.count >= playerData.quest.max) {
                        showToast(`✨ เควสสำเร็จ! รับ +${playerData.quest.expReward} EXP`, 'quest');
                        addExp(playerData.quest.expReward);
                        playerData.gold += playerData.quest.goldReward;
                        playerData.quest = null;
                    }
                }
                setTimeout(() => spawnSingleMonster(isl), 4000);
                updateUI();
                saveData();
            }
        }
    });
});

// INTERACTION NPC
let currentNearNPC = null;
function checkNPCProximity() {
    currentNearNPC = null;
    const actionBtn = document.getElementById('actionBtn');

    npcs.forEach(npc => {
        if (playerGroup.position.distanceTo(npc.pos) < 6.0) currentNearNPC = npc;
    });

    if (currentNearNPC) {
        actionBtn.style.display = 'block';
        if (currentNearNPC.type === 'quest') actionBtn.innerText = `📜 รับเควส (${currentNearNPC.islandData.name})`;
        else if (currentNearNPC.type === 'sword') actionBtn.innerText = `🗡️ ซื้อ Katana (100 Gold)`;
        else if (currentNearNPC.type === 'fruit') actionBtn.innerText = `🎰 สุ่มผลปีศาจ (250 Gold)`;
        else if (currentNearNPC.type === 'haki') actionBtn.innerText = `🔮 ซื้อฮาคิเกราะ/สังเกต (500 Gold)`;
    } else {
        actionBtn.style.display = 'none';
    }
}

document.getElementById('actionBtn').onclick = () => {
    if (!currentNearNPC) return;

    if (currentNearNPC.type === 'quest') {
        const isl = currentNearNPC.islandData;
        playerData.quest = { targetIsland: isl.name, count: 0, max: 3, expReward: 160 + isl.minLv * 6, goldReward: 90 + isl.minLv * 5 };
        showToast(`📜 รับเควส: ตีมอนเกาะ ${isl.name} (0/3)`, 'quest');
    } else if (currentNearNPC.type === 'sword') {
        if (playerData.gold >= 100) { playerData.gold -= 100; playerData.hasSword = true; selectWeapon('Sword'); showToast('🗡️ ซื้อ Katana สำเร็จ!', 'item'); }
    } else if (currentNearNPC.type === 'fruit') {
        if (playerData.gold >= 250) {
            playerData.gold -= 250;
            const picked = FRUITS_DATABASE[Math.floor(Math.random() * FRUITS_DATABASE.length)];
            playerData.fruit = picked.name;
            selectWeapon('Fruit');
            showToast(`🎉 สุ่มได้ผลปีศาจ: ${playerData.fruit}`, 'item');
        }
    } else if (currentNearNPC.type === 'haki') {
        if (playerData.gold >= 500) {
            playerData.gold -= 500;
            playerData.hasArmHaki = true;
            playerData.hasObsHaki = true;
            showToast('🔮 ปลดล็อกฮาคิเกราะ (J) และ ฮาคิสังเกต (K)!', 'level-up');
        }
    }
    updateUI();
    saveData();
};

function addExp(amount) {
    if (playerData.level >= 500) return;
    playerData.exp += amount;
    if (playerData.exp >= playerData.maxExp) {
        playerData.exp -= playerData.maxExp;
        playerData.level++;
        playerData.statPoints += 3;
        playerData.maxExp = Math.floor(playerData.maxExp * 1.25);
        recalcStats();
        playerData.hp = playerData.maxHp;
        playerData.stamina = playerData.maxStamina;
        showToast(`🎉 LEVEL UP! Level ${playerData.level}`, 'level-up');
    }
    updateUI();
    saveData();
}

function updateUI() {
    recalcStats();
    document.getElementById('hpText').innerText = `${Math.ceil(playerData.hp)}/${playerData.maxHp}`;
    document.getElementById('levelText').innerText = `${playerData.level}`;
    document.getElementById('goldText').innerText = playerData.gold;

    document.getElementById('staminaText').innerText = `⚡ Stamina: ${Math.ceil(playerData.stamina)}/${playerData.maxStamina}`;
    document.getElementById('staminaFill').style.width = `${Math.min(100, (playerData.stamina / playerData.maxStamina) * 100)}%`;

    document.getElementById('expText').innerText = `EXP: ${playerData.exp}/${playerData.maxExp}`;
    document.getElementById('expFill').style.width = `${Math.min(100, (playerData.exp / playerData.maxExp) * 100)}%`;

    document.getElementById('statPointsText').innerText = playerData.statPoints;
    document.getElementById('meleeLv').innerText = playerData.stats.melee;
    document.getElementById('swordLv').innerText = playerData.stats.sword;
    document.getElementById('fruitLv').innerText = playerData.stats.fruit;
    document.getElementById('defLv').innerText = playerData.stats.def;

    const armBadge = document.getElementById('armHakiBadge');
    const obsBadge = document.getElementById('obsHakiBadge');
    armBadge.className = `haki-badge ${isArmHakiActive ? 'active-arm' : 'disabled'}`;
    armBadge.innerText = `J: ฮาคิเกราะ [${isArmHakiActive ? 'ON' : 'OFF'}]`;
    obsBadge.className = `haki-badge ${isObsHakiActive ? 'active-obs' : 'disabled'}`;
    obsBadge.innerText = `K: ฮาคิสังเกต [${isObsHakiActive ? 'ON' : 'OFF'}]`;

    const tracker = document.getElementById('questTracker');
    if (playerData.quest) {
        tracker.style.display = 'block';
        document.getElementById('questDesc').innerText = `เกาะ ${playerData.quest.targetIsland} (${playerData.quest.count}/${playerData.quest.max})`;
        document.getElementById('questReward').innerText = `+${playerData.quest.expReward} EXP | +${playerData.quest.goldReward} Gold`;
    } else tracker.style.display = 'none';

    selectWeapon(playerData.selectedWeapon || 'Combat');
}

function toggleStatMenu() {
    const menu = document.getElementById('statMenu');
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}

function addStat(type) {
    if (playerData.statPoints <= 0) return;
    playerData.statPoints--;
    playerData.stats[type]++;
    recalcStats();
    updateUI();
    saveData();
}

// GAME LOOP
function animate() {
    requestAnimationFrame(animate);

    // Regenerate Stamina
    if (playerData.stamina < playerData.maxStamina) {
        playerData.stamina += 0.25;
        if (playerData.stamina > playerData.maxStamina) playerData.stamina = playerData.maxStamina;
        document.getElementById('staminaText').innerText = `⚡ Stamina: ${Math.ceil(playerData.stamina)}/${playerData.maxStamina}`;
        document.getElementById('staminaFill').style.width = `${Math.min(100, (playerData.stamina / playerData.maxStamina) * 100)}%`;
    }

    let currentGroundY = 0;
    inSafeZone = false;

    islandsData.forEach(isl => {
        const dx = playerGroup.position.x - isl.pos.x;
        const dz = playerGroup.position.z - isl.pos.z;
        if (Math.sqrt(dx * dx + dz * dz) < isl.radius) currentGroundY = isl.height;
    });

    safeZones.forEach(sz => {
        const dx = playerGroup.position.x - sz.x;
        const dz = playerGroup.position.z - sz.z;
        if (Math.sqrt(dx * dx + dz * dz) < sz.radius) inSafeZone = true;
    });

    document.getElementById('safezoneBadge').style.display = inSafeZone ? 'block' : 'none';

    playerVelocityY -= 0.02;
    playerGroup.position.y += playerVelocityY;

    if (playerGroup.position.y <= currentGroundY) {
        playerGroup.position.y = currentGroundY;
        playerVelocityY = 0;
        isGrounded = true;
    }

    const moveSpeed = playerGroup.position.y <= 0 ? 0.1 : 0.25;
    if (keys['KeyW']) playerGroup.translateZ(-moveSpeed);
    if (keys['KeyS']) playerGroup.translateZ(moveSpeed);
    if (keys['KeyA']) playerGroup.rotation.y += 0.05;
    if (keys['KeyD']) playerGroup.rotation.y -= 0.05;

    const camOffset = new THREE.Vector3(0, 7, 14).applyMatrix4(playerGroup.matrixWorld);
    camera.position.lerp(camOffset, 0.1);
    camera.lookAt(playerGroup.position.x, playerGroup.position.y + 1.5, playerGroup.position.z);

    // Particle Render Loop
    particles.forEach((p, index) => {
        p.mesh.position.add(p.vel);
        p.life -= p.fade;
        p.mesh.material.opacity = p.life;
        if (p.life <= 0) {
            scene.remove(p.mesh);
            particles.splice(index, 1);
        }
    });

    checkNPCProximity();

    // AI Aggro Behavior
    monsters.forEach(m => {
        const dist = m.mesh.position.distanceTo(playerGroup.position);
        if (dist < 12 && dist > 2 && !inSafeZone) {
            m.mesh.lookAt(playerGroup.position.x, m.mesh.position.y, playerGroup.position.z);
            m.mesh.translateZ(0.06);
        } else if (dist <= 2 && !inSafeZone) {
            if (isObsHakiActive && Math.random() < 0.5) {
                showToast("⚡ ฮาคิสังเกตทำงาน!", "level-up");
            } else {
                playerData.hp -= m.isBoss ? 0.8 : 0.2;
                if (playerData.hp <= 0) {
                    playerData.hp = playerData.maxHp;
                    playerGroup.position.set(0, 10, 0);
                    showToast('💀 คุณสลบ! วาร์ปกลับจุดเริ่มต้น', 'item');
                }
                updateUI();
            }
        }
    });

    renderer.render(scene, camera);
}

document.getElementById('resetDataBtn').onclick = async () => {
    if (confirm('ต้องการรีเซ็ตข้อมูลเซฟใช่หรือไม่?')) {
        try { await db.collection("bloxfruits_save").doc(userId).delete(); } catch(e) {}
        localStorage.removeItem('blox_fruits_3d_data');
        location.reload();
    }
};

loadData();
animate();