const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const WIDTH = 800;
const HEIGHT = 600;
const FOOD_TYPES = ["shrimp", "fish", "toxin"];
const HIGHSCORE_KEY = "snacklotl_highscore";

// Görsel Tanımlamaları
const assets = {
  background: new Image(),
  axolotl: [new Image(), new Image(), new Image(), new Image()],
  shrimp: new Image(),
  fish: new Image(),
  toxin: new Image(),
};

assets.background.src = "assets/background.jpg";
assets.axolotl[0].src = "assets/axolotl_1.png";
assets.axolotl[1].src = "assets/axolotl_2.png";
assets.axolotl[2].src = "assets/axolotl_3.png";
assets.axolotl[3].src = "assets/axolotl_4.png";
assets.shrimp.src = "assets/food_shrimp.png";
assets.fish.src = "assets/food_fish.png";
assets.toxin.src = "assets/food_toxin.png";

const bgMusic = document.getElementById("bg-music");
bgMusic.volume = 1.0;

// Oyun Sınıfları
class Player {
  constructor(x, y, size) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.currentFrame = 0;
    this.animationTriggered = false;
    this.animationCounter = 0;
    this.animationSpeed = 10;
  }

  move(dx) {
    this.x += dx;
    if (this.x < this.size / 2) this.x = this.size / 2;
    if (this.x > WIDTH - this.size / 2) this.x = WIDTH - this.size / 2;
  }

  update() {
    if (this.animationTriggered) {
      this.animationCounter++;
      if (this.animationCounter >= this.animationSpeed) {
        this.animationCounter = 0;
        this.currentFrame++;
        if (this.currentFrame > 3) {
          this.currentFrame = 0;
          this.animationTriggered = false;
        }
      }
    } else {
      this.currentFrame = 0;
    }
  }

  draw() {
    const img = assets.axolotl[this.currentFrame];
    ctx.drawImage(
      img,
      this.x - this.size / 2,
      this.y - this.size / 2,
      this.size,
      this.size,
    );
  }

  triggerAnimation() {
    this.animationTriggered = true;
    this.currentFrame = 1;
    this.animationCounter = 0;
  }

  getRect() {
    return {
      x: this.x - this.size / 2,
      y: this.y - this.size / 2,
      width: this.size,
      height: this.size,
    };
  }
}

class FoodItem {
  constructor(type) {
    this.type = type;
    this.x = Math.random() * (WIDTH - 100) + 50;
    this.y = -50;
    this.speed = 5;
    this.size = 80;
  }

  fall() {
    this.y += this.speed;
  }

  draw() {
    let img = assets.fish;
    if (this.type === "shrimp") img = assets.shrimp;
    else if (this.type === "toxin") img = assets.toxin;

    ctx.drawImage(
      img,
      this.x - this.size / 2,
      this.y - this.size / 2,
      this.size,
      this.size,
    );
  }

  getRect() {
    return {
      x: this.x - this.size / 2,
      y: this.y - this.size / 2,
      width: this.size,
      height: this.size,
    };
  }
}

// Oyun Durumları
let gameState = "START"; // START, HOWTOPLAY, PLAYING, GAMEOVER
let player = new Player(WIDTH / 2, HEIGHT - 80, 160);
let foods = [];
let score = 0;
let lives = 3;
let speed = 5;
let highscore = localStorage.getItem(HIGHSCORE_KEY) || 0;
let lastSpeedIncreaseScore = 0;
let spawnTimer = 0;

function checkCollision(rect1, rect2) {
  return (
    rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.y + rect1.height > rect2.y
  );
}

// Klavye Kontrolleri
const keys = {};
window.addEventListener("keydown", (e) => {
  keys[e.code] = true;

  if (e.code === "Space") {
    if (gameState === "START") {
      gameState = "HOWTOPLAY";
      switchScreen("how-to-play-screen");
    } else if (gameState === "HOWTOPLAY") {
      startGame();
    }
  }

  if (gameState === "GAMEOVER") {
    if (e.code === "KeyR") {
      startGame();
    } else if (e.code === "KeyQ") {
      location.reload();
    }
  }
});

window.addEventListener("keyup", (e) => {
  keys[e.code] = false;
});

function switchScreen(screenId) {
  document
    .querySelectorAll(".screen")
    .forEach((s) => s.classList.add("hidden"));
  document.getElementById(screenId).classList.remove("hidden");
}

function startGame() {
  gameState = "PLAYING";
  switchScreen("game-screen");
  player = new Player(WIDTH / 2, HEIGHT - 80, 160);
  foods = [];
  score = 0;
  lives = 3;
  speed = 5;
  lastSpeedIncreaseScore = 0;

  bgMusic.play().catch(() => {});
}

// Oyun Döngüsü (Game Loop)
function update() {
  if (gameState === "PLAYING") {
    // Oyuncu Hareketi
    if (keys["ArrowLeft"] || keys["KeyA"]) {
      player.move(-10);
    }
    if (keys["ArrowRight"] || keys["KeyD"]) {
      player.move(10);
    }

    // Hız Artışı
    if (Math.floor(score / 10) > lastSpeedIncreaseScore) {
      speed += 0.5;
      lastSpeedIncreaseScore = Math.floor(score / 10);
    }

    // Yemek Oluşturma
    spawnTimer++;
    if (spawnTimer > 60) {
      const fType = FOOD_TYPES[Math.floor(Math.random() * FOOD_TYPES.length)];
      const newFood = new FoodItem(fType);
      newFood.speed = speed;
      foods.push(newFood);
      spawnTimer = 0;
    }

    // Yemekleri Güncelle
    for (let i = foods.length - 1; i >= 0; i--) {
      foods[i].speed = speed;
      foods[i].fall();

      // Çarpışma Kontrolü
      if (checkCollision(player.getRect(), foods[i].getRect())) {
        if (foods[i].type === "toxin") {
          lives--;
          if (lives <= 0) {
            gameState = "GAMEOVER";
            if (score > highscore) {
              highscore = score;
              localStorage.setItem(HIGHSCORE_KEY, highscore);
            }
            document.getElementById("final-score").innerText =
              `Final Score: ${score}`;
            document.getElementById("game-over-highscore").innerText =
              `High Score: ${highscore}`;
            switchScreen("game-over-screen");
          }
        } else {
          score += 1;
          player.triggerAnimation();
        }
        foods.splice(i, 1);
      } else if (foods[i].y > HEIGHT + 50) {
        foods.splice(i, 1);
      }
    }

    player.update();
  }
}

function draw() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  if (gameState === "PLAYING") {
    // Oyun içi çizimler
    player.draw();
    foods.forEach((f) => f.draw());

    // UI Güncelleme
    document.getElementById("score-display").innerText = `Score: ${score}`;
    document.getElementById("lives-display").innerText = `Lives: ${lives}`;
    document.getElementById("highscore-display").innerText =
      `High Score: ${highscore}`;
  }
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();
