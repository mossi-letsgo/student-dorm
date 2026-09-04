const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ปรับขนาด Canvas ให้เต็มหน้าจอเพื่อความสมจริง
canvas.width = 1000;
canvas.height = 600;

// รายชื่อ 5 รถ JDM ระดับตำนาน
const JDM_CARS = [
    { id: 'supra', name: '🚗 Toyota Supra MK4', color: '#ff1a1a', maxSpeed: 10, accel: 0.18, handling: 0.045 },
    { id: 'r34', name: '🏎️ Nissan Skyline R34', color: '#0066ff', maxSpeed: 10.5, accel: 0.20, handling: 0.050 },
    { id: 'rx7', name: '🔰 Mazda RX-7 FD3S', color: '#ffcc00', maxSpeed: 9.8, accel: 0.22, handling: 0.060 },
    { id: 'nsx', name: '🏎️ Honda NSX NA1', color: '#ffffff', maxSpeed: 10.8, accel: 0.17, handling: 0.048 },
    { id: 'evo', name: '🚗 Lancer Evo VI', color: '#ff0055', maxSpeed: 9.5, accel: 0.24, handling: 0.055 }
];

// ขยายแมพให้ใหญ่จริงระดับวงกว้าง (World Boundary: 5000 x 5000)
const WORLD_WIDTH = 5000;
const WORLD_HEIGHT = 5000;

// เส้นทางสนามแข่งขนาดใหญ่ (Checkpoints ทั่วแมพ)
const TRACK_WAYPOINTS = [
    { x: 800, y: 800 },    // 0: Finish Line / Start Line
    { x: 2500, y: 600 },   // 1
    { x: 4200, y: 900 },   // 2
    { x: 4400, y: 2500 },  // 3
    { x: 4000, y: 4200 },  // 4
    { x: 2500, y: 4400 },  // 5
    { x: 800, y: 3800 },   // 6
    { x: 600, y: 2200 }    // 7
];

const TOTAL_LAPS = 3;
let selectedPlayerCar = JDM_CARS[0];
let playerCar;
let botCars = [];
let keys = {};
let isGameOver = false;
let animationFrameId;

// สร้างปุ่มเลือกตัวรถ
const carGrid = document.getElementById('carGrid');

function renderCarSelection() {
    if (!carGrid) return;
    carGrid.innerHTML = '';
    JDM_CARS.forEach(car => {
        const div = document.createElement('div');
        div.className = `car-card ${selectedPlayerCar.id === car.id ? 'selected' : ''}`;
        div.innerHTML = `
            <span>${car.name}</span>
            <span class="car-color-dot" style="background:${car.color}"></span>
        `;
        div.onclick = () => { selectedPlayerCar = car; renderCarSelection(); };
        carGrid.appendChild(div);
    });
}
renderCarSelection();

// คลาสรถแข่ง
class Car {
    constructor(config, x, y, isBot = false, botColor = '#888') {
        this.name = config.name;
        this.color = isBot ? botColor : config.color;
        this.x = x;
        this.y = y;
        this.angle = 0; // Radian
        this.speed = 0;
        this.maxSpeed = config.maxSpeed;
        this.accel = config.accel;
        this.handling = config.handling;
        this.isBot = isBot;

        // ระบบ Checkpoint & Lap นับรอบจริง
        this.nextCheckpoint = 1;
        this.lap = 1;
        this.checkpointPassedCount = 0; // ใช้วัดระยะทางรวมสำหรับจัดอันดับ

        // ระบบ NOS สำหรับผู้เล่น
        this.nos = 100;
        this.isNosActive = false;
    }

