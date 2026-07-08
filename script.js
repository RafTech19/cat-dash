const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const highscoreEl = document.getElementById("highscore");
const speedEl = document.getElementById("speed");
const mapLabelEl = document.getElementById("mapLabel");
const livesDisplayEl = document.getElementById("livesDisplay");
const overlay = document.getElementById("overlay");
const gameoverEl = document.getElementById("gameover");
const hitFlashEl = document.getElementById("hitFlash");
const retryToastEl = document.getElementById("retryToast");
const retryMessageEl = document.getElementById("retryMessage");
const finalScoreEl = document.getElementById("finalScore");
const newRecordEl = document.getElementById("newRecord");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const menuBtn = document.getElementById("menuBtn");
const mapGrid = document.getElementById("mapGrid");
const canvasContainer = document.getElementById("canvasContainer");

const GROUND_Y = 250;
const GRAVITY = 0.65;
const JUMP_FORCE = -12.5;
const PLAYER_WIDTH = 48;
const PLAYER_HEIGHT = 48;
const MAX_LIVES = 3;
const INVINCIBLE_FRAMES = 120;

const MAPS = {
  neon: {
    name: "Neon City",
    bgTop: "#12122a",
    bgBottom: "#2d1b4e",
    ground: "#2a1a4a",
    groundLine: "#ff2d95",
    groundDash: "rgba(0, 245, 255, 0.15)",
    obstacles: { cactus: "#ff2d95", block: "#b84dff", spike: "#ffe566", blockStroke: "#ffe566" },
    star: "#ffe566",
    particle: "#ff9a56",
    decor: "stars",
    speedMod: 1,
    starFreq: 0.7,
  },
  forest: {
    name: "Forest Run",
    bgTop: "#0a1f14",
    bgBottom: "#1a3d28",
    ground: "#1e4d30",
    groundLine: "#3ddc97",
    groundDash: "rgba(61, 220, 151, 0.2)",
    obstacles: { cactus: "#2d8a56", block: "#5cb85c", spike: "#8b6914", blockStroke: "#c9e265" },
    star: "#c9e265",
    particle: "#3ddc97",
    decor: "trees",
    speedMod: 0.95,
    starFreq: 0.75,
  },
  ocean: {
    name: "Ocean Deep",
    bgTop: "#051525",
    bgBottom: "#0a3050",
    ground: "#0d3d5c",
    groundLine: "#00e5ff",
    groundDash: "rgba(0, 229, 255, 0.18)",
    obstacles: { cactus: "#0077b6", block: "#48cae4", spike: "#90e0ef", blockStroke: "#caf0f8" },
    star: "#90e0ef",
    particle: "#00e5ff",
    decor: "bubbles",
    speedMod: 1.05,
    starFreq: 0.65,
  },
  sunset: {
    name: "Sunset Dune",
    bgTop: "#2d1b0e",
    bgBottom: "#5c2e0a",
    ground: "#6b3a1a",
    groundLine: "#ff9a56",
    groundDash: "rgba(255, 154, 86, 0.22)",
    obstacles: { cactus: "#c45c2a", block: "#e07b39", spike: "#ffc857", blockStroke: "#ffe566" },
    star: "#ffc857",
    particle: "#ff9a56",
    decor: "sun",
    speedMod: 1.1,
    starFreq: 0.6,
  },
  city: {
    name: "Night City",
    bgTop: "#0d0d0d",
    bgBottom: "#1a1a2e",
    ground: "#222233",
    groundLine: "#ffc857",
    groundDash: "rgba(255, 200, 87, 0.15)",
    obstacles: { cactus: "#555", block: "#333", spike: "#ffc857", blockStroke: "#ff4d6d" },
    star: "#ffc857",
    particle: "#ff4d6d",
    decor: "buildings",
    speedMod: 1.15,
    starFreq: 0.55,
  },
};

const catImg = new Image();
catImg.src = "cat.svg";

let highscore = Number(localStorage.getItem("neonRunnerHighscore") || 0);
highscoreEl.textContent = highscore;

