/**
 * road.js — Pseudo-3D segment road for Safety Raceway
 * Classic segment-based rendering (N64 / arcade racer style).
 */

const Road = (function () {
  const SEGMENT_LENGTH = 200;
  const RUMBLE_LENGTH = 3;
  const ROAD_WIDTH = 2000;
  const LANES = 3;

  /** Build the Safety Raceway course: curves, signs, obstacles, AI spawn points */
  function createTrack(totalSegments) {
    const segments = [];
    const addSegment = (curve, y, sprites, cars) => {
      const n = segments.length;
      segments.push({
        index: n,
        p1: { world: { z: n * SEGMENT_LENGTH }, camera: {}, screen: {} },
        p2: { world: { z: (n + 1) * SEGMENT_LENGTH }, camera: {}, screen: {} },
        curve: curve || 0,
        y: y || 0,
        color: Math.floor(n / RUMBLE_LENGTH) % 2 ? 'dark' : 'light',
        sprites: sprites || [],
        cars: cars || [],
      });
    };

    // Straight warmup
    for (let i = 0; i < 80; i++) addSegment(0, 0);

    // Gentle S-curves through the course
    const curvePattern = [
      { len: 60, curve: 2 },
      { len: 40, curve: 0 },
      { len: 50, curve: -3 },
      { len: 40, curve: 0 },
      { len: 70, curve: 4 },
      { len: 50, curve: 0 },
      { len: 60, curve: -2 },
      { len: 40, curve: 0 },
      { len: 80, curve: 3 },
      { len: 50, curve: 0 },
      { len: 60, curve: -4 },
      { len: 40, curve: 0 },
      { len: 70, curve: 2 },
      { len: 50, curve: 0 },
      { len: 60, curve: -3 },
      { len: 40, curve: 0 },
    ];

    let segIndex = 0;
    for (const block of curvePattern) {
      for (let i = 0; i < block.len && segments.length < totalSegments - 20; i++) {
        addSegment(block.curve, 0);
        segIndex++;
      }
    }

    // Fill remainder
    while (segments.length < totalSegments) {
      addSegment(Math.sin(segments.length * 0.02) * 2, 0);
    }

  // Place roadside signs, obstacles, and AI cars along the track
    placeTrackContent(segments);
    return segments;
  }

  function placeTrackContent(segments) {
    const signMessages = [
      'SAFETY RACEWAY',
      'STAY ALERT',
      'REST STOP 2 MI',
      'SLOW — CURVE',
      'NO DROWSY DRIVING',
      'SHARE THE ROAD',
      'FATIGUE KILLS',
      'PULL OVER & REST',
    ];

    for (let i = 30; i < segments.length - 10; i += 35) {
      const side = i % 2 === 0 ? -1.15 : 1.15;
      const msg = signMessages[Math.floor(i / 35) % signMessages.length];
      segments[i].sprites.push({ type: 'sign', offset: side, msg });
    }

    // Guardrail posts at intervals
    for (let i = 5; i < segments.length; i += 8) {
      segments[i].sprites.push({ type: 'guardrail', offset: -1.25 });
      segments[i].sprites.push({ type: 'guardrail', offset: 1.25 });
    }

    // Banana peels and tires on roadway (lane offsets -0.5, 0, 0.5)
    const obstacleTypes = ['banana', 'tire', 'banana', 'tire', 'banana'];
    for (let i = 50; i < segments.length - 20; i += 28 + (i % 17)) {
      const lane = [-0.55, 0, 0.55][i % 3];
      const type = obstacleTypes[i % obstacleTypes.length];
      segments[i].sprites.push({ type, offset: lane, hit: false });
    }

    // AI traffic — staggered lanes, varying speeds
    const carColors = ['#e53935', '#1e88e5', '#43a047', '#fb8c00', '#8e24aa', '#fdd835'];
    for (let i = 60; i < segments.length - 30; i += 45 + (i % 23)) {
      const lane = [-0.6, -0.2, 0.2, 0.6][i % 4];
      const speed = 0.55 + (i % 5) * 0.08;
      segments[i].cars.push({
        id: 'ai-' + i,
        offset: lane,
        z: 0,
        speed,
        color: carColors[i % carColors.length],
        width: 0.35,
      });
    }
  }

  /** Project segment endpoints to screen space (world.x set by renderer before call) */
  function project(segment, cameraX, cameraY, cameraZ, cameraDepth, width, height) {
    const projectPoint = (point) => {
      const dz = point.world.z - cameraZ;
      if (dz <= 0) {
        point.screen.scale = 0;
        return;
      }
      const scale = cameraDepth / dz;
      point.camera.x = scale * (point.world.x - cameraX);
      point.camera.y = scale * (point.world.y - cameraY);
      point.screen.scale = scale;
      point.screen.x = Math.round(width / 2 + point.camera.x * width / 2);
      point.screen.y = Math.round(height * 0.42 - point.camera.y * height / 2);
      point.screen.w = Math.round(scale * ROAD_WIDTH * width / 2);
    };

    segment.p1.world.y = segment.y;
    segment.p2.world.y = segment.y;
    projectPoint(segment.p1);
    projectPoint(segment.p2);
  }

  function findSegment(segments, z) {
    return segments[Math.floor(z / SEGMENT_LENGTH) % segments.length];
  }

  function percentRemaining(segment, z) {
    return (segment.p2.world.z - z) / SEGMENT_LENGTH;
  }

  return {
    SEGMENT_LENGTH,
    ROAD_WIDTH,
    LANES,
    createTrack,
    project,
    findSegment,
    percentRemaining,
  };
})();
