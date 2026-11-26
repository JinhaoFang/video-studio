/**
 * 远处鸟群（#180）：同一套树麻雀形体的远景简化版，供第 11 镜与设定图使用。
 * 轮廓按树麻雀连贯体块（顺滑的头-背-胸腹单轮廓、尖喙、尾羽与后掠翼形）构建，不拼双圆；
 * 色值只从 tokens-sparrow.ts 的 flockColors 取：每只底色取自五种逆光深剪影色，金边分近（#ffe3a6）与远（#f2c98a）两档，
 * 赛璐璐硬边平涂加一道逆光金边，无柔和渐变。
 * createFlock 生成 5–7 只各不相同的同伴（体型差约一成、不同底色/朝向/动作节拍，动作错开不同时动）；
 * flockMemberState 按一拍二计算每只的日常动作（理羽、张望、小跳）及主角落地时旁边 2–3 只错开挪动；
 * drawFlockBird 同时支持停栖、远景 2 帧交替飞行（展翅/收翅剪影）与刹车落地姿势。
 * 待定事项：无。
 */
import { createLayer, placeLayer, tracePath } from "../../src/kit/engine/cel.ts";
import { resample, smooth } from "../../src/kit/engine/figure.ts";
import type { Point } from "../../src/kit/engine/figure.ts";
import { boil, drawStrokes, strokes } from "../../src/kit/engine/ink.ts";
import { hash, rng } from "../../src/kit/engine/random.ts";
import { drawing } from "../../src/kit/engine/timing.ts";
import { ink } from "./tokens.ts";
import { flockColors } from "./tokens-sparrow.ts";

export type FlockIdleKind = "rest" | "preen" | "look" | "hop";

export type FlockMember = {
  id: number;
  slot: number;
  scale: number;
  plumpness: number;
  bodyColor: string;
  rimTier: "near" | "far";
  facing: number;
  basePitch: number;
  baseHeadYaw: number;
  baseHeadPitch: number;
  idleKind: FlockIdleKind;
  idleStart: number;
  idlePeriod: number;
  seed: number;
};

export type FlockBirdState = {
  mode: "perched" | "flying" | "landing";
  offsetX: number;
  offsetY: number;
  facing: number;
  bodyPitch: number;
  headPitch: number;
  headTurn: number;
  preen: number;
  tailLift: number;
  tailSpread: number;
  wingSpread: number;
  wingFlap: number;
  legs: boolean;
  legReach: number;
  crouch: number;
  drawingIndex: number;
};

export type FlockBirdView = {
  x: number;
  y: number;
  scale: number;
  plumpness?: number;
  bodyColor: string;
  rimTier: "near" | "far";
  rimLight?: Point;
  seed: number;
  silhouetteOnly?: string;
  outline?: boolean;
};

export type LandReaction = {
  frame: number;
  slot: number;
};

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

export const createFlock = (count = 7, seed = 180): FlockMember[] => {
  const n = Math.max(5, Math.min(7, count));
  const r = rng(seed, n);
  const scales = [0.91, 0.96, 1.02, 0.94, 1.07, 0.99, 1.1];
  const idleKinds: FlockIdleKind[] = [
    "preen",
    "look",
    "hop",
    "rest",
    "look",
    "preen",
    "hop",
  ];
  const facingPool = [-0.95, 0.72, -0.62, 0.92, -0.82, 0.58, -0.9];
  const colorOrder = [0, 1, 2, 3, 4, 1, 3];
  const periods = [44, 52, 60, 48, 56, 66, 72];
  const starts = [2, 13, 25, 9, 31, 17, 39];

  const out: FlockMember[] = [];
  for (let i = 0; i < n; i++) {
    const jitter = (r.next() - 0.5) * 0.015;
    out.push({
      id: i,
      slot: (i + 0.5) / n,
      scale: scales[i % scales.length] + jitter,
      plumpness: 0.94 + (i % 4) * 0.042 + (r.next() - 0.5) * 0.02,
      bodyColor: flockColors.bodies[colorOrder[i % colorOrder.length]],
      rimTier: i % 2 === 0 ? "near" : "far",
      facing: facingPool[i % facingPool.length],
      basePitch: 0.34 + (i % 3) * 0.07 + (r.next() - 0.5) * 0.04,
      baseHeadYaw: (r.next() - 0.5) * 0.45,
      baseHeadPitch: -0.12 + (i % 4) * 0.08,
      idleKind: idleKinds[i % idleKinds.length],
      idleStart: starts[i % starts.length],
      idlePeriod: periods[i % periods.length],
      seed: seed * 31 + i * 97 + 13,
    });
  }
  return out;
};

