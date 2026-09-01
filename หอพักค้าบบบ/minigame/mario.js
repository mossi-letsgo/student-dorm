const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const stageEl = document.getElementById('stage');
const gameOverMsg = document.getElementById('gameOverMsg');
const msgTitle = document.getElementById('msgTitle');
const resetBtn = document.getElementById('resetBtn');
const jumpBtn = document.getElementById('jumpBtn');
const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');

let score = 0;
let currentStage = 1;
const maxStages = 3;
let isGameOver = false;
let animationFrameId = null;

const keys = { left: false, right: false, up: false };

// ตัวละคร Mario
const player = {
    x: 30,
    y: 330,
    width: 16,
    height: 22,
    vx: 0,
    vy: 0,
    speed: 3.2,
    jumpPower: -8.5,
    gravity: 0.4,
    grounded: false,

    draw() {
        ctx.fillStyle = '#ff1a1a';
        ctx.fillRect(this.x, this.y + 6, this.width, this.height - 6);
        
        ctx.fillStyle = '#cc0000';
        ctx.fillRect(this.x - 2, this.y, this.width + 4, 6);

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(this.x + (this.vx >= 0 ? 10 : 2), this.y + 4, 3, 3);
    },

    update() {
        if (keys.left) this.vx = -this.speed;
        else if (keys.right) this.vx = this.speed;
        else this.vx *= 0.8;

        if (keys.up && this.grounded) {
            this.vy = this.jumpPower;
            this.grounded = false;
        }

        this.vy += this.gravity;
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0) this.x = 0;
        if (this.x + this.width > canvas.width) this.x = canvas.width - this.width;

        if (this.y > canvas.height) {
            endGame(false, "ตกเหวตาย!");
        }
    }
};

// ข้อมูลแต่ละด่าน (Stages Data)
const stageData = {
    1: {
        platforms: [
            { x: 0, y: 360, width: 120, height: 40 },
            { x: 150, y: 310, width: 80, height: 15 },
            { x: 60, y: 240, width: 90, height: 15 },
            { x: 190, y: 180, width: 100, height: 15 },
            { x: 20, y: 120, width: 80, height: 15 },
            { x: 220, y: 65, width: 70, height: 15, isGoal: true }
        ],
        enemies: [
            { x: 160, y: 294, width: 16, height: 16, vx: -1, minX: 150, maxX: 210 },
            { x: 70, y: 224, width: 16, height: 16, vx: 1.2, minX: 60, maxX: 130 },
            { x: 200, y: 164, width: 16, height: 16, vx: -1.5, minX: 190, maxX: 270 }
        ]
    },
    2: {
        platforms: [
            { x: 0, y: 360, width: 90, height: 40 },
            { x: 120, y: 320, width: 70, height: 15, vx: 1, minX: 100, maxX: 200 }, // แท่นขยับได้
            { x: 30, y: 250, width: 70, height: 15 },
            { x: 160, y: 190, width: 80, height: 15 },
            { x: 50, y: 130, width: 60, height: 15, vx: -1.2, minX: 20, maxX: 120 },
            { x: 210, y: 65, width: 80, height: 15, isGoal: true }
        ],
        enemies: [
            { x: 35, y: 234, width: 16, height: 16, vx: 1.8, minX: 30, maxX: 90 },
            { x: 170, y: 174, width: 16, height: 16, vx: -2, minX: 160, maxX: 230 }
        ]
    },
    3: {
        platforms: [
            { x: 0, y: 360, width: 60, height: 40 },
            { x: 90, y: 320, width: 50, height: 15 },
            { x: 180, y: 280, width: 50, height: 15, vx: 1.5, minX: 150, maxX: 230 },
            { x: 80, y: 220, width: 50, height: 15 },
            { x: 10, y: 160, width: 50, height: 15 },
            { x: 110, y: 110, width: 50, height: 15, vx: -2, minX: 80, maxX: 180 },
            { x: 220, y: 60, width: 70, height: 15, isGoal: true }
        ],
        enemies: [
            { x: 95, y: 304, width: 16, height: 16, vx: -2.2, minX: 90, maxX: 130 },
            { x: 85, y: 204, width: 16, height: 16, vx: 2.5, minX: 80, maxX: 120 },
            { x: 15, y: 144, width: 16, height: 16, vx: 2, minX: 10, maxX: 50 }
        ]
    }
};

let currentPlatforms = [];
let currentEnemies = [];

function loadStage(stageNum) {
    currentStage = stageNum;
    stageEl.textContent = currentStage;
    
    // โคลนข้อมูลแท่นและศัตรู
    const data = stageData[stageNum];
    currentPlatforms = JSON.parse(JSON.stringify(data.platforms));
    currentEnemies = JSON.parse(JSON.stringify(data.enemies));

    player.x = 20;
    player.y = 320;
    player.vx = 0;
    player.vy = 0;
}