    update() {
        if (!this.isBot) {
            // การควบคุมของ PLAYER (รองรับ W, A, S, D, Arrow Keys และปุ่มภาษาไทย)
            const moveUp = keys['KeyW'] || keys['ArrowUp'] || keys['KeyW_TH'] || keys['w'] || keys['W'] || keys['พ'];
            const moveDown = keys['KeyS'] || keys['ArrowDown'] || keys['s'] || keys['S'] || keys['ห'];
            const moveLeft = keys['KeyA'] || keys['ArrowLeft'] || keys['a'] || keys['A'] || keys['ฟ'];
            const moveRight = keys['KeyD'] || keys['ArrowRight'] || keys['d'] || keys['D'] || keys['ก'];
            const useNos = keys['ShiftLeft'] || keys['ShiftRight'];

            if (moveUp) {
                let currentMax = this.maxSpeed;
                if (useNos && this.nos > 0) {
                    currentMax *= 1.4;
                    this.nos -= 0.8;
                    this.isNosActive = true;
                } else {
                    this.isNosActive = false;
                    if (this.nos < 100) this.nos += 0.15;
                }

                if (this.speed < currentMax) this.speed += this.accel;
            } else if (moveDown) {
                if (this.speed > -3) this.speed -= this.accel * 0.7;
            } else {
                this.speed *= 0.97; // แรงเสียดทาน
                if (this.nos < 100) this.nos += 0.2;
                this.isNosActive = false;
            }

            // ระบบบังคับเลี้ยว (องศาการเลี้ยวสมดุลตามความเร็ว)
            if (Math.abs(this.speed) > 0.2) {
                const turnFactor = this.speed > 0 ? 1 : -1;
                if (moveLeft) this.angle -= this.handling * turnFactor;
                if (moveRight) this.angle += this.handling * turnFactor;
            }

        } else {
            // การควบคุมของ BOT (วิ่งเลาะตาม Checkpoint)
            const target = TRACK_WAYPOINTS[this.nextCheckpoint];
            const dx = target.x - this.x;
            const dy = target.y - this.y;
            const targetAngle = Math.atan2(dy, dx);

            let angleDiff = targetAngle - this.angle;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

            if (angleDiff > 0.05) this.angle += this.handling * 0.95;
            else if (angleDiff < -0.05) this.angle -= this.handling * 0.95;

            if (this.speed < this.maxSpeed * 0.92) this.speed += this.accel * 0.85;
        }

        // เคลื่อนที่ตามทิศทางมุม
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;

        // ขอบเขตแมพใหญ่
        this.x = Math.max(100, Math.min(WORLD_WIDTH - 100, this.x));
        this.y = Math.max(100, Math.min(WORLD_HEIGHT - 100, this.y));

        // ระบบตรวจสอบการเข้า Checkpoint และนับรอบจริง
        this.checkCheckpointLogic();
    }

    checkCheckpointLogic() {
        const target = TRACK_WAYPOINTS[this.nextCheckpoint];
        const dist = Math.hypot(target.x - this.x, target.y - this.y);

        // ระยะเข้าใกล้ Checkpoint (ระยะ 220px จากจุดศูนย์กลางเส้นทาง)
        if (dist < 220) {
            this.checkpointPassedCount++;
            this.nextCheckpoint = (this.nextCheckpoint + 1) % TRACK_WAYPOINTS.length;

            // เมื่อวนกลับมาถึงจุดเริ่มต้น (Checkpoint 0) และผ่าน Checkpoint อื่นมาครบแล้ว
            if (this.nextCheckpoint === 1) {
                this.lap++;
            }
        }
    }

    draw(cameraX, cameraY) {
        ctx.save();
        const screenX = this.x - cameraX;
        const screenY = this.y - cameraY;

        ctx.translate(screenX, screenY);
        ctx.rotate(this.angle);

        // ตัวรถ
        ctx.fillStyle = this.color;
        ctx.fillRect(-20, -10, 40, 20);

        // หลังคา / กระจก
        ctx.fillStyle = '#111827';
        ctx.fillRect(-4, -8, 14, 16);

        // ไฟหน้า
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(18, -9, 4, 5);
        ctx.fillRect(18, 4, 4, 5);

        // ไฟท้าย
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-22, -8, 3, 4);
        ctx.fillRect(-22, 4, 3, 4);

        // เอฟเฟกต์ NOS ไนตรัส
        if (this.isNosActive) {
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(-34, -6, 12, 12);
        }

        ctx.restore();
    }
}

// ระบบดักจับการกดคีย์บอร์ด
window.addEventListener('keydown', e => keys[e.code || e.key] = true);
window.addEventListener('keyup', e => keys[e.code || e.key] = false);

function initRace() {
    // ผู้เล่นเริ่มต้นที่จุด Checkpoint 0
    const startX = TRACK_WAYPOINTS[0].x;
    const startY = TRACK_WAYPOINTS[0].y;

    playerCar = new Car(selectedPlayerCar, startX, startY, false);
    playerCar.angle = Math.atan2(TRACK_WAYPOINTS[1].y - startY, TRACK_WAYPOINTS[1].x - startX);

    const botColors = ['#10b981', '#f97316', '#a855f7', '#eab308', '#06b6d4'];
    botCars = [];

    for (let i = 0; i < 5; i++) {
        const randomSpec = JDM_CARS[i % JDM_CARS.length];
        const offsetX = (i % 2 === 0 ? -40 : 40);
        const offsetY = -60 * (i + 1);

        const bot = new Car(randomSpec, startX + offsetX, startY + offsetY, true, botColors[i]);
        bot.name = `BOT ${i + 1}`;
        bot.angle = playerCar.angle;
        botCars.push(bot);
    }
}

// คำนวณอันดับการแข่ง (Rank)
function calculateRank() {
    const allCars = [playerCar, ...botCars];
    allCars.sort((a, b) => b.checkpointPassedCount - a.checkpointPassedCount);

    const rank = allCars.indexOf(playerCar) + 1;
    const rankEl = document.getElementById('rankText');
    if (rankEl) rankEl.innerText = `${rank}/6`;
    return rank;
}

