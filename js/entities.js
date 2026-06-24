/**
 * entities.js — Player semi, AI traffic, collisions
 */

const Entities = (function () {
  const PLAYER_WIDTH = 0.4;
  const NEAR_MISS_DIST = 0.5;

  function createPlayer() {
    return {
      x: 0,
      z: 0,
      speed: 0,
      maxSpeed: 1.05,
      accel: 0.018,
      steerVel: 0,
      width: PLAYER_WIDTH,
      offTrack: false,
      offTrackTimer: 0,
    };
  }

  function updateAICars(segments, playerZ, dt) {
    const activeCars = [];
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      for (const car of seg.cars) {
        car.z += car.speed * dt * Road.SEGMENT_LENGTH * 0.85;
        const absZ = seg.p1.world.z + car.z;
        const relZ = absZ - playerZ;
        if (relZ > -Road.SEGMENT_LENGTH * 2 && relZ < Road.SEGMENT_LENGTH * 35) {
          activeCars.push({ ...car, segmentIndex: i, worldZ: absZ, relZ });
        }
        if (relZ < -Road.SEGMENT_LENGTH * 4) {
          car.z += Road.SEGMENT_LENGTH * 25;
        }
      }
    }
    return activeCars;
  }

  function getActiveObstacles(segments, playerZ, lookAhead) {
    const obstacles = [];
    const startIdx = Math.max(0, Math.floor(playerZ / Road.SEGMENT_LENGTH) - 2);
    const endIdx = Math.min(segments.length, startIdx + lookAhead);
    for (let i = startIdx; i < endIdx; i++) {
      const seg = segments[i];
      const relZ = seg.p1.world.z - playerZ;
      if (relZ < -100 || relZ > Road.SEGMENT_LENGTH * 30) continue;
      for (const sprite of seg.sprites) {
        if ((sprite.type === 'banana' || sprite.type === 'tire') && !sprite.hit) {
          obstacles.push({
            type: sprite.type,
            offset: sprite.offset,
            z: relZ,
            spriteRef: sprite,
            width: sprite.type === 'tire' ? 0.24 : 0.2,
          });
        }
      }
    }
    return obstacles;
  }

  function overlaps(aX, aW, aZ, bX, bW, bZ, zDepth) {
    return Math.abs(aX - bX) < (aW + bW) * 0.5 && Math.abs(aZ - bZ) < zDepth;
  }

  function checkCollisions(player, activeCars, obstacles, stats, nearMissState) {
    const events = [];
    const pZ = 0;
    const cx = () => (typeof Renderer !== 'undefined' ? Renderer.width() : window.innerWidth) / 2;
    const cy = () => (typeof Renderer !== 'undefined' ? Renderer.height() : window.innerHeight) - 80;

    for (const car of activeCars) {
      if (overlaps(player.x, player.width, pZ, car.offset, car.width, car.relZ, 90)) {
        stats.collisions++;
        player.x += player.x < car.offset ? -0.18 : 0.18;
        player.speed *= 0.82;
        player.steerVel += (player.x < car.offset ? -1 : 1) * 2;
        events.push({ type: 'collision', x: cx(), y: cy() });
      } else if (
        Math.abs(car.relZ) < 140 &&
        Math.abs(player.x - car.offset) < NEAR_MISS_DIST &&
        nearMissState.cooldown <= 0
      ) {
        stats.nearMisses++;
        nearMissState.cooldown = 1.0;
        events.push({ type: 'nearMiss', x: cx(), y: cy() });
      }
    }

    for (const obs of obstacles) {
      if (obs.z < -60 || obs.z > 130) continue;
      if (overlaps(player.x, player.width, pZ, obs.offset, obs.width, obs.z, 70)) {
        stats.collisions++;
        obs.spriteRef.hit = true;
        player.speed *= 0.88;
        events.push({ type: 'collision', x: cx(), y: cy() });
      }
    }

    return events;
  }

  function checkOffTrack(player, stats) {
    const limit = 1.0;
    const wasOff = player.offTrack;
    player.offTrack = Math.abs(player.x) > limit;
    if (player.offTrack) {
      player.offTrackTimer += 1;
      if (!wasOff) stats.offTrackEvents++;
      player.speed *= 0.96;
      return true;
    }
    player.offTrackTimer = 0;
    return false;
  }

  return {
    createPlayer,
    updateAICars,
    getActiveObstacles,
    checkCollisions,
    checkOffTrack,
    PLAYER_WIDTH,
  };
})();