const hopOffset = (localFrame: number, dir: number) => {
  if (localFrame < 0) {
    return { dx: 0, dy: 0, crouch: 0, pitch: 0, tail: 0, legs: true };
  }
  if (localFrame > 12) {
    return { dx: dir * 0.58, dy: 0, crouch: 0, pitch: 0, tail: 0, legs: true };
  }
  if (localFrame < 2) {
    const t = localFrame / 2;
    return { dx: 0, dy: 0, crouch: 0.48 * t, pitch: -0.18 * t, tail: 0.2 * t, legs: true };
  }
  if (localFrame < 6) {
    const t = (localFrame - 2) / 4;
    return {
      dx: dir * 0.58 * t,
      dy: -Math.sin(Math.PI * t) * 0.56,
      crouch: 0,
      pitch: 0.12 * (1 - t),
      tail: 0.24,
      legs: false,
    };
  }
  if (localFrame < 8) {
    const t = (localFrame - 6) / 2;
    return { dx: dir * 0.58, dy: 0, crouch: 0.34 * t, pitch: -0.12 * t, tail: 0.18, legs: true };
  }
  const t = (localFrame - 8) / 4;
  return {
    dx: dir * 0.58,
    dy: 0,
    crouch: 0.34 * (1 - t),
    pitch: -0.12 * (1 - t),
    tail: 0.18 * Math.max(0, 1 - Math.max(0, (localFrame - 10) / 2)),
    legs: true,
  };
};

export const flockMemberState = (
  member: FlockMember,
  frame: number,
  land?: LandReaction,
): FlockBirdState => {
  const d = drawing(frame, 2);
  const f = d.frame;
  let offsetX = 0;
  let offsetY = 0;
  let facing = member.facing;
  let bodyPitch = member.basePitch;
  let headPitch = member.baseHeadPitch;
  let headTurn = member.baseHeadYaw;
  let preen = 0;
  let tailLift = 0;
  let crouch = 0;
  let legs = true;

  const cycle =
    (((f - member.idleStart) % member.idlePeriod) + member.idlePeriod) %
    member.idlePeriod;
  if (member.idleKind === "preen" && cycle < 18) {
    const p = cycle < 6 ? cycle / 6 : cycle < 12 ? 1 : (18 - cycle) / 6;
    preen = p;
    headPitch = -0.68 * p + member.baseHeadPitch * (1 - p);
    bodyPitch -= 0.12 * p;
    tailLift = 0.12 * p;
  } else if (member.idleKind === "look" && cycle < 16) {
    const p = cycle < 4 ? cycle / 4 : cycle < 12 ? 1 : (16 - cycle) / 4;
    headTurn = member.baseHeadYaw + (member.id % 2 === 0 ? 0.65 : -0.65) * p;
    headPitch = member.baseHeadPitch + 0.28 * p;
  } else if (member.idleKind === "hop" && cycle < 14) {
    const dir = member.id % 2 === 0 ? 1 : -1;
    const h = hopOffset(cycle, dir);
    offsetX += h.dx * (cycle >= 12 ? 0 : 1);
    offsetY += h.dy;
    crouch += h.crouch;
    bodyPitch += h.pitch;
    tailLift += h.tail;
    legs = h.legs;
  }

  if (land) {
    const dist = member.slot - land.slot;
    const absDist = Math.abs(dist);
    if (absDist > 0.02 && absDist < 0.36) {
      const rank = absDist < 0.15 ? 0 : absDist < 0.25 ? 1 : 2;
      const delay = 2 + rank * 4 + (member.id % 2) * 2;
      const local = f - (land.frame + delay);
      const dir = dist >= 0 ? 1 : -1;
      if (local >= 0) {
        const h = hopOffset(local, dir);
        offsetX += h.dx;
        offsetY += h.dy;
        crouch = Math.max(crouch, h.crouch);
        bodyPitch += h.pitch;
        tailLift += h.tail;
        legs = legs && h.legs;
        facing = local < 14 ? (dir > 0 ? -0.78 : 0.78) : member.facing;
      }
    }
  }

  return {
    mode: "perched",
    offsetX,
    offsetY,
    facing,
    bodyPitch,
    headPitch,
    headTurn,
    preen,
    tailLift,
    tailSpread: 0,
    wingSpread: 0,
    wingFlap: 0,
    legs,
    legReach: 0,
    crouch,
    drawingIndex: d.index,
  };
};

