/**
 * game.js — Main loop, countdown, scoring, effects & audio
 */

(function () {
  'use strict';

  const GAME_DURATION = Microsleep.GAME_DURATION;
  const DRAW_DISTANCE = 320;
  const TOTAL_SEGMENTS = 1400;

  const canvas = document.getElementById('game-canvas');
  const startScreen = document.getElementById('start-screen');
  const endScreen = document.getElementById('end-screen');
  const hud = document.getElementById('hud');
  const blackoutEl = document.getElementById('blackout');
  const warningEl = document.getElementById('microsleep-warning');
  const countdownEl = document.getElementById('countdown');
  const timerEl = document.getElementById('timer');
  const speedEl = document.getElementById('speed');
  const scoreEl = document.getElementById('score');
  const fatigueFill = document.getElementById('fatigue-fill');
  const fatigueLabel = document.getElementById('fatigue-label');
  const btnStart = document.getElementById('btn-start');
  const btnRestart = document.getElementById('btn-restart');

  let segments, player, microsleepCtrl, stats, keys = {};
  let running = false;
  let elapsed = 0;
  let lastTime = 0;
  let bounce = 0;
  let score = 0;
  let steerInput = 0;
  let countdown = 0;
  let countdownVal = 3;
  let prevMicrosleepActive = false;
  let warningSoundPlayed = false;
  const nearMissState = { cooldown: 0 };

  function resetStats() {
    return { collisions: 0, offTrackEvents: 0, nearMisses: 0 };
  }

  function initGame() {
    segments = Road.createTrack(TOTAL_SEGMENTS);
    player = Entities.createPlayer();
    microsleepCtrl = Microsleep.createController();
    stats = resetStats();
    elapsed = 0;
    bounce = 0;
    score = 0;
    steerInput = 0;
    nearMissState.cooldown = 0;
    player.speed = 0.55;
    Effects.reset();
    countdown = 3.5;
    countdownVal = 3;
    prevMicrosleepActive = false;
    warningSoundPlayed = false;
  }

  function formatTime(seconds) {
    const r = Math.max(0, Math.ceil(seconds));
    return `${Math.floor(r / 60)}:${(r % 60).toString().padStart(2, '0')}`;
  }

  function updateHUD() {
    if (!player) return;
    timerEl.textContent = formatTime(GAME_DURATION - elapsed);
    const fatigue = Microsleep.getFatigue(elapsed);
    fatigueFill.style.width = `${fatigue}%`;
    if (fatigueLabel) {
      fatigueLabel.textContent = fatigue < 30 ? 'Alert' : fatigue < 60 ? 'Tired' : fatigue < 85 ? 'Fatigued' : 'CRITICAL';
      fatigueLabel.className = 'fatigue-status ' + (fatigue < 30 ? 'ok' : fatigue < 60 ? 'warn' : 'danger');
    }
    speedEl.textContent = Math.round(45 + player.speed * 40);
    scoreEl.textContent = Math.floor(score);
  }

  function setBlackout(active) {
    blackoutEl.classList.remove('hidden');
    blackoutEl.classList.toggle('active', active);
  }

  function setWarning(show) {
    warningEl.classList.toggle('hidden', !show);
    if (show && !warningSoundPlayed) {
      warningSoundPlayed = true;
      AudioFX.playWarning();
    }
    if (!show) warningSoundPlayed = false;
  }

  function handleInput(dt, inputDisabled) {
    const keyLeft = keys['ArrowLeft'] || keys['a'] || keys['A'];
    const keyRight = keys['ArrowRight'] || keys['d'] || keys['D'];
    const targetSteer = keyLeft ? -1 : keyRight ? 1 : 0;

    if (inputDisabled) {
      steerInput = lerp(steerInput, targetSteer * 0.3, dt * 4);
      return;
    }

    const steerSpeed = 3.2 * dt;
    if (keyLeft) { player.x -= steerSpeed; player.steerVel -= dt * 3; }
    if (keyRight) { player.x += steerSpeed; player.steerVel += dt * 3; }

    player.steerVel *= 0.92;
    player.x += player.steerVel * dt;
    player.x *= 0.997;
    player.x = Math.max(-1.35, Math.min(1.35, player.x));
    steerInput = lerp(steerInput, targetSteer, dt * 8);
  }

  function lerp(a, b, t) { return a + (b - a) * Math.min(1, t); }

  function updatePlayer(dt, driftX, inputDisabled) {
    player.speed = Math.min(player.maxSpeed, player.speed + player.accel * dt * 60);
    const distance = player.speed * dt * Road.SEGMENT_LENGTH * 0.92;
    player.z += distance;
    if (inputDisabled && driftX !== 0) player.x += driftX * dt;
    bounce += distance;
    score += distance * 0.01;
    AudioFX.setEnginePitch(player.speed);
  }

  function update(dt) {
    if (countdown > 0) {
      countdown -= dt;
      const newVal = Math.ceil(countdown);
      if (newVal !== countdownVal && newVal >= 0) {
        countdownVal = newVal;
        if (newVal > 0) AudioFX.playCountdown(newVal);
        else AudioFX.playGo();
      }
      if (countdownEl) {
        countdownEl.textContent = newVal > 0 ? String(newVal) : 'GO!';
        countdownEl.classList.remove('hidden');
        if (countdown <= 0) countdownEl.classList.add('hidden');
      }
      return;
    }

    elapsed += dt;
    const ms = Microsleep.update(microsleepCtrl, elapsed, dt);

    if (ms.blackout && !prevMicrosleepActive) {
      Effects.microsleepStart();
      AudioFX.playMicrosleep();
    }
    prevMicrosleepActive = ms.blackout;

    handleInput(dt, ms.inputDisabled);
    updatePlayer(dt, ms.driftX, ms.inputDisabled);

    setBlackout(ms.blackout);
    setWarning(ms.showWarning);

    const activeCars = Entities.updateAICars(segments, player.z, dt);
    const obstacles = Entities.getActiveObstacles(segments, player.z, 45);

    if (nearMissState.cooldown > 0) nearMissState.cooldown -= dt;
    const events = Entities.checkCollisions(player, activeCars, obstacles, stats, nearMissState);
    for (const ev of events) {
      if (ev.type === 'collision') {
        Effects.collision(ev.x, ev.y);
        AudioFX.playCollision();
        score = Math.max(0, score - 200);
      } else if (ev.type === 'nearMiss') {
        Effects.nearMiss(ev.x, ev.y);
        AudioFX.playNearMiss();
        score += 50;
      }
    }

    if (Entities.checkOffTrack(player, stats)) {
      Effects.offTrack(Renderer.width() / 2, Renderer.height() - 60);
      if (Math.random() < 0.1) AudioFX.playOffTrack();
      score = Math.max(0, score - 2);
    }

    Effects.update(dt);
    updateHUD();
  }

  function render() {
    if (!segments || !player) return;
    try {
      Renderer.renderFrame({
        segments,
        player,
        playerZ: player.z,
        drawDistance: DRAW_DISTANCE,
        bounce,
        steerInput,
        fatigue: Microsleep.getFatigue(elapsed),
      });
    } catch (err) {
      console.error('Render error:', err);
    }
  }

  function endGame() {
    running = false;
    AudioFX.stopEngine();
    hud.classList.add('hidden');
    setBlackout(false);
    setWarning(false);
    blackoutEl.classList.add('hidden');
    if (countdownEl) countdownEl.classList.add('hidden');

    const ms = microsleepCtrl.stats;
    document.getElementById('stat-microsleeps').textContent = ms.count;
    document.getElementById('stat-offtrack').textContent = stats.offTrackEvents;
    document.getElementById('stat-collisions').textContent = stats.collisions;
    document.getElementById('stat-nearmiss').textContent = stats.nearMisses;
    document.getElementById('stat-longest').textContent = `${ms.longestBlackout.toFixed(1)}s`;
    document.getElementById('stat-impaired').textContent = `${ms.totalImpaired.toFixed(1)}s`;
    document.getElementById('stat-score').textContent = Math.floor(score);

    const grade = score > 3000 ? 'Excellent' : score > 1500 ? 'Good' : score > 500 ? 'Fair' : 'Needs Rest';
    document.getElementById('grade').textContent = grade;

    endScreen.classList.remove('hidden');
  }

  function gameLoop(timestamp) {
    if (!running) return;

    try {
      if (!lastTime) lastTime = timestamp;
      const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
      lastTime = timestamp;

      if (countdown <= 0 && elapsed >= GAME_DURATION) {
        elapsed = GAME_DURATION;
        update(0);
        render();
        endGame();
        return;
      }

      update(dt);
      render();
    } catch (err) {
      console.error('Game loop error:', err);
      running = false;
      btnStart.textContent = 'Error — click to retry';
      startScreen.classList.remove('hidden');
      return;
    }

    requestAnimationFrame(gameLoop);
  }

  function startGame() {
    try {
      AudioFX.resume();
      AudioFX.startEngine();
      initGame();

      startScreen.classList.add('hidden');
      endScreen.classList.add('hidden');
      hud.classList.remove('hidden');
      blackoutEl.classList.add('hidden');

      running = true;
      lastTime = 0;

      render();
      requestAnimationFrame(gameLoop);
    } catch (err) {
      console.error('Start game error:', err);
      running = false;
      startScreen.classList.remove('hidden');
      btnStart.textContent = 'Start Training Run';
    }
  }

  window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => { keys[e.key] = false; });

  if (!canvas || !btnStart) {
    console.error('Microsleep: missing required DOM elements (canvas or start button).');
    return;
  }

  btnStart.addEventListener('click', startGame);
  if (btnRestart) btnRestart.addEventListener('click', startGame);

  Renderer.init(canvas);
  AudioFX.init();

  // Load sprites in background — never block the start button
  Sprites.loadAll().then(() => {
    console.log('Sprites loaded:', Sprites.isReady());
  });

  btnStart.textContent = 'Start Training Run';

  const titleSemi = document.getElementById('title-semi');
  if (titleSemi) titleSemi.src = Sprites.assetUrl('assets/sprites/semi.png');
})();