let selectedMap = "neon";
let currentMap = MAPS.neon;

const state = {
  running: false,
  score: 0,
  speed: 5,
  frame: 0,
  lives: MAX_LIVES,
  invincible: 0,
  crashing: false,
  obstacles: [],
  stars: [],
  particles: [],
  decorItems: [],
  player: {
    x: 80,
    y: GROUND_Y - PLAYER_HEIGHT,
    vy: 0,
    grounded: true,
    angle: 0,
  },
};

function getMap() {
  return MAPS[selectedMap] || MAPS.neon;
}

function updateLivesDisplay() {
  const hearts = livesDisplayEl.querySelectorAll(".life");
  hearts.forEach((heart, i) => {
    heart.classList.toggle("lost", i >= state.lives);
    heart.classList.remove("shake");
  });
}

function shakeLifeIcon() {
  const hearts = livesDisplayEl.querySelectorAll(".life");
  const idx = state.lives;
  if (hearts[idx]) {
    hearts[idx].classList.add("shake");
    setTimeout(() => hearts[idx]?.classList.remove("shake"), 500);
  }
}

function resetRound(keepScore = false) {
  if (!keepScore) {
    state.score = 0;
    state.speed = 5;
    scoreEl.textContent = "0";
    speedEl.textContent = "1.0x";
  }
  state.frame = 0;
  state.lives = MAX_LIVES;
  state.invincible = 0;
  state.crashing = false;
  state.obstacles = [];
  state.stars = [];
  state.particles = [];
  state.player = {
    x: 80,
    y: GROUND_Y - PLAYER_HEIGHT,
    vy: 0,
    grounded: true,
    angle: 0,
  };
  initDecor();
  updateLivesDisplay();
}

function initDecor() {
  state.decorItems = [];
  const map = getMap();
  for (let i = 0; i < 12; i++) {
    state.decorItems.push({
      x: Math.random() * canvas.width,
      y: Math.random() * (GROUND_Y - 40) + 10,
      size: 4 + Math.random() * 12,
      speed: 0.3 + Math.random() * 0.7,
      phase: Math.random() * Math.PI * 2,
    });
  }
}

function jump() {
  if (!state.running || state.invincible > INVINCIBLE_FRAMES - 30) return;
  if (state.player.grounded) {
    state.player.vy = JUMP_FORCE;
    state.player.grounded = false;
    spawnParticles(
      state.player.x + PLAYER_WIDTH / 2,
      GROUND_Y,
      currentMap.particle,
      6
    );
  }
}

function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    state.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 4,
      vy: -Math.random() * 4 - 1,
      life: 30 + Math.random() * 20,
      color,
      size: 2 + Math.random() * 3,
    });
  }
}

function spawnObstacle() {
  const types = ["cactus", "block", "spike"];
  const type = types[Math.floor(Math.random() * types.length)];
  let w, h;

  if (type === "cactus") {
    w = 22 + Math.random() * 14;
    h = 30 + Math.random() * 25;
  } else if (type === "block") {
    w = 28 + Math.random() * 20;
    h = 28 + Math.random() * 15;
  } else {
    w = 35;
    h = 22;
  }

  state.obstacles.push({
    x: canvas.width + 20,
    y: GROUND_Y - h,
    w,
    h,
    type,
    passed: false,
  });
}

function spawnStar() {
  state.stars.push({
    x: canvas.width + 20,
    y: GROUND_Y - 60 - Math.random() * 80,
    size: 14,
    collected: false,
    pulse: 0,
  });
}