export const flockFlightState = (
  frame: number,
  options?: { phaseOffset?: number; landingFrame?: number; facing?: number },
): FlockBirdState & { waveY: number } => {
  const facing = options?.facing ?? 1;
  const phase = frame + (options?.phaseOffset ?? 0);
  const landingFrame = options?.landingFrame;

  if (landingFrame !== undefined && frame >= landingFrame - 10) {
    const t = frame - landingFrame;
    if (t < -3) {
      const u = (t + 10) / 7;
      return {
        mode: "landing",
        offsetX: 0,
        offsetY: 0,
        facing,
        bodyPitch: 0.28 + 0.62 * u,
        headPitch: -0.18 * u,
        headTurn: 0,
        preen: 0,
        tailLift: -0.48 * u,
        tailSpread: 0.9 * u,
        wingSpread: 1,
        wingFlap: t % 2 === 0 ? 0.65 : -0.55,
        legs: u > 0.35,
        legReach: u,
        crouch: 0,
        drawingIndex: frame,
        waveY: 0,
      };
    }
    if (t < 0) {
      return {
        mode: "landing",
        offsetX: 0,
        offsetY: 0,
        facing,
        bodyPitch: 0.92,
        headPitch: -0.22,
        headTurn: 0,
        preen: 0,
        tailLift: -0.52,
        tailSpread: 0.96,
        wingSpread: 1,
        wingFlap: 0.68,
        legs: true,
        legReach: 1,
        crouch: 0,
        drawingIndex: frame,
        waveY: 0,
      };
    }
    if (t < 4) {
      const u = t / 4;
      return {
        mode: "perched",
        offsetX: 0,
        offsetY: 0,
        facing,
        bodyPitch: 0.12 + 0.3 * u,
        headPitch: -0.14,
        headTurn: 0,
        preen: 0,
        tailLift: 0.28 * (1 - u),
        tailSpread: 0.4 * (1 - u),
        wingSpread: 0.65 * (1 - u),
        wingFlap: 0.55 * (1 - u),
        legs: true,
        legReach: 0,
        crouch: 0.35 * (1 - u),
        drawingIndex: frame,
        waveY: 0,
      };
    }
    const settle = clamp01((t - 4) / 8);
    return {
      mode: "perched",
      offsetX: 0,
      offsetY: 0,
      facing,
      bodyPitch: 0.4,
      headPitch: -0.08,
      headTurn: 0,
      preen: 0,
      tailLift: 0.1 * (1 - settle),
      tailSpread: 0,
      wingSpread: 0,
      wingFlap: 0,
      legs: true,
      legReach: 0,
      crouch: 0,
      drawingIndex: drawing(frame, 2).index,
      waveY: 0,
    };
  }

  const cycle = ((phase % 18) + 18) % 18;
  const flapping = cycle < 12;
  const waveY =
    cycle < 13
      ? -Math.sin((cycle / 13) * Math.PI * 0.5)
      : -Math.cos(((cycle - 13) / 5) * Math.PI * 0.5);
  const spread = flapping ? (cycle % 2 === 0 ? 1 : 0.85) : 0;
  const flap = flapping ? (cycle % 2 === 0 ? 0.88 : -0.78) : 0;
  return {
    mode: "flying",
    offsetX: 0,
    offsetY: 0,
    facing,
    bodyPitch: flapping ? 0.2 : -0.06,
    headPitch: -0.05,
    headTurn: 0,
    preen: 0,
    tailLift: flapping ? -0.06 : 0.1,
    tailSpread: flapping ? 0.3 : 0,
    wingSpread: spread,
    wingFlap: flap,
    legs: false,
    legReach: 0,
    crouch: 0,
    drawingIndex: flapping ? frame : drawing(frame, 2).index,
    waveY,
  };
};

