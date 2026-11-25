/**
 * 动画时间：drawing 给出一拍二、一拍三的画张号和该画张的起始帧；hold 是关键姿势硬停表（停在上一个关键值，不插值）；
 * ease 是起止都慢的插值，leave、arrive 大于 1 时离开或到达那一头更慢，曲线在两端斜率为零，不回弹；tween 按关键帧表插值，适合相机和慢动作。
 * 角色动作先用 drawing 取画张起始帧再算姿势，所以同一张画内姿势不变。
 */
export const drawing = (frame: number, step: number) => {
  const index = Math.floor(frame / step);
  return { index, frame: index * step };
};

export const hold = <T>(frame: number, keys: readonly [number, T][]): T => {
  let value = keys[0][1];
  for (let i = 0; i < keys.length; i++) {
    if (frame >= keys[i][0]) value = keys[i][1];
  }
  return value;
};

export const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

export const ease = (t: number, leave = 1, arrive = 1): number => {
  const x = clamp01(t);
  const a = Math.pow(x, 1 + 0.6 * (leave - 1));
  const s = a * a * (3 - 2 * a);
  return 1 - Math.pow(1 - s, 1 + 0.6 * (arrive - 1));
};

export const progress = (frame: number, start: number, end: number) =>
  end === start ? (frame >= end ? 1 : 0) : clamp01((frame - start) / (end - start));

export type Key = { frame: number; value: number; leave?: number; arrive?: number };

export const tween = (frame: number, keys: readonly Key[]): number => {
  if (frame <= keys[0].frame) return keys[0].value;
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1];
    const b = keys[i];
    if (frame <= b.frame) {
      const t = ease(progress(frame, a.frame, b.frame), a.leave ?? 1, b.arrive ?? 1);
      return a.value + (b.value - a.value) * t;
    }
  }
  return keys[keys.length - 1].value;
};

export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
