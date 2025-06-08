const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const bgImage = new Image(); bgImage.src = 'background.jpg';
const playerImg = new Image(); playerImg.src = 'player.png';
const enemyImg = new Image(); enemyImg.src = 'enemy.png';

const bgMusic = new Audio('bg-music.mp3'); bgMusic.loop = true; bgMusic.volume = 0.4;
const hitSound = new Audio('hit.wav');
const spawnSound = new Audio('spawn.wav');

const player = {
  x: canvas.width / 2 - 20,
  y: canvas.height - 60,
  width: 40,
  height: 40,
  speed: 5,
  moveLeft: false,
  moveRight: false,
  bullets: []
};

let enemies = [];
let powerUps = [];
let score = 0;
let gameOver = false;
let enemySpeed = 2;
let lives = 3;
let started = false;
let paused = false;
let shieldActive = false;
let shieldTimer = 0;

function drawPlayer() {
  ctx.drawImage(playerImg, player.x, player.y, player.width, player.height);
}

function drawEnemies() {
  enemies.forEach(e => ctx.drawImage(enemyImg, e.x, e.y, e.width, e.height));
}

function drawPowerUps() {
  powerUps.forEach(p => {
    ctx.fillStyle = p.type === 'shield' ? 'cyan' : 'orange';
    ctx.fillRect(p.x, p.y, 20, 20);
  });
}

function drawBullets() {
  ctx.fillStyle = 'yellow';
  player.bullets.forEach(b => ctx.fillRect(b.x, b.y, 4, 10));
}

function updateEnemies() {
  enemies.forEach(e => e.y += enemySpeed);
  enemies = enemies.filter(e => e.y < canvas.height);
}

function updatePowerUps() {
  powerUps.forEach(p => p.y += 2);
  powerUps = powerUps.filter(p => p.y < canvas.height);
}

function updateBullets() {
  player.bullets.forEach(b => b.y -= 8);
  player.bullets = player.bullets.filter(b => b.y > 0);
}

function checkCollision(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function handleCollisions() {
  enemies.forEach((e, i) => {
    if (checkCollision(player, e)) {
      if (!shieldActive) {
        lives--;
        hitSound.play();
        if (lives <= 0) gameOver = true;
      }
      enemies.splice(i, 1);
    }
    player.bullets.forEach((b, j) => {
      if (checkCollision(b, e)) {
        enemies.splice(i, 1);
        player.bullets.splice(j, 1);
        score += 10;
      }
    });
  });

  powerUps.forEach((p, i) => {
    if (checkCollision(player, p)) {
      if (p.type === 'shield') {
        shieldActive = true;
        shieldTimer = 300;
      }
      powerUps.splice(i, 1);
    }
  });
}

function createEnemy() {
  const x = Math.random() * (canvas.width - 40);
  enemies.push({ x, y: -40, width: 40, height: 40 });
  spawnSound.play();
}

function createPowerUp() {
  const x = Math.random() * (canvas.width - 20);
  powerUps.push({ x, y: -20, width: 20, height: 20, type: 'shield' });
}

function drawUI() {
  ctx.fillStyle = '#fff';
  ctx.font = '20px Arial';
  ctx.fillText(`Score: ${score}`, 10, 30);
  ctx.fillText(`Lives: ${lives}`, canvas.width - 90, 30);
  if (shieldActive) {
    ctx.fillStyle = 'cyan';
    ctx.fillText('Shield', canvas.width / 2 - 30, 30);
  }
}

function drawGameOver() {
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff';
  ctx.font = '32px Arial';
  ctx.fillText('Game Over', canvas.width / 2 - 90, canvas.height / 2 - 20);
  ctx.font = '20px Arial';
  ctx.fillText(`Final Score: ${score}`, canvas.width / 2 - 70, canvas.height / 2 + 20);
  ctx.fillText('Press R to Restart', canvas.width / 2 - 80, canvas.height / 2 + 60);
}

function drawOverlay(text) {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'white';
  ctx.font = '24px Arial';
  ctx.fillText(text, canvas.width / 2 - ctx.measureText(text).width / 2, canvas.height / 2);
}

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);

  if (!started) {
    drawOverlay('Click or Press Enter to Start');
    requestAnimationFrame(gameLoop);
    return;
  }

  if (paused) {
    drawOverlay('Paused');
    requestAnimationFrame(gameLoop);
    return;
  }

  if (!gameOver) {
    if (player.moveLeft && player.x > 0) player.x -= player.speed;
    if (player.moveRight && player.x + player.width < canvas.width) player.x += player.speed;

    updateEnemies();
    updatePowerUps();
    updateBullets();
    handleCollisions();

    drawPlayer();
    drawEnemies();
    drawPowerUps();
    drawBullets();
    drawUI();

    score++;
    if (score % 500 === 0) enemySpeed += 0.5;
    if (score % 800 === 0) createPowerUp();

    if (shieldActive) {
      shieldTimer--;
      if (shieldTimer <= 0) shieldActive = false;
    }
  } else {
    drawGameOver();
  }

  requestAnimationFrame(gameLoop);
}

setInterval(() => {
  if (!gameOver && started && !paused) createEnemy();
}, 800);

document.addEventListener('keydown', e => {
  if (!started && (e.key === 'Enter' || e.key === ' ')) {
    started = true;
    bgMusic.play();
  }
  if (e.key === 'p') {
    paused = !paused;
    paused ? bgMusic.pause() : bgMusic.play();
  }
  if (e.key === 'ArrowLeft' || e.key === 'a') player.moveLeft = true;
  if (e.key === 'ArrowRight' || e.key === 'd') player.moveRight = true;
  if (e.key === ' ' && started && !paused) shoot();
  if (e.key === 'r' && gameOver) {
    resetGame();
  }
});

document.addEventListener('keyup', e => {
  if (e.key === 'ArrowLeft' || e.key === 'a') player.moveLeft = false;
  if (e.key === 'ArrowRight' || e.key === 'd') player.moveRight = false;
});

function shoot() {
  player.bullets.push({ x: player.x + player.width / 2 - 2, y: player.y });
}

function resetGame() {
  score = 0;
  lives = 3;
  enemySpeed = 2;
  enemies = [];
  powerUps = [];
  player.bullets = [];
  player.x = canvas.width / 2 - 20;
  gameOver = false;
  started = true;
  bgMusic.play();
}

// Touch Buttons
document.getElementById('leftBtn').ontouchstart = () => player.moveLeft = true;
document.getElementById('leftBtn').ontouchend = () => player.moveLeft = false;
document.getElementById('rightBtn').ontouchstart = () => player.moveRight = true;
document.getElementById('rightBtn').ontouchend = () => player.moveRight = false;
document.getElementById('shootBtn').ontouchstart = () => shoot();
document.getElementById('pauseBtn').ontouchstart = () => {
  paused = !paused;
  paused ? bgMusic.pause() : bgMusic.play();
};

canvas.addEventListener('click', () => {
  if (!started) {
    started = true;
    bgMusic.play();
  } else {
    paused = !paused;
    paused ? bgMusic.pause() : bgMusic.play();
  }
});

window.onload = () => {
  bgMusic.play().catch(() => {
    document.addEventListener('click', () => bgMusic.play(), { once: true });
  });
  gameLoop();
};
