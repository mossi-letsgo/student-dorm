const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// รายชื่อ 5 รถ JDM ระดับตำนาน
const JDM_CARS = [
    { id: 'supra', name: '🚗 Toyota Supra MK4', color: '#ff1a1a', maxSpeed: 6.5, accel: 0.12, handling: 0.05 },
    { id: 'r34', name: '🏎️ Nissan Skyline R34', color: '#0066ff', maxSpeed: 6.8, accel: 0.14, handling: 0.06 },
    { id: 'rx7', name: '🔰 Mazda RX-7 FD3S', color: '#ffcc00', maxSpeed: 6.4, accel: 0.15, handling: 0.07 },
    { id: 'nsx', name: '🏎️ Honda NSX NA1', color: '#ffffff', maxSpeed: 7.0, accel: 0.11, handling: 0.055 },
    { id: 'evo', name: '🚗 Lancer Evo VI', color: '#ff0055', maxSpeed: 6.3, accel: 0.16, handling: 0.065 }
];

// แมพขนาดใหญ่ (World Boundary: 2400 x 2400)
const WORLD_WIDTH = 2400;
const WORLD_HEIGHT = 2400;

// เส้นทาง track ลู่วิ่งทรงกลม/โค้งใหญ่
const TRACK_WAYPOINTS = [
    { x: 400, y: 400 },
    { x: 2000, y: 400 },
    { x: 2000, y: 2000 },
    { x: 400, y: 2000 }
];

let selectedPlayerCar = JDM_CARS[0];
let playerCar;
let botCars = [];
let keys = {};
let isGameOver = false;
let animationFrameId;

// สร้างปุ่มเลือกตัวรถ
const carGrid = document.getElementById('carGrid');

function renderCarSelection() {
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
        this.angle = 0; // ในหน่วย Radian
        this.speed = 0;
        this.maxSpeed = config.maxSpeed;
        this.accel = config.accel;
        this.handling = config.handling;
        this.isBot = isBot;

        // ระบบ BOT
        this.targetWaypoint = 0;
        this.lap = 1;

        // ระบบ NOS สำหรับผู้เล่น
        this.nos = 100;
        this.isNosActive = false;
    }

    update() {
        if (!this.isBot) {
            // การควบคุมของ PLAYER
            if (keys['KeyW'] || keys['ArrowUp']) {
                let currentMax = this.maxSpeed;
                if (keys['ShiftLeft'] || keys['ShiftRight']) {
                    if (this.nos > 0) {
                        currentMax *= 1.35;
                        this.nos -= 0.8;
                        this.isNosActive = true;
                    } else {
                        this.isNosActive = false;
                    }
                } else {
                    this.isNosActive = false;
                    if (this.nos < 100) this.nos += 0.2;
                }

                if (this.speed < currentMax) this.speed += this.accel;
            } else if (keys['KeyS'] || keys['ArrowDown']) {
                if (this.speed > -2) this.speed -= this.accel * 0.8;
            } else {
                this.speed *= 0.96; // แรงเสียดทาน
                if (this.nos < 100) this.nos += 0.2;
                this.isNosActive = false;
            }

            if (keys['KeyA'] || keys['ArrowLeft']) this.angle -= this.handling * (this.speed / this.maxSpeed);
            if (keys['KeyD'] || keys['ArrowRight']) this.angle += this.handling * (this.speed / this.maxSpeed);

        } else {
            // การควบคุมของ BOT (วิ่งตาม Waypoint)
            const target = TRACK_WAYPOINTS[this.targetWaypoint];
            const dx = target.x - this.x;
            const dy = target.y - this.y;
            const targetAngle = Math.atan2(dy, dx);

            // ปรับมุมเลี้ยวเข้าหาเป้าหมาย
            let angleDiff = targetAngle - this.angle;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

            if (angleDiff > 0.05) this.angle += this.handling * 0.8;
            else if (angleDiff < -0.05) this.angle -= this.handling * 0.8;

            // เพิ่มความเร็ว Bot
            if (this.speed < this.maxSpeed * 0.9) this.speed += this.accel * 0.8;

            // เช็คถึงจุด Waypoint
            if (Math.hypot(dx, dy) < 150) {
                this.targetWaypoint = (this.targetWaypoint + 1) % TRACK_WAYPOINTS.length;
                if (this.targetWaypoint === 0) this.lap++;
            }
        }

        // เคลื่อนที่ตามมุม
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;

        // ไม่ให้หลุดขอบโลกใหญ่
        this.x = Math.max(100, Math.min(WORLD_WIDTH - 100, this.x));
        this.y = Math.max(100, Math.min(WORLD_HEIGHT - 100, this.y));
    }

    draw(cameraX, cameraY) {
        ctx.save();
        // คำนวณตำแหน่งบน Canvas โดยอิงกับกล้อง
        const screenX = this.x - cameraX;
        const screenY = this.y - cameraY;

        ctx.translate(screenX, screenY);
        ctx.rotate(this.angle);

        // ตัวรถ
        ctx.fillStyle = this.color;
        ctx.fillRect(-16, -9, 32, 18);

        // กระจกหน้า
        ctx.fillStyle = '#111';
        ctx.fillRect(-2, -7, 10, 14);

        // ไฟหน้า
        ctx.fillStyle = '#ffff99';
        ctx.fillRect(14, -8, 3, 4);
        ctx.fillRect(14, 4, 3, 4);

        // เอฟเฟกต์ NOS ไนตรัสออกท้ายรถ
        if (this.isNosActive) {
            ctx.fillStyle = '#00ccff';
            ctx.fillRect(-26, -5, 10, 10);
        }

        ctx.restore();
    }
}

