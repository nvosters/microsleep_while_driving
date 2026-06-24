/**
 * renderer.js — Polished pseudo-3D arcade renderer (N64 highway racer style)
 */

const Renderer = (function () {
  const PAL = {
    skyTop: '#1a3a6e',
    skyMid: '#4a8fd4',
    skyHorizon: '#f0c878',
    sun: '#ffe8a0',
    grassFar: '#2a5e2a',
    grassNear: '#3d8f3d',
    grassDark: '#1f4a1f',
    roadLight: '#707070',
    roadDark: '#5a5a5a',
    shoulder: '#8a8070',
    rumbleW: '#eeeeee',
    rumbleR: '#cc2222',
    laneWhite: '#f0f0f0',
    laneYellow: '#e8c820',
    fog: '20,30,50',
  };

  let canvas, ctx, width, height, cameraDepth;
  let cloudOffset = 0;
  let frame = 0;

  function init(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
  }

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    cameraDepth = 0.82;
  }

  function lerp(a, b, t) { return a + (b - a) * t; }

  function fogAlpha(depth, max) {
    return Math.min(0.92, Math.pow(depth / max, 1.6));
  }

  function drawSky(playerSpeed) {
    cloudOffset += playerSpeed * 0.3;
    const h = height * 0.42;

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, PAL.skyTop);
    grad.addColorStop(0.45, PAL.skyMid);
    grad.addColorStop(1, PAL.skyHorizon);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, h);

    // Sun
    const sunX = width * 0.72;
    const sunY = h * 0.38;
    const sunG = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 80);
    sunG.addColorStop(0, 'rgba(255,240,180,0.9)');
    sunG.addColorStop(0.3, 'rgba(255,220,120,0.4)');
    sunG.addColorStop(1, 'rgba(255,200,80,0)');
    ctx.fillStyle = sunG;
    ctx.fillRect(sunX - 80, sunY - 80, 160, 160);
    ctx.fillStyle = PAL.sun;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 22, 0, Math.PI * 2);
    ctx.fill();

    // Parallax clouds
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (let i = 0; i < 6; i++) {
      const cx = ((i * 280 - cloudOffset * (0.3 + i * 0.1)) % (width + 300)) - 150;
      const cy = 40 + i * 28 + Math.sin(i * 1.7) * 15;
      const cw = 80 + i * 20;
      ctx.beginPath();
      ctx.ellipse(cx, cy, cw, 18, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + cw * 0.3, cy - 8, cw * 0.6, 14, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Distant mountain silhouettes
    ctx.fillStyle = '#2a4a3a';
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= width; x += 30) {
      const y = h - 30 - Math.abs(Math.sin(x * 0.006 + 1) * 40) - Math.cos(x * 0.012) * 20;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, h);
    ctx.closePath();
    ctx.fill();
  }

  function drawTrapezoid(x1, y1, w1, x2, y2, w2, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 + w1, y1);
    ctx.lineTo(x2 + w2, y2);
    ctx.lineTo(x2, y2);
    ctx.closePath();
    ctx.fill();
  }

  function drawSegment(seg, depth, drawDist) {
    const x1 = seg.p1.screen.x, y1 = seg.p1.screen.y, w1 = seg.p1.screen.w;
    const x2 = seg.p2.screen.x, y2 = seg.p2.screen.y, w2 = seg.p2.screen.w;
    if (y2 >= height || y1 <= y2) return;

    const fog = fogAlpha(depth, drawDist);

    // Grass
    const grassG = ctx.createLinearGradient(0, y2, 0, y1);
    grassG.addColorStop(0, seg.color === 'light' ? PAL.grassNear : PAL.grassDark);
    grassG.addColorStop(1, PAL.grassFar);
    ctx.fillStyle = grassG;
    ctx.fillRect(0, y2, width, y1 - y2);

    // Shoulder (gravel strip outside rumble)
    const sh1 = w1 * 1.18, sh2 = w2 * 1.18;
    drawTrapezoid(x1 - sh1, y1, sh1 - w1, x2 - sh2, y2, sh2 - w2, PAL.shoulder);
    drawTrapezoid(x1 + w1, y1, sh1 - w1, x2 + w2, y2, sh2 - w2, PAL.shoulder);

    // Road
    const roadC = seg.color === 'light' ? PAL.roadLight : PAL.roadDark;
    drawTrapezoid(x1 - w1, y1, w1 * 2, x2 - w2, y2, w2 * 2, roadC);

    // Rumble strips
    const rw1 = w1 * 1.1, rw2 = w2 * 1.1;
    const rumble = seg.color === 'light' ? PAL.rumbleW : PAL.rumbleR;
    drawTrapezoid(x1 - rw1, y1, rw1 - w1, x2 - rw2, y2, rw2 - w2, rumble);
    drawTrapezoid(x1 + w1, y1, rw1 - w1, x2 + w2, y2, rw2 - w2, rumble);

    // Double yellow center lines
    if (seg.color === 'light') {
      const lw = w1 * 0.012, lw2 = w2 * 0.012;
      const gap = w1 * 0.02;
      drawTrapezoid(x1 - lw - gap, y1, lw * 2, x2 - lw2 - gap, y2, lw2 * 2, PAL.laneYellow);
      drawTrapezoid(x1 + gap - lw, y1, lw * 2, x2 + gap - lw2, y2, lw2 * 2, PAL.laneYellow);
    }

    // White lane divider (dashed effect via segment color)
    if (seg.color === 'dark') {
      const dw = w1 * 0.015, dw2 = w2 * 0.015;
      drawTrapezoid(x1 - dw, y1, dw * 2, x2 - dw2, y2, dw2 * 2, PAL.laneWhite);
    }

    // Edge white lines
    const ew = w1 * 0.008, ew2 = w2 * 0.008;
    drawTrapezoid(x1 - w1 + ew * 0.5, y1, ew, x2 - w2 + ew2 * 0.5, y2, ew2, PAL.laneWhite);
    drawTrapezoid(x1 + w1 - ew * 1.5, y1, ew, x2 + w2 - ew2 * 1.5, y2, ew2, PAL.laneWhite);

    // Distance fog overlay on segment
    if (fog > 0.05) {
      ctx.fillStyle = `rgba(${PAL.fog},${fog * 0.55})`;
      ctx.fillRect(0, y2, width, y1 - y2);
    }
  }

  function renderRoad(segments, playerZ, playerX, drawDistance) {
    const base = Road.findSegment(segments, playerZ);
    const baseIndex = base.index;
    const basePct = Road.percentRemaining(base, playerZ);
    const cameraX = playerX * Road.ROAD_WIDTH;
    const cameraY = Road.interpolateY(segments, playerZ);

    let dx = -(base.curve * basePct);
    let x = 0;

    for (let n = 0; n < drawDistance; n++) {
      const i = (baseIndex + n) % segments.length;
      const seg = segments[i];
      seg.looped = i < baseIndex;
      const loopOffset = seg.looped ? segments.length * Road.SEGMENT_LENGTH : 0;
      seg.p1.world.x = x;
      seg.p2.world.x = x + dx;
      Road.project(seg, cameraX, cameraY, playerZ - loopOffset, cameraDepth, width, height);
      x += dx;
      dx += seg.curve;
    }

    for (let n = drawDistance - 1; n > 0; n--) {
      const i = (baseIndex + n) % segments.length;
      const seg = segments[i];
      if (seg.p1.screen.y >= height) continue;
      drawSegment(seg, n, drawDistance);
    }
  }

  function spritePos(seg, t, offset, playerX) {
    const scale = lerp(seg.p1.screen.scale, seg.p2.screen.scale, t);
    const bx = lerp(seg.p1.screen.x, seg.p2.screen.x, t);
    const by = lerp(seg.p1.screen.y, seg.p2.screen.y, t);
  const destX = bx + scale * offset * Road.ROAD_WIDTH * width / 2;
    const destY = by;
    const destW = scale * 3400 * (width / 2);
    return { x: destX, y: destY, w: destW, scale };
  }

  function drawSign(x, y, w, msg, signColor) {
    const colors = {
      green: { bg: '#1b5e20', border: '#a5d6a7' },
      yellow: { bg: '#f57f17', border: '#fff9c4', text: '#212121' },
      blue: { bg: '#0d47a1', border: '#90caf9' },
    };
    const c = colors[signColor] || colors.green;
    const h = w * 0.7;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(x - w / 2 + 3, y - h + 3, w, h);

    ctx.fillStyle = c.bg;
    ctx.fillRect(x - w / 2, y - h, w, h);
    ctx.strokeStyle = c.border;
    ctx.lineWidth = Math.max(2, w * 0.04);
    ctx.strokeRect(x - w / 2, y - h, w, h);

    // Sign post
    ctx.fillStyle = '#78909c';
    ctx.fillRect(x - w * 0.04, y, w * 0.08, h * 0.5);

    ctx.fillStyle = c.text || '#fff';
    ctx.font = `bold ${Math.max(7, w * 0.2)}px "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const words = msg.split(' ');
    const lines = msg.length > 16
      ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')]
      : [msg];
    lines.forEach((line, i) => {
      ctx.fillText(line, x, y - h * 0.5 + (i - (lines.length - 1) / 2) * w * 0.26);
    });
  }

  function drawGuardrail(x, y, w) {
    const h = w * 0.9;
    ctx.fillStyle = '#607d8b';
    ctx.fillRect(x - w * 0.06, y - h, w * 0.12, h);
    const grad = ctx.createLinearGradient(x - w, y - h * 0.75, x + w, y - h * 0.65);
    grad.addColorStop(0, '#b0bec5');
    grad.addColorStop(0.5, '#eceff1');
    grad.addColorStop(1, '#90a4ae');
    ctx.fillStyle = grad;
    ctx.fillRect(x - w * 0.85, y - h * 0.72, w * 1.7, h * 0.1);
    ctx.strokeStyle = '#546e7a';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - w * 0.85, y - h * 0.72, w * 1.7, h * 0.1);
  }

  function drawTree(x, y, w) {
    const h = w * 1.6;
    ctx.fillStyle = '#4e342e';
    ctx.fillRect(x - w * 0.06, y - h * 0.35, w * 0.12, h * 0.35);
    const shades = ['#1b5e20', '#2e7d32', '#388e3c'];
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = shades[i];
      ctx.beginPath();
      ctx.moveTo(x, y - h * (0.9 - i * 0.15));
      ctx.lineTo(x - w * (0.45 - i * 0.05), y - h * (0.45 - i * 0.12));
      ctx.lineTo(x + w * (0.45 - i * 0.05), y - h * (0.45 - i * 0.12));
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawPole(x, y, w) {
    ctx.fillStyle = '#78909c';
    ctx.fillRect(x - w * 0.03, y - w * 1.2, w * 0.06, w * 1.2);
    ctx.fillStyle = 'rgba(255,220,100,0.7)';
    ctx.beginPath();
    ctx.arc(x, y - w * 1.2, w * 0.08, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawAIVehicle(x, y, w, h, color, kind) {
    Sprites.drawShadow(ctx, x, y, w);
    if (kind === 'truck') {
      ctx.fillStyle = color;
      ctx.fillRect(x - w * 0.4, y - h, w * 0.8, h * 0.75);
      ctx.fillStyle = shade(color, 30);
      ctx.fillRect(x - w * 0.3, y - h, w * 0.6, h * 0.35);
      ctx.fillStyle = '#81d4fa';
      ctx.fillRect(x - w * 0.22, y - h + h * 0.05, w * 0.44, h * 0.18);
    } else {
      ctx.fillStyle = color;
      ctx.fillRect(x - w * 0.35, y - h * 0.7, w * 0.7, h * 0.55);
      ctx.fillStyle = shade(color, 25);
      ctx.fillRect(x - w * 0.28, y - h * 0.7, w * 0.56, h * 0.3);
      ctx.fillStyle = '#81d4fa';
      ctx.fillRect(x - w * 0.2, y - h * 0.65, w * 0.4, h * 0.15);
    }
    // Tail lights
    ctx.fillStyle = '#ff1744';
    ctx.fillRect(x - w * 0.32, y - h * 0.08, w * 0.1, h * 0.06);
    ctx.fillRect(x + w * 0.22, y - h * 0.08, w * 0.1, h * 0.06);
    // Wheels
    ctx.fillStyle = '#111';
    const ww = w * 0.14, wh = h * 0.1;
    ctx.fillRect(x - w * 0.35, y - wh, ww, wh);
    ctx.fillRect(x + w * 0.21, y - wh, ww, wh);
  }

  function shade(hex, amt) {
    const n = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, (n >> 16) + amt);
    const g = Math.min(255, ((n >> 8) & 0xff) + amt);
    const b = Math.min(255, (n & 0xff) + amt);
    return `rgb(${r},${g},${b})`;
  }

  function drawSprites(segments, playerZ, drawDistance) {
    const baseIndex = Road.findSegment(segments, playerZ).index;
    const items = [];

    for (let n = drawDistance - 1; n >= 0; n--) {
      const i = (baseIndex + n) % segments.length;
      const seg = segments[i];
      if (!seg.p1.screen.scale) continue;
      let relZ = seg.p1.world.z - playerZ;
      if (seg.looped) relZ += segments.length * Road.SEGMENT_LENGTH;
      if (relZ < -Road.SEGMENT_LENGTH || relZ > Road.SEGMENT_LENGTH * drawDistance) continue;

      for (const sp of seg.sprites) items.push({ ...sp, relZ, seg, t: 0 });
      for (const car of seg.cars) {
        items.push({
          type: 'car', offset: car.offset, relZ: relZ + car.z,
          color: car.color, kind: car.kind, seg,
          t: Math.min(1, Math.max(0, car.z / Road.SEGMENT_LENGTH)),
        });
      }
    }

    items.sort((a, b) => b.relZ - a.relZ);

    for (const sp of items) {
      const pos = spritePos(sp.seg, sp.t || 0, sp.offset, 0);
      if (!pos.scale || pos.scale <= 0.001 || pos.y >= height || pos.y <= 0) continue;

      switch (sp.type) {
        case 'sign':
          drawSign(pos.x, pos.y, pos.w * 1.6, sp.msg, sp.signColor);
          break;
        case 'guardrail':
          drawGuardrail(pos.x, pos.y, pos.w);
          break;
        case 'tree':
          drawTree(pos.x, pos.y, pos.w * 0.9);
          break;
        case 'pole':
          drawPole(pos.x, pos.y, pos.w * 0.5);
          break;
        case 'banana':
          if (!sp.hit) Sprites.drawBillboard(ctx, 'banana', pos.x, pos.y, pos.w * 1.5);
          break;
        case 'tire':
          if (!sp.hit) Sprites.drawBillboard(ctx, 'tire', pos.x, pos.y, pos.w * 1.3);
          break;
        case 'car':
          drawAIVehicle(pos.x, pos.y, pos.w * 1.1, pos.w * 1.1, sp.color, sp.kind);
          break;
      }
    }
  }

  function drawPlayer(playerX, bounce, steerInput, offTrack) {
    const playerY = height - 10;
    const playerH = height * 0.26;
    const semiImg = Sprites.get('semi');
    const cropH = 0.68;
    const aspect = semiImg ? (semiImg.width * 0.96) / (semiImg.height * cropH) : 1.15;
    const playerW = playerH * aspect;
    const screenX = width / 2 + playerX * playerW * 0.2;
    const bob = Math.sin(bounce * 0.12) * 2;

    if (!Sprites.drawSemi(ctx, screenX, playerY + bob, playerW, playerH, steerInput)) {
      drawAIVehicle(screenX, playerY + bob, playerW, playerH, '#ff6f00', 'truck');
    }

    if (offTrack) {
      ctx.fillStyle = 'rgba(80,140,50,0.2)';
      ctx.fillRect(0, height * 0.5, width, height);
    }
  }

  function drawSpeedFX(speed, fatigue) {
    if (speed < 0.3) return;
    const intensity = speed * 0.4;
    ctx.strokeStyle = `rgba(255,255,255,${intensity * 0.12})`;
    ctx.lineWidth = 2;
    for (let i = 0; i < 12; i++) {
      const x = (width / 12) * i + (frame % 30);
      ctx.beginPath();
      ctx.moveTo(x, height * 0.45);
      ctx.lineTo(x + 15 + speed * 20, height);
      ctx.stroke();
    }

    // Fatigue vignette pulse
    if (fatigue > 40) {
      const pulse = (fatigue - 40) / 60;
      const vg = ctx.createRadialGradient(width / 2, height / 2, height * 0.2, width / 2, height / 2, height * 0.85);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, `rgba(40,10,10,${pulse * 0.35})`);
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, width, height);
    }
  }

  function drawVignette() {
    const vg = ctx.createRadialGradient(width / 2, height / 2, height * 0.35, width / 2, height / 2, height * 0.95);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, width, height);
  }

  function drawHUDOverlay(speed) {
    // Arcade dashboard strip at bottom
    ctx.fillStyle = 'rgba(10,15,30,0.55)';
    ctx.fillRect(0, height - 50, width, 50);
    ctx.strokeStyle = 'rgba(100,140,255,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height - 50);
    ctx.lineTo(width, height - 50);
    ctx.stroke();
  }

  function renderFrame(state) {
    frame++;
    const { segments, player, playerZ, drawDistance, bounce, steerInput, fatigue } = state;
    const shake = Effects.getShake();

    ctx.save();
    ctx.translate(shake.x, shake.y);

    drawSky(player.speed);
    renderRoad(segments, playerZ, player.x, drawDistance);
    drawSprites(segments, playerZ, drawDistance);
    drawPlayer(player.x, bounce, steerInput || 0, player.offTrack);
    drawSpeedFX(player.speed, fatigue || 0);
    drawHUDOverlay(player.speed);
    drawVignette();

    ctx.restore();

    Effects.draw(ctx, width, height);
  }

  return { init, renderFrame, width: () => width, height: () => height };
})();
