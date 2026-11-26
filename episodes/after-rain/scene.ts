/**
 * 《雨后》的场景布置（米）：老屋檐下往外看，参考相机是 S1 的起始机位；各层底图正对相机，按到参考相机的纵深摆放，
 * 每层只覆盖自己在参考画面里的范围（rect，参考画面像素，可超出画面留余量），按 k 倍像素烘焙。
 * 竹竿是水平的，从左下近处伸向右中远处；麻雀的一个单位是 UNIT 米。生成器按这里烘焙底图，镜头按这里摆相机、竹竿和麻雀。
 * 院子里的水洼（puddles）：x 是参考画面像素，depth、width 是米；底图画水面，S1 在同一位置画雨点涟漪。
 */
import type { Camera, Vec3 } from "../../src/kit/engine/camera.ts";

export const sun: Vec3 = (() => {
  const v: Vec3 = [0.42, 0.78, 0.46];
  const l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
})();
export const sky: Vec3 = [0, -0.2, 0.98];

export const reference: Camera = {
  position: [0, 0, 2.0],
  yaw: 0,
  pitch: 0.07,
  focal: 32,
  width: 1920,
  height: 1080,
};

export const UNIT = 0.042;

export const pole = {
  a: [-1.15, 1.25, 1.74] as Vec3,
  b: [2.4, 4.6, 1.78] as Vec3,
  radius: 0.021,
};

export const poleAt = (t: number): Vec3 => [
  pole.a[0] + (pole.b[0] - pole.a[0]) * t,
  pole.a[1] + (pole.b[1] - pole.a[1]) * t,
  pole.a[2] + (pole.b[2] - pole.a[2]) * t,
];

export const eave = { edge: 1.5, height: 2.42, back: 0.2, rise: 0.12 };

export const puddles: { x: number; depth: number; width: number }[] = [
  { x: 620, depth: 9.2, width: 1.6 },
  { x: 1320, depth: 8.1, width: 2.2 },
  { x: 1720, depth: 9.8, width: 1.0 },
  { x: 180, depth: 7.6, width: 1.3 },
];

export type PlateId = "far" | "field" | "hedge" | "yard" | "eaves";

export type Plate = {
  id: PlateId;
  distance: number;
  rect: { x0: number; y0: number; x1: number; y1: number };
  k: number;
};

export const plates: readonly Plate[] = [
  { id: "far", distance: 3000, rect: { x0: -160, y0: -90, x1: 2080, y1: 760 }, k: 1.4 },
  { id: "field", distance: 90, rect: { x0: -160, y0: 600, x1: 2080, y1: 1010 }, k: 1.4 },
  { id: "hedge", distance: 11, rect: { x0: -180, y0: 380, x1: 2100, y1: 1010 }, k: 1.7 },
  { id: "yard", distance: 7, rect: { x0: -200, y0: 900, x1: 2120, y1: 1200 }, k: 1.7 },
  { id: "eaves", distance: 1.5, rect: { x0: -240, y0: -120, x1: 2160, y1: 240 }, k: 2.2 },
];

export const plateSize = (p: Plate) => ({
  width: Math.round((p.rect.x1 - p.rect.x0) * p.k),
  height: Math.round((p.rect.y1 - p.rect.y0) * p.k),
});
