/**
 * 相机：以米为单位的针孔相机，世界坐标 +X 向右、+Y 向前、+Z 向上；焦距按 36 mm 宽画幅换算成像素。
 * project 把世界点投到画面（像素、离相机的纵深、每米多少像素）；layer 给出正对相机的平面底图在两台相机之间的缩放和平移，
 * 底图在参考相机的画面坐标里画，镜头移动时只按纵深重新摆放，近的层移动得多、远的层几乎不动；小角度的摇、俯仰对各层是同样的平移。
 * 全片统一光源：夕阳在画面右上方的云缝后，sun 是从景物指向太阳的方向；sky 是雨天的天光方向。
 */
export type Vec3 = [number, number, number];

export type Camera = {
  position: Vec3;
  yaw: number;
  pitch: number;
  focal: number;
  width: number;
  height: number;
};

export const sun: Vec3 = (() => {
  const v: Vec3 = [0.42, 0.78, 0.46];
  const l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
})();

export const sky: Vec3 = [0, -0.2, 0.98];

export const focalPx = (c: Camera) => (c.focal / 36) * c.width;

const axes = (c: Camera) => {
  const cy = Math.cos(c.yaw);
  const sy = Math.sin(c.yaw);
  const cp = Math.cos(c.pitch);
  const sp = Math.sin(c.pitch);
  const forward: Vec3 = [sy * cp, cy * cp, sp];
  const right: Vec3 = [cy, -sy, 0];
  const up: Vec3 = [-sy * sp, -cy * sp, cp];
  return { forward, right, up };
};

export const toCamera = (c: Camera, p: Vec3): Vec3 => {
  const { forward, right, up } = axes(c);
  const d: Vec3 = [p[0] - c.position[0], p[1] - c.position[1], p[2] - c.position[2]];
  return [
    d[0] * right[0] + d[1] * right[1] + d[2] * right[2],
    d[0] * forward[0] + d[1] * forward[1] + d[2] * forward[2],
    d[0] * up[0] + d[1] * up[1] + d[2] * up[2],
  ];
};

export const directionToView = (c: Camera, v: Vec3): Vec3 => {
  const { forward, right, up } = axes(c);
  const x = v[0] * right[0] + v[1] * right[1] + v[2] * right[2];
  const y = v[0] * forward[0] + v[1] * forward[1] + v[2] * forward[2];
  const z = v[0] * up[0] + v[1] * up[1] + v[2] * up[2];
  return [x, -z, y];
};

export const project = (c: Camera, p: Vec3) => {
  const q = toCamera(c, p);
  const f = focalPx(c);
  const depth = Math.max(1e-4, q[1]);
  return {
    x: c.width / 2 + (f * q[0]) / depth,
    y: c.height / 2 - (f * q[2]) / depth,
    depth,
    scale: f / depth,
  };
};

export const layer = (reference: Camera, current: Camera, distance: number) => {
  const r = toCamera(reference, current.position);
  const d = distance - r[1];
  const scale = (focalPx(current) / focalPx(reference)) * (distance / d);
  const f = focalPx(current);
  const dx = current.width / 2 - (reference.width / 2) * scale - (f * r[0]) / d - f * Math.tan(current.yaw - reference.yaw);
  const dy = current.height / 2 - (reference.height / 2) * scale + (f * r[2]) / d + f * Math.tan(current.pitch - reference.pitch);
  return { scale, dx, dy };
};
