/**
 * entities.js — Player semi, AI cars, obstacles, collision helpers
 */

const Entities = (function () {
  const PLAYER_WIDTH = 0.42;
  const NEAR_MISS_DIST = 0.55;

  function createPlayer() {
    return {
      x: 0,
      z: 0,
      speed: 0,
      maxSpeed: 1.0,
      accel: 0.02,
      driftX: 0,
      width: PLAYER_WIDTH,
      offTrack: false,
      offTrackTimer: 0,
    };
  }

  /** Update AI cars — they move forward along the track */
  function updateAICars(segments, playerZ, segmentCount, dt) {
    const activeCars = [];

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      for (const car of seg.cars) {
        car.z += car.speed * dt * Road.SEGMENT_LENGTH * 0.8;

        const absZ = seg.p1.world.z + car.z;
        const relZ = absZ - playerZ;

        if (relZ > -Road.SEGMENT_LENGTH * 2 && relZ < Road.SEGMENT_LENGTH * 30) {
          activeCars.push({
            ...car,
            segmentIndex: i,
            worldZ: absZ,
            relZ,
          });
        }

        if (relZ < -Road.SEGMENT_LENGTH * 3) {
          car.z += Road.SEGMENT_LENGTH * 20;
        }
      }
    }

    return activeCars;
  }

  /** Collect active obstacles near the player */
  function getActiveObstacles(segments, playerZ, lookAhead) {
    const obstacles = [];
    const startIdx = Math.max(0, Math.floor(playerZ / Road.SEGMENT_LENGTH) - 2);
    const endIdx = Math.min(segments.length, startIdx + lookAhead);

    for (let i = startIdx; i < endIdx; i++) {
      const seg = segments[i];
      const relZ = seg.p1.world.z - playerZ;
      if (relZ < -100 || relZ > Road.SEGMENT_LENGTH * 25) continue;

      for (const sprite of seg.sprites) {
        if ((sprite.type === 'banana' || sprite.type === 'tire') && !sprite.hit) {
          obstacles.push({
            type: sprite.type,
            offset: sprite.offset,
            z: relZ,
            segmentIndex: i,
            spriteRef: sprite,
            width: sprite.type === 'tire' ? 0.22 : 0.18,
          });
        }
      }
    }
    return obstacles;
  }

  function overlaps(aX, aW, aZ, bX, bW, bZ, zDepth) {
    const xOverlap = Math.abs(aX - bX) < (aW + bW) * 0.5;
    const zOverlap = Math.abs(aZ - bZ) < zDepth;
    return xOverlap && zOverlap;
  }

  function checkCollisions(player, activeCars, obstacles, stats, nearMissState) {
    const pZ = 0;
    let collided = false;

    for (const car of activeCars) {
      if (overlaps(player.x, player.width, pZ, car.offset, car.width, car.relZ, 80)) {
        collided = true;
        stats.collisions++;
        player.x += player.x < car.offset ? -0.15 : 0.15;
        player.speed *= 0.85;
      } else if (
        Math.abs(car.relZ) < 150 &&
        Math.abs(player.x - car.offset) < NEAR_MISS_DIST &&
        nearMissState.cooldown <= 0
      ) {
        stats.nearMisses++;
        nearMissState.cooldown = 1.2;
      }
    }

    for (const obs of obstacles) {
      if (obs.z < -50 || obs.z > 120) continue;
      if (overlaps(player.x, player.width, pZ, obs.offset, obs.width, obs.z, 60)) {
        collided = true;
        stats.collisions++;
        obs.spriteRef.hit = true;
        player.speed *= 0.9;
      }
    }

    return collided;
  }

  function checkOffTrack(player, stats) {
    const limit = 1.05;
    const wasOff = player.offTrack;
    player.offTrack = Math.abs(player.x) > limit;

    if (player.offTrack) {
      player.offTrackTimer += 1;
      if (!wasOff) {
        stats.offTrackEvents++;
      }
      player.speed *= 0.97;
    } else {
      player.offTrackTimer = 0;
    }
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
