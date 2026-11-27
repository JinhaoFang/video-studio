/**
 * 体块到线稿：角色用距离场捏出体块（以"单位"计的局部坐标，x 朝前、y 朝左、z 朝上），按视图基底做正交光线步进，
 * 得到每个网格采样的"沿光线最小距离"（连续的剪影场）、命中点局部坐标和法线；任意标量场用 contours 走方格提取等值线，
 * 平滑后成为闭合折线，供赛璐璐填色和手绘线条使用。体块本身不上屏。
 * 视图坐标：X 向右、Y 向下、Z 指向画面里，单位是像素。
 * 待定事项：无。
 */
export type V3 = [number, number, number];

export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const length = (a: V3) => Math.sqrt(dot(a, a));
export const normalize = (a: V3): V3 => {
  const l = length(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
export const rotateX = (p: V3, angle: number): V3 => {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c];
};
export const rotateY = (p: V3, angle: number): V3 => {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c];
};
export const rotateZ = (p: V3, angle: number): V3 => {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]];
};

export const ellipsoid = (p: V3, c: V3, r: V3) => {
  const x = (p[0] - c[0]) / r[0];
  const y = (p[1] - c[1]) / r[1];
  const z = (p[2] - c[2]) / r[2];
  const k0 = Math.sqrt(x * x + y * y + z * z);
  const k1 = Math.sqrt((x * x) / (r[0] * r[0]) + (y * y) / (r[1] * r[1]) + (z * z) / (r[2] * r[2]));
  return k1 === 0 ? -Math.min(r[0], r[1], r[2]) : (k0 * (k0 - 1)) / k1;
};

export const roundCone = (p: V3, a: V3, b: V3, ra: number, rb: number) => {
  const ba = sub(b, a);
  const pa = sub(p, a);
  const h = Math.min(1, Math.max(0, dot(pa, ba) / dot(ba, ba)));
  return length(sub(pa, scale(ba, h))) - (ra + (rb - ra) * h);
};

export const smin = (a: number, b: number, k: number) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
};

export type Basis = { f: V3; l: V3; u: V3 };

export const viewBasis = (yaw: number, pitch: number, roll = 0): Basis => {
  const tilt = (v: V3): V3 => {
    const c = Math.cos(pitch);
    const s = Math.sin(pitch);
    const t: V3 = [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c];
    const cr = Math.cos(roll);
    const sr = Math.sin(roll);
    return [t[0] * cr - t[1] * sr, t[0] * sr + t[1] * cr, t[2]];
  };
  const f0: V3 = [Math.cos(yaw), 0, -Math.sin(yaw)];
  const u0: V3 = [0, -1, 0];
  const l0 = cross(u0, f0);
  return { f: tilt(f0), l: tilt(l0), u: tilt(u0) };
};

export const toView = (b: Basis, p: V3): V3 => [
  b.f[0] * p[0] + b.l[0] * p[1] + b.u[0] * p[2],
  b.f[1] * p[0] + b.l[1] * p[1] + b.u[1] * p[2],
  b.f[2] * p[0] + b.l[2] * p[1] + b.u[2] * p[2],
];

export const toLocal = (b: Basis, v: V3): V3 => [dot(v, b.f), dot(v, b.l), dot(v, b.u)];

export type Grid = { x0: number; y0: number; cell: number; nx: number; ny: number };

export type Sampled = {
  grid: Grid;
  silhouette: Float32Array;
  hit: Uint8Array;
  local: Float32Array;
  normal: Float32Array;
  depth: Float32Array;
};

export type SampleOptions = {
  originX: number;
  originY: number;
  ppu: number;
  basis: Basis;
  center: V3;
  radius: number;
  cell: number;
  roundness?: { center: (p: V3) => V3; amount: number };
};

