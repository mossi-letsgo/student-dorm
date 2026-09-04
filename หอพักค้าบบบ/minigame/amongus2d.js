let MAP_WIDTH = 3000;
let MAP_HEIGHT = 2200;

let canvas, ctx;
let miniCanvas, miniCtx;
let players = [];
let deadBodies = [];
let taskNodes = [];
let vents = [];
let walls = [];
let rooms = [];
let localPlayer = null;
let isImpostor = false;
let gameActive = false;
let currentActiveTask = null;

let completedTasksCount = 0;
let totalTasksCount = 0;
let killCooldown = 0;
let selectedMap = 'skeld';

let wiringState = { selectedWire: null, wires: [] };
let swipeState = { cardX: 50, isDragging: false, startTime: 0 };
let asteroidState = { targets: [] };

const PLAYER_COLORS = [
    '#c51111', '#132ed1', '#117f2d', '#edf720',
    '#6b2f90', '#38e4dc', '#f07d0d', '#503126', '#d6e0f0', '#712525'
];

const keys = {};
window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code === 'KeyV') useVent();
    if (e.code === 'KeyE') {
        if (isImpostor) killBot();
        else openTaskMinigame();
    }
    if (e.code === 'KeyR') reportBody();
});
window.addEventListener('keyup', e => keys[e.code] = false);

function drawRoundedRect(context, x, y, width, height, radius, fill, stroke) {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.lineTo(x + width - radius, y);
    context.quadraticCurveTo(x + width, y, x + width, y + radius);
    context.lineTo(x + width, y + height - radius);
    context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    context.lineTo(x + radius, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - radius);
    context.lineTo(x, y + radius);
    context.quadraticCurveTo(x, y, x + radius, y);
    context.closePath();
    if (fill) context.fill();
    if (stroke) context.stroke();
}

