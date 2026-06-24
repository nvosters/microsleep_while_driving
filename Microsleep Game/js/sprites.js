/**
 * sprites.js — Load and manage game image sprites
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

  /** Crop semi source to truck only (image includes road beneath cab) */
  const semiCrop = { x: 0, y: 0, w: 1, h: 0.72 };

  function loadImage(key, src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        images[key] = img;
        resolve(img);
      };
      img.onerror = () => reject(new Error(`Failed to load sprite: ${src}`));
      img.src = src;
    });
  }

  function loadAll() {
    if (!loadPromise) {
      loadPromise = Promise.all(
        Object.entries(PATHS).map(([key, src]) => loadImage(key, src))
      ).then(() => {
        ready = true;
      });
    }
    return loadPromise;
  }

  function isReady() {
    return ready;
  }

  function get(key) {
    return images[key] || null;
  }

  /**
   * Draw a sprite centered at (x, y) with bottom anchor on the road.
   * Pixel-art obstacles use crisp scaling; semi uses smooth scaling.
   */
  function draw(ctx, key, x, y, destW, destH, options) {
    const img = images[key];
    if (!img) return false;

    const opts = options || {};
    const pixelated = opts.pixelated !== false && key !== 'semi';
    const dw = destW || img.width;
    const dh = destH != null ? destH : (dw * img.height) / img.width;

    ctx.save();
    if (pixelated) {
      ctx.imageSmoothingEnabled = false;
    }

    if (key === 'semi') {
      const sx = semiCrop.x * img.width;
      const sy = semiCrop.y * img.height;
      const sw = semiCrop.w * img.width;
      const sh = semiCrop.h * img.height;
      ctx.drawImage(img, sx, sy, sw, sh, x - dw / 2, y - dh, dw, dh);
    } else {
      ctx.drawImage(img, x - dw / 2, y - dh, dw, dh);
    }

    ctx.restore();
    return true;
  }

  return {
    loadAll,
    isReady,
    get,
    draw,
  };
})();