export const sample = (sdf: (p: V3) => number, o: SampleOptions): Sampled => {
  const cv = toView(o.basis, o.center);
  const cx = o.originX + cv[0] * o.ppu;
  const cy = o.originY + cv[1] * o.ppu;
  const rpx = o.radius * o.ppu;
  const nx = Math.ceil((2 * rpx) / o.cell) + 3;
  const ny = nx;
  const x0 = cx - rpx - o.cell;
  const y0 = cy - rpx - o.cell;
  const n = nx * ny;
  const silhouette = new Float32Array(n);
  const hit = new Uint8Array(n);
  const local = new Float32Array(n * 3);
  const normal = new Float32Array(n * 3);
  const depth = new Float32Array(n);
  const dir = toLocal(o.basis, [0, 0, 1]);
  const minStep = o.radius * 0.012;
  const eps = o.radius * 0.002;
  const h = o.radius * 0.004;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const k = j * nx + i;
      const sx = (x0 + i * o.cell - o.originX) / o.ppu;
      const sy = (y0 + j * o.cell - o.originY) / o.ppu;
      const p0 = toLocal(o.basis, [sx, sy, 0]);
      const oc = sub(p0, o.center);
      const b = dot(oc, dir);
      const c = dot(oc, oc) - o.radius * o.radius;
      const disc = b * b - c;
      silhouette[k] = (o.radius * 0.5) * o.ppu;
      depth[k] = Infinity;
      if (disc <= 0) continue;
      const root = Math.sqrt(disc);
      let t = -b - root;
      const t1 = -b + root;
      let best = Infinity;
      let hitT = NaN;
      while (t < t1) {
        const d = sdf([p0[0] + dir[0] * t, p0[1] + dir[1] * t, p0[2] + dir[2] * t]);
        if (d < best) best = d;
        if (d < eps && Number.isNaN(hitT)) hitT = t;
        t += Number.isNaN(hitT) ? Math.max(d, minStep) : Math.max(Math.abs(d) * 0.6, minStep);
      }
      silhouette[k] = best * o.ppu;
      if (Number.isNaN(hitT)) continue;
      hit[k] = 1;
      const p: V3 = [p0[0] + dir[0] * hitT, p0[1] + dir[1] * hitT, p0[2] + dir[2] * hitT];
      local[k * 3] = p[0];
      local[k * 3 + 1] = p[1];
      local[k * 3 + 2] = p[2];
      depth[k] = hitT;
      let g: V3 = normalize([
        sdf([p[0] + h, p[1], p[2]]) - sdf([p[0] - h, p[1], p[2]]),
        sdf([p[0], p[1] + h, p[2]]) - sdf([p[0], p[1] - h, p[2]]),
        sdf([p[0], p[1], p[2] + h]) - sdf([p[0], p[1], p[2] - h]),
      ]);
      if (o.roundness) {
        const r = normalize(sub(p, o.roundness.center(p)));
        g = normalize(add(scale(g, 1 - o.roundness.amount), scale(r, o.roundness.amount)));
      }
      const nv = toView(o.basis, g);
      normal[k * 3] = nv[0];
      normal[k * 3 + 1] = nv[1];
      normal[k * 3 + 2] = nv[2];
    }
  }
  return { grid: { x0, y0, cell: o.cell, nx, ny }, silhouette, hit, local, normal, depth };
};

export const field = (
  s: Sampled,
  inside: (local: V3, normal: V3, index: number) => number,
  outside = 1e3,
): Float32Array => {
  const n = s.grid.nx * s.grid.ny;
  const out = new Float32Array(n);
  for (let k = 0; k < n; k++) {
    out[k] = s.hit[k]
      ? inside(
          [s.local[k * 3], s.local[k * 3 + 1], s.local[k * 3 + 2]],
          [s.normal[k * 3], s.normal[k * 3 + 1], s.normal[k * 3 + 2]],
          k,
        )
      : outside;
  }
  return out;
};

export type Point = [number, number];