function drawCrewmate(x, y, color, facingRight = true, isDead = false) {
    ctx.save();
    ctx.translate(x, y);

    if (isDead) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(0, 8, 16, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(-3, -8, 6, 15);
        ctx.restore();
        return;
    }

    if (!facingRight) ctx.scale(-1, 1);

    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000000';

    // วาดกระเป๋าหลังและตัวละคร
    drawRoundedRect(ctx, -20, -10, 8, 20, 3, true, true);
    drawRoundedRect(ctx, -12, -22, 26, 36, 8, true, true);

    // กระจกตา (Visor)
    ctx.fillStyle = "#88ccff";
    ctx.beginPath();
    ctx.ellipse(6, -8, 10, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
}

function initMapConfig(mapType) {
    MAP_WIDTH = 3000;
    MAP_HEIGHT = 2200;

    rooms = [
        { name: 'Cafeteria', x: 1200, y: 150, w: 600, h: 450 },
        { name: 'Weapons', x: 2100, y: 150, w: 500, h: 400 },
        { name: 'Navigation', x: 2450, y: 800, w: 450, h: 500 },
        { name: 'Shields', x: 2100, y: 1450, w: 500, h: 400 },
        { name: 'Admin', x: 1800, y: 1200, w: 450, h: 400 },
        { name: 'Storage', x: 1200, y: 1300, w: 500, h: 550 },
        { name: 'Electrical', x: 600, y: 1150, w: 450, h: 450 },
        { name: 'Lower Engine', x: 150, y: 1500, w: 380, h: 450 },
        { name: 'Upper Engine', x: 150, y: 300, w: 380, h: 450 },
        { name: 'Medical Bay', x: 650, y: 500, w: 400, h: 380 },
        { name: 'Reactor', x: 150, y: 850, w: 350, h: 500 }
    ];

    walls = [
        { x: 0, y: 0, w: MAP_WIDTH, h: 80 },
        { x: 0, y: 0, w: 80, h: MAP_HEIGHT },
        { x: 0, y: MAP_HEIGHT - 80, w: MAP_WIDTH, h: 80 },
        { x: MAP_WIDTH - 80, y: 0, w: 80, h: MAP_HEIGHT },

        { x: 1050, y: 600, w: 150, h: 500 },
        { x: 1650, y: 600, w: 350, h: 120 },
        { x: 1100, y: 1100, w: 300, h: 120 },
        { x: 500, y: 850, w: 120, h: 300 },
        { x: 1600, y: 1600, w: 400, h: 120 },
        { x: 2000, y: 600, w: 120, h: 550 },
        { x: 800, y: 200, w: 120, h: 300 },
        { x: 1800, y: 200, w: 120, h: 350 },
        { x: 2350, y: 1350, w: 120, h: 350 },
        { x: 500, y: 1450, w: 120, h: 350 }
    ];

    vents = [
        { id: 0, x: 1250, y: 200, target: 1 },
        { id: 1, x: 2150, y: 200, target: 2 },
        { id: 2, x: 2500, y: 850, target: 0 }
    ];

    taskNodes = [
        { id: 0, type: 'wiring', name: 'Fix Wiring', x: 1500, y: 200, room: 'Cafeteria', active: true },
        { id: 1, type: 'asteroids', name: 'Clear Asteroids', x: 2300, y: 200, room: 'Weapons', active: true },
        { id: 2, type: 'swipe', name: 'Swipe Card', x: 1950, y: 1250, room: 'Admin', active: true },
        { id: 3, type: 'wiring', name: 'Fix Wiring', x: 700, y: 1200, room: 'Electrical', active: true },
        { id: 4, type: 'swipe', name: 'Submit Scan', x: 750, y: 550, room: 'Medical Bay', active: true },
        { id: 5, type: 'wiring', name: 'Calibrate Distributor', x: 250, y: 400, room: 'Upper Engine', active: true },
        { id: 6, type: 'asteroids', name: 'Unlock Manifolds', x: 250, y: 950, room: 'Reactor', active: true },
        { id: 7, type: 'swipe', name: 'Download Data', x: 2600, y: 900, room: 'Navigation', active: true }
    ];

    totalTasksCount = taskNodes.length * 3;
}

function resizeCanvas() {
    if (!canvas) return;
    const parent = canvas.parentElement || document.body;
    canvas.width = parent.clientWidth || window.innerWidth || 800;
    canvas.height = parent.clientHeight || window.innerHeight || 600;
}

function startGame() {
    selectedMap = document.getElementById('mapSelect').value;
    document.getElementById('lobbyMenu').style.display = 'none';
    document.getElementById('gameHud').style.display = 'block';

    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    miniCanvas = document.getElementById('minigameCanvas');
    miniCtx = miniCanvas ? miniCanvas.getContext('2d') : null;

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    initMapConfig(selectedMap);

    const totalCount = parseInt(document.getElementById('botCountRange').value) || 6;
    isImpostor = Math.random() < 0.35;

    const roleBadge = document.getElementById('roleBadge');
    const roleScreen = document.getElementById('roleScreen');
    const roleTitle = document.getElementById('roleTitle');

    if (roleScreen) roleScreen.classList.remove('style-hidden');
    if (isImpostor) {
        if (roleTitle) { roleTitle.innerText = "IMPOSTOR"; roleTitle.style.color = "#ff3333"; }
        if (roleBadge) { roleBadge.innerText = "🔪 IMPOSTOR"; roleBadge.className = "role-badge impostor"; }
    } else {
        if (roleTitle) { roleTitle.innerText = "CREWMATE"; roleTitle.style.color = "#00ffff"; }
        if (roleBadge) { roleBadge.innerText = "🛡️ CREWMATE"; roleBadge.className = "role-badge crewmate"; }
    }

    setTimeout(() => {
        if (roleScreen) roleScreen.classList.add('style-hidden');
    }, 2500);

    spawnPlayers(totalCount);
    gameActive = true;
    requestAnimationFrame(gameLoop);
}

function showToast(text) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = text;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 2200);
}

