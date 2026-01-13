const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// --- CONSTANTS & CONFIG ---
const GRAVITY = 0.5;
const FRICTION = 0.8;
const JUMP_FORCE = -10;
const SPEED = 3;
const TILE_SIZE = 16;
const SCALE = 2; // Art is 16x16, drawn at 32x32 logic? Or just zoom canvas.
// Let's keep logic 1:1 with pixels for simplicity, but render scaled if needed. 
// For now, drawing directly to 640x400. 
// 16x16 sprites will look small on 640x400. Let's use 2x scale rendering manually or context scale.
ctx.imageSmoothingEnabled = false;
ctx.scale(2, 2); // Logical resolution: 320x200

// CGA PALETTE
const COLORS = {
  BLACK: "#000000",
  CYAN: "#55FFFF",
  MAGENTA: "#FF55FF",
  WHITE: "#FFFFFF",
  TRANS: null
};

// --- INPUT HANDLER ---
const keys = {};
document.addEventListener("keydown", (e) => keys[e.code] = true);
document.addEventListener("keyup", (e) => keys[e.code] = false);

// --- SPRITE SYSTEM ---
// Sprites are defined as arrays of strings.
// '.' = Transparent, 'C' = Cyan, 'M' = Magenta, 'W' = White, 'B' = Black
const SPRITES = {
  DWARF_IDLE: [
    "................",
    "................",
    ".....CCCCCC.....",
    "....CCCCCCCC....",
    "....CCCCCCCC....",
    ".....CCCCCC.....", // Helmet
    ".....MMMMMM.....", // Face
    ".....MWMWMW.....", // Eyes
    "....WWWWWWWW....", // Beard
    "....WWWWWWWW....",
    ".....WWWWWW.....",
    "....CCCCCCCC....", // Body
    "...CCCCCCCCCC...",
    "...CCCCCCCCCC...",
    "....CC....CC....", // Legs
    "....CC....CC...."
  ],
  DWARF_RUN: [
    // Simple 2 frame run (logic will toggle)
  ],
  SKELETON: [
    "................",
    ".....WWWWWW.....",
    "....WBBWBBWW....", // Skull
    "....WWWWWWWW....",
    ".....WWWWWW.....",
    "......WWWW......", // Neck
    "....WWWWWWWW....", // Ribs
    "....WBBBBBBW....",
    "....WWWWWWWW....",
    "......WWWW......", // Spine
    ".....WW..WW.....", // Pelvis
    ".....W....W.....",
    ".....W....W.....", // Legs
    ".....W....W.....",
    "....WW....WW...."
  ],
  DOOR: [
    "CCCC........CCCC",
    "CC............CC",
    "CC..MMMMMMMM..CC",
    "CC..MMMMMMMM..CC",
    "CC..MM....MM..CC",
    "CC..MM....MM..CC",
    "CC..MM....MM..CC",
    "CC..MM....MM..CC",
    "CC..MM....MM..CC",
    "CC..MM....MM..CC",
    "CC..MM....MM..CC",
    "CC..MM....MM..CC",
    "CC..MMMMMMMM..CC",
    "CC..MMMMMMMM..CC",
    "CCCC........CCCC",
    "CCCC........CCCC"
  ],
  AXE: [
    "................",
    "......CCC.......",
    "....CCBBCC......",
    "...CBBBBC......", // Blade
    "...CBBBBC.......",
    "....CCBBCC......",
    "......CCC.......",
    ".......W........",
    ".......W........", // Handle
    ".......W........",
    ".......W........",
    ".......W........",
    ".......W........",
    ".......W........",
    "................",
    "................"
  ]
};

// Helper to draw sprites
function drawSprite(ctx, spriteKey, x, y, flip = false) {
  const sprite = SPRITES[spriteKey];
  if (!sprite) return;

  for (let row = 0; row < sprite.length; row++) {
    for (let col = 0; col < sprite[row].length; col++) {
      const char = sprite[row][flip ? 15 - col : col];
      let color = COLORS.TRANS;
      if (char === 'C') color = COLORS.CYAN;
      else if (char === 'M') color = COLORS.MAGENTA;
      else if (char === 'W') color = COLORS.WHITE;
      else if (char === 'B') color = COLORS.BLACK;

      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(Math.floor(x) + col, Math.floor(y) + row, 1, 1);
      }
    }
  }
}

// --- CLASSES ---

class Game {
  constructor() {
    this.score = 0;
    this.levelNum = 1;
    this.lives = 3;
    this.resetLevel();
  }

