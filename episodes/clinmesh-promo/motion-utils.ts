/**
 * Pure stateless animation curves, velocity sampling, damped settle math, and
 * deterministic arc-length parameterization for cubic Bezier curves.
 */
import { Easing, interpolate } from "remotion";

export const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

export const lerp = (a: number, b: number, t: number): number =>
  a + (b - a) * t;

export const EASE = {
  snappy: Easing.bezier(0.16, 1, 0.3, 1),
  out: Easing.bezier(0.22, 1, 0.36, 1),
  smooth: Easing.bezier(0.65, 0, 0.35, 1),
  swift: Easing.bezier(0.4, 0, 0.2, 1),
  exit: Easing.bezier(0.7, 0, 0.84, 0),
  overshoot: Easing.bezier(0.34, 1.4, 0.44, 1),
  pop: Easing.bezier(0.2, 1.25, 0.3, 1),
  reseat: Easing.bezier(0.4, 0, 0.3, 1.05),
  portal: Easing.bezier(0.7, 0, 0.3, 1),
  rowFly: Easing.bezier(0.5, 0, 0.8, 0.75),
} as const;

export const ramp = (
  frame: number,
  start: number,
  duration: number,
  easing: (t: number) => number = EASE.snappy,
): number => {
  if (duration <= 0) return frame >= start ? 1 : 0;
  return interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });
};

export const velocityAt = (
  posAt: (f: number) => { x: number; y: number },
  frame: number,
  dt = 0.5,
): { vx: number; vy: number; speed: number; direction: number } => {
  const before = posAt(frame - dt);
  const after = posAt(frame + dt);
  const vx = (after.x - before.x) / (2 * dt);
  const vy = (after.y - before.y) / (2 * dt);
  return { vx, vy, speed: Math.hypot(vx, vy), direction: Math.atan2(vy, vx) };
};

export const dampedSettle = (
  t: number,
  freq: number,
  damping: number,
): number =>
  t <= 0 ? 0 : Math.exp(-damping * t) * Math.sin(2 * Math.PI * freq * t);

export type Point2D = { x: number; y: number };

export type PrecomputedBezier = {
  totalLength: number;
  svgPath: string;
  pointAtFraction: (fraction: number) => Point2D;
};

export const precomputeCubicBezier = (
  p0: Point2D,
  p1: Point2D,
  p2: Point2D,
  p3: Point2D,
  segments = 1600,
): PrecomputedBezier => {
  const evalAt = (t: number): Point2D => {
    const u = 1 - t;
    const b0 = u * u * u;
    const b1 = 3 * u * u * t;
    const b2 = 3 * u * t * t;
    const b3 = t * t * t;
    return {
      x: b0 * p0.x + b1 * p1.x + b2 * p2.x + b3 * p3.x,
      y: b0 * p0.y + b1 * p1.y + b2 * p2.y + b3 * p3.y,
    };
  };
  const points: Point2D[] = new Array(segments + 1);
  const cumLen: number[] = new Array(segments + 1);
  points[0] = p0;
  cumLen[0] = 0;
  let acc = 0;
  for (let i = 1; i <= segments; i++) {
    const pt = evalAt(i / segments);
    points[i] = pt;
    acc += Math.hypot(pt.x - points[i - 1].x, pt.y - points[i - 1].y);
    cumLen[i] = acc;
  }
  const pointAtFraction = (fraction: number): Point2D => {
    const target = clamp01(fraction) * acc;
    let lo = 0;
    let hi = segments;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (cumLen[mid] <= target) lo = mid;
      else hi = mid;
    }
    const segLen = cumLen[hi] - cumLen[lo];
    const alpha = segLen > 1e-6 ? (target - cumLen[lo]) / segLen : 0;
    return {
      x: lerp(points[lo].x, points[hi].x, alpha),
      y: lerp(points[lo].y, points[hi].y, alpha),
    };
  };
  return {
    totalLength: acc,
    svgPath: `M ${p0.x} ${p0.y} C ${p1.x} ${p1.y}, ${p2.x} ${p2.y}, ${p3.x} ${p3.y}`,
    pointAtFraction,
  };
};