function spawnPlayers(count) {
    players = [];
    deadBodies = [];
    completedTasksCount = 0;

    // 1. เพิ่ม trustScores: {} ให้กับ localPlayer ด้วย
    localPlayer = {
        id: 0,
        name: "You",
        x: rooms[0].x + 300,
        y: rooms[0].y + 225,
        isBot: false,
        isImpostor: isImpostor,
        isDead: false,
        color: PLAYER_COLORS[0],
        facingRight: true,
        trustScores: {} // <<-- เพิ่มบรรทัดนี้
    };
    players.push(localPlayer);

    for (let i = 1; i < count; i++) {
        players.push({
            id: i,
            name: `Bot ${i}`,
            x: rooms[0].x + 150 + (i * 35),
            y: rooms[0].y + 225,
            targetX: rooms[0].x + 300,
            targetY: rooms[0].y + 225,
            isBot: true,
            isImpostor: !isImpostor && (i === 1),
            isDead: false,
            color: PLAYER_COLORS[i % PLAYER_COLORS.length],
            facingRight: true,
            state: 'IDLE',
            taskTimer: 0,
            trustScores: {}
        });
    }

    // 2. ป้องกันกรณี trustScores เป็น undefined ด้วยการตรวจสอบปลอดภัยแบบ (p.trustScores || {})
    players.forEach(p => {
        if (!p.trustScores) p.trustScores = {};
        players.forEach(o => { 
            if (p.id !== o.id) p.trustScores[o.id] = 50; 
        });
    });
}

function checkWallCollision(newX, newY) {
    const radius = 14;
    for (let w of walls) {
        if (newX + radius > w.x && newX - radius < w.x + w.w &&
            newY + radius > w.y && newY - radius < w.y + w.h) {
            return true;
        }
    }
    return false;
}

function hasLineOfSight(x1, y1, x2, y2) {
    const dist = Math.hypot(x2 - x1, y2 - y1);
    if (dist > 400) return false;

    const steps = Math.ceil(dist / 15);
    for (let i = 0; i <= steps; i++) {
        let currX = x1 + (x2 - x1) * (i / steps);
        let currY = y1 + (y2 - y1) * (i / steps);
        if (checkWallCollision(currX, currY)) return false;
    }
    return true;
}

function openTaskMinigame() {
    let nearNode = taskNodes.find(n => n.active && Math.hypot(localPlayer.x - n.x, localPlayer.y - n.y) < 60);
    if (!nearNode) return;

    currentActiveTask = nearNode;
    document.getElementById('taskModal').style.display = 'flex';
    document.getElementById('minigameTitle').innerText = nearNode.name;

    if (nearNode.type === 'wiring') initWiringGame();
    else if (nearNode.type === 'swipe') initSwipeGame();
    else if (nearNode.type === 'asteroids') initAsteroidGame();
}

function closeTaskModal() {
    document.getElementById('taskModal').style.display = 'none';
    currentActiveTask = null;
}

function completeTask() {
    if (currentActiveTask) {
        currentActiveTask.active = false;
        completedTasksCount++;
        showToast(`⚡ เควส ${currentActiveTask.name} สำเร็จ!`);
        updateTaskBar();
        closeTaskModal();
    }
}

function updateTaskBar() {
    const pct = Math.floor((completedTasksCount / totalTasksCount) * 100);
    const fill = document.getElementById('taskFill');
    const txt = document.getElementById('taskText');
    if (fill) fill.style.width = `${pct}%`;
    if (txt) txt.innerText = `TOTAL TASKS: ${pct}%`;

    if (pct >= 100 && gameActive) {
        gameActive = false;
        alert("🎉 CREWMATE WIN! เควสเสร็จสิ้นทั้งหมด!");
        location.reload();
    }
}

function initWiringGame() {
    if (!miniCtx) return;
    const colors = ['#ff3333', '#3388ff', '#ffff33', '#33ff33'];
    wiringState.wires = colors.map((c, i) => ({
        color: c,
        startY: 40 + i * 65,
        endY: 40 + i * 65,
        connected: false
    }));
    drawWiringGame();
}