// ควบคุมคีย์บอร์ด
window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup', e => keys[e.code] = false);

// สุ่มสร้าง BOT 5 คัน
function initRace() {
    playerCar = new Car(selectedPlayerCar, 400, 300, false);

    const botColors = ['#00cc44', '#ff6600', '#cc00ff', '#ffff00', '#00ffff'];
    botCars = [];

    for (let i = 0; i < 5; i++) {
        // เลือกสุ่มสเปกจาก JDM_CARS
        const randomSpec = JDM_CARS[i % JDM_CARS.length];
        const bot = new Car(randomSpec, 380 - (i * 35), 350 + (i * 20), true, botColors[i]);
        bot.name = `BOT ${i + 1}`;
        botCars.push(bot);
    }
}

// คำนวณอันดับการแข่ง (Rank)
function calculateRank() {
    const allCars = [playerCar, ...botCars];
    allCars.sort((a, b) => {
        if (a.lap !== b.lap) return b.lap - a.lap;
        return b.targetWaypoint - a.targetWaypoint;
    });

    const rank = allCars.indexOf(playerCar) + 1;
    document.getElementById('rankText').innerText = `${rank}/6`;
    return rank;
}

// ลูปเกม
function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // อัปเดตตำแหน่ง Player & Bots
    playerCar.update();
    botCars.forEach(b => b.update());

    // คำนวณตำแหน่งกล้อง (Camera Tracking ตาม Player อยู่ตรงกลางจอ)
    const cameraX = playerCar.x - canvas.width / 2;
    const cameraY = playerCar.y - canvas.height / 2;

    // 1. วาดถนนสนามแข่ง (Track Floor)
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 120;
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

    // เส้นขอบสนามแดง-ขาว
    ctx.strokeStyle = '#ff1a1a';
    ctx.lineWidth = 6;
    ctx.stroke();

    // เส้นชัย (Finish Line)
    const startSx = TRACK_WAYPOINTS[0].x - cameraX;
    const startSy = TRACK_WAYPOINTS[0].y - cameraY;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(startSx - 5, startSy - 60, 10, 120);

    // 2. วาด BOT และ Player
    botCars.forEach(b => b.draw(cameraX, cameraY));
    playerCar.draw(cameraX, cameraY);

    // 3. อัปเดต UI
    const currentSpeed = Math.floor(Math.abs(playerCar.speed) * 35);
    document.getElementById('speedText').innerText = currentSpeed;
    document.getElementById('nosFill').style.width = `${Math.max(0, playerCar.nos)}%`;
    const rank = calculateRank();

    // เช็คเข้าเส้นชัย (ครบ 2 รอบ)
    if (playerCar.lap >= 3 && !isGameOver) {
        isGameOver = true;
        document.getElementById('rankResultText').innerText = `คุณเข้าเส้นชัยเป็นอันดับที่ ${rank}!`;
        document.getElementById('gameOverMsg').style.display = 'block';
    }

    if (!isGameOver) {
        animationFrameId = requestAnimationFrame(loop);
    }
}

// ปุ่มเริ่มการแข่งขัน
document.getElementById('startGameBtn').onclick = function() {
    document.getElementById('carName').innerText = selectedPlayerCar.name.split(' ')[1] || selectedPlayerCar.name;
    document.getElementById('selectionScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'block';
    document.getElementById('inGameControls').style.display = 'block';
    document.getElementById('gameOverMsg').style.display = 'none';

    isGameOver = false;
    initRace();
    cancelAnimationFrame(animationFrameId);
    loop();
};

// ปุ่มเริ่มใหม่
document.getElementById('resetBtn').onclick = function() {
    document.getElementById('selectionScreen').style.display = 'block';
    document.getElementById('gameScreen').style.display = 'none';
    document.getElementById('inGameControls').style.display = 'none';
    cancelAnimationFrame(animationFrameId);
};