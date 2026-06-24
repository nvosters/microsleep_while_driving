/**
 * sprites.js — Sprite loading, billboards, shadows, and semi rendering
 */

const Sprites = (function () {
  const PATHS = {
    semi: 'assets/sprites/semi.png',
    banana: 'assets/sprites/banana.png',
    tire: 'assets/sprites/tire.png',
  };

  const images = {};
  let loadPromise = null;
  let ready = false;

  const semiCrop = { x: 0.02, y: 0, w: 0.96, h: 0.68 };

  function loadImage(key, src) {
    return new Promise((resolve) => {
      const img = new Image();
      const timer = setTimeout(() => {
        console.warn('Sprite load timed out:', src);
        resolve(null);
      }, 6000);

      img.onload = () => {
        clearTimeout(timer);
        images[key] = img;
        resolve(img);
      };
      img.onerror = () => {
        clearTimeout(timer);
        console.warn('Sprite failed to load:', src);
        resolve(null);
      };
      img.src = src;
    });
  }

  /** Always resolves — never blocks game start */
  function loadAll() {
    if (!loadPromise) {
      loadPromise = Promise.all(
        Object.entries(PATHS).map(([key, src]) => loadImage(key, src))
      ).then((results) => {
        ready = results.some((r) => r !== null);
        return ready;
      });
    }
    return loadPromise;
  }

  function isReady() { return ready; }
  function get(key) { return images[key] || null; }

  function drawShadow(ctx, x, y, w) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(x, y + 2, w * 0.42, w * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawBillboard(ctx, key, x, y, size) {
    const img = images[key];
    if (!img) return false;
    const s = Math.max(16, size);
    drawShadow(ctx, x, y, s);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const aspect = img.width / img.height;
    const dw = s;
    const dh = s / aspect;
    ctx.drawImage(img, x - dw / 2, y - dh * 0.85, dw, dh);
    ctx.restore();
    return true;
  }

  function drawSemi(ctx, x, y, w, h, lean) {
    const img = images.semi;
    if (!img) return false;

    const sx = semiCrop.x * img.width;
    const sy = semiCrop.y * img.height;
    const sw = semiCrop.w * img.width;
    const sh = semiCrop.h * img.height;

    drawShadow(ctx, x, y, w);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(lean * 0.12);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(img, sx, sy, sw, sh, -w / 2, -h, w, h);
    ctx.restore();
    return true;
  }

  function draw(ctx, key, x, y, destW, destH, options) {
    const img = images[key];
    if (!img) return false;
    const opts = options || {};
    const dw = destW || img.width;
    const dh = destH != null ? destH : (dw * img.height) / img.width;

    ctx.save();
    if (opts.pixelated !== false && key !== 'semi') ctx.imageSmoothingEnabled = false;

    if (key === 'semi') {
      ctx.restore();
      return drawSemi(ctx, x, y, dw, dh, opts.lean || 0);
    }

    if (opts.shadow !== false) drawShadow(ctx, x, y, dw);
    ctx.drawImage(img, x - dw / 2, y - dh, dw, dh);
    ctx.restore();
    return true;
  }

  return {
    loadAll, isReady, get, draw, drawBillboard, drawSemi, drawShadow,
  };
})();
