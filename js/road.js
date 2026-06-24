/**
 * road.js — Pseudo-3D Safety Raceway with hills, curves, and scenery
 */

const Road = (function () {
  const SEGMENT_LENGTH = 200;
  const RUMBLE_LENGTH = 3;
  const ROAD_WIDTH = 2000;
  const LANES = 3;

  function addSegment(segments, curve, y) {
    const n = segments.length;
    segments.push({
      index: n,
      p1: { world: { z: n * SEGMENT_LENGTH }, camera: {}, screen: {} },
      p2: { world: { z: (n + 1) * SEGMENT_LENGTH }, camera: {}, screen: {} },
      curve: curve || 0,
      y: y || 0,
      color: Math.floor(n / RUMBLE_LENGTH) % 2 ? 'dark' : 'light',
      sprites: [],
      cars: [],
    });
  }

  function createTrack(totalSegments) {
    const segments = [];

    for (let i = 0; i < 60; i++) addSegment(segments, 0, 0);

    const course = [
      { len: 50, curve: 1.5, hill: 0 },
      { len: 35, curve: 0, hill: 800 },
      { len: 45, curve: -2.5, hill: 0 },
      { len: 30, curve: 0, hill: -600 },
      { len: 55, curve: 3.5, hill: 400 },
      { len: 40, curve: 0, hill: 0 },
      { len: 50, curve: -2, hill: 700 },
      { len: 35, curve: 0, hill: 0 },
      { len: 60, curve: 4, hill: -500 },
      { len: 40, curve: 0, hill: 0 },
      { len: 50, curve: -3.5, hill: 600 },
      { len: 35, curve: 0, hill: 0 },
      { len: 55, curve: 2, hill: -400 },
      { len: 40, curve: 0, hill: 300 },
      { len: 50, curve: -4, hill: 0 },
      { len: 40, curve: 0, hill: 0 },
    ];

    let hillPhase = 0;
    for (const block of course) {
      for (let i = 0; i < block.len && segments.length < totalSegments - 30; i++) {
        hillPhase += 0.08;
        const y = block.hill
          ? Math.sin(hillPhase) * block.hill
          : Math.sin(hillPhase * 0.5) * 120;
        addSegment(segments, block.curve, y);
      }
    }

    while (segments.length < totalSegments) {
      const t = segments.length * 0.03;
      addSegment(Math.sin(t) * 2.5 + Math.sin(t * 0.4) * 1.5, Math.sin(t * 0.7) * 200);
    }

    placeTrackContent(segments);
    return segments;
  }

  function placeTrackContent(segments) {
    const signs = [
      { msg: 'SAFETY RACEWAY', color: 'green' },
      { msg: 'STAY ALERT', color: 'green' },
      { msg: 'REST AREA 2 MI', color: 'blue' },
      { msg: 'SLOW — CURVE AHEAD', color: 'yellow' },
      { msg: 'NO DROWSY DRIVING', color: 'green' },
      { msg: 'BAUER BUILT', color: 'green' },
      { msg: 'FATIGUE KILLS', color: 'yellow' },
      { msg: 'PULL OVER & REST', color: 'green' },
    ];

    for (let i = 25; i < segments.length - 15; i += 30) {
      const side = i % 2 === 0 ? -1.2 : 1.2;
      const s = signs[Math.floor(i / 30) % signs.length];
      segments[i].sprites.push({ type: 'sign', offset: side, msg: s.msg, signColor: s.color });
    }

    for (let i = 4; i < segments.length; i += 6) {
      segments[i].sprites.push({ type: 'guardrail', offset: -1.22 });
      segments[i].sprites.push({ type: 'guardrail', offset: 1.22 });
    }

    for (let i = 12; i < segments.length; i += 14) {
      const side = i % 2 === 0 ? -1.35 : 1.35;
      segments[i].sprites.push({ type: 'tree', offset: side });
      if (i % 28 === 0) {
        segments[i].sprites.push({ type: 'tree', offset: side * 1.08 });
      }
    }

    for (let i = 20; i < segments.length; i += 22) {
      segments[i].sprites.push({ type: 'pole', offset: i % 2 === 0 ? -1.05 : 1.05 });
    }

    const obstacles = ['banana', 'tire', 'banana', 'tire', 'tire', 'banana'];
    for (let i = 45; i < segments.length - 25; i += 18 + (i % 11)) {
      const lane = [-0.55, -0.15, 0.2, 0.55][i % 4];
      segments[i].sprites.push({
        type: obstacles[i % obstacles.length],
        offset: lane,
        hit: false,
      });
    }

    const carColors = ['#c62828', '#1565c0', '#2e7d32', '#ef6c00', '#6a1b9a', '#f9a825', '#37474f'];
    for (let i = 55; i < segments.length - 35; i += 32 + (i % 19)) {
      segments[i].cars.push({
        id: 'ai-' + i,
        offset: [-0.55, -0.15, 0.15, 0.55][i % 4],
        z: (i % 5) * 30,
        speed: 0.5 + (i % 7) * 0.07,
        color: carColors[i % carColors.length],
        width: 0.36,
        kind: i % 3 === 0 ? 'truck' : 'car',
      });
    }
  }

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
      point.screen.y = Math.round(height * 0.4 - point.camera.y * height / 2);
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

  function interpolateY(segments, z) {
    const seg = findSegment(segments, z);
    const pct = 1 - percentRemaining(seg, z);
    const next = segments[(seg.index + 1) % segments.length];
    return seg.y + (next.y - seg.y) * pct;
  }

  return {
    SEGMENT_LENGTH,
    ROAD_WIDTH,
    LANES,
    createTrack,
    project,
    findSegment,
    percentRemaining,
    interpolateY,
  };
})();
