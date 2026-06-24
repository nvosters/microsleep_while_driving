/**
 * game.js — Main game loop, input, HUD, and state management
 */

(function () {
  const GAME_DURATION = Microsleep.GAME_DURATION;
  const DRAW_DISTANCE = 300;
  const TOTAL_SEGMENTS = 1200;

  // DOM references
  const canvas = document.getElementById('game-canvas');
  const startScreen = document.getElementById('start-screen');
  const endScreen = document.getElementById('end-screen');
  const hud = document.getElementById('hud');
  const blackoutEl = document.getElementById('blackout');
  const warningEl = document.getElementById('microsleep-warning');
  const timerEl = document.getElementById('timer');
  const fatigueFill = document.getElementById('fatigue-fill');
  const btnStart = document.getElementById('btn-start');
  const btnRestart = document.getElementById('btn-restart');

  // Game state
  let segments;
  let player;
  let microsleepCtrl;
  let stats;
  let keys = {};
  let running = false;
  let elapsed = 0;
  let lastTime = 0;
  let bounce = 0;
  const nearMissState = { cooldown: 0 };

  function resetStats() {
    return {
      collisions: 0,
      offTrackEvents: 0,
      nearMisses: 0,
    };
  }

  function initGame() {
    segments = Road.createTrack(TOTAL_SEGMENTS);
    player = Entities.createPlayer();
    microsleepCtrl = Microsleep.createController();
    stats = resetStats();
    elapsed = 0;
    bounce = 0;
    nearMissState.cooldown = 0;
    player.speed = 0.65;
  }

  /** Format seconds as M:SS */
  function formatTime(seconds) {
    const remaining = Math.max(0, Math.ceil(seconds));
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function updateHUD() {
    const remaining = GAME_DURATION - elapsed;
    timerEl.textContent = formatTime(remaining);
    const fatigue = Microsleep.getFatigue(elapsed);
    fatigueFill.style.width = `${fatigue}%`;
  }

  function setBlackout(active) {
    blackoutEl.classList.remove('hidden');
    blackoutEl.classList.toggle('active', active);
  }

  function setWarning(show) {
    warningEl.classList.toggle('hidden', !show);
  }

  function handleInput(dt, inputDisabled) {
    if (inputDisabled) return;

    const steerSpeed = 2.8 * dt;
    const keyLeft = keys['ArrowLeft'] || keys['a'] || keys['A'];
    const keyRight = keys['ArrowRight'] || keys['d'] || keys['D'];

    if (keyLeft) player.x -= steerSpeed;
    if (keyRight) player.x += steerSpeed;

    // Arcade drift recovery toward center slightly
    player.x *= 0.998;
    player.x = Math.max(-1.4, Math.min(1.4, player.x));
  }

  function updatePlayer(dt, driftX, inputDisabled) {
    // Automatic forward motion
    player.speed = Math.min(player.maxSpeed, player.speed + player.accel * dt * 60);
    const distance = player.speed * dt * Road.SEGMENT_LENGTH * 0.9;
    player.z += distance;

    // Microsleep drift
    if (inputDisabled && driftX !== 0) {
      player.x += driftX * dt * 0.8;
    }

    bounce += distance;
  }

  function update(dt) {
    const ms = Microsleep.update(microsleepCtrl, elapsed, dt);

    handleInput(dt, ms.inputDisabled);
    updatePlayer(dt, ms.driftX, ms.inputDisabled);

    setBlackout(ms.blackout);
    setWarning(ms.showWarning);

    const activeCars = Entities.updateAICars(segments, player.z, segments.length, dt);
    const obstacles = Entities.getActiveObstacles(segments, player.z, 40);

    if (nearMissState.cooldown > 0) nearMissState.cooldown -= dt;
    Entities.checkCollisions(player, activeCars, obstacles, stats, nearMissState);

    Entities.checkOffTrack(player, stats);
    updateHUD();
  }

  function render() {
    Renderer.renderFrame({
      segments,
      player,
      playerZ: player.z,
      drawDistance: DRAW_DISTANCE,
      bounce,
    });
  }

  function endGame() {
    running = false;
    hud.classList.add('hidden');
    setBlackout(false);
    setWarning(false);
    blackoutEl.classList.add('hidden');

    const ms = microsleepCtrl.stats;
    document.getElementById('stat-microsleeps').textContent = ms.count;
    document.getElementById('stat-offtrack').textContent = stats.offTrackEvents;
    document.getElementById('stat-collisions').textContent = stats.collisions;
    document.getElementById('stat-nearmiss').textContent = stats.nearMisses;
    document.getElementById('stat-longest').textContent = `${ms.longestBlackout.toFixed(1)}s`;
    document.getElementById('stat-impaired').textContent = `${ms.totalImpaired.toFixed(1)}s`;

    endScreen.classList.remove('hidden');
  }

  function gameLoop(timestamp) {
    if (!running) return;

    if (!lastTime) lastTime = timestamp;
    let dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    // Cap delta to avoid huge jumps
    dt = Math.min(dt, 0.05);

    elapsed += dt;

    if (elapsed >= GAME_DURATION) {
      elapsed = GAME_DURATION;
      update(0);
      render();
      endGame();
      return;
    }

    update(dt);
    render();
    requestAnimationFrame(gameLoop);
  }

  function startGame() {
    initGame();
    startScreen.classList.add('hidden');
    endScreen.classList.add('hidden');
    hud.classList.remove('hidden');
    blackoutEl.classList.add('hidden');
    running = true;
    lastTime = 0;
    requestAnimationFrame(gameLoop);
  }

  // Input listeners
  window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault();
    }
  });

  window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
  });

  btnStart.addEventListener('click', startGame);
  btnRestart.addEventListener('click', startGame);

  Renderer.init(canvas);

  // Preload sprite images before the first run
  btnStart.disabled = true;
  btnStart.textContent = 'Loading assets…';
  Sprites.loadAll()
    .then(() => {
      btnStart.disabled = false;
      btnStart.textContent = 'Start Training Run';
    })
    .catch(() => {
      btnStart.disabled = false;
      btnStart.textContent = 'Start Training Run';
    });
})();