export const contours = (values: Float32Array, g: Grid, level = 0): Point[][] => {
  const { nx, ny } = g;
  const v = (i: number, j: number) =>
    i <= 0 || j <= 0 || i >= nx - 1 || j >= ny - 1 ? Math.max(values[j * nx + i] - level, 1e-3) : values[j * nx + i] - level;
  const hBase = 0;
  const vBase = nx * ny;
  const points = new Map<number, Point>();
  const links = new Map<number, number[]>();
  const edgePoint = (id: number): Point => {
    let p = points.get(id);
    if (p) return p;
    if (id < vBase) {
      const j = Math.floor(id / nx);
      const i = id - j * nx;
      const a = v(i, j);
      const b = v(i + 1, j);
      const t = a / (a - b);
      p = [g.x0 + (i + t) * g.cell, g.y0 + j * g.cell];
    } else {
      const e = id - vBase;
      const j = Math.floor(e / nx);
      const i = e - j * nx;
      const a = v(i, j);
      const b = v(i, j + 1);
      const t = a / (a - b);
      p = [g.x0 + i * g.cell, g.y0 + (j + t) * g.cell];
    }
    points.set(id, p);
    return p;
  };
  const link = (a: number, b: number) => {
    edgePoint(a);
    edgePoint(b);
    const la = links.get(a);
    if (la) la.push(b);
    else links.set(a, [b]);
    const lb = links.get(b);
    if (lb) lb.push(a);
    else links.set(b, [a]);
  };
  for (let j = 0; j < ny - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const a = v(i, j);
      const b = v(i + 1, j);
      const c = v(i + 1, j + 1);
      const d = v(i, j + 1);
      const index = (a < 0 ? 1 : 0) | (b < 0 ? 2 : 0) | (c < 0 ? 4 : 0) | (d < 0 ? 8 : 0);
      if (index === 0 || index === 15) continue;
      const top = hBase + j * nx + i;
      const bottom = hBase + (j + 1) * nx + i;
      const left = vBase + j * nx + i;
      const right = vBase + j * nx + i + 1;
      const centerInside = (a + b + c + d) / 4 < 0;
      switch (index) {
        case 1:
        case 14:
          link(left, top);
          break;
        case 2:
        case 13:
          link(top, right);
          break;
        case 3:
        case 12:
          link(left, right);
          break;
        case 4:
        case 11:
          link(right, bottom);
          break;
        case 6:
        case 9:
          link(top, bottom);
          break;
        case 7:
        case 8:
          link(left, bottom);
          break;
        case 5:
          if (centerInside) {
            link(left, bottom);
            link(top, right);
          } else {
            link(left, top);
            link(right, bottom);
          }
          break;
        case 10:
          if (centerInside) {
            link(left, top);
            link(right, bottom);
          } else {
            link(top, right);
            link(left, bottom);
          }
          break;
      }
    }
  }
  const visited = new Set<number>();
  const loops: Point[][] = [];
  links.forEach((_, start) => {
    if (visited.has(start)) return;
    const loop: Point[] = [];
    let previous = -1;
    let current = start;
    while (!visited.has(current)) {
      visited.add(current);
      loop.push(points.get(current)!);
      const next = links.get(current)!;
      const candidate = next[0] !== previous || next.length < 2 ? next[0] : next[1];
      previous = current;
      current = candidate;
      if (current === undefined) break;
    }
    if (loop.length >= 4) loops.push(loop);
  });
  return loops;
};

export const area = (loop: readonly Point[]) => {
  let s = 0;
  for (let i = 0; i < loop.length; i++) {
    const a = loop[i];
    const b = loop[(i + 1) % loop.length];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return s / 2;
};

export const smooth = (loop: readonly Point[], iterations = 2, closed = true): Point[] => {
  let pts = loop.slice();
  for (let it = 0; it < iterations; it++) {
    const out: Point[] = [];
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      if (!closed && i === n - 1) break;
      const a = pts[i];
      const b = pts[(i + 1) % n];
      out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
      out.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    if (!closed) {
      out.unshift(pts[0]);
      out.push(pts[n - 1]);
    }
    pts = out;
  }
  return pts;
};

export const resample = (loop: readonly Point[], spacing: number, closed = true): Point[] => {
  const n = loop.length;
  if (n < 2) return loop.slice();
  const segs = closed ? n : n - 1;
  let total = 0;
  const lengths: number[] = [];
  for (let i = 0; i < segs; i++) {
    const a = loop[i];
    const b = loop[(i + 1) % n];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    lengths.push(l);
    total += l;
  }
  const count = Math.max(closed ? 6 : 2, Math.round(total / spacing));
  const step = total / (closed ? count : count - 1);
  const out: Point[] = [];
  let seg = 0;
  let acc = 0;
  for (let k = 0; k < count; k++) {
    const target = k * step;
    while (seg < segs - 1 && acc + lengths[seg] < target) {
      acc += lengths[seg];
      seg++;
    }
    const a = loop[seg];
    const b = loop[(seg + 1) % n];
    const t = lengths[seg] > 0 ? Math.min(1, (target - acc) / lengths[seg]) : 0;
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  return out;
};

export const tidy = (loops: Point[][], minArea: number, spacing: number): Point[][] =>
  loops
    .filter((loop) => Math.abs(area(loop)) >= minArea)
    .map((loop) => resample(smooth(loop, 2), spacing));
