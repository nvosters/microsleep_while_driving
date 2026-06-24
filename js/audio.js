/**
 * audio.js — Procedural Web Audio (no external files)
 */

const AudioFX = (function () {
  let ctx = null;
  let engineOsc = null;
  let engineGain = null;
  let enabled = true;

  function init() {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      enabled = false;
    }
  }

  function resume() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  function tone(freq, dur, type, vol, ramp) {
    if (!ctx || !enabled) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      gain.gain.value = Math.max(0.001, vol || 0.08);
      if (ramp) gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur);
    } catch (e) { /* audio optional */ }
  }

  function noiseBurst(dur, vol) {
    if (!ctx || !enabled) return;
    const bufferSize = ctx.sampleRate * dur;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = vol || 0.06;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start();
  }

  function startEngine() {
    if (!ctx || !enabled || engineOsc) return;
    try {
      engineOsc = ctx.createOscillator();
      engineGain = ctx.createGain();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineGain.gain.value = 0.015;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 200;
      engineOsc.connect(filter);
      filter.connect(engineGain);
      engineGain.connect(ctx.destination);
      engineOsc.start();
    } catch (e) { engineOsc = null; engineGain = null; }
  }

  function setEnginePitch(speed) {
    if (!engineOsc) return;
    engineOsc.frequency.value = 45 + speed * 90;
    engineGain.gain.value = 0.012 + speed * 0.018;
  }

  function stopEngine() {
    if (engineOsc) {
      try { engineOsc.stop(); } catch (e) { /* already stopped */ }
      engineOsc = null;
      engineGain = null;
    }
  }

  function playCountdown(n) {
    tone(n === 0 ? 880 : 440, 0.12, 'square', 0.06);
  }

  function playGo() {
    tone(660, 0.08, 'square', 0.07);
    setTimeout(() => tone(880, 0.2, 'square', 0.08), 80);
  }

  function playCollision() { noiseBurst(0.25, 0.12); tone(120, 0.3, 'sawtooth', 0.1, true); }
  function playNearMiss() { tone(600, 0.06, 'sine', 0.05); }
  function playMicrosleep() { tone(80, 0.4, 'sine', 0.08, true); noiseBurst(0.15, 0.04); }
  function playOffTrack() { noiseBurst(0.08, 0.03); }
  function playWarning() { tone(330, 0.15, 'triangle', 0.06); }

  return {
    init, resume, startEngine, stopEngine, setEnginePitch,
    playCountdown, playGo, playCollision, playNearMiss,
    playMicrosleep, playOffTrack, playWarning,
  };
})();