function drawWiringGame() {
    if (!miniCtx) return;
    miniCtx.fillStyle = '#0f172a';
    miniCtx.fillRect(0, 0, 400, 300);

    wiringState.wires.forEach((w) => {
        miniCtx.fillStyle = w.color;
        miniCtx.fillRect(20, w.startY, 40, 30);
        miniCtx.fillRect(340, w.endY, 40, 30);

        if (w.connected) {
            miniCtx.strokeStyle = w.color;
            miniCtx.lineWidth = 8;
            miniCtx.beginPath();
            miniCtx.moveTo(60, w.startY + 15);
            miniCtx.lineTo(340, w.endY + 15);
            miniCtx.stroke();
        }
    });
}

function initSwipeGame() {
    swipeState = { cardX: 50, isDragging: false, startTime: 0 };
    drawSwipeGame();
}

function drawSwipeGame() {
    if (!miniCtx) return;
    miniCtx.fillStyle = '#1e293b';
    miniCtx.fillRect(0, 0, 400, 300);

    miniCtx.fillStyle = '#334155';
    miniCtx.fillRect(40, 80, 320, 20);

    miniCtx.fillStyle = '#00ffcc';
    miniCtx.fillRect(swipeState.cardX, 120, 80, 50);
    miniCtx.fillStyle = '#000';
    miniCtx.font = 'bold 12px Segoe UI';
    miniCtx.fillText("CARD", swipeState.cardX + 22, 150);
}

function initAsteroidGame() {
    asteroidState.targets = [];
    for (let i = 0; i < 5; i++) {
        asteroidState.targets.push({
            x: Math.random() * 300 + 50,
            y: Math.random() * 200 + 50,
            hit: false
        });
    }
    drawAsteroidGame();
}

function drawAsteroidGame() {
    if (!miniCtx) return;
    miniCtx.fillStyle = '#050b14';
    miniCtx.fillRect(0, 0, 400, 300);

    asteroidState.targets.forEach(t => {
        if (!t.hit) {
            miniCtx.fillStyle = '#94a3b8';
            miniCtx.beginPath();
            miniCtx.arc(t.x, t.y, 18, 0, Math.PI * 2);
            miniCtx.fill();
        }
    });
}

window.addEventListener('mousedown', e => {
    if (!currentActiveTask || !miniCanvas) return;
    const rect = miniCanvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (currentActiveTask.type === 'wiring') {
        wiringState.wires.forEach(w => {
            if (mx >= 20 && mx <= 60 && my >= w.startY && my <= w.startY + 30) {
                w.connected = true;
            }
        });
        drawWiringGame();
        if (wiringState.wires.every(w => w.connected)) completeTask();
    } else if (currentActiveTask.type === 'asteroids') {
        asteroidState.targets.forEach(t => {
            if (!t.hit && Math.hypot(mx - t.x, my - t.y) < 22) {
                t.hit = true;
            }
        });
        drawAsteroidGame();
        if (asteroidState.targets.every(t => t.hit)) completeTask();
    } else if (currentActiveTask.type === 'swipe') {
        if (mx >= swipeState.cardX && mx <= swipeState.cardX + 80 && my >= 120 && my <= 170) {
            swipeState.isDragging = true;
            swipeState.startTime = Date.now();
        }
    }
});

window.addEventListener('mousemove', e => {
    if (currentActiveTask && currentActiveTask.type === 'swipe' && swipeState.isDragging) {
        const rect = miniCanvas.getBoundingClientRect();
        swipeState.cardX = Math.max(50, Math.min(270, e.clientX - rect.left - 40));
        drawSwipeGame();
    }
});

window.addEventListener('mouseup', () => {
    if (currentActiveTask && currentActiveTask.type === 'swipe' && swipeState.isDragging) {
        swipeState.isDragging = false;
        const duration = Date.now() - swipeState.startTime;
        if (swipeState.cardX >= 260 && duration > 300 && duration < 1500) {
            completeTask();
        } else {
            showToast("❌ รูดบัตรเร็ว/ช้าเกินไป!");
            swipeState.cardX = 50;
            drawSwipeGame();
        }
    }
});

