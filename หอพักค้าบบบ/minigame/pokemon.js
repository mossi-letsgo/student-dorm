const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// รายชื่อ 5 โปเกมอน (พร้อมท่าไม้ตาย & สเตตัส)
const POKEMONS = [
    { id: 'pikachu', name: '⚡ PIKACHU', color: '#ffcc00', hp: 100, atk: 18, skillName: 'THUNDERBOLT', skillDmg: 35, skillCd: 2 },
    { id: 'charizard', name: '🔥 CHARIZARD', color: '#ff4400', hp: 120, atk: 22, skillName: 'FLAMETHROWER', skillDmg: 40, skillCd: 3 },
    { id: 'gengar', name: '👻 GENGAR', color: '#8800cc', hp: 90, atk: 25, skillName: 'SHADOW BALL', skillDmg: 38, skillCd: 2 },
    { id: 'mewtwo', name: '🔮 MEWTWO', color: '#e6b800', hp: 130, atk: 24, skillName: 'PSYSTRIKE', skillDmg: 45, skillCd: 3 },
    { id: 'lucario', name: '🥊 LUCARIO', color: '#0099ff', hp: 110, atk: 20, skillName: 'AURA SPHERE', skillDmg: 36, skillCd: 2 }
];

// รายชื่อสนามประลอง 3 ฉาก
const ARENAS = [
    { name: '🌋 VOLCANO ARENA', bg: '#200505', p1Pad: '#440000', p2Pad: '#661111' },
    { name: '🌌 VOID CAVE', bg: '#080515', p1Pad: '#220044', p2Pad: '#330066' },
    { name: '⚡ CYBER ARENA', bg: '#051520', p1Pad: '#003344', p2Pad: '#004466' }
];

let isPvp = false;
let selectedP1 = POKEMONS[0];
let selectedP2 = POKEMONS[1];
let currentArena = ARENAS[0];

let p1, p2;
let currentTurn = 'P1'; // P1 หรือ P2/BOT
let isGameOver = false;

// โหลดหน้าเลือกตัวละคร
const p1Grid = document.getElementById('p1Chars');
const p2Grid = document.getElementById('p2Chars');

function renderCharSelect() {
    p1Grid.innerHTML = '';
    p2Grid.innerHTML = '';

    POKEMONS.forEach(p => {
        const b1 = document.createElement('div');
        b1.className = `char-card ${selectedP1.id === p.id ? 'selected' : ''}`;
        b1.innerHTML = `<strong>${p.name}</strong><br><small>HP: ${p.hp} | ATK: ${p.atk}</small>`;
        b1.onclick = () => { selectedP1 = p; renderCharSelect(); };
        p1Grid.appendChild(b1);

        const b2 = document.createElement('div');
        b2.className = `char-card ${selectedP2.id === p.id ? 'selected' : ''}`;
        b2.innerHTML = `<strong>${p.name}</strong><br><small>HP: ${p.hp} | ATK: ${p.atk}</small>`;
        b2.onclick = () => { selectedP2 = p; renderCharSelect(); };
        p2Grid.appendChild(b2);
    });
}

// สลับโหมด Bot / PVP
document.getElementById('modeBotBtn').onclick = function() {
    isPvp = false;
    this.classList.add('active');
    document.getElementById('modePvpBtn').classList.remove('active');
    document.getElementById('p2Title').innerText = 'BOT เลือกโปเกมอน';
};

document.getElementById('modePvpBtn').onclick = function() {
    isPvp = true;
    this.classList.add('active');
    document.getElementById('modeBotBtn').classList.remove('active');
    document.getElementById('p2Title').innerText = 'P2 เลือกโปเกมอน';
};

renderCharSelect();

