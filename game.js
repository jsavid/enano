const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let keys = {};
let score = 0;
let lives = 3;
let level = 1;
let enemies = [];
let player, enemySpawnTimer;

document.addEventListener("keydown", (e) => keys[e.key] = true);
document.addEventListener("keyup", (e) => keys[e.key] = false);

class Player {
  constructor() {
    this.x = 100;
    this.y = 300;
    this.width = 32;
    this.height = 32;
    this.vx = 0;
    this.vy = 0;
    this.jumpPower = -10;
    this.onGround = true;
    this.color = "orange";
  }

  update() {
    this.vx = 0;
    if (keys["ArrowLeft"]) this.vx = -3;
    if (keys["ArrowRight"]) this.vx = 3;
    if (keys[" "] && this.onGround) {
      this.vy = this.jumpPower;
      this.onGround = false;
    }

    this.vy += 0.5; // gravity
    this.x += this.vx;
    this.y += this.vy;

    // Ground collision
    if (this.y + this.height >= 368) {
      this.y = 368 - this.height;
      this.vy = 0;
      this.onGround = true;
    }
  }

  draw() {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
}

class Enemy {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 28;
    this.height = 32;
    this.vx = -1.5 - level * 0.2;
    this.color = "white";
    this.alive = true;
  }

  update() {
    this.x += this.vx;
    if (this.x + this.width < 0) this.alive = false;
    // collision with player
    if (this.x < player.x + player.width &&
        this.x + this.width > player.x &&
        this.y < player.y + player.height &&
        this.y + this.height > player.y) {
      if (lives > 0) lives--;
      this.alive = false;
      updateUI();
      if (lives === 0) gameOver();
    }
  }

  draw() {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
}

function updateUI() {
  document.getElementById("score").innerText = "Puntos: " + score;
  document.getElementById("lives").innerText = "❤️".repeat(lives);
  document.getElementById("level").innerText = "Nivel: " + level;
}

function spawnEnemy() {
  enemies.push(new Enemy(canvas.width, 336));
  if (enemies.length >= 5 + level * 2) {
    clearInterval(enemySpawnTimer);
    setTimeout(() => nextLevel(), 2000);
  }
}

function nextLevel() {
  level++;
  score += 10;
  enemies = [];
  updateUI();
  enemySpawnTimer = setInterval(spawnEnemy, 1000 - level * 50);
}

function gameOver() {
  clearInterval(enemySpawnTimer);
  alert("¡Game Over! Tu puntaje fue: " + score);
}

function restartGame() {
  score = 0;
  lives = 3;
  level = 1;
  enemies = [];
  player = new Player();
  updateUI();
  enemySpawnTimer = setInterval(spawnEnemy, 1000);
}

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  player.update();
  player.draw();

  enemies.forEach((enemy, i) => {
    enemy.update();
    enemy.draw();
    if (!enemy.alive) enemies.splice(i, 1);
  });

  requestAnimationFrame(gameLoop);
}

// Start game
player = new Player();
enemySpawnTimer = setInterval(spawnEnemy, 1000);
updateUI();
gameLoop();