  resetLevel() {
    this.platforms = [];
    this.enemies = [];

    // Floor
    this.platforms.push({ x: 0, y: 184, w: 320, h: 16 });

    // Procedural Platforms (Tiers)
    // Vertical space is ~180. Jump height is approx 60px (calculated from force/gravity).
    // Let's make tiers every 50px.
    const tiers = 3;
    const tierHeight = 50;

    // Simple seeded-like random (just Math.random for now as user asked for random)
    for (let i = 1; i <= tiers; i++) {
      let y = 184 - (i * tierHeight);
      // Create 1-2 platforms per tier
      let count = 1 + Math.floor(Math.random() * 2);
      for (let j = 0; j < count; j++) {
        let w = 40 + Math.random() * 60;
        let x = Math.random() * (320 - w);
        this.platforms.push({ x: Math.floor(x), y: y, w: Math.floor(w), h: 8 });

        // Chance to spawn skeleton on platform
        if (Math.random() > 0.4) {
          this.enemies.push(new Skeleton(x + w / 2, y - 16));
        }
      }
    }

    // Door Placement (Top tier or separate high platform)
    // Add a specific exit platform at top
    let exitX = 20 + Math.random() * 280;
    let exitY = 20;
    this.platforms.push({ x: exitX - 20, y: exitY + 32, w: 50, h: 8 });
    this.door = { x: exitX, y: exitY, w: 16, h: 32 };

    // Player Start
    this.player = new Player(10, 160);

    // Difficulty Scaling
    // Add extra skeletons on floor based on level
    for (let k = 0; k < this.levelNum; k++) {
      this.enemies.push(new Skeleton(100 + Math.random() * 200, 168));
    }
  }

  update() {
    this.player.update(this.platforms, this.enemies);

    // Door collision
    if (checkRectCollide(this.player, this.door)) {
      this.nextLevel();
    }

    // Enemy Collisions
    this.enemies.forEach(enemy => {
      enemy.update(this.platforms);
      if (enemy.alive && checkRectCollide(this.player, enemy)) {
        // Simple damage logic
        if (!this.player.invulnerable) {
          this.lives--;
          this.player.hurt();
          if (this.lives <= 0) {
            alert("GAME OVER! Score: " + this.score);
            this.levelNum = 1;
            this.score = 0;
            this.lives = 3;
            this.resetLevel();
          }
        }
      }
    });

    // Clean up dead enemies
    this.enemies = this.enemies.filter(e => e.alive);
  }

  draw() {
    // Draw BG
    ctx.fillStyle = COLORS.BLACK;
    ctx.fillRect(0, 0, 320, 200);

    // Draw Platforms
    // Cyan borders, black fill to look "constructed"
    ctx.fillStyle = COLORS.CYAN;
    this.platforms.forEach(p => {
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = COLORS.BLACK;
      ctx.fillRect(p.x + 1, p.y + 1, p.w - 2, p.h - 2);
      // Add some texture detail
      ctx.fillStyle = COLORS.CYAN;
      ctx.fillRect(p.x + 2, p.y + 2, 2, 2);
      ctx.fillRect(p.x + p.w - 4, p.y + p.h - 4, 2, 2);
    });

    // Draw Door
    drawSprite(ctx, 'DOOR', this.door.x, this.door.y);

    // Draw Entities
    this.enemies.forEach(e => e.draw());
    this.player.draw();

    // UI
    ctx.fillStyle = COLORS.MAGENTA;
    ctx.font = "10px monospace";
    ctx.fillText(`LVL: ${this.levelNum}  HP: ${"❤️".repeat(this.lives)}  PTS: ${this.score}`, 5, 12);
  }

  nextLevel() {
    this.levelNum++;
    this.score += 100;
    this.resetLevel();
  }
}