function updatePlatforms() {
    currentPlatforms.forEach((p) => {
        if (p.vx) {
            p.x += p.vx;
            if (p.x <= p.minX || p.x + p.width >= p.maxX) p.vx *= -1;
        }

        ctx.fillStyle = p.isGoal ? '#ffaa00' : '#331111';
        ctx.fillRect(p.x, p.y, p.width, p.height);
        
        ctx.strokeStyle = p.isGoal ? '#ffff00' : '#ff3333';
        ctx.lineWidth = 1;
        ctx.strokeRect(p.x, p.y, p.width, p.height);
    });
}

function updateEnemies() {
    currentEnemies.forEach((e) => {
        e.x += e.vx;
        if (e.x <= e.minX || e.x + e.width >= e.maxX) e.vx *= -1;

        ctx.fillStyle = '#ff4d4d';
        ctx.fillRect(e.x, e.y, e.width, e.height);
        ctx.fillStyle = '#000';
        ctx.fillRect(e.x + 3, e.y + 4, 3, 3);
        ctx.fillRect(e.x + 10, e.y + 4, 3, 3);

        if (
            player.x < e.x + e.width &&
            player.x + player.width > e.x &&
            player.y < e.y + e.height &&
            player.y + player.height > e.y
        ) {
            if (player.vy > 0 && player.y + player.height - player.vy <= e.y + 6) {
                player.vy = -5;
                score += 100;
                scoreEl.textContent = score;
                currentEnemies = currentEnemies.filter(item => item !== e);
            } else {
                endGame(false, "ชนศัตรูตาย!");
            }
        }
    });
}

function checkPlatformCollisions() {
    player.grounded = false;

    currentPlatforms.forEach((p) => {
        if (
            player.x < p.x + p.width &&
            player.x + player.width > p.x &&
            player.y + player.height >= p.y &&
            player.y + player.height <= p.y + p.height &&
            player.vy >= 0
        ) {
            player.grounded = true;
            player.vy = 0;
            player.y = p.y - player.height;

            // ถ้าเป็นแท่นขยับ ให้ตัวละครขยับตามแท่น
            if (p.vx) player.x += p.vx;

            // ชนะผ่านด่าน
            if (p.isGoal) {
                if (currentStage < maxStages) {
                    score += 500;
                    scoreEl.textContent = score;
                    loadStage(currentStage + 1);
                } else {
                    endGame(true, "คุณเคลียร์ครบทุกด่านแล้ว!");
                }
            }
        }
    });
}

function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    updatePlatforms();
    updateEnemies();
    player.update();
    checkPlatformCollisions();
    player.draw();

    if (!isGameOver) {
        animationFrameId = requestAnimationFrame(loop);
    }
}

function endGame(isWin, subMsg) {
    isGameOver = true;
    gameOverMsg.style.display = 'block';

    if (isWin) {
        msgTitle.textContent = "🏆 VICTORY!";
        msgTitle.style.color = "#00ff66";
    } else {
        msgTitle.textContent = "💀 GAME OVER!";
        msgTitle.style.color = "#ffffff";
    }
    
    document.getElementById('msgSub').textContent = subMsg || 'กด "เริ่มใหม่" เพื่อลองใหม่';
    cancelAnimationFrame(animationFrameId);
}

function resetGame() {
    score = 0;
    scoreEl.textContent = 0;
    isGameOver = false;
    gameOverMsg.style.display = 'none';

    loadStage(1);
    cancelAnimationFrame(animationFrameId);
    loop();
}

// ควบคุม
window.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        if (isGameOver) resetGame();
        else keys.up = true;
    }
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') keys.up = false;
});

leftBtn.addEventListener('mousedown', () => keys.left = true);
leftBtn.addEventListener('mouseup', () => keys.left = false);
leftBtn.addEventListener('touchstart', (e) => { e.preventDefault(); keys.left = true; });
leftBtn.addEventListener('touchend', () => keys.left = false);

rightBtn.addEventListener('mousedown', () => keys.right = true);
rightBtn.addEventListener('mouseup', () => keys.right = false);
rightBtn.addEventListener('touchstart', (e) => { e.preventDefault(); keys.right = true; });
rightBtn.addEventListener('touchend', () => keys.right = false);

jumpBtn.addEventListener('click', () => {
    if (!isGameOver && player.grounded) {
        player.vy = player.jumpPower;
        player.grounded = false;
    }
});

resetBtn.addEventListener('click', resetGame);

// เริ่มด่าน 1 ทันที
resetGame();