export const drawFlockBird = (
  target: CanvasRenderingContext2D,
  view: FlockBirdView,
  state: FlockBirdState,
) => {
  const u = view.scale;
  if (u < 1.5) return;
  const plump = view.plumpness ?? 1;
  const dir = state.facing >= 0 ? 1 : -1;
  const foreshorten = 0.58 + 0.42 * Math.min(1, Math.abs(state.facing));
  const ox = view.x + state.offsetX * u;
  const oy = view.y + state.offsetY * u;
  const drawSeed = Math.floor(hash(view.seed, state.drawingIndex) * 1e6);
  const amp = Math.min(0.6, Math.max(0.16, u * 0.022));

  const bodyC: Point = [ox, oy - u * (0.98 - 0.22 * state.crouch)];
  const bodyAngle = -dir * state.bodyPitch;
  const cB = Math.cos(bodyAngle);
  const sB = Math.sin(bodyAngle);
  const toWorld = (lx: number, ly: number): Point => [
    bodyC[0] + (lx * dir * foreshorten * cB - ly * sB) * u,
    bodyC[1] + (lx * dir * foreshorten * sB + ly * cB) * u,
  ];

  const hp = state.headPitch;
  const pr = state.preen;
  const hx = 0.72 - 0.22 * pr;
  const hy = -0.62 + 0.42 * pr - hp * 0.14;
  const p = plump;
  const bodyContour = smooth(
    [
      toWorld(hx + 0.52 * p, hy - 0.12 * p),
      toWorld(hx + 0.36 * p, hy - 0.48 * p),
      toWorld(hx - 0.08 * p, hy - 0.54 * p),
      toWorld(hx - 0.44 * p, hy - 0.3 * p),
      toWorld(0.08, -0.62 * p),
      toWorld(-0.56, -0.36 * p),
      toWorld(-1.05, -0.02),
      toWorld(-0.78, 0.44 * p),
      toWorld(-0.18, 0.74 * p),
      toWorld(0.46, 0.68 * p),
      toWorld(0.86, 0.24 * p),
      toWorld(hx + 0.38 * p, hy + 0.3 * p),
    ],
    2,
  );

  const beakYaw = dir * (foreshorten * 0.85 + 0.15 * Math.cos(state.headTurn));
  const beakAngle = -dir * (state.bodyPitch * 0.4 + state.headPitch);
  const cBk = Math.cos(beakAngle);
  const sBk = Math.sin(beakAngle);
  const headCenter = toWorld(hx, hy);
  const bkPt = (bx: number, by: number): Point => [
    headCenter[0] + (bx * beakYaw * cBk - by * sBk) * u,
    headCenter[1] + (bx * beakYaw * sBk + by * cBk) * u,
  ];
  const beakLoop: Point[] = [bkPt(0.36, -0.11), bkPt(0.92, 0.01), bkPt(0.36, 0.13)];

  const tailAngle = bodyAngle + dir * (0.28 - state.tailLift);
  const tailBase = toWorld(-0.86, 0.08);
  const cTl = Math.cos(tailAngle);
  const sTl = Math.sin(tailAngle);
  const tailFan = 0.15 + 0.38 * state.tailSpread;
  const tlPt = (tx: number, ty: number): Point => [
    tailBase[0] + (tx * dir * foreshorten * cTl - ty * sTl) * u,
    tailBase[1] + (tx * dir * foreshorten * sTl + ty * cTl) * u,
  ];
  const tailLoop = smooth(
    [
      tlPt(0.08, -0.12),
      tlPt(-1.08, -tailFan),
      tlPt(-1.18, 0),
      tlPt(-1.04, tailFan),
      tlPt(0.08, 0.14),
    ],
    1,
  );

  const loops: Point[][] = [bodyContour, beakLoop, tailLoop];

  if (state.wingSpread > 0.15) {
    const wRoot = toWorld(0.14, -0.2);
    const wingLen = (1.65 + 0.72 * state.wingSpread) * u;
    const flapDir = state.wingFlap >= 0 ? -1 : 1;
    const sweepBack = state.mode === "landing" ? 0.32 : -0.42;
    const tipNear: Point = [
      wRoot[0] + dir * wingLen * (sweepBack - 0.18 * foreshorten),
      wRoot[1] + flapDir * wingLen * (0.58 + 0.38 * Math.abs(state.wingFlap)),
    ];
    const wristNear: Point = [
      wRoot[0] + dir * wingLen * (0.18 + 0.2 * sweepBack),
      wRoot[1] + flapDir * wingLen * 0.42,
    ];
    const trailNear: Point = [
      wRoot[0] - dir * wingLen * 0.34,
      wRoot[1] + flapDir * wingLen * 0.18,
    ];
    loops.push(smooth([wRoot, wristNear, tipNear, trailNear], 2));

    const tipFar: Point = [
      wRoot[0] + dir * wingLen * (sweepBack + 0.38),
      wRoot[1] + flapDir * wingLen * (0.48 + 0.34 * Math.abs(state.wingFlap)),
    ];
    const wristFar: Point = [
      wRoot[0] + dir * wingLen * (0.36 + 0.18 * sweepBack),
      wRoot[1] + flapDir * wingLen * 0.36,
    ];
    const trailFar: Point = [
      wRoot[0] - dir * wingLen * 0.08,
      wRoot[1] + flapDir * wingLen * 0.12,
    ];
    loops.push(smooth([wRoot, wristFar, tipFar, trailFar], 2));
  }

  const boiledLoops = loops.map((lp, k) =>
    boil(resample(lp, Math.max(1.2, u * 0.12), true), drawSeed + k * 29, amp),
  );

  let x0 = ox - u * 2.8;
  let y0 = oy - u * 3.8;
  let x1 = ox + u * 2.8;
  let y1 = oy + u * 1.5;
  for (const lp of boiledLoops) {
    for (const pt of lp) {
      x0 = Math.min(x0, pt[0]);
      y0 = Math.min(y0, pt[1]);
      x1 = Math.max(x1, pt[0]);
      y1 = Math.max(y1, pt[1]);
    }
  }
  const pad = Math.max(6, u * 0.5);
  const layer = createLayer(
    x0 - pad,
    y0 - pad,
    x1 - x0 + 2 * pad,
    y1 - y0 + 2 * pad,
    ink.supersample,
  );
  const ctx = layer.ctx;
  const fill = view.silhouetteOnly ?? view.bodyColor;

  if (state.legs) {
    const hipL = toWorld(0.08, 0.45);
    const hipR = toWorld(-0.1, 0.45);
    const footL: Point = [ox + dir * (0.08 + state.legReach * 0.78) * u, oy];
    const footR: Point = [ox + dir * (-0.14 + state.legReach * 0.62) * u, oy];
    ctx.strokeStyle = fill;
    ctx.lineCap = "round";
    ctx.lineWidth = Math.max(1.2, u * 0.1);
    ctx.beginPath();
    ctx.moveTo(hipL[0], hipL[1]);
    ctx.lineTo(footL[0], footL[1]);
    ctx.lineTo(footL[0] + dir * u * 0.24, footL[1]);
    ctx.moveTo(hipR[0], hipR[1]);
    ctx.lineTo(footR[0], footR[1]);
    ctx.lineTo(footR[0] + dir * u * 0.22, footR[1]);
    ctx.stroke();
  }

  ctx.fillStyle = fill;
  for (const lp of boiledLoops) {
    tracePath(ctx, [lp]);
    ctx.fill();
  }

  if (!view.silhouetteOnly) {
    const rimLight = view.rimLight ?? [-0.65, -0.76];
    const rl = Math.hypot(rimLight[0], rimLight[1]) || 1;
    const thickness = Math.max(1.4, u * 0.14);
    const rx = (rimLight[0] / rl) * thickness;
    const ry = (rimLight[1] / rl) * thickness;
    const rimColor =
      view.rimTier === "near" ? flockColors.rimNear : flockColors.rimFar;

    const rimLayer = createLayer(
      x0 - pad,
      y0 - pad,
      x1 - x0 + 2 * pad,
      y1 - y0 + 2 * pad,
      ink.supersample,
    );
    rimLayer.ctx.fillStyle = rimColor;
    for (const lp of boiledLoops) {
      tracePath(rimLayer.ctx, [lp]);
      rimLayer.ctx.fill();
    }
    rimLayer.ctx.globalCompositeOperation = "destination-out";
    rimLayer.ctx.fillStyle = "#000000";
    for (const lp of boiledLoops) {
      const shifted = lp.map(([px, py]): Point => [px - rx, py - ry]);
      tracePath(rimLayer.ctx, [shifted]);
      rimLayer.ctx.fill();
    }
    placeLayer(ctx, rimLayer, view.rimTier === "near" ? 0.96 : 0.85);

    if (view.outline && u >= 14) {
      const st = strokes(boiledLoops[0], true, {
        seed: drawSeed + 90,
        base: Math.max(1.2, Math.min(2.1, u * 0.052)),
        min: 1,
        max: 2.3,
        light: [rimLight[0] / rl, rimLight[1] / rl],
        breakEvery: [u * 1.5, u * 3],
        cornerAngle: 0.9,
        gap: [-1, 1.2],
        litThin: 0.65,
        dropLit: 0.25,
        minLength: Math.max(6, u * 0.28),
      });
      drawStrokes(ctx, st, ink.color);
    }
  }

  placeLayer(target, layer);
};