class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 16;
    this.h = 16;
    this.vx = 0;
    this.vy = 0;
    this.facingRight = true;
    this.onGround = false;
    this.invulnerable = false;
    this.flashTimer = 0;
    this.isAttacking = false;
    this.attackTimer = 0;
    this.attackCooldown = 0;
  }

  update(platforms, enemies) {
    if (this.invulnerable) {
      this.flashTimer++;
      if (this.flashTimer > 60) {
        this.invulnerable = false;
        this.flashTimer = 0;
      }
    }

    if (this.attackCooldown > 0) this.attackCooldown--;

    // Attack Input (Space)
    if (keys["Space"] && !this.isAttacking && this.attackCooldown <= 0) {
      this.isAttacking = true;
      this.attackTimer = 15; // 15 frames of attack
      this.attackCooldown = 30;

      // Attack Logic: Check enemies
      // Hitbox ahead of player
      let hitX = this.facingRight ? this.x + 16 : this.x - 16;
      let hitbox = { x: hitX, y: this.y, w: 16, h: 16 };

      if (enemies) {
        enemies.forEach(e => {
          if (checkRectCollide(hitbox, e)) {
            e.alive = false;
            game.score += 50;
          }
        });
      }
    }

    if (this.isAttacking) {
      this.attackTimer--;
      if (this.attackTimer <= 0) this.isAttacking = false;
    }

    // Input
    if (keys["ArrowLeft"]) { this.vx = -SPEED; this.facingRight = false; }
    else if (keys["ArrowRight"]) { this.vx = SPEED; this.facingRight = true; }
    else { this.vx = 0; }

    if (keys["ArrowUp"] && this.onGround) {
      this.vy = JUMP_FORCE;
      this.onGround = false;
    }

    // Physics
    this.vy += GRAVITY;
    this.x += this.vx;
    this.handleCollisions(platforms, 'x');
    this.y += this.vy;
    this.handleCollisions(platforms, 'y');

    // Screen bounds
    if (this.x < 0) this.x = 0;
    if (this.x > 320 - 16) this.x = 320 - 16;
    if (this.y > 200) { // Fall death
      game.lives--;
      if (game.lives <= 0) {
        alert("GAME OVER! Score: " + game.score);
        game.levelNum = 1;
        game.score = 0;
        game.lives = 3;
        game.resetLevel();
      } else {
        this.x = 20; this.y = 20; this.vy = 0; // Respawn at top left roughly
      }
    }
  }

  hurt() {
    this.invulnerable = true;
    this.vy = -5;
    this.vx = this.facingRight ? -4 : 4; // Knockback
  }

  handleCollisions(platforms, axis) {
    this.onGround = false;
    for (let p of platforms) {
      if (checkRectCollide(this, p)) {
        if (axis === 'y') {
          if (this.vy > 0) { // Falling
            this.y = p.y - this.h;
            this.vy = 0;
            this.onGround = true;
          } else if (this.vy < 0) { // Hitting head
            this.y = p.y + p.h;
            this.vy = 0;
          }
        } else if (axis === 'x') {
          // Simple wall slide or stop
          if (this.vx > 0) this.x = p.x - this.w;
          else if (this.vx < 0) this.x = p.x + p.w;
        }
      }
    }
  }

  draw() {
    if (this.invulnerable && Math.floor(this.flashTimer / 5) % 2 === 0) return;
    drawSprite(ctx, 'DWARF_IDLE', this.x, this.y, !this.facingRight);

    if (this.isAttacking) {
      // Draw axe relative to player
      let axeX = this.facingRight ? this.x + 12 : this.x - 12;
      let axeY = this.y - 4 + (15 - this.attackTimer);
      drawSprite(ctx, 'AXE', axeX, this.y, !this.facingRight);
    }
  }
}

class Skeleton {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 16;
    this.h = 16;
    this.vx = -1;
    this.vy = 0;
    this.onGround = false;
    this.alive = true;
  }

  update(platforms) {
    this.vy += GRAVITY;

    // Simple patrol AI
    // Check for edge
    // (This requires looking ahead, for now just bounce off walls and stay on platforms)

    this.x += this.vx;
    this.handleCollisions(platforms, 'x'); // Bounce
    this.y += this.vy;
    this.handleCollisions(platforms, 'y'); // Land

    if (this.x <= 0 || this.x >= 320 - 16) this.vx *= -1;
  }

  handleCollisions(platforms, axis) {
    for (let p of platforms) {
      if (checkRectCollide(this, p)) {
        if (axis === 'y') {
          if (this.vy > 0) {
            this.y = p.y - this.h;
            this.vy = 0;
            // Turn around if at edge of platform?
          }
        } else if (axis === 'x') {
          this.vx *= -1; // Bounce
        }
      }
    }
  }

  draw() {
    drawSprite(ctx, 'SKELETON', this.x, this.y, this.vx > 0);
  }
}

function checkRectCollide(r1, r2) {
  return (r1.x < r2.x + r2.w &&
    r1.x + r1.w > r2.x &&
    r1.y < r2.y + r2.h &&
    r1.y + r1.h > r2.y);
}

// --- MAIN LOOP ---
const game = new Game();

function loop() {
  game.update();
  game.draw();
  requestAnimationFrame(loop);
}

loop();