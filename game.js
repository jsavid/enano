const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let keys = {};
let score = 0;
let lives = 3;
let enemies = [];
let enemySpawnTimer;
let player;

document.addEventListener("keydown", (e) => keys[e.key] = true);
document.addEventListener("keyup", (e) => keys[e.key] = false);

class Player {
  constructor() {
    this.x = 100;
    this.y = 336;
    this.w = 16;
    this.h = 32;
    this.vx = 0;
    this.vy = 0;
    this.onGround = true;
  }

  update() {
    this.vx = 0;
    if (keys["ArrowLeft"]) this.vx = -3;
    if (keys["ArrowRight"]) this.vx = 3;
    if (keys["ArrowUp"] && this.onGround) {
      this.vy = -10;
      this.onGround = false;
    }

    this.vy += 0.5; // gravedad
    this.x += this.vx;
    this.y += this.vy;

    // Suelo
    if (this.y + this.h >= 368) {
      this.y = 368 - this.h;
      this.vy = 0;
      this.onGround = true;
    }
  }

  draw() {
    // Dibujar cuerpo CGA
    ctx.fillStyle = "#FF55FF"; // rosa
    ctx.fillRect(this.x, this.y, this.w, this.h);

    // Casco
    ctx.fillStyle = "#00AAAA"; // celeste
    ctx.fillRect(this.x, this.y, this.w, 6);

    // Barba
    ctx.fillStyle = "#FFFFFF"; // blanca
    ctx.fillRect(this.x + 4, this.y + 20, 8, 6);
  }
}

class Enemy {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 16;
    this.h = 32;
    this.vx = -2;
    this.alive = true;
  }

  update() {
    this.x += this.vx;
    if (this.x + this.w < 0) this.alive = false;

    // Colisión con jugador
    if (this.x < player.x + player.w &&
        this.x + this.w > player.x &&
        this.y < player.y + player.h &&
        this.y + this.h > player.y) {
      this.alive = false;
      lives--;
      updateUI();
      if (lives <= 0) gameOver();
    }
  }

  draw() {
    // Cuerpo blanco
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(this.x, this.y, this.w, this.h);

    // Ojos rosas
    ctx.fillStyle = "#FF55FF";
    ctx.fillRect(this.x + 4, this.y + 6, 2, 2);
    ctx.fillRect(this.x + 10, this.y + 6, 2, 2);

    // Costillas celestes
    ctx.fillStyle = "#00AAAA";
    ctx.fillRect(this.x + 4, this.y + 16, 8, 2);
  }
}

function updateUI() {
  document.getElementById("score").innerText = "PUNTOS: " + score;
  document.getElementById("lives").innerText = "VIDAS: " + "❤️".repeat(lives);
}

function spawnEnemy() {
  enemies.push(new Enemy(canvas.width, 336));
  if (enemies.length >= 5) clearInterval(enemySpawnTimer);
}

function gameOver() {
  clearInterval(enemySpawnTimer);
  alert("¡GAME OVER! PUNTOS: " + score);
}

function restartGame() {
  score = 0;
  lives = 3;
  enemies = [];
  player = new Player();
  updateUI();
  enemySpawnTimer = setInterval(spawnEnemy, 1500);
}

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Piso
  ctx.fillStyle = "#00AAAA";
  ctx.fillRect(0, 368, canvas.width, 2);

  player.update();
  player.draw();

  enemies.forEach((enemy, i) => {
    enemy.update();
    enemy.draw();
    if (!enemy.alive) {
      enemies.splice(i, 1);
      score++;
      updateUI();
    }
  });

  requestAnimationFrame(gameLoop);
}

// Iniciar juego
player = new Player();
enemySpawnTimer = setInterval(spawnEnemy, 1500);
updateUI();
gameLoop();