/**
 * 《雨后》的场景布置（米）：与 layout.md、layout.svg 一一对应的统一世界坐标。
 * +X 从屋檐往外看时的右手边，+Y 从屋子往院子与稻田（西），+Z 朝上，地面 z = 0。
 * 保留小样既有的五层院子底图（plates、reference、pole、eave、puddles），新增老屋正面、玄关、木制晾衣架、小路、水洼 W1、树篱缺口、稻田田埂与电线坐标，以及正片各新机位底图的规格表（viewPlates）。
 */
import type { Camera, Vec3 } from "../../src/kit/engine/camera.ts";

const deg = (value: number) => (value * Math.PI) / 180;

export const sun: Vec3 = (() => {
  const v: Vec3 = [0.42, 0.78, 0.46];
  const l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
})();

export const sunLow: Vec3 = (() => {
  const az = deg(28.3);
  const el = deg(16.0);
  return [Math.sin(az) * Math.cos(el), Math.cos(az) * Math.cos(el), Math.sin(el)];
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

export const perchT = 0.51;
export const perchPoint: Vec3 = poleAt(perchT);

export const poleStand = {
  base: [2.4, 4.6, 0] as Vec3,
  topHeight: 1.78,
  postRadius: 0.032,
  legSpanX: 0.46,
  legSpanY: 0.52,
  crossbarZ: 0.42,
  forkTopZ: 1.92,
};

export const eave = { edge: 1.5, height: 2.42, back: 0.2, rise: 0.12 };

export const house = {
  wallY: -0.9,
  xMin: -8.0,
  xMax: 6.0,
  verandaY: 0.0,
  verandaZ: 0.45,
  ridgeY: -5.5,
  ridgeZ: 6.2,
  eaveY: 1.5,
  eaveZ: 2.42,
  pillarY: 1.35,
  pillarsX: [-6.9, -1.4, 3.6] as readonly number[],
  litRoom: { xMin: -0.5, xMax: 2.5, zMin: 0.45, zMax: 2.25 },
  genkan: { x: -6.5, width: 1.8, height: 1.8, baseZ: 0.35 },
  takeoffSunLineZ: 1.64,
};

export const puddles: { x: number; depth: number; width: number }[] = [
  { x: 620, depth: 9.2, width: 1.6 },
  { x: 1320, depth: 8.1, width: 2.2 },
  { x: 1720, depth: 9.8, width: 1.0 },
  { x: 180, depth: 7.6, width: 1.3 },
];

export const yardPuddlesWorld: readonly { x: number; y: number; rx: number; ry: number }[] = [
  { x: 1.71, y: 8.1, rx: 1.1, ry: 0.34 },
  { x: -1.83, y: 9.2, rx: 0.8, ry: 0.3 },
  { x: 4.36, y: 9.8, rx: 0.5, ry: 0.24 },
  { x: -3.47, y: 7.6, rx: 0.65, ry: 0.28 },
];

export const puddleW1 = { x: -1.9, y: 5.3, rx: 0.5, ry: 0.3 };

export const yardPath: readonly [number, number][] = [
  [-6.5, -0.4],
  [-4.5, 2.6],
  [-1.9, 5.3],
  [-1.5, 5.45],
  [0.5, 6.0],
  [2.5, 6.6],
  [5.5, 11.0],
];

export const hedgeWorld = {
  y: 11.0,
  xMin: -14.0,
  xMax: 14.0,
  height: 1.4,
  thickness: 0.8,
  gateXMin: 5.0,
  gateXMax: 6.0,
};

export const paddyWorld = {
  yStart: 12.0,
  farmerRidgeY: 30.0,
  farmerRidgeXMin: 6.0,
  farmerRidgeXMax: 40.0,
  powerLineY: 37.0,
  powerLineXStart: 30.0,
  poleSpacing: 30.0,
  wireHeight: 5.5,
  wireSag: 5.0,
};

const cam = (position: Vec3, yawDeg: number, pitchDeg: number, focal: number): Camera => ({
  position,
  yaw: deg(yawDeg),
  pitch: deg(pitchDeg),
  focal,
  width: 1920,
  height: 1080,
});

export const shotCameras = {
  s1Start: cam([2.6, 10.2, 1.5], -175.2, 11.5, 20),
  s1End: cam([1.9, 7.4, 1.55], -178.6, 10.8, 30),
  s2Start: cam([0.42, 1.45, 1.78], 4.0, 3.5, 85),
  s2End: cam([0.4, 1.55, 1.78], 6.0, 3.5, 95),
  s4: cam([-1.45, 3.95, 0.12], -26.6, 7.2, 20),
  s5: cam([0.45, 1.2, 1.62], 3.5, 9.5, 50),
  s6: cam([-2.0, 3.72, 0.15], 14.6, 5.1, 28),
  s7: cam([1.07, 1.83, 1.7], -22.2, 6.3, 75),
  s8: cam([1.6, 2.62, 1.72], -71.0, 5.5, 100),
  s9: cam([1.27, 2.44, 1.78], -49.5, 6.5, 85),
  s10: cam([1.75, 3.67, 1.95], -123.0, -4.9, 35),
  s11Start: cam([9.0, 13.5, 6.0], 40.0, -9.0, 24),
  s11End: cam([9.0, 13.5, 6.0], 62.0, -11.0, 24),
  s12Start: cam([1.9, 7.4, 1.55], -178.6, 10.8, 30),
  s12End: cam([3.0, 10.3, 1.4], -177.3, 21.8, 18),
} as const;

export const viewReferences = {
  houseReverse: cam([2.6, 10.2, 1.5], -177.3, 16.5, 18),
  houseTakeoff: shotCameras.s10,
  lowS4: shotCameras.s4,
  lowS6: shotCameras.s6,
  paddyWide: cam([9.0, 13.5, 6.0], 51.0, -10.0, 24),
  closeupS2: shotCameras.s2Start,
  closeupS5: shotCameras.s5,
  closeupS7: shotCameras.s7,
  closeupS8: shotCameras.s8,
  closeupS9: shotCameras.s9,
} as const;

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

export type ViewPlateId =
  | "house-sky-rain"
  | "house-front-rain"
  | "house-sky-twilight"
  | "house-front-twilight"
  | "house-takeoff"
  | "low-s4"
  | "low-s6"
  | "paddy-wide"
  | "closeup-s2"
  | "closeup-s5"
  | "closeup-s7"
  | "closeup-s8-start"
  | "closeup-s8-end"
  | "closeup-s9";

export type ViewPlate = {
  id: ViewPlateId;
  reference: Camera;
  distance: number;
  rect: { x0: number; y0: number; x1: number; y1: number };
  k: number;
  shots: readonly number[];
};

export const viewPlates: readonly ViewPlate[] = [
  {
    id: "house-sky-rain",
    reference: viewReferences.houseReverse,
    distance: 3000,
    rect: { x0: -220, y0: -260, x1: 2140, y1: 1040 },
    k: 1.0,
    shots: [1],
  },
  {
    id: "house-front-rain",
    reference: viewReferences.houseReverse,
    distance: 10.0,
    rect: { x0: -220, y0: -60, x1: 2140, y1: 1240 },
    k: 1.15,
    shots: [1],
  },
  {
    id: "house-sky-twilight",
    reference: viewReferences.houseReverse,
    distance: 3000,
    rect: { x0: -220, y0: -260, x1: 2140, y1: 1040 },
    k: 1.0,
    shots: [12],
  },
  {
    id: "house-front-twilight",
    reference: viewReferences.houseReverse,
    distance: 10.0,
    rect: { x0: -220, y0: -60, x1: 2140, y1: 1240 },
    k: 1.15,
    shots: [12],
  },
  {
    id: "house-takeoff",
    reference: viewReferences.houseTakeoff,
    distance: 8.5,
    rect: { x0: -120, y0: -80, x1: 2040, y1: 1160 },
    k: 1.05,
    shots: [10],
  },
  {
    id: "low-s4",
    reference: viewReferences.lowS4,
    distance: 5.5,
    rect: { x0: -160, y0: -60, x1: 2240, y1: 1140 },
    k: 1.0,
    shots: [4],
  },
  {
    id: "low-s6",
    reference: viewReferences.lowS6,
    distance: 7.5,
    rect: { x0: -140, y0: -60, x1: 2260, y1: 1140 },
    k: 1.0,
    shots: [6],
  },
  {
    id: "paddy-wide",
    reference: viewReferences.paddyWide,
    distance: 35.0,
    rect: { x0: -480, y0: -140, x1: 2400, y1: 1220 },
    k: 1.0,
    shots: [11],
  },
  {
    id: "closeup-s2",
    reference: viewReferences.closeupS2,
    distance: 11.0,
    rect: { x0: -120, y0: -80, x1: 2040, y1: 1160 },
    k: 0.9,
    shots: [2],
  },
  {
    id: "closeup-s5",
    reference: viewReferences.closeupS5,
    distance: 3000,
    rect: { x0: -120, y0: -80, x1: 2040, y1: 1160 },
    k: 0.9,
    shots: [5],
  },
  {
    id: "closeup-s7",
    reference: viewReferences.closeupS7,
    distance: 11.0,
    rect: { x0: -120, y0: -80, x1: 2040, y1: 1160 },
    k: 0.9,
    shots: [7],
  },
  {
    id: "closeup-s8-start",
    reference: viewReferences.closeupS8,
    distance: 11.0,
    rect: { x0: -120, y0: -80, x1: 2040, y1: 1160 },
    k: 0.9,
    shots: [8],
  },
  {
    id: "closeup-s8-end",
    reference: viewReferences.closeupS8,
    distance: 11.0,
    rect: { x0: -120, y0: -80, x1: 2040, y1: 1160 },
    k: 0.9,
    shots: [8],
  },
  {
    id: "closeup-s9",
    reference: viewReferences.closeupS9,
    distance: 11.0,
    rect: { x0: -120, y0: -80, x1: 2040, y1: 1160 },
    k: 0.9,
    shots: [9],
  },
];

export const plateSize = (p: { rect: { x0: number; y0: number; x1: number; y1: number }; k: number }) => ({
  width: Math.round((p.rect.x1 - p.rect.x0) * p.k),
  height: Math.round((p.rect.y1 - p.rect.y0) * p.k),
});