function useVent() {
    if (!isImpostor || localPlayer.isDead) return;
    let nearVent = vents.find(v => Math.hypot(localPlayer.x - v.x, localPlayer.y - v.y) < 50);
    if (nearVent) {
        let nextVent = vents[nearVent.target];
        localPlayer.x = nextVent.x;
        localPlayer.y = nextVent.y;
        showToast("🌀 มุดท่อสำเร็จ!");
    }
}

function killBot() {
    if (!isImpostor || killCooldown > 0) return;

    players.forEach(p => {
        if (p.isBot && !p.isDead && Math.hypot(localPlayer.x - p.x, localPlayer.y - p.y) < 55) {
            p.isDead = true;
            deadBodies.push({ x: p.x, y: p.y, color: p.color, name: p.name });
            showToast(`🔪 คุณสังหาร ${p.name}!`);
            killCooldown = 15;

            players.forEach(witness => {
                if (witness.isBot && !witness.isDead && witness.id !== p.id) {
                    if (hasLineOfSight(witness.x, witness.y, localPlayer.x, localPlayer.y)) {
                        witness.trustScores[localPlayer.id] = 0;
                    }
                }
            });

            checkWinCondition();
        }
    });
}

function reportBody() {
    deadBodies.forEach(b => {
        if (Math.hypot(localPlayer.x - b.x, localPlayer.y - b.y) < 60) {
            triggerMeeting();
        }
    });
}

function triggerMeeting() {
    gameActive = false;
    const modal = document.getElementById('votingModal');
    const voterList = document.getElementById('voterList');
    if (!modal || !voterList) return;

    voterList.innerHTML = '';
    modal.style.display = 'flex';

    players.forEach(p => {
        if (!p.isDead) {
            const btn = document.createElement('button');
            btn.className = 'voter-card';
            btn.innerText = `👤 ${p.name}`;
            btn.onclick = () => castVote(p.id);
            voterList.appendChild(btn);
        }
    });
}

function castVote(playerVote) {
    document.getElementById('votingModal').style.display = 'none';
    const votes = {};

    players.forEach(p => {
        if (!p.isDead) {
            if (p.isBot) {
                let lowestTrustId = null;
                let lowestScore = 40;

                for (let targetId in p.trustScores) {
                    let targetPlayer = players.find(x => x.id == targetId);
                    if (targetPlayer && !targetPlayer.isDead) {
                        if (p.trustScores[targetId] < lowestScore) {
                            lowestScore = p.trustScores[targetId];
                            lowestTrustId = targetId;
                        }
                    }
                }

                let finalVote = lowestTrustId !== null ? parseInt(lowestTrustId) : null;
                if (finalVote !== null) votes[finalVote] = (votes[finalVote] || 0) + 1;
            } else {
                if (playerVote !== null) votes[playerVote] = (votes[playerVote] || 0) + 1;
            }
        }
    });

    let maxVotes = 0;
    let ejectedId = null;
    for (let id in votes) {
        if (votes[id] > maxVotes) {
            maxVotes = votes[id];
            ejectedId = parseInt(id);
        }
    }

    const ejectedPlayer = players.find(p => p.id === ejectedId);
    if (ejectedPlayer) {
        ejectedPlayer.isDead = true;
        alert(`🚨 ${ejectedPlayer.name} ถูกโหวตให้ออกจากสถานี! (${ejectedPlayer.isImpostor ? 'เป็น Impostor!' : 'ไม่ใช่ Impostor'})`);
    } else {
        alert("🚨 ที่ประชุมข้ามการโหวต (Skip Vote)!");
    }

    checkWinCondition();
    gameActive = true;
    requestAnimationFrame(gameLoop);
}

function checkWinCondition() {
    const aliveImpostors = players.filter(p => !p.isDead && p.isImpostor);
    const aliveCrew = players.filter(p => !p.isDead && !p.isImpostor);

    if (aliveImpostors.length === 0) {
        alert("🎉 CREWMATE WIN! Impostor ถูกกำจัดหมดแล้ว!");
        location.reload();
    } else if (aliveImpostors.length >= aliveCrew.length) {
        alert("🔪 IMPOSTOR WIN! Impostor ยึดครองสถานีได้สำเร็จ!");
        location.reload();
    }
}

