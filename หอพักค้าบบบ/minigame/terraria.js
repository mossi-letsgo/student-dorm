const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const TILE_SIZE = 16;
const COLS = 20; // 320px / 16
const ROWS = 12; // 192px / 16 (~200px)

// โลก (World Grid) - 0: อากาศ, 1: ดิน, 2: หญ้า, 3: ลำต้นไม้, 4: ใบไม้, 5: บล็อกไม้สร้างบ้าน
let world = [];
let trees = [];

// ทรัพยากรผู้เล่น
let inventory = { wood: 0, blocks: 0, hasSword: false };
let selectedTool = 'axe'; // 'axe', 'sword', 'block'
let kills = 0;
let isGameOver = false;

// ระบบเวลา (Day/Night)
let gameTime = 0; // 0 - 2000
let isNight = false;

// ตัวละครหลัก
const player = {
    x: 100,
    y: 80,
    width: 12,
    height: 22,
    vx: 0,
    vy: 0,
    speed: 2,
    hp: 100,
    maxHp: 100,
    isGrounded: false
};

// มอนสเตอร์
let monsters = [];

// ปุ่มกด
const keys = {};
window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup', e => keys[e.code] = false);

// สลับเครื่องมือ
function selectTool(tool) {
    selectedTool = tool;
    document.querySelectorAll('.slot').forEach(el => el.classList.remove('active'));
    if(tool === 'axe') document.getElementById('slotAxe').classList.add('active');
    if(tool === 'sword') document.getElementById('slotSword').classList.add('active');
    if(tool === 'block') document.getElementById('slotBlock').classList.add('active');
}

// ระบบคราฟต์
function craftItem(item) {
    if (item === 'block' && inventory.wood >= 3) {
        inventory.wood -= 3;
        inventory.blocks += 2;
    } else if (item === 'sword' && inventory.wood >= 5 && !inventory.hasSword) {
        inventory.wood -= 5;
        inventory.hasSword = true;
        alert("⚔️ คุณได้คราฟต์ดาบไม้สำเร็จแล้ว!");
    }
    updateUI();
}

function updateUI() {
    document.getElementById('woodCount').innerText = inventory.blocks;
    document.getElementById('hpText').innerText = `${Math.ceil(player.hp)}/100`;
    document.getElementById('killText').innerText = kills;
}

// สร้างแมพเริ่มต้น
function initWorld() {
    world = Array(ROWS).fill(0).map(() => Array(COLS).fill(0));

    // สร้างพื้นดิน
    for (let r = 8; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            world[r][c] = (r === 8) ? 2 : 1;
        }
    }

    // สร้างต้นไม้
    spawnTree(4);
    spawnTree(10);
    spawnTree(15);
}

function spawnTree(col) {
    for (let i = 1; i <= 3; i++) world[8 - i][col] = 3; // ลำต้น
    world[8 - 4][col] = 4; // ใบไม้
    world[8 - 4][col - 1] = 4;
    world[8 - 4][col + 1] = 4;
}

// สปอว์นมอนสเตอร์
function spawnMonster() {
    if (monsters.length >= (isNight ? 4 : 1)) return;
    const spawnX = Math.random() < 0.5 ? 10 : 290;
    monsters.push({
        x: spawnX,
        y: 100,
        width: 14,
        height: 14,
        vx: spawnX < 150 ? 0.8 : -0.8,
        hp: 20,
        type: isNight ? 'zombie' : 'slime'
    });
}

// คลิกขุดไม้ / วางบล็อก / โจมตี
canvas.addEventListener('mousedown', (e) => {
    if (isGameOver) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const gridX = Math.floor((clickX / canvas.width * 320) / TILE_SIZE);
    const gridY = Math.floor((clickY / canvas.height * 192) / TILE_SIZE);

    if (e.button === 0) { // คลิกซ้าย
        if (selectedTool === 'axe') {
            // ตัดไม้
            if (world[gridY] && (world[gridY][gridX] === 3 || world[gridY][gridX] === 4)) {
                world[gridY][gridX] = 0;
                inventory.wood++;
                updateUI();
            }
        } else if (selectedTool === 'sword' || inventory.hasSword) {
            // โจมตีมอนสเตอร์ใกล้ๆ
            monsters.forEach((m, idx) => {
                if (Math.abs(m.x - clickX) < 40 && Math.abs(m.y - clickY) < 40) {
                    m.hp -= (inventory.hasSword ? 15 : 8);
                    if (m.hp <= 0) {
                        monsters.splice(idx, 1);
                        kills++;
                        updateUI();
                    }
                }
            });
        } else if (selectedTool === 'block' && inventory.blocks > 0) {
            // วางบล็อกไม้
            if (world[gridY] && world[gridY][gridX] === 0) {
                world[gridY][gridX] = 5;
                inventory.blocks--;
                updateUI();
            }
        }
    } else if (e.button === 2) { // คลิกขวา ลบบล็อก
        if (world[gridY] && world[gridY][gridX] === 5) {
            world[gridY][gridX] = 0;
            inventory.blocks++;
            updateUI();
        }
    }
});
canvas.addEventListener('contextmenu', e => e.preventDefault());

