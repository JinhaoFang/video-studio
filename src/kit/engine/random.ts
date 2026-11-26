/** 固定种子的随机与噪声：hash 取整数种子组合出 [0,1) 值，rng 生成序列，noise1/noise2 为平滑值噪声，fbm2 叠加多个频率。浏览器与 Node 共用，结果只由参数决定。 待定事项：无。 */
export const hash = (...values: number[]): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < values.length; i++) {
    let v = Math.floor(values[i] * 1000003) | 0;
    v = Math.imul(v ^ (v >>> 16), 0x7feb352d);
    v = Math.imul(v ^ (v >>> 15), 0x846ca68b);
    v ^= v >>> 16;
    h = Math.imul(h ^ v, 0x01000193);
  }
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  h = Math.imul(h, 0x297a2d39);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
};

export type Rng = {
  next: () => number;
  range: (low: number, high: number) => number;
  int: (low: number, high: number) => number;
  pick: <T>(items: readonly T[]) => T;
  gauss: () => number;
};

export const rng = (...seed: number[]): Rng => {
  let state = Math.floor(hash(...seed) * 4294967296) >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (low, high) => low + (high - low) * next(),
    int: (low, high) => low + Math.floor((high - low + 1) * next()),
    pick: (items) => items[Math.floor(next() * items.length)],
    gauss: () => {
      const a = Math.max(next(), 1e-9);
      return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * next());
    },
  };
};

const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

export const noise1 = (x: number, seed: number): number => {
  const i = Math.floor(x);
  const f = fade(x - i);
  const a = hash(i, seed);
  const b = hash(i + 1, seed);
  return a + (b - a) * f;
};

export const noise2 = (x: number, y: number, seed: number): number => {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = fade(x - ix);
  const fy = fade(y - iy);
  const a = hash(ix, iy, seed);
  const b = hash(ix + 1, iy, seed);
  const c = hash(ix, iy + 1, seed);
  const d = hash(ix + 1, iy + 1, seed);
  const top = a + (b - a) * fx;
  const bottom = c + (d - c) * fx;
  return top + (bottom - top) * fy;
};

export const fbm2 = (
  x: number,
  y: number,
  seed: number,
  octaves = 4,
  lacunarity = 2.03,
  gain = 0.5,
): number => {
  let sum = 0;
  let amplitude = 1;
  let total = 0;
  let fx = x;
  let fy = y;
  for (let o = 0; o < octaves; o++) {
    sum += noise2(fx, fy, seed + o * 101) * amplitude;
    total += amplitude;
    amplitude *= gain;
    const rx = fx * 0.8 - fy * 0.6;
    const ry = fx * 0.6 + fy * 0.8;
    fx = rx * lacunarity + 17.3;
    fy = ry * lacunarity + 9.1;
  }
  return sum / total;
};
