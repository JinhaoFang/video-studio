/**
 * 舞台：按相机把烘焙好的各层底图摆进画面（正对相机的平面，按纵深缩放平移），以及把麻雀放到场景里的某个点上，
 * 算出它在画面上的位置、每单位像素数、视角和光照方向。镜头和样张共用，不为某个镜头写特例。
 * Surface 是镜头 draw 拿到的画布：1920×1080 的 2D 上下文和五层底图。
 */
import { directionToView, layer, project, sun } from "./engine/camera.ts";
import type { Camera, Vec3 } from "./engine/camera.ts";
import { plateSize, plates, reference, UNIT } from "./scene.ts";
import type { PlateId } from "./scene.ts";
import { FOOT_Z } from "./sparrow.ts";

export type PlateImages = Record<PlateId, HTMLImageElement>;

export type Surface = { context: CanvasRenderingContext2D; plates: PlateImages };

export const drawPlate = (ctx: CanvasRenderingContext2D, image: HTMLImageElement, id: PlateId, camera: Camera) => {
  const plate = plates.find((p) => p.id === id)!;
  const t = layer(reference, camera, plate.distance);
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

export const placeSparrow = (camera: Camera, feet: Vec3, facing: number) => {
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
    light: directionToView(camera, sun),
  };
};