// คลาสสร้างนักสู้
class PokemonFighter {
    constructor(config, isPlayer1) {
        this.name = config.name;
        this.color = config.color;
        this.maxHp = config.hp;
        this.hp = config.hp;
        this.atk = config.atk;
        this.skillName = config.skillName;
        this.skillDmg = config.skillDmg;
        this.maxCd = config.skillCd;
        this.cd = 0;
        this.isDefending = false;
        this.isP1 = isPlayer1;

        // พิกัดวาด
        this.x = isPlayer1 ? 50 : 210;
        this.y = isPlayer1 ? 85 : 35;
    }

    draw() {
        // แท่นยืน
        ctx.fillStyle = this.isP1 ? currentArena.p1Pad : currentArena.p2Pad;
        ctx.beginPath();
        ctx.ellipse(this.x + 20, this.y + 35, 30, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // ตัวโปเกมอน (วาดรูปทรงจำลองสีตามตัวละคร)
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, 40, 35);

        // หมวก/หู
        ctx.fillRect(this.x + 5, this.y - 8, 8, 8);
        ctx.fillRect(this.x + 27, this.y - 8, 8, 8);

        // ตา
        ctx.fillStyle = '#ffffff';
        const eyeX = this.isP1 ? this.x + 24 : this.x + 8;
        ctx.fillRect(eyeX, this.y + 8, 8, 8);
        ctx.fillStyle = '#000000';
        ctx.fillRect(eyeX + 2, this.y + 10, 4, 4);

        // เกราะตอนป้องกัน
        if (this.isDefending) {
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 3;
            ctx.strokeRect(this.x - 4, this.y - 4, 48, 43);
        }
    }
}

// อัปเดตข้อความ Log และ UI HP
function logMsg(txt) {
    document.getElementById('battleLog').innerText = txt;
}

function updateHUD() {
    const p1Pct = Math.max(0, (p1.hp / p1.maxHp) * 100);
    const p2Pct = Math.max(0, (p2.hp / p2.maxHp) * 100);

    const p1Fill = document.getElementById('p1Hp');
    const p2Fill = document.getElementById('p2Hp');

    p1Fill.style.width = p1Pct + '%';
    p2Fill.style.width = p2Pct + '%';

    // เปลี่ยนสี HP
    p1Fill.style.backgroundColor = p1Pct > 50 ? '#00ff66' : p1Pct > 20 ? '#ffcc00' : '#ff1a1a';
    p2Fill.style.backgroundColor = p2Pct > 50 ? '#00ff66' : p2Pct > 20 ? '#ffcc00' : '#ff1a1a';

    document.getElementById('p1HpText').innerText = `${Math.ceil(p1.hp)}/${p1.maxHp}`;
    document.getElementById('p2HpText').innerText = `${Math.ceil(p2.hp)}/${p2.maxHp}`;

    // อัปเดตปุ่มสกิล
    const activePoke = currentTurn === 'P1' ? p1 : p2;
    document.getElementById('btnSkill').innerText = `🔥 ${activePoke.skillName} ${activePoke.cd > 0 ? `(${activePoke.cd})` : ''}`;
    document.getElementById('btnSkill').disabled = activePoke.cd > 0;
}

function drawScene() {
    ctx.fillStyle = currentArena.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    p1.draw();
    p2.draw();
}

