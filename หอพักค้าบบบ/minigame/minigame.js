const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("highScore");
const gameOverText = document.getElementById("gameOverText");
const resetBtn = document.getElementById("resetBtn");

const gridSize = 15;
const tileCount = canvas.width / gridSize;

let snake = [];
let food = { x: 0, y: 0 };
let dx = gridSize;
let dy = 0;
let nextDirection = "RIGHT"; // บันทึกทิศทางถัดไป
let changingDirection = false; // ป้องกันการเปลี่ยนทิศทางซ้ำในเฟรมเดียว

let score = 0;
let highScore = localStorage.getItem("snakeHighScore") || 0;
let gameInterval = null;
let isGameOver = false;

highScoreEl.innerText = highScore;

function startGame() {
    snake = [
        { x: 5 * gridSize, y: 10 * gridSize },
        { x: 4 * gridSize, y: 10 * gridSize },
        { x: 3 * gridSize, y: 10 * gridSize }
    ];
    dx = gridSize;
    dy = 0;
    nextDirection = "RIGHT";
    changingDirection = false;
    score = 0;
    isGameOver = false;
    scoreEl.innerText = score;
    gameOverText.style.display = "none";

    generateFood();

    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(updateGame, 90);
}

function updateGame() {
    if (isGameOver) return;

    // ประมวลผลทิศทางใหม่จากคิว
    changingDirection = false;
    if (nextDirection === "LEFT" && dx === 0) { dx = -gridSize; dy = 0; }
    if (nextDirection === "UP" && dy === 0) { dx = 0; dy = -gridSize; }
    if (nextDirection === "RIGHT" && dx === 0) { dx = gridSize; dy = 0; }
    if (nextDirection === "DOWN" && dy === 0) { dx = 0; dy = gridSize; }

    const head = { x: snake[0].x + dx, y: snake[0].y + dy };

    // ชนกำแพง
    if (head.x < 0 || head.x >= canvas.width || head.y < 0 || head.y >= canvas.height) {
        return handleGameOver();
    }

    // ชนตัวเอง
    for (let i = 0; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            return handleGameOver();
        }
    }

    snake.unshift(head);

    // กินผลไม้
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreEl.innerText = score;
        if (score > highScore) {
            highScore = score;
            highScoreEl.innerText = highScore;
            localStorage.setItem("snakeHighScore", highScore);
        }
        generateFood();
    } else {
        snake.pop();
    }

    draw();
}

function draw() {
    // พื้นหลังหน้าจอเกม
    ctx.fillStyle = "#141010";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ผลไม้ (สีแดงสว่างแบบพิกเซล)
    ctx.fillStyle = "#ff1a1a";
    ctx.beginPath();
    ctx.roundRect(food.x, food.y, gridSize - 1, gridSize - 1, [3]);
    ctx.fill();

    // ตัวงู (สีขาว/เทา คล้ายไอคอน UI)
    snake.forEach((part, index) => {
        ctx.fillStyle = index === 0 ? "#ffffff" : "#cc3333";
        ctx.beginPath();
        ctx.roundRect(part.x, part.y, gridSize - 1, gridSize - 1, [2]);
        ctx.fill();
    });
}

function generateFood() {
    while (true) {
        food.x = Math.floor(Math.random() * tileCount) * gridSize;
        food.y = Math.floor(Math.random() * tileCount) * gridSize;

        let onSnake = snake.some(part => part.x === food.x && part.y === food.y);
        if (!onSnake) break;
    }
}

function handleGameOver() {
    isGameOver = true;
    clearInterval(gameInterval);
    gameOverText.style.display = "block";
}

// รับคำสั่งเปลี่ยนทิศทาง (ใช้ได้ทั้งปุ่มบนจอและคีย์บอร์ด)
window.changeDirection = function(dir) {
    if (changingDirection) return;

    if (dir === "LEFT" && dx === 0) { nextDirection = "LEFT"; changingDirection = true; }
    if (dir === "UP" && dy === 0) { nextDirection = "UP"; changingDirection = true; }
    if (dir === "RIGHT" && dx === 0) { nextDirection = "RIGHT"; changingDirection = true; }
    if (dir === "DOWN" && dy === 0) { nextDirection = "DOWN"; changingDirection = true; }
};

document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") changeDirection("LEFT");
    if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") changeDirection("UP");
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") changeDirection("RIGHT");
    if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") changeDirection("DOWN");
    if (e.key === " " || e.code === "Space") startGame();
});

if (resetBtn) resetBtn.addEventListener("click", startGame);

startGame();