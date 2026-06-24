/**
 * microsleep.js — Fatigue meter and microsleep progression
 *
 * Timeline (game elapsed seconds):
 *   0–5s:   no microsleeps
 *   5–30s:  rare, 0.1–0.4s
 *   30–60s: more frequent, 0.4–0.8s
 *   60–90s: frequent, 0.8–1.2s
 *   90–120s: very frequent, 1.2–2.0s
 */

const Microsleep = (function () {
  const START_DELAY = 5;
  const GAME_DURATION = 120;

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function getFatigue(elapsed) {
    const t = Math.min(1, elapsed / GAME_DURATION);
    return t * 100;
  }

  function getPhaseParams(elapsed) {
    if (elapsed < START_DELAY) {
      return { minDur: 0, maxDur: 0, minInterval: 999, maxInterval: 999 };
    }
    if (elapsed < 30) {
      const t = (elapsed - START_DELAY) / (30 - START_DELAY);
      return {
        minDur: 0.1,
        maxDur: lerp(0.1, 0.4, t),
        minInterval: lerp(12, 8, t),
        maxInterval: lerp(18, 10, t),
      };
    }
    if (elapsed < 60) {
      const t = (elapsed - 30) / 30;
      return {
        minDur: lerp(0.4, 0.4, t),
        maxDur: lerp(0.4, 0.8, t),
        minInterval: lerp(8, 5, t),
        maxInterval: lerp(10, 6, t),
      };
    }
    if (elapsed < 90) {
      const t = (elapsed - 60) / 30;
      return {
        minDur: lerp(0.8, 0.8, t),
        maxDur: lerp(0.8, 1.2, t),
        minInterval: lerp(5, 3, t),
        maxInterval: lerp(6, 3.5, t),
      };
    }
    const t = (elapsed - 90) / 30;
    return {
      minDur: lerp(1.2, 1.2, t),
      maxDur: lerp(1.2, 2.0, t),
      minInterval: lerp(3, 1.5, t),
      maxInterval: lerp(3.5, 2, t),
    };
  }

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function createController() {
    return {
      // First microsleep triggers exactly when the 5-second mark is reached
      nextSleepAt: START_DELAY,
      active: false,
      duration: 0,
      elapsed: 0,
      drift: 0,
      warningTimer: 0,
      warningDuration: 2.5,
      stats: {
        count: 0,
        longestBlackout: 0,
        totalImpaired: 0,
      },
    };
  }

  function update(ctrl, elapsed, dt) {
    const result = {
      inputDisabled: false,
      blackout: false,
      showWarning: false,
      justEnded: false,
      driftX: 0,
    };

    if (elapsed >= GAME_DURATION) return result;

    if (ctrl.warningTimer > 0) {
      ctrl.warningTimer -= dt;
      result.showWarning = ctrl.warningTimer > 0;
    }

    if (ctrl.active) {
      ctrl.elapsed += dt;
      result.inputDisabled = true;
      result.blackout = true;
      result.driftX = ctrl.drift;

      if (ctrl.elapsed >= ctrl.duration) {
        ctrl.active = false;
        ctrl.stats.totalImpaired += ctrl.duration;
        ctrl.warningTimer = ctrl.warningDuration;
        result.justEnded = true;
        result.blackout = false;
        result.inputDisabled = false;

        const params = getPhaseParams(elapsed);
        const interval = randomBetween(params.minInterval, params.maxInterval);
        ctrl.nextSleepAt = elapsed + interval;
      }
      return result;
    }

    if (elapsed >= START_DELAY && elapsed >= ctrl.nextSleepAt) {
      const params = getPhaseParams(elapsed);
      // First blackout is always 0.1s; later blackouts vary within the phase range
      const isFirst = ctrl.stats.count === 0;
      ctrl.duration = isFirst ? 0.1 : randomBetween(params.minDur, params.maxDur);
      ctrl.elapsed = 0;
      ctrl.active = true;
      ctrl.drift = (Math.random() - 0.5) * 0.6;
      ctrl.stats.count++;
      if (ctrl.duration > ctrl.stats.longestBlackout) {
        ctrl.stats.longestBlackout = ctrl.duration;
      }
      result.inputDisabled = true;
      result.blackout = true;
      result.driftX = ctrl.drift;
    }

    return result;
  }

  return {
    START_DELAY,
    GAME_DURATION,
    getFatigue,
    createController,
    update,
  };
})();