// ระบบการโจมตี Turn-Based
function executeTurn(actionType) {
    if (isGameOver) return;

    const attacker = currentTurn === 'P1' ? p1 : p2;
    const defender = currentTurn === 'P1' ? p2 : p1;

    // รีเซ็ตการป้องกันของฝ่ายโจมตี
    attacker.isDefending = false;

    if (actionType === 'atk') {
        let dmg = attacker.atk + Math.floor(Math.random() * 5);
        if (defender.isDefending) dmg = Math.floor(dmg * 0.5);
        defender.hp -= dmg;
        logMsg(`${attacker.name} ใช้โจมตีปกติสร้างความเสียหาย ${dmg}!`);
    } else if (actionType === 'skill') {
        let dmg = attacker.skillDmg + Math.floor(Math.random() * 8);
        if (defender.isDefending) dmg = Math.floor(dmg * 0.5);
        defender.hp -= dmg;
        attacker.cd = attacker.maxCd + 1; // ตั้งค่า Cooldown
        logMsg(`💥 ${attacker.name} ปลดปล่อย ${attacker.skillName} สร้างความเสียหาย ${dmg}!`);
    } else if (actionType === 'def') {
        attacker.isDefending = true;
        logMsg(`🛡️ ${attacker.name} ตั้งการป้องกัน! (ลดดาเมจ 50%)`);
    }

    // ลด Cooldown เมื่อจบตา
    if (attacker.cd > 0) attacker.cd--;

    drawScene();
    updateHUD();

    // เช็คผลแพ้ชนะ
    if (defender.hp <= 0) {
        endGame(attacker.name);
        return;
    }

    // สลับ Turn
    if (currentTurn === 'P1') {
        currentTurn = 'P2';
        if (!isPvp) {
            // ปิดปุ่มระหว่างรอ Bot เล่น
            toggleControlButtons(false);
            setTimeout(botTurn, 1000);
        } else {
            logMsg(`ถึงตาของ P2 (${p2.name})!`);
        }
    } else {
        currentTurn = 'P1';
        toggleControlButtons(true);
        logMsg(`ถึงตาของ P1 (${p1.name})!`);
    }
}

// ระบบบอท AI
function botTurn() {
    if (isGameOver) return;

    if (p2.cd === 0 && Math.random() < 0.6) {
        executeTurn('skill');
    } else if (Math.random() < 0.25) {
        executeTurn('def');
    } else {
        executeTurn('atk');
    }

    if (!isGameOver) toggleControlButtons(true);
}

function toggleControlButtons(enable) {
    document.getElementById('btnAtk').disabled = !enable;
    document.getElementById('btnSkill').disabled = !enable || (currentTurn === 'P1' ? p1.cd > 0 : p2.cd > 0);
    document.getElementById('btnDef').disabled = !enable;
}

function endGame(winnerName) {
    isGameOver = true;
    document.getElementById('winnerText').innerText = `🏆 ${winnerName} WIN!`;
    document.getElementById('gameOverMsg').style.display = 'block';
    toggleControlButtons(false);
}

// ปุ่มเริ่มเกม
document.getElementById('startGameBtn').onclick = function() {
    currentArena = ARENAS[Math.floor(Math.random() * ARENAS.length)];
    document.getElementById('mapName').innerText = currentArena.name.split(' ')[1] || currentArena.name;

    p1 = new PokemonFighter(selectedP1, true);
    p2 = new PokemonFighter(selectedP2, false);

    document.getElementById('p1Name').innerText = p1.name.split(' ')[1] || p1.name;
    document.getElementById('p2Name').innerText = isPvp ? (p2.name.split(' ')[1] || p2.name) : 'BOT';
    document.getElementById('p1PokeName').innerText = p1.name;
    document.getElementById('p2PokeName').innerText = p2.name;

    document.getElementById('selectionScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'block';
    document.getElementById('inGameControls').style.display = 'block';
    document.getElementById('gameOverMsg').style.display = 'none';

    isGameOver = false;
    currentTurn = 'P1';
    toggleControlButtons(true);
    logMsg(`แบทเทิลเริ่มขึ้นแล้ว! ตาของ ${p1.name}`);

    drawScene();
    updateHUD();
};

// Event Listeners ปุ่มกดคำสั่งต่อสู้
document.getElementById('btnAtk').onclick = () => executeTurn('atk');
document.getElementById('btnSkill').onclick = () => executeTurn('skill');
document.getElementById('btnDef').onclick = () => executeTurn('def');

document.getElementById('resetBtn').onclick = function() {
    document.getElementById('selectionScreen').style.display = 'block';
    document.getElementById('gameScreen').style.display = 'none';
    document.getElementById('inGameControls').style.display = 'none';
};