// อัปเดตฟิสิกส์ & เกมลูป
function update() {
    if (isGameOver) return;

    // เวลา (Day/Night)
    gameTime = (gameTime + 1) % 2400;
    isNight = gameTime > 1200;
    document.getElementById('timeText').innerText = isNight ? '🌙 กลางคืน' : '☀️ กลางวัน';
    canvas.style.backgroundColor = isNight ? '#0b0d1a' : '#87ceeb';

    // การเดิน
    player.vx = 0;
    if (keys['KeyA'] || keys['ArrowLeft']) player.vx = -player.speed;
    if (keys['KeyD'] || keys['ArrowRight']) player.vx = player.speed;

    if ((keys['Space'] || keys['KeyW'] || keys['ArrowUp']) && player.isGrounded) {
        player.vy = -6.5;
        player.isGrounded = false;
    }

    // ฟิสิกส์ gravity
    player.vy += 0.4;
    player.x += player.vx;
    player.y += player.vy;

    // ชนขอบพื้นดิน
    if (player.y + player.height >= 128) {
        player.y = 128 - player.height;
        player.vy = 0;
        player.isGrounded = true;
    }

    // อัปเดตมอนสเตอร์
    if (Math.random() < 0.01) spawnMonster();

    monsters.forEach(m => {
        m.x += m.vx;
        if (m.x < 0 || m.x > 300) m.vx *= -1;

        // ชนผู้เล่น
        if (
            player.x < m.x + m.width &&
            player.x + player.width > m.x &&
            player.y < m.y + m.height &&
            player.y + player.height > m.y
        ) {
            player.hp -= 0.5;
            updateUI();
            if (player.hp <= 0) {
                isGameOver = true;
                document.getElementById('gameOverMsg').style.display = 'block';
            }
        }
    });
}

function draw() {
    ctx.clearRect(0, 0, 320, 192);

    // วาด World Blocks
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const tile = world[r][c];
            if (tile === 1) { ctx.fillStyle = '#553311'; ctx.fillRect(c*16, r*16, 16, 16); } // ดิน
            else if (tile === 2) { ctx.fillStyle = '#22aa22'; ctx.fillRect(c*16, r*16, 16, 16); } // หญ้า
            else if (tile === 3) { ctx.fillStyle = '#664422'; ctx.fillRect(c*16 + 4, r*16, 8, 16); } // ไม้
            else if (tile === 4) { ctx.fillStyle = '#118811'; ctx.fillRect(c*16, r*16, 16, 16); } // ใบไม้
            else if (tile === 5) { ctx.fillStyle = '#885522'; ctx.fillRect(c*16, r*16, 16, 16); ctx.strokeRect(c*16, r*16, 16, 16); } // บล็อกบ้าน
        }
    }

    // วาด Player
    ctx.fillStyle = '#ff1a1a';
    ctx.fillRect(player.x, player.y, player.width, player.height);

    // วาด Monsters
    monsters.forEach(m => {
        ctx.fillStyle = m.type === 'zombie' ? '#448844' : '#00ccff';
        ctx.fillRect(m.x, m.y, m.width, m.height);
    });
}

function loop() {
    update();
    draw();
    if (!isGameOver) requestAnimationFrame(loop);
}

document.getElementById('resetBtn').onclick = () => {
    player.hp = 100;
    player.x = 100;
    player.y = 80;
    inventory = { wood: 0, blocks: 0, hasSword: false };
    kills = 0;
    monsters = [];
    isGameOver = false;
    document.getElementById('gameOverMsg').style.display = 'none';
    initWorld();
    updateUI();
    loop();
};

initWorld();
updateUI();
loop();