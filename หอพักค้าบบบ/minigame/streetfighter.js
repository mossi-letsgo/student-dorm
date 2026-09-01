const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// รายชื่อ 5 ตัวละคร (พร้อมคุณสมบัติ)
const CHARACTERS = [
    { id: 'red', name: '🔥 RED BRAWLER', color: '#ff1a1a', speed: 3.5, hp: 100, dmg: 12 },
    { id: 'shadow', name: '⚡ SHADOW', color: '#888888', speed: 4.5, hp: 80, dmg: 10 },
    { id: 'tank', name: '🛡️ TANK RED', color: '#990000', speed: 2.5, hp: 130, dmg: 15 },
    { id: 'viper', name: '🐍 VIPER', color: '#ff6600', speed: 4.0, hp: 90, dmg: 14 },
    { id: 'demon', name: '😈 DEMON', color: '#ff0055', speed: 3.8, hp: 110, dmg: 13 }
];

// รายชื่อ 3 สนามสุ่ม
const MAPS = [
    { name: '🌋 VOLCANO ARENA', bg: '#2b0505', floor: '#660000' },
    { name: '🌃 RED NEON CITY', bg: '#08051a', floor: '#ff0055' },
    { name: '⛓️ UNDERGROUND', bg: '#141414', floor: '#444444' }
];

let isPvp = false;
let selectedP1 = CHARACTERS[0];
let selectedP2 = CHARACTERS[1];
let currentMap = MAPS[0];

let isGameOver = false;
let animationFrameId = null;

// สร้างปุ่มเลือกตัวละครใน HTML
const p1Grid = document.getElementById('p1Chars');
const p2Grid = document.getElementById('p2Chars');

function renderCharSelect() {
    p1Grid.innerHTML = '';
    p2Grid.innerHTML = '';

    CHARACTERS.forEach(c => {
        // P1
        const b1 = document.createElement('div');
        b1.className = `char-card ${selectedP1.id === c.id ? 'selected' : ''}`;
        b1.innerText = c.name;
        b1.onclick = () => { selectedP1 = c; renderCharSelect(); };
        p1Grid.appendChild(b1);

        // P2
        const b2 = document.createElement('div');
        b2.className = `char-card ${selectedP2.id === c.id ? 'selected' : ''}`;
        b2.innerText = c.name;
        b2.onclick = () => { selectedP2 = c; renderCharSelect(); };
        p2Grid.appendChild(b2);
    });
}

// สลับโหมด เล่นกับบอท / PVP
document.getElementById('modeBotBtn').onclick = function() {
    isPvp = false;
    this.classList.add('active');
    document.getElementById('modePvpBtn').classList.remove('active');
    document.getElementById('p2Title').innerText = 'BOT ตัวละคร';
};

document.getElementById('modePvpBtn').onclick = function() {
    isPvp = true;
    this.classList.add('active');
    document.getElementById('modeBotBtn').classList.remove('active');
    document.getElementById('p2Title').innerText = 'P2 ตัวละคร';
};

renderCharSelect();

// ตัวละครในการต่อสู้
class Fighter {
    constructor(config, x, isFacingRight) {
        this.name = config.name;
        this.color = config.color;
        this.x = x;
        this.y = 120;
        this.width = 25;
        this.height = 45;
        this.vx = 0;
        this.vy = 0;
        this.speed = config.speed;
        this.maxHp = config.hp;
        this.hp = config.hp;
        this.dmg = config.dmg;
        this.isGrounded = false;
        this.isAttacking = false;
        this.attackTimer = 0;
        this.isFacingRight = isFacingRight;
    }

    draw() {
        // วาดตัว
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // ตา
        ctx.fillStyle = '#fff';
        const eyeX = this.isFacingRight ? this.x + 16 : this.x + 4;
        ctx.fillRect(eyeX, this.y + 8, 5, 5);

        // หมัดตอนโจมตี
        if (this.isAttacking) {
            ctx.fillStyle = '#ffaa00';
            const punchX = this.isFacingRight ? this.x + this.width : this.x - 20;
            ctx.fillRect(punchX, this.y + 15, 20, 10);
        }
    }

    update() {
        this.vy += 0.5; // Gravity
        this.x += this.vx;
        this.y += this.vy;

        if (this.y + this.height >= 175) {
            this.y = 175 - this.height;
            this.vy = 0;
            this.isGrounded = true;
        }

        if (this.x < 0) this.x = 0;
        if (this.x + this.width > canvas.width) this.x = canvas.width - this.width;

        if (this.isAttacking) {
            this.attackTimer--;
            if (this.attackTimer <= 0) this.isAttacking = false;
        }
    }

