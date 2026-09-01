const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highScore');
const gameOverMsg = document.getElementById('gameOverMsg');
const jumpBtn = document.getElementById('jumpBtn');
const resetBtn = document.getElementById('resetBtn');

let score = 0;
let highScore = localStorage.getItem('flappy_high_score') || 0;
highScoreEl.textContent = highScore;

let isGameOver = false;
let animationFrameId = null;
let frameCount = 0;

// ตัวละครนก
const bird = {
    x: 40,
    y: 180,
    radius: 12,
    gravity: 0.25,
    velocity: 0,
    jump: -5.2,
    
    draw() {
        ctx.fillStyle = '#ff3333';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // ตา
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x + 4, this.y - 4, 3, 0, Math.PI * 2);
        ctx.fill();

        // ปาก
        ctx.fillStyle = '#ffaa00';
        ctx.beginPath();
        ctx.moveTo(this.x + 8, this.y);
        ctx.lineTo(this.x + 16, this.y + 2);
        ctx.lineTo(this.x + 8, this.y + 6);
        ctx.closePath();
        ctx.fill();
    },

    update() {
        this.velocity += this.gravity;
        this.y += this.velocity;

        // ชนพื้น
        if (this.y + this.radius >= canvas.height) {
            this.y = canvas.height - this.radius;
            endGame();
        }

        // ชนเพดาน
        if (this.y - this.radius <= 0) {
            this.y = this.radius;
            this.velocity = 0;
        }
    },

    flap() {
        if (!isGameOver) {
            this.velocity = this.jump;
        }
    }
};

// ท่อสิ่งกีดขวาง
const pipes = [];
const pipeWidth = 40;
const pipeGap = 100;
const pipeSpeed = 1.8;

function createPipe() {
    const minHeight = 40;
    const maxHeight = canvas.height - pipeGap - minHeight;
    const topHeight = Math.floor(Math.random() * (maxHeight - minHeight + 1)) + minHeight;

    pipes.push({
        x: canvas.width,
        top: topHeight,
        bottom: canvas.height - topHeight - pipeGap,
        passed: false
    });
}

function updatePipes() {
    if (frameCount % 100 === 0) {
        createPipe();
    }

    for (let i = pipes.length - 1; i >= 0; i--) {
        const p = pipes[i];
        p.x -= pipeSpeed;

        ctx.fillStyle = '#440000';
        ctx.strokeStyle = '#ff1a1a';
        ctx.lineWidth = 2;

        // วาดท่อบน
        ctx.fillRect(p.x, 0, pipeWidth, p.top);
        ctx.strokeRect(p.x, 0, pipeWidth, p.top);

        // วาดท่อล่าง
        const bottomY = canvas.height - p.bottom;
        ctx.fillRect(p.x, bottomY, pipeWidth, p.bottom);
        ctx.strokeRect(p.x, bottomY, pipeWidth, p.bottom);

        // ตรวจสอบการชน
        if (
            bird.x + bird.radius > p.x &&
            bird.x - bird.radius < p.x + pipeWidth &&
            (bird.y - bird.radius < p.top || bird.y + bird.radius > bottomY)
        ) {
            endGame();
        }

        // คำนวณคะแนน
        if (!p.passed && p.x + pipeWidth < bird.x) {
            p.passed = true;
            score++;
            scoreEl.textContent = score;

            if (score > highScore) {
                highScore = score;
                highScoreEl.textContent = highScore;
                localStorage.setItem('flappy_high_score', highScore);
            }
        }

        if (p.x + pipeWidth < 0) {
            pipes.splice(i, 1);
        }
    }
}

function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    bird.update();
    bird.draw();
    updatePipes();

    frameCount++;

    if (!isGameOver) {
        animationFrameId = requestAnimationFrame(loop);
    }
}

function endGame() {
    isGameOver = true;
    gameOverMsg.style.display = 'block';
    cancelAnimationFrame(animationFrameId);
}

function resetGame() {
    bird.y = 180;
    bird.velocity = 0;
    pipes.length = 0;
    score = 0;
    frameCount = 0;
    scoreEl.textContent = 0;
    isGameOver = false;
    gameOverMsg.style.display = 'none';

    cancelAnimationFrame(animationFrameId);
    loop();
}

// Control Event Listeners
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        if (isGameOver) {
            resetGame();
        } else {
            bird.flap();
        }
    }
});

canvas.addEventListener('click', () => {
    if (!isGameOver) bird.flap();
});

jumpBtn.addEventListener('click', () => {
    if (!isGameOver) bird.flap();
});

resetBtn.addEventListener('click', resetGame);

// เริ่มทำงาน
loop();