// วาดฉากโลกและพื้นสนามแข่ง
function drawWorldGridAndTrack(cameraX, cameraY) {
    // 1. วาด Grid พื้นหลังแมพใหญ่
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    const gridSize = 200;
    const startX = Math.floor(cameraX / gridSize) * gridSize;
    const startY = Math.floor(cameraY / gridSize) * gridSize;

    for (let x = startX; x < cameraX + canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x - cameraX, 0);
        ctx.lineTo(x - cameraX, canvas.height);
        ctx.stroke();
    }
    for (let y = startY; y < cameraY + canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y - cameraY);
        ctx.lineTo(canvas.width, y - cameraY);
        ctx.stroke();
    }

    // 2. วาดถนนสนามแข่ง (Track Floor)
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 180; // ถนนกว้างขึ้นสำหรับแมพใหญ่
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    TRACK_WAYPOINTS.forEach((wp, idx) => {
        const sx = wp.x - cameraX;
        const sy = wp.y - cameraY;
        if (idx === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
    });
    ctx.closePath();
    ctx.stroke();

    // เส้นขอบสนาม
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 8;
    ctx.stroke();

    // 3. วาดเส้นชัย (Finish Line ที่ Checkpoint 0)
    const p0 = TRACK_WAYPOINTS[0];
    const sx = p0.x - cameraX;
    const sy = p0.y - cameraY;

    ctx.save();
    ctx.translate(sx, sy);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-10, -90, 20, 180);
    ctx.fillStyle = '#000000';
    ctx.fillRect(-10, -90, 10, 90);
    ctx.fillRect(0, 0, 10, 90);
    ctx.restore();
}

// ลูปเกม
function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // อัปเดตตำแหน่ง Player & Bots
    playerCar.update();
    botCars.forEach(b => b.update());

    // คำนวณตำแหน่งกล้องให้ติตตามผู้เล่น
    const cameraX = playerCar.x - canvas.width / 2;
    const cameraY = playerCar.y - canvas.height / 2;

    // วาดโลก ถนน และวัตถุ
    drawWorldGridAndTrack(cameraX, cameraY);

    // วาด BOT และ Player
    botCars.forEach(b => b.draw(cameraX, cameraY));
    playerCar.draw(cameraX, cameraY);

    // อัปเดต UI
    const currentSpeed = Math.floor(Math.abs(playerCar.speed) * 22);
    const speedEl = document.getElementById('speedText');
    const nosEl = document.getElementById('nosFill');
    const lapEl = document.getElementById('lapText');

    if (speedEl) speedEl.innerText = currentSpeed;
    if (nosEl) nosEl.style.width = `${Math.max(0, playerCar.nos)}%`;
    if (lapEl) lapEl.innerText = `${Math.min(playerCar.lap, TOTAL_LAPS)}/${TOTAL_LAPS}`;

    const rank = calculateRank();

    // เช็คเข้าเส้นชัย (วิ่งครบ 3 รอบ)
    if (playerCar.lap > TOTAL_LAPS && !isGameOver) {
        isGameOver = true;
        const resText = document.getElementById('rankResultText');
        const msgBox = document.getElementById('gameOverMsg');
        if (resText) resText.innerText = `คุณเข้าเส้นชัยเป็นอันดับที่ ${rank}!`;
        if (msgBox) msgBox.style.display = 'block';
    }

    if (!isGameOver) {
        animationFrameId = requestAnimationFrame(loop);
    }
}

// ปุ่มเริ่มการแข่งขัน
const startBtn = document.getElementById('startGameBtn');
if (startBtn) {
    startBtn.onclick = function() {
        const cName = document.getElementById('carName');
        const selScr = document.getElementById('selectionScreen');
        const gScr = document.getElementById('gameScreen');
        const ctrlBox = document.getElementById('inGameControls');
        const gMsg = document.getElementById('gameOverMsg');

        if (cName) cName.innerText = selectedPlayerCar.name;
        if (selScr) selScr.style.display = 'none';
        if (gScr) gScr.style.display = 'block';
        if (ctrlBox) ctrlBox.style.display = 'block';
        if (gMsg) gMsg.style.display = 'none';

        isGameOver = false;
        initRace();
        cancelAnimationFrame(animationFrameId);
        loop();
    };
}

// ปุ่มเริ่มใหม่
const resetBtn = document.getElementById('resetBtn');
if (resetBtn) {
    resetBtn.onclick = function() {
        const selScr = document.getElementById('selectionScreen');
        const gScr = document.getElementById('gameScreen');
        const ctrlBox = document.getElementById('inGameControls');

        if (selScr) selScr.style.display = 'block';
        if (gScr) gScr.style.display = 'none';
        if (ctrlBox) ctrlBox.style.display = 'none';

        cancelAnimationFrame(animationFrameId);
    };
}