    attack(target) {
        if (this.isAttacking) return;
        this.isAttacking = true;
        this.attackTimer = 15;

        // เช็คระยะต่อย
        const punchX = this.isFacingRight ? this.x + this.width : this.x - 20;
        if (
            punchX < target.x + target.width &&
            punchX + 20 > target.x &&
            this.y + 15 < target.y + target.height &&
            this.y + 25 > target.y
        ) {
            target.hp = Math.max(0, target.hp - this.dmg);
        }
    }
}

let p1, p2;
const keys = {};

window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup', e => keys[e.code] = false);

// สารบัญปุ่มกด
function handleInput() {
    // P1 Controls (A, D, W, F)
    p1.vx = 0;
    if (keys['KeyA']) { p1.vx = -p1.speed; p1.isFacingRight = false; }
    if (keys['KeyD']) { p1.vx = p1.speed; p1.isFacingRight = true; }
    if (keys['KeyW'] && p1.isGrounded) { p1.vy = -9; p1.isGrounded = false; }
    if (keys['KeyF']) { p1.attack(p2); }

    // P2 / BOT Controls
    if (isPvp) {
        // P2 Controls (Left, Right, Up, L)
        p2.vx = 0;
        if (keys['ArrowLeft']) { p2.vx = -p2.speed; p2.isFacingRight = false; }
        if (keys['ArrowRight']) { p2.vx = p2.speed; p2.isFacingRight = true; }
        if (keys['ArrowUp'] && p2.isGrounded) { p2.vy = -9; p2.isGrounded = false; }
        if (keys['KeyL']) { p2.attack(p1); }
    } else {
        // AI Bot logic Simple
        const dist = p1.x - p2.x;
        p2.isFacingRight = dist > 0;

        if (Math.abs(dist) > 30) {
            p2.vx = dist > 0 ? p2.speed * 0.7 : -p2.speed * 0.7;
        } else {
            p2.vx = 0;
            if (Math.random() < 0.05) p2.attack(p1);
        }

        if (Math.random() < 0.01 && p2.isGrounded) {
            p2.vy = -9;
            p2.isGrounded = false;
        }
    }
}

function updateHpBars() {
    const p1Pct = (p1.hp / p1.maxHp) * 100;
    const p2Pct = (p2.hp / p2.maxHp) * 100;
    document.getElementById('p1Hp').style.width = p1Pct + '%';
    document.getElementById('p2Hp').style.width = p2Pct + '%';

    if (p1.hp <= 0 || p2.hp <= 0) {
        isGameOver = true;
        const winnerMsg = document.getElementById('winnerText');
        if (p1.hp <= 0 && p2.hp <= 0) winnerMsg.innerText = "DRAW!";
        else if (p1.hp > 0) winnerMsg.innerText = `${p1.name} WIN!`;
        else winnerMsg.innerText = `${p2.name} WIN!`;
        document.getElementById('gameOverMsg').style.display = 'block';
    }
}

function loop() {
    // วาดสนามตามฉากที่สุ่มได้
    ctx.fillStyle = currentMap.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = currentMap.floor;
    ctx.fillRect(0, 175, canvas.width, 25);

    if (!isGameOver) {
        handleInput();
        p1.update();
        p2.update();
        updateHpBars();
    }

    p1.draw();
    p2.draw();

    if (!isGameOver) {
        animationFrameId = requestAnimationFrame(loop);
    }
}

// ปุ่มเริ่มเกม
document.getElementById('startGameBtn').onclick = function() {
    // สุ่มแมพ
    currentMap = MAPS[Math.floor(Math.random() * MAPS.length)];
    document.getElementById('mapName').innerText = `MAP: ${currentMap.name}`;

    p1 = new Fighter(selectedP1, 40, true);
    p2 = new Fighter(selectedP2, 230, false);

    document.getElementById('p1Name').innerText = selectedP1.name.split(' ')[1] || selectedP1.name;
    document.getElementById('p2Name').innerText = isPvp ? (selectedP2.name.split(' ')[1] || selectedP2.name) : 'BOT';

    document.getElementById('selectionScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'block';
    document.getElementById('inGameControls').style.display = 'block';
    document.getElementById('gameOverMsg').style.display = 'none';

    isGameOver = false;
    cancelAnimationFrame(animationFrameId);
    loop();
};

// ปุ่มเริ่มใหม่ / กลับไปเลือกตัวละคร
document.getElementById('resetBtn').onclick = function() {
    document.getElementById('selectionScreen').style.display = 'block';
    document.getElementById('gameScreen').style.display = 'none';
    document.getElementById('inGameControls').style.display = 'none';
    cancelAnimationFrame(animationFrameId);
};