function drawBackground() {
  const map = currentMap;
  const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  bgGrad.addColorStop(0, map.bgTop);
  bgGrad.addColorStop(1, map.bgBottom);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  state.decorItems.forEach((d) => {
    d.x -= state.speed * d.speed * 0.15;
    if (d.x < -20) {
      d.x = canvas.width + 20;
      d.y = Math.random() * (GROUND_Y - 40) + 10;
    }

    const alpha = 0.15 + Math.sin(state.frame * 0.05 + d.phase) * 0.08;

    if (map.decor === "stars") {
      ctx.globalAlpha = alpha + 0.3;
      ctx.fillStyle = "#fff";
      ctx.fillRect(d.x, d.y, 2, 2);
    } else if (map.decor === "trees") {
      ctx.globalAlpha = alpha + 0.2;
      ctx.fillStyle = "#1a5c35";
      ctx.beginPath();
      ctx.moveTo(d.x, d.y + d.size);
      ctx.lineTo(d.x - d.size * 0.6, d.y + d.size * 2);
      ctx.lineTo(d.x + d.size * 0.6, d.y + d.size * 2);
      ctx.closePath();
      ctx.fill();
    } else if (map.decor === "bubbles") {
      ctx.globalAlpha = alpha + 0.15;
      ctx.strokeStyle = "#90e0ef";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.size * 0.5, 0, Math.PI * 2);
      ctx.stroke();
    } else if (map.decor === "sun") {
      if (d.x > canvas.width * 0.6) return;
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = "#ffc857";
      ctx.beginPath();
      ctx.arc(canvas.width - 60, 50, 35, 0, Math.PI * 2);
      ctx.fill();
    } else if (map.decor === "buildings") {
      ctx.globalAlpha = alpha + 0.15;
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(d.x, d.y, d.size, GROUND_Y - d.y);
      const winLit = Math.sin(d.phase + state.frame * 0.02) > 0;
      if (winLit) {
        ctx.fillStyle = "#ffc857";
        ctx.globalAlpha = 0.4;
        ctx.fillRect(d.x + 3, d.y + 5, 3, 4);
      }
    }
    ctx.globalAlpha = 1;
  });
}

function drawGround() {
  const map = currentMap;
  ctx.fillStyle = map.ground;
  ctx.fillRect(0, GROUND_Y, canvas.width, canvas.height - GROUND_Y);

  ctx.strokeStyle = map.groundLine;
  ctx.lineWidth = 2;
  ctx.shadowColor = map.groundLine;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  ctx.lineTo(canvas.width, GROUND_Y);
  ctx.stroke();
  ctx.shadowBlur = 0;

  const offset = (state.frame * state.speed) % 40;
  ctx.strokeStyle = map.groundDash;
  ctx.lineWidth = 1;
  for (let x = -offset; x < canvas.width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, GROUND_Y + 15);
    ctx.lineTo(x + 20, GROUND_Y + 15);
    ctx.stroke();
  }
}

function drawPlayer() {
  const { x, y, angle, grounded } = state.player;
  const bounce = grounded ? Math.sin(state.frame * 0.25) * 2 : 0;
  const blink = state.invincible > 0 && Math.floor(state.invincible / 6) % 2 === 0;

  if (blink) return;

  ctx.save();
  ctx.translate(x + PLAYER_WIDTH / 2, y + PLAYER_HEIGHT / 2 + bounce);
  ctx.rotate(angle);

  ctx.shadowColor = currentMap.particle;
  ctx.shadowBlur = 12;

  if (catImg.complete && catImg.naturalWidth > 0) {
    ctx.drawImage(
      catImg,
      -PLAYER_WIDTH / 2,
      -PLAYER_HEIGHT / 2,
      PLAYER_WIDTH,
      PLAYER_HEIGHT
    );
  } else {
    ctx.font = `${PLAYER_HEIGHT}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🐱", 0, 0);
  }

  ctx.restore();
  ctx.shadowBlur = 0;
}

function drawObstacle(obs) {
  const colors = currentMap.obstacles;
  ctx.save();

  if (obs.type === "cactus") {
    ctx.fillStyle = colors.cactus;
    ctx.shadowColor = colors.cactus;
    ctx.shadowBlur = 8;
    ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
    ctx.fillRect(obs.x - 6, obs.y + obs.h * 0.3, 8, obs.h * 0.5);
    ctx.fillRect(obs.x + obs.w - 2, obs.y + obs.h * 0.2, 8, obs.h * 0.4);
  } else if (obs.type === "block") {
    ctx.fillStyle = colors.block;
    ctx.shadowColor = colors.block;
    ctx.shadowBlur = 10;
    ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
    ctx.strokeStyle = colors.blockStroke;
    ctx.lineWidth = 2;
    ctx.strokeRect(obs.x + 4, obs.y + 4, obs.w - 8, obs.h - 8);
  } else {
    ctx.fillStyle = colors.spike;
    ctx.shadowColor = colors.spike;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(obs.x, obs.y + obs.h);
    ctx.lineTo(obs.x + obs.w / 2, obs.y);
    ctx.lineTo(obs.x + obs.w, obs.y + obs.h);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
  ctx.shadowBlur = 0;
}

function drawStar(star) {
  star.pulse += 0.1;
  const glow = 8 + Math.sin(star.pulse) * 4;
  ctx.save();
  ctx.translate(star.x, star.y);
  ctx.shadowColor = currentMap.star;
  ctx.shadowBlur = glow;
  ctx.fillStyle = currentMap.star;
  ctx.font = `${star.size}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("⭐", 0, 0);
  ctx.restore();
}

function drawParticles() {
  state.particles.forEach((p) => {
    ctx.globalAlpha = p.life / 50;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.size);
  });
  ctx.globalAlpha = 1;
}

