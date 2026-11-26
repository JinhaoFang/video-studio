/**
 * 木制晾衣架（按世界坐标实时投影绘制）：托住晾衣竹竿的 b 端（scene.ts 的 poleStand 与 pole.b）。
 * 造型对照 #182 晾衣架设定图（侧视湿/干、俯视十字四脚底座与顶部 V 形叉口），画法沿用 pole.ts 的赛璐璐平涂加一层受光带与 ink.ts 手绘线条。
 * 拆成 drawPoleStandBack（竹竿之前的地影、四条斜腿、横撑、立柱与后叉臂）与 drawPoleStandFront（竹竿之后的前叉臂），
 * 使竹竿 b 端真实嵌在 V 形叉口里，并保证所有相机下的接点像素误差为 0。
 * 待定事项：无。
 */
import { project, toCamera } from "../../src/kit/engine/camera.ts";
import type { Camera, Vec3 } from "../../src/kit/engine/camera.ts";
import type { Point } from "../../src/kit/engine/figure.ts";
import { boil, drawStrokes, strokes } from "../../src/kit/engine/ink.ts";
import { hash } from "../../src/kit/engine/random.ts";
import { pole, poleStand } from "./scene.ts";
import { darkestByMood, dusk, ink, props, rain, warm } from "./tokens.ts";

const MIN_DEPTH = 0.35;

export type StandMood = "rain" | "dusk" | "lowDusk" | "twilight";

export type StandLook = {
  state: StandMood;
  drawing: number;
  bendAtEnd?: number;
};

type Beam = {
  a: Vec3;
  b: Vec3;
  r0: number;
  r1: number;
  litSide: 1 | -1;
  litOnly?: boolean;
  shadeOnly?: boolean;
  depth: number;
  seedOffset: number;
};

