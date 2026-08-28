const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("highScore");
const gameOverText = document.getElementById("gameOverText");
const jumpBtn = document.getElementById("jumpBtn");
const resetBtn = document.getElementById("resetBtn");

let score = 0;
let highScore = localStorage.getItem("dinoHighScore") || 0;
let gameInterval = null;
let isGameOver = false;

highScoreEl.innerText = highScore;

const groundY = canvas.height - 25;
let dino = {
    x: 30,
    y: groundY - 30,
    width: 25,
    height: 30,
    dy: 0,
    gravity: 0.6,
    jumpForce: -10,
    isGrounded: true
};

let obstacles = [];
let obstacleTimer = 0;
let speed = 4;

function startGame() {
    dino.y = groundY - dino.height;
    dino.dy = 0;
    dino.isGrounded = true;
    obstacles = [];
    score = 0;
    speed = 4;
    isGameOver = false;
    scoreEl.innerText = score;
    gameOverText.style.display = "none";

    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(updateGame, 1000 / 60);
}

function jump() {
    if (dino.isGrounded && !isGameOver) {
        dino.dy = dino.jumpForce;
        dino.isGrounded = false;
    }
}

function updateGame() {
    if (isGameOver) return;

    dino.dy += dino.gravity;
    dino.y += dino.dy;

    if (dino.y >= groundY - dino.height) {
        dino.y = groundY - dino.height;
        dino.dy = 0;
        dino.isGrounded = true;
    }

    obstacleTimer++;
    if (obstacleTimer > Math.max(50, 90 - Math.floor(score / 5))) {
        obstacleTimer = 0;
        let obsHeight = Math.floor(Math.random() * 20) + 25;
        obstacles.push({
            x: canvas.width,
            y: groundY - obsHeight,
            width: 15,
            height: obsHeight
        });
    }

    for (let i = 0; i < obstacles.length; i++) {
        let obs = obstacles[i];
        obs.x -= speed;

        if (
            dino.x < obs.x + obs.width &&
            dino.x + dino.width > obs.x &&
            dino.y < obs.y + obs.height &&
            dino.y + dino.height > obs.y
        ) {
            return handleGameOver();
        }
    }

    if (obstacles.length > 0 && obstacles[0].x + obstacles[0].width < 0) {
        obstacles.shift();
        score += 10;
        scoreEl.innerText = score;
        if (score > highScore) {
            highScore = score;
            highScoreEl.innerText = highScore;
            localStorage.setItem("dinoHighScore", highScore);
        }
        if (score % 50 === 0) speed += 0.5;
    }

    draw();
}

function draw() {
    ctx.fillStyle = "#141010";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "#ff1a1a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(canvas.width, groundY);
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.roundRect(dino.x, dino.y, dino.width, dino.height, [4]);
    ctx.fill();

    ctx.fillStyle = "#141010";
    ctx.fillRect(dino.x + 16, dino.y + 5, 4, 4);

    ctx.fillStyle = "#ff1a1a";
    obstacles.forEach(obs => {
        ctx.beginPath();
        ctx.roundRect(obs.x, obs.y, obs.width, obs.height, [2]);
        ctx.fill();
    });
}

function handleGameOver() {
    isGameOver = true;
    clearInterval(gameInterval);
    gameOverText.style.display = "block";
}

document.addEventListener("keydown", (e) => {
    if (e.key === " " || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        e.preventDefault();
        if (isGameOver) startGame();
        else jump();
    }
});

jumpBtn.addEventListener("click", jump);
resetBtn.addEventListener("click", startGame);

startGame();