function rectsOverlap(a, b) {
  const pad = 4;
  return (
    a.x + pad < b.x + b.w - pad &&
    a.x + a.w - pad > b.x + pad &&
    a.y + pad < b.y + b.h - pad &&
    a.y + a.h - pad > b.y + pad
  );
}

function showHitFlash() {
  hitFlashEl.classList.remove("hidden");
  void hitFlashEl.offsetWidth;
  hitFlashEl.style.animation = "none";
  void hitFlashEl.offsetWidth;
  hitFlashEl.style.animation = "";
  setTimeout(() => hitFlashEl.classList.add("hidden"), 500);
}

function showRetryToast() {
  retryMessageEl.textContent = `Nyawa tersisa: ${state.lives}`;
  retryToastEl.classList.remove("hidden");
  setTimeout(() => retryToastEl.classList.add("hidden"), 1600);
}

function handleCrash() {
  if (state.crashing || state.invincible > 0) return;
  state.crashing = true;
  state.running = false;
  shakeLifeIcon();
  showHitFlash();
  spawnParticles(
    state.player.x + PLAYER_WIDTH / 2,
    state.player.y + PLAYER_HEIGHT / 2,
    "#ff4d6d",
    15
  );

  state.lives--;

  if (state.lives > 0) {
    updateLivesDisplay();
    showRetryToast();

    state.obstacles = state.obstacles.filter((obs) => obs.x > state.player.x + 80);
    state.player.y = GROUND_Y - PLAYER_HEIGHT;
    state.player.vy = 0;
    state.player.grounded = true;
    state.player.angle = 0;
    state.invincible = INVINCIBLE_FRAMES;

    setTimeout(() => {
      if (state.lives > 0) {
        state.crashing = false;
        state.running = true;
        gameLoop();
      }
    }, 1400);
  } else {
    updateLivesDisplay();
    setTimeout(() => endGame(), 800);
  }
}

