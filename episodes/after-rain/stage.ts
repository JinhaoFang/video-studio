/**
 * 舞台：按相机把烘焙好的各层底图摆进画面（正对相机的平面，按纵深缩放平移），以及把麻雀放到场景里的某个点上，
 * 算出它在画面上的位置、每单位像素数、视角和光照方向。镜头和样张共用，不为某个镜头写特例。
 * 相机走到某层底图跟前或越过它时（放大超过 40 倍）不画这一层。
 * Surface 保持与小样 S1/S2 完全兼容，新增可选的 views 字段供正片各新机位底图使用。
 */
import { directionToView, layer, project } from "../../src/kit/engine/camera.ts";
import type { Camera, Vec3 } from "../../src/kit/engine/camera.ts";
import { mix } from "../../src/kit/engine/timing.ts";
import { plateSize, plates, reference, sun, UNIT, viewPlates } from "./scene.ts";
import type { PlateId, ViewPlateId } from "./scene.ts";
import { FOOT_Z } from "./sparrow.ts";

export type PlateImages = Record<PlateId, HTMLImageElement>;
export type ViewPlateImages = Record<ViewPlateId, HTMLImageElement>;

export type Surface = {
  context: CanvasRenderingContext2D;
  plates: PlateImages;
  rain: PlateImages;
  views?: ViewPlateImages;
};

export const mixCamera = (a: Camera, b: Camera, t: number): Camera => ({
  position: [
    mix(a.position[0], b.position[0], t),
    mix(a.position[1], b.position[1], t),
    mix(a.position[2], b.position[2], t),
  ],
  yaw: mix(a.yaw, b.yaw, t),
  pitch: mix(a.pitch, b.pitch, t),
  focal: mix(a.focal, b.focal, t),
  width: a.width,
  height: a.height,
});

export const viewImage = (surface: Surface, id: ViewPlateId): HTMLImageElement => {
  const image = surface.views?.[id];
  if (!image) throw new Error(`缺少正片机位底图：${id}`);
  return image;
};

export const drawPlate = (ctx: CanvasRenderingContext2D, image: HTMLImageElement, id: PlateId, camera: Camera) => {
  const plate = plates.find((p) => p.id === id)!;
  const t = layer(reference, camera, plate.distance);
  if (!(t.scale > 0 && t.scale < 40)) return;
  const size = plateSize(plate);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    image,
    plate.rect.x0 * t.scale + t.dx,
    plate.rect.y0 * t.scale + t.dy,
    (size.width / plate.k) * t.scale,
    (size.height / plate.k) * t.scale,
  );
  ctx.restore();
};

export const drawViewPlate = (ctx: CanvasRenderingContext2D, image: HTMLImageElement, id: ViewPlateId, camera: Camera) => {
  const plate = viewPlates.find((p) => p.id === id)!;
  const t = layer(plate.reference, camera, plate.distance);
  if (!(t.scale > 0 && t.scale < 40)) return;
  const size = plateSize(plate);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    image,
    plate.rect.x0 * t.scale + t.dx,
    plate.rect.y0 * t.scale + t.dy,
    (size.width / plate.k) * t.scale,
    (size.height / plate.k) * t.scale,
  );
  ctx.restore();
};

export const placeSparrow = (camera: Camera, feet: Vec3, facing: number, lightWorld: Vec3 = sun) => {
  const origin: Vec3 = [feet[0], feet[1], feet[2] - FOOT_Z * UNIT];
  const p = project(camera, origin);
  const horizontal = Math.hypot(origin[0] - camera.position[0], origin[1] - camera.position[1]);
  const elevation = Math.atan2(camera.position[2] - origin[2], horizontal);
  const bearing = Math.atan2(origin[0] - camera.position[0], origin[1] - camera.position[1]);
  return {
    x: p.x,
    y: p.y,
    ppu: p.scale * UNIT,
    yaw: facing + bearing,
    pitch: elevation,
    light: directionToView(camera, lightWorld),
  };
};
