/**
 * effects.js — Particles, screen shake, collision flash, skid marks
 */

const Effects = (function () {
  const particles = [];
  const skids = [];
  let shake = 0;
  let flash = 0;
  let flashColor = '255,80,60';

  function spawnBurst(x, y, count, color, speed) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const vel = speed * (0.4 + Math.random() * 0.6);
      particles.push({
        x, y,
        vx: Math.cos(angle) * vel,
        vy: Math.sin(angle) * vel - Math.random() * 40,
        life: 0.4 + Math.random() * 0.5,
        maxLife: 0.9,
        size: 2 + Math.random() * 4,
        color,
      });
    }
  }

  function spawnDust(x, y) {
    for (let i = 0; i < 6; i++) {
      particles.push({
        x: x + (Math.random() - 0.5) * 30,
        y,
        vx: (Math.random() - 0.5) * 60,
        vy: -20 - Math.random() * 30,
        life: 0.3 + Math.random() * 0.3,
        maxLife: 0.6,
        size: 3 + Math.random() * 5,
        color: '180,160,120',
      });
    }
  }

  function addSkid(x, y, width) {
    skids.push({ x, y, w: width, life: 2.5, maxLife: 2.5 });
    if (skids.length > 40) skids.shift();
  }

  function collision(x, y) {
    shake = Math.min(shake + 12, 18);
    flash = 0.35;
    flashColor = '255,60,40';
    spawnBurst(x, y, 18, '255,200,80', 120);
    spawnBurst(x, y, 10, '200,200,200', 80);
  }

  function nearMiss(x, y) {
    shake = Math.min(shake + 4, 18);
    flash = 0.12;
    flashColor = '255,220,100';
  }

  function offTrack(x, y) {
    spawnDust(x, y);
  }

  function microsleepStart() {
    shake = 6;
    flash = 0.2;
    flashColor = '20,20,40';
  }

  function update(dt) {
    shake = Math.max(0, shake - dt * 28);
    flash = Math.max(0, flash - dt * 1.8);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 180 * dt;
      if (p.life <= 0) particles.splice(i, 1);
    }

    for (let i = skids.length - 1; i >= 0; i--) {
      skids[i].life -= dt;
      if (skids[i].life <= 0) skids.splice(i, 1);
    }
  }

  function getShake() {
    if (shake <= 0) return { x: 0, y: 0 };
    return {
      x: (Math.random() - 0.5) * shake,
      y: (Math.random() - 0.5) * shake,
    };
  }

  function draw(ctx, width, height) {
    for (const s of skids) {
      const alpha = (s.life / s.maxLife) * 0.35;
      ctx.fillStyle = `rgba(30,30,30,${alpha})`;
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, s.w * 0.4, s.w * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const p of particles) {
      const alpha = Math.min(1, p.life / p.maxLife);
      ctx.fillStyle = `rgba(${p.color},${alpha})`;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }

    if (flash > 0) {
      ctx.fillStyle = `rgba(${flashColor},${flash * 0.55})`;
      ctx.fillRect(0, 0, width, height);
    }
  }

  function reset() {
    particles.length = 0;
    skids.length = 0;
    shake = 0;
    flash = 0;
  }

  return {
    update, draw, getShake, reset,
    collision, nearMiss, offTrack, microsleepStart,
    addSkid, spawnDust,
  };
})();