function update() {
  state.frame++;
  if (state.invincible > 0) state.invincible--;

  const map = currentMap;
  state.score += 0.1;
  state.speed = (5 + Math.floor(state.score / 200) * 0.5) * map.speedMod;
  scoreEl.textContent = Math.floor(state.score);
  speedEl.textContent = (state.speed / 5).toFixed(1) + "x";

  const p = state.player;
  p.vy += GRAVITY;
  p.y += p.vy;

  if (p.y >= GROUND_Y - PLAYER_HEIGHT) {
    p.y = GROUND_Y - PLAYER_HEIGHT;
    p.vy = 0;
    p.grounded = true;
    p.angle = 0;
  } else {
    p.angle = Math.min(p.vy * 0.04, 0.6);
  }

  const spawnRate = Math.max(55 - Math.floor(state.score / 100) * 3, 25);
  if (state.frame % spawnRate === 0) spawnObstacle();

  if (state.frame % 180 === 0 && Math.random() < map.starFreq) {
    spawnStar();
  }

  const playerBox = {
    x: p.x,
    y: p.y,
    w: PLAYER_WIDTH,
    h: PLAYER_HEIGHT,
  };

  const canCollide = state.invincible === 0;

  state.obstacles = state.obstacles.filter((obs) => {
    obs.x -= state.speed;
    if (!obs.passed && obs.x + obs.w < p.x) {
      obs.passed = true;
      state.score += 5;
      spawnParticles(obs.x, obs.y + obs.h / 2, map.obstacles.block, 4);
    }
    if (canCollide && rectsOverlap(playerBox, obs)) {
      handleCrash();
    }
    return obs.x + obs.w > -20;
  });

  if (!state.running) return;

  state.stars = state.stars.filter((star) => {
    star.x -= state.speed * 0.8;
    if (!star.collected && rectsOverlap(playerBox, { x: star.x - 10, y: star.y - 10, w: 20, h: 20 })) {
      star.collected = true;
      state.score += 50;
      spawnParticles(star.x, star.y, map.star, 10);
      return false;
    }
    return star.x > -30;
  });

  state.particles = state.particles.filter((part) => {
    part.x += part.vx;
    part.y += part.vy;
    part.vy += 0.15;
    part.life--;
    return part.life > 0;
  });
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  drawGround();
  state.stars.forEach(drawStar);
  state.obstacles.forEach(drawObstacle);
  drawPlayer();
  drawParticles();
}

function gameLoop() {
  if (!state.running) return;
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

function startGame() {
  currentMap = getMap();
  mapLabelEl.textContent = currentMap.name;
  resetRound(false);
  state.running = true;
  overlay.classList.add("hidden");
  gameoverEl.classList.add("hidden");
  newRecordEl.classList.add("hidden");
  retryToastEl.classList.add("hidden");
  gameLoop();
}

function endGame() {
  state.running = false;
  const finalScore = Math.floor(state.score);
  finalScoreEl.textContent = finalScore;

  if (finalScore > highscore) {
    highscore = finalScore;
    localStorage.setItem("neonRunnerHighscore", highscore);
    highscoreEl.textContent = highscore;
    newRecordEl.classList.remove("hidden");
  }

  gameoverEl.classList.remove("hidden");
}

function showMenu() {
  state.running = false;
  gameoverEl.classList.add("hidden");
  overlay.classList.remove("hidden");
  draw();
}

mapGrid.addEventListener("click", (e) => {
  const card = e.target.closest(".map-card");
  if (!card) return;
  selectedMap = card.dataset.map;
  mapGrid.querySelectorAll(".map-card").forEach((c) => c.classList.remove("active"));
  card.classList.add("active");
});

startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", startGame);
menuBtn.addEventListener("click", showMenu);

document.addEventListener("keydown", (e) => {
  if (e.code === "Space" || e.code === "ArrowUp") {
    e.preventDefault();
    if (!state.running && !overlay.classList.contains("hidden")) {
      startGame();
    } else if (!state.running && !gameoverEl.classList.contains("hidden")) {
      startGame();
    } else {
      jump();
    }
  }
});

canvas.addEventListener("click", () => {
  if (!state.running) {
    if (!overlay.classList.contains("hidden") || !gameoverEl.classList.contains("hidden")) {
      if (!gameoverEl.classList.contains("hidden")) {
        startGame();
      } else {
        startGame();
      }
    }
  } else {
    jump();
  }
});

canvas.addEventListener("mousemove", (e) => {
  if (!state.running) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const mouseX = (e.clientX - rect.left) * scaleX;
  state.player.x = Math.max(40, Math.min(mouseX - PLAYER_WIDTH / 2, 200));
});

currentMap = getMap();
initDecor();
updateLivesDisplay();
draw();
