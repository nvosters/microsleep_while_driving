/**
 * renderer.js — Canvas pseudo-3D rendering (N64 arcade racer style)
 */

const Renderer = (function () {
  const COLORS = {
    sky: ['#4a6fa5', '#87b8e8'],
    grass: ['#2d6a2d', '#3d8b3d'],
    road: { light: '#6e6e6e', dark: '#5a5a5a' },
    rumble: { light: '#ffffff', dark: '#cc0000' },
    lane: '#e8e8e8',
    guardrail: '#b0bec5',
    guardrailPost: '#78909c',
  };

  let canvas, ctx, width, height, cameraDepth;

  function init(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
  }

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    cameraDepth = 0.84;
  }

  function drawBackground() {
    const grad = ctx.createLinearGradient(0, 0, 0, height * 0.55);
    grad.addColorStop(0, COLORS.sky[0]);
    grad.addColorStop(1, COLORS.sky[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Distant hills (decorative)
    ctx.fillStyle = '#3a6b3a';
    ctx.beginPath();
    ctx.moveTo(0, height * 0.42);
    for (let x = 0; x <= width; x += 40) {
      const y = height * 0.42 + Math.sin(x * 0.008) * 18 + Math.cos(x * 0.015) * 10;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height * 0.55);
    ctx.lineTo(0, height * 0.55);
    ctx.closePath();
    ctx.fill();
  }

  /** Draw a single road segment trapezoid */
  function drawSegment(seg) {
    const x1 = seg.p1.screen.x;
    const y1 = seg.p1.screen.y;
    const w1 = seg.p1.screen.w;
    const x2 = seg.p2.screen.x;
    const y2 = seg.p2.screen.y;
    const w2 = seg.p2.screen.w;

    if (y2 >= height || y2 < y1) return;

    const grassColor = seg.color === 'light' ? COLORS.grass[0] : COLORS.grass[1];
    ctx.fillStyle = grassColor;
    ctx.fillRect(0, y2, width, y1 - y2);

    // Road surface
    const roadColor = seg.color === 'light' ? COLORS.road.light : COLORS.road.dark;
    drawTrapezoid(x1 - w1, y1, w1 * 2, x2 - w2, y2, w2 * 2, roadColor);

    // Rumble strips
    const rumbleW1 = w1 * 1.12;
    const rumbleW2 = w2 * 1.12;
    const rumbleColor = seg.color === 'light' ? COLORS.rumble.light : COLORS.rumble.dark;
    drawRumble(x1, y1, w1, x2, y2, w2, rumbleW1, rumbleW2, rumbleColor);

    // Lane markers (center dashed)
    if (seg.color === 'light') {
      const laneW1 = w1 * 0.02;
      const laneW2 = w2 * 0.02;
      drawTrapezoid(x1 - laneW1, y1, laneW1 * 2, x2 - laneW2, y2, laneW2 * 2, COLORS.lane);
    }
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

  function drawRumble(x1, y1, w1, x2, y2, w2, rw1, rw2, color) {
    const left = (cx, cy, cw, rx, ry, rw) => {
      drawTrapezoid(cx - cw - (rw - cw), cy, rw - cw, rx - rw, ry, rw, color);
    };
    left(x1, y1, w1, x2, y2, w2);
    drawTrapezoid(x1 + w1, y1, rw1 - w1, x2 + w2, y2, rw2 - w2, color);
  }

  /** Project and draw visible segments (classic arcade racer algorithm) */
  function renderRoad(segments, playerZ, playerX, drawDistance) {
    const baseSegment = Road.findSegment(segments, playerZ);
    const baseIndex = baseSegment.index;
    const basePercent = Road.percentRemaining(baseSegment, playerZ);
    const maxy = height;
    const cameraX = playerX * Road.ROAD_WIDTH;

    let dx = -(baseSegment.curve * basePercent);
    let x = 0;

    // Project segments ahead of the player
    for (let n = 0; n < drawDistance; n++) {
      const i = (baseIndex + n) % segments.length;
      const seg = segments[i];
      seg.looped = i < baseIndex;
      const loopOffset = seg.looped ? segments.length * Road.SEGMENT_LENGTH : 0;

      seg.p1.world.x = x;
      seg.p2.world.x = x + dx;
      Road.project(seg, cameraX, 0, playerZ - loopOffset, cameraDepth, width, height);

      x += dx;
      dx += seg.curve;
    }

    // Paint from horizon toward the camera
    for (let n = drawDistance - 1; n > 0; n--) {
      const i = (baseIndex + n) % segments.length;
      const seg = segments[i];
      if (seg.p1.screen.y >= maxy) continue;
      if (seg.p1.screen.y >= seg.p2.screen.y) continue;
      drawSegment(seg);
    }
  }


  function drawSign(x, y, w, h, msg) {
    ctx.fillStyle = '#1565c0';
    ctx.fillRect(x - w / 2, y - h, w, h * 0.85);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = Math.max(1, w * 0.04);
    ctx.strokeRect(x - w / 2, y - h, w, h * 0.85);
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.max(8, w * 0.22)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lines = msg.length > 14 ? [msg.slice(0, Math.ceil(msg.length / 2)), msg.slice(Math.ceil(msg.length / 2))] : [msg];
    lines.forEach((line, i) => {
      ctx.fillText(line, x, y - h * 0.5 + (i - (lines.length - 1) / 2) * w * 0.28);
    });
  }

  function drawGuardrail(x, y, w, h) {
    ctx.fillStyle = COLORS.guardrailPost;
    ctx.fillRect(x - w * 0.15, y - h, w * 0.3, h);
    ctx.fillStyle = COLORS.guardrail;
    ctx.fillRect(x - w * 0.8, y - h * 0.7, w * 1.6, h * 0.12);
  }

  function drawObstacleSprite(key, x, y, w) {
    const size = Math.max(12, w * 1.4);
    if (!Sprites.draw(ctx, key, x, y, size, size, { pixelated: true })) {
      if (key === 'banana') drawBanana(x, y, w);
      else drawTire(x, y, w);
    }
  }

  function drawBanana(x, y, w) {
    const s = w * 0.5;
    ctx.save();
    ctx.translate(x, y - s);
    ctx.fillStyle = '#fdd835';
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.5, s * 0.8, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f9a825';
    ctx.lineWidth = s * 0.08;
    ctx.stroke();
    ctx.restore();
  }

  function drawTire(x, y, w) {
    const s = w * 0.45;
    ctx.save();
    ctx.translate(x, y - s);
    ctx.fillStyle = '#212121';
    ctx.beginPath();
    ctx.arc(0, 0, s, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#616161';
    ctx.lineWidth = s * 0.25;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.65, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawCar(x, y, w, h, color, isPlayer) {
    const cabH = h * 0.45;
    ctx.fillStyle = color;
    // Body
    ctx.fillRect(x - w / 2, y - h, w, h * 0.7);
    // Cab
    ctx.fillStyle = isPlayer ? '#ffc107' : shadeColor(color, 20);
    ctx.fillRect(x - w * 0.35, y - h, w * 0.7, cabH);
    // Windshield
    ctx.fillStyle = '#81d4fa';
    ctx.fillRect(x - w * 0.28, y - h + cabH * 0.15, w * 0.56, cabH * 0.45);
    // Wheels
    ctx.fillStyle = '#111';
    const ww = w * 0.18;
    const wh = h * 0.18;
    ctx.fillRect(x - w * 0.42, y - wh * 1.2, ww, wh);
    ctx.fillRect(x + w * 0.24, y - wh * 1.2, ww, wh);
    ctx.fillRect(x - w * 0.42, y - h * 0.35, ww, wh);
    ctx.fillRect(x + w * 0.24, y - h * 0.35, ww, wh);

    if (isPlayer) {
      // Semi trailer
      ctx.fillStyle = '#eceff1';
      ctx.fillRect(x - w * 0.55, y - h * 0.72, w * 1.1, h * 0.55);
      ctx.strokeStyle = '#455a64';
      ctx.lineWidth = 2;
      ctx.strokeRect(x - w * 0.55, y - h * 0.72, w * 1.1, h * 0.55);
      // Company stripe
      ctx.fillStyle = '#c62828';
      ctx.fillRect(x - w * 0.55, y - h * 0.55, w * 1.1, h * 0.08);
    }
  }

  function shadeColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, (num >> 16) + percent);
    const g = Math.min(255, ((num >> 8) & 0xff) + percent);
    const b = Math.min(255, (num & 0xff) + percent);
    return `rgb(${r},${g},${b})`;
  }

  function drawSprites(segments, playerZ, playerX, drawDistance) {
    const baseIndex = Road.findSegment(segments, playerZ).index;
    const sprites = [];

    for (let n = drawDistance - 1; n >= 0; n--) {
      const i = (baseIndex + n) % segments.length;
      const seg = segments[i];
      if (!seg.p1.screen.scale) continue;

      let relZ = seg.p1.world.z - playerZ;
      if (seg.looped) relZ += segments.length * Road.SEGMENT_LENGTH;
      if (relZ < -Road.SEGMENT_LENGTH || relZ > Road.SEGMENT_LENGTH * drawDistance) continue;

      for (const sp of seg.sprites) {
        sprites.push({ ...sp, relZ, seg });
      }
      for (const car of seg.cars) {
        const t = Math.min(1, Math.max(0, car.z / Road.SEGMENT_LENGTH));
        sprites.push({
          type: 'car',
          offset: car.offset,
          relZ: relZ + car.z,
          color: car.color,
          seg,
          carRef: car,
          carT: t,
        });
      }
    }

    sprites.sort((a, b) => b.relZ - a.relZ);

    for (const sp of sprites) {
      const seg = sp.seg;
      const t = sp.carT || 0;
      const scale = seg.p1.screen.scale + (seg.p2.screen.scale - seg.p1.screen.scale) * t;
      if (!scale || scale <= 0.001) continue;

      const baseX = seg.p1.screen.x + (seg.p2.screen.x - seg.p1.screen.x) * t;
      const baseY = seg.p1.screen.y + (seg.p2.screen.y - seg.p1.screen.y) * t;
      const destX = baseX + scale * sp.offset * Road.ROAD_WIDTH * width / 2;
      const destY = baseY;
      const destW = scale * 3200 * (width / 2);
      const destH = destW;

      if (destY >= height || destY <= 0) continue;

      switch (sp.type) {
        case 'sign':
          drawSign(destX, destY, destW * 1.8, destH * 1.2, sp.msg);
          break;
        case 'guardrail':
          drawGuardrail(destX, destY, destW, destH * 0.8);
          break;
        case 'banana':
          if (!sp.hit) drawObstacleSprite('banana', destX, destY, destW);
          break;
        case 'tire':
          if (!sp.hit) drawObstacleSprite('tire', destX, destY, destW);
          break;
        case 'car':
          drawCar(destX, destY, destW * 1.1, destH * 1.1, sp.color, false);
          break;
      }
    }
  }

  function drawPlayer(playerX, bounce) {
    const playerY = height - 20;
    const playerH = height * 0.22;
    const semiImg = Sprites.get('semi');
    const cropH = 0.72;
    const aspect = semiImg ? semiImg.width / (semiImg.height * cropH) : 1.1;
    const playerW = playerH * aspect;
    const playerScreenX = width / 2 + playerX * playerW * 0.22;
    const bob = Math.sin(bounce * 0.15) * 3;

    if (!Sprites.draw(ctx, 'semi', playerScreenX, playerY + bob, playerW, playerH, { pixelated: false })) {
      drawCar(playerScreenX, playerY + bob, playerW, playerH, '#ff6f00', true);
    }

    // Chase camera shadow on road
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(playerScreenX, playerY + 8, playerW * 0.35, playerW * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawSpeedLines(intensity) {
    if (intensity <= 0) return;
    ctx.strokeStyle = `rgba(255,255,255,${intensity * 0.15})`;
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const x = (width / 8) * i + (Date.now() * 0.05 % 40);
      ctx.beginPath();
      ctx.moveTo(x, height * 0.5);
      ctx.lineTo(x + 20, height);
      ctx.stroke();
    }
  }

  function renderFrame(state) {
    const { segments, player, playerZ, drawDistance, bounce } = state;
    drawBackground();
    renderRoad(segments, playerZ, player.x, drawDistance);
    drawSprites(segments, playerZ, player.x, drawDistance);
    drawPlayer(player.x, bounce);
    drawSpeedLines(player.speed * 0.5);

    if (player.offTrack) {
      ctx.fillStyle = 'rgba(60, 120, 40, 0.25)';
      ctx.fillRect(0, height * 0.55, width, height);
    }
  }

  return {
    init,
    renderFrame,
    width: () => width,
    height: () => height,
  };
})();