function drawCrewmate(x, y, color, facingRight = true, isDead = false) {
    ctx.save();
    ctx.translate(x, y);

    if (isDead) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(0, 8, 16, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(-3, -8, 6, 15);
        ctx.restore();
        return;
    }

    if (!facingRight) ctx.scale(-1, 1);

    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000000';

    drawRoundedRect(ctx, -20, -10, 8, 20, 3, true, true);
    drawRoundedRect(ctx, -12, -22, 26, 36, 10, true, true);

    ctx.fillStyle = "#88ccff";
    ctx.beginPath();
    ctx.ellipse(6, -8, 10, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
}

function drawMinimap() {
    const miniW = 150, miniH = 100;
    const miniX = canvas.width - miniW - 15;
    const miniY = 15;

    ctx.fillStyle = 'rgba(10, 15, 25, 0.85)';
    ctx.fillRect(miniX, miniY, miniW, miniH);
    ctx.strokeStyle = '#00ffcc';
    ctx.lineWidth = 1;
    ctx.strokeRect(miniX, miniY, miniW, miniH);

    rooms.forEach(r => {
        ctx.fillStyle = '#334466';
        ctx.fillRect(miniX + (r.x / MAP_WIDTH) * miniW, miniY + (r.y / MAP_HEIGHT) * miniH, (r.w / MAP_WIDTH) * miniW, (r.h / MAP_HEIGHT) * miniH);
    });

    ctx.fillStyle = '#ff3333';
    ctx.fillRect(miniX + (localPlayer.x / MAP_WIDTH) * miniW, miniY + (localPlayer.y / MAP_HEIGHT) * miniH, 5, 5);
}

function drawFogOfWarAndDarkness() {
    ctx.save();
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const visionRadius = 260;

    const grad = ctx.createRadialGradient(
        centerX, centerY, 50,
        centerX, centerY, visionRadius
    );
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(0.65, 'rgba(5, 8, 15, 0.65)');
    grad.addColorStop(1, 'rgba(5, 8, 15, 0.96)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.restore();
}

function gameLoop() {
    if (!gameActive || !localPlayer) return;

    if (killCooldown > 0) killCooldown -= 0.016;

    const speed = 3.6;
    let moveX = 0, moveY = 0;

    if (keys['KeyW'] || keys['ArrowUp']) moveY -= speed;
    if (keys['KeyS'] || keys['ArrowDown']) moveY += speed;
    if (keys['KeyA'] || keys['ArrowLeft']) { moveX -= speed; localPlayer.facingRight = false; }
    if (keys['KeyD'] || keys['ArrowRight']) { moveX += speed; localPlayer.facingRight = true; }

    if (moveX !== 0 && !checkWallCollision(localPlayer.x + moveX, localPlayer.y)) localPlayer.x += moveX;
    if (moveY !== 0 && !checkWallCollision(localPlayer.x, localPlayer.y + moveY)) localPlayer.y += moveY;

    let currentRoom = rooms.find(r => localPlayer.x >= r.x && localPlayer.x <= r.x + r.w && localPlayer.y >= r.y && localPlayer.y <= r.y + r.h);
    const roomTitle = document.getElementById('roomTitle');
    if (roomTitle) roomTitle.innerText = currentRoom ? currentRoom.name : 'CORRIDOR';

    const camX = localPlayer.x - canvas.width / 2;
    const camY = localPlayer.y - canvas.height / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-camX, -camY);

    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

    rooms.forEach(r => {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 4;
        ctx.strokeRect(r.x, r.y, r.w, r.h);

        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.font = 'bold 28px Segoe UI';
        ctx.textAlign = 'center';
        ctx.fillText(r.name, r.x + r.w / 2, r.y + r.h / 2);
    });

    ctx.fillStyle = '#0f172a';
    walls.forEach(w => {
        ctx.fillRect(w.x, w.y, w.w, w.h);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.strokeRect(w.x, w.y, w.w, w.h);
    });

    vents.forEach(v => {
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.arc(v.x, v.y, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#00ffcc';
        ctx.stroke();
    });

    taskNodes.forEach(t => {
        ctx.fillStyle = t.active ? '#00ffcc' : '#475569';
        ctx.fillRect(t.x - 14, t.y - 14, 28, 28);
        ctx.strokeStyle = '#000';
        ctx.strokeRect(t.x - 14, t.y - 14, 28, 28);
    });

    players.forEach(p => {
        if (!p.isDead) {
            if (p.isBot) {
                if (p.state === 'IDLE') {
                    let randomTask = taskNodes[Math.floor(Math.random() * taskNodes.length)];
                    p.targetX = randomTask.x;
                    p.targetY = randomTask.y;
                    p.state = 'MOVING';
                } else if (p.state === 'MOVING') {
                    const dx = p.targetX - p.x;
                    const dy = p.targetY - p.y;
                    const dist = Math.hypot(dx, dy);

                    if (dist > 18) {
                        let stepX = (dx / dist) * 1.8;
                        let stepY = (dy / dist) * 1.8;
                        if (!checkWallCollision(p.x + stepX, p.y)) p.x += stepX;
                        if (!checkWallCollision(p.x, p.y + stepY)) p.y += stepY;
                        p.facingRight = dx > 0;
                    } else {
                        p.state = 'DOING_TASK';
                        p.taskTimer = 500;
                    }
                } else if (p.state === 'DOING_TASK') {
                    p.taskTimer--;
                    if (p.taskTimer <= 0) {
                        if (!p.isImpostor && Math.random() < 0.20) {
                            completedTasksCount = Math.min(totalTasksCount, completedTasksCount + 1);
                            updateTaskBar();
                        }
                        p.state = 'IDLE';
                    }
                }

                deadBodies.forEach(b => {
                    if (hasLineOfSight(p.x, p.y, b.x, b.y)) {
                        triggerMeeting();
                    }
                });
            }

            if (p.id === localPlayer.id || hasLineOfSight(localPlayer.x, localPlayer.y, p.x, p.y)) {
                drawCrewmate(p.x, p.y, p.color, p.facingRight);

                ctx.fillStyle = '#ffffff';
                ctx.font = '12px Segoe UI';
                ctx.textAlign = 'center';
                ctx.fillText(p.name, p.x, p.y - 28);
            }
        }
    });

    deadBodies.forEach(b => {
        if (hasLineOfSight(localPlayer.x, localPlayer.y, b.x, b.y)) {
            drawCrewmate(b.x, b.y, b.color, true, true);
        }
    });

    ctx.restore();

    drawFogOfWarAndDarkness();
    drawMinimap();

    const ventBtn = document.getElementById('ventBtn');
    const taskBtn = document.getElementById('taskBtn');
    const killBtn = document.getElementById('killBtn');
    const reportBtn = document.getElementById('reportBtn');

    let nearVent = vents.some(v => Math.hypot(localPlayer.x - v.x, localPlayer.y - v.y) < 50);
    let nearTask = taskNodes.some(n => n.active && Math.hypot(localPlayer.x - n.x, localPlayer.y - n.y) < 50);
    let nearBot = players.some(p => p.isBot && !p.isDead && Math.hypot(localPlayer.x - p.x, localPlayer.y - p.y) < 55);
    let nearBody = deadBodies.some(b => hasLineOfSight(localPlayer.x, localPlayer.y, b.x, b.y) && Math.hypot(localPlayer.x - b.x, localPlayer.y - b.y) < 60);

    if (ventBtn) ventBtn.style.display = (isImpostor && nearVent) ? 'flex' : 'none';
    if (taskBtn) taskBtn.style.display = (!isImpostor && nearTask) ? 'flex' : 'none';
    if (killBtn) {
        killBtn.style.display = (isImpostor && nearBot) ? 'flex' : 'none';
        killBtn.innerText = killCooldown > 0 ? `🔪 (${Math.ceil(killCooldown)}s)` : '🔪 KILL';
    }
    if (reportBtn) reportBtn.style.display = nearBody ? 'flex' : 'none';

    requestAnimationFrame(gameLoop);
}