const mixHex = (a: string, b: string, t: number) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(",")})`;
};

const standColors = (state: StandMood) => {
  if (state === "twilight") {
    return {
      shade: props.pole.twilight.shade,
      mid: mixHex(props.pole.twilight.shade, props.pole.twilight.lit, 0.55),
      lit: props.pole.twilight.lit,
      glint: mixHex(props.pole.twilight.lit, warm.lowRim, 0.22),
      shadow: darkestByMood.twilight,
      wet: false,
    };
  }
  if (state === "lowDusk") {
    return {
      shade: props.pole.lowDusk.shade,
      mid: mixHex(props.pole.lowDusk.shade, props.pole.lowDusk.lit, 0.58),
      lit: props.pole.lowDusk.lit,
      glint: mixHex(props.pole.lowDusk.lit, warm.lowRim, 0.42),
      shadow: darkestByMood.lowDusk,
      wet: false,
    };
  }
  if (state === "dusk") {
    return {
      shade: mixHex(props.pole.dusk.shade, dusk.shadowViolet, 0.18),
      mid: mixHex(props.pole.dusk.shade, props.pole.dusk.lit, 0.56),
      lit: props.pole.dusk.lit,
      glint: mixHex(props.pole.dusk.lit, warm.rim, 0.45),
      shadow: darkestByMood.dusk,
      wet: false,
    };
  }
  return {
    shade: props.pole.rain.shade,
    mid: mixHex(props.pole.rain.shade, props.pole.rain.lit, 0.52),
    lit: props.pole.rain.lit,
    glint: mixHex(props.pole.rain.lit, rain.cloud.edge, 0.35),
    shadow: darkestByMood.rain,
    wet: true,
  };
};

const clipSegment = (camera: Camera, a: Vec3, b: Vec3): [Vec3, Vec3] | null => {
  const da = toCamera(camera, a)[1];
  const db = toCamera(camera, b)[1];
  if (da < MIN_DEPTH && db < MIN_DEPTH) return null;
  if (da >= MIN_DEPTH && db >= MIN_DEPTH) return [a, b];
  const t = (MIN_DEPTH - da) / (db - da);
  const mid: Vec3 = [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
  return da < MIN_DEPTH ? [mid, b] : [a, mid];
};

const drawBeam = (
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  beam: Beam,
  look: StandLook,
) => {
  const clipped = clipSegment(camera, beam.a, beam.b);
  if (!clipped) return;
  const [p0, p1] = clipped;
  const steps = 10;
  const centers: Point[] = [];
  const half: number[] = [];
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const w: Vec3 = [
      p0[0] + (p1[0] - p0[0]) * u,
      p0[1] + (p1[1] - p0[1]) * u,
      p0[2] + (p1[2] - p0[2]) * u,
    ];
    const s = project(camera, w);
    const r = beam.r0 + (beam.r1 - beam.r0) * u;
    const hw = Math.max(1.2, Math.min(48, r * s.scale));
    centers.push([s.x, s.y]);
    half.push(hw);
    minX = Math.min(minX, s.x - hw);
    maxX = Math.max(maxX, s.x + hw);
    minY = Math.min(minY, s.y - hw);
    maxY = Math.max(maxY, s.y + hw);
  }
  if (
    maxX < -80 ||
    minX > camera.width + 80 ||
    maxY < -80 ||
    minY > camera.height + 80
  ) {
    return;
  }

  const normalAt = (i: number): Point => {
    const prev = centers[Math.max(0, i - 1)];
    const next = centers[Math.min(steps, i + 1)];
    const dx = next[0] - prev[0];
    const dy = next[1] - prev[1];
    const l = Math.hypot(dx, dy) || 1;
    let nx = -dy / l;
    let ny = dx / l;
    if (nx < 0 || (Math.abs(nx) < 1e-3 && ny > 0)) {
      nx = -nx;
      ny = -ny;
    }
    return [nx, ny];
  };

  const edge = (offset: number): Point[] =>
    centers.map((c, i) => {
      const nm = normalAt(i);
      return [c[0] + nm[0] * half[i] * offset, c[1] + nm[1] * half[i] * offset];
    });

  const seed = Math.floor(hash(200, look.drawing, beam.seedOffset) * 1e6);
  const amp =
    ink.boilMinPx +
    (ink.boilMaxPx - ink.boilMinPx) *
      hash(200, look.drawing, beam.seedOffset + 11);

  const colors = standColors(look.state);
  const fillBand = (from: number, to: number, color: string) => {
    const a = boil(edge(from), seed, amp);
    const b = boil(edge(to), seed + 3, amp);
    ctx.beginPath();
    a.forEach((pt, idx) =>
      idx === 0 ? ctx.moveTo(pt[0], pt[1]) : ctx.lineTo(pt[0], pt[1]),
    );
    for (let idx = b.length - 1; idx >= 0; idx--) ctx.lineTo(b[idx][0], b[idx][1]);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  };

  const leftEdge = boil(edge(-1), seed, amp);
  const rightEdge = boil(edge(1), seed + 3, amp);

  if (beam.shadeOnly) {
    fillBand(-1, 1, colors.shade);
    fillBand(beam.litSide * 0.35, beam.litSide, colors.mid);
  } else if (beam.litOnly) {
    fillBand(-1, 1, colors.mid);
    fillBand(beam.litSide * -0.15, beam.litSide, colors.lit);
  } else {
    fillBand(-1, 1, colors.shade);
    fillBand(beam.litSide * -0.08, beam.litSide, colors.mid);
    fillBand(beam.litSide * 0.32, beam.litSide, colors.lit);
  }

  if (colors.wet) {
    const glintPts = edge(beam.litSide * 0.68);
    ctx.save();
    ctx.strokeStyle = colors.glint;
    ctx.globalAlpha = 0.55;
    ctx.lineCap = "round";
    ctx.lineWidth = Math.max(0.9, half[Math.floor(steps / 2)] * 0.16);
    ctx.beginPath();
    ctx.moveTo(glintPts[1][0], glintPts[1][1]);
    for (let i = 2; i < steps; i++) ctx.lineTo(glintPts[i][0], glintPts[i][1]);
    ctx.stroke();
    ctx.restore();
  }

  const avgHalf = half[Math.floor(steps / 2)];
  const baseW = Math.max(1.3, Math.min(2.6, avgHalf * 0.22 + 0.9));
  const style = {
    seed,
    base: baseW,
    min: ink.minPx * 0.68,
    max: Math.min(ink.maxPx, baseW * 1.35),
    light: [0.5 * beam.litSide, -0.86] as Point,
    breakEvery: [140, 340] as [number, number],
    cornerAngle: 1.2,
    gap: [-1.5, 1.5] as [number, number],
    litThin: 0.72,
    dropLit: 0.08,
    minLength: 14,
  };
  drawStrokes(ctx, strokes(leftEdge, false, style), ink.color);
  drawStrokes(
    ctx,
    strokes(rightEdge, false, { ...style, seed: seed + 5, base: baseW * 1.08 }),
    ink.color,
  );
  drawStrokes(
    ctx,
    strokes([leftEdge[0], rightEdge[0]], false, {
      ...style,
      seed: seed + 13,
      base: baseW * 0.85,
      breakEvery: [1e4, 1e4],
    }),
    ink.color,
  );
  drawStrokes(
    ctx,
    strokes([leftEdge[steps], rightEdge[steps]], false, {
      ...style,
      seed: seed + 17,
      base: baseW * 0.85,
      breakEvery: [1e4, 1e4],
    }),
    ink.color,
  );
};

const standGeometry = (camera: Camera, bendAtEnd = 0) => {
  const [bx, by] = poleStand.base;
  const cradleZ = pole.b[2] - pole.radius * 1.15 + bendAtEnd;
  const postTopZ = cradleZ - 0.01;
  const forkTopZ = Math.max(cradleZ + 0.12, poleStand.forkTopZ + bendAtEnd);

  const dx = pole.b[0] - pole.a[0];
  const dy = pole.b[1] - pole.a[1];
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const vx = -uy;
  const vy = ux;

  const rx = poleStand.legSpanX * 0.5;
  const ry = poleStand.legSpanY * 0.5;
  const collarZ = poleStand.crossbarZ + 0.24;
  const barZ = poleStand.crossbarZ;
  const barFrac = (collarZ - barZ) / collarZ;

  const legDirs: readonly [number, number][] = [
    [-vx * rx - ux * ry * 0.52, -vy * rx - uy * ry * 0.52],
    [vx * rx + ux * ry * 0.52, vy * rx + uy * ry * 0.52],
    [-vx * rx * 0.55 + ux * ry * 0.82, -vy * rx * 0.55 + uy * ry * 0.82],
    [vx * rx * 0.55 - ux * ry * 0.82, vy * rx * 0.55 - uy * ry * 0.82],
  ];

  const depthOf = (a: Vec3, b: Vec3) =>
    (toCamera(camera, a)[1] + toCamera(camera, b)[1]) * 0.5;

  const backBeams: Beam[] = [];
  legDirs.forEach(([ox, oy], idx) => {
    const foot: Vec3 = [bx + ox, by + oy, 0];
    const collar: Vec3 = [bx + ox * 0.12, by + oy * 0.12, collarZ];
    backBeams.push({
      a: foot,
      b: collar,
      r0: poleStand.postRadius * 0.78,
      r1: poleStand.postRadius * 0.72,
      litSide: 1,
      shadeOnly: idx === 0 || idx === 3,
      litOnly: idx === 1 || idx === 2,
      depth: depthOf(foot, collar),
      seedOffset: 10 + idx * 7,
    });
  });

  const barPairs: readonly [number, number][] = [
    [0, 1],
    [2, 3],
  ];
  barPairs.forEach(([i0, i1], idx) => {
    const [ox0, oy0] = legDirs[i0];
    const [ox1, oy1] = legDirs[i1];
    const a: Vec3 = [
      bx + ox0 * (0.12 + 0.88 * barFrac),
      by + oy0 * (0.12 + 0.88 * barFrac),
      barZ,
    ];
    const b: Vec3 = [
      bx + ox1 * (0.12 + 0.88 * barFrac),
      by + oy1 * (0.12 + 0.88 * barFrac),
      barZ,
    ];
    backBeams.push({
      a,
      b,
      r0: poleStand.postRadius * 0.62,
      r1: poleStand.postRadius * 0.62,
      litSide: 1,
      shadeOnly: true,
      depth: depthOf(a, b),
      seedOffset: 42 + idx * 7,
    });
  });

  const postBot: Vec3 = [bx, by, 0];
  const postTop: Vec3 = [bx, by, postTopZ];
  backBeams.push({
    a: postBot,
    b: postTop,
    r0: poleStand.postRadius * 1.02,
    r1: poleStand.postRadius * 0.96,
    litSide: 1,
    depth: depthOf(postBot, postTop),
    seedOffset: 60,
  });

  const forkSpread = 0.115;
  const forkCrotch: Vec3 = [bx, by, cradleZ - 0.025];
  const forkNegTop: Vec3 = [
    bx - vx * forkSpread,
    by - vy * forkSpread,
    forkTopZ,
  ];
  const forkPosTop: Vec3 = [
    bx + vx * forkSpread,
    by + vy * forkSpread,
    forkTopZ,
  ];
  const forkNeg: Beam = {
    a: forkCrotch,
    b: forkNegTop,
    r0: poleStand.postRadius * 0.72,
    r1: poleStand.postRadius * 0.6,
    litSide: 1,
    shadeOnly: true,
    depth: depthOf(forkCrotch, forkNegTop),
    seedOffset: 71,
  };
  const forkPos: Beam = {
    a: forkCrotch,
    b: forkPosTop,
    r0: poleStand.postRadius * 0.72,
    r1: poleStand.postRadius * 0.6,
    litSide: 1,
    litOnly: true,
    depth: depthOf(forkCrotch, forkPosTop),
    seedOffset: 79,
  };

  const farFork = forkNeg.depth >= forkPos.depth ? forkNeg : forkPos;
  const nearFork = forkNeg.depth >= forkPos.depth ? forkPos : forkNeg;
  backBeams.push(farFork);
  backBeams.sort((m, n) => n.depth - m.depth);

  return { backBeams, nearFork };
};

const drawStandShadow = (
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  state: StandMood,
) => {
  const [bx, by] = poleStand.base;
  if (toCamera(camera, [bx, by, 0])[1] < MIN_DEPTH) return;
  const center = project(camera, [bx, by, 0]);
  if (
    center.x < -200 ||
    center.x > camera.width + 200 ||
    center.y < -120 ||
    center.y > camera.height + 200
  ) {
    return;
  }
  const pts: Point[] = [];
  const rx = poleStand.legSpanX * 0.62;
  const ry = poleStand.legSpanY * 0.62;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const p: Vec3 = [bx + Math.cos(a) * rx, by + Math.sin(a) * ry, 0];
    if (toCamera(camera, p)[1] < MIN_DEPTH) return;
    const q = project(camera, p);
    pts.push([q.x, q.y]);
  }
  ctx.save();
  ctx.globalAlpha = state === "twilight" ? 0.34 : 0.28;
  ctx.fillStyle = standColors(state).shadow;
  ctx.beginPath();
  pts.forEach((pt, idx) =>
    idx === 0 ? ctx.moveTo(pt[0], pt[1]) : ctx.lineTo(pt[0], pt[1]),
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();
};

export const standContactScreen = (camera: Camera, bendAtEnd = 0) =>
  project(camera, [pole.b[0], pole.b[1], pole.b[2] + bendAtEnd]);

export const drawPoleStandBack = (
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  look: StandLook,
) => {
  if (toCamera(camera, pole.b)[1] < MIN_DEPTH && toCamera(camera, poleStand.base)[1] < MIN_DEPTH) {
    return;
  }
  drawStandShadow(ctx, camera, look.state);
  const { backBeams } = standGeometry(camera, look.bendAtEnd ?? 0);
  for (const beam of backBeams) {
    drawBeam(ctx, camera, beam, look);
  }
};

export const drawPoleStandFront = (
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  look: StandLook,
) => {
  if (toCamera(camera, pole.b)[1] < MIN_DEPTH) return;
  const { nearFork } = standGeometry(camera, look.bendAtEnd ?? 0);
  drawBeam(ctx, camera, nearFork, look);
};

export const drawPoleStand = (
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  look: StandLook,
) => {
  drawPoleStandBack(ctx, camera, look);
  drawPoleStandFront(ctx, camera, look);
};
